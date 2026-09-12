import type { Metadata } from "next";
import PolicyPage from "../PolicyPage";

export const metadata: Metadata = {
  title: "Cancellation Policy | Replica Home Saloon Service",
  description:
    "Draft cancellation policy placeholder for Replica Home Saloon Service bookings.",
  alternates: {
    canonical: "/cancellation-policy",
  },
};

export default function CancellationPolicyPage(): React.ReactElement {
  return (
    <PolicyPage
      eyebrow="Cancellations"
      title="Cancellation Policy"
      description="Customer cancellation, reschedule and support rules for home salon bookings."
      sections={[
        {
          title: "Cancellation window",
          body: "Client-approved wording required. This section should define allowed cancellation and reschedule windows for customer bookings.",
        },
        {
          title: "Reschedule requests",
          body: "Client-approved wording required. This section should explain how customers request a new slot and how staff availability affects confirmation.",
        },
        {
          title: "Provider or operational changes",
          body: "Client-approved wording required. This section should define how Replica handles staff unavailability, service-area issues and provider-side changes.",
        },
        {
          title: "Refund linkage",
          body: "Client-approved wording required. This section should cross-reference the approved refund policy for payment reversal rules.",
        },
      ]}
    />
  );
}
