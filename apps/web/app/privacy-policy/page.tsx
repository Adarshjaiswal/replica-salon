import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";
import { BRAND_SUPPORT_EMAIL } from "../brand";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "How Replica Home Salon collects, uses and protects customer information.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="How customer information is collected, used, protected and retained for booking and support workflows."
      sections={[
        {
          title: "Information collected",
          body: "We collect information needed to provide the service, including your name, mobile number, saved addresses, booking selections, appointment history, reviews and messages sent to support. We also receive transaction references and payment status from our payment provider.",
        },
        {
          title: "Use of information",
          body: "We use this information to authenticate your account, confirm and fulfil bookings, assign professionals, communicate service updates, maintain payment and invoice records, prevent misuse, answer support requests and improve our services.",
        },
        {
          title: "Sharing and payment security",
          body: "We share only the information reasonably required with assigned service professionals and providers supporting payments, OTP delivery, communications and hosting. Razorpay processes online payment credentials; Replica Home Salon does not store your full card number, UPI PIN or banking password.",
        },
        {
          title: "Retention and rights",
          body: `We retain records for as long as needed for bookings, support, fraud prevention, accounting and legal obligations. You may request correction of inaccurate profile information or ask about deletion by emailing ${BRAND_SUPPORT_EMAIL}. Some booking, invoice or payment records may need to be retained where required for legitimate business or legal purposes.`,
        },
      ]}
    />
  );
}
