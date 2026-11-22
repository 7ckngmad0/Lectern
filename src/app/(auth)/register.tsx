import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { SubjectPicker } from '@/components/SubjectPicker';
import { Button, Icon, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { validateEmail, validateName, validatePassword } from '@/lib/validation';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';

type Field = 'fullName' | 'email' | 'password' | 'confirm' | 'subjects' | 'form';

export default function RegisterScreen() {
  const t = useTheme();
  const mode = useAuthStore((s) => s.mode);
  const register = useAuthStore((s) => s.register);
  const resendConfirmation = useAuthStore((s) => s.resendConfirmation);
  const mockUsers = useContentStore((s) => s.users);

  const [form, setForm] = useState({ fullName: '', email: '', course: '', section: '', password: '', confirm: '' });
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    // In demo mode we can check duplicates locally; Supabase reports them itself.
    const emailTaken = mode === 'demo' && mockUsers.some((u) => u.email === form.email.trim().toLowerCase());
    const next: Partial<Record<Field, string | null>> = {
      fullName: validateName(form.fullName),
      email: validateEmail(form.email) ?? (emailTaken ? 'An account with this email already exists.' : null),
      password: validatePassword(form.password, { strict: true }),
      confirm: form.confirm !== form.password ? "Passwords don't match." : null,
      subjects: subjectIds.length ? null : 'Pick at least one subject you are taking.',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    try {
      const { needsConfirmation } = await register({ ...form, subjectIds });
      if (needsConfirmation) {
        setSentTo(form.email.trim().toLowerCase());
      } else {
        toast('Account created. Welcome!');
        router.replace('/home');
      }
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Sign-up failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <Screen edges={['top', 'bottom']} header={<ScreenHeader title="" onBack={() => router.replace('/login')} />}>
        <View style={{ alignItems: 'center', gap: t.spacing.lg, paddingTop: t.spacing.huge }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mail-unread-outline" size={36} color={t.colors.primary} />
          </View>
          <Text variant="title" align="center">
            Confirm your email
          </Text>
          <Text tone="muted" align="center">
            We sent a confirmation link to {sentTo}. Open it on this phone, then sign in.
          </Text>
          <Button label="Go to sign in" size="lg" fullWidth onPress={() => router.replace('/login')} style={{ marginTop: t.spacing.lg }} />
          <Button
            label="Resend email"
            variant="ghost"
            onPress={() =>
              resendConfirmation(sentTo)
                .then(() => toast('Confirmation email sent'))
                .catch((e: Error) => toast(e.message, 'error'))
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboard edges={['top', 'bottom']} header={<ScreenHeader title="" />}>
      <View style={{ gap: t.spacing.xxl }}>
        <View style={{ gap: 4 }}>
          <Text variant="display">Create your account</Text>
          <Text tone="muted">Students can sign up here. Instructor accounts are set up by an administrator.</Text>
        </View>

        {errors.form ? (
          <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.colors.dangerMuted }}>
            <Icon name="alert-circle" size={20} color={t.colors.danger} />
            <Text variant="label" tone="danger" style={{ flex: 1 }}>
              {errors.form}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: t.spacing.lg }}>
          <Input label="Full name" required icon="person-outline" value={form.fullName} onChangeText={set('fullName')} placeholder="Maria Santos" autoComplete="name" error={errors.fullName} />
          <Input
            label="School email"
            required
            icon="mail-outline"
            value={form.email}
            onChangeText={set('email')}
            placeholder="you@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />
          <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
            <View style={{ flex: 3 }}>
              <Input label="Course" value={form.course} onChangeText={set('course')} placeholder="BSIT" />
            </View>
            <View style={{ flex: 2 }}>
              <Input label="Section" value={form.section} onChangeText={set('section')} placeholder="3-A" autoCapitalize="characters" />
            </View>
          </View>
          <SubjectPicker
            value={subjectIds}
            onChange={setSubjectIds}
            helper="You can upload presentations and exercises for these subjects. You can change them later."
            error={errors.subjects}
          />
          <Input
            label="Password"
            required
            icon="lock-closed-outline"
            value={form.password}
            onChangeText={set('password')}
            password
            autoComplete="new-password"
            textContentType="newPassword"
            helper="At least 8 characters, with a letter and a number."
            error={errors.password}
          />
          <Input
            label="Confirm password"
            required
            icon="lock-closed-outline"
            value={form.confirm}
            onChangeText={set('confirm')}
            password
            autoComplete="new-password"
            error={errors.confirm}
            onSubmitEditing={submit}
          />
        </View>

        <Button label="Create account" size="lg" fullWidth onPress={submit} loading={busy} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text tone="muted">Already have an account?</Text>
          <Link href="/login" asChild>
            <Pressable hitSlop={8} accessibilityRole="link">
              <Text variant="bodyMedium" tone="primary">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
