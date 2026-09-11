import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Orders | Replica Home Salon",
  description:
    "View Replica Home Salon bookings, submit reviews and order services again.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrdersPage(): React.ReactElement {
  return <CustomerExperience initialMode="orders" />;
}
