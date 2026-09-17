"use client";

import {
  BadgePercent,
  CalendarCheck,
  ChevronDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Phone,
  PlayCircle,
  Plus,
  Quote,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

const CONFIGURED_API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

const CART_STORAGE_KEY = "replica_customer_cart";
const SELECTED_ADDRESS_STORAGE_KEY = "replica_customer_selected_address";
const INDIA_TIME_ZONE = "Asia/Kolkata";
const FALLBACK_DEAL_STARTS_AT = "2026-01-01T00:00:00.000Z";
const FALLBACK_DEAL_ENDS_AT = "2027-01-01T00:00:00.000Z";
const CATALOGUE_SERVICES_PER_PAGE = 6;
const BUSINESS_NAME = "Replica Home Saloon Service";
const BUSINESS_LOGO_PRIMARY = "Replica";
const BUSINESS_LOGO_SECONDARY = "Home Saloon Service";
const BUSINESS_ADDRESS =
  "C04 Gayatri Nagar (Pani Gao), Indira Nagar, near Peepal Tree, Lucknow 226016";
const BUSINESS_SUPPORT_EMAIL = "support@replicahomesaloonservice.in";
const BUSINESS_WEBSITE_URL = "https://replicahomesaloonservice.in";
const DEFAULT_CUSTOMER_ADDRESS_FORM = {
  label: "Home",
  line1: "",
  line2: "",
  city: "Lucknow",
  region: "Uttar Pradesh",
  postalCode: "",
};
const REVIEW_HIGHLIGHT_OPTIONS = [
  "The professional arrived on time.",
  "The professional confirmed availability before coming.",
  "The professional groomed properly.",
  "The professional used disposable items before the service started.",
  "The professional cleaned properly after the service.",
  "I am satisfied with the services.",
  "The professional was excellent in all services.",
  "The professional's behavior was exemplary.",
];

interface ApiErrorShape {
  code: string;
  message: string;
  requestId: string;
}

interface PublicMediaImage {
  id: string;
  url: string;
  altText: string | null;
}

interface PublicCategory {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentSlug: string | null;
  description: string | null;
  imageUrl: string | null;
}

interface PublicService {
  id: string;
  publicId: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  durationMinutes: number;
  pricePaise: number;
  compareAtPricePaise: number | null;
  gstRateBps: number | null;
  dealEnabled?: boolean;
  dealPricePaise?: number | null;
  dealStartsAt?: string | null;
  dealEndsAt?: string | null;
  featured: boolean;
  mainImage: PublicMediaImage | null;
  galleryImages: PublicMediaImage[];
  tiers: PublicServiceTier[];
  inclusions: string[];
  exclusions: string[];
}

interface PublicServiceTier {
  id: string;
  publicId: string;
  tierType: "PREMIUM" | "LUXURY";
  name: string;
  description: string | null;
  durationMinutes: number;
  pricePaise: number;
  compareAtPricePaise: number | null;
  productsUsed: string[];
}

interface PublicServicePackageItem {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceTierId: string | null;
  serviceTierName: string | null;
  label: string | null;
  quantity: number;
  minQuantity: number;
  sortOrder: number;
}

interface PublicServicePackage {
  id: string;
  publicId: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  minPricePaise: number;
  compareAtPricePaise: number | null;
  discountBps: number;
  durationMinutes: number;
  inclusions: string[];
  items: PublicServicePackageItem[];
}

interface PublicHomepageTextBlock {
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface PublicHomepageHeroBlock extends PublicHomepageTextBlock {
  titleAccent: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

interface PublicHomepageHighlightCard {
  id?: string;
  title: string;
  subtitle?: string;
  label?: string;
  mediaUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
}

interface PublicHomepageServiceSection {
  id?: string;
  title: string;
  subtitle?: string;
  serviceIds: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
}

interface HomepageServiceSectionViewModel {
  id: string;
  title: string;
  categorySlug: string;
  services: PublicService[];
}

interface PublicHomepageConfig {
  hero: PublicHomepageHeroBlock;
  offers: PublicHomepageTextBlock;
  categories: PublicHomepageTextBlock;
  highlights: PublicHomepageTextBlock & {
    cards: PublicHomepageHighlightCard[];
  };
  services: PublicHomepageTextBlock;
  serviceSections: PublicHomepageServiceSection[];
  trust: PublicHomepageTextBlock;
}

interface CataloguePayload {
  business: {
    name: string;
    city: string;
    area: string;
    addressLine?: string;
    supportEmail?: string;
    websiteUrl?: string;
    supportPhone: string;
    heroImageUrl: string;
    fallbackServiceImages: string[];
    razorpayConfigured: boolean;
    otpProviderConfigured: boolean;
    developmentMode: boolean;
  };
  categories: PublicCategory[];
  homepage: PublicHomepageConfig;
  services: PublicService[];
  featuredServices: PublicService[];
  packages: PublicServicePackage[];
}

interface CustomerUser {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE";
  customerProfileId: string;
  displayName: string;
}

interface CustomerAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  isDefault?: boolean;
}

type AddressFormState = typeof DEFAULT_CUSTOMER_ADDRESS_FORM;

interface CustomerAddressRequest {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault?: boolean;
}

interface CustomerAddressPayload {
  address: CustomerAddress;
  addresses: CustomerAddress[];
}

interface BookingPayment {
  id: string;
  provider: string;
  providerRef: string | null;
  status: string;
  amountPaise: number;
  currency: string;
  capturedAt: string | null;
  createdAt: string;
}

interface CustomerBookingReview {
  id: string;
  rating: number;
  comment: string | null;
  highlights: string[];
  status: "PENDING" | "APPROVED" | "HIDDEN" | "REJECTED";
  showOnHomepage: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerBooking {
  id: string;
  publicId: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  notes: string | null;
  address: CustomerAddress;
  items: Array<{
    id: string;
    serviceId: string;
    serviceTierId: string | null;
    packageId: string | null;
    serviceName: string;
    serviceTierName: string | null;
    packageName: string | null;
    quantity: number;
    unitPaise: number;
    taxPaise: number;
    totalPaise: number;
  }>;
  staff: {
    status: string;
  } | null;
  payments: BookingPayment[];
  review: CustomerBookingReview | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerMePayload {
  user: CustomerUser;
  addresses: CustomerAddress[];
  bookings: CustomerBooking[];
}

interface PublicReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  highlights: string[];
  serviceNames: string[];
  createdAt: string;
}

interface PublicReviewsPayload {
  reviews: PublicReview[];
}

interface CartItem {
  serviceId: string;
  serviceTierId: string | null;
  serviceTierType: "PREMIUM" | "LUXURY" | null;
  packageId: string | null;
  packageName: string | null;
  slug: string;
  name: string;
  tierName: string | null;
  pricePaise: number;
  compareAtPricePaise: number | null;
  durationMinutes: number;
  imageUrl: string;
  quantity: number;
  minQuantity: number;
}

type CustomerInitialMode =
  | "home"
  | "services"
  | "account"
  | "checkout"
  | "cart"
  | "login"
  | "register"
  | "addresses"
  | "orders"
  | "payments"
  | "contact";

type CheckoutStep =
  "cart" | "slot" | "auth" | "address" | "payment" | "success";

type CustomerAccountPage =
  "account" | "orders" | "payments" | "addresses" | "cart";

type AuthStep = "phone" | "otp" | "profile" | "complete";
type AuthGender = "FEMALE" | "MALE" | "OTHER";
type AddressModalStep = "choose" | "form";

interface ReviewDraft {
  bookingId: string | null;
  rating: number;
  highlights: string[];
  comment: string;
}

interface TierSelectionState {
  service: PublicService;
  index: number;
  quickCheckout: boolean;
}

interface PackageLineSelection {
  packageItemId: string;
  serviceId: string;
  serviceTierId: string | null;
  quantity: number;
}

interface PackageEditorState {
  servicePackage: PublicServicePackage;
  selections: PackageLineSelection[];
  quickCheckout: boolean;
}

interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  availableCount: number;
}

interface AvailabilityPayload {
  date: string;
  durationMinutes: number;
  slots: AvailableSlot[];
}

interface BookingPayload {
  booking: CustomerBooking;
}

interface OtpRequestPayload {
  phone: string;
  expiresAt: string;
  delivery: "sms_provider" | "development_preview";
  developmentOtp: string | null;
}

interface OtpVerifyPayload {
  user: CustomerUser;
  expiresAt: string;
  isNewCustomer: boolean;
  requiresProfileCompletion: boolean;
}

interface CustomerProfilePayload {
  user: CustomerUser;
  profileCompleted: boolean;
}

interface PaymentCheckoutPayload {
  mode: "razorpay" | "development_razorpay" | "pay_after_service";
  razorpayKeyId?: string;
  order?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  };
  payment: {
    id: string;
    provider: string;
    status: string;
    amountPaise: number;
    currency: string;
  };
  developmentPaymentToken?: string;
  booking?: CustomerBooking | null;
}

interface PaymentVerifyPayload {
  booking: CustomerBooking;
}

interface ContactPayload {
  contact: {
    id: string;
    status: string;
    createdAt: string;
  };
}

interface CustomerExperienceProps {
  initialMode?: CustomerInitialMode;
  serviceSlug?: string;
  categorySlug?: string;
}

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayHandlerResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const FALLBACK_HERO_IMAGE_URL =
  "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=1600";

const FALLBACK_SERVICE_IMAGE_URLS = [
  "https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3993320/pexels-photo-3993320.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3997387/pexels-photo-3997387.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const HERO_SERVICE_VIDEO_URLS_BY_SLUG: Readonly<Record<string, string>> = {
  "signature-gold-facial":
    "https://videos.pexels.com/video-files/5659276/5659276-hd_1080_1920_30fps.mp4",
  "korean-glass-glow-facial":
    "https://videos.pexels.com/video-files/5534673/5534673-hd_1080_1920_30fps.mp4",
  "hydra-clean-facial":
    "https://videos.pexels.com/video-files/13467956/13467956-hd_1920_1080_30fps.mp4",
  "waxing-essentials":
    "https://videos.pexels.com/video-files/6763105/6763105-hd_1920_1080_25fps.mp4",
  "rica-arms-underarms":
    "https://videos.pexels.com/video-files/3741666/3741666-hd_1920_1080_25fps.mp4",
  "full-body-waxing":
    "https://videos.pexels.com/video-files/7423546/7423546-hd_1080_1920_30fps.mp4",
  "manicure-pedicure-ritual":
    "https://videos.pexels.com/video-files/4855794/4855794-hd_1920_1080_30fps.mp4",
  "relaxing-hair-spa":
    "https://videos.pexels.com/video-files/7575397/7575397-hd_1920_1080_24fps.mp4",
  "bridal-glow-prep":
    "https://videos.pexels.com/video-files/7988842/7988842-hd_1066_1920_25fps.mp4",
  "body-polishing":
    "https://videos.pexels.com/video-files/6187307/6187307-hd_1920_1080_25fps.mp4",
  "back-shoulder-massage":
    "https://videos.pexels.com/video-files/7754448/7754448-hd_1080_1920_30fps.mp4",
};

function fallbackServiceImage(index: number): string {
  return FALLBACK_SERVICE_IMAGE_URLS[index] ?? FALLBACK_HERO_IMAGE_URL;
}

function heroServiceVideoUrl(service: PublicService): string | null {
  return HERO_SERVICE_VIDEO_URLS_BY_SLUG[service.slug.toLowerCase()] ?? null;
}

const FALLBACK_CATEGORIES: PublicCategory[] = [
  {
    id: "fallback-category-facials",
    publicId: "fallback-category-facials",
    name: "Facials",
    slug: "facials",
    parentId: null,
    parentSlug: null,
    description: "Glow, cleanup and skin rituals",
    imageUrl: fallbackServiceImage(0),
  },
  {
    id: "fallback-category-waxing",
    publicId: "fallback-category-waxing",
    name: "Waxing",
    slug: "waxing",
    parentId: null,
    parentSlug: null,
    description: "Hygienic at-home waxing",
    imageUrl: fallbackServiceImage(1),
  },
  {
    id: "fallback-category-mani-pedi",
    publicId: "fallback-category-mani-pedi",
    name: "Mani Pedi",
    slug: "mani-pedi",
    parentId: null,
    parentSlug: null,
    description: "Hands, feet and nail care",
    imageUrl: fallbackServiceImage(2),
  },
  {
    id: "fallback-category-hair",
    publicId: "fallback-category-hair",
    name: "Hair Spa",
    slug: "hair-spa",
    parentId: null,
    parentSlug: null,
    description: "Relaxing hair and scalp care",
    imageUrl: fallbackServiceImage(3),
  },
  {
    id: "fallback-category-makeup",
    publicId: "fallback-category-makeup",
    name: "Makeup",
    slug: "makeup",
    parentId: null,
    parentSlug: null,
    description: "Event-ready beauty prep",
    imageUrl: fallbackServiceImage(4),
  },
  {
    id: "fallback-category-body-care",
    publicId: "fallback-category-body-care",
    name: "Body Care",
    slug: "body-care",
    parentId: null,
    parentSlug: null,
    description: "Body cleanup and polishing",
    imageUrl: fallbackServiceImage(5),
  },
];

function fallbackMedia(
  id: string,
  url: string,
  altText: string,
): PublicMediaImage {
  return {
    id,
    url,
    altText,
  };
}

type FallbackPublicService = Omit<PublicService, "tiers">;

const FALLBACK_SERVICES: FallbackPublicService[] = [
  {
    id: "fallback-service-gold-facial",
    publicId: "fallback-service-gold-facial",
    categoryId: "fallback-category-facials",
    categorySlug: "facials",
    categoryName: "Facials",
    name: "Signature Gold Facial",
    slug: "signature-gold-facial",
    shortDescription:
      "A glow-focused facial with cleansing, massage and premium finishing care.",
    fullDescription:
      "A doorstep facial ritual designed for visible freshness, calm skin and a salon-grade finish at home.",
    durationMinutes: 75,
    pricePaise: 119900,
    compareAtPricePaise: 159900,
    gstRateBps: 1800,
    dealEnabled: true,
    dealPricePaise: 99900,
    dealStartsAt: FALLBACK_DEAL_STARTS_AT,
    dealEndsAt: FALLBACK_DEAL_ENDS_AT,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-gold-facial",
      fallbackServiceImage(0),
      "Gold facial service",
    ),
    galleryImages: [],
    inclusions: ["Deep cleansing", "Glow massage", "Single-use hygiene kit"],
    exclusions: [],
  },
  {
    id: "fallback-service-korean-glass-glow",
    publicId: "fallback-service-korean-glass-glow",
    categoryId: "fallback-category-facials",
    categorySlug: "facials",
    categoryName: "Facials",
    name: "Korean Glass Glow Facial",
    slug: "korean-glass-glow-facial",
    shortDescription:
      "Layered cleansing, massage and mask care for a polished glow.",
    fullDescription:
      "A premium glow facial with skin prep, massage, targeted mask and finishing hydration.",
    durationMinutes: 80,
    pricePaise: 169900,
    compareAtPricePaise: 229900,
    gstRateBps: 1800,
    dealEnabled: true,
    dealPricePaise: 139900,
    dealStartsAt: FALLBACK_DEAL_STARTS_AT,
    dealEndsAt: FALLBACK_DEAL_ENDS_AT,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-korean-glass-glow",
      fallbackServiceImage(0),
      "Korean glass glow facial",
    ),
    galleryImages: [],
    inclusions: ["Skin analysis", "Hydrating mask", "Glow serum finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-hydra-clean-facial",
    publicId: "fallback-service-hydra-clean-facial",
    categoryId: "fallback-category-facials",
    categorySlug: "facials",
    categoryName: "Facials",
    name: "Hydra Clean Facial",
    slug: "hydra-clean-facial",
    shortDescription: "Deep clean facial care for refreshed, hydrated skin.",
    fullDescription:
      "A comfort-led facial session with cleansing, exfoliation, hydration mask and after-care.",
    durationMinutes: 65,
    pricePaise: 139900,
    compareAtPricePaise: 179900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-hydra-clean-facial",
      fallbackServiceImage(0),
      "Hydra clean facial",
    ),
    galleryImages: [],
    inclusions: ["Deep clean", "Hydration mask", "After-care finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-waxing-essentials",
    publicId: "fallback-service-waxing-essentials",
    categoryId: "fallback-category-waxing",
    categorySlug: "waxing",
    categoryName: "Waxing",
    name: "Waxing Essentials",
    slug: "waxing-essentials",
    shortDescription:
      "Smooth finish for arms, underarms and clean-up areas with trained professionals.",
    fullDescription:
      "A practical at-home waxing session with clear pricing and hygienic setup.",
    durationMinutes: 60,
    pricePaise: 89900,
    compareAtPricePaise: 119900,
    gstRateBps: 1800,
    dealEnabled: true,
    dealPricePaise: 79900,
    dealStartsAt: FALLBACK_DEAL_STARTS_AT,
    dealEndsAt: FALLBACK_DEAL_ENDS_AT,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-waxing",
      fallbackServiceImage(1),
      "Waxing essentials service",
    ),
    galleryImages: [],
    inclusions: ["Pre-service skin prep", "Premium wax", "After-care finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-rica-arms-underarms",
    publicId: "fallback-service-rica-arms-underarms",
    categoryId: "fallback-category-waxing",
    categorySlug: "waxing",
    categoryName: "Waxing",
    name: "Rica Arms and Underarms",
    slug: "rica-arms-underarms",
    shortDescription:
      "Comfortable waxing for arms and underarms with premium wax.",
    fullDescription:
      "A focused Rica waxing service with hygiene-first prep and soothing post-wax care.",
    durationMinutes: 45,
    pricePaise: 69900,
    compareAtPricePaise: 99900,
    gstRateBps: 1800,
    featured: false,
    mainImage: fallbackMedia(
      "fallback-media-rica-arms-underarms",
      fallbackServiceImage(1),
      "Rica arms and underarms waxing",
    ),
    galleryImages: [],
    inclusions: ["Rica wax", "Disposable spatulas", "Soothing finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-full-body-waxing",
    publicId: "fallback-service-full-body-waxing",
    categoryId: "fallback-category-waxing",
    categorySlug: "waxing",
    categoryName: "Waxing",
    name: "Full Body Waxing",
    slug: "full-body-waxing",
    shortDescription: "Full body waxing with clean setup and post-care finish.",
    fullDescription:
      "A complete waxing package for smooth skin with trained professionals and single-use essentials.",
    durationMinutes: 110,
    pricePaise: 199900,
    compareAtPricePaise: 259900,
    gstRateBps: 1800,
    dealEnabled: true,
    dealPricePaise: 169900,
    dealStartsAt: FALLBACK_DEAL_STARTS_AT,
    dealEndsAt: FALLBACK_DEAL_ENDS_AT,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-full-body-waxing",
      fallbackServiceImage(1),
      "Full body waxing service",
    ),
    galleryImages: [],
    inclusions: ["Full body coverage", "Premium wax", "Post-wax care"],
    exclusions: [],
  },
  {
    id: "fallback-service-mani-pedi",
    publicId: "fallback-service-mani-pedi",
    categoryId: "fallback-category-mani-pedi",
    categorySlug: "mani-pedi",
    categoryName: "Mani Pedi",
    name: "Manicure & Pedicure Ritual",
    slug: "manicure-pedicure-ritual",
    shortDescription:
      "Hand and foot care with soak, shaping, exfoliation and relaxing massage.",
    fullDescription:
      "A complete mani-pedi ritual for clean, polished hands and feet without visiting a salon.",
    durationMinutes: 90,
    pricePaise: 149900,
    compareAtPricePaise: 199900,
    gstRateBps: 1800,
    dealEnabled: true,
    dealPricePaise: 129900,
    dealStartsAt: FALLBACK_DEAL_STARTS_AT,
    dealEndsAt: FALLBACK_DEAL_ENDS_AT,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-mani-pedi",
      fallbackServiceImage(2),
      "Manicure and pedicure service",
    ),
    galleryImages: [],
    inclusions: ["Nail shaping", "Scrub and massage", "Moisture lock"],
    exclusions: [],
  },
  {
    id: "fallback-service-express-manicure",
    publicId: "fallback-service-express-manicure",
    categoryId: "fallback-category-mani-pedi",
    categorySlug: "mani-pedi",
    categoryName: "Mani Pedi",
    name: "Express Manicure",
    slug: "express-manicure",
    shortDescription: "Quick hand care with shaping, buffing and moisturising.",
    fullDescription:
      "A quick manicure for neat nails and refreshed hands before work, travel or events.",
    durationMinutes: 40,
    pricePaise: 49900,
    compareAtPricePaise: 69900,
    gstRateBps: 1800,
    featured: false,
    mainImage: fallbackMedia(
      "fallback-media-express-manicure",
      fallbackServiceImage(2),
      "Express manicure service",
    ),
    galleryImages: [],
    inclusions: ["Nail shaping", "Cuticle care", "Hand moisturiser"],
    exclusions: [],
  },
  {
    id: "fallback-service-spa-pedicure",
    publicId: "fallback-service-spa-pedicure",
    categoryId: "fallback-category-mani-pedi",
    categorySlug: "mani-pedi",
    categoryName: "Mani Pedi",
    name: "Spa Pedicure",
    slug: "spa-pedicure",
    shortDescription: "Foot soak, scrub and massage for refreshed feet.",
    fullDescription:
      "A relaxing pedicure with foot soak, exfoliation, nail shaping and massage.",
    durationMinutes: 50,
    pricePaise: 89900,
    compareAtPricePaise: 119900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-spa-pedicure",
      fallbackServiceImage(2),
      "Spa pedicure service",
    ),
    galleryImages: [],
    inclusions: ["Foot soak", "Heel scrub", "Relaxing massage"],
    exclusions: [],
  },
  {
    id: "fallback-service-hair-spa",
    publicId: "fallback-service-hair-spa",
    categoryId: "fallback-category-hair",
    categorySlug: "hair-spa",
    categoryName: "Hair Spa",
    name: "Relaxing Hair Spa",
    slug: "relaxing-hair-spa",
    shortDescription:
      "A scalp and hair-care session designed for softness, shine and relaxation.",
    fullDescription:
      "A home hair-spa service with scalp massage, conditioning and a neat service setup.",
    durationMinutes: 70,
    pricePaise: 129900,
    compareAtPricePaise: 169900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-hair-spa",
      fallbackServiceImage(3),
      "Hair spa service",
    ),
    galleryImages: [],
    inclusions: ["Scalp massage", "Conditioning mask", "Shine finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-anti-frizz-hair-spa",
    publicId: "fallback-service-anti-frizz-hair-spa",
    categoryId: "fallback-category-hair",
    categorySlug: "hair-spa",
    categoryName: "Hair Spa",
    name: "Anti-Frizz Hair Spa",
    slug: "anti-frizz-hair-spa",
    shortDescription: "Conditioning care for smoother, softer hair at home.",
    fullDescription:
      "A smoothing hair spa with scalp massage, anti-frizz mask and careful rinse support.",
    durationMinutes: 85,
    pricePaise: 169900,
    compareAtPricePaise: 229900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-anti-frizz-hair-spa",
      fallbackServiceImage(3),
      "Anti-frizz hair spa",
    ),
    galleryImages: [],
    inclusions: ["Anti-frizz mask", "Scalp massage", "Smooth finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-head-massage-hair-wash",
    publicId: "fallback-service-head-massage-hair-wash",
    categoryId: "fallback-category-hair",
    categorySlug: "hair-spa",
    categoryName: "Hair Spa",
    name: "Head Massage and Hair Wash",
    slug: "head-massage-hair-wash",
    shortDescription: "A calming oil massage with hair wash support.",
    fullDescription:
      "A compact relaxation service with head massage, wash support and light conditioning.",
    durationMinutes: 50,
    pricePaise: 69900,
    compareAtPricePaise: 99900,
    gstRateBps: 1800,
    featured: false,
    mainImage: fallbackMedia(
      "fallback-media-head-massage-hair-wash",
      fallbackServiceImage(3),
      "Head massage and hair wash",
    ),
    galleryImages: [],
    inclusions: ["Oil massage", "Hair wash", "Light conditioning"],
    exclusions: [],
  },
  {
    id: "fallback-service-body-polish",
    publicId: "fallback-service-body-polish",
    categoryId: "fallback-category-body-care",
    categorySlug: "body-care",
    categoryName: "Body Care",
    name: "Body Polishing",
    slug: "body-polishing",
    shortDescription:
      "Body exfoliation and nourishing finish for refreshed skin.",
    fullDescription:
      "A premium body-care session with exfoliation, massage and hydration care.",
    durationMinutes: 100,
    pricePaise: 229900,
    compareAtPricePaise: 289900,
    gstRateBps: 1800,
    dealEnabled: true,
    dealPricePaise: 199900,
    dealStartsAt: FALLBACK_DEAL_STARTS_AT,
    dealEndsAt: FALLBACK_DEAL_ENDS_AT,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-body-polish",
      fallbackServiceImage(5),
      "Body polishing service",
    ),
    galleryImages: [],
    inclusions: ["Gentle exfoliation", "Hydration care", "Clean setup"],
    exclusions: [],
  },
  {
    id: "fallback-service-back-shoulder-massage",
    publicId: "fallback-service-back-shoulder-massage",
    categoryId: "fallback-category-body-care",
    categorySlug: "body-care",
    categoryName: "Body Care",
    name: "Back and Shoulder Massage",
    slug: "back-shoulder-massage",
    shortDescription: "Focused massage care for back, neck and shoulders.",
    fullDescription:
      "A targeted relaxation session for back and shoulder stiffness with a clean at-home setup.",
    durationMinutes: 55,
    pricePaise: 99900,
    compareAtPricePaise: 139900,
    gstRateBps: 1800,
    featured: false,
    mainImage: fallbackMedia(
      "fallback-media-back-shoulder-massage",
      fallbackServiceImage(5),
      "Back and shoulder massage",
    ),
    galleryImages: [],
    inclusions: ["Back massage", "Shoulder relief", "Warm towel finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-de-tan-body-cleanup",
    publicId: "fallback-service-de-tan-body-cleanup",
    categoryId: "fallback-category-body-care",
    categorySlug: "body-care",
    categoryName: "Body Care",
    name: "De-Tan Body Cleanup",
    slug: "de-tan-body-cleanup",
    shortDescription: "Clean-up care for dullness with scrub and pack finish.",
    fullDescription:
      "A de-tan cleanup service with gentle exfoliation, body pack and hydration care.",
    durationMinutes: 80,
    pricePaise: 129900,
    compareAtPricePaise: 179900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-de-tan-body-cleanup",
      fallbackServiceImage(5),
      "De-tan body cleanup",
    ),
    galleryImages: [],
    inclusions: ["De-tan scrub", "Body pack", "Hydration care"],
    exclusions: [],
  },
  {
    id: "fallback-service-bridal-glow",
    publicId: "fallback-service-bridal-glow",
    categoryId: "fallback-category-makeup",
    categorySlug: "makeup",
    categoryName: "Makeup",
    name: "Bridal Glow Prep",
    slug: "bridal-glow-prep",
    shortDescription:
      "Pre-event glow, cleanup and soft glam preparation for special occasions.",
    fullDescription:
      "A premium beauty preparation service for pre-bridal, party and event-ready looks.",
    durationMinutes: 120,
    pricePaise: 249900,
    compareAtPricePaise: 319900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-bridal",
      fallbackServiceImage(4),
      "Bridal glow service",
    ),
    galleryImages: [],
    inclusions: ["Skin prep", "Soft glam finish", "Look consultation"],
    exclusions: [],
  },
  {
    id: "fallback-service-party-makeup",
    publicId: "fallback-service-party-makeup",
    categoryId: "fallback-category-makeup",
    categorySlug: "makeup",
    categoryName: "Makeup",
    name: "Party Makeup",
    slug: "party-makeup",
    shortDescription:
      "Camera-ready event makeup with neat skin prep and a long-wear finish.",
    fullDescription:
      "An at-home party makeup session for dinners, family events and celebrations.",
    durationMinutes: 95,
    pricePaise: 299900,
    compareAtPricePaise: 389900,
    gstRateBps: 1800,
    featured: true,
    mainImage: fallbackMedia(
      "fallback-media-party-makeup",
      fallbackServiceImage(4),
      "Party makeup service",
    ),
    galleryImages: [],
    inclusions: ["Skin prep", "Eye detail", "Long-wear finish"],
    exclusions: [],
  },
  {
    id: "fallback-service-saree-draping",
    publicId: "fallback-service-saree-draping",
    categoryId: "fallback-category-makeup",
    categorySlug: "makeup",
    categoryName: "Makeup",
    name: "Saree Draping and Hair Styling",
    slug: "saree-draping-hair-styling",
    shortDescription: "Draping and hair styling support for special occasions.",
    fullDescription:
      "A finishing service for saree draping, basic hair styling and event-ready polish.",
    durationMinutes: 70,
    pricePaise: 129900,
    compareAtPricePaise: 179900,
    gstRateBps: 1800,
    featured: false,
    mainImage: fallbackMedia(
      "fallback-media-saree-draping",
      fallbackServiceImage(4),
      "Saree draping and hair styling",
    ),
    galleryImages: [],
    inclusions: ["Saree draping", "Hair setting", "Final styling"],
    exclusions: [],
  },
];

