import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const LOCAL_ENV_PATH = resolve(process.cwd(), ".dispatch.env");

export function parseLocalEnv(source: string) {
  const values: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    values[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

export async function readLocalEnv() {
  if (!existsSync(LOCAL_ENV_PATH)) return {};
  return parseLocalEnv(await readFile(LOCAL_ENV_PATH, "utf8"));
}

export async function writeLocalEnv(values: Record<string, string>) {
  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  await writeFile(LOCAL_ENV_PATH, `${body}\n`, { encoding: "utf8", mode: 0o600 });
}
