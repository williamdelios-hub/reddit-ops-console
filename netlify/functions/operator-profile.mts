import { hasValidIngestToken } from "./_shared/ingest-auth.mts";
import { json } from "./_shared/http.mts";
import { setOperatorProfile, type OperatorProfile } from "./_shared/store.mts";

const SHA256 = /^[a-f0-9]{64}$/;

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function readDocument(value: unknown, fallbackLabel: string) {
  const document = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const content = cleanText(document.content, 100_000);
  const sha256 = cleanText(document.sha256, 64).toLowerCase();

  return {
    configured: Boolean(content),
    label: cleanText(document.label, 120) || fallbackLabel,
    fileName: cleanText(document.fileName, 240),
    sha256: SHA256.test(sha256) ? sha256 : "",
    content,
    updatedAt: cleanText(document.updatedAt, 64) || new Date().toISOString(),
  };
}

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!hasValidIngestToken(request)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const schedulerSource = source.scheduler && typeof source.scheduler === "object"
    ? source.scheduler as Record<string, unknown>
    : {};
  const requestedProvider = cleanText(schedulerSource.provider, 40);
  const provider = requestedProvider === "codex" || requestedProvider === "claude-code"
    ? requestedProvider
    : "unconfigured";
  const voice = readDocument(source.voice, "Voice profile");
  const productBrief = readDocument(source.productBrief, "Product brief");
  const now = new Date().toISOString();

  const profile: OperatorProfile = {
    version: 1,
    displayName: cleanText(source.displayName, 120) || "Operator",
    voice,
    productBrief,
    scheduler: {
      provider,
      cadence: cleanText(schedulerSource.cadence, 120),
      active: Boolean(schedulerSource.active),
      updatedAt: cleanText(schedulerSource.updatedAt, 64) || now,
    },
    workflow: {
      discovery: "composio-reddit",
      storage: "netlify-blobs",
      publishing: "manual-approval-only",
    },
    configuredAt: cleanText(source.configuredAt, 64) || now,
  };

  await setOperatorProfile(profile);
  return json({
    successful: true,
    profile: {
      ...profile,
      voice: { ...profile.voice, content: undefined },
      productBrief: { ...profile.productBrief, content: undefined },
    },
  });
};
