import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Payments | Replica Home Salon",
  description: "View payment history for Replica Home Salon bookings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentsPage(): React.ReactElement {
  return <CustomerExperience initialMode="payments" />;
}
