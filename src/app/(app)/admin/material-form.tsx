import { EditableUploadRoute } from '@/components/content/EditableUploadRoute';

/** Add or edit a library material (staff only; guarded by admin/_layout). */
export default function MaterialFormScreen() {
  return <EditableUploadRoute kind="material" />;
}
