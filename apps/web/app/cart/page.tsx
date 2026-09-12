import type { Metadata } from "next";
import CustomerExperience from "../CustomerExperience";

export const metadata: Metadata = {
  title: "Cart | Replica Home Saloon Service",
  description:
    "Review your home salon cart, choose a slot and complete checkout in Lucknow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage(): React.ReactElement {
  return <CustomerExperience initialMode="cart" />;
}
