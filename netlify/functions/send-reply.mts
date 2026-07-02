import { hasValidSession } from "./_shared/auth.mts";
import {
  activeRedditAccount,
  connectComposio,
  executeRedditTool,
  searchReddit,
  searchSessionId,
} from "./_shared/composio-connect.mts";
import { isSameOrigin, json } from "./_shared/http.mts";

const THING_ID = /^t[13]_[a-z0-9]+$/i;

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(request) || !hasValidSession(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const thingId = typeof body?.thingId === "string" ? body.thingId.trim().toLowerCase() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!THING_ID.test(thingId)) return json({ error: "A valid Reddit target is required" }, 400);
  if (!text || text.length > 10_000) {
    return json({ error: "Reply must contain between 1 and 10,000 characters" }, 400);
  }

  try {
    const client = await connectComposio();
    const search = await searchReddit(client, ["reply to a specific Reddit comment after human approval"]);
    const account = activeRedditAccount(search);
    if (!account) return json({ error: "The connected Reddit account is not active" }, 409);
    const result = await executeRedditTool(
      client,
      account.id,
      "REDDIT_POST_REDDIT_COMMENT",
      { thing_id: thingId, text },
      searchSessionId(search),
    );
    const execution = result?.data?.results?.[0]?.response;
    if (!execution?.successful) {
      const message = execution?.error || result?.error || "Reddit did not accept the reply";
      return json({ error: typeof message === "string" ? message : "Reddit did not accept the reply" }, 502);
    }
    return json({ successful: true, data: execution.data ?? null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Reply could not be sent" }, 502);
  }
};
