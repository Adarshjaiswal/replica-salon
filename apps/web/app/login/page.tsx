import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND_NAME } from "../brand";

export const metadata: Metadata = {
  title: "Login",
  description: `Login to ${BRAND_NAME} with mobile OTP to view bookings, payments, addresses and cart.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage(): never {
  redirect("/?auth=login");
}
