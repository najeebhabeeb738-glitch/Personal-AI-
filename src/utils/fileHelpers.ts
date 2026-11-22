import type { Attachment } from '../types';

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'json',
  'ts',
  'tsx',
  'js',
  'jsx',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'c',
  'cpp',
  'h',
  'cs',
  'html',
  'css',
  'scss',
  'xml',
  'yaml',
  'yml',
  'toml',
  'sql',
  'sh',
  'env',
  'log',
]);

const MAX_FILE_BYTES = 18 * 1024 * 1024; // 18MB max per inline attachment payload

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result ?? '');
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function processUploadedFile(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`"${file.name}" exceeds the 18 MB file size limit.`);
  }

  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type || '';

  if (mime.startsWith('image/')) {
    const dataBase64 = await readFileAsBase64(file);
    return {
      id,
      name: file.name,
      mimeType: mime,
      size: file.size,
      kind: 'image',
      dataBase64,
      previewUrl: `data:${mime};base64,${dataBase64}`,
      createdAt: Date.now(),
    };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    const dataBase64 = await readFileAsBase64(file);
    return {
      id,
      name: file.name,
      mimeType: 'application/pdf',
      size: file.size,
      kind: 'pdf',
      dataBase64,
      createdAt: Date.now(),
    };
  }

  if (mime.startsWith('audio/')) {
    const dataBase64 = await readFileAsBase64(file);
    return {
      id,
      name: file.name,
      mimeType: mime,
      size: file.size,
      kind: 'audio',
      dataBase64,
      createdAt: Date.now(),
    };
  }

  if (mime.startsWith('text/') || mime === 'application/json' || TEXT_EXTENSIONS.has(ext)) {
    const textContent = await file.text();
    return {
      id,
      name: file.name,
      mimeType: mime || 'text/plain',
      size: file.size,
      kind: 'text',
      textContent,
      createdAt: Date.now(),
    };
  }

  throw new Error(
    `Unsupported file type for "${file.name}". Supported formats: images, PDF, audio, and code or text documents.`
  );
}

export function getAttachmentDataUrl(att: Attachment): string | undefined {
  if (att.previewUrl) return att.previewUrl;
  if (att.dataBase64 && att.mimeType.startsWith('image/')) {
    return `data:${att.mimeType};base64,${att.dataBase64}`;
  }
  return undefined;
}
