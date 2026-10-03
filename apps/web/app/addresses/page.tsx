import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Addresses | Replica Home Saloon Service",
  description:
    "View saved service addresses for Replica Home Saloon Service bookings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddressesPage(): React.ReactElement {
  return <CustomerExperience initialMode="addresses" />;
}
