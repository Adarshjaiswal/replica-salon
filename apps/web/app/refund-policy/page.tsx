import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";

export const metadata: Metadata = {
  title: "Refund Policy | Replica Home Saloon Service",
  description:
    "Draft refund policy placeholder for Replica Home Saloon Service payments and booking issues.",
  alternates: {
    canonical: "/refund-policy",
  },
};

export default function RefundPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Refunds"
      title="Refund Policy"
      description="Refund handling for failed payments, cancelled bookings and eligible service issues."
      sections={[
        {
          title: "Eligibility",
          body: "Client-approved wording required. This section should define which booking and payment situations are eligible for refund review.",
        },
        {
          title: "Processing",
          body: "Client-approved wording required. This section should explain Razorpay refund timelines, bank processing dependencies and required customer details.",
        },
        {
          title: "Non-refundable cases",
          body: "Client-approved wording required. This section should define non-refundable cases only after operational and legal approval.",
        },
        {
          title: "Support",
          body: "Client-approved wording required. This section should provide the support process for refund status questions and disputes.",
        },
      ]}
    />
  );
}
