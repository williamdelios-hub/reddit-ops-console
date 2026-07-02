import { hasValidSession } from "./_shared/auth.mts";
import {
  activeRedditAccount,
  connectComposio,
  runWorkbench,
  searchReddit,
  searchSessionId,
} from "./_shared/composio-connect.mts";
import { json } from "./_shared/http.mts";
import { buildQueueProgram, parseWorkbenchOutput } from "./_shared/queue-program.mts";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!hasValidSession(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const client = await connectComposio();
    const search = await searchReddit(client, [
      "identify the authenticated Reddit account and find recent authored posts with unanswered comments",
      "reply to a specific Reddit comment after human approval",
    ]);
    const account = activeRedditAccount(search);
    if (!account) {
      return json({ error: "The connected Reddit account is not active" }, 409);
    }
    const owner = account.user_info?.name;
    if (!owner) return json({ error: "Could not identify the connected Reddit username" }, 502);

    const workbench = await runWorkbench(
      client,
      buildQueueProgram(owner, account.id),
      searchSessionId(search),
    );
    const output = parseWorkbenchOutput(workbench?.data?.stdout || "");
    if (output.error) return json({ error: output.error }, 502);
    return json({
      connected: true,
      owner,
      accountId: account.id,
      scannedPosts: output.scannedPosts || 0,
      drafts: Array.isArray(output.drafts) ? output.drafts : [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not build the reply queue" }, 502);
  }
};
