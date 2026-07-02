export type QueueStatus = "awaiting" | "sending" | "sent" | "skipped";

export type QueueItem = {
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

export type QueueResponse = {
  connected: boolean;
  owner: string;
  accountId: string;
  scannedPosts: number;
  latestBatchId: string | null;
  lastSyncAt: string | null;
  awaiting: QueueItem[];
  sent: QueueItem[];
  operatorProfile: OperatorProfile | null;
};

export type Notice = { kind: "success" | "error"; message: string } | null;
export type QueueView = "latest" | "all";
