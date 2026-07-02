import { hasValidSession } from "./_shared/auth.mts";
import { isSameOrigin, json } from "./_shared/http.mts";
import { updateItem } from "./_shared/store.mts";

const THING_ID = /^t1_[a-z0-9]+$/i;

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(request) || !hasValidSession(request)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const thingId = typeof body.thingId === "string" ? body.thingId.trim().toLowerCase() : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!THING_ID.test(thingId)) return json({ error: "A valid queue item is required" }, 400);

  if (action === "edit") {
    const draft = typeof body.draft === "string" ? body.draft.trim().slice(0, 10_000) : "";
    if (!draft) return json({ error: "Draft cannot be empty" }, 400);
    const item = await updateItem(thingId, (current) => ({
      ...current,
      draft,
      updatedAt: new Date().toISOString(),
    }));
    return json({ successful: true, item });
  }

  if (action === "skip") {
    const item = await updateItem(thingId, (current) => ({
      ...current,
      status: "skipped",
      skippedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return json({ successful: true, item });
  }

  return json({ error: "Unsupported action" }, 400);
};
