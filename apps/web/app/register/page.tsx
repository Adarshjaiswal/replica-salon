import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register | Replica Home Saloon Service",
  description:
    "Register for Replica Home Saloon Service with mobile OTP and manage your at-home salon bookings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage(): never {
  redirect("/?auth=register");
}
