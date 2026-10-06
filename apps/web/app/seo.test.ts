import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import { brandedTitle, conciseDescription, SITE_URL } from "./seo";
import sitemap from "./sitemap";

function apiResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SEO metadata routes", () => {
  it("publishes crawl rules and points crawlers to the canonical sitemap", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(result.host).toBe(SITE_URL);
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(["/admin", "/checkout", "/account", "/api"]),
    );
  });

  it("adds every published catalogue and paginated blog URL to the sitemap", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/customer/catalogue")) {
        return apiResponse({
          categories: [
            { slug: "facials", updatedAt: "2026-10-04T08:00:00.000Z" },
          ],
          services: [
            {
              slug: "signature-gold-facial",
              updatedAt: "2026-10-05T08:00:00.000Z",
            },
          ],
        });
      }

      if (url.includes("/customer/blogs?page=1")) {
        return apiResponse({
          posts: [
            {
              slug: "prepare-for-home-facial",
              updatedAt: "2026-10-05T09:00:00.000Z",
            },
          ],
          pagination: { page: 1, pageSize: 12, totalCount: 2, totalPages: 2 },
        });
      }

      if (url.includes("/customer/blogs?page=2")) {
        return apiResponse({
          posts: [
            {
              slug: "waxing-aftercare-guide",
              updatedAt: "2026-10-06T09:00:00.000Z",
            },
          ],
          pagination: { page: 2, pageSize: 12, totalCount: 2, totalPages: 2 },
        });
      }

      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        `${SITE_URL}/`,
        `${SITE_URL}/categories/facials`,
        `${SITE_URL}/services/signature-gold-facial`,
        `${SITE_URL}/blog/prepare-for-home-facial`,
        `${SITE_URL}/blog/waxing-aftercare-guide`,
      ]),
    );
    expect(urls).not.toEqual(
      expect.arrayContaining([
        `${SITE_URL}/admin`,
        `${SITE_URL}/checkout`,
        `${SITE_URL}/account`,
      ]),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/customer/blogs?page=2"),
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
    expect(
      result.find((entry) => entry.url === `${SITE_URL}/blog`)?.lastModified,
    ).toEqual(new Date("2026-10-06T09:00:00.000Z"));
  });
});

describe("SEO text helpers", () => {
  it("adds the brand once and keeps descriptions concise", () => {
    expect(brandedTitle("Home Salon Services in Lucknow")).toBe(
      "Home Salon Services in Lucknow | Replica Home Salon",
    );
    expect(brandedTitle("Guide | Replica Home Salon")).toBe(
      "Guide | Replica Home Salon",
    );
    expect(conciseDescription("word ".repeat(80)).length).toBeLessThanOrEqual(
      160,
    );
  });
});
