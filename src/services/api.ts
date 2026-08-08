import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * The one HTTP client.
 *
 * Ported close to verbatim from the web client's `src/services/api.js`: the
 * endpoints, request shapes, interceptor behaviour and error branches are not
 * UI-framework-specific, and rewriting them from scratch is the surest way to
 * introduce a difference between the two front ends that nobody notices until an
 * application is refused for the wrong reason.
 *
 * Three things genuinely differ on a phone, and only three:
 *
 *  1. The base URL must be absolute. `/api` works on the web through a dev proxy
 *     and resolves to nothing inside a native bundle, where there is no origin
 *     to be relative to.
 *  2. The token lives in the keychain rather than localStorage. It opens ID
 *     numbers, income and the coordinates of somebody's home; a device backup
 *     should not carry it in plain text.
 *  3. Redirects are a navigation concern, so the interceptor records *why* a
 *     session ended and hands that to the app rather than assigning to
 *     window.location.
 */

const TOKEN_KEY = 'indigent.token';

/**
 * Where the API lives.
 *
 * From app config so a debug build can point at a laptop and a release build at
 * the municipality. `localhost` is deliberately not a default: on a device it
 * means the phone itself, so it fails in a way that looks like the server being
 * down rather than like a missing setting.
 */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || '';

if (!API_BASE_URL) {
  console.warn(
    '[api] No API URL is configured. Set EXPO_PUBLIC_API_URL, or extra.apiUrl in app.json, '
    + 'to the address of the backend as the phone can reach it — not localhost.'
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  // A request that never returns leaves a spinner turning for ever, which reads
  // as the app being broken. Better to fail and say so. Longer than the web's
  // 30s because a document upload on a mobile connection genuinely takes longer.
  timeout: 45000,
});

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/**
 * Held in memory as well as the keychain.
 *
 * Every request would otherwise wait on an async keychain read, which on Android
 * is slow enough to be visible when a screen fires several requests at once.
 */
let cachedToken: string | null = null;

export async function loadToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A keychain that cannot be read is the same as having no session.
    cachedToken = null;
  }
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('[api] could not write the token to the keychain:', error);
  }
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = cachedToken ?? (await loadToken());
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------------------------------------------------------------------
// Sessions ending
// ---------------------------------------------------------------------------

export type SignOutReason = 'idle' | 'expired' | 'revoked' | 'locked' | 'deactivated' | 'ended';

type SessionListener = (reason: SignOutReason) => void;
let onSessionEnded: SessionListener | null = null;

/**
 * The app registers here so the interceptor never has to know about navigation.
 *
 * On the web this was `window.location.href = '/login'`. There is no such thing
 * here, and reaching for the navigator from inside an interceptor would couple
 * the HTTP layer to the routing tree.
 */
export function onSessionEnd(listener: SessionListener | null) {
  onSessionEnded = listener;
}

/**
 * Retry a read once when the network hiccups.
 *
 * Municipal connections drop packets, and a phone changing cell tower drops
 * more. A GET is safe to repeat — it changes nothing. Writes are never retried:
 * repeating a POST could create a second application or send a second SMS.
 */
async function retryOnce(error: AxiosError) {
  const config = error.config as (InternalAxiosRequestConfig & { __retried?: boolean }) | undefined;
  const isRead = (config?.method || 'get').toLowerCase() === 'get';
  const noResponse = !error.response;

  if (config && isRead && noResponse && !config.__retried) {
    config.__retried = true;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return api(config);
  }
  return Promise.reject(error);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 401) {
      await setToken(null);
      /**
       * The reason matters, because the three cases mean different things and
       * the sign-in screen has to say which. A timeout is routine; a revoked
       * session means the password was changed somewhere else; an invalid token
       * is a bug or tampering.
       */
      onSessionEnded?.(
        code === 'SESSION_EXPIRED' ? 'expired'
          : code === 'SESSION_REVOKED' ? 'revoked'
            : 'ended'
      );
      return Promise.reject(error);
    }

    // A lock applied while somebody was already signed in takes effect at once,
    // rather than whenever their token happens to expire.
    if (status === 423 && code === 'ACCOUNT_LOCKED') {
      await setToken(null);
      onSessionEnded?.('locked');
      return Promise.reject(error);
    }

    if (status === 403 && code === 'ACCOUNT_DEACTIVATED') {
      await setToken(null);
      onSessionEnded?.('deactivated');
      return Promise.reject(error);
    }

    return retryOnce(error);
  }
);

/**
 * The message to show a person.
 *
 * The API writes its own wording for applicants, so it is used as-is. Inventing
 * a message here would replace something written for a household with something
 * written for a developer.
 */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const axiosError = error as AxiosError<{ message?: string }>;

  if (axiosError?.response?.data?.message) return axiosError.response.data.message;

  // No response at all is the common case on a phone, and it has nothing to do
  // with the request being wrong.
  if (axiosError?.request && !axiosError.response) {
    return 'We could not reach the municipality. Check your connection and try again.';
  }

  return fallback;
}

export default api;
