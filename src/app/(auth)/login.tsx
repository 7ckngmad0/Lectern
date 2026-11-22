import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { APP_NAME, LogoMark } from '@/components/Brand';
import { Button, Card, Icon, Input, Screen, Text } from '@/components/ui';
import { validateEmail } from '@/lib/validation';
import { useAuthStore, type DemoRole } from '@/store/auth';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';

const DEMO_ROLES: { role: DemoRole; label: string }[] = [
  { role: 'student', label: 'Student' },
  { role: 'instructor', label: 'Instructor' },
  { role: 'admin', label: 'Admin' },
];

export default function LoginScreen() {
  const t = useTheme();
  const mode = useAuthStore((s) => s.mode);
  const notice = useAuthStore((s) => s.notice);
  const signIn = useAuthStore((s) => s.signIn);
  const signInDemo = useAuthStore((s) => s.signInDemo);
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string }>({});
  const [busy, setBusy] = useState<'form' | 'resend' | DemoRole | null>(null);

  const formError = errors.form ?? notice;
  const needsConfirmation = !!errors.form && /confirm your email/i.test(errors.form);

  const submit = async () => {
    const next = {
      email: validateEmail(email),
      password: password ? null : 'Enter your password.',
    };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy('form');
    try {
      await signIn(email, password);
      router.replace('/home');
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Sign-in failed. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    setBusy('resend');
    try {
      await resendConfirmation(email);
      toast('Confirmation email sent');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send the email", 'error');
    } finally {
      setBusy(null);
    }
  };

  const demo = async (role: DemoRole) => {
    setBusy(role);
    try {
      await signInDemo(role);
      toast(`Signed in as demo ${role}`);
      router.replace('/home');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen keyboard edges={['top', 'bottom']} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ gap: t.spacing.xxl, paddingVertical: t.spacing.xxl }}>
        <View style={{ gap: t.spacing.lg }}>
          <LogoMark size={52} />
          <View style={{ gap: 4 }}>
            <Text variant="display">Welcome back</Text>
            <Text tone="muted">Sign in to continue to {APP_NAME}.</Text>
          </View>
        </View>

        {formError ? (
          <View
            accessibilityRole="alert"
            style={{ gap: t.spacing.sm, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.colors.dangerMuted }}
          >
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="alert-circle" size={20} color={t.colors.danger} />
              <Text variant="label" tone="danger" style={{ flex: 1 }}>
                {formError}
              </Text>
            </View>
            {needsConfirmation ? (
              <Button label="Resend confirmation email" variant="secondary" size="sm" onPress={resend} loading={busy === 'resend'} />
            ) : null}
          </View>
        ) : null}

        <View style={{ gap: t.spacing.lg }}>
          <Input
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
          />
          <Input
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            password
            autoComplete="password"
            textContentType="password"
            error={errors.password}
            onSubmitEditing={submit}
          />
          <Link href="/forgot-password" asChild>
            <Pressable hitSlop={8} style={{ alignSelf: 'flex-end' }} accessibilityRole="link">
              <Text variant="label" tone="primary">
                Forgot password?
              </Text>
            </Pressable>
          </Link>
          <Button label="Sign in" size="lg" fullWidth onPress={submit} loading={busy === 'form'} disabled={!!busy && busy !== 'form'} />
        </View>

        {mode === 'demo' ? (
          <Card style={{ gap: t.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="flask-outline" size={16} color={t.colors.textMuted} />
              <Text variant="label" tone="muted" style={{ flex: 1 }}>
                Demo mode: Supabase isn’t configured, so these mock accounts are used.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
              {DEMO_ROLES.map((r) => (
                <Button
                  key={r.role}
                  label={r.label}
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1, paddingHorizontal: 6 }}
                  onPress={() => demo(r.role)}
                  loading={busy === r.role}
                  disabled={!!busy && busy !== r.role}
                />
              ))}
            </View>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text tone="muted">New to {APP_NAME}?</Text>
          <Link href="/register" asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <Text variant="bodyMedium" tone="primary">
                Create an account
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
