import { StreamableMcpClient } from "./mcp.mts";

const CONNECT_URL = "https://connect.composio.dev/mcp";

type ToolResult = {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
};

export type RedditAccount = {
  id: string;
  status: string;
  user_info?: { name?: string };
  is_default?: boolean;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function parseToolText(result: ToolResult) {
  if (result.isError) throw new Error("Composio tool call failed");
  const text = result.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("Composio returned no tool data");
  return JSON.parse(text);
}

export async function connectComposio() {
  return StreamableMcpClient.connect(CONNECT_URL, {
    "x-consumer-api-key": requiredEnv("COMPOSIO_CONNECT_API_KEY"),
  });
}

export async function searchReddit(
  client: StreamableMcpClient,
  useCases: string[],
) {
  const result = await client.callTool<ToolResult>("COMPOSIO_SEARCH_TOOLS", {
    queries: useCases.map((use_case) => ({ use_case })),
    session: { generate_id: true },
    model: "gpt-5",
  });
  return parseToolText(result);
}

export function activeRedditAccount(searchPayload: any): RedditAccount | null {
  const statuses = searchPayload?.data?.toolkit_connection_statuses || [];
  const reddit = statuses.find((entry: any) => entry.toolkit === "reddit");
  return (
    reddit?.accounts?.find((account: RedditAccount) => account.status === "ACTIVE" && account.is_default) ||
    reddit?.accounts?.find((account: RedditAccount) => account.status === "ACTIVE") ||
    null
  );
}

export function searchSessionId(searchPayload: any) {
  return searchPayload?.data?.session?.id || undefined;
}

export async function runWorkbench(
  client: StreamableMcpClient,
  code: string,
  sessionId?: string,
) {
  const result = await client.callTool<ToolResult>("COMPOSIO_REMOTE_WORKBENCH", {
    code_to_execute: code,
    thought: "Read recent Reddit threads for the private approval workflow",
    current_step: "READING_REDDIT",
    current_step_metric: "0/10 threads",
    ...(sessionId ? { session_id: sessionId } : {}),
  });
  return parseToolText(result);
}

export async function executeRedditTool(
  client: StreamableMcpClient,
  accountId: string,
  toolSlug: string,
  args: Record<string, unknown>,
  sessionId?: string,
) {
  const result = await client.callTool<ToolResult>("COMPOSIO_MULTI_EXECUTE_TOOL", {
    tools: [{ tool_slug: toolSlug, arguments: args, account: accountId }],
    thought: "Execute the operator-approved Reddit reply",
    sync_response_to_workbench: false,
    current_step: "SENDING_APPROVED_REPLY",
    current_step_metric: "0/1 reply",
    ...(sessionId ? { session_id: sessionId } : {}),
  });
  return parseToolText(result);
}
