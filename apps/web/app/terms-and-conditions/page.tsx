import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";

export const metadata: Metadata = {
  title: "Terms and Conditions | Replica Home Salon",
  description:
    "Draft terms placeholder for Replica Home Salon bookings and customer use.",
  alternates: {
    canonical: "/terms-and-conditions",
  },
};

export default function TermsPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Terms"
      title="Terms and Conditions"
      description="Customer-facing terms for service discovery, booking, payment, fulfilment and support."
      sections={[
        {
          title: "Using the platform",
          body: "Client-approved wording required. This section should define customer eligibility, OTP login, accurate information, service area and accepted use.",
        },
        {
          title: "Bookings and professionals",
          body: "Client-approved wording required. This section should define how slots, staff assignment, professional arrival and service completion are handled.",
        },
        {
          title: "Payments and invoices",
          body: "Client-approved wording required. This section should explain Razorpay checkout, pay-after-service fallback, taxes, invoices and failed payment handling.",
        },
        {
          title: "Limitation and support",
          body: "Client-approved wording required. This section should cover service limitations, customer support, disputes and governing law after legal review.",
        },
      ]}
    />
  );
}
