import { describe, expect, it } from "vitest";
import { parseMcpPayload } from "./mcp.mts";
import { parseWorkbenchOutput } from "./discovery-program.mts";

describe("parseMcpPayload", () => {
  it("parses a JSON response", () => {
    expect(parseMcpPayload('{"jsonrpc":"2.0","result":{"ok":true}}')).toEqual({
      jsonrpc: "2.0",
      result: { ok: true },
    });
  });

  it("parses the last SSE data event", () => {
    const payload = 'event: message\ndata: {"result":{"step":1}}\n\nevent: message\ndata: {"result":{"step":2}}';
    expect(parseMcpPayload(payload)).toEqual({ result: { step: 2 } });
  });
});

describe("parseWorkbenchOutput", () => {
  it("ignores helper logs and reads the final JSON line", () => {
    const output = '[INFO] Fetching Reddit\n{"owner":"person-person12","candidates":[]}\n';
    expect(parseWorkbenchOutput(output)).toEqual({ owner: "person-person12", candidates: [] });
  });
});
