import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  Icon,
  Input,
  ProgressBar,
  Screen,
  ScreenHeader,
  Segmented,
  SelectField,
  Text,
} from '@/components/ui';
import {
  useSubjects,
  EXERCISE_CATEGORIES,
  getModule,
  KIND_LABEL,
  MATERIAL_TYPES,
  modulesFor,
  topicsFor,
} from '@/lib/catalog';
import { describeRules, getExtension, mimeFor, pickerMimeTypes, validateFile } from '@/lib/files';
import { formatBytes, newId, parseTags } from '@/lib/format';
import { canUploadForSubject, isStaff } from '@/lib/permissions';
import { detailHref } from '@/lib/routes';
import { createItem, updateItem, type ItemFields } from '@/services/content';
import { TransferCancelledError } from '@/services/storage';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { usePrefsStore } from '@/store/prefs';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';
import type {
  ContentItem,
  ContentKind,
  Exercise,
  ExerciseCategory,
  FileMeta,
  LearningMaterial,
  MaterialType,
  Presentation,
  Visibility,
} from '@/types';
import { FileTypeIcon } from './FileTypeIcon';

interface UploadFormProps {
  kind: ContentKind;
  /** When set, the form edits this item instead of creating a new one. */
  existing?: ContentItem;
}

type Errors = Partial<Record<'file' | 'title' | 'subject' | 'module' | 'topic' | 'type', string>>;

function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base[0].toUpperCase() + base.slice(1) : '';
}

