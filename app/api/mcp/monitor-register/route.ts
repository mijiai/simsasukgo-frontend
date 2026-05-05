import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { companyId, companyName, recipientEmail, originJobId } = (await req.json()) as {
      companyId?: string;
      companyName?: string;
      recipientEmail?: string;
      originJobId?: string;
    };
    if (!companyId || !companyName || !recipientEmail || !originJobId) {
      return NextResponse.json(
        { error: 'companyId / companyName / recipientEmail / originJobId all required' },
        { status: 400 }
      );
    }
    const prompt = `심사숙고 도구 \`monitor_register\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- company_id: ${JSON.stringify(companyId)}
- company_name: ${JSON.stringify(companyName)}
- recipient_email: ${JSON.stringify(recipientEmail)}
- origin_job_id: ${JSON.stringify(originJobId)}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('monitor_register', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
