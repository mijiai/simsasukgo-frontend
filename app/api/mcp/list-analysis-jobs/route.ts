import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId, status, limit, offset } = (await req.json().catch(() => ({}))) as {
      userId?: string | null;
      status?: string | null;
      limit?: number;
      offset?: number;
    };

    const args: string[] = [];
    if (userId) args.push(`- user_id: ${JSON.stringify(userId)}`);
    if (status) args.push(`- status: ${JSON.stringify(status)}`);
    if (typeof limit === 'number') args.push(`- limit: ${limit}`);
    if (typeof offset === 'number') args.push(`- offset: ${offset}`);
    const argsBlock = args.length > 0 ? `\n\n인자:\n${args.join('\n')}` : '\n\n인자 없음 (모든 default 사용).';

    const prompt = `심사숙고 도구 \`list_analysis_jobs\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.${argsBlock}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('list_analysis_jobs', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
