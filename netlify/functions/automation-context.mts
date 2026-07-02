import { json } from "./_shared/http.mts";
import { hasValidIngestToken } from "./_shared/ingest-auth.mts";
import { getMeta, getOperatorProfile, listItems } from "./_shared/store.mts";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!hasValidIngestToken(request)) return json({ error: "Unauthorized" }, 401);
  const [meta, items, operatorProfile] = await Promise.all([
    getMeta(),
    listItems(),
    getOperatorProfile(),
  ]);
  return json({
    latestBatchId: meta.latestBatchId,
    lastSyncAt: meta.lastSyncAt,
    seen: Object.fromEntries(items.map((item) => [item.thingId, item.status])),
    operatorProfile,
  });
};
