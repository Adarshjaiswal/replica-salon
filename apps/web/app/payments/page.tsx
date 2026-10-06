import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";
import { BRAND_NAME } from "../brand";

export const metadata: Metadata = {
  title: "Payments",
  description: `View payment history for ${BRAND_NAME} bookings.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentsPage(): React.ReactElement {
  return <CustomerExperience initialMode="payments" />;
}
