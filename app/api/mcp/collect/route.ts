import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobId, companyName } = (await req.json()) as {
      jobId?: string;
      companyName?: string;
    };
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'companyName required' }, { status: 400 });
    }
    const prompt = `심사숙고 도구 \`collect_company_data\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- job_id: ${JSON.stringify(jobId)}
- company_name: ${JSON.stringify(companyName)}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('collect_company_data', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
