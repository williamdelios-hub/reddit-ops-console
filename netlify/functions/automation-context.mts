import { timingSafeEqual } from "node:crypto";
import { json } from "./_shared/http.mts";
import { getMeta, listItems } from "./_shared/store.mts";

function authorized(request: Request) {
  const expected = process.env.DISPATCH_INGEST_KEY || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return Boolean(expected && left.length === right.length && timingSafeEqual(left, right));
}

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
  const [meta, items] = await Promise.all([getMeta(), listItems()]);
  return json({
    latestBatchId: meta.latestBatchId,
    lastSyncAt: meta.lastSyncAt,
    seen: Object.fromEntries(items.map((item) => [item.thingId, item.status])),
  });
};
