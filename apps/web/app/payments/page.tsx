import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Payments | Replica Home Saloon Service",
  description: "View payment history for Replica Home Saloon Service bookings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentsPage(): React.ReactElement {
  return <CustomerExperience initialMode="payments" />;
}
