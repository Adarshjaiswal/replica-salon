import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";
import { BRAND_NAME } from "../brand";

export const metadata: Metadata = {
  title: "Orders",
  description: `View ${BRAND_NAME} bookings, submit reviews and order services again.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrdersPage(): React.ReactElement {
  return <CustomerExperience initialMode="orders" />;
}
