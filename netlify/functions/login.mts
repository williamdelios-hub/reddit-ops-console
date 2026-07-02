import { createSessionToken, sessionCookie, validAccessKey } from "./_shared/auth.mts";
import { isSameOrigin, json } from "./_shared/http.mts";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key : "";
  if (!key || key.length > 512 || !validAccessKey(key)) {
    return json({ error: "Access key not accepted" }, 401);
  }
  return json(
    { authenticated: true },
    200,
    { "Set-Cookie": sessionCookie(request, createSessionToken()) },
  );
};