const FALLBACK_CATALOGUE: CataloguePayload = {
  business: {
    name: BUSINESS_NAME,
    city: "Lucknow",
    area: "Indira Nagar",
    addressLine: BUSINESS_ADDRESS,
    supportEmail: BUSINESS_SUPPORT_EMAIL,
    websiteUrl: BUSINESS_WEBSITE_URL,
    supportPhone: "+918112868347",
    heroImageUrl: FALLBACK_HERO_IMAGE_URL,
    fallbackServiceImages: FALLBACK_SERVICE_IMAGE_URLS,
    razorpayConfigured: false,
    otpProviderConfigured: false,
    developmentMode: true,
  },
  categories: FALLBACK_CATEGORIES,
  homepage: {
    hero: {
      eyebrow: "Salon at home - Lucknow",
      title: "Beauty & spa,",
      titleAccent: "delivered at home",
      subtitle:
        "From facials and waxing to manicures, hair spa, and body care - we bring the full salon to you. Trusted professionals, clear prices, and visits across Lucknow.",
      primaryCtaLabel: "Book Appointment",
      secondaryCtaLabel: "Call Now",
    },
    offers: {
      eyebrow: "Popular picks",
      title: "Services people book most.",
      subtitle:
        "Compare compact service cards, clear pricing and duration before adding to cart.",
    },
    categories: {
      eyebrow: "At-home menu",
      title: "Choose a category",
      subtitle:
        "Browse by beauty need, compare clear prices and continue to live slot selection.",
    },
    highlights: {
      eyebrow: "Service preview",
      title: "See the setup before you book.",
      subtitle:
        "Service imagery helps customers understand the at-home care experience before checkout.",
      cards: [
        {
          id: "fallback-highlight-facial",
          title: "Glow Facial",
          subtitle: "Facial results highlight",
          label: "Tap to explore",
          mediaUrl: fallbackServiceImage(0),
          status: "PUBLISHED",
          sortOrder: 1,
        },
        {
          id: "fallback-highlight-mani-pedi",
          title: "Mani Pedi",
          subtitle: "Hand and foot care",
          label: "Tap to explore",
          mediaUrl: fallbackServiceImage(2),
          status: "PUBLISHED",
          sortOrder: 2,
        },
        {
          id: "fallback-highlight-hair-spa",
          title: "Hair Spa",
          subtitle: "Relaxed home care",
          label: "Tap to explore",
          mediaUrl: fallbackServiceImage(3),
          status: "PUBLISHED",
          sortOrder: 3,
        },
      ],
    },
    services: {
      eyebrow: "Bookable menu",
      title: "Book services at home",
      subtitle:
        "Add services to cart, select a slot, verify by mobile OTP and complete payment.",
    },
    serviceSections: [],
    trust: {
      eyebrow: "Why Replica",
      title: "Designed for a premium doorstep salon experience.",
      subtitle: "Fair pricing, easy booking, premium care.",
    },
  },
  services: FALLBACK_SERVICES.map((service) => ({
    ...service,
    tiers: [],
  })),
  featuredServices: FALLBACK_SERVICES.map((service) => ({
    ...service,
    tiers: [],
  })),
  packages: [],
};

const FALLBACK_PUBLIC_REVIEWS: PublicReview[] = [
  {
    id: "fallback-review-diksha",
    customerName: "Diksha",
    rating: 5,
    comment: "Clean setup and a very relaxing facial experience.",
    highlights: [
      "The professional arrived on time.",
      "The service setup was clean and organized.",
      "I am satisfied with the services.",
    ],
    serviceNames: ["Signature Gold Facial"],
    createdAt: "2026-08-31T10:00:00.000Z",
  },
  {
    id: "fallback-review-tisha",
    customerName: "Tisha Mittal",
    rating: 5,
    comment: "The mani pedi was calm, neat and professionally done.",
    highlights: [
      "The professional groomed properly.",
      "The professional used disposable items before the service started.",
      "The professional cleaned properly after the service.",
    ],
    serviceNames: ["Manicure & Pedicure Ritual"],
    createdAt: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "fallback-review-kanishka",
    customerName: "Kanishka Maan",
    rating: 5,
    comment: "Very good service and clear communication before arrival.",
    highlights: [
      "The professional confirmed availability before coming.",
      "The professional's behavior was exemplary.",
      "The professional was excellent in all services.",
    ],
    serviceNames: ["Waxing Essentials"],
    createdAt: "2026-08-29T10:00:00.000Z",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getApiError(payload: unknown): ApiErrorShape | null {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return null;
  }

  const { code, message, requestId } = payload.error;

  if (
    typeof code !== "string" ||
    typeof message !== "string" ||
    typeof requestId !== "string"
  ) {
    return null;
  }

  return { code, message, requestId };
}

function getCustomerApiBase(): string {
  if (typeof window === "undefined") {
    return CONFIGURED_API_BASE;
  }

  try {
    const apiUrl = new URL(CONFIGURED_API_BASE);
    const browserHost = window.location.hostname;
    const loopbackHosts = new Set(["localhost", "127.0.0.1"]);

    if (
      loopbackHosts.has(browserHost) &&
      loopbackHosts.has(apiUrl.hostname) &&
      apiUrl.protocol === window.location.protocol
    ) {
      apiUrl.hostname = browserHost;
      return apiUrl.toString().replace(/\/$/, "");
    }
  } catch {
    return CONFIGURED_API_BASE;
  }

  return CONFIGURED_API_BASE;
}

async function apiFetch<TData>(
  path: string,
  init?: RequestInit,
): Promise<TData> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getCustomerApiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiError = getApiError(payload);
    throw new ApiRequestError(
      apiError?.message ?? "The request failed.",
      response.status,
      apiError?.code ?? "REQUEST_FAILED",
      apiError?.requestId ?? null,
    );
  }

  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiRequestError(
      "The API response was not recognized.",
      response.status,
      "BAD_RESPONSE",
      null,
    );
  }

  return payload.data as TData;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(paise / 100);
}

function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: INDIA_TIME_ZONE,
  }).format(new Date(iso));
}

function formatBookingDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: INDIA_TIME_ZONE,
  }).format(new Date(iso));
}

function indiaDateKey(offsetDays: number): string {
  const now = new Date();
  const indiaNow = new Date(now.getTime() + 330 * 60 * 1000);
  indiaNow.setUTCDate(indiaNow.getUTCDate() + offsetDays);
  const year = indiaNow.getUTCFullYear();
  const month = String(indiaNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(indiaNow.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: INDIA_TIME_ZONE,
    weekday: "short",
  }).format(new Date(`${dateKey}T00:00:00+05:30`));
}

function safeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): CartItem[] => {
    if (!isRecord(item)) {
      return [];
    }

    if (
      typeof item.serviceId === "string" &&
      typeof item.slug === "string" &&
      typeof item.name === "string" &&
      typeof item.pricePaise === "number" &&
      typeof item.durationMinutes === "number" &&
      typeof item.imageUrl === "string" &&
      typeof item.quantity === "number"
    ) {
      return [
        {
          serviceId: item.serviceId,
          serviceTierId:
            typeof item.serviceTierId === "string" ? item.serviceTierId : null,
          serviceTierType:
            item.serviceTierType === "PREMIUM" ||
            item.serviceTierType === "LUXURY"
              ? item.serviceTierType
              : null,
          packageId: typeof item.packageId === "string" ? item.packageId : null,
          packageName:
            typeof item.packageName === "string" ? item.packageName : null,
          slug: item.slug,
          name: item.name,
          tierName: typeof item.tierName === "string" ? item.tierName : null,
          pricePaise: item.pricePaise,
          compareAtPricePaise:
            typeof item.compareAtPricePaise === "number"
              ? item.compareAtPricePaise
              : null,
          durationMinutes: item.durationMinutes,
          imageUrl: item.imageUrl,
          quantity: Math.max(
            typeof item.minQuantity === "number" ? item.minQuantity : 1,
            item.quantity,
          ),
          minQuantity:
            typeof item.minQuantity === "number"
              ? Math.max(1, item.minQuantity)
              : 1,
        },
      ];
    }

    return [];
  });
}

function cartItemKey(
  item: Pick<
    CartItem,
    "packageId" | "serviceId" | "serviceTierId" | "serviceTierType"
  >,
): string {
  return [
    item.packageId ?? "single",
    item.serviceId,
    item.serviceTierId ?? item.serviceTierType ?? "base",
  ].join(":");
}

function fallbackImage(
  catalogue: CataloguePayload | null,
  index: number,
): string {
  return (
    catalogue?.business.fallbackServiceImages[index] ??
    catalogue?.business.heroImageUrl ??
    "https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg?auto=compress&cs=tinysrgb&w=1200"
  );
}

function serviceImage(
  service: PublicService,
  catalogue: CataloguePayload | null,
  index: number,
): string {
  return service.mainImage?.url ?? fallbackImage(catalogue, index);
}

function totalCartPaise(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + item.pricePaise * item.quantity,
    0,
  );
}

function totalCartDuration(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + item.durationMinutes * item.quantity,
    0,
  );
}

function dateValueMs(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function serviceHasActiveDeal(
  service: PublicService,
  nowMs = Date.now(),
): boolean {
  const startsAtMs = dateValueMs(service.dealStartsAt);
  const endsAtMs = dateValueMs(service.dealEndsAt);

  if (!service.dealEnabled || startsAtMs === null || endsAtMs === null) {
    return false;
  }

  return startsAtMs <= nowMs && endsAtMs > nowMs;
}

function serviceEffectivePricePaise(
  service: PublicService,
  nowMs = Date.now(),
): number {
  if (!serviceHasActiveDeal(service, nowMs)) {
    return service.pricePaise;
  }

  return service.dealPricePaise ?? service.pricePaise;
}

function serviceStrikePricePaise(
  service: PublicService,
  nowMs = Date.now(),
): number | null {
  const effectivePrice = serviceEffectivePricePaise(service, nowMs);
  const candidates = [service.compareAtPricePaise, service.pricePaise].filter(
    (value): value is number =>
      typeof value === "number" && value > effectivePrice,
  );

  return candidates.length > 0 ? Math.max(...candidates) : null;
}

function serviceSavingsPaise(
  service: PublicService,
  nowMs = Date.now(),
): number | null {
  const strikePrice = serviceStrikePricePaise(service, nowMs);

  if (strikePrice !== null) {
    return strikePrice - serviceEffectivePricePaise(service, nowMs);
  }

  return null;
}

function serviceTierOptions(
  service: PublicService,
  nowMs = Date.now(),
): PublicServiceTier[] {
  if (service.tiers.length > 0) {
    return service.tiers;
  }

  const premiumPricePaise = serviceEffectivePricePaise(service, nowMs);
  const premiumCompareAtPricePaise =
    serviceStrikePricePaise(service, nowMs) ?? service.compareAtPricePaise;
  const luxuryPricePaise = Math.round(premiumPricePaise * 1.35);
  const luxuryCompareAtPricePaise = Math.max(
    Math.round((premiumCompareAtPricePaise ?? premiumPricePaise) * 1.35),
    luxuryPricePaise,
  );

  return [
    {
      id: "",
      publicId: `${service.publicId}-premium`,
      tierType: "PREMIUM",
      name: "Premium",
      description: "Core service with professional setup.",
      durationMinutes: service.durationMinutes,
      pricePaise: premiumPricePaise,
      compareAtPricePaise: premiumCompareAtPricePaise,
      productsUsed: service.inclusions.slice(0, 3),
    },
    {
      id: "",
      publicId: `${service.publicId}-luxury`,
      tierType: "LUXURY",
      name: "Luxury",
      description: "Upgraded products and extra finishing time.",
      durationMinutes: service.durationMinutes + 15,
      pricePaise: luxuryPricePaise,
      compareAtPricePaise: luxuryCompareAtPricePaise,
      productsUsed: ["Luxury product kit", ...service.inclusions.slice(0, 2)],
    },
  ];
}

function serviceTierById(
  service: PublicService,
  serviceTierId: string | null,
): PublicServiceTier | null {
  if (!serviceTierId) {
    return null;
  }

  return service.tiers.find((tier) => tier.id === serviceTierId) ?? null;
}

function serviceDiscountPercent(
  service: PublicService,
  nowMs = Date.now(),
): number | null {
  const strikePrice = serviceStrikePricePaise(service, nowMs);

  if (strikePrice === null) {
    return null;
  }

  return Math.max(
    1,
    Math.round(
      ((strikePrice - serviceEffectivePricePaise(service, nowMs)) /
        strikePrice) *
        100,
    ),
  );
}

function serviceExcerpt(service: PublicService): string {
  const source =
    service.shortDescription ??
    service.fullDescription ??
    "Professional salon service delivered at your doorstep.";

  return source
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function servicePriceLabel(service: PublicService, nowMs = Date.now()): string {
  const pricePaise = serviceEffectivePricePaise(service, nowMs);

  if (pricePaise === 0) {
    return "FREE";
  }

  return formatMoney(pricePaise);
}

function serviceStartingPriceLabel(
  service: PublicService,
  nowMs = Date.now(),
): string {
  const prices = serviceTierOptions(service, nowMs).map(
    (tier) => tier.pricePaise,
  );
  const startingPricePaise =
    prices.length > 0
      ? Math.min(...prices)
      : serviceEffectivePricePaise(service, nowMs);

  return `From ${formatMoney(startingPricePaise)}`;
}

function formatDurationShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} mins`;
  }

  if (remainingMinutes === 0) {
    return `${hours.toString().padStart(2, "0")} hr`;
  }

  return `${hours.toString().padStart(2, "0")} hr : ${remainingMinutes} mins`;
}

function normalizeIndianMobileInput(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(2, 12);
  }

  return digits.slice(0, 10);
}

function formatIndianPhoneDisplay(value: string | null): string {
  if (!value) {
    return "";
  }

  const digits = value.replace(/\D/g, "");
  const localNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  if (localNumber.length === 10) {
    return `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
  }

  return value;
}