export function UploadForm({ kind, existing }: UploadFormProps) {
  const t = useTheme();
  const allSubjects = useSubjects();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user)!;
  const staff = isStaff(user);
  const upsertItem = useContentStore((s) => s.upsertItem);
  const logActivity = useContentStore((s) => s.logActivity);
  const pushNotification = useContentStore((s) => s.pushNotification);
  const notifyUploads = usePrefsStore((s) => s.notificationPrefs.uploads);

  const editing = !!existing;
  const needsModule = kind !== 'presentation';

  const [file, setFile] = useState<FileMeta | null>(null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(existing?.subjectId ?? null);
  const [moduleId, setModuleId] = useState<string | null>(
    existing && 'moduleId' in existing ? existing.moduleId : null,
  );
  const [topicId, setTopicId] = useState<string | null>(existing?.topicId ?? null);
  const [tagsText, setTagsText] = useState(existing?.tags.join(', ') ?? '');
  const [visibility, setVisibility] = useState<Visibility>(
    existing && existing.kind !== 'material' ? existing.visibility : 'shared',
  );
  const [category, setCategory] = useState<ExerciseCategory | null>(
    existing?.kind === 'exercise' ? existing.category : null,
  );
  const [isOfficial, setIsOfficial] = useState(existing?.kind === 'exercise' ? existing.isOfficial : staff);
  const [materialType, setMaterialType] = useState<MaterialType | null>(
    existing?.kind === 'material' ? existing.type : null,
  );
  const [isFeatured, setIsFeatured] = useState(existing?.kind === 'material' ? existing.isFeatured : false);
  const [published, setPublished] = useState(existing?.kind === 'material' ? existing.status === 'published' : true);

  const [errors, setErrors] = useState<Errors>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      abortRef.current?.abort();
    },
    [],
  );

  // Supabase mode: real upload + database row. Demo mode: simulated.
  const remote = useAuthStore((s) => s.mode) === 'supabase';

  const subjectOptions = useMemo(
    () =>
      allSubjects
        .filter((s) => canUploadForSubject(user, s.id) || s.id === existing?.subjectId)
        .map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` })),
    [allSubjects, existing?.subjectId, user],
  );
  const moduleOptions = useMemo(
    () => (subjectId ? modulesFor(subjectId).map((m) => ({ value: m.id, label: m.title })) : []),
    [subjectId],
  );
  const topicOptions = useMemo(() => {
    if (!subjectId) return [];
    return topicsFor(subjectId, needsModule ? moduleId : null).map((tp) => ({
      value: tp.id,
      label: tp.title,
      description: needsModule ? undefined : getModule(tp.moduleId)?.title,
    }));
  }, [moduleId, needsModule, subjectId]);

  const tags = parseTags(tagsText);
  const uploading = progress !== null;
  const busy = uploading || saving;
  const currentFile = file ?? existing?.file ?? null;

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Android file managers don't always report Office MIME types, so we
        // show everything there and validate by extension instead.
        type: Platform.OS === 'android' ? '*/*' : pickerMimeTypes(kind),
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const error = validateFile(kind, { fileName: asset.name, sizeBytes: asset.size });
      if (error) {
        setErrors((e) => ({ ...e, file: error }));
        toast(error, 'error');
        return;
      }
      const extension = getExtension(asset.name);
      setFile({
        fileName: asset.name,
        extension,
        // Derived from the extension: pickers sometimes report generic types,
        // and Storage only accepts the MIME types listed for each bucket.
        mimeType: mimeFor(extension),
        sizeBytes: asset.size ?? 0,
        uri: asset.uri,
      });
      setErrors((e) => ({ ...e, file: undefined }));
      setUploadError(null);
      if (!title.trim()) setTitle(titleFromFileName(asset.name));
    } catch {
      toast("Couldn't open the file picker. Please try again.", 'error');
    }
  };

  const validate = (): boolean => {
    const next: Errors = {};
    if (!currentFile) next.file = 'Choose a file to upload.';
    if (!title.trim()) next.title = 'Add a title.';
    else if (title.trim().length > 120) next.title = 'Keep the title under 120 characters.';
    if (!subjectId) next.subject = 'Choose a subject.';
    if (needsModule && !moduleId) next.module = 'Choose a module.';
    if (!topicId) next.topic = kind === 'presentation' ? 'Choose the topic your presentation covers.' : 'Choose a topic.';
    if (kind === 'material' && !materialType) next.type = 'Choose a material type.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** Shared follow-up once an item is saved (remote or mock). */
  const afterSave = (item: ContentItem) => {
    upsertItem(item);
    logActivity(user.id, editing ? 'updated' : 'uploaded', item);
    if (!editing && notifyUploads) {
      pushNotification(
        {
          kind: 'upload_success',
          title: 'Upload complete',
          body: `"${item.title}" was uploaded successfully.`,
          target: { kind: item.kind, id: item.id },
        },
        user.id,
      );
    }
    // In Supabase mode, database triggers notify the enrolled students instead.
    if (!remote && item.kind === 'material' && item.status === 'published') {
      pushNotification({
        kind: editing ? 'material_updated' : 'new_material',
        title: editing ? 'Material updated' : 'New learning material',
        body: `"${item.title}" is ${editing ? 'updated' : 'now available'} in the library.`,
        target: { kind: 'material', id: item.id },
      });
    }
    toast(editing ? 'Changes saved' : `${KIND_LABEL[kind]} uploaded`);
    if (editing) router.back();
    else router.replace(detailHref(item.kind, item.id));
  };

  /** Supabase path: upload the file with real progress, then write the row. */
  const saveRemote = async () => {
    if (!topicId) return;
    const fields: ItemFields = { title: title.trim(), description: description.trim(), topicId, tags, visibility };
    if (kind === 'exercise') {
      fields.category = category ?? 'activity';
      // Only staff may set this; the database ignores it for everyone else.
      if (staff) fields.isOfficial = isOfficial;
    }
    if (kind === 'material') {
      fields.materialType = materialType ?? 'other';
      fields.status = published ? 'published' : 'draft';
      fields.isFeatured = published && isFeatured; // drafts can't be featured
    }
    const picked = file?.uri ? { localUri: file.uri, fileName: file.fileName, extension: file.extension } : null;
    if (!existing && !picked) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setUploadError(null);
    if (picked) setProgress(0);
    else setSaving(true);
    try {
      const opts = { signal: controller.signal, onProgress: (f: number) => setProgress(f) };
      let item: ContentItem;
      if (existing?.kind === 'presentation') item = await updateItem('presentation', user.id, existing, fields, picked, opts);
      else if (existing?.kind === 'exercise') item = await updateItem('exercise', user.id, existing, fields, picked, opts);
      else if (existing?.kind === 'material') item = await updateItem('material', user.id, existing, fields, picked, opts);
      else item = await createItem(kind, user.id, fields, picked!, opts);
      afterSave(item);
    } catch (e) {
      if (e instanceof TransferCancelledError) toast('Upload cancelled', 'info');
      else setUploadError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      abortRef.current = null;
      setProgress(null);
      setSaving(false);
    }
  };

  const save = () => {
    if (!currentFile || !subjectId || !topicId) return;
    const now = new Date().toISOString();
    const base = {
      id: existing?.id ?? newId(kind[0]),
      title: title.trim(),
      description: description.trim(),
      subjectId,
      topicId,
      tags,
      ownerId: existing?.ownerId ?? user.id,
      file: currentFile,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    let item: ContentItem;
    if (kind === 'presentation') {
      item = { ...base, kind: 'presentation', visibility } satisfies Presentation;
    } else if (kind === 'exercise') {
      item = {
        ...base,
        kind: 'exercise',
        moduleId: moduleId!,
        category: category ?? 'activity',
        isOfficial: staff ? isOfficial : existing?.kind === 'exercise' ? existing.isOfficial : false,
        visibility,
      } satisfies Exercise;
    } else {
      item = {
        ...base,
        kind: 'material',
        moduleId: moduleId!,
        type: materialType ?? 'other',
        isFeatured,
        status: published ? 'published' : 'draft',
      } satisfies LearningMaterial;
    }
    afterSave(item);
  };

  const submit = () => {
    if (busy || !validate()) return;
    if (remote) return void saveRemote();
    // No new file → metadata-only edit, save immediately.
    if (!file) return save();

    // MOCK upload progress (demo mode only).
    let p = 0;
    setProgress(0);
    timer.current = setInterval(() => {
      p = Math.min(1, p + 0.07 + Math.random() * 0.08);
      setProgress(p);
      if (p >= 1) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setTimeout(save, 150);
      }
    }, 110);
  };

  const heading = editing ? `Edit ${KIND_LABEL[kind].toLowerCase()}` : `Upload ${KIND_LABEL[kind].toLowerCase()}`;

  return (
    <Screen
      keyboard
      header={<ScreenHeader title={heading} />}
      footer={
        <View
          style={{
            paddingHorizontal: t.spacing.xl,
            paddingTop: t.spacing.md,
            paddingBottom: insets.bottom + t.spacing.md,
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
            backgroundColor: t.colors.surface,
            gap: t.spacing.sm,
          }}
        >
          {uploadError && !busy ? (
            <View
              accessibilityRole="alert"
              style={{ flexDirection: 'row', gap: 10, padding: t.spacing.md, borderRadius: t.radius.md, backgroundColor: t.colors.dangerMuted }}
            >
              <Icon name="alert-circle" size={20} color={t.colors.danger} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label" tone="danger">
                  {editing ? "Couldn't save your changes" : 'Upload failed'}
                </Text>
                <Text variant="caption" tone="danger">
                  {uploadError}
                </Text>
              </View>
            </View>
          ) : null}
          {uploading ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing.sm }}>
                <Text variant="label" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                  Uploading {currentFile?.fileName}
                </Text>
                <Text variant="label">{Math.round((progress ?? 0) * 100)}%</Text>
              </View>
              <ProgressBar progress={progress ?? 0} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            {uploading && remote ? (
              <Button label="Cancel" variant="secondary" size="lg" onPress={() => abortRef.current?.abort()} />
            ) : null}
            <Button
              label={
                uploading ? 'Uploading…' : saving ? 'Saving…' : uploadError ? 'Retry' : editing ? 'Save changes' : 'Upload'
              }
              icon={uploadError ? 'refresh' : editing ? 'checkmark' : 'cloud-upload-outline'}
              size="lg"
              loading={busy}
              onPress={submit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      }
    >
      <View style={{ gap: t.spacing.xl, paddingTop: t.spacing.sm }}>
        <FilePickerField
          kind={kind}
          file={currentFile}
          isNew={!!file}
          error={errors.file}
          disabled={busy}
          onPick={pickFile}
          onClear={file ? () => setFile(null) : undefined}
        />

        <Input
          label="Title"
          required
          value={title}
          onChangeText={setTitle}
          placeholder={kind === 'presentation' ? 'e.g. Designing Clean REST APIs' : 'e.g. Lab 4: Build a REST Endpoint'}
          error={errors.title}
          maxLength={120}
        />

        <Input
          label={kind === 'exercise' ? 'Instructions' : 'Description'}
          value={description}
          onChangeText={setDescription}
          placeholder={
            kind === 'exercise' ? 'What should students do with this file?' : 'A short summary of what this covers'
          }
          multiline
          maxLength={1000}
        />

        <SelectField
          label="Subject"
          required
          value={subjectId}
          options={subjectOptions}
          onChange={(v) => {
            setSubjectId(v);
            setModuleId(null);
            setTopicId(null);
          }}
          placeholder="Choose a subject"
          error={errors.subject}
          helper={staff ? undefined : 'Only subjects you are enrolled in are listed.'}
        />

        {needsModule ? (
          <SelectField
            label="Module"
            required
            value={moduleId}
            options={moduleOptions}
            onChange={(v) => {
              setModuleId(v);
              setTopicId(null);
            }}
            placeholder={subjectId ? 'Choose a module' : 'Choose a subject first'}
            disabled={!subjectId}
            error={errors.module}
          />
        ) : null}

        <SelectField
          label="Topic"
          required
          value={topicId}
          options={topicOptions}
          onChange={setTopicId}
          placeholder={
            !subjectId ? 'Choose a subject first' : needsModule && !moduleId ? 'Choose a module first' : 'Choose a topic'
          }
          disabled={!subjectId || (needsModule && !moduleId)}
          error={errors.topic}
          helper={kind === 'presentation' ? 'Presentations must cover an approved course topic.' : undefined}
        />

        {kind === 'exercise' ? (
          <SelectField
            label="Category"
            value={category}
            options={EXERCISE_CATEGORIES}
            onChange={setCategory}
            placeholder="Activity"
          />
        ) : null}

        {kind === 'material' ? (
          <SelectField
            label="Material type"
            required
            value={materialType}
            options={MATERIAL_TYPES.map(({ value, label }) => ({ value, label }))}
            onChange={setMaterialType}
            placeholder="Choose a type"
            error={errors.type}
          />
        ) : null}

        <View style={{ gap: t.spacing.sm }}>
          <Input
            label="Tags"
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="rest, http, api"
            helper="Separate tags with commas. Up to 8."
            autoCapitalize="none"
          />
          {tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {tags.map((tag) => (
                <Badge key={tag} label={`#${tag}`} tone="primary" />
              ))}
            </View>
          ) : null}
        </View>

        {kind !== 'material' ? (
          <View style={{ gap: t.spacing.sm }}>
            <Text variant="label" tone="muted">
              Who can see this?
            </Text>
            <Segmented
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'shared', label: 'Shared with class' },
                { value: 'private', label: 'Only me' },
              ]}
            />
            <Text variant="caption" tone="subtle">
              {visibility === 'private'
                ? 'Hidden from classmates. Instructors and admins can still see it.'
                : 'Classmates and instructors can view and download it.'}
            </Text>
          </View>
        ) : null}

        {kind === 'exercise' && staff ? (
          <ToggleRow
            title="Official learning activity"
            subtitle="Highlights this exercise for students as instructor-assigned."
            value={isOfficial}
            onChange={setIsOfficial}
          />
        ) : null}

        {kind === 'material' ? (
          <Card padding={0}>
            <ToggleRow
              title="Published"
              subtitle="Drafts are only visible to instructors and admins."
              value={published}
              onChange={setPublished}
              bare
            />
            <View style={{ height: 1, backgroundColor: t.colors.border }} />
            <ToggleRow
              title="Featured"
              subtitle="Show in the Featured section of the library and dashboard."
              value={isFeatured}
              onChange={setIsFeatured}
              bare
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function FilePickerField({
  kind,
  file,
  isNew,
  error,
  disabled,
  onPick,
  onClear,
}: {
  kind: ContentKind;
  file: FileMeta | null;
  isNew: boolean;
  error?: string;
  disabled?: boolean;
  onPick: () => void;
  onClear?: () => void;
}) {
  const t = useTheme();

  if (!file) {
    return (
      <View style={{ gap: 6 }}>
        <Pressable
          onPress={onPick}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Choose a file"
          style={({ pressed }) => ({
            alignItems: 'center',
            gap: t.spacing.sm,
            paddingVertical: t.spacing.xxl,
            paddingHorizontal: t.spacing.lg,
            borderRadius: t.radius.lg,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: error ? t.colors.danger : t.colors.borderStrong,
            backgroundColor: pressed ? t.colors.surfacePressed : t.colors.surface,
          })}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: t.colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cloud-upload-outline" size={26} color={t.colors.primary} />
          </View>
          <Text variant="subheading">Choose a file</Text>
          <Text variant="caption" tone="subtle" align="center">
            {describeRules(kind)}
          </Text>
        </Pressable>
        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Card padding={t.spacing.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <FileTypeIcon extension={file.extension} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {file.fileName}
            </Text>
            <Text variant="caption" tone="subtle">
              {file.sizeBytes ? formatBytes(file.sizeBytes) : 'Size unknown'} · {isNew ? 'Ready to upload' : 'Current file'}
            </Text>
          </View>
          {onClear ? (
            <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove selected file" disabled={disabled}>
              <Icon name="close-circle" size={22} color={t.colors.textSubtle} />
            </Pressable>
          ) : null}
        </View>
        <Button
          label={isNew ? 'Choose a different file' : 'Replace file'}
          icon="swap-horizontal"
          variant="tonal"
          size="sm"
          onPress={onPick}
          disabled={disabled}
          style={{ marginTop: t.spacing.md }}
        />
      </Card>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  bare,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  bare?: boolean;
}) {
  const t = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, padding: bare ? t.spacing.lg : 0 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="caption" tone="subtle">
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: t.colors.primary, false: t.colors.borderStrong }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </View>
  );
  return bare ? content : <Card>{content}</Card>;
}
