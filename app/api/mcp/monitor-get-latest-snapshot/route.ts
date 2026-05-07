import { NextRequest, NextResponse } from 'next/server';
import { backendGet, BackendError } from '@/app/lib/backend';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { companyId } = (await req.json()) as { companyId?: string };
    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }
    const data = await backendGet(
      `/api/monitors/${encodeURIComponent(companyId)}/snapshot`
    );
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof BackendError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
