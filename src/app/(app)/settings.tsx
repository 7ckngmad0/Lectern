import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Switch, View } from 'react-native';

import { Badge, Card, ListRow, Screen, ScreenHeader, Segmented, Text } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { usePrefsStore, type NotificationPrefs, type ThemePreference } from '@/store/prefs';
import { confirmAction, toast } from '@/store/ui';
import { useTheme } from '@/theme';

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; title: string; subtitle: string }[] = [
  { key: 'uploads', title: 'Upload confirmations', subtitle: 'When your files finish uploading' },
  { key: 'newMaterials', title: 'New & updated materials', subtitle: 'When instructors publish or update library materials' },
  { key: 'announcements', title: 'Announcements', subtitle: 'Important updates from your instructors' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const themePreference = usePrefsStore((s) => s.themePreference);
  const setThemePreference = usePrefsStore((s) => s.setThemePreference);
  const notificationPrefs = usePrefsStore((s) => s.notificationPrefs);
  const setNotificationPref = usePrefsStore((s) => s.setNotificationPref);
  const resetDemoData = useContentStore((s) => s.resetDemoData);
  const authMode = useAuthStore((s) => s.mode);

  const label = (text: string) => (
    <Text variant="overline" tone="subtle" uppercase style={{ marginTop: t.spacing.xxl, marginBottom: t.spacing.sm }}>
      {text}
    </Text>
  );

  return (
    <Screen header={<ScreenHeader title="Settings" />}>
      {label('Security')}
      <Card padding={0}>
        <ListRow
          icon="key-outline"
          title="Change password"
          subtitle={authMode === 'demo' ? 'Not available in demo mode' : undefined}
          onPress={authMode === 'demo' ? undefined : () => router.push('/reset-password')}
          isLast
        />
      </Card>

      {label('Appearance')}
      <Segmented<ThemePreference>
        value={themePreference}
        onChange={setThemePreference}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />

      {label('Notifications')}
      <Card padding={0}>
        {NOTIFICATION_ROWS.map((row, i) => (
          <ListRow
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            isLast={i === NOTIFICATION_ROWS.length - 1}
            trailing={
              <Switch
                value={notificationPrefs[row.key]}
                onValueChange={(v) => setNotificationPref(row.key, v)}
                trackColor={{ true: t.colors.primary, false: t.colors.borderStrong }}
                thumbColor="#FFFFFF"
                accessibilityLabel={row.title}
              />
            }
          />
        ))}
      </Card>

      {authMode === 'demo' ? label('Demo data') : null}
      {/* Resetting would wipe real presentations from view in Supabase mode. */}
      {authMode === 'demo' ? (
        <Card padding={0}>
          <ListRow
            icon="refresh-outline"
            title="Reset demo data"
            subtitle="Restore the original mock files, bookmarks and notifications"
            onPress={() =>
              confirmAction({
                title: 'Reset demo data?',
                message: 'Uploads, edits and bookmarks made in this session will be discarded.',
                confirmLabel: 'Reset',
                destructive: true,
                onConfirm: () => {
                  resetDemoData();
                  toast('Demo data restored');
                },
              })
            }
            isLast
          />
        </Card>
      ) : null}

      {label('About')}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyMedium">Version</Text>
          <Text tone="muted">{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: t.spacing.md }}>
          <Text variant="bodyMedium">Accounts</Text>
          {authMode === 'supabase' ? <Badge label="Supabase" tone="success" icon="cloud-done" /> : <Badge label="Demo (mock)" tone="warning" />}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: t.spacing.md }}>
          <Text variant="bodyMedium">Files, library & bookmarks</Text>
          {authMode === 'supabase' ? <Badge label="Supabase" tone="success" icon="cloud-done" /> : <Badge label="Demo (mock)" tone="warning" />}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: t.spacing.md }}>
          <Text variant="bodyMedium">Admin & announcements</Text>
          {authMode === 'supabase' ? <Badge label="Supabase" tone="success" icon="cloud-done" /> : <Badge label="Demo (mock)" tone="warning" />}
        </View>
      </Card>
    </Screen>
  );
}
