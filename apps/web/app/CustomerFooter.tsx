import { ChevronRight, MapPin, MessageCircle, Phone } from "lucide-react";
import BrandLogo from "./BrandLogo";
import {
  BRAND_ADDRESS,
  BRAND_CITY,
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
  BRAND_SUPPORT_PHONE,
} from "./brand";

interface CustomerFooterProps {
  addressLine?: string;
  businessName?: string;
  city?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export default function CustomerFooter({
  addressLine = BRAND_ADDRESS,
  businessName = BRAND_NAME,
  city = BRAND_CITY,
  supportEmail = BRAND_SUPPORT_EMAIL,
  supportPhone = BRAND_SUPPORT_PHONE,
}: CustomerFooterProps): React.ReactElement {
  const phoneHref = supportPhone.replace(/[^+\d]/g, "");
  const whatsappNumber = supportPhone.replace(/\D/g, "");

  return (
    <footer className="customer-footer">
      <div className="customer-footer-contact-row">
        <span>
          <MapPin size={18} />
          <strong>Find us</strong>
          {addressLine}
        </span>
        <a href={`tel:${phoneHref}`}>
          <Phone size={18} />
          <strong>Call us</strong>
          {supportPhone}
        </a>
        <a href={`mailto:${supportEmail}`}>
          <MessageCircle size={18} />
          <strong>Mail us</strong>
          {supportEmail}
        </a>
      </div>

      <div className="customer-footer-main">
        <div>
          <a
            aria-label={businessName}
            className="customer-brand customer-brand-light"
            href="/"
          >
            <BrandLogo className="replica-brand-footer" />
          </a>
          <p>
            Professional beauty and grooming services at home in {city}, backed
            by reliable booking, payment and assignment workflows.
          </p>
        </div>
        <nav aria-label="Useful links">
          <h4>Useful links</h4>
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <a href="/blog">Blog</a>
          <a href="/#categories">Categories</a>
          <a href="/cart">Cart</a>
          <a href="/orders">My orders</a>
          <a href="/payments">Payments</a>
          <a href="/addresses">Addresses</a>
          <a href="/contact">Contact</a>
        </nav>
        <nav aria-label="Policies">
          <h4>Policies</h4>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-and-conditions">Terms</a>
          <a href="/return-refund-policy">Return and Refund Policy</a>
          <a href="/refund-policy">Refund Policy</a>
          <a href="/cancellation-policy">Cancellation Policy</a>
        </nav>
        <div className="customer-footer-support">
          <h4>Booking support</h4>
          <p>
            Need help choosing a service? Contact support and we will guide you
            to the right care option.
          </p>
          <a href="/contact">
            Contact support
            <ChevronRight size={16} />
          </a>
        </div>
      </div>

      <div className="customer-footer-bottom">
        <p className="customer-footer-copyright">
          Copyright {new Date().getFullYear()} {businessName}. All rights
          reserved.
        </p>
        <div
          aria-label="Accepted payment methods"
          className="customer-footer-payments"
        >
          <span>Accepted payments</span>
          <div className="customer-footer-payment-logos">
            <img
              alt="UPI"
              src="/images/payment-methods/upi.svg"
              width="48"
              height="24"
            />
            <img
              alt="Visa"
              src="/images/payment-methods/visa.svg"
              width="48"
              height="24"
            />
            <img
              alt="Mastercard"
              src="/images/payment-methods/mastercard.svg"
              width="40"
              height="24"
            />
            <img
              alt="RuPay"
              src="/images/payment-methods/rupay.svg"
              width="48"
              height="24"
            />
          </div>
        </div>
      </div>

      <a
        aria-label="Chat on WhatsApp"
        className="customer-whatsapp"
        href={`https://wa.me/${whatsappNumber}`}
        rel="noreferrer"
        target="_blank"
      >
        <svg
          aria-hidden="true"
          className="customer-whatsapp-logo"
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347ZM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884Zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </a>
    </footer>
  );
}
