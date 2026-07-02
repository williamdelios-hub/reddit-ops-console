import { describe, expect, it } from "vitest";
import { parseLocalEnv } from "./local-env.mts";

describe("parseLocalEnv", () => {
  it("reads unquoted and quoted values", () => {
    expect(parseLocalEnv("ONE=first\nTWO='second value'\nTHREE=\"third\"\n")).toEqual({
      ONE: "first",
      TWO: "second value",
      THREE: "third",
    });
  });

  it("ignores comments and malformed lines", () => {
    expect(parseLocalEnv("# private\nNO_SEPARATOR\nTOKEN=abc123\n")).toEqual({ TOKEN: "abc123" });
  });
});
