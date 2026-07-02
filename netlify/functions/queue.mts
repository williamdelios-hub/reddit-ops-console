import { hasValidSession } from "./_shared/auth.mts";
import { json } from "./_shared/http.mts";
import { getMeta, listItems } from "./_shared/store.mts";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!hasValidSession(request)) return json({ error: "Unauthorized" }, 401);

  try {
    const [meta, items] = await Promise.all([getMeta(), listItems()]);
    const awaiting = items
      .filter((item) => item.status === "awaiting")
      .sort((left, right) => (right.createdUtc || 0) - (left.createdUtc || 0));
    const sent = items
      .filter((item) => item.status === "sent")
      .sort((left, right) => Date.parse(right.sentAt || right.updatedAt) - Date.parse(left.sentAt || left.updatedAt))
      .slice(0, 20);

    return json({
      connected: Boolean(meta.owner),
      owner: meta.owner,
      accountId: meta.accountId,
      scannedPosts: meta.scannedPosts,
      latestBatchId: meta.latestBatchId,
      lastSyncAt: meta.lastSyncAt,
      awaiting,
      sent,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not load the approval queue" }, 502);
  }
};
