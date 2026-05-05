import type { CreateUploadUrlResponse } from './analysis-types';

export interface UploadResult {
  filename: string;
  blobPath: string;
  size: number;
}

// File body MUST go directly browser → Azure Blob. Never proxy through any
// /api/* route — that defeats the whole point of the SAS upload path
// (server bypass for large files; LLM output token cost = 0).
export async function uploadFileDirect(file: File): Promise<UploadResult> {
  const contentType = file.type || 'application/octet-stream';

  const sasRes = await fetch('/api/mcp/create-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType }),
  });
  if (!sasRes.ok) {
    const err = (await sasRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `업로드 URL 발급 실패 (${sasRes.status})`);
  }
  const sas = (await sasRes.json()) as CreateUploadUrlResponse;
  if (!sas.upload_url || !sas.blob_path) {
    throw new Error('업로드 URL 응답이 올바르지 않습니다.');
  }

  // Apply server-issued required_headers verbatim, fill missing safe defaults.
  const headers: Record<string, string> = { ...(sas.required_headers || {}) };
  const hasHeader = (name: string) =>
    Object.keys(headers).some((k) => k.toLowerCase() === name.toLowerCase());
  if (!hasHeader('x-ms-blob-type')) headers['x-ms-blob-type'] = 'BlockBlob';
  if (!hasHeader('Content-Type')) headers['Content-Type'] = contentType;

  const put = await fetch(sas.upload_url, {
    method: 'PUT',
    headers,
    body: file,
  });
  if (!put.ok) {
    const body = await put.text().catch(() => '');
    throw new Error(
      `Blob PUT 실패 (${put.status}): ${body.slice(0, 200)} — Azure CORS 설정 확인 필요`
    );
  }

  return { filename: file.name, blobPath: sas.blob_path, size: file.size };
}

// Sequential on purpose: upload is a single progress row in the UI; per-file
// PUTs to Azure Blob are usually fast enough that parallelism gains aren't
// worth complicating progress reporting.
export async function uploadFilesSequentially(
  files: File[],
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length, files[i].name);
    const r = await uploadFileDirect(files[i]);
    results.push(r);
  }
  return results;
}
