import { hasValidSession } from "./_shared/auth.mts";
import {
  composio,
  composioToolVersion,
  composioUserId,
  getLatestRedditAccount,
} from "./_shared/composio.mts";
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
    const account = await getLatestRedditAccount();
    if (!account || account.status !== "ACTIVE") {
      return json({ error: "Reddit is not connected. Reconnect it before sending." }, 409);
    }

    const result = await composio("/tools/execute/REDDIT_POST_REDDIT_COMMENT", {
      method: "POST",
      body: JSON.stringify({
        connected_account_id: account.id,
        user_id: composioUserId(),
        version: composioToolVersion(),
        arguments: { thing_id: thingId, text },
      }),
    });

    if (!result?.successful) {
      const message = result?.error || "Reddit did not accept the reply";
      return json({ error: typeof message === "string" ? message : "Reddit did not accept the reply" }, 502);
    }
    return json({ successful: true, data: result.data ?? null, logId: result.log_id ?? null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Reply could not be sent" }, 502);
  }
};
