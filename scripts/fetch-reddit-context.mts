import { writeFile } from "node:fs/promises";
import { connectComposio, activeRedditAccount, runWorkbench, searchReddit, searchSessionId } from "../netlify/functions/_shared/composio-connect.mts";
import { buildDiscoveryProgram, parseWorkbenchOutput } from "../netlify/functions/_shared/discovery-program.mts";
import { secret } from "./secrets.mts";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

process.env.COMPOSIO_CONNECT_API_KEY ||= secret(
  "COMPOSIO_CONNECT_API_KEY",
  "reddit-dispatch-console-composio-connect",
);
const ingestKey = secret("DISPATCH_INGEST_KEY", "reddit-dispatch-console-ingest");
const baseUrl = process.env.DISPATCH_BASE_URL || "https://reddit-dispatch-console.netlify.app";

const client = await connectComposio();
const search = await searchReddit(client, [
  "identify the authenticated Reddit account and read recent authored posts with unanswered comments",
]);
const account = activeRedditAccount(search);
if (!account?.user_info?.name) throw new Error("The connected Reddit account is not active");

const workbench = await runWorkbench(
  client,
  buildDiscoveryProgram(account.user_info.name, account.id),
  searchSessionId(search),
);
const discovered = parseWorkbenchOutput(workbench?.data?.stdout || "");
if (discovered.error) throw new Error(discovered.error);

const contextResponse = await fetch(`${baseUrl}/.netlify/functions/automation-context`, {
  headers: { Authorization: `Bearer ${ingestKey}` },
});
if (!contextResponse.ok) throw new Error(`Dispatch context request failed with ${contextResponse.status}`);
const context = await contextResponse.json() as { seen?: Record<string, string> };
const seen = context.seen || {};
const candidates = Array.isArray(discovered.candidates)
  ? discovered.candidates.filter((candidate: any) => !seen[candidate.thingId])
  : [];
const output = {
  owner: discovered.owner,
  accountId: discovered.accountId,
  scannedPosts: discovered.scannedPosts || 0,
  discoveredCount: candidates.length,
  candidates,
  postContexts: discovered.postContexts || [],
  fetchedAt: new Date().toISOString(),
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = option("--output");
if (outputPath) await writeFile(outputPath, serialized, "utf8");
else process.stdout.write(serialized);
