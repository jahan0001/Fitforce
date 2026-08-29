import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE } from './api';

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType?: string | null;
  file?: any; // browser File object, present on web only
}

export interface UploadedFile {
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

function readWebFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Uploads a document picked via expo-document-picker to the shared data server. */
export async function uploadDocument(doc: PickedDocument): Promise<UploadedFile> {
  const base64 = Platform.OS === 'web' && doc.file
    ? await readWebFileAsBase64(doc.file)
    : await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: doc.name, mimeType: doc.mimeType ?? 'application/octet-stream', base64 }),
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export function fileDownloadUrl(relativeUrl: string): string {
  return `${API_BASE}${relativeUrl}`;
}
