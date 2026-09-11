import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "My Account | Replica Home Salon",
  description: "View your Replica Home Salon bookings, addresses and profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage(): React.ReactElement {
  return <CustomerExperience initialMode="account" />;
}
