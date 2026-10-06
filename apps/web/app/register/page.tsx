import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND_NAME } from "../brand";

export const metadata: Metadata = {
  title: "Register",
  description: `Register for ${BRAND_NAME} with mobile OTP and manage your at-home salon bookings.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage(): never {
  redirect("/?auth=register");
}
