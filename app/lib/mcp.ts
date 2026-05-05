import 'server-only';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// MCP connector is gated behind a beta header. Without it the request body's
// `mcp_servers` field is rejected as "Extra inputs are not permitted".
const ANTHROPIC_BETA = 'mcp-client-2025-04-04';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
// Anthropic's MCP connector requires `mcp_servers[].name` to be an ASCII
// identifier — non-ASCII (e.g. Korean "심사숙고") makes the model fail to
// resolve the namespaced tool name and silently skip the call. Match the
// FastMCP server's own name from simsa-sukgo-agents.
const MCP_NAME = process.env.SIMSASUKGO_MCP_NAME || 'simsasukgo';
const MCP_URL =
  process.env.SIMSASUKGO_MCP_URL ||
  'https://simsasukgo-mcp.greenflower-c8b70739.eastus2.azurecontainerapps.io/sse';

export class MCPCallError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'MCPCallError';
  }
}

interface AnthropicBlock {
  type: string;
  text?: string;
  name?: string;
  server_name?: string;
  is_error?: boolean;
  content?: Array<{ type: string; text?: string }> | string;
}

interface AnthropicResponse {
  content: AnthropicBlock[];
  stop_reason?: string;
  usage?: unknown;
}

// 429 (rate limit) and 529 (overloaded) — back off and retry. Anthropic returns
// `retry-after` (seconds) on 429; honor it but cap so a single tool call can't
// stall the pipeline forever.
const MAX_RETRIES = 3;
const MAX_RETRY_WAIT_MS = 45_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(toolName: string, body: string, apiKey: string): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': ANTHROPIC_BETA,
        'x-api-key': apiKey,
      },
      body,
    });

    const retriable = res.status === 429 || res.status === 529;
    if (!retriable || attempt >= MAX_RETRIES) return res;

    const retryAfterHeader = res.headers.get('retry-after');
    const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const backoff = Number.isFinite(retryAfterSec) && retryAfterSec > 0
      ? Math.min(retryAfterSec * 1000, MAX_RETRY_WAIT_MS)
      : Math.min(2_000 * 2 ** attempt, MAX_RETRY_WAIT_MS);

    console.log(`[mcp:${toolName}] ${res.status} retry`, {
      attempt: attempt + 1,
      waitMs: backoff,
      retryAfter: retryAfterHeader,
    });
    // Drain body so the connection can be reused.
    await res.text().catch(() => '');
    await sleep(backoff);
    attempt += 1;
  }
}

export async function callMCPTool(toolName: string, prompt: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MCPCallError('ANTHROPIC_API_KEY not set', 500);

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
    mcp_servers: [{ type: 'url', url: MCP_URL, name: MCP_NAME }],
  });

  const res = await fetchWithRetry(toolName, body, apiKey);

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new MCPCallError(`Anthropic API ${res.status}: ${errBody.slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as AnthropicResponse;
  const blocks = Array.isArray(data.content) ? data.content : [];

  console.log(`[mcp:${toolName}]`, {
    stop_reason: data.stop_reason,
    usage: data.usage,
    block_types: blocks.map((b) => b.type),
    tool_uses: blocks
      .filter((b) => b.type === 'mcp_tool_use')
      .map((b) => ({ server: b.server_name, name: b.name })),
  });

  const toolResults = blocks.filter((b) => b.type === 'mcp_tool_result');
  if (toolResults.length === 0) {
    const text = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join(' ')
      .trim();
    const toolUses = blocks.filter((b) => b.type === 'mcp_tool_use');
    const diag = `stop_reason=${data.stop_reason} blocks=[${blocks
      .map((b) => b.type)
      .join(',')}]`;
    if (toolUses.length > 0) {
      // Model called the tool but the connector returned no result — usually
      // means the SSE upstream timed out or the MCP server rejected the call.
      throw new MCPCallError(`MCP tool_use but no result: ${diag}`, 502);
    }
    throw new MCPCallError(
      text ? `Tool not invoked: ${text.slice(0, 200)} (${diag})` : `No tool result returned (${diag})`,
      502
    );
  }

  const tr = toolResults[0];
  const trText = readBlockText(tr.content);
  if (tr.is_error) {
    throw new MCPCallError(`Tool failed: ${trText || 'tool error'}`, 502);
  }
  return parseJSONLoose(trText) ?? { _raw: trText };
}

function readBlockText(content: AnthropicBlock['content']): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content.find((c) => c.type === 'text')?.text || '';
}

function parseJSONLoose(t: string): unknown {
  if (!t) return null;
  const stripped = t
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');
  try {
    return JSON.parse(stripped);
  } catch {}
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}
