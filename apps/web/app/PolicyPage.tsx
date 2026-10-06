import {
  ChevronDown,
  Home,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import CustomerFooter from "./CustomerFooter";
import {
  BRAND_ADDRESS,
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
} from "./brand";

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
    <main className="customer-site policy-page">
      <header className="customer-header">
        <div className="customer-header-shell">
          <a className="customer-brand" href="/" aria-label={BRAND_NAME}>
            <BrandLogo className="replica-brand-header" />
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
              placeholder="Search services"
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
        <p className="policy-description">{description}</p>
        <p className="policy-updated">Last updated: 6 October 2026</p>
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
          {BRAND_NAME}, {BRAND_ADDRESS}
        </span>
        <a href={`mailto:${BRAND_SUPPORT_EMAIL}`}>
          <Mail size={18} />
          {BRAND_SUPPORT_EMAIL}
        </a>
      </section>
      <CustomerFooter />
    </main>
  );
}
