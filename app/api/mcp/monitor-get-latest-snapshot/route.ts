import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
// Reads a blob, no LLM analysis — fast. 30s is overkill but consistent with
// other lightweight monitor routes.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { companyId } = (await req.json()) as { companyId?: string };
    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }
    const prompt = `심사숙고 도구 \`monitor_get_latest_snapshot\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- company_id: ${JSON.stringify(companyId)}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('monitor_get_latest_snapshot', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
