/**
 * Profile photos: the only PUBLIC bucket (`avatars`), because profile pictures
 * aren't sensitive. Storage policies only allow writing inside your own folder.
 */
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { requireSupabase } from '@/lib/supabase';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const BUCKET = 'avatars';

async function readBytes(localUri: string): Promise<Uint8Array | Blob> {
  if (Platform.OS === 'web') return (await fetch(localUri)).blob();
  return new File(localUri).bytes();
}

/** Uploads a new photo, points the profile at it, then removes the old one. Returns the public URL. */
export async function uploadAvatar(userId: string, localUri: string, extension: string, previousUrl?: string): Promise<string> {
  const ext = extension.toLowerCase();
  const contentType = AVATAR_TYPES[ext];
  if (!contentType) throw new Error('Use a JPG, PNG or WebP image.');

  const sb = requireSupabase();
  const path = `${userId}/avatar-${Date.now().toString(36)}.${ext}`;
  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, await readBytes(localUri), {
    contentType,
    upsert: false,
    cacheControl: '3600',
  });
  if (uploadError) {
    throw new Error(/size/i.test(uploadError.message) ? 'That photo is larger than 2 MB.' : uploadError.message);
  }

  const publicUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  if (error) {
    await sb.storage.from(BUCKET).remove([path]).catch(() => {});
    throw new Error(error.message);
  }
  await removeOld(previousUrl);
  return publicUrl;
}

export async function removeAvatar(userId: string, currentUrl?: string): Promise<void> {
  const { error } = await requireSupabase().from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw new Error(error.message);
  await removeOld(currentUrl);
}

/** Best effort: the object key is everything after "/avatars/" in the public URL. */
async function removeOld(url?: string) {
  const key = url?.split(`/${BUCKET}/`)[1]?.split('?')[0];
  if (key) await requireSupabase().storage.from(BUCKET).remove([decodeURIComponent(key)]).catch(() => {});
}
