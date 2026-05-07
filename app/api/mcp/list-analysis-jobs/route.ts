import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.SIMSASUKGO_BACKEND_URL ||
  process.env.SIMSASUKGO_MCP_URL?.replace(/\/sse$/, '') ||
  'http://localhost:8000';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string | null;
      status?: string | null;
      limit?: number;
      offset?: number;
    };

    const params = new URLSearchParams();
    if (body.userId) params.set('user_id', body.userId);
    if (body.status) params.set('status', body.status);
    if (typeof body.limit === 'number') params.set('limit', String(body.limit));
    if (typeof body.offset === 'number') params.set('offset', String(body.offset));

    const res = await fetch(`${BACKEND_URL}/api/jobs?${params}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Backend ${res.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}