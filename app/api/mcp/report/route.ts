import { NextRequest, NextResponse } from 'next/server';
import { callMCPTool, MCPCallError } from '@/app/lib/mcp';

export const runtime = 'nodejs';
// report_generate는 Sonnet 4.6 8K max_tokens 9개 섹션 + DOCX 빌드 + Blob 업로드로
// 정상 80-120s. Hobby plan(60s cap)에선 종종 504가 나지만, 클라이언트가
// get_analysis_job_detail 폴링으로 결과를 회수하므로(app/lib/poll-job.ts) 함수가
// 잘려도 파이프라인은 복구된다. Pro plan이면 maxDuration 상향으로 직접 호출
// 성공률을 높일 수 있음.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobId } = (await req.json()) as { jobId?: string };
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }
    const prompt = `심사숙고 도구 \`report_generate\` 을 정확히 한 번만 호출하세요. 다른 도구는 호출하지 마세요.

인자:
- job_id: ${JSON.stringify(jobId)}

도구 호출 후 추가 설명 없이 "완료"라고만 답하세요.`;
    const result = await callMCPTool('report_generate', prompt);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof MCPCallError ? err.statusCode : 500;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
