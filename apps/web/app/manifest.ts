import type { MetadataRoute } from "next";
import { BRAND_NAME } from "./brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND_NAME,
    short_name: BRAND_NAME,
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
        src: "/icons/replica-salon-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/replica-salon-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/replica-salon-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Browse services",
        short_name: "Services",
        url: "/services",
        icons: [
          { src: "/icons/replica-salon-icon-192.png", sizes: "192x192" },
        ],
      },
      {
        name: "View bookings",
        short_name: "Bookings",
        url: "/orders",
        icons: [
          { src: "/icons/replica-salon-icon-192.png", sizes: "192x192" },
        ],
      },
    ],
  };
}
