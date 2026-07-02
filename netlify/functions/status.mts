import { hasValidSession } from "./_shared/auth.mts";
import { activeRedditAccount, connectComposio, searchReddit } from "./_shared/composio-connect.mts";
import { json } from "./_shared/http.mts";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!hasValidSession(request)) return json({ error: "Unauthorized" }, 401);
  try {
    const client = await connectComposio();
    const search = await searchReddit(client, ["identify the authenticated Reddit account"]);
    const account = activeRedditAccount(search);
    return json({
      connected: Boolean(account),
      status: account?.status || "NOT_CONNECTED",
      accountId: account?.id || null,
      owner: account?.user_info?.name || null,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Connection check failed" }, 502);
  }
};
