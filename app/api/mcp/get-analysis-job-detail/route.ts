import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
// Reads Tables + a few blob summaries — fast. 30s is overkill but consistent.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { jobId } = (await req.json()) as { jobId?: string };
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }
    const prompt = `심사숙고 도구 \`get_analysis_job_detail\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- job_id: ${JSON.stringify(jobId)}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('get_analysis_job_detail', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
