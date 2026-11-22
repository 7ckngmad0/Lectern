import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Icon, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { validateEmail } from '@/lib/validation';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const t = useTheme();
  const mode = useAuthStore((s) => s.mode);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the email. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen edges={['top', 'bottom']} header={<ScreenHeader title="" />}>
        <View style={{ alignItems: 'center', gap: t.spacing.lg, paddingTop: t.spacing.huge }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: t.colors.successMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="mail-open-outline" size={36} color={t.colors.success} />
          </View>
          <Text variant="title" align="center">
            Check your email
          </Text>
          <Text tone="muted" align="center">
            If an account exists for {email.trim()}, we’ve sent a link to reset your password. Open it on this phone.
          </Text>
          {mode === 'demo' ? (
            <Text variant="caption" tone="subtle" align="center">
              Demo mode: no email is sent because Supabase isn’t configured.
            </Text>
          ) : null}
          <Button label="Back to sign in" size="lg" fullWidth onPress={() => router.replace('/login')} style={{ marginTop: t.spacing.lg }} />
          <Button label="Use a different email" variant="ghost" onPress={() => setSent(false)} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboard edges={['top', 'bottom']} header={<ScreenHeader title="" />}>
      <View style={{ gap: t.spacing.xxl }}>
        <View style={{ gap: 4 }}>
          <Text variant="display">Reset your password</Text>
          <Text tone="muted">Enter the email you signed up with and we’ll send you a reset link.</Text>
        </View>
        <Input
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="you@school.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={error}
          onSubmitEditing={submit}
        />
        <Button label="Send reset link" size="lg" fullWidth onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
