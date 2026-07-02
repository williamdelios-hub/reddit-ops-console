import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "dispatch_session";
const SESSION_SECONDS = 60 * 60 * 12;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(payload: string) {
  return createHmac("sha256", requiredEnv("SESSION_SECRET"))
    .update(payload)
    .digest("base64url");
}

function parseCookies(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return Object.fromEntries(
    cookie.split(";").flatMap((entry) => {
      const separator = entry.indexOf("=");
      if (separator < 0) return [];
      return [[entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()]];
    }),
  );
}

export function validAccessKey(candidate: string) {
  return constantTimeEqual(candidate, requiredEnv("OPS_ACCESS_KEY"));
}

export function createSessionToken() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `v1.${issuedAt}.${randomBytes(18).toString("base64url")}`;
  return `${payload}.${signature(payload)}`;
}

export function hasValidSession(request: Request) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return false;
  const pieces = token.split(".");
  if (pieces.length !== 4) return false;
  const payload = pieces.slice(0, 3).join(".");
  const presentedSignature = pieces[3];
  if (!constantTimeEqual(presentedSignature, signature(payload))) return false;
  const issuedAt = Number(pieces[1]);
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  return Number.isFinite(issuedAt) && age >= 0 && age < SESSION_SECONDS;
}

export function sessionCookie(request: Request, token: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
