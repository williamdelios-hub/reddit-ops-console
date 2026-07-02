import { json } from "./_shared/http.mts";
import { hasValidIngestToken } from "./_shared/ingest-auth.mts";
import {
  createBatch,
  createItem,
  setMeta,
  type DispatchBatch,
  type DispatchItem,
} from "./_shared/store.mts";

const THING_ID = /^t1_[a-z0-9]+$/i;

function text(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.trim().replace(/[\u2013\u2014]/g, (character) => (character === "\u2014" ? "," : "-")).slice(0, limit)
    : "";
}

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!hasValidIngestToken(request)) return json({ error: "Unauthorized" }, 401);

  const parsed = await request.json().catch(() => null);
  const body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  const batchId = text(body?.batchId, 100);
  const createdAt = text(body?.createdAt, 64) || new Date().toISOString();
  const sourceItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!batchId) return json({ error: "A batchId is required" }, 400);

  const accepted: string[] = [];
  const rejected: Array<{ thingId: string; reason: string }> = [];

  for (const rawSource of sourceItems) {
    const source = rawSource && typeof rawSource === "object"
      ? rawSource as Record<string, unknown>
      : {};
    const thingId = text(source?.thingId, 64).toLowerCase();
    const draft = text(source?.draft, 10_000);
    if (!THING_ID.test(thingId) || !draft) {
      rejected.push({ thingId, reason: "invalid item or empty draft" });
      continue;
    }
    const now = new Date().toISOString();
    const item: DispatchItem = {
      thingId,
      commentId: text(source.commentId, 64),
      author: text(source.author, 100),
      body: text(source.body, 40_000),
      permalink: text(source.permalink, 2_000),
      createdUtc: typeof source.createdUtc === "number" && Number.isFinite(source.createdUtc) ? source.createdUtc : null,
      score: typeof source.score === "number" && Number.isFinite(source.score) ? source.score : null,
      depth: typeof source.depth === "number" && Number.isFinite(source.depth) ? source.depth : null,
      postId: text(source.postId, 64),
      postTitle: text(source.postTitle, 1_000),
      subreddit: text(source.subreddit, 100),
      postPermalink: text(source.postPermalink, 2_000),
      draft,
      rationale: text(source.rationale, 2_000),
      batchId,
      status: "awaiting",
      createdAt: now,
      updatedAt: now,
    };
    if (await createItem(item)) accepted.push(thingId);
    else rejected.push({ thingId, reason: "already known" });
  }

  const batch: DispatchBatch = {
    id: batchId,
    createdAt,
    itemIds: accepted,
    discoveredCount: typeof body.discoveredCount === "number" && Number.isFinite(body.discoveredCount)
      ? body.discoveredCount
      : sourceItems.length,
    draftedCount: sourceItems.length,
  };
  await createBatch(batch).catch(() => undefined);
  await setMeta({
    latestBatchId: batchId,
    lastSyncAt: createdAt,
    owner: text(body?.owner, 100),
    accountId: text(body?.accountId, 200),
    scannedPosts: typeof body.scannedPosts === "number" && Number.isFinite(body.scannedPosts) ? body.scannedPosts : 0,
  });

  return json({ successful: true, accepted, rejected, latestBatchId: batchId });
};
