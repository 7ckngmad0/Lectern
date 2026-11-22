import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NotificationKind } from '@/types';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface NotificationPrefs {
  newMaterials: boolean;
  uploads: boolean;
  announcements: boolean;
}

interface PrefsState {
  themePreference: ThemePreference;
  notificationPrefs: NotificationPrefs;
  setThemePreference: (pref: ThemePreference) => void;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
}

/** Device-level preferences, saved on this phone (not tied to the account). */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      notificationPrefs: { newMaterials: true, uploads: true, announcements: true },
      setThemePreference: (themePreference) => set({ themePreference }),
      setNotificationPref: (key, value) => set((s) => ({ notificationPrefs: { ...s.notificationPrefs, [key]: value } })),
    }),
    {
      name: 'lectern.prefs',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ themePreference: s.themePreference, notificationPrefs: s.notificationPrefs }),
    },
  ),
);

/** Which notification kinds a preference switch controls. */
export const PREF_FOR_KIND: Record<NotificationKind, keyof NotificationPrefs> = {
  upload_success: 'uploads',
  new_material: 'newMaterials',
  material_updated: 'newMaterials',
  announcement: 'announcements',
};
