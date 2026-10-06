import { fetchPublicApi } from "./public-api";

export interface SeoCategory {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface SeoService {
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  pricePaise: number;
  mainImage: {
    url: string;
    altText: string | null;
  } | null;
}

interface SeoCatalogue {
  categories: SeoCategory[];
  services: SeoService[];
}

export async function getSeoCatalogue(): Promise<SeoCatalogue> {
  const catalogue = await fetchPublicApi<SeoCatalogue>(
    "/customer/catalogue",
    300,
  );
  return catalogue ?? { categories: [], services: [] };
}

export async function getSeoService(slug: string): Promise<SeoService | null> {
  const payload = await fetchPublicApi<{ service: SeoService }>(
    `/customer/services/${encodeURIComponent(slug)}`,
    300,
  );
  return payload?.service ?? null;
}

export async function getSeoCategory(
  slug: string,
): Promise<SeoCategory | null> {
  const payload = await fetchPublicApi<{ category: SeoCategory }>(
    `/customer/categories/${encodeURIComponent(slug)}`,
    300,
  );
  return payload?.category ?? null;
}
