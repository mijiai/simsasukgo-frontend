import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = (await req.json()) as {
      filename?: string;
      contentType?: string;
    };
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename required' }, { status: 400 });
    }
    const ctLine = contentType
      ? `\n- content_type: ${JSON.stringify(contentType)}`
      : '';
    const prompt = `심사숙고 도구 \`create_upload_url\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- filename: ${JSON.stringify(filename)}${ctLine}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('create_upload_url', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
