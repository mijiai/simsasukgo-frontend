import { NextRequest, NextResponse } from 'next/server';
import { backendGet, BackendError } from '@/app/lib/backend';

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
    const data = await backendGet('/api/jobs', {
      user_id: body.userId,
      status: body.status,
      limit: body.limit,
      offset: body.offset,
    });
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof BackendError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
