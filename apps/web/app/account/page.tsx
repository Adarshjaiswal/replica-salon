import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";
import { BRAND_NAME } from "../brand";

export const metadata: Metadata = {
  title: "My Account",
  description: `View your ${BRAND_NAME} bookings, addresses and profile.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage(): React.ReactElement {
  return <CustomerExperience initialMode="account" />;
}
