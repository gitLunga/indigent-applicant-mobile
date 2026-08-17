import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
// The context-based API. `manipulateAsync` still exists but is deprecated in
// SDK 57, and `useImageManipulator` is a hook — no use inside an async handler
// where the URI only exists once the picker has returned.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import api, { friendlyError } from './api';

/**
 * Getting a supporting document off the phone and onto the server.
 *
 * The server has always accepted PDFs, photographs and Word documents — see
 * `ALLOWED_EXTENSIONS` in the API's `lib/fileType.js`. The app was the only
 * thing insisting on a photograph, which meant a household whose proof of income
 * arrived as an emailed PDF payslip had to photograph their own screen to send
 * it. This module removes that restriction and matches the server's list
 * exactly, so nothing is offered here that will be refused there.
 */

/** Exactly the extensions the API's `fileFilter` allows. Kept in step by hand. */
export const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * multer's limit is 10MB. The check is repeated here so the failure arrives
 * before the upload rather than after it — on a metered connection, discovering
 * a file is too big *after* sending it costs real money for nothing.
 */
export const MAX_BYTES = 10 * 1024 * 1024;

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

const isImage = (mimeType: string) => mimeType.startsWith('image/');

export const humanSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** A friendly label for the file-type icon and the slot's caption. */
export function fileKind(mimeType?: string | null, fileName?: string | null): 'image' | 'pdf' | 'doc' {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(jpe?g|png)$/.test(name)) return 'image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'doc';
}

// ---------------------------------------------------------------------------
// Picking
// ---------------------------------------------------------------------------

/** Photograph the document. */
export async function takePhoto(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission was not given. You can choose a photo or a file from your phone instead.');
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.fileName || 'photo.jpg', mimeType: 'image/jpeg', size: asset.fileSize };
}

/** Choose an existing photograph from the gallery. */
export async function pickPhoto(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo permission was not given.');

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || 'photo.jpg',
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  };
}

/**
 * Choose a file — a PDF payslip, a scanned bank statement, a Word affidavit.
 *
 * `copyToCacheDirectory` is left on. Without it the URI can point into a
 * provider the upload cannot read back on Android, and the request fails with a
 * file-not-found for a file the person can plainly see.
 */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED_MIME,
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || 'document',
    // The picker can return null for an unrecognised type. Falling back to
    // octet-stream lets the server's byte sniffer make the call, which it does
    // better than a guess from the file extension anyway.
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Preparing and sending
// ---------------------------------------------------------------------------

/**
 * Shrink a photograph before it leaves the phone. Leave everything else alone.
 *
 * A camera photo is 4–8MB. The server accepts up to 10, so an uncompressed
 * upload *works* — and costs a household most of an airtime voucher at a gate,
 * on a connection that will probably drop halfway. 1600px on the long edge at
 * 70% quality is comfortably readable for an ID document and lands around 300KB.
 *
 * A PDF must never come through here. Running a document through an image
 * manipulator and saving it as JPEG produces either an error or a one-page
 * screenshot of page one — and silently discarding pages two and three of
 * somebody's bank statement is far worse than refusing the file.
 */
async function prepare(file: PickedFile): Promise<PickedFile> {
  if (!isImage(file.mimeType)) return file;

  const image = await ImageManipulator.manipulate(file.uri).resize({ width: 1600 }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  return {
    uri: saved.uri,
    // Forced to .jpg deliberately: iPhones produce HEIC, the server sniffs the
    // leading bytes and correctly rejects it, and the applicant would see a
    // broken app rather than a wrong file type.
    name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    mimeType: 'image/jpeg',
  };
}

/**
 * Fill a document slot.
 *
 * `documentId` is what fills *this* slot. Sending only `type` is a different
 * operation — it attaches an extra optional document and leaves the requirement
 * open, which is right for somebody adding a second payslip and wrong here.
 */
/** Thrown when the applicant cancelled. Not an error to apologise for. */
export class UploadCancelled extends Error {
  constructor() {
    super('Upload cancelled');
    this.name = 'UploadCancelled';
  }
}

export async function uploadDocument({
  applicationId,
  documentId,
  documentType,
  file,
  onProgress,
  signal,
}: {
  applicationId: string;
  documentId?: string;
  documentType: string;
  file: PickedFile;
  /**
   * Called with the true fraction sent, 0 to 1, and null where the total is
   * unknown. Never invented: a bar that creeps to 90% and waits teaches people
   * that the number means nothing, which is worse than no number at all.
   */
  onProgress?: (fraction: number | null, loaded: number, total: number | null) => void;
  /** Aborts the upload. Somebody on a bad link needs an option besides closing the app. */
  signal?: AbortSignal;
}): Promise<void> {
  if (file.size && file.size > MAX_BYTES) {
    throw new Error(
      `That file is ${humanSize(file.size)}. The largest we can accept is 10 MB — `
      + 'try photographing the document instead of scanning it, or send it a page at a time.',
    );
  }

  const prepared = await prepare(file);

  const body = new FormData();
  if (documentId) body.append('documentId', documentId);
  body.append('type', documentType);
  body.append('file', {
    uri: prepared.uri,
    // The real name and type, not a hardcoded `.jpg`. The server checks the
    // extension before it checks anything else, so calling a PDF `id_copy.jpg`
    // gets it rejected as an invalid file type.
    name: prepared.name,
    type: prepared.mimeType,
  } as never);

  /**
   * Sent with axios — which goes through XMLHttpRequest — and deliberately not
   * with `fetch`.
   *
   * `fetch` is no longer React Native's. Expo replaces the global with its
   * WinterCG implementation, which assembles the multipart body in JavaScript
   * out of `Blob`s and has no way to read a `file://` URI. The part appended
   * above is neither a Blob nor something with `bytes()`, so that implementation
   * rejects it outright — "Unsupported FormDataPart implementation" — before a
   * single byte reaches the network.
   *
   * XMLHttpRequest hands the parts to the native networking layer instead, which
   * streams the file straight off disk. That is also why it is the right choice
   * regardless of the bug: a 10MB scan never has to sit in the JavaScript heap,
   * which matters on the cheap phones this app is written for.
   *
   * No Content-Type is set here on purpose. axios passes a FormData body through
   * untouched and adds no type of its own, which leaves the native layer free to
   * generate `multipart/form-data` with the boundary the server needs — set it
   * by hand and the boundary goes missing.
   */
  try {
    await api.post(`/documents/${applicationId}/upload`, body, {
      /**
       * The instance's 45 seconds is right for ordinary requests and wrong for
       * this one. Ten megabytes over a weak connection legitimately takes
       * minutes, and cutting that off would fail uploads that were going to
       * succeed — the one thing worse than a slow upload is a slow upload that
       * is thrown away at the end.
       */
      timeout: 180000,
      signal,
      onUploadProgress: (event) => {
        if (!onProgress) return;
        // event.total is absent on some React Native networking stacks. Report
        // null rather than dividing by an assumed size.
        const total = event.total ?? null;
        onProgress(total ? event.loaded / total : null, event.loaded, total);
      },
    });
  } catch (error) {
    // A cancellation is not a failure and must not be reported as one.
    if ((error as { code?: string })?.code === 'ERR_CANCELED') {
      throw new UploadCancelled();
    }
    // The API writes its own wording for applicants; `friendlyError` prefers it
    // over anything invented here, and falls back to plain language rather than
    // axios's "Request failed with status code 400".
    throw new Error(friendlyError(error, 'The upload was refused.'));
  }
}
