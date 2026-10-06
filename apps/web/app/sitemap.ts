import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "./blog/blog-data";
import { getSeoCatalogue } from "./catalogue-data";
import { absoluteUrl } from "./seo";

export const revalidate = 60;

const POLICY_UPDATED_AT = new Date("2026-10-06T00:00:00+05:30");
const STATIC_PATHS = [
  "/",
  "/services",
  "/blog",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/return-refund-policy",
  "/refund-policy",
  "/cancellation-policy",
] as const;

function validDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, catalogue] = await Promise.all([
    getAllBlogPosts(),
    getSeoCatalogue(),
  ]);
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const path of STATIC_PATHS) {
    entries.set(path, {
      url: absoluteUrl(path),
      ...(path.includes("policy") || path === "/terms-and-conditions"
        ? { lastModified: POLICY_UPDATED_AT }
        : {}),
    });
  }

  for (const category of catalogue.categories) {
    const path = `/categories/${category.slug}`;
    entries.set(path, {
      url: absoluteUrl(path),
      lastModified: validDate(category.updatedAt),
    });
  }

  for (const service of catalogue.services) {
    const path = `/services/${service.slug}`;
    entries.set(path, {
      url: absoluteUrl(path),
      lastModified: validDate(service.updatedAt),
    });
  }

  const availableBlogSlots = Math.max(0, 50_000 - entries.size);
  for (const post of posts.slice(0, availableBlogSlots)) {
    const path = `/blog/${post.slug}`;
    entries.set(path, {
      url: absoluteUrl(path),
      lastModified: validDate(post.updatedAt),
    });
  }

  const latestBlogUpdate = posts
    .map((post) => validDate(post.updatedAt))
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => right.getTime() - left.getTime())[0];
  if (latestBlogUpdate) {
    entries.set("/blog", {
      url: absoluteUrl("/blog"),
      lastModified: latestBlogUpdate,
    });
  }

  return [...entries.values()];
}
