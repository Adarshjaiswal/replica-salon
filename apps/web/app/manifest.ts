import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Replica Home Saloon Service",
    short_name: "Replica Salon",
    description:
      "Professional beauty and grooming services at home in Lucknow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#6D3C8A",
    categories: ["beauty", "lifestyle", "shopping"],
    icons: [
      {
        src: "/icons/replica-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/replica-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Browse services",
        short_name: "Services",
        url: "/services",
        icons: [{ src: "/icons/replica-icon.svg", sizes: "any" }],
      },
      {
        name: "View bookings",
        short_name: "Bookings",
        url: "/orders",
        icons: [{ src: "/icons/replica-icon.svg", sizes: "any" }],
      },
    ],
  };
}
