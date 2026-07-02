import { getStore } from "@netlify/blobs";

export type QueueStatus = "awaiting" | "sending" | "sent" | "skipped";

export type DispatchItem = {
  thingId: string;
  commentId: string;
  author: string;
  body: string;
  permalink: string;
  createdUtc: number | null;
  score: number | null;
  depth: number | null;
  postId: string;
  postTitle: string;
  subreddit: string;
  postPermalink: string;
  draft: string;
  rationale: string;
  batchId: string;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  skippedAt?: string;
  sendResult?: unknown;
};

export type DispatchBatch = {
  id: string;
  createdAt: string;
  itemIds: string[];
  discoveredCount: number;
  draftedCount: number;
};

export type DispatchMeta = {
  latestBatchId: string | null;
  lastSyncAt: string | null;
  owner: string;
  accountId: string;
  scannedPosts: number;
};

export type OperatorDocument = {
  configured: boolean;
  label: string;
  fileName: string;
  sha256: string;
  content: string;
  updatedAt: string;
};

export type OperatorProfile = {
  version: 1;
  displayName: string;
  voice: OperatorDocument;
  productBrief: OperatorDocument;
  scheduler: {
    provider: "codex" | "claude-code" | "unconfigured";
    cadence: string;
    active: boolean;
    updatedAt: string;
  };
  workflow: {
    discovery: "composio-reddit";
    storage: "netlify-blobs";
    publishing: "manual-approval-only";
  };
  configuredAt: string;
};

const STORE_NAME = "reddit-dispatch";
const META_KEY = "meta/current";
const OPERATOR_KEY = "operator/profile";

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

function itemKey(thingId: string) {
  return `items/${thingId.toLowerCase()}`;
}

const EMPTY_META: DispatchMeta = {
  latestBatchId: null,
  lastSyncAt: null,
  owner: "",
  accountId: "",
  scannedPosts: 0,
};

export async function getMeta() {
  return ((await store().get(META_KEY, { type: "json" })) as DispatchMeta | null) || EMPTY_META;
}

export async function setMeta(meta: DispatchMeta) {
  await store().setJSON(META_KEY, meta);
}

export async function getOperatorProfile() {
  return (await store().get(OPERATOR_KEY, { type: "json" })) as OperatorProfile | null;
}

export async function setOperatorProfile(profile: OperatorProfile) {
  await store().setJSON(OPERATOR_KEY, profile);
}

export async function getItem(thingId: string) {
  return (await store().get(itemKey(thingId), { type: "json" })) as DispatchItem | null;
}

export async function createItem(item: DispatchItem) {
  try {
    await store().setJSON(itemKey(item.thingId), item, { onlyIfNew: true });
    return true;
  } catch {
    return false;
  }
}

export async function updateItem(
  thingId: string,
  updater: (item: DispatchItem) => DispatchItem,
) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await store().getWithMetadata(itemKey(thingId), { type: "json" });
    if (!current) throw new Error("Queue item not found");
    const next = updater(current.data as DispatchItem);
    try {
      await store().setJSON(itemKey(thingId), next, { onlyIfMatch: current.etag });
      return next;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  throw new Error("Queue item could not be updated");
}

export async function listItems() {
  const { blobs } = await store().list({ prefix: "items/" });
  const values = await Promise.all(
    blobs.map(({ key }) => store().get(key, { type: "json" }) as Promise<DispatchItem | null>),
  );
  return values.filter((value): value is DispatchItem => Boolean(value));
}

export async function createBatch(batch: DispatchBatch) {
  await store().setJSON(`batches/${batch.id}`, batch, { onlyIfNew: true });
}
