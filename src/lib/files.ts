import type { ContentKind } from '@/types';
import { formatBytes } from './format';

export type FileFamily = 'ppt' | 'pdf' | 'doc' | 'xls' | 'image' | 'other';

const MIME_BY_EXT: Record<string, string> = {
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
};

export interface UploadRules {
  extensions: string[];
  maxBytes: number;
}

const MB = 1024 * 1024;

/** Allowed file types and size limits per content kind. Also enforced by table constraints and bucket limits. */
export const UPLOAD_RULES: Record<ContentKind, UploadRules> = {
  presentation: { extensions: ['ppt', 'pptx', 'pdf'], maxBytes: 50 * MB },
  exercise: {
    extensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'],
    maxBytes: 25 * MB,
  },
  material: {
    extensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'],
    maxBytes: 50 * MB,
  },
};

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}

export function fileFamily(extension: string): FileFamily {
  switch (extension.toLowerCase()) {
    case 'ppt':
    case 'pptx':
      return 'ppt';
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
    case 'txt':
      return 'doc';
    case 'xls':
    case 'xlsx':
      return 'xls';
    case 'png':
    case 'jpg':
    case 'jpeg':
      return 'image';
    default:
      return 'other';
  }
}

export function fileTypeLabel(extension: string): string {
  switch (fileFamily(extension)) {
    case 'ppt':
      return 'PowerPoint';
    case 'pdf':
      return 'PDF';
    case 'doc':
      return 'Document';
    case 'xls':
      return 'Spreadsheet';
    case 'image':
      return 'Image';
    default:
      return 'File';
  }
}

/** MIME types passed to the document picker so the OS filters the file list. */
export function pickerMimeTypes(kind: ContentKind): string[] {
  const types = new Set(UPLOAD_RULES[kind].extensions.map((ext) => MIME_BY_EXT[ext]).filter(Boolean));
  return [...types];
}

export function mimeFor(extension: string): string {
  return MIME_BY_EXT[extension.toLowerCase()] ?? 'application/octet-stream';
}

export function describeRules(kind: ContentKind): string {
  const { extensions, maxBytes } = UPLOAD_RULES[kind];
  const unique = [...new Set(extensions.map((e) => (e === 'jpeg' ? 'jpg' : e)))];
  return `${unique.map((e) => e.toUpperCase()).join(', ')} · up to ${formatBytes(maxBytes)}`;
}

/**
 * Returns an error message, or null when the file is acceptable.
 * `sizeBytes` may be unknown on some platforms; size checks are skipped then.
 */
export function validateFile(kind: ContentKind, file: { fileName: string; sizeBytes?: number | null }): string | null {
  const rules = UPLOAD_RULES[kind];
  const ext = getExtension(file.fileName);
  if (!ext || !rules.extensions.includes(ext)) {
    return `.${ext || '?'} files aren't supported here. Use ${describeRules(kind).split(' · ')[0]}.`;
  }
  if (file.sizeBytes != null) {
    if (file.sizeBytes > rules.maxBytes) {
      return `This file is ${formatBytes(file.sizeBytes)}. The limit is ${formatBytes(rules.maxBytes)}.`;
    }
    if (file.sizeBytes <= 0) return 'This file appears to be empty.';
  }
  return null;
}

