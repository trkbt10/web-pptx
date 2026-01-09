/**
 * @file Google Fonts catalog listFamilies behavior tests
 */

import { createGoogleFontsCatalog } from "./google-fonts-catalog";

describe("createGoogleFontsCatalog", () => {
  it("deduplicates concurrent listFamilies calls (in-flight caching)", async () => {
    const calls = { fetch: 0 };
    const resolveRef: { value?: (value: Response) => void } = {};
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveRef.value = resolve;
    });

    const catalog = createGoogleFontsCatalog({
      familiesUrl: "/fonts/google-fonts-families.json",
      fetcher: () => {
        calls.fetch += 1;
        return fetchPromise;
      },
      cssBaseUrl: "https://fonts.googleapis.com/css2",
      display: "swap",
      weights: [400],
      cacheKey: "test:cache",
      cacheTtlMs: 1,
      timeoutMs: 1000,
    });

    const p1 = catalog.listFamilies();
    const p2 = catalog.listFamilies();

    expect(calls.fetch).toBe(1);

    if (!resolveRef.value) {
      throw new Error("Test setup failed: fetch resolver not set");
    }
    resolveRef.value(new Response(JSON.stringify({ families: ["Inter", "Roboto"] }), { status: 200 }));

    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toEqual(["Inter", "Roboto"]);
    expect(b).toEqual(["Inter", "Roboto"]);

    const p3 = catalog.listFamilies();
    expect(calls.fetch).toBe(1);
    expect(await p3).toEqual(["Inter", "Roboto"]);
  });

  it("exposes category tags via listFamilyRecords when available", async () => {
    const catalog = createGoogleFontsCatalog({
      familiesUrl: "/fonts/google-fonts-families.json",
      fetcher: async () =>
        new Response(
          JSON.stringify({ families: ["Inter"], categories: { Inter: "sans-serif" } }),
          { status: 200 }
        ),
      cssBaseUrl: "https://fonts.googleapis.com/css2",
      display: "swap",
      weights: [400],
      cacheKey: "test:cache:categories",
      cacheTtlMs: 1,
      timeoutMs: 1000,
    });

    if (!catalog.listFamilyRecords) {
      throw new Error("Expected listFamilyRecords to be defined");
    }

    expect(await catalog.listFamilyRecords()).toEqual([{ family: "Inter", tags: ["sans-serif"] }]);
  });
});
