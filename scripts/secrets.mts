import { execFileSync } from "node:child_process";

export function secret(envName: string, keychainService: string) {
  const fromEnvironment = process.env[envName]?.trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    return execFileSync("security", ["find-generic-password", "-s", keychainService, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(`Missing ${envName}. Set it in the environment or macOS Keychain service ${keychainService}.`);
  }
}
