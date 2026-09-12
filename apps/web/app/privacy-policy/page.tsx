import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Replica Home Saloon Service",
  description:
    "Draft privacy policy placeholder for Replica Home Saloon Service customer data and booking workflows.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="How customer information is collected, used, protected and retained for booking and support workflows."
      sections={[
        {
          title: "Information collected",
          body: "Client-approved wording required. This section should cover mobile number, address, booking, payment reference and support information collected during use of the platform.",
        },
        {
          title: "Use of information",
          body: "Client-approved wording required. This section should explain use for OTP login, booking fulfilment, staff assignment, payment records, invoices, support and lawful business operations.",
        },
        {
          title: "Data sharing",
          body: "Client-approved wording required. This section should identify approved providers such as payment gateway, OTP/messaging, maps and hosting infrastructure.",
        },
        {
          title: "Retention and rights",
          body: "Client-approved wording required. This section should cover retention, correction requests, deletion limitations for invoices/bookings and support contact details.",
        },
      ]}
    />
  );
}
