/**
 * Supabase Storage: upload with progress, download + open/save, delete.
 *
 * Uploads use a signed upload URL (created under the caller's RLS, so it only
 * succeeds for their own folder) and stream the file from disk with
 * expo-file-system, which reports real byte progress and supports cancelling.
 * Downloads use a short-lived signed URL that Storage only issues if the user
 * may read the object (see the storage policies migration).
 */
import { Directory, File, Paths, UploadType } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { requireSupabase, supabasePublishableKey } from '@/lib/supabase';
import type { ContentKind } from '@/types';

export const BUCKETS: Record<ContentKind, string> = {
  presentation: 'presentations',
  exercise: 'exercises',
  material: 'learning-materials',
};

/** Thrown when the user cancels a transfer; callers usually stay quiet about it. */
export class TransferCancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'TransferCancelledError';
  }
}

/** "<user uuid>/<random>.<ext>": the first folder must be the uploader (enforced by RLS). */
export function newObjectPath(userId: string, extension: string): string {
  const random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  return `${userId}/${random}.${extension.toLowerCase()}`;
}

function storageErrorMessage(status: number, body: string): string {
  let message = '';
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    message = parsed.message ?? parsed.error ?? '';
  } catch {
    message = body.slice(0, 120);
  }
  if (status === 413 || /maximum allowed size|too large/i.test(message)) return 'This file is larger than the upload limit.';
  if (status === 415 || /mime type/i.test(message)) return "This file type isn't allowed.";
  if (status === 403 || /row-level security|unauthorized/i.test(message)) return "You don't have permission to upload here.";
  if (status === 409) return 'A file with this name already exists. Please try again.';
  return message || `Upload failed (HTTP ${status}).`;
}

export interface UploadParams {
  kind: ContentKind;
  path: string;
  localUri: string;
  mimeType: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Uploads a local file. Resolves with the uploaded size in bytes. */
export async function uploadFile({ kind, path, localUri, mimeType, onProgress, signal }: UploadParams): Promise<number> {
  const bucket = requireSupabase().storage.from(BUCKETS[kind]);
  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error) throw new Error(storageErrorMessage(403, JSON.stringify({ message: error.message })));
  if (signal?.aborted) throw new TransferCancelledError();

  if (Platform.OS === 'web') {
    // No byte progress on web; report start/end only.
    onProgress?.(0.05);
    const blob = await (await fetch(localUri)).blob();
    const { error: uploadError } = await bucket.uploadToSignedUrl(path, data.token, blob, { contentType: mimeType });
    if (uploadError) throw new Error(storageErrorMessage(400, JSON.stringify({ message: uploadError.message })));
    onProgress?.(1);
    return blob.size;
  }

  const file = new File(localUri);
  const size = file.size;
  try {
    const result = await file.upload(data.signedUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: {
        'content-type': mimeType,
        'x-upsert': 'false',
        'cache-control': 'max-age=3600',
        apikey: supabasePublishableKey,
      },
      onProgress: ({ bytesSent, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesSent / totalBytes : 0),
      signal,
    });
    if (result.status < 200 || result.status >= 300) throw new Error(storageErrorMessage(result.status, result.body));
  } catch (e) {
    if (signal?.aborted) throw new TransferCancelledError();
    throw e;
  }
  onProgress?.(1);
  return size;
}

/** Best-effort delete; storage policies decide whether it's allowed. */
export async function removeFile(kind: ContentKind, path: string): Promise<void> {
  const { error } = await requireSupabase().storage.from(BUCKETS[kind]).remove([path]);
  if (error) throw error;
}

export interface DownloadParams {
  kind: ContentKind;
  path: string;
  fileName: string;
  mimeType: string;
  onProgress?: (fraction: number | null) => void;
  signal?: AbortSignal;
}

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120) || 'file';

/**
 * Downloads to the app cache, then opens the system share sheet so the user can
 * open it in PowerPoint/a PDF viewer or save it to Files/Drive. On web, opens the
 * signed URL in a new tab.
 */
export async function downloadAndOpen({ kind, path, fileName, mimeType, onProgress, signal }: DownloadParams): Promise<void> {
  const { data, error } = await requireSupabase()
    .storage.from(BUCKETS[kind])
    .createSignedUrl(path, 300, { download: fileName });
  if (error) {
    throw new Error(/not found/i.test(error.message) ? "This file isn't available or you don't have access to it." : error.message);
  }

  if (Platform.OS === 'web') {
    await Linking.openURL(data.signedUrl);
    return;
  }

  const dir = new Directory(Paths.cache, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const destination = new File(dir, safeFileName(fileName));

  let file: File;
  try {
    file = await File.downloadFileAsync(data.signedUrl, destination, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw new TransferCancelledError();
    throw e;
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error('Opening files is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}
