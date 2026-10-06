import type { Metadata } from "next";
import CustomerExperience from "../../CustomerExperience";
import StructuredData from "../../StructuredData";
import { BRAND_CITY } from "../../brand";
import { getSeoCategory } from "../../catalogue-data";
import {
  absoluteUrl,
  createPageMetadata,
  SITE_URL,
  titleFromSlug,
} from "../../seo";

interface CategoryPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getSeoCategory(categorySlug);
  const categoryName = category?.name ?? titleFromSlug(categorySlug);

  return createPageMetadata({
    title:
      category?.seoTitle || `${categoryName} Services at Home in ${BRAND_CITY}`,
    description:
      category?.seoDescription ||
      category?.description ||
      `Explore ${categoryName.toLowerCase()} services at home in ${BRAND_CITY}, compare options and book a professional appointment.`,
    path: `/categories/${categorySlug}`,
    image: category?.imageUrl,
    imageAlt: `${categoryName} services at home`,
    keywords: [
      `${categoryName.toLowerCase()} at home ${BRAND_CITY}`,
      `${categoryName.toLowerCase()} services ${BRAND_CITY}`,
    ],
  });
}

export default async function CategoryPage({
  params,
}: CategoryPageProps): Promise<React.ReactElement> {
  const { categorySlug } = await params;
  const category = await getSeoCategory(categorySlug);
  const categoryName = category?.name ?? titleFromSlug(categorySlug);
  const categoryPath = `/categories/${categorySlug}`;
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: absoluteUrl("/services"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryName,
        item: absoluteUrl(categoryPath),
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbData} />
      <CustomerExperience initialMode="services" categorySlug={categorySlug} />
    </>
  );
}
