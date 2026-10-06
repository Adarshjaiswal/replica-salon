import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";
import { BRAND_SUPPORT_EMAIL } from "../brand";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Refund Policy",
  description:
    "Refund terms for Replica Home Salon payments, cancellations and eligible service issues.",
  path: "/refund-policy",
});

export default function RefundPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Refunds"
      title="Refund Policy"
      description="Refund handling for failed payments, cancelled bookings and eligible service issues."
      sections={[
        {
          title: "Eligibility",
          body: "We review refund requests for duplicate charges, a captured payment without a confirmed booking, a service cancelled by Replica Home Salon, and promptly reported service issues that can be verified from the booking and support records.",
        },
        {
          title: "Processing",
          body: "An approved online-payment refund is sent to the original payment method through Razorpay. Bank and payment-network processing times vary, so the credit may take several business days after initiation. We will never ask for your UPI PIN, card PIN, OTP or banking password to process a refund.",
        },
        {
          title: "Non-refundable cases",
          body: "A completed service is generally non-refundable when it was delivered as booked and no verified service issue was reported. Missed appointments, late customer cancellations and partial preferences that were not communicated before the service may also be ineligible, subject to applicable consumer rights.",
        },
        {
          title: "Support",
          body: `Send refund questions to ${BRAND_SUPPORT_EMAIL} from your registered contact details and include the booking ID and payment reference. Our team will confirm whether more information is required.`,
        },
      ]}
    />
  );
}
