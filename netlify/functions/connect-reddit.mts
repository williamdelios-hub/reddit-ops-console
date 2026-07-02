import { hasValidSession } from "./_shared/auth.mts";
import { composio, composioAuthConfigId, composioUserId } from "./_shared/composio.mts";
import { isSameOrigin, json } from "./_shared/http.mts";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(request) || !hasValidSession(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  try {
    const origin = new URL(request.url).origin;
    const payload = await composio("/connected_accounts/link", {
      method: "POST",
      body: JSON.stringify({
        auth_config_id: composioAuthConfigId(),
        user_id: composioUserId(),
        alias: "dispatch-reddit",
        callback_url: `${origin}/?reddit=connected`,
      }),
    });
    return json({
      redirectUrl: payload.redirect_url,
      expiresAt: payload.expires_at,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not start Reddit connection" }, 502);
  }
};
