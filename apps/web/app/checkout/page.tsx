import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Review your home salon cart, choose a slot, sign in with OTP and complete payment.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage(): React.ReactElement {
  return <CustomerExperience initialMode="checkout" />;
}
