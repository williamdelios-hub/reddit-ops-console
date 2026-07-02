import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseLocalEnv } from "./local-env.mts";

export function secret(envName: string, keychainService: string) {
  const fromEnvironment = process.env[envName]?.trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    return execFileSync("security", ["find-generic-password", "-s", keychainService, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    const envPath = resolve(process.cwd(), ".dispatch.env");
    if (existsSync(envPath)) {
      const fromFile = parseLocalEnv(readFileSync(envPath, "utf8"))[envName];
      if (fromFile) return fromFile;
    }
    throw new Error(
      `Missing ${envName}. Set it in the environment, .dispatch.env, or macOS Keychain service ${keychainService}.`,
    );
  }
}
