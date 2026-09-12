import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Contact | Replica Home Saloon Service",
  description:
    "Contact Replica Home Saloon Service for booking, service and support questions.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage(): React.ReactElement {
  return <CustomerExperience initialMode="contact" />;
}
