import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Salon at Home Services in Lucknow",
  description:
    "Explore facials, waxing, hair spa, manicure, pedicure, makeup and other professional salon services at home in Lucknow.",
  path: "/services",
  keywords: [
    "beauty services at home Lucknow",
    "facial waxing hair spa Lucknow",
  ],
});

export default function ServicesPage(): React.ReactElement {
  return <CustomerExperience initialMode="services" />;
}
