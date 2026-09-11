import type { Metadata } from "next";
import CustomerExperience from "../../CustomerExperience";

interface CategoryPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  return {
    title: `${categorySlug.replaceAll("-", " ")} Services | Replica Home Salon`,
    description:
      "Browse category-specific home salon services and book a professional slot in Lucknow.",
    alternates: {
      canonical: `/categories/${categorySlug}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: CategoryPageProps): Promise<React.ReactElement> {
  const { categorySlug } = await params;
  return (
    <CustomerExperience initialMode="services" categorySlug={categorySlug} />
  );
}
