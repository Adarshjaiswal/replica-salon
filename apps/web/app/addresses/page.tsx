import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Addresses | Replica Home Salon",
  description: "View saved service addresses for Replica Home Salon bookings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddressesPage(): React.ReactElement {
  return <CustomerExperience initialMode="addresses" />;
}
