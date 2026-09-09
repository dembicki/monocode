import { describe, expect, it } from "vitest";
import {
  inferSessionCategory,
  inferSessionCategoryFromHistory,
  sessionCategoryForTurn,
} from "./session";
import {
  buildThreadTitlePrompt,
  parseGeneratedThreadMetadata,
} from "./sessionTitle";

describe("session metadata", () => {
  it("asks the sidecar for a constrained category with the title", () => {
    const prompt = buildThreadTitlePrompt("Fix the session list");
    expect(prompt).toContain("title and primary category");
    expect(prompt).toContain("bug-fix");
  });

  it("parses valid metadata and drops an unknown category", () => {
    expect(
      parseGeneratedThreadMetadata(
        '{"title":"Review session changes","category":"code-review"}',
      ),
    ).toEqual({ title: "Review session changes", category: "code-review" });
    expect(
      parseGeneratedThreadMetadata(
        '{"title":"Review session changes","category":"unexpected"}',
      ),
    ).toEqual({ title: "Review session changes" });
  });

  it("provides an immediate deterministic fallback", () => {
    expect(inferSessionCategory("Investigate why startup is slow")).toBe(
      "investigation",
    );
    expect(inferSessionCategory("Implement a new command palette")).toBe(
      "new-feature",
    );
    expect(inferSessionCategory("Anything", "plan")).toBe("planning");
  });

  it("promotes discovery and planning when the requested work changes", () => {
    expect(
      sessionCategoryForTurn({
        current: "investigation",
        message: "Please fix the startup race now",
      }),
    ).toBe("bug-fix");
    expect(
      sessionCategoryForTurn({
        current: "planning",
        message: "Build approved plan",
        intent: "build",
        context: ["Plan how to fix the startup crash"],
      }),
    ).toBe("bug-fix");
  });

  it("does not let incidental follow-ups replace a stable goal", () => {
    expect(
      sessionCategoryForTurn({
        current: "bug-fix",
        message: "Also add a regression test",
      }),
    ).toBe("bug-fix");
  });

  it("rebuilds an existing session category from its stored conversation", () => {
    expect(
      inferSessionCategoryFromHistory("Startup issue", [
        "Investigate why startup is slow",
        "Please fix the startup race now",
        "Also add a regression test",
      ]),
    ).toBe("bug-fix");
    expect(
      inferSessionCategoryFromHistory("Review session changes", [
        "Can you take a look at this?",
      ]),
    ).toBe("code-review");
  });
});
