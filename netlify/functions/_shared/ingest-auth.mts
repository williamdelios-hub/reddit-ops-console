import { timingSafeEqual } from "node:crypto";

export function hasValidIngestToken(request: Request) {
  const expected = process.env.DISPATCH_INGEST_KEY || "";
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);

  return Boolean(
    expected &&
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes),
  );
}
