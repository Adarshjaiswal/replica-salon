import type { Metadata } from "next";
import CustomerExperience from "./CustomerExperience";

export const metadata: Metadata = {
  title: "Replica Home Salon | Professional Beauty Services at Home in Lucknow",
  description:
    "Book professional beauty, facial, waxing, makeup and grooming services at home in Lucknow with Replica Home Salon.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage(): React.ReactElement {
  return <CustomerExperience initialMode="home" />;
}
