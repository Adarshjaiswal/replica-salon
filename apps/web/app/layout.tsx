import type { Metadata } from "next";
import { PwaRegistration } from "./PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Replica Home Saloon Service",
    template: "%s | Replica Home Saloon Service",
  },
  description: "Professional beauty and grooming services at home in Lucknow.",
  applicationName: "Replica Home Saloon Service",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Replica Salon",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/replica-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/icons/replica-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Replica Home Saloon Service",
    description:
      "Professional beauty and grooming services at home in Lucknow.",
    images: [
      "https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg?auto=compress&cs=tinysrgb&w=1200",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin="anonymous"
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Outfit:wght@100..900&family=Roboto:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
