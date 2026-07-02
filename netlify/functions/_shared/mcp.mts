const MCP_PROTOCOL_VERSION = "2025-03-26";

type RpcEnvelope = {
  error?: { code?: number; message?: string };
  result?: unknown;
};

export function parseMcpPayload(body: string): RpcEnvelope {
  const trimmed = body.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as RpcEnvelope;

  const events = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]")
    .map((line) => JSON.parse(line) as RpcEnvelope);
  return events[events.length - 1] || {};
}

export class StreamableMcpClient {
  private requestId = 1;

  private constructor(
    private readonly url: string,
    private readonly authHeaders: Record<string, string>,
    private readonly sessionId: string | null,
  ) {}

  static async connect(url: string, authHeaders: Record<string, string>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...authHeaders,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "dispatch", version: "2.0.0" },
        },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    const payload = parseMcpPayload(await response.text());
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `MCP initialization failed (${response.status})`);
    }

    const sessionId = response.headers.get("mcp-session-id");
    const client = new StreamableMcpClient(url, authHeaders, sessionId);
    await client.notifyInitialized();
    return client;
  }

  private headers() {
    return {
      ...this.authHeaders,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}),
    };
  }

  private async notifyInitialized() {
    await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      signal: AbortSignal.timeout(15_000),
    });
  }

  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    this.requestId += 1;
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.requestId,
        method: "tools/call",
        params: { name, arguments: args },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    const payload = parseMcpPayload(await response.text());
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `MCP tool call failed (${response.status})`);
    }
    return payload.result as T;
  }
}
