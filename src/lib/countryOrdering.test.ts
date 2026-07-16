import { describe, expect, it } from "vitest";
import { countries } from "@/data/countries";
import type { Event } from "@/types";
import { isInvolvedInEvent, orderCountriesByInterest } from "./countryOrdering";

function makeEvent(title: string, summary = ""): Event {
  return {
    id: "evt-test",
    title,
    category: "conflict",
    date: "2026-07-16",
    summary,
    context: "",
    availableCountries: countries.map((c) => c.code),
  };
}

describe("isInvolvedInEvent", () => {
  it("detects a country by name in the title", () => {
    expect(isInvolvedInEvent("IR", makeEvent("Missile strike near Iran's Kharg Island"))).toBe(
      true
    );
  });

  it("detects a country by demonym", () => {
    expect(isInvolvedInEvent("RU", makeEvent("Russian delegation walks out of summit"))).toBe(
      true
    );
  });

  it("detects the US via 'US' as a standalone word", () => {
    expect(isInvolvedInEvent("US", makeEvent("US Forces Use Hellfire Missiles"))).toBe(true);
  });

  it("does not match 'us' inside another word", () => {
    expect(isInvolvedInEvent("US", makeEvent("Climate focus dominates the summit"))).toBe(false);
  });

  it("detects involvement from the summary when the title is silent", () => {
    expect(
      isInvolvedInEvent("CN", makeEvent("Trade talks stall", "Beijing rejected the proposal."))
    ).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(isInvolvedInEvent("DE", makeEvent("Floods hit southeast Asia"))).toBe(false);
  });
});

describe("orderCountriesByInterest", () => {
  it("puts involved countries first, then contrast state media, then NL, then the rest", () => {
    const event = makeEvent(
      "US Forces Use Hellfire Missiles to Disable Oil Tanker Sailing Toward Iran's Kharg Island"
    );
    const ordered = orderCountriesByInterest(countries, event).map((c) => c.code);
    // Involved: US and IR (catalog order preserved within the group).
    expect(ordered.slice(0, 2)).toEqual(["US", "IR"]);
    // Contrast group next: RU, CN (IR already consumed by involved group).
    expect(ordered.slice(2, 4)).toEqual(["RU", "CN"]);
    // Home lens after the contrast group.
    expect(ordered[4]).toBe("NL");
    // Remainder keeps catalog order.
    expect(ordered.slice(5)).toEqual(["IN", "UA", "DE"]);
  });

  it("promotes NL into the involved group when the story is about the Netherlands", () => {
    const event = makeEvent("Dutch government collapses over asylum dispute");
    const ordered = orderCountriesByInterest(countries, event).map((c) => c.code);
    expect(ordered[0]).toBe("NL");
  });

  it("does not mutate the input array", () => {
    const original = [...countries];
    orderCountriesByInterest(countries, makeEvent("Iran sanctions extended"));
    expect(countries).toEqual(original);
  });
});
