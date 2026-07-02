import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { secret } from "./secrets.mts";
import { dispatchBaseUrl } from "./runtime-config.mts";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function documentFrom(path: string, label: string) {
  const content = await readFile(path, "utf8");
  return {
    label,
    fileName: basename(path),
    sha256: createHash("sha256").update(content).digest("hex"),
    content,
    updatedAt: new Date().toISOString(),
  };
}

const voicePath = option("--voice") || "automation/operator/VOICE.md";
const briefPath = option("--brief") || "automation/operator/PRODUCT_BRIEF.md";
const provider = option("--provider");
const cadence = option("--cadence") || "Four checks per day";
const displayName = option("--name") || "Operator";
if (provider !== "codex" && provider !== "claude-code") {
  throw new Error("Use --provider codex or --provider claude-code");
}

const [voice, productBrief] = await Promise.all([
  documentFrom(voicePath, "Voice profile"),
  documentFrom(briefPath, "Product brief"),
]);
const ingestKey = secret("DISPATCH_INGEST_KEY", "reddit-dispatch-console-ingest");
const baseUrl = await dispatchBaseUrl();
const response = await fetch(`${baseUrl}/.netlify/functions/operator-profile`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ingestKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    displayName,
    voice,
    productBrief,
    scheduler: {
      provider,
      cadence,
      active: true,
      updatedAt: new Date().toISOString(),
    },
    configuredAt: new Date().toISOString(),
  }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(result.error || `Profile publish failed with ${response.status}`);
process.stdout.write(`${JSON.stringify({
  successful: true,
  displayName,
  provider,
  cadence,
  voiceSha256: voice.sha256,
  productBriefSha256: productBrief.sha256,
}, null, 2)}\n`);
