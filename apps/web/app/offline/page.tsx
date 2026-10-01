import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage(): React.ReactElement {
  return (
    <main className="pwa-offline-shell">
      <section className="pwa-offline-panel" aria-labelledby="offline-title">
        <span className="pwa-offline-mark" aria-hidden="true">
          R
        </span>
        <p className="eyebrow">Replica Home Saloon Service</p>
        <h1 id="offline-title">You are offline</h1>
        <p>
          Reconnect to view live availability, manage bookings, or complete a
          payment.
        </p>
        <a href="/">Try again</a>
      </section>
    </main>
  );
}
