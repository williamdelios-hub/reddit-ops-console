import { readFile } from "node:fs/promises";
import { secret } from "./secrets.mts";
import { dispatchBaseUrl } from "./runtime-config.mts";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputPath = option("--input");
if (!inputPath) throw new Error("Use --input <draft-batch.json>");
const payload = JSON.parse(await readFile(inputPath, "utf8"));
const ingestKey = secret("DISPATCH_INGEST_KEY", "reddit-dispatch-console-ingest");
const baseUrl = await dispatchBaseUrl();
const response = await fetch(`${baseUrl}/.netlify/functions/ingest-drafts`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ingestKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(result.error || `Dispatch ingestion failed with ${response.status}`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
