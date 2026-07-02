import { hasValidSession } from "./_shared/auth.mts";
import { json } from "./_shared/http.mts";

export default async (request: Request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  return json({ authenticated: hasValidSession(request) });
};
