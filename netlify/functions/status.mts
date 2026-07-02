import { hasValidSession } from "./_shared/auth.mts";
import { getLatestRedditAccount } from "./_shared/composio.mts";
import { json } from "./_shared/http.mts";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!hasValidSession(request)) return json({ error: "Unauthorized" }, 401);
  try {
    const account = await getLatestRedditAccount();
    return json({
      connected: account?.status === "ACTIVE",
      status: account?.status || "NOT_CONNECTED",
      accountId: account?.id || null,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Connection check failed" }, 502);
  }
};
