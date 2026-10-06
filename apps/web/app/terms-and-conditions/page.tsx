import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";
import { BRAND_SUPPORT_EMAIL } from "../brand";
import { createPageMetadata } from "../seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms and Conditions",
  description:
    "Terms governing Replica Home Salon bookings, payments and customer use.",
  path: "/terms-and-conditions",
});

export default function TermsPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Terms"
      title="Terms and Conditions"
      description="Customer-facing terms for service discovery, booking, payment, fulfilment and support."
      sections={[
        {
          title: "Using the platform",
          body: "Use a valid mobile number and provide complete, accurate contact and service-address information. You are responsible for activity performed through your OTP-authenticated account and must not misuse the platform, interfere with its operation or impersonate another person.",
        },
        {
          title: "Bookings and professionals",
          body: "A booking is confirmed after you select an available slot and receive confirmation. Professional assignment may change because of availability, travel conditions or operational requirements. We will communicate material changes and help arrange a suitable alternative when possible.",
        },
        {
          title: "Prices, payments and invoices",
          body: "Service prices, discounts, applicable taxes and the final payable amount are shown before confirmation. Online payments are processed securely through Razorpay. Pay-after-service is available only when displayed at checkout. A failed or pending payment does not count as successful until its status is confirmed.",
        },
        {
          title: "Customer responsibilities",
          body: "Provide safe access to the service location, remain available at the scheduled time and disclose relevant allergies, sensitivities or medical concerns before a service begins. Follow the professional's preparation and aftercare guidance and inspect any product before agreeing to its use.",
        },
        {
          title: "Support and concerns",
          body: `Report booking, payment or service concerns promptly at ${BRAND_SUPPORT_EMAIL} with the booking ID and relevant details. We will review the available records and respond through the registered contact information. Nothing in these terms limits rights that cannot lawfully be excluded.`,
        },
      ]}
    />
  );
}
