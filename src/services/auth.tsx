import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import api, { loadToken, onSessionEnd, setToken, SignOutReason } from './api';

/**
 * Who is signed in, and for how much longer.
 *
 * Mirrors the web client's AuthContext, with two differences that matter on a
 * phone:
 *
 *  - The token is in the keychain, so restoring a session is asynchronous. The
 *    app shows nothing until that has resolved, rather than flashing the sign-in
 *    screen at somebody who is already signed in.
 *  - The session locks on **backgrounding** as well as on inactivity. The
 *    web's risk is an unattended desk; the phone's is an app left open in a
 *    pocket or handed to somebody else, and no amount of mouse-movement
 *    detection sees that.
 */

export type User = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  cellNumber?: string | null;
  idNumber?: string | null;
  isVerified?: boolean;
  mustChangePassword?: boolean;
};

type SessionPolicy = {
  idleMinutes: number;
  idleWarningMinutes: number;
  sessionHours: number;
  lockoutThreshold?: number;
};

/** The server's defaults, used until a sign-in response supplies the real ones. */
const DEFAULT_POLICY: SessionPolicy = { idleMinutes: 20, idleWarningMinutes: 2, sessionHours: 8 };

type AuthValue = {
  user: User | null;
  restoring: boolean;
  policy: SessionPolicy;
  signedOutBecause: SignOutReason | null;
  previousSignIn: string | null;
  signIn: (identifier: string, password: string) => Promise<User>;
  register: (data: Record<string, unknown>) => Promise<User>;
  signOut: (reason?: SignOutReason | null) => Promise<void>;
  patchUser: (patch: Partial<User>) => void;
  clearSignOutReason: () => void;
  /** Called by screens on interaction, to push the idle deadline out. */
  touch: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [policy, setPolicy] = useState<SessionPolicy>(DEFAULT_POLICY);
  const [signedOutBecause, setSignedOutBecause] = useState<SignOutReason | null>(null);
  const [previousSignIn, setPreviousSignIn] = useState<string | null>(null);

  const lastActive = useRef(Date.now());
  const backgroundedAt = useRef<number | null>(null);

  const signOut = useCallback(async (reason: SignOutReason | null = null) => {
    await setToken(null);
    setUser(null);
    setPreviousSignIn(null);
    setSignedOutBecause(reason);
  }, []);

  /**
   * A 401 or a lock anywhere in the app ends the session here.
   *
   * Registered once, so the HTTP layer never has to know about navigation or
   * React state — it reports what happened and this decides what that means.
   */
  useEffect(() => {
    onSessionEnd((reason) => {
      setUser(null);
      setPreviousSignIn(null);
      setSignedOutBecause(reason);
    });
    return () => onSessionEnd(null);
  }, []);

  /** Restore a session from the keychain on cold start. */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await loadToken();
      if (!token) { if (!cancelled) setRestoring(false); return; }

      try {
        const res = await api.get('/auth/me');
        if (!cancelled) setUser(res.data.data);
      } catch {
        // A token the server no longer accepts is the same as having none. The
        // interceptor has already cleared it.
        if (!cancelled) await signOut(null);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => { cancelled = true; };
  }, [signOut]);

  const touch = useCallback(() => { lastActive.current = Date.now(); }, []);

  /**
   * Lock on inactivity, and on returning from the background.
   *
   * Checked on a timer rather than with one long timeout: a phone suspends
   * timers when the screen turns off, so a single `setTimeout` set for twenty
   * minutes can come due long after the fact, or not fire until the device
   * wakes. Comparing timestamps means an hour in a pocket counts as an hour.
   */
  useEffect(() => {
    if (!user) return undefined;

    const idleMs = policy.idleMinutes * 60 * 1000;

    const tick = setInterval(() => {
      if (Date.now() - lastActive.current >= idleMs) signOut('idle');
    }, 5000);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }

      if (state === 'active' && backgroundedAt.current) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        // Time in the background is time nobody was looking at the screen, and
        // the screen may be showing an ID number.
        if (away >= idleMs) signOut('idle');
        else lastActive.current = Date.now();
      }
    };

    const subscription = AppState.addEventListener('change', onAppState);

    return () => {
      clearInterval(tick);
      subscription.remove();
    };
  }, [user, policy.idleMinutes, signOut]);

  const store = useCallback(async (data: {
    user: User; token: string; session?: SessionPolicy; previousSignIn?: string | null;
  }) => {
    await setToken(data.token);
    setPolicy(data.session ?? DEFAULT_POLICY);
    setPreviousSignIn(data.previousSignIn ?? null);
    setSignedOutBecause(null);
    lastActive.current = Date.now();
    setUser(data.user);
    return data.user;
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    /**
     * The field is called `email` because that is what the API expects, but it
     * carries whatever the person was told their username is. Residents
     * registered at their door by a councillor have no email address — their SMS
     * tells them to sign in with their cell number, and the server matches on
     * either.
     */
    const res = await api.post('/auth/login', { email: identifier.trim(), password });
    return store(res.data.data);
  }, [store]);

  const register = useCallback(async (data: Record<string, unknown>) => {
    const res = await api.post('/auth/register', data);
    return store(res.data.data);
  }, [store]);

  const patchUser = useCallback((patch: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user, restoring, policy, signedOutBecause, previousSignIn,
    signIn, register, signOut, patchUser, touch,
    clearSignOutReason: () => setSignedOutBecause(null),
  }), [user, restoring, policy, signedOutBecause, previousSignIn, signIn, register, signOut, patchUser, touch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth was called outside AuthProvider');
  return value;
}

/**
 * Why the last session ended, in words written for a household.
 *
 * No mention of tokens, sessions expiring or security policy — just what
 * happened and what to do. Being dropped on a sign-in screen with no
 * explanation reads as the app having crashed, and the usual response is to try
 * the same thing again and get the same result.
 */
export const SIGN_OUT_MESSAGE: Record<SignOutReason, { tone: 'info' | 'error'; text: string }> = {
  idle: {
    tone: 'info',
    text: 'We signed you out because the app was left alone for a while. This keeps your details safe if you '
      + 'are on a shared phone. Everything you had filled in has been saved.',
  },
  expired: {
    tone: 'info',
    text: 'You were signed out after a while. Sign in again to carry on — your application has been saved.',
  },
  revoked: {
    tone: 'info',
    text: 'Your password was changed, so you were signed out everywhere else. Sign in with your new password.',
  },
  locked: {
    tone: 'error',
    text: 'This account is locked because the password was entered incorrectly too many times. Please wait a '
      + 'few minutes and try again, or reset your password.',
  },
  deactivated: {
    tone: 'error',
    text: 'This account has been deactivated. Please contact your municipal office.',
  },
  ended: {
    tone: 'info',
    text: 'You have been signed out. Please sign in again.',
  },
};
