import type { Metadata } from "next";
import CustomerExperience from "./CustomerExperience";
import StructuredData from "./StructuredData";
import {
  createPageMetadata,
  DEFAULT_SEO_DESCRIPTION,
  homeStructuredData,
} from "./seo";

export const metadata: Metadata = createPageMetadata({
  title: "Home Salon Services in Lucknow",
  description: DEFAULT_SEO_DESCRIPTION,
  path: "/",
  keywords: [
    "home beauty services Lucknow",
    "professional beautician at home Lucknow",
    "makeup artist at home Lucknow",
  ],
});

export default function HomePage(): React.ReactElement {
  return (
    <>
      <StructuredData data={homeStructuredData} />
      <CustomerExperience initialMode="home" />
    </>
  );
}
