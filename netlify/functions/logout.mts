import { clearSessionCookie, hasValidSession } from "./_shared/auth.mts";
import { isSameOrigin, json } from "./_shared/http.mts";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(request) || !hasValidSession(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  return json({ authenticated: false }, 200, {
    "Set-Cookie": clearSessionCookie(request),
  });
};
