import type { Metadata } from "next";
import {
  BRAND_CITY,
  BRAND_LOGO_PATH,
  BRAND_NAME,
  BRAND_STREET_ADDRESS,
  BRAND_SUPPORT_EMAIL,
  BRAND_SUPPORT_PHONE,
  BRAND_WEBSITE_URL,
} from "./brand";

export const SITE_URL = BRAND_WEBSITE_URL.replace(/\/$/, "");
export const DEFAULT_SEO_TITLE = `Home Salon Services in ${BRAND_CITY} | ${BRAND_NAME}`;
export const DEFAULT_SEO_DESCRIPTION = `Book professional salon services at home in ${BRAND_CITY}, including facials, waxing, hair care, manicure, pedicure and makeup.`;
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}${BRAND_LOGO_PATH}`;

export const CORE_KEYWORDS = [
  `home salon in ${BRAND_CITY}`,
  `salon at home ${BRAND_CITY}`,
  `beauty parlour at home ${BRAND_CITY}`,
  `women salon at home ${BRAND_CITY}`,
  `facial at home ${BRAND_CITY}`,
  `waxing at home ${BRAND_CITY}`,
];

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function brandedTitle(title: string): string {
  const normalized = title.trim();
  return normalized.toLowerCase().includes(BRAND_NAME.toLowerCase())
    ? normalized
    : `${normalized} | ${BRAND_NAME}`;
}

export function conciseDescription(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const shortened = normalized.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, Math.max(lastSpace, 80)).trim()}…`;
}

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  image?: string | null | undefined;
  imageAlt?: string;
  keywords?: string[];
}

export function createPageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  keywords = [],
}: PageMetadataOptions): Metadata {
  const fullTitle = brandedTitle(title);
  const summary = conciseDescription(description);
  const canonical = absoluteUrl(path);
  const socialImage = absoluteUrl(image || DEFAULT_SOCIAL_IMAGE);

  return {
    title: { absolute: fullTitle },
    description: summary,
    keywords: [...new Set([...keywords, ...CORE_KEYWORDS])],
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: canonical,
      siteName: BRAND_NAME,
      title: fullTitle,
      description: summary,
      images: [{ url: socialImage, alt: imageAlt ?? fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: summary,
      images: [socialImage],
    },
  };
}

export const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND_NAME,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#business` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/services?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": `${SITE_URL}/#business`,
    name: BRAND_NAME,
    url: SITE_URL,
    logo: DEFAULT_SOCIAL_IMAGE,
    image: DEFAULT_SOCIAL_IMAGE,
    email: BRAND_SUPPORT_EMAIL,
    telephone: BRAND_SUPPORT_PHONE,
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND_STREET_ADDRESS,
      addressLocality: BRAND_CITY,
      addressRegion: "Uttar Pradesh",
      postalCode: "226016",
      addressCountry: "IN",
    },
    areaServed: {
      "@type": "City",
      name: BRAND_CITY,
    },
  },
];
