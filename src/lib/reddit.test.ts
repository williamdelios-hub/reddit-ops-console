import { describe, expect, it } from "vitest";
import { parseRedditTarget } from "./reddit";

describe("parseRedditTarget", () => {
  it("accepts direct Reddit thing IDs", () => {
    expect(parseRedditTarget("t1_ABC123")?.thingId).toBe("t1_abc123");
    expect(parseRedditTarget("t3_xyz987")?.kind).toBe("post");
  });

  it("parses a Reddit comment permalink", () => {
    const target = parseRedditTarget(
      "https://www.reddit.com/r/investing/comments/1abc23/thread_title/m9xy12z/?context=3",
    );
    expect(target).toMatchObject({
      thingId: "t1_m9xy12z",
      kind: "comment",
      subreddit: "investing",
    });
  });

  it("parses post and short links", () => {
    expect(
      parseRedditTarget("https://old.reddit.com/r/stocks/comments/1abc23/thread_title/")?.thingId,
    ).toBe("t3_1abc23");
    expect(parseRedditTarget("https://redd.it/1abc23")?.thingId).toBe("t3_1abc23");
  });

  it("rejects lookalike and unsupported URLs", () => {
    expect(parseRedditTarget("https://reddit.example.com/comments/abc/test")).toBeNull();
    expect(parseRedditTarget("not a reddit link")).toBeNull();
  });
});
