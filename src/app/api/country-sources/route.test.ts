import { describe, expect, it } from "vitest";
import { matchesFallbackTier } from "./route";

describe("matchesFallbackTier", () => {
  it("matches when the country name appears in the title", () => {
    expect(
      matchesFallbackTier({ title: "Germany hosts new talks", description: "" }, "Germany")
    ).toBe(true);
  });

  it("matches when the country name appears in the description", () => {
    expect(
      matchesFallbackTier(
        { title: "Talks resume", description: "Officials from Germany attended." },
        "Germany"
      )
    ).toBe(true);
  });

  it("does not match when the country name is absent from both fields", () => {
    expect(
      matchesFallbackTier({ title: "Talks resume", description: "No mention here." }, "Germany")
    ).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(
      matchesFallbackTier({ title: "GERMANY hosts talks", description: "" }, "Germany")
    ).toBe(true);
  });

  // Regression test for e54b1c2: `description` can be null, and the old
  // `article.description?.toLowerCase().includes(...)` chain threw
  // because the optional chain only guarded `.toLowerCase()`, not the
  // subsequent `.includes(...)` call.
  it("does not throw when description is null", () => {
    expect(() =>
      matchesFallbackTier({ title: "Talks resume", description: null }, "Germany")
    ).not.toThrow();
    expect(
      matchesFallbackTier({ title: "Talks resume", description: null }, "Germany")
    ).toBe(false);
  });
});
