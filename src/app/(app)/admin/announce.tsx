import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, Screen, ScreenHeader, SelectField, Text } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useContent';
import { useSubjects } from '@/lib/catalog';
import { pluralize } from '@/lib/format';
import { sendAnnouncement } from '@/services/admin';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { confirmAction, toast } from '@/store/ui';
import { useTheme } from '@/theme';

const EVERYONE = '__everyone__';

/** Staff → students announcement (stored as notifications by a database function). */
export default function AnnounceScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();
  const subjects = useSubjects();
  const remote = useAuthStore((s) => s.mode) === 'supabase';
  const pushNotification = useContentStore((s) => s.pushNotification);

  const [audience, setAudience] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ audience?: string; title?: string; body?: string }>({});
  const [sending, setSending] = useState(false);

  const options = useMemo(
    () => [
      { value: EVERYONE, label: 'Everyone', description: 'All active students, instructors and admins' },
      ...subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, description: 'Students enrolled in this subject' })),
    ],
    [subjects],
  );
  const audienceLabel = options.find((o) => o.value === audience)?.label ?? '';

  const send = () => {
    const next = {
      audience: audience ? undefined : 'Choose who should receive it.',
      title: title.trim() ? (title.trim().length > 120 ? 'Keep the title under 120 characters.' : undefined) : 'Add a title.',
      body: body.trim() ? undefined : 'Write a message.',
    };
    setErrors(next);
    if (next.audience || next.title || next.body) return;

    confirmAction({
      title: 'Send announcement?',
      message: `"${title.trim()}" will be sent to ${audience === EVERYONE ? 'everyone' : audienceLabel}. It can't be unsent.`,
      confirmLabel: 'Send',
      onConfirm: async () => {
        setSending(true);
        try {
          if (remote) {
            const count = await sendAnnouncement(audience === EVERYONE ? null : audience, title.trim(), body.trim());
            toast(count ? `Sent to ${pluralize(count, 'person', 'people')}` : 'Sent, but nobody matched that audience yet', count ? 'success' : 'info');
          } else {
            // Demo mode: show it in your own inbox so the flow can be tried.
            pushNotification({ kind: 'announcement', title: title.trim(), body: body.trim() }, me.id);
            toast('Announcement sent (demo)');
          }
          router.back();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't send the announcement", 'error');
        } finally {
          setSending(false);
        }
      },
    });
  };

  return (
    <Screen
      keyboard
      header={<ScreenHeader title="Announcement" />}
      footer={
        <View
          style={{
            padding: t.spacing.xl,
            paddingBottom: insets.bottom + t.spacing.md,
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
            backgroundColor: t.colors.surface,
          }}
        >
          <Button label="Send announcement" icon="megaphone-outline" size="lg" fullWidth loading={sending} onPress={send} />
        </View>
      }
    >
      <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.sm }}>
        <Text tone="muted">Announcements appear in each recipient’s notifications.</Text>
        <SelectField
          label="Send to"
          required
          value={audience}
          options={options}
          onChange={setAudience}
          placeholder="Choose an audience"
          error={errors.audience}
        />
        <Input label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Reporting schedule moved" maxLength={120} error={errors.title} />
        <Input
          label="Message"
          required
          value={body}
          onChangeText={setBody}
          placeholder="What do students need to know?"
          multiline
          maxLength={500}
          error={errors.body}
          helper={`${body.length}/500`}
        />
      </View>
    </Screen>
  );
}
