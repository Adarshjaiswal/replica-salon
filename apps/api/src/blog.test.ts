import {
  adminBlogListQuerySchema,
  adminCreateBlogRequestSchema,
} from "@replica/contracts";
import { describe, expect, it } from "vitest";

describe("blog request validation", () => {
  it("accepts a publishable salon article", () => {
    const result = adminCreateBlogRequestSchema.safeParse({
      title: "How to prepare for a home salon appointment",
      slug: "prepare-for-home-salon-appointment",
      excerpt: "A practical checklist for a comfortable home salon visit.",
      body: "Prepare a bright, clean area before your appointment.\n\nKeep water and a power socket accessible for the professional.",
      status: "PUBLISHED",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe or malformed slugs", () => {
    const result = adminCreateBlogRequestSchema.safeParse({
      title: "Home salon guide",
      slug: "Home Salon <script>",
      excerpt: "A useful guide for salon services delivered at home.",
      body: "This body is intentionally long enough to pass the minimum article length while the slug remains invalid.",
      status: "DRAFT",
    });

    expect(result.success).toBe(false);
  });

  it("bounds admin pagination", () => {
    const result = adminBlogListQuerySchema.safeParse({
      page: "0",
      pageSize: "1000",
    });
    expect(result.success).toBe(false);
  });
});
