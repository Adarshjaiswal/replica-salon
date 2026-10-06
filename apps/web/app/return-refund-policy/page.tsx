import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";
import { BRAND_SUPPORT_EMAIL } from "../brand";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Return and Refund Policy",
  description:
    "Return and refund terms for Replica Home Salon bookings and payment issues.",
  path: "/return-refund-policy",
});

export default function ReturnRefundPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Returns and refunds"
      title="Return and Refund Policy"
      description="Service-focused return and refund handling for bookings, payment failures and eligible service concerns."
      sections={[
        {
          title: "Service returns",
          body: "Salon appointments are services and cannot be physically returned after completion. If a separately sold product is damaged, incorrect or defective when delivered, contact support promptly and keep the product, packaging and proof of purchase available for review.",
        },
        {
          title: "Refund eligibility",
          body: "A refund review may apply to duplicate charges, an online payment captured without a confirmed booking, a service cancelled by Replica Home Salon, or a verified service issue reported promptly with the booking details. Customer cancellations are handled under the Cancellation Policy.",
        },
        {
          title: "Refund processing",
          body: "Approved online-payment refunds are initiated to the original payment method through Razorpay. We will provide confirmation after initiation. The time required for the amount to appear is controlled by the payment provider and your bank and may take several business days.",
        },
        {
          title: "Support",
          body: `Email ${BRAND_SUPPORT_EMAIL} with your registered mobile number, booking ID, payment reference and a short explanation. Do not send card numbers, UPI PINs, OTPs or banking passwords.`,
        },
      ]}
    />
  );
}
