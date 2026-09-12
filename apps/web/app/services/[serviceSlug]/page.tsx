import type { Metadata } from "next";
import CustomerExperience from "../../CustomerExperience";

interface ServicePageProps {
  params: Promise<{
    serviceSlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { serviceSlug } = await params;
  return {
    title: `${serviceSlug.replaceAll("-", " ")} | Replica Home Saloon Service`,
    description:
      "View service details, pricing and available professionals for at-home salon booking.",
    alternates: {
      canonical: `/services/${serviceSlug}`,
    },
  };
}

export default async function ServicePage({
  params,
}: ServicePageProps): Promise<React.ReactElement> {
  const { serviceSlug } = await params;
  return (
    <CustomerExperience initialMode="services" serviceSlug={serviceSlug} />
  );
}
