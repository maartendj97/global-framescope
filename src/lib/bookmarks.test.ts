import { describe, expect, it } from "vitest";
import { toggleBookmarkId } from "./bookmarks";

describe("toggleBookmarkId", () => {
  it("adds an id that isn't present", () => {
    expect(toggleBookmarkId(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("removes an id that is present", () => {
    expect(toggleBookmarkId(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("adds to an empty list", () => {
    expect(toggleBookmarkId([], "a")).toEqual(["a"]);
  });

  it("is idempotent when toggled twice", () => {
    const once = toggleBookmarkId(["a"], "b");
    const twice = toggleBookmarkId(once, "b");
    expect(twice).toEqual(["a"]);
  });
});
