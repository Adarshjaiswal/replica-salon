import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";
import { BRAND_NAME } from "../brand";

export const metadata: Metadata = {
  title: "Addresses",
  description: `View saved service addresses for ${BRAND_NAME} bookings.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddressesPage(): React.ReactElement {
  return <CustomerExperience initialMode="addresses" />;
}
