import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login | Replica Home Saloon Service",
  description:
    "Login to Replica Home Saloon Service with mobile OTP to view bookings, payments, addresses and cart.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage(): never {
  redirect("/?auth=login");
}
