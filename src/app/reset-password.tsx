import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, EmptyState, Icon, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { validatePassword } from '@/lib/validation';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';

type Phase = 'verifying' | 'form' | 'invalid' | 'done';

/**
 * Two entry points:
 *  1. The password-reset email link: lectern://reset-password?code=… (PKCE).
 *     The code is exchanged for a session, then the user picks a new password.
 *  2. Settings → Change password, while already signed in (no code).
 * Lives outside (auth) so the signed-in redirect doesn't bounce the recovery session.
 */
export default function ResetPasswordScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const completePasswordRecovery = useAuthStore((s) => s.completePasswordRecovery);
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [phase, setPhase] = useState<Phase>(
    params.error_description ? 'invalid' : params.code ? 'verifying' : 'form',
  );
  const [problem, setProblem] = useState<string | null>(params.error_description ?? null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const exchanged = useRef(false);
  const fromEmail = !!params.code;

  useEffect(() => {
    if (params.error_description || !params.code || exchanged.current || status === 'initializing') return;
    exchanged.current = true;
    completePasswordRecovery(params.code)
      .then(() => setPhase('form'))
      .catch((e: Error) => {
        setProblem(e.message);
        setPhase('invalid');
      });
  }, [completePasswordRecovery, params.code, params.error_description, status]);

  const submit = async () => {
    const next = {
      password: validatePassword(password, { strict: true }),
      confirm: confirm !== password ? "Passwords don't match." : null,
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setBusy(true);
    try {
      await updatePassword(password);
      setPhase('done');
    } catch (e) {
      setErrors({ password: e instanceof Error ? e.message : "Couldn't update your password." });
    } finally {
      setBusy(false);
    }
  };

  const leave = () => router.replace(useAuthStore.getState().user ? '/home' : '/login');

  if (status === 'initializing' || phase === 'verifying') {
    return (
      <Screen scroll={false} edges={['top', 'bottom']} contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: t.spacing.md }}>
        <ActivityIndicator color={t.colors.primary} />
        <Text tone="muted">Verifying your reset link…</Text>
      </Screen>
    );
  }

  if (phase === 'invalid' || (!fromEmail && !user)) {
    return (
      <Screen edges={['top', 'bottom']} header={<ScreenHeader title="" onBack={leave} />}>
        <EmptyState
          icon="link-outline"
          title="This link can't be used"
          message={problem ?? 'Open the reset link from your email on this phone, or request a new one.'}
          actionLabel="Request a new link"
          onAction={() => router.replace('/forgot-password')}
        />
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={{ alignItems: 'center', gap: t.spacing.lg, paddingTop: t.spacing.huge * 2 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.successMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="checkmark-circle-outline" size={40} color={t.colors.success} />
          </View>
          <Text variant="title" align="center">
            Password updated
          </Text>
          <Text tone="muted" align="center">
            Use your new password the next time you sign in.
          </Text>
          <Button
            label="Continue"
            size="lg"
            fullWidth
            style={{ marginTop: t.spacing.lg }}
            onPress={() => {
              toast('Password updated');
              leave();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboard edges={['top', 'bottom']} header={<ScreenHeader title={fromEmail ? '' : 'Change password'} onBack={leave} />}>
      <View style={{ gap: t.spacing.xxl }}>
        <View style={{ gap: 4 }}>
          <Text variant="display">{fromEmail ? 'Choose a new password' : 'Change password'}</Text>
          <Text tone="muted">{user ? `Signed in as ${user.email}` : 'Pick something you haven’t used before.'}</Text>
        </View>
        <View style={{ gap: t.spacing.lg }}>
          <Input
            label="New password"
            required
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            password
            autoComplete="new-password"
            textContentType="newPassword"
            helper="At least 8 characters, with a letter and a number."
            error={errors.password}
          />
          <Input
            label="Confirm new password"
            required
            icon="lock-closed-outline"
            value={confirm}
            onChangeText={setConfirm}
            password
            autoComplete="new-password"
            error={errors.confirm}
            onSubmitEditing={submit}
          />
        </View>
        <Button label="Update password" size="lg" fullWidth onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
