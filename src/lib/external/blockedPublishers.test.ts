import { describe, expect, it } from "vitest";
import { isSanctionedPublisher } from "./blockedPublishers";

describe("isSanctionedPublisher", () => {
  it("blocks Sputnik in all its name variants", () => {
    expect(isSanctionedPublisher("Sputnik News")).toBe(true);
    expect(isSanctionedPublisher("Sputnik International")).toBe(true);
    expect(isSanctionedPublisher("sputnik")).toBe(true);
  });

  it("blocks RT in all its name variants", () => {
    expect(isSanctionedPublisher("RT")).toBe(true);
    expect(isSanctionedPublisher("RT News")).toBe(true);
    expect(isSanctionedPublisher("RT France")).toBe(true);
    expect(isSanctionedPublisher("Russia Today")).toBe(true);
  });

  it("blocks the outlets added by the EU's June 2024 sanctions package", () => {
    expect(isSanctionedPublisher("RIA Novosti")).toBe(true);
    expect(isSanctionedPublisher("Izvestia")).toBe(true);
    expect(isSanctionedPublisher("Rossiyskaya Gazeta")).toBe(true);
    expect(isSanctionedPublisher("Voice of Europe")).toBe(true);
  });

  it("does not block normal publishers", () => {
    expect(isSanctionedPublisher("Reuters")).toBe(false);
    expect(isSanctionedPublisher("The Guardian")).toBe(false);
    expect(isSanctionedPublisher("The Straits Times")).toBe(false);
    expect(isSanctionedPublisher("TASS")).toBe(false);
  });

  it("does not block names that merely contain the letters r-t", () => {
    expect(isSanctionedPublisher("Artnet")).toBe(false);
    expect(isSanctionedPublisher("Charter97")).toBe(false);
    expect(isSanctionedPublisher("The Art Newspaper")).toBe(false);
  });
});
