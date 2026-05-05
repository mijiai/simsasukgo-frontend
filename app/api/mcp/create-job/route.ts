import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { companyName, customPrompt, fileBlobPaths } = (await req.json()) as {
      companyName?: string;
      customPrompt?: string;
      fileBlobPaths?: string[];
    };
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'companyName required' }, { status: 400 });
    }

    const blobLine =
      Array.isArray(fileBlobPaths) && fileBlobPaths.length > 0
        ? `\n- file_blob_paths: ${JSON.stringify(fileBlobPaths)}`
        : '';

    const prompt = `심사숙고 도구 \`create_analysis_job\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- company_name: ${JSON.stringify(companyName)}
- custom_prompt: ${customPrompt ? JSON.stringify(customPrompt) : 'null'}
- files: null${blobLine}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('create_analysis_job', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
