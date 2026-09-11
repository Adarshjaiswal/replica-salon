import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Services | Replica Home Salon",
  description:
    "Explore professional home salon services in Lucknow and choose an available booking slot.",
  alternates: {
    canonical: "/services",
  },
};

export default function ServicesPage(): React.ReactElement {
  return <CustomerExperience initialMode="services" />;
}
