import { describe, expect, it } from "vitest";
import { setupPrompt } from "./setupPrompts";

describe("setupPrompt", () => {
  it("keeps the writing sample and product brief separate", () => {
    const prompt = setupPrompt("codex");
    expect(prompt).toContain("HUMAN INPUT FIRST");
    expect(prompt).toContain("A writing reference");
    expect(prompt).toContain("A product brief");
    expect(prompt).toContain("Keep it separate from the voice profile");
  });

  it("preserves the manual publishing boundary", () => {
    const prompt = setupPrompt("claude-code");
    expect(prompt).toContain("Only my click on Send reply may publish");
    expect(prompt).toContain("do not call any Reddit mutation tool");
  });

  it("uses durable provider-specific scheduling guidance", () => {
    expect(setupPrompt("codex")).toContain("standalone project automation in the Codex app");
    expect(setupPrompt("claude-code")).toContain("durable Claude Code Routine");
    expect(setupPrompt("claude-code")).toContain("Do not use a session-only /loop");
  });
});