interface DealCountdownPart {
  label: string;
  value: string;
}

function formatDealCountdown(durationMs: number): DealCountdownPart[] {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hrs", value: String(hours).padStart(2, "0") },
    { label: "Mins", value: String(minutes).padStart(2, "0") },
    { label: "Secs", value: String(seconds).padStart(2, "0") },
  ];
}

function weekdayLabel(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    weekday: "long",
  })
    .format(new Date(timestampMs))
    .toLowerCase();
}

function createIdempotencyKey(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CustomerExperience({
  initialMode = "home",
  serviceSlug,
  categorySlug,
}: CustomerExperienceProps): React.ReactElement {
  const reviewCarouselRef = useRef<HTMLDivElement | null>(null);
  const [catalogue, setCatalogue] = useState<CataloguePayload | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueOffline, setCatalogueOffline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("phone");
  const [search, setSearch] = useState("");
  const [cataloguePage, setCataloguePage] = useState(1);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<
    string | null
  >(categorySlug ?? null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [selectedDate, setSelectedDate] = useState(indiaDateKey(1));
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(
    null,
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>(
    FALLBACK_PUBLIC_REVIEWS,
  );
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({
    bookingId: null,
    rating: 5,
    highlights: [],
    comment: "",
  });
  const [reviewSubmittingBookingId, setReviewSubmittingBookingId] = useState<
    string | null
  >(null);
  const [authPhone, setAuthPhone] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [authProfileForm, setAuthProfileForm] = useState<{
    dateOfBirth: string;
    email: string;
    gender: AuthGender;
    name: string;
  }>({
    dateOfBirth: "",
    email: "",
    gender: "FEMALE",
    name: "",
  });
  const [addressForm, setAddressForm] = useState<AddressFormState>(
    DEFAULT_CUSTOMER_ADDRESS_FORM,
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [addressModalStep, setAddressModalStep] =
    useState<AddressModalStep | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [currentBooking, setCurrentBooking] = useState<CustomerBooking | null>(
    null,
  );
  const [paymentChoice, setPaymentChoice] = useState<
    "RAZORPAY" | "PAY_AFTER_SERVICE"
  >("RAZORPAY");
  const [developmentPayment, setDevelopmentPayment] =
    useState<PaymentCheckoutPayload | null>(null);
  const [successBooking, setSuccessBooking] = useState<CustomerBooking | null>(
    null,
  );
  const [tierSelection, setTierSelection] = useState<TierSelectionState | null>(
    null,
  );
  const [packageEditor, setPackageEditor] = useState<PackageEditorState | null>(
    null,
  );
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dealNowMs, setDealNowMs] = useState(0);
  const resolvedCatalogue =
    catalogue &&
    catalogue.categories.length > 0 &&
    catalogue.services.length > 0
      ? catalogue
      : FALLBACK_CATALOGUE;

  const dateOptions = useMemo(
    () => Array.from({ length: 7 }, (_value, index) => indiaDateKey(index + 1)),
    [],
  );
  const cartAvailabilityKey = useMemo(
    () =>
      cartItems
        .map((item) =>
          [
            item.serviceId,
            item.serviceTierId ?? "",
            item.packageId ?? "",
            item.quantity,
          ].join(":"),
        )
        .join("|"),
    [cartItems],
  );
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );
  const selectedService = useMemo(() => {
    if (!serviceSlug) {
      return null;
    }

    return (
      resolvedCatalogue.services.find(
        (service) => service.slug === serviceSlug,
      ) ?? null
    );
  }, [resolvedCatalogue, serviceSlug]);
  const activeCategory = useMemo(() => {
    if (!selectedCategorySlug) {
      return null;
    }

    return (
      resolvedCatalogue.categories.find(
        (category) => category.slug === selectedCategorySlug,
      ) ?? null
    );
  }, [resolvedCatalogue, selectedCategorySlug]);
  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return resolvedCatalogue.services.filter((service) => {
      const matchesCategory = selectedCategorySlug
        ? service.categorySlug === selectedCategorySlug ||
          resolvedCatalogue.categories.find(
            (category) => category.id === service.categoryId,
          )?.parentSlug === selectedCategorySlug
        : true;
      const matchesSearch = normalizedSearch
        ? [service.name, service.shortDescription, service.categoryName]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch))
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [resolvedCatalogue, search, selectedCategorySlug]);
  const rootCategories = useMemo(
    () => resolvedCatalogue.categories.filter((category) => !category.parentId),
    [resolvedCatalogue],
  );
  const serviceById = useMemo(
    () =>
      new Map(
        resolvedCatalogue.services.map((service) => [service.id, service]),
      ),
    [resolvedCatalogue],
  );
  const packagesByCategorySlug = useMemo(() => {
    const grouped = new Map<string, PublicServicePackage[]>();

    for (const servicePackage of resolvedCatalogue.packages) {
      const packages = grouped.get(servicePackage.categorySlug) ?? [];
      packages.push(servicePackage);
      grouped.set(servicePackage.categorySlug, packages);
    }

    return grouped;
  }, [resolvedCatalogue]);
  const homepageServiceSections = useMemo<
    HomepageServiceSectionViewModel[]
  >(() => {
    const categoryById = new Map<string, PublicCategory>();

    for (const category of resolvedCatalogue.categories) {
      categoryById.set(category.id, category);
    }

    return rootCategories
      .map((category) => {
        const services = resolvedCatalogue.services
          .filter((service) => {
            if (
              service.categoryId === category.id ||
              service.categorySlug === category.slug
            ) {
              return true;
            }

            return (
              categoryById.get(service.categoryId)?.parentSlug === category.slug
            );
          })
          .slice(0, 3);

        if (services.length === 0) {
          return null;
        }

        return {
          id: category.id,
          title: category.name,
          categorySlug: category.slug,
          services,
        };
      })
      .filter(
        (section): section is HomepageServiceSectionViewModel =>
          section !== null,
      );
  }, [resolvedCatalogue, rootCategories]);
  const cartTotalPaise = totalCartPaise(cartItems);
  const cartDuration = totalCartDuration(cartItems);
  const isServiceDetailMode = Boolean(serviceSlug);
  const isCheckoutFlowPage = initialMode === "checkout";
  const isCartPage = initialMode === "cart";
  const isAuthPage = initialMode === "login" || initialMode === "register";

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("search");

    if (query) {
      setSearch(query);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");

    if (authParam !== "login" && authParam !== "register") {
      return;
    }

    setAuthStep("phone");
    setOtpPhone(null);
    setAuthOtp("");
    setAuthModalOpen(true);
    params.delete("auth");

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${
      nextQuery ? `?${nextQuery}` : ""
    }${window.location.hash}`;

    window.history.replaceState(null, "", nextUrl);
  }, []);

  useEffect(() => {
    if (authModalOpen && user && authStep === "phone" && !otpPhone) {
      setAuthStep("complete");
    }
  }, [authModalOpen, authStep, otpPhone, user]);

  useEffect(() => {
    const timeoutIds: number[] = [];

    if (notice) {
      const currentNotice = notice;
      timeoutIds.push(
        window.setTimeout(() => {
          setNotice((value) => (value === currentNotice ? null : value));
        }, 6000),
      );
    }

    if (error) {
      const currentError = error;
      timeoutIds.push(
        window.setTimeout(() => {
          setError((value) => (value === currentError ? null : value));
        }, 6000),
      );
    }

    return () => {
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [error, notice]);

  useEffect(() => {
    setCataloguePage(1);
  }, [search, selectedCategorySlug]);

  useEffect(() => {
    let mounted = true;

    async function loadCatalogue(): Promise<void> {
      try {
        setCatalogueLoading(true);
        const query = new URLSearchParams();

        if (categorySlug) {
          query.set("categorySlug", categorySlug);
        }

        const payload = await apiFetch<CataloguePayload>(
          `/customer/catalogue${query.size ? `?${query.toString()}` : ""}`,
        );
        const hasPublicCatalogue =
          payload.categories.length > 0 && payload.services.length > 0;

        if (mounted) {
          setCatalogue(hasPublicCatalogue ? payload : FALLBACK_CATALOGUE);
          setCatalogueOffline(!hasPublicCatalogue);
        }
      } catch {
        if (mounted) {
          setCatalogue(FALLBACK_CATALOGUE);
          setCatalogueOffline(true);
          setError(null);
        }
      } finally {
        if (mounted) {
          setCatalogueLoading(false);
        }
      }
    }

    void loadCatalogue();

    return () => {
      mounted = false;
    };
  }, [categorySlug]);

  useEffect(() => {
    setSelectedCategorySlug(categorySlug ?? null);
  }, [categorySlug]);

  useEffect(() => {
    let mounted = true;

    async function loadPublicReviews(): Promise<void> {
      try {
        const payload =
          await apiFetch<PublicReviewsPayload>("/customer/reviews");

        if (mounted) {
          setPublicReviews(
            payload.reviews.length > 0
              ? payload.reviews
              : FALLBACK_PUBLIC_REVIEWS,
          );
        }
      } catch {
        if (mounted) {
          setPublicReviews(FALLBACK_PUBLIC_REVIEWS);
        }
      }
    }

    void loadPublicReviews();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setReviewSlideIndex(0);
  }, [publicReviews.length]);

  useEffect(() => {
    if (publicReviews.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setReviewSlideIndex((current) => (current + 1) % publicReviews.length);
    }, 4200);

    return () => {
      window.clearInterval(timer);
    };
  }, [publicReviews.length]);

  useEffect(() => {
    const viewport = reviewCarouselRef.current;
    const activeCard = viewport?.querySelector<HTMLElement>(
      `[data-review-index="${reviewSlideIndex}"]`,
    );

    if (!viewport || !activeCard) {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const activeCardRect = activeCard.getBoundingClientRect();
    const nextScrollLeft =
      viewport.scrollLeft + activeCardRect.left - viewportRect.left;

    viewport.scrollTo({
      left: Math.max(0, nextScrollLeft),
      behavior: "smooth",
    });
  }, [reviewSlideIndex]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);

      if (stored) {
        setCartItems(safeCartItems(JSON.parse(stored)));
      }
    } catch {
      setCartItems([]);
    } finally {
      setCartHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartHydrated, cartItems]);

  useEffect(() => {
    const storedAddressId = window.localStorage.getItem(
      SELECTED_ADDRESS_STORAGE_KEY,
    );

    if (storedAddressId) {
      setSelectedAddressId(storedAddressId);
    }
  }, []);

  useEffect(() => {
    if (!selectedAddressId) {
      window.localStorage.removeItem(SELECTED_ADDRESS_STORAGE_KEY);
      return;
    }

    if (user) {
      window.localStorage.setItem(
        SELECTED_ADDRESS_STORAGE_KEY,
        selectedAddressId,
      );
    }
  }, [selectedAddressId, user]);

  useEffect(() => {
    if (!user) {
      setSelectedAddressId(null);
      setAddressModalStep(null);
      return;
    }

    if (addresses.length === 0) {
      setSelectedAddressId(null);
      return;
    }

    setSelectedAddressId((current) => {
      const selectedAddressExists =
        current !== null && addresses.some((address) => address.id === current);

      if (selectedAddressExists) {
        return current;
      }

      return (
        addresses.find((address) => address.isDefault)?.id ??
        addresses[0]?.id ??
        null
      );
    });
  }, [addresses, user]);

  useEffect(() => {
    if (
      initialMode !== "checkout" ||
      !cartHydrated ||
      checkoutStep !== "cart" ||
      cartItems.length === 0
    ) {
      return;
    }

    setCheckoutStep("slot");
  }, [cartHydrated, cartItems.length, checkoutStep, initialMode]);

  useEffect(() => {
    void refreshMe(false);
  }, []);

  useEffect(() => {
    setDealNowMs(Date.now());

    const timer = window.setInterval(() => {
      setDealNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setSelectedSlot(null);

    if (!isCheckoutFlowPage || cartItems.length === 0) {
      setAvailability(null);
      return;
    }

    void loadAvailability();
  }, [cartAvailabilityKey, isCheckoutFlowPage, selectedDate]);

  async function refreshMe(showErrors: boolean): Promise<void> {
    try {
      const payload = await apiFetch<CustomerMePayload>("/customer/auth/me");
      setUser(payload.user);
      setAddresses(payload.addresses);
      setBookings(payload.bookings);
    } catch (caughtError) {
      if (showErrors) {
        setError(getErrorMessage(caughtError));
      }
    }
  }

  async function loadAvailability(): Promise<void> {
    const firstCartItem = cartItems[0];

    if (!firstCartItem) {
      return;
    }

    try {
      setAvailabilityLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        serviceId: firstCartItem.serviceId,
        serviceIds: cartItems.map((item) => item.serviceId).join(","),
        items: JSON.stringify(
          cartItems.map((item) => ({
            serviceId: item.serviceId,
            serviceTierId: item.serviceTierId ?? undefined,
            packageId: item.packageId ?? undefined,
            quantity: item.quantity,
          })),
        ),
      });
      const payload = await apiFetch<AvailabilityPayload>(
        `/customer/availability?${params.toString()}`,
      );
      setAvailability(payload);
    } catch (caughtError) {
      setAvailability(null);
      setError(getErrorMessage(caughtError));
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function openTierSelection(
    service: PublicService,
    index: number,
    quickCheckout = false,
  ): void {
    if (catalogueOffline) {
      setError(
        "Live booking is temporarily unavailable. Please call us or try again shortly.",
      );
      return;
    }

    setTierSelection({ service, index, quickCheckout });
    setError(null);
  }

  function mergeCartItems(
    current: CartItem[],
    nextItems: CartItem[],
  ): CartItem[] {
    return nextItems.reduce((items, nextItem) => {
      const nextKey = cartItemKey(nextItem);
      const existing = items.find((item) => cartItemKey(item) === nextKey);

      if (existing) {
        return items.map((item) =>
          cartItemKey(item) === nextKey
            ? { ...item, quantity: item.quantity + nextItem.quantity }
            : item,
        );
      }

      return [...items, nextItem];
    }, current);
  }

  function addCartItems(nextItems: CartItem[], quickCheckout = false): void {
    setCartItems((current) => mergeCartItems(current, nextItems));
    setCheckoutStep(quickCheckout ? "slot" : "cart");
    setNotice(
      nextItems.length === 1
        ? `${nextItems[0]?.name ?? "Service"} added to cart.`
        : `${nextItems.length} package services added to cart.`,
    );

    if (quickCheckout && !isCheckoutFlowPage) {
      window.location.assign("/checkout");
    }
  }

  function addCartItem(nextItem: CartItem, quickCheckout = false): void {
    addCartItems([nextItem], quickCheckout);
  }

  function addServiceTierToCart(
    service: PublicService,
    tier: PublicServiceTier,
    index: number,
    quickCheckout = false,
  ): void {
    addCartItem(
      {
        serviceId: service.id,
        serviceTierId: tier.id || null,
        serviceTierType: tier.tierType,
        packageId: null,
        packageName: null,
        slug: service.slug,
        name: service.name,
        tierName: tier.name,
        pricePaise: tier.pricePaise,
        compareAtPricePaise: tier.compareAtPricePaise,
        durationMinutes: tier.durationMinutes,
        imageUrl: serviceImage(service, resolvedCatalogue, index),
        quantity: 1,
        minQuantity: 1,
      },
      quickCheckout,
    );
    setTierSelection(null);
  }

  function openPackageEditor(
    servicePackage: PublicServicePackage,
    quickCheckout = false,
  ): void {
    const selections = servicePackage.items.map((item) => {
      const service = serviceById.get(item.serviceId);
      const defaultTierId =
        item.serviceTierId ??
        (service ? serviceTierOptions(service, dealNowMs)[0]?.id : null) ??
        null;

      return {
        packageItemId: item.id,
        serviceId: item.serviceId,
        serviceTierId: defaultTierId || null,
        quantity: Math.max(item.quantity, item.minQuantity),
      };
    });

    setPackageEditor({ servicePackage, selections, quickCheckout });
    setError(null);
  }

  function updatePackageLineQuantity(
    packageItemId: string,
    delta: number,
  ): void {
    setPackageEditor((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        selections: current.selections.map((selection) => {
          if (selection.packageItemId !== packageItemId) {
            return selection;
          }

          const packageItem = current.servicePackage.items.find(
            (item) => item.id === packageItemId,
          );
          const minQuantity = packageItem?.minQuantity ?? 1;

          return {
            ...selection,
            quantity: Math.max(minQuantity, selection.quantity + delta),
          };
        }),
      };
    });
  }

  function updatePackageLineTier(
    packageItemId: string,
    serviceTierId: string,
  ): void {
    setPackageEditor((current) =>
      current
        ? {
            ...current,
            selections: current.selections.map((selection) =>
              selection.packageItemId === packageItemId
                ? { ...selection, serviceTierId: serviceTierId || null }
                : selection,
            ),
          }
        : current,
    );
  }

  function addPackageEditorToCart(): void {
    if (!packageEditor) {
      return;
    }

    const rawLines: Array<{
      packageItem: PublicServicePackageItem;
      service: PublicService;
      tier: PublicServiceTier | null;
      unitPricePaise: number;
      unitCompareAtPricePaise: number | null;
      serviceIndex: number;
      quantity: number;
    }> = [];

    for (const selection of packageEditor.selections) {
      const packageItem = packageEditor.servicePackage.items.find(
        (item) => item.id === selection.packageItemId,
      );
      const service = serviceById.get(selection.serviceId);

      if (!packageItem || !service) {
        continue;
      }

      const tier =
        serviceTierById(service, selection.serviceTierId) ??
        serviceTierOptions(service, dealNowMs)[0] ??
        null;
      const unitPricePaise =
        tier?.pricePaise ?? serviceEffectivePricePaise(service, dealNowMs);
      const unitCompareAtPricePaise =
        tier?.compareAtPricePaise ??
        serviceStrikePricePaise(service, dealNowMs);
      const serviceIndex = resolvedCatalogue.services.findIndex(
        (candidate) => candidate.id === service.id,
      );

      rawLines.push({
        packageItem,
        service,
        tier,
        unitPricePaise,
        unitCompareAtPricePaise,
        serviceIndex,
        quantity: Math.max(selection.quantity, packageItem.minQuantity),
      });
    }

    if (rawLines.length === 0) {
      setError("This package has no available services.");
      return;
    }

    const rawTotalPaise = rawLines.reduce(
      (total, line) => total + line.unitPricePaise * line.quantity,
      0,
    );
    const discountedTotalPaise = Math.round(
      (rawTotalPaise * (10_000 - packageEditor.servicePackage.discountBps)) /
        10_000,
    );
    const targetTotalPaise = Math.max(
      packageEditor.servicePackage.minPricePaise,
      discountedTotalPaise,
    );
    const packageMultiplier =
      rawTotalPaise > 0 ? targetTotalPaise / rawTotalPaise : 1;

    const packageCartItems: CartItem[] = rawLines.map((line) => ({
      serviceId: line.service.id,
      serviceTierId: line.tier?.id || null,
      serviceTierType: line.tier?.tierType ?? null,
      packageId: packageEditor.servicePackage.id,
      packageName: packageEditor.servicePackage.name,
      slug: line.service.slug,
      name: line.service.name,
      tierName: line.tier?.name ?? null,
      pricePaise: Math.max(
        0,
        Math.round(line.unitPricePaise * packageMultiplier),
      ),
      compareAtPricePaise: line.unitCompareAtPricePaise,
      durationMinutes:
        line.tier?.durationMinutes ?? line.service.durationMinutes,
      imageUrl: serviceImage(
        line.service,
        resolvedCatalogue,
        Math.max(line.serviceIndex, 0),
      ),
      quantity: line.quantity,
      minQuantity: line.packageItem.minQuantity,
    }));

    addCartItems(packageCartItems, packageEditor.quickCheckout);

    setPackageEditor(null);
  }

  function updateCartQuantity(itemKey: string, delta: number): void {
    setCartItems((current) =>
      current
        .map((item) =>
          cartItemKey(item) === itemKey
            ? {
                ...item,
                quantity: Math.max(item.minQuantity, item.quantity + delta),
              }
            : item,
        )
        .filter((item) => item.quantity >= item.minQuantity),
    );
  }

  function removeCartItem(itemKey: string): void {
    setCartItems((current) =>
      current.filter((item) => cartItemKey(item) !== itemKey),
    );
  }

  function selectCustomerAddress(addressId: string): void {
    setSelectedAddressId(addressId);
    window.localStorage.setItem(SELECTED_ADDRESS_STORAGE_KEY, addressId);
    setAddressModalStep(null);
  }

  function openAddressPicker(): void {
    if (!user) {
      openAuthDialog();
      setError("Sign in to choose or add an address.");
      return;
    }

    setAddressModalStep("choose");
  }

  function openAddressFormModal(): void {
    setAddressForm({
      ...DEFAULT_CUSTOMER_ADDRESS_FORM,
      label:
        addresses.length === 0 ? "Home" : `Address ${addresses.length + 1}`,
    });
    setAddressModalStep("form");
  }

  function closeAddressModal(): void {
    setAddressModalStep(null);
  }

  function buildAddressRequestFromForm(): CustomerAddressRequest {
    const line2 = addressForm.line2.trim();

    return {
      label: addressForm.label.trim() || "Home",
      line1: addressForm.line1.trim(),
      ...(line2 ? { line2 } : {}),
      city: addressForm.city.trim(),
      region: addressForm.region.trim(),
      postalCode: addressForm.postalCode.trim(),
    };
  }

  function getValidatedAddressRequest(): CustomerAddressRequest | null {
    const address = buildAddressRequestFromForm();

    if (address.line1.length < 4) {
      setError("Enter flat, house or building details.");
      return null;
    }

    if (!address.line2 || address.line2.length < 3) {
      setError("Enter locality, street or sector.");
      return null;
    }

    if (address.postalCode.length < 4) {
      setError("Enter a valid pin code.");
      return null;
    }

    if (address.city.length < 2) {
      setError("Enter the service city.");
      return null;
    }

    if (address.region.length < 2) {
      setError("Enter the service state.");
      return null;
    }

    return address;
  }

  async function saveCustomerAddress(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!user) {
      openAuthDialog();
      setError("Sign in to save an address.");
      return;
    }

    const address = getValidatedAddressRequest();

    if (!address) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = await apiFetch<CustomerAddressPayload>(
        "/customer/addresses",
        {
          method: "POST",
          body: JSON.stringify({
            ...address,
            isDefault: addresses.length === 0,
          }),
        },
      );
      setAddresses(payload.addresses);
      setSelectedAddressId(payload.address.id);
      window.localStorage.setItem(
        SELECTED_ADDRESS_STORAGE_KEY,
        payload.address.id,
      );
      setAddressForm(DEFAULT_CUSTOMER_ADDRESS_FORM);
      setAddressModalStep("choose");
      setNotice("Address saved.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function sendOtpForPhone(phoneValue: string): Promise<void> {
    setError(null);
    setNotice(null);

    const localPhone = normalizeIndianMobileInput(phoneValue);

    if (localPhone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = await apiFetch<OtpRequestPayload>(
        "/customer/auth/otp/request",
        {
          method: "POST",
          body: JSON.stringify({
            phone: `+91${localPhone}`,
          }),
        },
      );
      setAuthPhone(localPhone);
      setOtpPhone(payload.phone);
      setAuthOtp("");
      setAuthStep("otp");
      setNotice(
        payload.developmentOtp
          ? `Development OTP: ${payload.developmentOtp}`
          : "OTP sent to your mobile number.",
      );
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await sendOtpForPhone(authPhone);
  }

  async function finishAuthFlow(message: string): Promise<void> {
    setAuthStep("complete");
    setNotice(message);
    await refreshMe(false);

    if (isCheckoutFlowPage && cartItems.length > 0) {
      setCheckoutStep("address");
    }

    if (!isAuthPage) {
      setAuthModalOpen(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!otpPhone) {
      setError("Request OTP first.");
      return;
    }

    const otp = authOtp.trim();

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = await apiFetch<OtpVerifyPayload>(
        "/customer/auth/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({
            phone: otpPhone,
            otp,
          }),
        },
      );
      setUser(payload.user);
      setAuthOtp("");
      setAuthProfileForm((current) => ({
        ...current,
        email: payload.user.email ?? "",
        name:
          payload.requiresProfileCompletion &&
          /^Customer\s+\d{4}$/i.test(payload.user.displayName)
            ? ""
            : payload.user.displayName,
      }));

      if (payload.requiresProfileCompletion) {
        setAuthStep("profile");
        setNotice("OTP verified. Complete your profile.");
        return;
      }

      await finishAuthFlow("Signed in successfully.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function completeProfile(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const name = authProfileForm.name.trim();

    if (name.length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!authProfileForm.dateOfBirth) {
      setError("Select your date of birth.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = await apiFetch<CustomerProfilePayload>(
        "/customer/auth/profile",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            email: authProfileForm.email.trim() || undefined,
            dateOfBirth: authProfileForm.dateOfBirth,
            gender: authProfileForm.gender,
          }),
        },
      );
      setUser(payload.user);
      await finishAuthFlow("Profile saved. Signed in successfully.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch<{ ok: boolean }>("/customer/auth/logout", {
        method: "POST",
      });
    } catch {
      // Keep logout locally useful even if the session already expired.
    }

    setUser(null);
    setAddresses([]);
    setBookings([]);
    setSelectedAddressId(null);
    window.localStorage.removeItem(SELECTED_ADDRESS_STORAGE_KEY);
    setNotice("Signed out.");
  }

  async function createBooking(): Promise<void> {
    setError(null);
    setNotice(null);

    if (!user) {
      setCheckoutStep("auth");
      return;
    }

    if (!selectedSlot) {
      setCheckoutStep("slot");
      setError("Choose an available slot.");
      return;
    }

    if (!selectedAddressId) {
      setCheckoutStep("address");
      setAddressModalStep("choose");
      setError("Choose or add a service address.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = await apiFetch<BookingPayload>("/customer/bookings", {
        method: "POST",
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            serviceId: item.serviceId,
            serviceTierId: item.serviceTierId ?? undefined,
            packageId: item.packageId ?? undefined,
            quantity: item.quantity,
          })),
          addressId: selectedAddressId,
          scheduledStartAt: selectedSlot.startsAt,
          notes: bookingNotes || undefined,
          idempotencyKey: createIdempotencyKey(),
        }),
      });
      setCurrentBooking(payload.booking);
      setCheckoutStep("payment");
      await refreshMe(false);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function startPayment(): Promise<void> {
    setError(null);
    setNotice(null);
    setDevelopmentPayment(null);

    if (!currentBooking) {
      setError("Create the booking before payment.");
      return;
    }

    try {
      setSubmitting(true);
      const checkout = await apiFetch<PaymentCheckoutPayload>(
        "/customer/payments/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            bookingId: currentBooking.id,
            method: paymentChoice,
            idempotencyKey: createIdempotencyKey(),
          }),
        },
      );

      if (checkout.mode === "pay_after_service" && checkout.booking) {
        finishBooking(checkout.booking);
        return;
      }

      if (checkout.mode === "development_razorpay") {
        setDevelopmentPayment(checkout);
        setNotice("Development Razorpay checkout is ready.");
        return;
      }

      if (!checkout.order || !checkout.razorpayKeyId) {
        setError("Payment gateway did not return a checkout order.");
        return;
      }

      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay) {
        setError("Razorpay checkout could not be loaded.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: checkout.razorpayKeyId,
        amount: checkout.order.amount,
        currency: checkout.order.currency,
        name: catalogue?.business.name ?? BUSINESS_NAME,
        description: currentBooking.items
          .map((item) => item.serviceName)
          .join(", "),
        order_id: checkout.order.id,
        prefill: {
          name: user?.displayName ?? "Customer",
          contact: user?.phone ?? "",
        },
        theme: {
          color: "#8b6aa8",
        },
        handler: (response) => {
          void verifyPayment(checkout.payment.id, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });
      razorpay.open();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyPayment(
    paymentId: string,
    providerPayload: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      developmentPaymentToken?: string;
    },
  ): Promise<void> {
    if (!currentBooking) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = await apiFetch<PaymentVerifyPayload>(
        "/customer/payments/verify",
        {
          method: "POST",
          body: JSON.stringify({
            bookingId: currentBooking.id,
            paymentId,
            ...providerPayload,
          }),
        },
      );
      finishBooking(payload.booking);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  function finishBooking(booking: CustomerBooking): void {
    setSuccessBooking(booking);
    setCurrentBooking(booking);
    setCartItems([]);
    setDevelopmentPayment(null);
    setCheckoutStep("success");
    setNotice("Booking confirmed.");
    void refreshMe(false);
  }

  async function submitContact(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      setSubmitting(true);
      await apiFetch<ContactPayload>("/customer/contact", {
        method: "POST",
        body: JSON.stringify({
          ...contactForm,
          phone: contactForm.phone || undefined,
          email: contactForm.email || undefined,
        }),
      });
      setContactForm({
        name: "",
        phone: "",
        email: "",
        message: "",
      });
      setNotice("Your request has been sent to support.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  function bookingCanReceiveReview(booking: CustomerBooking): boolean {
    return (
      !booking.review &&
      booking.status !== "CANCELLED" &&
      booking.payments.some(
        (payment) =>
          payment.status === "CAPTURED" || payment.status === "AUTHORIZED",
      )
    );
  }

  function openReviewForm(booking: CustomerBooking): void {
    setReviewDraft({
      bookingId: booking.id,
      rating: 5,
      highlights: [],
      comment: "",
    });
  }

  function toggleReviewHighlight(highlight: string): void {
    setReviewDraft((current) => {
      const selected = current.highlights.includes(highlight);

      return {
        ...current,
        highlights: selected
          ? current.highlights.filter((item) => item !== highlight)
          : [...current.highlights, highlight],
      };
    });
  }

  async function submitReview(
    event: FormEvent<HTMLFormElement>,
    booking: CustomerBooking,
  ): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (reviewDraft.bookingId !== booking.id) {
      openReviewForm(booking);
      return;
    }

    if (
      reviewDraft.highlights.length === 0 &&
      reviewDraft.comment.trim().length === 0
    ) {
      setError("Select at least one review point or write a short comment.");
      return;
    }

    try {
      setReviewSubmittingBookingId(booking.id);
      await apiFetch<{
        review: CustomerBookingReview;
      }>(`/customer/bookings/${encodeURIComponent(booking.id)}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewDraft.rating,
          highlights: reviewDraft.highlights,
          comment: reviewDraft.comment.trim() || undefined,
        }),
      });
      setReviewDraft({
        bookingId: null,
        rating: 5,
        highlights: [],
        comment: "",
      });
      setNotice("Review submitted. It will appear after admin approval.");
      await refreshMe(false);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setReviewSubmittingBookingId(null);
    }
  }

  function moveReviewSlide(direction: -1 | 1): void {
    if (publicReviews.length <= 1) {
      return;
    }

    setReviewSlideIndex(
      (current) =>
        (current + direction + publicReviews.length) % publicReviews.length,
    );
  }

  function continueFromCart(): void {
    if (cartItems.length === 0) {
      setError("Add a service before checkout.");
      return;
    }

    if (catalogueOffline) {
      setError(
        "Live booking is temporarily unavailable. Please call us or try again shortly.",
      );
      return;
    }

    setError(null);
    setCheckoutStep("slot");
  }

  function buildCartItemFromService(
    service: PublicService,
    quantity: number,
    serviceTierId: string | null = null,
    packageId: string | null = null,
    packageName: string | null = null,
  ): CartItem {
    const serviceIndex = resolvedCatalogue.services.findIndex(
      (candidate) => candidate.id === service.id,
    );
    const tier =
      serviceTierById(service, serviceTierId) ??
      serviceTierOptions(service, dealNowMs)[0] ??
      null;
    const pricePaise =
      tier?.pricePaise ?? serviceEffectivePricePaise(service, dealNowMs);
    const compareAtPricePaise =
      tier?.compareAtPricePaise ?? serviceStrikePricePaise(service, dealNowMs);

    return {
      serviceId: service.id,
      serviceTierId: tier?.id || null,
      serviceTierType: tier?.tierType ?? null,
      packageId,
      packageName,
      slug: service.slug,
      name: service.name,
      tierName: tier?.name ?? null,
      pricePaise,
      compareAtPricePaise,
      durationMinutes: tier?.durationMinutes ?? service.durationMinutes,
      imageUrl: serviceImage(
        service,
        resolvedCatalogue,
        Math.max(serviceIndex ?? 0, 0),
      ),
      quantity,
      minQuantity: 1,
    };
  }

  function orderAgain(booking: CustomerBooking): void {
    if (catalogueOffline) {
      setError(
        "Live booking is temporarily unavailable. Please call us or try again shortly.",
      );
      return;
    }

    if (!catalogue) {
      setError("Services are still loading. Try again in a moment.");
      return;
    }

    const nextCartItems = booking.items
      .map((item) => {
        const service =
          catalogue.services.find(
            (candidate) => candidate.id === item.serviceId,
          ) ?? null;

        return service
          ? buildCartItemFromService(
              service,
              Math.max(item.quantity, 1),
              item.serviceTierId,
              item.packageId,
              item.packageName,
            )
          : null;
      })
      .filter((item): item is CartItem => item !== null);

    if (nextCartItems.length === 0) {
      setError("The services from this booking are not available now.");
      return;
    }

    setCartItems(nextCartItems);
    setCheckoutStep("cart");
    setNotice("Previous booking services added to cart.");
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(nextCartItems),
      );
      window.location.assign("/cart");
    } catch {
      setError("Cart updated. Open the cart from this page to continue.");
    }
  }

  const headerQuickLinks = resolvedCatalogue.categories
    .filter((category) => !category.parentId)
    .slice(0, 4)
    .map((category) => ({
      label: category.name,
      href: `/categories/${category.slug}`,
    }));
  const headerQuickItems =
    headerQuickLinks.length > 0
      ? headerQuickLinks
      : [
          { label: "Facial", href: "/services" },
          { label: "Waxing", href: "/services" },
          { label: "Manicure", href: "/services" },
          { label: "Hair spa", href: "/services" },
        ];
  const serviceCity = catalogue?.business.city ?? "Lucknow";
  const serviceLocationLabel = serviceCity;

  function handleHeaderSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const query = search.trim();

    if (initialMode === "services") {
      document
        .getElementById("services")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.location.assign(
      query ? `/services?search=${encodeURIComponent(query)}` : "/services",
    );
  }

  function openAuthDialog(): void {
    if (user) {
      setAuthStep("complete");
    } else {
      setAuthStep("phone");
      setOtpPhone(null);
      setAuthOtp("");
    }

    setAuthModalOpen(true);
    setError(null);
  }

  function closeAuthDialog(): void {
    setAuthModalOpen(false);
  }

  const hasModalOverlay =
    (authModalOpen && !isAuthPage) ||
    addressModalStep !== null ||
    tierSelection !== null ||
    packageEditor !== null;
  const siteClassName = hasModalOverlay
    ? "customer-site customer-site-auth-open"
    : "customer-site";

  return (
    <main className={siteClassName}>
      {!isAuthPage ? (
        <header className="customer-header">
          <div className="customer-header-shell">
            <a className="customer-brand" href="/" aria-label={BUSINESS_NAME}>
              <span className="customer-brand-logo">
                <strong>{BUSINESS_LOGO_PRIMARY}</strong>
                <small>{BUSINESS_LOGO_SECONDARY}</small>
              </span>
            </a>
            <a
              aria-label={`Current service location: ${serviceLocationLabel}`}
              className="customer-location-pill"
              href="/contact"
            >
              <MapPin size={15} />
              <span>{serviceLocationLabel}</span>
              <ChevronDown size={17} />
            </a>
            <form
              className="customer-header-search"
              onSubmit={handleHeaderSearchSubmit}
              role="search"
            >
              <Search size={25} />
              <label className="sr-only" htmlFor="customer-header-search">
                Search services
              </label>
              <input
                id="customer-header-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search facials, waxing, spa..."
                type="search"
                value={search}
              />
            </form>
            <div className="customer-actions">
              {cartItems.length > 0 ? (
                <a
                  aria-label={`Open cart with ${cartItems.length} ${
                    cartItems.length === 1 ? "service" : "services"
                  }`}
                  className="customer-cart-button"
                  href="/cart"
                >
                  <ShoppingBag size={18} />
                  <span>{cartItems.length}</span>
                </a>
              ) : null}
              {user ? (
                <a
                  className="customer-pill-button customer-login-button"
                  href="/account"
                >
                  <UserRound size={18} />
                  <span>{user.displayName}</span>
                </a>
              ) : (
                <button
                  className="customer-pill-button customer-login-button"
                  onClick={openAuthDialog}
                  type="button"
                >
                  <UserRound size={18} />
                  <span>Login</span>
                </button>
              )}
            </div>
            <button
              className="customer-menu-button"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="sr-only">Menu</span>
            </button>
            <div className="customer-quick-row">
              <span>Quick:</span>
              {headerQuickItems.map((item) => (
                <a href={item.href} key={item.label}>
                  {item.label}
                </a>
              ))}
            </div>
            <nav className={`customer-nav ${menuOpen ? "is-open" : ""}`}>
              <a href="/">Home</a>
              <a href="/#categories">Categories</a>
              <a href="/#services">Services</a>
              <a href="/#reviews">Reviews</a>
              <a href="/#why-us">Why us</a>
              <a href="/cart">Cart</a>
              {user ? (
                <a href="/orders">Orders</a>
              ) : (
                <button onClick={openAuthDialog} type="button">
                  Orders
                </button>
              )}
              <a href="/contact">Contact</a>
            </nav>
          </div>
        </header>
      ) : null}

      {notice ? (
        <div className="customer-toast customer-toast-success">{notice}</div>
      ) : null}
      {error ? (
        <div className="customer-toast customer-toast-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} type="button">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {isCartPage ? (
        renderCartPage()
      ) : isCheckoutFlowPage ? (
        renderCheckoutPage()
      ) : isAuthPage ? (
        renderAuthPage()
      ) : initialMode === "account" ? (
        renderAccount()
      ) : initialMode === "addresses" ? (
        renderAddressesPage()
      ) : initialMode === "orders" ? (
        renderOrdersPage()
      ) : initialMode === "payments" ? (
        renderPaymentsPage()
      ) : initialMode === "contact" ? (
        renderContact()
      ) : isServiceDetailMode ? (
        renderServiceDetailPage()
      ) : initialMode === "services" ? (
        renderCataloguePage()
      ) : (
        <>
          {renderHero()}
          {renderCategories()}
          {renderPackagesSection()}
          {renderHomepageServiceSections()}
          {renderConfidenceStrip()}
          {renderDealOfDaySection()}
          {renderReviews()}
          {renderContactCta()}
        </>
      )}

      {authModalOpen && !isAuthPage ? renderAuthModal(false) : null}
      {renderAddressModals()}
      {renderTierSelectionModal()}
      {renderPackageEditorModal()}
      {cartItems.length > 0 && !isCartPage && !isCheckoutFlowPage && !isAuthPage
        ? renderFloatingCart()
        : null}
      {!isAuthPage && !hasModalOverlay ? renderMobileTabBar() : null}
      {!isAuthPage ? renderFooter() : null}
    </main>
  );

  function renderHero(): React.ReactElement {
    const heroCategories = rootCategories.slice(0, 8);
    const heroServices = (
      resolvedCatalogue.featuredServices.length > 0
        ? resolvedCatalogue.featuredServices
        : resolvedCatalogue.services
    ).slice(0, 5);
    const featuredHeroService =
      heroServices[0] ??
      resolvedCatalogue.services[0] ??
      FALLBACK_CATALOGUE.services[0];

    if (!featuredHeroService) {
      return (
        <section className="customer-hero">
          <div className="customer-hero-copy">
            <p className="customer-eyebrow">Serving Lucknow</p>
            <h1>Private salon care, brought home.</h1>
          </div>
        </section>
      );
    }

    const supportingHeroServices =
      heroServices.length > 1
        ? heroServices.slice(1, 5)
        : resolvedCatalogue.services.slice(1, 5);
    const featuredHeroImageUrl = serviceImage(
      featuredHeroService,
      resolvedCatalogue,
      0,
    );
    const featuredHeroVideoUrl = heroServiceVideoUrl(featuredHeroService);

    return (
      <section className="customer-hero">
        <div className="customer-hero-copy">
          <p className="customer-eyebrow">
            <MapPin size={16} />
            Serving Lucknow
          </p>
          <h1>Private salon care, brought home.</h1>
          <p>
            Curated facials, waxing, hair spa, manicures and makeup by trained
            professionals, with clear pricing and refined doorstep service
            across Lucknow.
          </p>

          <form
            className="customer-hero-search"
            onSubmit={handleHeaderSearchSubmit}
            role="search"
          >
            <Search size={20} />
            <label className="sr-only" htmlFor="customer-hero-search">
              Search services
            </label>
            <input
              id="customer-hero-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for facial, waxing, hair spa..."
              type="search"
              value={search}
            />
          </form>

          <div className="customer-hero-category-grid">
            {heroCategories.map((category, index) => (
              <a href={`/categories/${category.slug}`} key={category.id}>
                <span>
                  {category.imageUrl ? (
                    <img alt="" src={category.imageUrl} />
                  ) : (
                    <Sparkles size={20 + (index % 2) * 2} />
                  )}
                </span>
                <strong>{category.name}</strong>
              </a>
            ))}
          </div>
        </div>
        <aside
          className="customer-hero-media-grid"
          aria-label="Service preview"
        >
          <a
            className="customer-hero-media-card customer-hero-media-card-featured"
            href={`/services/${featuredHeroService.slug}`}
          >
            {featuredHeroVideoUrl ? (
              <video
                aria-hidden="true"
                autoPlay
                loop
                muted
                playsInline
                poster={featuredHeroImageUrl}
                preload="metadata"
              >
                <source src={featuredHeroVideoUrl} type="video/mp4" />
              </video>
            ) : (
              <img
                alt={featuredHeroService.mainImage?.altText ?? ""}
                src={featuredHeroImageUrl}
              />
            )}
            <span className="customer-hero-media-label">
              <PlayCircle size={19} />
              {featuredHeroService.categoryName}
            </span>
            <strong>{featuredHeroService.name}</strong>
          </a>
          {supportingHeroServices.map((service, index) => {
            const heroImageUrl = serviceImage(
              service,
              resolvedCatalogue,
              index + 1,
            );
            const heroVideoUrl = heroServiceVideoUrl(service);

            return (
              <a
                className="customer-hero-media-card"
                href={`/services/${service.slug}`}
                key={service.id}
              >
                {heroVideoUrl ? (
                  <video
                    aria-hidden="true"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={heroImageUrl}
                    preload="metadata"
                  >
                    <source src={heroVideoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    alt={service.mainImage?.altText ?? ""}
                    src={heroImageUrl}
                  />
                )}
                <span>{service.categoryName}</span>
                <strong>{service.name}</strong>
              </a>
            );
          })}
        </aside>
      </section>
    );
  }

  function renderConfidenceStrip(): React.ReactElement {
    const items = [
      {
        icon: <ShieldCheck size={20} />,
        title: "Sanitized setup",
        text: "Fresh tools, single-use essentials and polished service prep.",
      },
      {
        icon: <UserRound size={20} />,
        title: "Curated professionals",
        text: "Your slot reserves a trained professional for your service.",
      },
      {
        icon: <BadgePercent size={20} />,
        title: "Transparent pricing",
        text: "Price, inclusions and duration stay clear before checkout.",
      },
      {
        icon: <CreditCard size={20} />,
        title: "Secure booking",
        text: "OTP login and Razorpay-ready payment flow are built in.",
      },
    ];

    return (
      <section
        aria-label="Booking quality assurances"
        className="customer-confidence-strip"
      >
        {items.map((item) => (
          <article key={item.title}>
            <span>{item.icon}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </section>
    );
  }

  function renderCategories(): React.ReactElement {
    const categories = rootCategories;
    const hasSelectedCategory = Boolean(selectedCategorySlug);

    return (
      <section
        className="customer-section customer-category-section"
        id="categories"
      >
        <div className="customer-category-section-head">
          <div className="customer-category-title-row">
            <span className="customer-category-icon-tile" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="customer-category-kicker">Salon menu</span>
          </div>
          <div className="customer-category-heading-copy">
            <div>
              <h2>Choose your ritual</h2>
              <span className="customer-section-underline" aria-hidden="true" />
              <p>
                Browse curated categories and open the full menu for prices,
                duration and inclusions.
              </p>
            </div>
            {hasSelectedCategory ? (
              <button
                className="customer-category-reset"
                onClick={() => setSelectedCategorySlug(null)}
                type="button"
              >
                Show all services
              </button>
            ) : null}
          </div>
        </div>
        <div className="customer-category-grid">
          {categories.map((category) => (
            <a
              aria-current={
                selectedCategorySlug === category.slug ? "page" : undefined
              }
              className={`customer-category-card${
                selectedCategorySlug === category.slug ? " is-selected" : ""
              }`}
              href={`/categories/${category.slug}`}
              key={category.id}
            >
              <span className="customer-category-card-media">
                {category.imageUrl ? (
                  <img alt="" src={category.imageUrl} />
                ) : (
                  <span className="customer-category-card-initials">
                    {category.name.slice(0, 2)}
                  </span>
                )}
              </span>
              <span className="customer-category-card-label">
                <strong>{category.name}</strong>
                <ChevronRight size={18} strokeWidth={2.5} />
              </span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  function renderPackagesSection(
    categorySlug?: string,
  ): React.ReactElement | null {
    const sourcePackages = categorySlug
      ? (packagesByCategorySlug.get(categorySlug) ?? [])
      : resolvedCatalogue.packages;
    const packages = sourcePackages.slice(0, 4);

    if (packages.length === 0) {
      return null;
    }

    return (
      <section className="customer-package-section" id="packages">
        {renderServiceSectionHeading(
          "Super saver packages",
          "Edit included services, keep admin minimum pricing, and book faster.",
        )}
        <div className="customer-package-card-grid">
          {packages.map((servicePackage) => {
            const discountPercent = Math.round(
              servicePackage.discountBps / 100,
            );

            return (
              <article
                className="customer-package-card"
                key={servicePackage.id}
              >
                <div className="customer-package-card-copy">
                  <span className="customer-package-kicker">
                    <ShoppingBag size={15} />
                    Package
                  </span>
                  <h3>{servicePackage.name}</h3>
                  {servicePackage.description ? (
                    <p>{servicePackage.description}</p>
                  ) : null}
                  <div className="customer-package-price-row">
                    <strong>{formatMoney(servicePackage.minPricePaise)}</strong>
                    {servicePackage.compareAtPricePaise ? (
                      <del>
                        {formatMoney(servicePackage.compareAtPricePaise)}
                      </del>
                    ) : null}
                    <span>
                      {formatDurationShort(servicePackage.durationMinutes)}
                    </span>
                  </div>
                  <ul>
                    {servicePackage.items.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        <span>{item.label ?? item.serviceName}</span>
                        <small>
                          {item.quantity}x
                          {item.serviceTierName
                            ? ` · ${item.serviceTierName}`
                            : ""}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
                <aside>
                  <strong>{discountPercent}% OFF</strong>
                  <button
                    className="customer-outline-button"
                    onClick={() => openPackageEditor(servicePackage)}
                    type="button"
                  >
                    Edit package
                  </button>
                  <button
                    className="customer-gold-button"
                    onClick={() => openPackageEditor(servicePackage, true)}
                    type="button"
                  >
                    Book now
                    <ChevronRight size={17} />
                  </button>
                </aside>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderDealOfDaySection(): React.ReactElement | null {
    const dealServices = resolvedCatalogue.services
      .filter((service) => serviceHasActiveDeal(service, dealNowMs))
      .sort((left, right) => {
        const leftEnd = dateValueMs(left.dealEndsAt) ?? Number.MAX_SAFE_INTEGER;
        const rightEnd =
          dateValueMs(right.dealEndsAt) ?? Number.MAX_SAFE_INTEGER;
        return leftEnd - rightEnd;
      });

    if (dealServices.length === 0) {
      return null;
    }

    const soonestEndMs = Math.min(
      ...dealServices
        .map((service) => dateValueMs(service.dealEndsAt))
        .filter((value): value is number => value !== null),
    );
    const countdownParts = formatDealCountdown(soonestEndMs - dealNowMs);
    const day = weekdayLabel(dealNowMs);

    return (
      <section className="customer-deal-section" id="deals">
        <div className="customer-deal-heading">
          <h2>Today&apos;s salon edit</h2>
          <span aria-hidden="true" />
          <h3>Selected services for {day}</h3>
          <p>Curated savings on premium care.</p>
          <div className="customer-deal-countdown" aria-label="Deal countdown">
            <strong>Ends in</strong>
            {countdownParts.map((part) => (
              <span className="customer-deal-countdown-part" key={part.label}>
                <b>{part.value}</b>
                <small>{part.label}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="customer-deal-grid">
          {dealServices.map((service, index) => {
            const savings = serviceSavingsPaise(service, dealNowMs);
            const discountPercent = serviceDiscountPercent(service, dealNowMs);
            const strikePrice = serviceStrikePricePaise(service, dealNowMs);
            const collageImages = [
              service.mainImage?.url,
              ...service.galleryImages.map((image) => image.url),
              serviceImage(service, resolvedCatalogue, index),
              fallbackImage(resolvedCatalogue, index + 1),
              fallbackImage(resolvedCatalogue, index + 2),
              fallbackImage(resolvedCatalogue, index + 3),
            ].filter((url): url is string => Boolean(url));
            const inclusions =
              service.inclusions.length > 0
                ? service.inclusions.slice(0, 2)
                : [serviceExcerpt(service)];

            return (
              <article className="customer-deal-card" key={service.id}>
                <div className="customer-deal-card-media">
                  {discountPercent ? (
                    <strong>{discountPercent}% off</strong>
                  ) : null}
                  {collageImages.slice(0, 4).map((imageUrl, imageIndex) => (
                    <img
                      alt={service.mainImage?.altText ?? service.name}
                      key={`${service.id}-${imageUrl}-${imageIndex}`}
                      src={imageUrl}
                    />
                  ))}
                </div>
                <div className="customer-deal-card-body">
                  <h3>{service.name}</h3>
                  <p>{service.categoryName}</p>
                  <span className="customer-deal-duration">
                    <Clock3 size={15} />
                    {formatDurationShort(service.durationMinutes)}
                  </span>
                  <ul>
                    {inclusions.map((item) => (
                      <li key={item}>
                        <CheckCircle2 size={15} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <footer>
                    <div>
                      <span>
                        Special {servicePriceLabel(service, dealNowMs)}/-
                      </span>
                      {strikePrice ? (
                        <del>{formatMoney(strikePrice)}/-</del>
                      ) : null}
                      {savings ? (
                        <small>
                          Save {formatMoney(savings)} for {day} only!
                        </small>
                      ) : (
                        <small>Special price unlocked for {day} only!</small>
                      )}
                    </div>
                    <button
                      aria-label={`Add ${service.name} to cart`}
                      onClick={() => openTierSelection(service, index)}
                      type="button"
                    >
                      <Plus size={17} />
                    </button>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderServiceCard(
    service: PublicService,
    index: number,
  ): React.ReactElement {
    const savings = serviceSavingsPaise(service, dealNowMs);
    const strikePrice = serviceStrikePricePaise(service, dealNowMs);
    const quickInclusions =
      service.inclusions.length > 0
        ? service.inclusions.slice(0, 2)
        : [serviceExcerpt(service)];
    const subtitle = service.shortDescription?.trim() || service.categoryName;
    const tierPreview = serviceTierOptions(service, dealNowMs).slice(0, 2);

    return (
      <article className="customer-service-card" key={service.id}>
        <a
          className="customer-service-image-link"
          href={`/services/${service.slug}`}
        >
          <img
            alt={service.mainImage?.altText ?? service.name}
            src={serviceImage(service, resolvedCatalogue, index)}
          />
        </a>
        <div className="customer-service-card-body">
          <div className="customer-service-card-copy">
            <div className="customer-service-title-row">
              <h3>
                <a href={`/services/${service.slug}`}>{service.name}</a>
              </h3>
              {savings ? <span>Save {formatMoney(savings)}</span> : null}
            </div>
            <p>{subtitle}</p>
            <div className="customer-service-meta">
              <span>
                <Clock3 size={14} />
                {formatDurationShort(service.durationMinutes)}
              </span>
              <span>
                <ShieldCheck size={14} />
                Verified pro
              </span>
            </div>
            {tierPreview.length > 0 ? (
              <div
                aria-label={`${service.name} price tiers`}
                className="customer-service-tier-preview"
              >
                {tierPreview.map((tier) => (
                  <button
                    key={tier.publicId}
                    onClick={() => openTierSelection(service, index)}
                    type="button"
                  >
                    <span>
                      {tier.tierType === "LUXURY" ? "Luxury" : "Premium"}
                    </span>
                    <strong>{formatMoney(tier.pricePaise)}</strong>
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="customer-service-mini-list">
              {quickInclusions.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={15} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <footer className="customer-service-card-footer">
            <div className="customer-service-price-row">
              <strong>{serviceStartingPriceLabel(service, dealNowMs)}</strong>
              {strikePrice ? <del>{formatMoney(strikePrice)}</del> : null}
            </div>
            <div className="customer-service-card-actions">
              <button
                className="customer-service-add-button"
                onClick={() => openTierSelection(service, index)}
                type="button"
              >
                Add
              </button>
              <button
                className="customer-service-book-button"
                onClick={() => openTierSelection(service, index, true)}
                type="button"
              >
                Book now
              </button>
            </div>
          </footer>
        </div>
      </article>
    );
  }

  function renderServiceSectionHeading(
    title: string,
    subtitle?: string,
    action?: React.ReactNode,
  ): React.ReactElement {
    return (
      <div className="customer-service-showcase-head">
        <div className="customer-service-showcase-title-row">
          <div>
            <h2>{title}</h2>
            <span className="customer-section-underline" aria-hidden="true" />
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      </div>
    );
  }

  function renderCatalogueSearch(): React.ReactElement {
    return (
      <label className="customer-catalogue-search">
        <Search size={19} />
        <span>
          Search services
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Facial, waxing, hair spa..."
            value={search}
          />
        </span>
      </label>
    );
  }

  function renderCataloguePagination(
    totalCount: number,
    currentPage: number,
    totalPages: number,
  ): React.ReactElement | null {
    if (totalCount <= CATALOGUE_SERVICES_PER_PAGE) {
      return null;
    }

    const firstVisibleService =
      (currentPage - 1) * CATALOGUE_SERVICES_PER_PAGE + 1;
    const lastVisibleService = Math.min(
      totalCount,
      currentPage * CATALOGUE_SERVICES_PER_PAGE,
    );
    const pageNumbers = Array.from({ length: totalPages }, (_value, index) => {
      return index + 1;
    });

    return (
      <nav
        aria-label="Service catalogue pagination"
        className="customer-catalogue-pagination"
      >
        <p>
          Showing {firstVisibleService}-{lastVisibleService} of {totalCount}
        </p>
        <div>
          <button
            aria-label="Previous service page"
            disabled={currentPage <= 1}
            onClick={() => setCataloguePage(Math.max(1, currentPage - 1))}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              aria-current={currentPage === pageNumber ? "page" : undefined}
              aria-label={`Go to service page ${pageNumber}`}
              key={pageNumber}
              onClick={() => setCataloguePage(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ))}
          <button
            aria-label="Next service page"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCataloguePage(Math.min(totalPages, currentPage + 1))
            }
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </nav>
    );
  }

  function renderHomepageServiceSections(): React.ReactElement | null {
    if (homepageServiceSections.length === 0) {
      return null;
    }

    return (
      <div className="customer-homepage-service-sections">
        {homepageServiceSections.map((section, sectionIndex) => (
          <section
            className="customer-service-showcase-section"
            id={sectionIndex === 0 ? "services" : undefined}
            key={section.id}
          >
            {renderServiceSectionHeading(
              section.title,
              "Curated in-home salon treatments",
              <a
                className="customer-link-button"
                href={`/categories/${section.categorySlug}`}
              >
                See all
                <ChevronRight size={16} />
              </a>,
            )}
            <div className="customer-service-grid">
              {section.services.map((service, serviceIndex) =>
                renderServiceCard(service, serviceIndex),
              )}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderMobileTabBar(): React.ReactElement {
    return (
      <nav className="customer-bottom-tabs" aria-label="Mobile navigation">
        <a href="/">
          <Home size={20} />
          <span>Home</span>
        </a>
        <a href="/#categories">
          <Sparkles size={20} />
          <span>Categories</span>
        </a>
        <a href="/services">
          <Search size={20} />
          <span>Services</span>
        </a>
        <a className={cartItems.length > 0 ? "has-items" : ""} href="/cart">
          <ShoppingBag size={20} />
          <span>Cart</span>
          {cartItems.length > 0 ? <em>{cartItems.length}</em> : null}
        </a>
        {user ? (
          <a href="/account">
            <UserRound size={20} />
            <span>Account</span>
          </a>
        ) : (
          <button onClick={openAuthDialog} type="button">
            <UserRound size={20} />
            <span>Login</span>
          </button>
        )}
      </nav>
    );
  }

  function renderCategoryFilterSidebar(): React.ReactElement | null {
    if (rootCategories.length === 0) {
      return null;
    }

    return (
      <aside
        aria-label="Change service category"
        className="customer-category-filter-panel"
      >
        <p>Categories</p>
        <a
          className={!selectedCategorySlug ? "is-selected" : ""}
          href="/services"
        >
          <span>All services</span>
          <ChevronRight size={17} />
        </a>
        {rootCategories.map((category) => (
          <a
            className={
              selectedCategorySlug === category.slug ? "is-selected" : ""
            }
            href={`/categories/${category.slug}`}
            key={category.id}
          >
            <span>{category.name}</span>
            <ChevronRight size={17} />
          </a>
        ))}
      </aside>
    );
  }

  function renderServices(): React.ReactElement {
    const serviceContent = resolvedCatalogue.homepage.services;
    const heading = activeCategory
      ? `${activeCategory.name} services`
      : initialMode === "services"
        ? "All salon services"
        : "Popular services";
    const focusedMode =
      initialMode === "services" || selectedCategorySlug || search;
    const services = focusedMode
      ? filteredServices
      : resolvedCatalogue.featuredServices;
    const totalPages = Math.max(
      1,
      Math.ceil(services.length / CATALOGUE_SERVICES_PER_PAGE),
    );
    const currentPage = Math.min(cataloguePage, totalPages);
    const paginatedServices = focusedMode
      ? services.slice(
          (currentPage - 1) * CATALOGUE_SERVICES_PER_PAGE,
          currentPage * CATALOGUE_SERVICES_PER_PAGE,
        )
      : services;
    const groups = resolvedCatalogue.categories
      .map((category) => ({
        category,
        services: resolvedCatalogue.services
          .filter((service) => service.categoryId === category.id)
          .slice(0, 8),
      }))
      .filter((group) => group.services.length > 0)
      .slice(0, 8);

    return (
      <section
        className={`customer-section customer-section-muted${
          focusedMode ? " customer-catalogue-results-section" : ""
        }`}
        id={initialMode === "services" ? "services" : "service-groups"}
      >
        {!focusedMode ? (
          <div className="customer-section-head customer-section-head-row">
            <div>
              <p className="customer-eyebrow">
                {serviceContent?.eyebrow ?? "Book a service"}
              </p>
              <h2>{heading}</h2>
              <p>
                {serviceContent?.subtitle ??
                  "Choose a package, add it to cart, select an available slot, and complete checkout."}
              </p>
            </div>
            <a className="customer-link-button" href="/services">
              View all
              <ChevronRight size={16} />
            </a>
          </div>
        ) : null}
        {catalogueLoading ? (
          <div className="customer-loading">
            <Loader2 size={20} />
            Loading services
          </div>
        ) : focusedMode ? (
          <div className="customer-catalogue-layout">
            {renderCategoryFilterSidebar()}
            <div className="customer-catalogue-results">
              {renderServiceSectionHeading(
                heading,
                "Browse services, compare prices and add treatments to cart.",
                renderCatalogueSearch(),
              )}
              {services.length === 0 ? (
                <div className="customer-empty">
                  No published services are available yet. Add and publish
                  services from the admin catalogue.
                </div>
              ) : (
                <>
                  <div className="customer-service-grid">
                    {paginatedServices.map((service, index) =>
                      renderServiceCard(
                        service,
                        (currentPage - 1) * CATALOGUE_SERVICES_PER_PAGE + index,
                      ),
                    )}
                  </div>
                  {renderCataloguePagination(
                    services.length,
                    currentPage,
                    totalPages,
                  )}
                </>
              )}
            </div>
          </div>
        ) : groups.length > 0 ? (
          <div className="customer-service-section-list">
            {groups.map((group) => (
              <section
                className="customer-service-group"
                key={group.category.id}
              >
                <div>
                  <p className="customer-eyebrow">
                    {group.category.parentSlug
                      ? "Subcategory"
                      : "Featured menu"}
                  </p>
                  <h3>{group.category.name}</h3>
                  <a
                    className="customer-link-button"
                    href={`/categories/${group.category.slug}`}
                  >
                    View category
                    <ChevronRight size={15} />
                  </a>
                </div>
                <div className="customer-service-rail">
                  {group.services.map((service, index) =>
                    renderServiceCard(service, index),
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="customer-service-grid">
            {services.map((service, index) =>
              renderServiceCard(service, index),
            )}
          </div>
        ) : (
          <div className="customer-empty">
            No published services are available yet. Add and publish services
            from the admin catalogue.
          </div>
        )}
      </section>
    );
  }

  function renderCataloguePage(): React.ReactElement {
    return (
      <>
        {renderPackagesSection(selectedCategorySlug ?? undefined)}
        {renderServices()}
        {renderConfidenceStrip()}
      </>
    );
  }

  function renderServiceDetailPage(): React.ReactElement {
    if (catalogueLoading && !catalogue) {
      return (
        <section className="customer-service-detail-page">
          <div className="customer-detail-loading">
            <Loader2 size={24} />
            <span>Preparing service details</span>
          </div>
        </section>
      );
    }

    if (!selectedService) {
      return (
        <section className="customer-service-detail-page">
          <div className="customer-detail-not-found">
            <p className="customer-eyebrow">Service details</p>
            <h1>Service not available</h1>
            <p>
              This service is not published in the current catalogue. Browse the
              available salon services or contact support for help.
            </p>
            <div>
              <a className="customer-gold-button" href="/services">
                Browse services
                <ChevronRight size={18} />
              </a>
              <a className="customer-outline-button" href="/contact">
                Contact support
              </a>
            </div>
          </div>
        </section>
      );
    }

    const service = selectedService;
    const imageUrl = serviceImage(service, resolvedCatalogue, 0);
    const savings = serviceSavingsPaise(service, dealNowMs);
    const strikePrice = serviceStrikePricePaise(service, dealNowMs);
    const galleryImages = [service.mainImage, ...service.galleryImages].filter(
      (image): image is PublicMediaImage => Boolean(image),
    );
    const displayImages =
      galleryImages.length > 0
        ? galleryImages
        : [{ id: service.id, url: imageUrl, altText: service.name }];
    const relatedServices = resolvedCatalogue.services
      .filter(
        (relatedService) =>
          relatedService.categoryId === service.categoryId &&
          relatedService.id !== service.id,
      )
      .slice(0, 3);
    const serviceNotes = [
      "Professional reaches the address at the selected slot.",
      "Please keep a comfortable work area and water access ready.",
      "Tell the professional about allergies or skin sensitivity before service.",
    ];

    return (
      <section className="customer-service-detail-page">
        <nav aria-label="Breadcrumb" className="customer-breadcrumb">
          <a href="/">Home</a>
          <ChevronRight size={14} />
          <a href="/services">Services</a>
          <ChevronRight size={14} />
          <span>{service.name}</span>
        </nav>

        <div className="customer-detail-hero">
          <div className="customer-detail-gallery">
            <div className="customer-detail-gallery-main">
              <img
                alt={displayImages[0]?.altText ?? service.name}
                src={displayImages[0]?.url ?? imageUrl}
              />
              <span className="customer-service-rating customer-detail-rating">
                <ShieldCheck size={15} />
                Verified home service
              </span>
            </div>
            <div className="customer-detail-thumbs">
              {displayImages.slice(0, 4).map((image) => (
                <img
                  alt={image.altText ?? service.name}
                  key={image.id}
                  src={image.url}
                />
              ))}
            </div>
          </div>

          <div className="customer-detail-copy">
            <p className="customer-eyebrow">{service.categoryName}</p>
            <h1>{service.name}</h1>
            <p>{serviceExcerpt(service)}</p>
            <div className="customer-detail-facts">
              <span>
                <Clock3 size={17} />
                {service.durationMinutes} minutes
              </span>
              <span>
                <ShieldCheck size={17} />
                Hygiene-first service
              </span>
              <span>
                <CreditCard size={17} />
                Secure checkout
              </span>
              <span>
                <BadgePercent size={17} />
                GST {((service.gstRateBps ?? 0) / 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <aside className="customer-booking-card">
            <span className="customer-service-badge">Book at home</span>
            <div>
              <strong>{servicePriceLabel(service, dealNowMs)}</strong>
              {strikePrice ? <del>{formatMoney(strikePrice)}</del> : null}
              {savings ? <small>Save {formatMoney(savings)}</small> : null}
            </div>
            <p>
              Add this service to cart, choose a slot, verify mobile OTP and
              complete checkout.
            </p>
            <button
              className="customer-gold-button"
              onClick={() => openTierSelection(service, 0, true)}
              type="button"
            >
              Add and choose slot
              <ChevronRight size={18} />
            </button>
            <a
              className="customer-outline-button"
              href={`tel:${catalogue?.business.supportPhone ?? ""}`}
            >
              <Phone size={18} />
              Talk to support
            </a>
          </aside>
        </div>

        <div className="customer-detail-content-grid">
          <article className="customer-detail-panel">
            <p className="customer-eyebrow">Included care</p>
            <h2>What this service includes</h2>
            {service.inclusions.length > 0 ? (
              <ul className="customer-check-list">
                {service.inclusions.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={17} />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Detailed inclusions can be managed from the admin service
                catalogue.
              </p>
            )}
          </article>

          <article className="customer-detail-panel customer-detail-panel-dark">
            <p className="customer-eyebrow">Before booking</p>
            <h2>Good to know</h2>
            <ul className="customer-check-list">
              {serviceNotes.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={17} />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>

        {relatedServices.length > 0 ? (
          <section className="customer-related-services">
            <div className="customer-section-head customer-section-head-row">
              <div>
                <p className="customer-eyebrow">Customers also view</p>
                <h2>More in {service.categoryName}</h2>
              </div>
              <a
                className="customer-link-button"
                href={`/categories/${service.categorySlug}`}
              >
                View category
                <ChevronRight size={16} />
              </a>
            </div>
            <div className="customer-service-grid">
              {relatedServices.map((relatedService, index) =>
                renderServiceCard(relatedService, index + 1),
              )}
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  function renderReviews(): React.ReactElement {
    const visibleReviews =
      publicReviews.length > 0 ? publicReviews : FALLBACK_PUBLIC_REVIEWS;
    const averageRating =
      visibleReviews.length > 0
        ? visibleReviews.reduce((total, review) => total + review.rating, 0) /
          visibleReviews.length
        : null;
    const showControls = visibleReviews.length > 1;

    return (
      <section className="customer-review-section" id="reviews">
        <div className="customer-client-love-head">
          <p className="customer-client-love-kicker">Client love</p>
          <h2>Trusted by clients who prefer private care</h2>
          <p>
            Real stories from clients who booked, relaxed and returned for the
            experience.
          </p>
        </div>
        <div className="customer-client-love-shell">
          {showControls ? (
            <button
              aria-label="Show previous review"
              className="customer-client-love-arrow customer-client-love-arrow-left"
              onClick={() => moveReviewSlide(-1)}
              type="button"
            >
              <ChevronLeft size={26} />
            </button>
          ) : null}
          <div
            className="customer-client-love-viewport"
            ref={reviewCarouselRef}
          >
            <div className="customer-client-love-track">
              {visibleReviews.map((review, reviewIndex) => {
                const highlights =
                  review.highlights.length > 0
                    ? review.highlights
                    : review.comment
                      ? [review.comment]
                      : review.serviceNames;

                return (
                  <article
                    className="customer-client-love-card"
                    data-review-index={reviewIndex}
                    key={review.id}
                  >
                    <span className="customer-client-love-quote">
                      <Quote size={25} />
                    </span>
                    <h3>{review.customerName}</h3>
                    <div
                      aria-label={`${review.rating} out of 5 rating`}
                      className="customer-client-love-stars"
                    >
                      {[0, 1, 2, 3, 4].map((item) => (
                        <Star
                          fill={item < review.rating ? "currentColor" : "none"}
                          key={item}
                          size={24}
                        />
                      ))}
                    </div>
                    <ul>
                      {highlights.slice(0, 8).map((highlight) => (
                        <li key={highlight}>
                          <CheckCircle2 size={16} />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                    {review.comment && review.highlights.length > 0 ? (
                      <strong>{review.comment}</strong>
                    ) : null}
                    {review.serviceNames.length > 0 ? (
                      <small>{review.serviceNames.join(", ")}</small>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
          {showControls ? (
            <button
              aria-label="Show next review"
              className="customer-client-love-arrow customer-client-love-arrow-right"
              onClick={() => moveReviewSlide(1)}
              type="button"
            >
              <ChevronRight size={26} />
            </button>
          ) : null}
        </div>
        {averageRating !== null ? (
          <div className="customer-client-love-foot">
            <span>{averageRating.toFixed(1)}/5 from customer reviews</span>
          </div>
        ) : null}
      </section>
    );
  }

  function renderContactCta(): React.ReactElement {
    return (
      <section className="customer-contact-band">
        <div>
          <p className="customer-eyebrow">Need help choosing?</p>
          <h2>Tell us what you need, we will curate your booking.</h2>
        </div>
        <a className="customer-outline-light-button" href="/contact">
          Contact support
          <MessageCircle size={18} />
        </a>
      </section>
    );
  }

  function renderBookingReviewPanel(
    booking: CustomerBooking,
  ): React.ReactElement | null {
    if (booking.review) {
      return (
        <div className="customer-booking-review-state">
          <strong>Review submitted</strong>
          <span>
            {booking.review.status === "APPROVED" &&
            booking.review.showOnHomepage
              ? "Approved and visible on homepage"
              : `${booking.review.status.toLowerCase()} admin moderation`}
          </span>
        </div>
      );
    }

    if (!bookingCanReceiveReview(booking)) {
      return null;
    }

    if (reviewDraft.bookingId !== booking.id) {
      return (
        <button
          className="customer-outline-button customer-review-start-button"
          onClick={() => openReviewForm(booking)}
          type="button"
        >
          <Star size={17} />
          Write review
        </button>
      );
    }

    return (
      <form
        className="customer-booking-review-form"
        onSubmit={(event) => void submitReview(event, booking)}
      >
        <fieldset>
          <legend>Rating</legend>
          <div className="customer-review-rating-input">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                aria-label={`${rating} star rating`}
                className={rating <= reviewDraft.rating ? "is-selected" : ""}
                key={rating}
                onClick={() =>
                  setReviewDraft((current) => ({ ...current, rating }))
                }
                type="button"
              >
                <Star fill="currentColor" size={20} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Service points</legend>
          <div className="customer-review-check-grid">
            {REVIEW_HIGHLIGHT_OPTIONS.map((highlight) => (
              <label key={highlight}>
                <input
                  checked={reviewDraft.highlights.includes(highlight)}
                  onChange={() => toggleReviewHighlight(highlight)}
                  type="checkbox"
                />
                <span>{highlight}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="customer-review-comment-field">
          Comment
          <textarea
            maxLength={1200}
            onChange={(event) =>
              setReviewDraft((current) => ({
                ...current,
                comment: event.target.value,
              }))
            }
            placeholder="Add anything else about your experience"
            value={reviewDraft.comment}
          />
        </label>
        <div className="customer-review-form-actions">
          <button
            className="customer-gold-button"
            disabled={reviewSubmittingBookingId === booking.id}
            type="submit"
          >
            {reviewSubmittingBookingId === booking.id ? (
              <Loader2 size={17} />
            ) : (
              <Star size={17} />
            )}
            Submit review
          </button>
          <button
            className="customer-outline-button"
            onClick={() =>
              setReviewDraft({
                bookingId: null,
                rating: 5,
                highlights: [],
                comment: "",
              })
            }
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  function renderAccountHeader(
    activePage: CustomerAccountPage,
    eyebrow: string,
    title: string,
    subtitle: string,
  ): React.ReactElement {
    return (
      <>
        <div className="customer-section-head customer-section-head-row">
          <div>
            <p className="customer-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {user ? (
            <button
              className="customer-outline-button"
              onClick={logout}
              type="button"
            >
              <LogOut size={17} />
              Logout
            </button>
          ) : null}
        </div>
        {renderAccountNav(activePage)}
      </>
    );
  }

  function renderAccountNav(
    activePage: CustomerAccountPage,
  ): React.ReactElement {
    const items: Array<{
      key: CustomerAccountPage;
      href: string;
      label: string;
    }> = [
      { key: "account", href: "/account", label: "Overview" },
      { key: "orders", href: "/orders", label: "Orders" },
      { key: "payments", href: "/payments", label: "Payments" },
      { key: "addresses", href: "/addresses", label: "Addresses" },
      { key: "cart", href: "/cart", label: "Cart" },
    ];

    return (
      <nav className="customer-account-nav" aria-label="Customer account pages">
        {items.map((item) => (
          <a
            className={activePage === item.key ? "is-active" : ""}
            href={item.href}
            key={item.key}
          >
            {item.label}
          </a>
        ))}
      </nav>
    );
  }

  function renderSignedOutPanel(message: string): React.ReactElement {
    return (
      <div className="customer-account-grid customer-single-panel-grid">
        <section className="customer-panel customer-auth-required">
          <UserRound size={34} />
          <h2>Login or register</h2>
          <p>{message}</p>
          <div className="customer-inline-actions">
            <button
              className="customer-gold-button"
              onClick={openAuthDialog}
              type="button"
            >
              Login / Register
            </button>
            <a className="customer-outline-button" href="/services">
              Browse services
            </a>
          </div>
        </section>
      </div>
    );
  }

  function formatAddressLine(address: CustomerAddress): string {
    return `${address.line1}${address.line2 ? `, ${address.line2}` : ""}`;
  }

  function renderTierSelectionModal(): React.ReactElement | null {
    if (!tierSelection) {
      return null;
    }

    const tiers = serviceTierOptions(tierSelection.service, dealNowMs);

    return (
      <div className="customer-choice-modal-overlay" role="presentation">
        <section
          aria-label={`Choose ${tierSelection.service.name} tier`}
          aria-modal="true"
          className="customer-choice-modal"
          role="dialog"
        >
          <button
            aria-label="Close tier selector"
            className="customer-choice-modal-close"
            onClick={() => setTierSelection(null)}
            type="button"
          >
            <X size={24} />
          </button>
          <header>
            <p className="customer-eyebrow">Choose experience</p>
            <h2>{tierSelection.service.name}</h2>
            <span>{tierSelection.service.categoryName}</span>
          </header>
          <div className="customer-tier-grid">
            {tiers.map((tier) => (
              <article className="customer-tier-card" key={tier.publicId}>
                <div>
                  <span>
                    {tier.tierType === "LUXURY" ? "Luxury" : "Premium"}
                  </span>
                  <h3>{tier.name}</h3>
                  <p>
                    {tier.description ??
                      "Professional doorstep salon service with clear pricing."}
                  </p>
                </div>
                {tier.productsUsed.length > 0 ? (
                  <ul>
                    {tier.productsUsed.slice(0, 4).map((product) => (
                      <li key={product}>
                        <CheckCircle2 size={15} />
                        {product}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <footer>
                  <div>
                    <strong>{formatMoney(tier.pricePaise)}</strong>
                    {tier.compareAtPricePaise &&
                    tier.compareAtPricePaise > tier.pricePaise ? (
                      <del>{formatMoney(tier.compareAtPricePaise)}</del>
                    ) : null}
                    <small>{formatDurationShort(tier.durationMinutes)}</small>
                  </div>
                  <button
                    className="customer-gold-button"
                    onClick={() =>
                      addServiceTierToCart(
                        tierSelection.service,
                        tier,
                        tierSelection.index,
                        tierSelection.quickCheckout,
                      )
                    }
                    type="button"
                  >
                    {tierSelection.quickCheckout ? "Book now" : "Add"}
                    <ChevronRight size={17} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderPackageEditorModal(): React.ReactElement | null {
    if (!packageEditor) {
      return null;
    }

    const rawTotalPaise = packageEditor.selections.reduce(
      (total, selection) => {
        const service = serviceById.get(selection.serviceId);

        if (!service) {
          return total;
        }

        const tier =
          serviceTierById(service, selection.serviceTierId) ??
          serviceTierOptions(service, dealNowMs)[0] ??
          null;
        const unitPricePaise =
          tier?.pricePaise ?? serviceEffectivePricePaise(service, dealNowMs);

        return total + unitPricePaise * selection.quantity;
      },
      0,
    );
    const discountedTotalPaise = Math.round(
      (rawTotalPaise * (10_000 - packageEditor.servicePackage.discountBps)) /
        10_000,
    );
    const packageTotalPaise = Math.max(
      packageEditor.servicePackage.minPricePaise,
      discountedTotalPaise,
    );

    return (
      <div className="customer-choice-modal-overlay" role="presentation">
        <section
          aria-label={`Edit ${packageEditor.servicePackage.name}`}
          aria-modal="true"
          className="customer-choice-modal customer-package-modal"
          role="dialog"
        >
          <button
            aria-label="Close package editor"
            className="customer-choice-modal-close"
            onClick={() => setPackageEditor(null)}
            type="button"
          >
            <X size={24} />
          </button>
          <header>
            <p className="customer-eyebrow">Package</p>
            <h2>{packageEditor.servicePackage.name}</h2>
            <span>
              Minimum {formatMoney(packageEditor.servicePackage.minPricePaise)}
              {" · "}
              {formatDurationShort(
                packageEditor.servicePackage.durationMinutes,
              )}
            </span>
          </header>
          {packageEditor.servicePackage.description ? (
            <p className="customer-package-modal-description">
              {packageEditor.servicePackage.description}
            </p>
          ) : null}
          <div className="customer-package-line-list">
            {packageEditor.servicePackage.items.map((packageItem) => {
              const selection = packageEditor.selections.find(
                (item) => item.packageItemId === packageItem.id,
              );
              const service = serviceById.get(packageItem.serviceId);

              if (!selection || !service) {
                return null;
              }

              const tierOptions = serviceTierOptions(service, dealNowMs);
              const selectedTier =
                serviceTierById(service, selection.serviceTierId) ??
                tierOptions[0] ??
                null;

              return (
                <article className="customer-package-line" key={packageItem.id}>
                  <div>
                    <strong>{packageItem.label ?? service.name}</strong>
                    <span>{service.name}</span>
                    {packageItem.serviceTierName ? (
                      <small>{packageItem.serviceTierName}</small>
                    ) : (
                      <select
                        aria-label={`Choose tier for ${service.name}`}
                        onChange={(event) =>
                          updatePackageLineTier(
                            packageItem.id,
                            event.currentTarget.value,
                          )
                        }
                        value={
                          selection.serviceTierId ?? selectedTier?.id ?? ""
                        }
                      >
                        {tierOptions.map((tier) => (
                          <option key={tier.publicId} value={tier.id}>
                            {tier.name} · {formatMoney(tier.pricePaise)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="customer-quantity">
                    <button
                      disabled={selection.quantity <= packageItem.minQuantity}
                      onClick={() =>
                        updatePackageLineQuantity(packageItem.id, -1)
                      }
                      type="button"
                    >
                      <Minus size={15} />
                    </button>
                    <span>{selection.quantity}</span>
                    <button
                      onClick={() =>
                        updatePackageLineQuantity(packageItem.id, 1)
                      }
                      type="button"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <footer className="customer-package-modal-footer">
            <div>
              <span>Package total</span>
              <strong>{formatMoney(packageTotalPaise)}</strong>
              <small>
                Admin minimum{" "}
                {formatMoney(packageEditor.servicePackage.minPricePaise)}
              </small>
            </div>
            <button
              className="customer-gold-button"
              onClick={addPackageEditorToCart}
              type="button"
            >
              {packageEditor.quickCheckout ? "Book package" : "Add package"}
              <ChevronRight size={17} />
            </button>
          </footer>
        </section>
      </div>
    );
  }

  function renderAddressChoiceList(): React.ReactElement {
    if (addresses.length === 0) {
      return (
        <div className="customer-empty-inline">
          <MapPin size={22} />
          <p>No saved addresses yet. Add one for your Lucknow service visit.</p>
        </div>
      );
    }

    return (
      <div className="customer-address-choice-list">
        {addresses.map((address) => {
          const isSelected = selectedAddressId === address.id;

          return (
            <button
              aria-pressed={isSelected}
              className={`customer-address-choice${
                isSelected ? " is-selected" : ""
              }`}
              key={address.id}
              onClick={() => selectCustomerAddress(address.id)}
              type="button"
            >
              <span className="customer-address-choice-icon">
                {isSelected ? <CheckCircle2 size={19} /> : <MapPin size={19} />}
              </span>
              <span className="customer-address-choice-copy">
                <span className="customer-address-choice-title">
                  <strong>{address.label}</strong>
                  {address.isDefault ? (
                    <small className="customer-status-chip">Default</small>
                  ) : null}
                </span>
                <span>{formatAddressLine(address)}</span>
                <em>
                  {address.city}, {address.region} {address.postalCode}
                </em>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderAddressForm(submitLabel: string): React.ReactElement {
    return (
      <form className="customer-address-form" onSubmit={saveCustomerAddress}>
        <div className="customer-form-grid customer-address-form-grid">
          <label className="customer-field-full">
            Flat / house / building no.
            <input
              onChange={(event) =>
                setAddressForm((current) => ({
                  ...current,
                  line1: event.target.value,
                }))
              }
              placeholder="Flat 204, building name"
              required
              value={addressForm.line1}
            />
          </label>
          <label className="customer-field-full">
            Locality / street / sector
            <input
              onChange={(event) =>
                setAddressForm((current) => ({
                  ...current,
                  line2: event.target.value,
                }))
              }
              placeholder="Gomti Nagar, near landmark"
              required
              value={addressForm.line2}
            />
          </label>
        </div>
        <p className="customer-address-modal-kicker">Search & select on map</p>
        <div className="customer-form-grid customer-address-form-grid">
          <label className="customer-field-full">
            Search area, landmark, or pin code
            <input
              maxLength={20}
              onChange={(event) =>
                setAddressForm((current) => ({
                  ...current,
                  postalCode: event.target.value,
                }))
              }
              placeholder="Search area, landmark, or pin code"
              required
              value={addressForm.postalCode}
            />
          </label>
        </div>
        <p className="customer-address-service-note">
          Service area: Lucknow, Uttar Pradesh
        </p>
        <button
          className="customer-gold-button"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </form>
    );
  }

  function renderAddressSummaryButton(): React.ReactElement {
    return (
      <button
        className="customer-address-summary-button"
        onClick={openAddressPicker}
        type="button"
      >
        <MapPin size={22} />
        <span>
          <strong>
            {selectedAddress ? selectedAddress.label : "Choose service address"}
          </strong>
          <small>
            {selectedAddress
              ? formatAddressLine(selectedAddress)
              : "Select a saved address or add a new one"}
          </small>
          {selectedAddress ? (
            <em>
              {selectedAddress.city}, {selectedAddress.region}{" "}
              {selectedAddress.postalCode}
            </em>
          ) : null}
        </span>
        <ChevronRight size={20} />
      </button>
    );
  }

  function renderAddressPickerModal(): React.ReactElement {
    return (
      <section
        aria-label="Service location"
        aria-modal="true"
        className="customer-address-modal-overlay"
        role="dialog"
      >
        <div className="customer-address-modal customer-address-picker-modal">
          <div className="customer-address-modal-hero">
            <div>
              <h2>Service location</h2>
              <p>
                Choose where you want the service, or add a new Lucknow address.
              </p>
            </div>
            <button
              aria-label="Close service location"
              className="customer-address-modal-close"
              onClick={closeAddressModal}
              type="button"
            >
              <X size={24} />
            </button>
          </div>
          <div className="customer-address-modal-body">
            {renderAddressChoiceList()}
            <button
              className="customer-address-add-button"
              onClick={openAddressFormModal}
              type="button"
            >
              <Plus size={18} />
              Add new address
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderAddressFormModal(): React.ReactElement {
    return (
      <section
        aria-label="Add address"
        aria-modal="true"
        className="customer-address-modal-overlay"
        role="dialog"
      >
        <div className="customer-address-modal customer-address-form-modal">
          <button
            aria-label="Close add address"
            className="customer-address-modal-close"
            onClick={closeAddressModal}
            type="button"
          >
            <X size={24} />
          </button>
          <div className="customer-address-form-title">
            <h2>Add address</h2>
            <p>
              Add flat and locality details so the professional can reach you
              without calls.
            </p>
          </div>
          <div className="customer-address-modal-body">
            <p className="customer-address-modal-kicker">Address details</p>
            {renderAddressForm("Save address")}
            {addresses.length > 0 ? (
              <button
                className="customer-address-back-button"
                onClick={() => setAddressModalStep("choose")}
                type="button"
              >
                <ChevronLeft size={18} />
                Back to saved addresses
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  function renderAddressModals(): React.ReactElement | null {
    if (!addressModalStep || !user) {
      return null;
    }

    return addressModalStep === "choose"
      ? renderAddressPickerModal()
      : renderAddressFormModal();
  }

  function renderBookingCards(
    bookingItems: CustomerBooking[],
    showOrderAgain: boolean,
  ): React.ReactElement {
    if (bookingItems.length === 0) {
      return (
        <div className="customer-empty-inline">
          <CalendarCheck size={22} />
          <p>No bookings yet.</p>
        </div>
      );
    }

    const orderedBookings = [...bookingItems].sort((left, right) => {
      const leftDate = dateValueMs(left.scheduledStartAt) ?? 0;
      const rightDate = dateValueMs(right.scheduledStartAt) ?? 0;
      return rightDate - leftDate;
    });

    return (
      <div className="customer-booking-list">
        {orderedBookings.map((booking) => (
          <article key={booking.id}>
            <div className="customer-booking-list-head">
              <div>
                <strong>Booking #{booking.publicId.slice(-8)}</strong>
                <span>{formatBookingDate(booking.scheduledStartAt)}</span>
              </div>
              <span className="customer-status-chip">{booking.status}</span>
            </div>
            <p>{booking.items.map((item) => item.serviceName).join(", ")}</p>
            <small>
              {formatMoney(booking.totalPaise)} ·{" "}
              {booking.staff?.status ?? "Professional pending"}
            </small>
            <small>
              {booking.address.line1}, {booking.address.city}
            </small>
            {showOrderAgain ? (
              <div className="customer-booking-actions">
                <button
                  className="customer-outline-button"
                  onClick={() => orderAgain(booking)}
                  type="button"
                >
                  <ShoppingBag size={17} />
                  Order again
                </button>
              </div>
            ) : null}
            {renderBookingReviewPanel(booking)}
          </article>
        ))}
      </div>
    );
  }

  function renderCartValuePanel(): React.ReactElement {
    return (
      <aside className="customer-panel customer-cart-value-panel">
        <h2>Current cart</h2>
        {cartItems.length === 0 ? (
          <p>No services are in your cart right now.</p>
        ) : (
          <div className="customer-summary-lines">
            {cartItems.map((item) => (
              <div key={cartItemKey(item)}>
                <span>
                  {item.name}
                  {item.tierName ? ` (${item.tierName})` : ""} x {item.quantity}
                </span>
                <strong>{formatMoney(item.pricePaise * item.quantity)}</strong>
              </div>
            ))}
            <div>
              <span>Estimated duration</span>
              <strong>{cartDuration} min</strong>
            </div>
            <div className="customer-summary-total">
              <span>Subtotal</span>
              <strong>{formatMoney(cartTotalPaise)}</strong>
            </div>
          </div>
        )}
        <a className="customer-gold-button" href="/cart">
          Open cart
        </a>
      </aside>
    );
  }

  function renderPaymentList(): React.ReactElement {
    const paymentRows = bookings
      .flatMap((booking) =>
        booking.payments.map((payment) => ({
          booking,
          payment,
        })),
      )
      .sort((left, right) => {
        const leftDate = dateValueMs(left.payment.createdAt) ?? 0;
        const rightDate = dateValueMs(right.payment.createdAt) ?? 0;
        return rightDate - leftDate;
      });

    if (paymentRows.length === 0) {
      return (
        <div className="customer-empty-inline">
          <CreditCard size={22} />
          <p>Payments will appear here after checkout starts.</p>
        </div>
      );
    }

    return (
      <div className="customer-payment-list">
        {paymentRows.map(({ booking, payment }) => (
          <article key={payment.id}>
            <div>
              <strong>{formatMoney(payment.amountPaise)}</strong>
              <span className="customer-status-chip">{payment.status}</span>
            </div>
            <p>Booking #{booking.publicId.slice(-8)}</p>
            <small>
              {payment.provider} ·{" "}
              {formatBookingDate(payment.capturedAt ?? payment.createdAt)}
            </small>
            {payment.providerRef ? <small>{payment.providerRef}</small> : null}
          </article>
        ))}
      </div>
    );
  }

  function renderAuthPage(): React.ReactElement {
    return renderAuthModal(true);
  }

  function renderAuthModal(routePage: boolean): React.ReactElement {
    const displayPhone = formatIndianPhoneDisplay(
      otpPhone ?? user?.phone ?? authPhone,
    );
    const localPhone = normalizeIndianMobileInput(otpPhone ?? authPhone);
    const dialogClassName = `customer-auth-dialog${
      authStep === "profile" ? " customer-auth-dialog-profile" : ""
    }`;
    const genderOptions: Array<[AuthGender, string]> = [
      ["FEMALE", "Female"],
      ["MALE", "Male"],
      ["OTHER", "Others"],
    ];
    const closeControl = routePage ? (
      <a
        aria-label="Close login"
        className="customer-auth-close-button"
        href="/"
      >
        <X size={26} />
      </a>
    ) : (
      <button
        aria-label="Close login"
        className="customer-auth-close-button"
        onClick={closeAuthDialog}
        type="button"
      >
        <X size={26} />
      </button>
    );

    return (
      <section
        aria-label="Customer login"
        aria-modal="true"
        className={
          routePage ? "customer-auth-modal-page" : "customer-auth-modal-overlay"
        }
        role="dialog"
      >
        <div className={dialogClassName}>
          {closeControl}
          {authStep === "profile" ? (
            <form
              className="customer-auth-profile-card"
              noValidate
              onSubmit={completeProfile}
            >
              <div className="customer-auth-profile-hero">
                <p>Step 2 · Profile</p>
                <h1>Tell us about you</h1>
                <span>
                  We use this for bookings, reminders, and a safer in-home
                  experience.
                </span>
              </div>
              <div className="customer-auth-profile-body">
                <label className="customer-auth-profile-field">
                  <span>Full name *</span>
                  <input
                    autoFocus
                    onChange={(event) =>
                      setAuthProfileForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Your full name"
                    value={authProfileForm.name}
                  />
                </label>
                <label className="customer-auth-profile-field">
                  <span>Mobile number *</span>
                  <input readOnly value={displayPhone} />
                </label>
                <label className="customer-auth-profile-field">
                  <span>Work email</span>
                  <input
                    inputMode="email"
                    onChange={(event) =>
                      setAuthProfileForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="name@example.com"
                    type="email"
                    value={authProfileForm.email}
                  />
                </label>
                <label className="customer-auth-profile-field">
                  <span>Date of birth *</span>
                  <input
                    onChange={(event) =>
                      setAuthProfileForm((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                    type="date"
                    value={authProfileForm.dateOfBirth}
                  />
                </label>
                <div className="customer-auth-gender-group">
                  <p>Gender</p>
                  <div>
                    {genderOptions.map(([value, label]) => (
                      <button
                        className={
                          authProfileForm.gender === value ? "is-selected" : ""
                        }
                        key={value}
                        onClick={() =>
                          setAuthProfileForm((current) => ({
                            ...current,
                            gender: value,
                          }))
                        }
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="customer-auth-safe-copy">
                  Encrypted in transit. We never sell your data.
                </p>
                <button
                  className="customer-auth-primary-button"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? <Loader2 size={20} /> : null}
                  Save & continue
                </button>
              </div>
            </form>
          ) : (
            <>
              <a className="customer-auth-dialog-brand" href="/">
                <span>{BUSINESS_LOGO_PRIMARY}</span>
                <small>{BUSINESS_LOGO_SECONDARY}</small>
              </a>
              <p className="customer-auth-welcome">Welcome</p>
              <h1>
                {authStep === "otp"
                  ? "Enter OTP"
                  : user
                    ? "Signed in"
                    : "Log in or sign up"}
              </h1>
              <p>
                {authStep === "otp"
                  ? `Code sent to ${displayPhone}`
                  : user
                    ? "Your customer account is active."
                    : "We will text you a one-time code to verify your mobile number."}
              </p>
              {user ? (
                <div className="customer-auth-signed-in-card">
                  <CheckCircle2 size={34} />
                  <h2>{user.displayName}</h2>
                  <p>Your saved cart, bookings and addresses are available.</p>
                  <div>
                    <a href="/account">Account</a>
                    <a href="/orders">Orders</a>
                    {routePage ? (
                      <a href="/">Continue browsing</a>
                    ) : (
                      <button onClick={closeAuthDialog} type="button">
                        Continue browsing
                      </button>
                    )}
                  </div>
                </div>
              ) : authStep === "otp" ? (
                <form
                  className="customer-auth-dialog-form"
                  noValidate
                  onSubmit={verifyOtp}
                >
                  <label className="customer-auth-phone-field is-muted">
                    <span>Mobile number</span>
                    <div>
                      <strong>+91</strong>
                      <input readOnly value={localPhone} />
                    </div>
                  </label>
                  <label className="customer-auth-phone-field">
                    <span>One-time password</span>
                    <div>
                      <ShieldCheck size={22} />
                      <input
                        autoFocus
                        inputMode="numeric"
                        maxLength={6}
                        onChange={(event) =>
                          setAuthOtp(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="6-digit OTP"
                        value={authOtp}
                      />
                    </div>
                  </label>
                  <div className="customer-auth-inline-actions">
                    <button
                      className="customer-auth-change-button"
                      onClick={() => {
                        setAuthStep("phone");
                        setOtpPhone(null);
                        setAuthOtp("");
                      }}
                      type="button"
                    >
                      Change number
                    </button>
                    <button
                      className="customer-auth-resend-button"
                      disabled={submitting}
                      onClick={() => {
                        void sendOtpForPhone(localPhone);
                      }}
                      type="button"
                    >
                      Resend OTP
                    </button>
                  </div>
                  <button
                    className="customer-auth-primary-button"
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting ? <Loader2 size={20} /> : null}
                    Verify & continue
                  </button>
                </form>
              ) : (
                <form
                  className="customer-auth-dialog-form"
                  noValidate
                  onSubmit={requestOtp}
                >
                  <label className="customer-auth-phone-field">
                    <span>Mobile number</span>
                    <div>
                      <strong>+91</strong>
                      <ChevronDown size={18} />
                      <input
                        autoFocus
                        inputMode="tel"
                        maxLength={10}
                        onChange={(event) =>
                          setAuthPhone(
                            normalizeIndianMobileInput(event.target.value),
                          )
                        }
                        placeholder="10-digit number"
                        value={authPhone}
                      />
                    </div>
                  </label>
                  <button
                    className="customer-auth-primary-button"
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting ? <Loader2 size={20} /> : null}
                    Send OTP
                  </button>
                </form>
              )}
              <p className="customer-auth-terms">
                By continuing, you agree to our{" "}
                <a href="/terms-and-conditions">Terms & conditions</a> and{" "}
                <a href="/privacy-policy">Privacy policy</a>.
              </p>
              <p className="customer-auth-made-in">
                Made with care in Lucknow, India
              </p>
            </>
          )}
        </div>
      </section>
    );
  }

  function renderAccount(): React.ReactElement {
    return (
      <section className="customer-account-page">
        {renderAccountHeader(
          "account",
          "Customer account",
          "Bookings and profile",
          "Manage your cart, saved addresses, bookings and payment records.",
        )}
        {!user ? (
          renderSignedOutPanel("Sign in to view your customer account.")
        ) : (
          <div className="customer-account-grid">
            <section className="customer-panel">
              <h2>{user.displayName}</h2>
              <p>{user.phone}</p>
              <div className="customer-account-shortcuts">
                <a href="/orders">
                  <CalendarCheck size={19} />
                  <strong>{bookings.length}</strong>
                  Bookings
                </a>
                <a href="/payments">
                  <CreditCard size={19} />
                  <strong>
                    {bookings.reduce(
                      (total, booking) => total + booking.payments.length,
                      0,
                    )}
                  </strong>
                  Payments
                </a>
                <a href="/addresses">
                  <MapPin size={19} />
                  <strong>{addresses.length}</strong>
                  Addresses
                </a>
              </div>
            </section>
            <section className="customer-panel">
              <h2>Recent bookings</h2>
              {renderBookingCards(bookings.slice(0, 3), false)}
              <a className="customer-link-button" href="/orders">
                View all orders
                <ChevronRight size={17} />
              </a>
            </section>
            {renderCartValuePanel()}
          </div>
        )}
      </section>
    );
  }

  function renderAddressesPage(): React.ReactElement {
    return (
      <section className="customer-account-page">
        {renderAccountHeader(
          "addresses",
          "Saved addresses",
          "Your service addresses",
          "Addresses used during checkout are saved to make repeat bookings faster.",
        )}
        {!user ? (
          renderSignedOutPanel("Sign in to view saved service addresses.")
        ) : (
          <div className="customer-account-grid customer-single-panel-grid">
            <section className="customer-panel customer-address-page-panel">
              <div className="customer-address-page-head">
                <div>
                  <h2>Saved addresses</h2>
                  <p>
                    Choose a service address or add another Lucknow address.
                  </p>
                </div>
                <button
                  className="customer-gold-button"
                  onClick={openAddressPicker}
                  type="button"
                >
                  <MapPin size={18} />
                  Choose / add address
                </button>
              </div>
              {renderAddressChoiceList()}
            </section>
          </div>
        )}
      </section>
    );
  }

  function renderOrdersPage(): React.ReactElement {
    return (
      <section className="customer-account-page">
        {renderAccountHeader(
          "orders",
          "Orders",
          "Your bookings",
          "Review booked services, submit eligible reviews and order again.",
        )}
        {!user ? (
          renderSignedOutPanel("Sign in to view bookings and order again.")
        ) : (
          <div className="customer-orders-layout">
            <section className="customer-panel">
              <h2>Bookings</h2>
              {renderBookingCards(bookings, true)}
            </section>
            {renderCartValuePanel()}
          </div>
        )}
      </section>
    );
  }

  function renderPaymentsPage(): React.ReactElement {
    return (
      <section className="customer-account-page">
        {renderAccountHeader(
          "payments",
          "Payments",
          "Payment history",
          "Track checkout attempts, payment status and confirmed receipts.",
        )}
        {!user ? (
          renderSignedOutPanel("Sign in to view payment history.")
        ) : (
          <div className="customer-account-grid customer-single-panel-grid">
            <section className="customer-panel">
              <h2>Payments</h2>
              {renderPaymentList()}
            </section>
          </div>
        )}
      </section>
    );
  }

  function renderContact(): React.ReactElement {
    return (
      <section className="customer-contact-page">
        <div className="customer-section-head">
          <p className="customer-eyebrow">Support</p>
          <h1>Contact {catalogue?.business.name ?? BUSINESS_NAME}</h1>
          <p>
            Send a booking or service question. The request is stored in the
            admin contact list for follow-up.
          </p>
        </div>
        <form className="customer-contact-form" onSubmit={submitContact}>
          <label>
            Name
            <input
              onChange={(event) =>
                setContactForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
              value={contactForm.name}
            />
          </label>
          <label>
            Mobile
            <input
              inputMode="tel"
              onChange={(event) =>
                setContactForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              value={contactForm.phone}
            />
          </label>
          <label>
            Email
            <input
              inputMode="email"
              onChange={(event) =>
                setContactForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              type="email"
              value={contactForm.email}
            />
          </label>
          <label className="customer-field-full">
            Message
            <textarea
              onChange={(event) =>
                setContactForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              required
              value={contactForm.message}
            />
          </label>
          <button
            className="customer-gold-button"
            disabled={submitting}
            type="submit"
          >
            {submitting ? <Loader2 size={18} /> : <MessageCircle size={18} />}
            Send request
          </button>
        </form>
      </section>
    );
  }

  function renderCartPage(): React.ReactElement {
    const totalQuantity = cartItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const cartOriginalTotalPaise = cartItems.reduce((total, item) => {
      const service = serviceById.get(item.serviceId);
      const strikePrice = service
        ? serviceStrikePricePaise(service, dealNowMs)
        : item.compareAtPricePaise;
      const originalUnitPrice = Math.max(
        item.pricePaise,
        item.compareAtPricePaise ?? strikePrice ?? item.pricePaise,
      );

      return total + originalUnitPrice * item.quantity;
    }, 0);
    const cartDiscountPaise = Math.max(
      0,
      cartOriginalTotalPaise - cartTotalPaise,
    );

    return (
      <section className="customer-cart-page">
        <div className="customer-cart-hero">
          <div>
            <h1>Order summary</h1>
            <p>Review services before booking your slot</p>
          </div>
          <a className="customer-outline-button" href="/services">
            View all services
          </a>
        </div>
        {!cartHydrated ? (
          <section className="customer-cart-empty-state">
            <Loader2 size={42} />
            <h2>Loading cart</h2>
          </section>
        ) : cartItems.length === 0 ? (
          <section className="customer-cart-empty-state">
            <ShoppingBag size={52} />
            <h2>Your cart is empty</h2>
            <p>Choose a beauty service to start your at-home booking.</p>
            <a className="customer-gold-button" href="/services">
              Browse services
            </a>
          </section>
        ) : (
          <div className="customer-cart-layout">
            <section className="customer-cart-items-panel">
              <header>
                <div>
                  <h2>Selected services</h2>
                  <p>
                    {totalQuantity}{" "}
                    {totalQuantity === 1 ? "service" : "services"} in cart
                  </p>
                </div>
                <span className="customer-status-chip">{cartDuration} min</span>
              </header>
              <div className="customer-cart-row-list">
                {cartItems.map((item) => {
                  const service = serviceById.get(item.serviceId);
                  const itemKey = cartItemKey(item);
                  const strikePrice =
                    item.compareAtPricePaise ??
                    (service
                      ? serviceStrikePricePaise(service, dealNowMs)
                      : null);
                  const inclusionCount = service?.inclusions.length ?? 0;
                  const savings = strikePrice
                    ? (strikePrice - item.pricePaise) * item.quantity
                    : 0;

                  return (
                    <article className="customer-cart-row" key={itemKey}>
                      <a
                        className="customer-cart-row-media"
                        href={`/services/${item.slug}`}
                      >
                        <img alt="" src={item.imageUrl} />
                      </a>
                      <div className="customer-cart-row-copy">
                        <a href={`/services/${item.slug}`}>{item.name}</a>
                        {item.tierName || item.packageName ? (
                          <span className="customer-cart-row-tier">
                            {[item.packageName, item.tierName]
                              .filter((value): value is string =>
                                Boolean(value),
                              )
                              .join(" · ")}
                          </span>
                        ) : null}
                        <span className="customer-cart-row-service-meta">
                          {inclusionCount > 0
                            ? `Includes ${inclusionCount} steps`
                            : "Includes service essentials"}
                        </span>
                        <span className="customer-cart-row-price-line">
                          <strong>{formatMoney(item.pricePaise)}</strong>
                          {strikePrice ? (
                            <small>{formatMoney(strikePrice)}</small>
                          ) : null}
                          <b>{formatDurationShort(item.durationMinutes)}</b>
                        </span>
                        {savings > 0 ? (
                          <span className="customer-cart-save-pill">
                            Save {formatMoney(savings)}
                          </span>
                        ) : null}
                      </div>
                      <div className="customer-cart-row-actions">
                        <div
                          aria-label={`${item.name} quantity`}
                          className="customer-quantity"
                        >
                          <button
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => updateCartQuantity(itemKey, -1)}
                            disabled={item.quantity <= item.minQuantity}
                            type="button"
                          >
                            <Minus size={15} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            aria-label={`Add one ${item.name}`}
                            onClick={() => updateCartQuantity(itemKey, 1)}
                            type="button"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                        <button
                          className="customer-cart-remove"
                          onClick={() => removeCartItem(itemKey)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                      <strong>
                        {formatMoney(item.pricePaise * item.quantity)}
                      </strong>
                    </article>
                  );
                })}
              </div>
            </section>
            <aside className="customer-cart-summary-panel">
              <h2>Price details</h2>
              <p>
                Subtotal, discount, delivery, and your total before you choose a
                slot.
              </p>
              <div className="customer-summary-lines">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatMoney(cartOriginalTotalPaise)}</strong>
                </div>
                <div className="is-discount">
                  <span>Discount</span>
                  <strong>-{formatMoney(cartDiscountPaise)}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong>Free</strong>
                </div>
                <div className="customer-summary-total">
                  <span>Total</span>
                  <strong>{formatMoney(cartTotalPaise)}</strong>
                </div>
              </div>
              <div className="customer-cart-summary-section customer-cart-address-section">
                <p>Service address</p>
                {renderAddressSummaryButton()}
              </div>
              <div className="customer-cart-summary-section">
                <p>Date & time</p>
                <a href="/checkout">
                  <CalendarCheck size={22} />
                  <span>
                    <strong>Pick date & time below</strong>
                    <small>{formatDurationShort(cartDuration)}</small>
                  </span>
                  <ChevronRight size={20} />
                </a>
              </div>
              {catalogueOffline ? (
                <button className="customer-gold-button" disabled type="button">
                  Checkout unavailable
                </button>
              ) : (
                <a className="customer-gold-button" href="/checkout">
                  Proceed to checkout
                  <ChevronRight size={18} />
                </a>
              )}
              <a className="customer-outline-button" href="/services">
                Continue browsing
              </a>
            </aside>
          </div>
        )}
      </section>
    );
  }

  function renderCheckoutPage(): React.ReactElement {
    if (!cartHydrated) {
      return (
        <section className="customer-checkout-page">
          <section className="customer-cart-empty-state">
            <Loader2 size={42} />
            <h2>Loading cart</h2>
          </section>
        </section>
      );
    }

    if (cartItems.length === 0 && checkoutStep !== "success") {
      return (
        <section className="customer-checkout-page">
          <section className="customer-cart-empty-state">
            <ShoppingBag size={52} />
            <h2>Your cart is empty</h2>
            <p>Add services before choosing a slot.</p>
            <a className="customer-gold-button" href="/services">
              Browse services
            </a>
          </section>
        </section>
      );
    }

    return (
      <section className="customer-checkout-page">
        <div className="customer-section-head customer-section-head-row">
          <div>
            <p className="customer-eyebrow">
              {initialMode === "cart" ? "Cart" : "Checkout"}
            </p>
            <h1>Review cart and complete booking</h1>
            <p>
              Choose services, pick a Lucknow slot, verify OTP and confirm your
              payment.
            </p>
          </div>
          <a className="customer-outline-button" href="/services">
            <Plus size={17} />
            Add services
          </a>
        </div>
        <section className="customer-checkout customer-checkout-inline">
          <header>
            <div>
              <p className="customer-eyebrow">Checkout</p>
              <h2>Complete your booking</h2>
            </div>
          </header>
          <div className="customer-stepper">
            {[
              ["cart", "Cart"],
              ["slot", "Slot"],
              ["auth", "Login"],
              ["address", "Address"],
              ["payment", "Payment"],
              ["success", "Done"],
            ].map(([key, label]) => (
              <span
                aria-current={checkoutStep === key ? "step" : undefined}
                className={checkoutStep === key ? "is-active" : ""}
                key={key}
              >
                {label}
              </span>
            ))}
          </div>
          <div
            className={
              checkoutStep === "success"
                ? "customer-checkout-body customer-checkout-body-success"
                : "customer-checkout-body"
            }
          >
            <div className="customer-checkout-main">
              {checkoutStep === "cart" ? renderCartStep() : null}
              {checkoutStep === "slot" ? renderSlotStep() : null}
              {checkoutStep === "auth" ? renderAuthStep() : null}
              {checkoutStep === "address" ? renderAddressStep() : null}
              {checkoutStep === "payment" ? renderPaymentStep() : null}
              {checkoutStep === "success" ? renderSuccessStep() : null}
            </div>
            {checkoutStep !== "success" ? renderOrderSummary() : null}
          </div>
        </section>
      </section>
    );
  }

  function renderCartStep(): React.ReactElement {
    return (
      <section className="customer-panel">
        <h3>Your cart</h3>
        {cartItems.length === 0 ? (
          <p>Add a service from the catalogue to start checkout.</p>
        ) : (
          <div className="customer-cart-list">
            {cartItems.map((item) => {
              const itemKey = cartItemKey(item);

              return (
                <article key={itemKey}>
                  <img alt="" src={item.imageUrl} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {[item.packageName, item.tierName]
                        .filter((value): value is string => Boolean(value))
                        .join(" · ") || "Selected service"}
                    </span>
                    <span>
                      {item.durationMinutes} min ·{" "}
                      {formatMoney(item.pricePaise)}
                    </span>
                  </div>
                  <div className="customer-quantity">
                    <button
                      disabled={item.quantity <= item.minQuantity}
                      onClick={() => updateCartQuantity(itemKey, -1)}
                      type="button"
                    >
                      <Minus size={15} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(itemKey, 1)}
                      type="button"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <button
          className="customer-gold-button"
          disabled={cartItems.length === 0 || catalogueOffline}
          onClick={continueFromCart}
          type="button"
        >
          Choose slot
          <ChevronRight size={18} />
        </button>
      </section>
    );
  }

  function renderSlotStep(): React.ReactElement {
    return (
      <section className="customer-panel">
        <h3>Select date and time</h3>
        <div className="customer-date-grid">
          {dateOptions.map((date) => (
            <button
              className={selectedDate === date ? "is-selected" : ""}
              key={date}
              onClick={() => setSelectedDate(date)}
              type="button"
            >
              {dateLabel(date)}
            </button>
          ))}
        </div>
        {availabilityLoading ? (
          <div className="customer-loading">
            <Loader2 size={18} />
            Checking slots
          </div>
        ) : availability?.slots.length ? (
          <div className="customer-slot-grid">
            {availability.slots.map((slot) => (
              <button
                className={
                  selectedSlot?.startsAt === slot.startsAt ? "is-selected" : ""
                }
                key={slot.startsAt}
                onClick={() => setSelectedSlot(slot)}
                type="button"
              >
                <strong>{formatSlotTime(slot.startsAt)}</strong>
                <span>Slots available</span>
              </button>
            ))}
          </div>
        ) : (
          <p>No slots are available for this date.</p>
        )}
        <button
          className="customer-gold-button customer-slot-continue"
          onClick={() => setCheckoutStep(user ? "address" : "auth")}
          type="button"
        >
          Continue
          <ChevronRight size={18} />
        </button>
      </section>
    );
  }

  function renderAuthStep(): React.ReactElement {
    return (
      <section className="customer-panel customer-auth-required">
        <UserRound size={30} />
        <h3>Sign in to continue</h3>
        <p>
          Verify your mobile number to use saved addresses, bookings and payment
          records.
        </p>
        <button
          className="customer-gold-button"
          onClick={openAuthDialog}
          type="button"
        >
          <Phone size={17} />
          Login with OTP
        </button>
      </section>
    );
  }

  function renderAddressStep(): React.ReactElement {
    return (
      <section className="customer-panel">
        <h3>Service address</h3>
        {renderAddressSummaryButton()}
        <label className="customer-address-notes-field">
          Notes
          <textarea
            onChange={(event) => setBookingNotes(event.target.value)}
            placeholder="Gate code, preferred product, allergy notes"
            value={bookingNotes}
          />
        </label>
        <button
          className="customer-gold-button customer-checkout-action-button"
          disabled={submitting}
          onClick={createBooking}
          type="button"
        >
          {submitting ? <Loader2 size={18} /> : <CalendarCheck size={18} />}
          Create booking
        </button>
      </section>
    );
  }

  function renderPaymentStep(): React.ReactElement {
    return (
      <section className="customer-panel">
        <h3>Payment</h3>
        <div className="customer-pay-options">
          <button
            className={paymentChoice === "RAZORPAY" ? "is-selected" : ""}
            onClick={() => setPaymentChoice("RAZORPAY")}
            type="button"
          >
            <CreditCard size={19} />
            <span>
              Razorpay
              <small>UPI, card, net banking and wallets</small>
            </span>
          </button>
          <button
            className={
              paymentChoice === "PAY_AFTER_SERVICE" ? "is-selected" : ""
            }
            onClick={() => setPaymentChoice("PAY_AFTER_SERVICE")}
            type="button"
          >
            <Home size={19} />
            <span>
              Pay after service
              <small>Operational fallback for cash or direct UPI</small>
            </span>
          </button>
        </div>
        {developmentPayment ? (
          <div className="customer-dev-payment">
            <strong>Development Razorpay mode</strong>
            <span>
              Real Razorpay keys are not configured. Complete this local payment
              to confirm the booking and block the assigned staff slot.
            </span>
            <button
              className="customer-gold-button"
              disabled={submitting}
              onClick={() =>
                developmentPayment.developmentPaymentToken
                  ? void verifyPayment(developmentPayment.payment.id, {
                      developmentPaymentToken:
                        developmentPayment.developmentPaymentToken,
                    })
                  : undefined
              }
              type="button"
            >
              Complete development payment
            </button>
          </div>
        ) : (
          <button
            className="customer-gold-button"
            disabled={submitting}
            onClick={startPayment}
            type="button"
          >
            {submitting ? <Loader2 size={18} /> : <CreditCard size={18} />}
            {paymentChoice === "RAZORPAY"
              ? "Continue to Razorpay"
              : "Place order"}
          </button>
        )}
      </section>
    );
  }

  function renderSuccessStep(): React.ReactElement {
    const booking = successBooking ?? currentBooking;
    const bookingReference = booking
      ? `#${booking.publicId.slice(-8).toUpperCase()}`
      : null;

    return (
      <section aria-live="polite" className="customer-success">
        <div className="customer-success-card">
          <span className="customer-success-mark">
            <CheckCircle2 size={38} />
          </span>
          <span className="customer-status-chip">Confirmed</span>
          <h3>Booking confirmed</h3>
          <p>
            Your slot is saved. You can review details, payment status and
            updates from your orders.
          </p>
          {booking ? (
            <dl className="customer-success-summary">
              <div>
                <dt>Booking ID</dt>
                <dd>{bookingReference}</dd>
              </div>
              <div>
                <dt>Slot</dt>
                <dd>{formatBookingDate(booking.scheduledStartAt)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(booking.totalPaise)}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>
                  {formatAddressLine(booking.address)}, {booking.address.city}
                </dd>
              </div>
            </dl>
          ) : (
            <p>Your booking is confirmed.</p>
          )}
          <div className="customer-success-actions">
            <a className="customer-gold-button" href="/orders">
              View booking
              <ChevronRight size={17} />
            </a>
            <a className="customer-outline-button" href="/services">
              Book another service
            </a>
          </div>
        </div>
      </section>
    );
  }

  function renderOrderSummary(): React.ReactElement {
    return (
      <aside className="customer-summary">
        <h3>Order summary</h3>
        <div className="customer-summary-lines">
          {cartItems.map((item) => (
            <div key={cartItemKey(item)}>
              <span>
                {item.name}
                {item.tierName ? ` (${item.tierName})` : ""} x {item.quantity}
              </span>
              <strong>{formatMoney(item.pricePaise * item.quantity)}</strong>
            </div>
          ))}
          <div>
            <span>Estimated duration</span>
            <strong>{cartDuration} min</strong>
          </div>
          <div>
            <span>Taxes</span>
            <strong>Calculated on booking</strong>
          </div>
          <div className="customer-summary-total">
            <span>Subtotal</span>
            <strong>{formatMoney(cartTotalPaise)}</strong>
          </div>
        </div>
        <p className="customer-summary-note">
          Your professional is reserved after slot selection and booking
          confirmation. Taxes and payment status are finalized during checkout.
        </p>
      </aside>
    );
  }

  function renderFloatingCart(): React.ReactElement {
    return (
      <a className="customer-floating-cart" href="/cart">
        <ShoppingBag size={21} />
        <span>
          <strong>
            {cartItems.length} {cartItems.length === 1 ? "service" : "services"}
          </strong>
          <small>
            {formatMoney(cartTotalPaise)} · {cartDuration} min
          </small>
        </span>
        <ChevronRight size={20} />
      </a>
    );
  }

  function renderFooter(): React.ReactElement {
    const supportPhone = catalogue?.business.supportPhone ?? "+918112868347";
    const supportEmail =
      catalogue?.business.supportEmail ?? BUSINESS_SUPPORT_EMAIL;
    const businessName = catalogue?.business.name ?? BUSINESS_NAME;
    const addressLine = catalogue?.business.addressLine ?? BUSINESS_ADDRESS;
    const websiteUrl = catalogue?.business.websiteUrl ?? BUSINESS_WEBSITE_URL;
    const city = catalogue?.business.city ?? "Lucknow";

    return (
      <footer className="customer-footer">
        <div className="customer-footer-contact-row">
          <span>
            <MapPin size={18} />
            <strong>Find us</strong>
            {addressLine}
          </span>
          <a href={`tel:${supportPhone}`}>
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
            <a className="customer-brand customer-brand-light" href="/">
              <span className="customer-brand-mark">R</span>
              <span>
                {BUSINESS_LOGO_PRIMARY}
                <small>{BUSINESS_LOGO_SECONDARY}</small>
              </span>
            </a>
            <p>
              Professional beauty and grooming services at home in {city},
              backed by booking, payment and assignment workflows.
            </p>
          </div>
          <nav>
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
          <nav>
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
              Need help choosing a service? Contact support and we will guide
              you to the right care option.
            </p>
            <a href="/contact">
              Contact support
              <ChevronRight size={16} />
            </a>
          </div>
        </div>

        <div className="customer-footer-bottom">
          <p>
            Service availability, tax details and payment status are confirmed
            during checkout.
          </p>
          <span>{businessName}</span>
          <a href={websiteUrl} rel="noreferrer">
            replicahomesaloonservice.in
          </a>
        </div>

        <a
          aria-label="Chat on WhatsApp"
          className="customer-whatsapp"
          href="https://wa.me/918112868347"
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
}
