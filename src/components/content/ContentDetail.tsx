import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  ActionSheet,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useContentActions } from '@/hooks/useContentActions';
import { useIsBookmarked, useItem, useRelatedItems, useUserName } from '@/hooks/useContent';
import { categoryLabel, getModule, getSubject, getTopic, KIND_LABEL, materialTypeLabel } from '@/lib/catalog';
import { fileTypeLabel } from '@/lib/files';
import { formatBytes, formatDate, formatRelative } from '@/lib/format';
import { canManage, canView } from '@/lib/permissions';
import { detailHref, editHref } from '@/lib/routes';
import { useAuthStore } from '@/store/auth';
import { useContentStore } from '@/store/content';
import { useTheme } from '@/theme';
import type { ContentItem, ContentKind } from '@/types';
import { FileTypeIcon } from './FileTypeIcon';

interface ContentDetailProps {
  kind: ContentKind;
  id: string | undefined;
}

/** Detail screen shared by presentations, exercises and library materials. */
export function ContentDetail({ kind, id }: ContentDetailProps) {
  const user = useAuthStore((s) => s.user);
  const item = useItem(kind, id);
  const remoteStatus = useContentStore((s) => s.remote[kind].status);
  const t = useTheme();

  // Opened via a deep link/notification before the list finished loading.
  if (!item && (remoteStatus === 'idle' || remoteStatus === 'loading')) {
    return (
      <Screen header={<ScreenHeader title={KIND_LABEL[kind]} />}>
        <View style={{ paddingTop: t.spacing.lg }}>
          <SkeletonList count={1} />
        </View>
      </Screen>
    );
  }

  if (!item || !canView(user, item)) {
    return (
      <Screen header={<ScreenHeader title={KIND_LABEL[kind]} />}>
        <EmptyState
          icon="document-outline"
          title="File not available"
          message="It may have been deleted, or you don't have permission to view it."
          actionLabel="Go back"
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
      </Screen>
    );
  }
  return <DetailBody item={item} />;
}

