/**
 * Local pre-checks for a building-info attachment, mirroring Community's
 * `FileAttachmentValidator` defaults (`DEFAULT_ALLOWED_EXTENSIONS`,
 * `max-size-bytes: 10485760`). The server stays the authority; this only saves
 * the user a doomed upload.
 */

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_MB = 10;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'jpg',
  'jpeg',
  'png',
  'heic',
  'heif',
] as const;

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** MIME types for the document picker's `type` filter. */
export const PICKER_MIME_TYPES: string[] = [...new Set(Object.values(MIME_BY_EXT))];

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : '';
}

export type AttachmentProblem = 'tooLarge' | 'badType';

/**
 * Null when the file may be uploaded. An unknown size passes (some pickers
 * don't report one) — the server enforces the cap regardless.
 */
export function validateAttachment(file: {
  name: string;
  size?: number | null | undefined;
}): AttachmentProblem | null {
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(file.name)))
    return 'badType';
  if (typeof file.size === 'number' && file.size > MAX_ATTACHMENT_BYTES) return 'tooLarge';
  return null;
}

/**
 * The MIME type to send. The extension decides (the server's real gate is the
 * extension check too); the picker's own type is only a fallback.
 */
export function mimeForFile(name: string, pickerType: string | null | undefined): string {
  return MIME_BY_EXT[fileExtension(name)] ?? pickerType ?? 'application/octet-stream';
}
