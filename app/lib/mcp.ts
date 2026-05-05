import 'server-only';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MCP_NAME = process.env.SIMSASUKGO_MCP_NAME || '심사숙고';
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
  is_error?: boolean;
  content?: Array<{ type: string; text?: string }>;
}

interface AnthropicResponse {
  content: AnthropicBlock[];
  stop_reason?: string;
  usage?: unknown;
}

export async function callMCPTool(toolName: string, prompt: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MCPCallError('ANTHROPIC_API_KEY not set', 500);

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      mcp_servers: [{ type: 'url', url: MCP_URL, name: MCP_NAME }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new MCPCallError(`Anthropic API ${res.status}: ${body.slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as AnthropicResponse;
  const blocks = Array.isArray(data.content) ? data.content : [];

  console.log(`[mcp:${toolName}]`, {
    stop_reason: data.stop_reason,
    usage: data.usage,
    block_types: blocks.map((b) => b.type),
  });

  const toolResults = blocks.filter((b) => b.type === 'mcp_tool_result');
  if (toolResults.length === 0) {
    const text = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join(' ');
    throw new MCPCallError(
      text ? `Tool not invoked: ${text.slice(0, 200)}` : 'No tool result returned',
      502
    );
  }

  const tr = toolResults[0];
  if (tr.is_error) {
    const msg = tr.content?.find((c) => c.type === 'text')?.text || 'tool error';
    throw new MCPCallError(`Tool failed: ${msg}`, 502);
  }

  const txt = tr.content?.find((c) => c.type === 'text')?.text || '';
  return parseJSONLoose(txt) ?? { _raw: txt };
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
