import type { Metadata } from "next";
import CustomerExperience from "../../CustomerExperience";
import StructuredData from "../../StructuredData";
import { BRAND_CITY } from "../../brand";
import { getSeoService } from "../../catalogue-data";
import {
  absoluteUrl,
  createPageMetadata,
  SITE_URL,
  titleFromSlug,
} from "../../seo";

interface ServicePageProps {
  params: Promise<{
    serviceSlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = await getSeoService(serviceSlug);
  const serviceName = service?.name ?? titleFromSlug(serviceSlug);

  return createPageMetadata({
    title: service?.seoTitle || `${serviceName} at Home in ${BRAND_CITY}`,
    description:
      service?.seoDescription ||
      service?.shortDescription ||
      `Book ${serviceName.toLowerCase()} at home in ${BRAND_CITY}. View service details, pricing and appointment availability.`,
    path: `/services/${serviceSlug}`,
    image: service?.mainImage?.url,
    imageAlt: service?.mainImage?.altText ?? serviceName,
    keywords: [
      `${serviceName.toLowerCase()} at home ${BRAND_CITY}`,
      `${serviceName.toLowerCase()} price ${BRAND_CITY}`,
    ],
  });
}

export default async function ServicePage({
  params,
}: ServicePageProps): Promise<React.ReactElement> {
  const { serviceSlug } = await params;
  const service = await getSeoService(serviceSlug);
  const servicePath = `/services/${serviceSlug}`;
  const serviceName = service?.name ?? titleFromSlug(serviceSlug);
  const structuredData = service
    ? [
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": `${absoluteUrl(servicePath)}#service`,
          name: service.name,
          description:
            service.fullDescription || service.shortDescription || undefined,
          serviceType: service.name,
          url: absoluteUrl(servicePath),
          image: service.mainImage
            ? absoluteUrl(service.mainImage.url)
            : undefined,
          areaServed: { "@type": "City", name: BRAND_CITY },
          provider: { "@id": `${SITE_URL}/#business` },
          offers: {
            "@type": "Offer",
            price: (service.pricePaise / 100).toFixed(2),
            priceCurrency: "INR",
            url: absoluteUrl(servicePath),
          },
        },
        {
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
              name: serviceName,
              item: absoluteUrl(servicePath),
            },
          ],
        },
      ]
    : null;

  return (
    <>
      {structuredData ? <StructuredData data={structuredData} /> : null}
      <CustomerExperience initialMode="services" serviceSlug={serviceSlug} />
    </>
  );
}
