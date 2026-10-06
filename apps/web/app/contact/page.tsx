import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";
import { BRAND_NAME } from "../brand";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact and Booking Support",
  description: `Contact ${BRAND_NAME} for booking, service and support questions.`,
  path: "/contact",
});

export default function ContactPage(): React.ReactElement {
  return <CustomerExperience initialMode="contact" />;
}
