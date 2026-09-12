import {
  ChevronDown,
  FileText,
  Home,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const BUSINESS_NAME = "Replica Home Saloon Service";
const BUSINESS_LOGO_PRIMARY = "Replica";
const BUSINESS_LOGO_SECONDARY = "Home Saloon Service";
const BUSINESS_ADDRESS =
  "C04 Gayatri Nagar (Pani Gao), Indira Nagar, near Peepal Tree, Lucknow 226016";

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
}

export default function PolicyPage({
  eyebrow,
  title,
  description,
  sections,
}: PolicyPageProps): React.ReactElement {
  return (
    <main className="customer-site">
      <header className="customer-header">
        <div className="customer-header-shell">
          <a className="customer-brand" href="/" aria-label={BUSINESS_NAME}>
            <span className="customer-brand-logo">
              <strong>{BUSINESS_LOGO_PRIMARY}</strong>
              <small>{BUSINESS_LOGO_SECONDARY}</small>
            </span>
          </a>
          <a
            aria-label="Current service location: Lucknow"
            className="customer-location-pill"
            href="/contact"
          >
            <MapPin size={15} />
            <span>Lucknow</span>
            <ChevronDown size={17} />
          </a>
          <form
            action="/services"
            className="customer-header-search"
            role="search"
          >
            <Search size={25} />
            <label className="sr-only" htmlFor="policy-header-search">
              Search services
            </label>
            <input
              id="policy-header-search"
              name="search"
              placeholder="Search facials, waxing, spa..."
              type="search"
            />
          </form>
          <div className="customer-actions">
            <a
              className="customer-pill-button customer-login-button"
              href="/account"
            >
              <UserRound size={18} />
              <span>Login</span>
            </a>
          </div>
          <div className="customer-quick-row">
            <span>Quick:</span>
            <a href="/services?search=Facial">Facial</a>
            <a href="/services?search=Waxing">Waxing</a>
            <a href="/services?search=Manicure">Manicure</a>
            <a href="/services?search=Hair%20spa">Hair spa</a>
          </div>
        </div>
      </header>
      <section className="policy-hero">
        <p className="customer-eyebrow">
          <ShieldCheck size={16} />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="policy-draft-note">
          <FileText size={18} />
          Draft placeholder page. Replace this content with client-approved
          legal, tax and operating policy text before production launch.
        </div>
      </section>
      <section className="policy-content">
        {sections.map((section) => (
          <article key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
      <section className="policy-contact-strip">
        <span>
          <Home size={18} />
          {BUSINESS_NAME}, {BUSINESS_ADDRESS}
        </span>
        <a href="/contact">
          <Mail size={18} />
          Contact support
        </a>
      </section>
    </main>
  );
}