function DetailBody({ item }: { item: ContentItem }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logActivity = useContentStore((s) => s.logActivity);
  const owner = useUserName(item.ownerId);
  const ownerAvatar = useContentStore((s) => s.users.find((u) => u.id === item.ownerId)?.avatarUrl);
  const bookmarked = useIsBookmarked(item.kind, item.id);
  const { download, bookmark, remove } = useContentActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const manage = canManage(user, item);

  const subject = getSubject(item.subjectId);
  const topic = getTopic(item.topicId);
  const module = 'moduleId' in item ? getModule(item.moduleId) : getModule(topic?.moduleId);

  // Record the view once per mount so it shows in "Recently accessed".
  useEffect(() => {
    if (user) logActivity(user.id, 'viewed', item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const goBackAfterDelete = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const details: { label: string; value: string }[] = [
    { label: 'Subject', value: subject ? `${subject.code} · ${subject.name}` : '—' },
    { label: 'Module', value: module?.title ?? '—' },
    { label: 'Topic', value: topic?.title ?? '—' },
  ];
  if (item.kind === 'exercise') details.push({ label: 'Category', value: categoryLabel(item.category) });
  if (item.kind === 'material') details.push({ label: 'Material type', value: materialTypeLabel(item.type) });
  if (item.kind !== 'material') {
    details.push({ label: 'Visibility', value: item.visibility === 'shared' ? 'Shared with class' : 'Only me' });
  } else {
    details.push({ label: 'Status', value: item.status === 'published' ? 'Published' : 'Draft (staff only)' });
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title=""
          right={
            <>
              <IconButton
                icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
                color={bookmarked ? t.colors.primary : undefined}
                accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                onPress={() => bookmark(item)}
              />
              {manage ? (
                <IconButton icon="ellipsis-horizontal" accessibilityLabel="More actions" onPress={() => setMenuOpen(true)} />
              ) : null}
            </>
          }
        />
      }
    >
      {/* Hero */}
      <View style={{ alignItems: 'flex-start', gap: t.spacing.md, paddingTop: t.spacing.sm }}>
        <FileTypeIcon extension={item.file.extension} size={64} />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge label={KIND_LABEL[item.kind]} tone="primary" />
          {item.kind === 'exercise' && item.isOfficial ? <Badge label="Official activity" tone="success" icon="ribbon" /> : null}
          {item.kind === 'material' && item.isFeatured ? <Badge label="Featured" tone="info" icon="star" /> : null}
          {item.kind === 'material' && item.status === 'draft' ? <Badge label="Draft" tone="warning" /> : null}
          {item.kind !== 'material' && item.visibility === 'private' ? <Badge label="Private" icon="lock-closed" /> : null}
        </View>
        <Text variant="title">{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Avatar name={owner} size={28} uri={ownerAvatar} />
          <Text variant="label" tone="muted">
            {owner} · {formatRelative(item.createdAt)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.xl }}>
        <Button label="Download" icon="download-outline" onPress={() => download(item)} style={{ flex: 1 }} />
        <Button
          label={bookmarked ? 'Saved' : 'Save'}
          icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          onPress={() => bookmark(item)}
        />
      </View>

      {/* File */}
      <Card style={{ marginTop: t.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <FileTypeIcon extension={item.file.extension} size={40} showLabel={false} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {item.file.fileName}
            </Text>
            <Text variant="caption" tone="subtle">
              {fileTypeLabel(item.file.extension)} · {formatBytes(item.file.sizeBytes)}
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing.md }} />
        <MetaRow label="Uploaded" value={formatDate(item.createdAt)} />
        <MetaRow label="Last updated" value={formatDate(item.updatedAt)} />
      </Card>

      {item.description ? (
        <View style={{ marginTop: t.spacing.xl, gap: t.spacing.sm }}>
          <Text variant="heading">{item.kind === 'exercise' ? 'Instructions' : 'About'}</Text>
          <Text tone="muted">{item.description}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: t.spacing.xl, gap: t.spacing.sm }}>
        <Text variant="heading">Details</Text>
        <Card>
          {details.map((d) => (
            <MetaRow key={d.label} label={d.label} value={d.value} />
          ))}
        </Card>
      </View>

      {item.tags.length ? (
        <View style={{ marginTop: t.spacing.xl, gap: t.spacing.sm }}>
          <Text variant="heading">Tags</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {item.tags.map((tag) => (
              <Badge key={tag} label={`#${tag}`} />
            ))}
          </View>
        </View>
      ) : null}

      {item.kind !== 'material' ? <RelatedSection item={item} /> : null}

      {manage ? (
        <View style={{ marginTop: t.spacing.xl, gap: t.spacing.sm }}>
          <Text variant="heading">Manage</Text>
          <Card padding={0}>
            <ListRow icon="create-outline" title="Edit details" onPress={() => router.push(editHref(item.kind, item.id))} />
            <ListRow
              icon="swap-horizontal"
              title="Replace file"
              subtitle="Upload a newer version, keeping the details"
              onPress={() => router.push(editHref(item.kind, item.id))}
            />
            <ListRow icon="trash-outline" title="Delete" destructive isLast onPress={() => remove(item, goBackAfterDelete)} />
          </Card>
        </View>
      ) : null}

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={[
          { label: 'Edit details', icon: 'create-outline', onPress: () => router.push(editHref(item.kind, item.id)) },
          { label: 'Replace file', icon: 'swap-horizontal', onPress: () => router.push(editHref(item.kind, item.id)) },
          { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => remove(item, goBackAfterDelete) },
        ]}
      />
    </Screen>
  );
}

/** Slides and activities for the same topic, so a lesson's materials are one tap apart. */
function RelatedSection({ item }: { item: ContentItem }) {
  const t = useTheme();
  const related = useRelatedItems(item);
  if (!related.length) return null;
  return (
    <View style={{ marginTop: t.spacing.xl, gap: t.spacing.sm }}>
      <Text variant="heading">Related on this topic</Text>
      <Card padding={0}>
        {related.map((r, i) => (
          <ListRow
            key={`-`}
            leading={<FileTypeIcon extension={r.file.extension} size={36} showLabel={false} />}
            title={r.title}
            subtitle={
              r.kind === 'exercise'
                ? ``
                : KIND_LABEL[r.kind]
            }
            onPress={() => router.push(detailHref(r.kind, r.id))}
            isLast={i === related.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 6 }}>
      <Text variant="label" tone="subtle">
        {label}
      </Text>
      <Text variant="label" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
