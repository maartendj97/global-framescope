import { describe, expect, it } from "vitest";
import { capPerPublisher } from "./articleCap";

type Item = { publisher: string; id: number };

function items(...pairs: [string, number][]): Item[] {
  return pairs.map(([publisher, id]) => ({ publisher, id }));
}

describe("capPerPublisher", () => {
  it("keeps at most maxPerPublisher items from the same publisher", () => {
    const result = capPerPublisher(
      items(["BBC", 1], ["BBC", 2], ["BBC", 3], ["Reuters", 4]),
      (item) => item.publisher,
      { maxPerPublisher: 2, maxTotal: 5 }
    );
    expect(result.map((item) => item.id)).toEqual([1, 2, 4]);
  });

  it("stops once maxTotal is reached even with room left per publisher", () => {
    const result = capPerPublisher(
      items(["BBC", 1], ["Reuters", 2], ["AP", 3]),
      (item) => item.publisher,
      { maxPerPublisher: 2, maxTotal: 2 }
    );
    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("preserves input order among kept items", () => {
    const result = capPerPublisher(
      items(["BBC", 1], ["Reuters", 2], ["BBC", 3], ["AP", 4]),
      (item) => item.publisher,
      { maxPerPublisher: 1, maxTotal: 5 }
    );
    expect(result.map((item) => item.id)).toEqual([1, 2, 4]);
  });

  it("matches publisher names case-insensitively", () => {
    const result = capPerPublisher(
      items(["BBC", 1], ["bbc", 2], ["Bbc", 3]),
      (item) => item.publisher,
      { maxPerPublisher: 1, maxTotal: 5 }
    );
    expect(result.map((item) => item.id)).toEqual([1]);
  });

  it("returns an empty array for empty input", () => {
    expect(capPerPublisher([], (item: Item) => item.publisher, { maxPerPublisher: 2, maxTotal: 5 })).toEqual(
      []
    );
  });
});
