import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";
import { BRAND_SUPPORT_EMAIL } from "../brand";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cancellation Policy",
  description:
    "Cancellation and rescheduling terms for Replica Home Salon bookings.",
  path: "/cancellation-policy",
});

export default function CancellationPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Cancellations"
      title="Cancellation Policy"
      description="Customer cancellation, reschedule and support rules for home salon bookings."
      sections={[
        {
          title: "Cancellation window",
          body: "Cancel as early as possible from your account or by contacting support. Eligibility for a refund depends on the booking status, notice provided and whether a professional has already been assigned or begun travelling to the service address.",
        },
        {
          title: "Reschedule requests",
          body: "You may request another available date or time before service delivery. A reschedule is confirmed only after the new slot and professional availability are accepted. Repeated or last-minute changes may require a fresh booking.",
        },
        {
          title: "Provider or operational changes",
          body: "If a professional becomes unavailable or an operational issue prevents fulfilment, we may offer a replacement professional, a new slot or cancellation. Any eligible prepaid amount will be handled under the Refund Policy.",
        },
        {
          title: "Refund linkage",
          body: `Approved reversals are returned to the original online payment method. For help, email ${BRAND_SUPPORT_EMAIL} with your registered mobile number and booking ID.`,
        },
      ]}
    />
  );
}
