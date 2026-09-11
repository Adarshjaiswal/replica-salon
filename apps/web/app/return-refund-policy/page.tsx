import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";

export const metadata: Metadata = {
  title: "Return and Refund Policy | Replica Home Salon",
  description:
    "Draft return and refund policy placeholder for Replica Home Salon service bookings and payment issues.",
  alternates: {
    canonical: "/return-refund-policy",
  },
};

export default function ReturnRefundPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Returns and refunds"
      title="Return and Refund Policy"
      description="Service-focused return and refund handling for bookings, payment failures and eligible service concerns."
      sections={[
        {
          title: "Service returns",
          body: "Client-approved wording required. This is a home-service business, so this section should explain that physical product return terms only apply where products are separately sold.",
        },
        {
          title: "Refund eligibility",
          body: "Client-approved wording required. This section should define refund eligibility for failed payments, duplicate payments, cancelled bookings and approved service complaints.",
        },
        {
          title: "Refund processing",
          body: "Client-approved wording required. This section should explain Razorpay refund initiation, banking timelines and required customer verification details.",
        },
        {
          title: "Support",
          body: "Client-approved wording required. This section should provide the official support path for refund and service-quality disputes.",
        },
      ]}
    />
  );
}
