import 'server-only';

export const BACKEND_URL =
  process.env.SIMSASUKGO_BACKEND_URL ||
  process.env.SIMSASUKGO_MCP_URL?.replace(/\/sse$/, '') ||
  'http://localhost:8000';

export class BackendError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'BackendError';
  }
}

type QueryValue = string | number | boolean | undefined | null;

export async function backendGet<T>(
  path: string,
  params?: Record<string, QueryValue>
): Promise<T> {
  const url = new URL(`${BACKEND_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Backend ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: unknown };
      if (typeof j.error === 'string') message = j.error;
    } catch {
      if (text) message = `Backend ${res.status}: ${text.slice(0, 200)}`;
    }
    // Forward client-meaningful errors as-is; collapse the rest into 502.
    const status = res.status === 400 || res.status === 404 ? res.status : 502;
    throw new BackendError(message, status);
  }
  return res.json() as Promise<T>;
}
