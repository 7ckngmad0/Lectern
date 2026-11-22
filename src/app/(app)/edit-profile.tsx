import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubjectPicker } from '@/components/SubjectPicker';
import { Avatar, Button, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useContent';
import { getExtension } from '@/lib/files';
import { validateName } from '@/lib/validation';
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '@/services/avatar';
import { useAuthStore } from '@/store/auth';
import { confirmAction, toast } from '@/store/ui';
import { useTheme } from '@/theme';

const ROLE_LABEL = { student: 'Student', instructor: 'Instructor', admin: 'Administrator' } as const;

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function EditProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setAvatar = useAuthStore((s) => s.setAvatar);
  const clearAvatar = useAuthStore((s) => s.clearAvatar);
  const [photoBusy, setPhotoBusy] = useState(false);

  const pickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const ext = getExtension(asset.name);
      if (!AVATAR_TYPES[ext]) return toast('Use a JPG, PNG or WebP image.', 'error');
      if (asset.size && asset.size > AVATAR_MAX_BYTES) return toast('That photo is larger than 2 MB.', 'error');
      setPhotoBusy(true);
      await setAvatar(asset.uri, ext);
      toast('Profile photo updated');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update your photo", 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () =>
    confirmAction({
      title: 'Remove profile photo?',
      message: 'Your initials will be shown instead.',
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: async () => {
        setPhotoBusy(true);
        try {
          await clearAvatar();
          toast('Profile photo removed');
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't remove your photo", 'error');
        } finally {
          setPhotoBusy(false);
        }
      },
    });
  const isStudent = user.role === 'student';

  const [fullName, setFullName] = useState(user.fullName);
  const [course, setCourse] = useState(user.course ?? '');
  const [section, setSection] = useState(user.section ?? '');
  const [subjectIds, setSubjectIds] = useState(user.subjectIds);
  const [errors, setErrors] = useState<{ name?: string | null; subjects?: string | null }>({});
  const [busy, setBusy] = useState(false);

  const subjectsChanged = !sameSet(subjectIds, user.subjectIds);
  const dirty =
    fullName !== user.fullName || course !== (user.course ?? '') || section !== (user.section ?? '') || subjectsChanged;

  const save = async () => {
    const next = {
      name: validateName(fullName),
      subjects: isStudent && subjectIds.length === 0 ? 'Keep at least one subject.' : null,
    };
    setErrors(next);
    if (next.name || next.subjects) return;
    setBusy(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        course: course.trim(),
        section: section.trim(),
        ...(subjectsChanged && { subjectIds }),
      });
      toast('Profile updated');
      router.back();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save your profile", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      header={<ScreenHeader title="Edit profile" />}
      footer={
        <View style={{ padding: t.spacing.xl, paddingBottom: insets.bottom + t.spacing.md, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.surface }}>
          <Button label="Save changes" size="lg" fullWidth onPress={save} disabled={!dirty} loading={busy} />
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.xl }}>
        <Avatar name={fullName.trim() || user.fullName} size={88} uri={user.avatarUrl} />
        <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
          <Button
            label={user.avatarUrl ? 'Change photo' : 'Add photo'}
            variant="ghost"
            size="sm"
            icon="camera-outline"
            loading={photoBusy}
            onPress={() => void pickPhoto()}
          />
          {user.avatarUrl && !photoBusy ? (
            <Button label="Remove" variant="ghost" size="sm" icon="trash-outline" onPress={removePhoto} />
          ) : null}
        </View>
        <Text variant="caption" tone="subtle">
          JPG, PNG or WebP, up to 2 MB. Profile photos are publicly viewable.
        </Text>
      </View>

      <View style={{ gap: t.spacing.lg }}>
        <Input label="Full name" required value={fullName} onChangeText={setFullName} error={errors.name} autoComplete="name" />
        <Input label="Email" value={user.email} editable={false} helper="Your sign-in email can only be changed by an administrator." />
        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
          <View style={{ flex: 3 }}>
            <Input label="Course" value={course} onChangeText={setCourse} placeholder="BS Information Technology" />
          </View>
          <View style={{ flex: 2 }}>
            <Input label="Section" value={section} onChangeText={setSection} placeholder="3-A" autoCapitalize="characters" />
          </View>
        </View>
        {isStudent ? (
          <SubjectPicker
            value={subjectIds}
            onChange={setSubjectIds}
            helper="You can only upload presentations and exercises for these subjects."
            error={errors.subjects}
          />
        ) : null}
        <View style={{ gap: 6 }}>
          <Text variant="label" tone="muted">
            Role
          </Text>
          <Text>{ROLE_LABEL[user.role]}</Text>
          <Text variant="caption" tone="subtle">
            Roles are assigned by an administrator.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
