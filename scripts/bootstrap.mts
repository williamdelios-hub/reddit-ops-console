import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readLocalEnv, writeLocalEnv } from "./local-env.mts";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function netlify(args: string[], quiet = false) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return execFileSync(command, ["netlify", ...args], {
    encoding: "utf8",
    stdio: quiet ? ["ignore", "ignore", "pipe"] : ["ignore", "pipe", "pipe"],
  });
}

function setNetlifySecret(name: string, value: string) {
  netlify(["env:set", name, value, "--context", "production", "--secret", "--force"], true);
}

function saveToMacKeychain(service: string, value: string) {
  if (process.platform !== "darwin") return;
  try {
    execFileSync("security", ["delete-generic-password", "-s", service], { stdio: "ignore" });
  } catch {
    // The key does not exist yet.
  }
  execFileSync("security", [
    "add-generic-password",
    "-U",
    "-a",
    process.env.USER || "dispatch",
    "-s",
    service,
    "-w",
    value,
  ], { stdio: "ignore" });
}

const provider = option("--provider");
if (provider !== "codex" && provider !== "claude-code") {
  throw new Error("Use --provider codex or --provider claude-code");
}

let statusOutput = "";
try {
  statusOutput = netlify(["status"]);
} catch {
  throw new Error("This repository is not linked to a Netlify project. Run `npx netlify init` first.");
}

const siteUrl = option("--site-url") || statusOutput.match(/https:\/\/[^\s]+\.netlify\.app/)?.[0];
if (!siteUrl) {
  throw new Error("Could not determine the Netlify site URL. Pass --site-url https://your-site.netlify.app.");
}

const existing = await readLocalEnv();
if (existing.OPS_ACCESS_KEY && !hasFlag("--force")) {
  throw new Error("Dispatch is already initialized. Use --force only when you intend to rotate every access token.");
}

const accessToken = randomToken(24);
const ingestToken = randomToken();
const sessionSecret = randomToken(48);
const localSecrets = {
  ...existing,
  DISPATCH_BASE_URL: siteUrl,
  OPS_ACCESS_KEY: accessToken,
  DISPATCH_INGEST_KEY: ingestToken,
  SESSION_SECRET: sessionSecret,
};

setNetlifySecret("OPS_ACCESS_KEY", accessToken);
setNetlifySecret("DISPATCH_INGEST_KEY", ingestToken);
setNetlifySecret("SESSION_SECRET", sessionSecret);
await writeLocalEnv(localSecrets);

saveToMacKeychain("reddit-dispatch-console-access", accessToken);
saveToMacKeychain("reddit-dispatch-console-ingest", ingestToken);

process.stdout.write(`${JSON.stringify({
  successful: true,
  provider,
  accessToken,
  localSecretFile: ".dispatch.env",
  siteUrl,
  next: [
    "Set COMPOSIO_CONNECT_API_KEY in Netlify and connect one Reddit account.",
    "Publish the voice profile and product brief.",
    "Deploy the site, then create the scheduled task.",
  ],
}, null, 2)}\n`);
