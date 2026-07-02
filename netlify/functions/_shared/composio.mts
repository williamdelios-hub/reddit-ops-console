const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";

function env(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const composioUserId = () => env("COMPOSIO_USER_ID", "wealthlearn-owner");
export const composioAuthConfigId = () => env("COMPOSIO_AUTH_CONFIG_ID", "ac_T5h1LktfnaIm");
export const composioToolVersion = () => env("COMPOSIO_TOOL_VERSION", "20260623_00");

export async function composio(path: string, init: RequestInit = {}) {
  const response = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env("COMPOSIO_API_KEY"),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || data?.error || `Composio request failed (${response.status})`;
    throw new Error(typeof message === "string" ? message : "Composio request failed");
  }
  return data;
}

export type ConnectedAccount = {
  id: string;
  status: string;
  user_id?: string;
  updated_at?: string;
  auth_config?: { id?: string };
  auth_config_id?: string;
};

export async function getRedditAccounts(): Promise<ConnectedAccount[]> {
  const payload = await composio(
    "/connected_accounts?toolkit_slugs=reddit&limit=100&account_type=ALL",
  );
  const accounts = payload?.items ?? payload?.data?.items ?? payload?.data ?? [];
  return Array.isArray(accounts) ? accounts : [];
}

export async function getLatestRedditAccount() {
  const userId = composioUserId();
  const authConfigId = composioAuthConfigId();
  const accounts = (await getRedditAccounts())
    .filter((account) => {
      const accountConfigId = account.auth_config?.id || account.auth_config_id;
      return account.user_id === userId && (!accountConfigId || accountConfigId === authConfigId);
    })
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  return accounts.find((account) => account.status === "ACTIVE") || accounts[0] || null;
}
