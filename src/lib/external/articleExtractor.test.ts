import { describe, expect, it, vi } from "vitest";
import { stripHtmlToText } from "./articleExtractor";

async function mockDepsAndImport(options: {
  extractImpl?: (...args: unknown[]) => Promise<unknown>;
  cached?: string | null;
}) {
  vi.resetModules();
  const getCached = vi.fn().mockResolvedValue(options.cached ?? null);
  const setCached = vi.fn().mockResolvedValue(undefined);
  const extract = vi.fn(options.extractImpl ?? (async () => null));
  vi.doMock("@/lib/cache", () => ({ getCached, setCached }));
  vi.doMock("@extractus/article-extractor", () => ({ extract }));
  const mod = await import("./articleExtractor");
  return { ...mod, getCached, setCached, extract };
}

const LONG_CONTENT = `<p>${"Officials described the strike as a significant escalation. ".repeat(6)}</p>`;

describe("stripHtmlToText", () => {
  it("removes tags and decodes common entities", () => {
    expect(stripHtmlToText("<p>Tanks &amp; troops moved &quot;overnight&quot;.</p>")).toBe(
      'Tanks & troops moved "overnight".'
    );
  });

  it("drops script and style blocks entirely, not just their tags", () => {
    const html = "<p>Real text</p><script>trackClick();</script><style>.a{color:red}</style>";
    const text = stripHtmlToText(html);
    expect(text).toContain("Real text");
    expect(text).not.toContain("trackClick");
    expect(text).not.toContain("color:red");
  });

  it("collapses repeated whitespace", () => {
    expect(stripHtmlToText("<p>a</p>\n\n<p>b</p>   <p>c</p>")).toBe("a b c");
  });
});

describe("extractArticleText", () => {
  it("returns the cached value without calling extract", async () => {
    const { extractArticleText, extract } = await mockDepsAndImport({
      cached: "previously extracted text",
    });

    const text = await extractArticleText("https://example.com/a");

    expect(text).toBe("previously extracted text");
    expect(extract).not.toHaveBeenCalled();
  });

  it("extracts, strips HTML, caches, and returns the text on success", async () => {
    const { extractArticleText, setCached } = await mockDepsAndImport({
      extractImpl: async () => ({ content: LONG_CONTENT }),
    });

    const text = await extractArticleText("https://example.com/a");

    expect(text).toContain("significant escalation");
    expect(text).not.toContain("<p>");
    expect(setCached).toHaveBeenCalledWith(
      "article-content:v1:https://example.com/a",
      expect.stringContaining("significant escalation"),
      7 * 24 * 60 * 60
    );
  });

  it("treats too-short extracted content as a failure (likely a paywall/error stub)", async () => {
    const { extractArticleText, setCached } = await mockDepsAndImport({
      extractImpl: async () => ({ content: "<p>Subscribe to continue reading.</p>" }),
    });

    const text = await extractArticleText("https://example.com/a");

    expect(text).toBeNull();
    expect(setCached).not.toHaveBeenCalled();
  });

  it("degrades to null (never throws) when extraction fails", async () => {
    const { extractArticleText } = await mockDepsAndImport({
      extractImpl: async () => {
        throw new Error("fetch failed");
      },
    });

    await expect(extractArticleText("https://example.com/a")).resolves.toBeNull();
  });

  it("degrades to null when extract() returns no content", async () => {
    const { extractArticleText } = await mockDepsAndImport({
      extractImpl: async () => ({ content: undefined }),
    });

    await expect(extractArticleText("https://example.com/a")).resolves.toBeNull();
  });
});

describe("extractManyWithBudget", () => {
  it("extracts every URL when the phase budget is generous", async () => {
    const { extractManyWithBudget } = await mockDepsAndImport({
      extractImpl: async () => ({ content: LONG_CONTENT }),
    });

    const urls = ["https://a.example", "https://b.example", "https://c.example"];
    const results = await extractManyWithBudget(urls, 20000, 5);

    expect(results.size).toBe(3);
    for (const url of urls) {
      expect(results.get(url)).toContain("significant escalation");
    }
  });

  it("stops launching new extractions once the phase budget has already elapsed", async () => {
    const { extractManyWithBudget, extract } = await mockDepsAndImport({
      extractImpl: async () => ({ content: LONG_CONTENT }),
    });

    const urls = ["https://a.example", "https://b.example", "https://c.example"];
    // A budget that's already expired before any worker starts — no
    // extraction should ever be launched, proving the deadline check
    // gates work at the start of every loop iteration, not just once.
    const results = await extractManyWithBudget(urls, -1, 5);

    expect(results.size).toBe(0);
    expect(extract).not.toHaveBeenCalled();
  });

  it("a single failing URL degrades to null without preventing the others from succeeding", async () => {
    const { extractManyWithBudget } = await mockDepsAndImport({
      extractImpl: async (url: unknown) => {
        if (url === "https://bad.example") throw new Error("hung/blocked");
        return { content: LONG_CONTENT };
      },
    });

    const results = await extractManyWithBudget(
      ["https://good1.example", "https://bad.example", "https://good2.example"],
      20000,
      3
    );

    expect(results.get("https://bad.example")).toBeNull();
    expect(results.get("https://good1.example")).toContain("significant escalation");
    expect(results.get("https://good2.example")).toContain("significant escalation");
  });

  it("deduplicates repeated URLs so each is only extracted once", async () => {
    const { extractManyWithBudget, extract } = await mockDepsAndImport({
      extractImpl: async () => ({ content: LONG_CONTENT }),
    });

    const results = await extractManyWithBudget(
      ["https://a.example", "https://a.example", "https://a.example"],
      20000,
      5
    );

    expect(extract).toHaveBeenCalledTimes(1);
    expect(results.size).toBe(1);
  });
});
