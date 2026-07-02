import { readLocalEnv } from "./local-env.mts";

export async function dispatchBaseUrl() {
  const local = await readLocalEnv();
  const value = process.env.DISPATCH_BASE_URL || local.DISPATCH_BASE_URL;
  if (!value) {
    throw new Error("Missing DISPATCH_BASE_URL. Run setup:init or add it to .dispatch.env.");
  }
  return value.replace(/\/$/, "");
}
