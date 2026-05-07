import { NextRequest, NextResponse } from 'next/server';
import { backendGet, BackendError } from '@/app/lib/backend';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(_req: NextRequest) {
  try {
    const data = await backendGet('/api/monitors');
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof BackendError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
