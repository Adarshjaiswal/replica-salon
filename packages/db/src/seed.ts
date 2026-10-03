import { hashPassword } from "@replica/auth";
import {
  permissionActionSchema,
  type PermissionAction,
  permissionResourceSchema,
  type PermissionResource,
} from "@replica/contracts";
import { prisma } from "./client.js";
import {
  AccountType,
  BookingStatus,
  PaymentStatus,
  PublishStatus,
  ReviewModerationStatus,
  ServiceTierType,
  StaffEngagementType,
  UserStatus,
  type Category,
  type Permission,
  type Prisma,
  type Service,
} from "./generated/client/index.js";

type PermissionGrant = {
  resource: PermissionResource;
  action: PermissionAction;
};

type SeedCategoryDefinition = {
  name: string;
  slug: string;
  legacySlugs?: string[];
  description: string;
  imageUrl: string;
  imageAltText: string;
  sortOrder: number;
};

type SeedServiceDefinition = {
  categorySlug: string;
  name: string;
  slug: string;
  legacySlugs?: string[];
  shortDescription: string;
  fullDescription: string;
  durationMinutes: number;
  pricePaise: number;
  compareAtPricePaise: number;
  dealPricePaise?: number;
  inclusions: string[];
  imageUrl: string;
  imageAltText: string;
  galleryImageUrls?: string[];
  featured: boolean;
  sortOrder: number;
};

type SeedReviewDefinition = {
  bookingPublicId: string;
  paymentProviderRef: string;
  customerName: string;
  phone: string;
  serviceSlug: string;
  rating: number;
  comment: string;
  highlights: string[];
  scheduledStartAt: string;
  createdAt: string;
  addressLine1: string;
  postalCode: string;
};

type SeedPackageDefinition = {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  minPricePaise: number;
  compareAtPricePaise: number;
  discountBps: number;
  durationMinutes: number;
  inclusions: string[];
  sortOrder: number;
  items: Array<{
    serviceSlug: string;
    tierType: ServiceTierType;
    label: string;
    quantity: number;
    minQuantity: number;
    sortOrder: number;
  }>;
};

type SeedStaffDefinition = {
  name: string;
  phone: string;
  employeeCode: string;
  engagementType: StaffEngagementType;
  serviceSlugs: string[];
};

const SEED_MEDIA_BUCKET = "seed-public";
const SEED_DEAL_STARTS_AT = "2026-01-01T00:00:00.000Z";
const SEED_DEAL_ENDS_AT = "2027-01-01T00:00:00.000Z";

const SERVICE_IMAGE_URLS = [
  "https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3993320/pexels-photo-3993320.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3997387/pexels-photo-3997387.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg?auto=compress&cs=tinysrgb&w=1200",
] as const;

const SEED_CATEGORIES: SeedCategoryDefinition[] = [
  {
    name: "Facials",
    slug: "facials",
    description: "Glow, cleanup and skin rituals delivered at home.",
    imageUrl: SERVICE_IMAGE_URLS[0],
    imageAltText: "Facial treatment setup",
    sortOrder: 1,
  },
  {
    name: "Waxing",
    slug: "waxing",
    description: "Hygienic at-home waxing with single-use essentials.",
    imageUrl: SERVICE_IMAGE_URLS[4],
    imageAltText: "Waxing service essentials",
    sortOrder: 2,
  },
  {
    name: "Mani Pedi",
    slug: "mani-pedi",
    legacySlugs: ["manicure-pedicure"],
    description: "Hands, feet and nail care with a clean doorstep setup.",
    imageUrl: SERVICE_IMAGE_URLS[2],
    imageAltText: "Manicure and pedicure care",
    sortOrder: 3,
  },
  {
    name: "Hair Spa",
    slug: "hair-spa",
    description: "Relaxing hair care and scalp treatments at home.",
    imageUrl: SERVICE_IMAGE_URLS[1],
    imageAltText: "Hair spa wash and care",
    sortOrder: 4,
  },
  {
    name: "Body Care",
    slug: "body-care",
    description: "Body cleanup, polishing and relaxing care packages.",
    imageUrl: SERVICE_IMAGE_URLS[5],
    imageAltText: "Body care service",
    sortOrder: 5,
  },
  {
    name: "Makeup",
    slug: "makeup",
    description: "Event-ready makeup, draping and styling at home.",
    imageUrl: SERVICE_IMAGE_URLS[6],
    imageAltText: "Makeup preparation",
    sortOrder: 6,
  },
];

const SEED_CATALOGUE_SERVICES: SeedServiceDefinition[] = [
  {
    categorySlug: "facials",
    name: "Signature Gold Facial",
    slug: "signature-gold-facial",
    legacySlugs: ["seed-glow-facial"],
    shortDescription:
      "A glow-focused facial with cleansing, massage and premium finishing care.",
    fullDescription:
      "A doorstep facial ritual designed for visible freshness, calm skin and a salon-grade finish at home.",
    durationMinutes: 75,
    pricePaise: 119900,
    compareAtPricePaise: 159900,
    dealPricePaise: 99900,
    inclusions: ["Deep cleansing", "Glow massage", "Single-use hygiene kit"],
    imageUrl: SERVICE_IMAGE_URLS[0],
    imageAltText: "Signature gold facial service",
    galleryImageUrls: [SERVICE_IMAGE_URLS[6], SERVICE_IMAGE_URLS[1]],
    featured: true,
    sortOrder: 10,
  },
  {
    categorySlug: "facials",
    name: "Korean Glass Glow Facial",
    slug: "korean-glass-glow-facial",
    shortDescription:
      "Layered cleansing, massage and mask care for a polished glow.",
    fullDescription:
      "A premium glow facial with skin prep, massage, targeted mask and finishing hydration.",
    durationMinutes: 80,
    pricePaise: 169900,
    compareAtPricePaise: 229900,
    dealPricePaise: 139900,
    inclusions: ["Skin analysis", "Hydrating mask", "Glow serum finish"],
    imageUrl: SERVICE_IMAGE_URLS[6],
    imageAltText: "Korean glass glow facial",
    galleryImageUrls: [SERVICE_IMAGE_URLS[0], SERVICE_IMAGE_URLS[5]],
    featured: true,
    sortOrder: 11,
  },
  {
    categorySlug: "facials",
    name: "Hydra Clean Facial",
    slug: "hydra-clean-facial",
    shortDescription: "Deep clean facial care for refreshed, hydrated skin.",
    fullDescription:
      "A comfort-led facial session with cleansing, exfoliation, hydration mask and after-care.",
    durationMinutes: 65,
    pricePaise: 139900,
    compareAtPricePaise: 179900,
    inclusions: ["Deep clean", "Hydration mask", "After-care finish"],
    imageUrl: SERVICE_IMAGE_URLS[0],
    imageAltText: "Hydra clean facial",
    featured: true,
    sortOrder: 12,
  },
  {
    categorySlug: "waxing",
    name: "Waxing Essentials",
    slug: "waxing-essentials",
    legacySlugs: ["seed-waxing-essentials"],
    shortDescription: "Smooth finish for arms, underarms and clean-up areas.",
    fullDescription:
      "A practical at-home waxing session with clear pricing, disposable essentials and calming finish.",
    durationMinutes: 60,
    pricePaise: 89900,
    compareAtPricePaise: 119900,
    dealPricePaise: 79900,
    inclusions: ["Pre-service skin prep", "Premium wax", "After-care finish"],
    imageUrl: SERVICE_IMAGE_URLS[4],
    imageAltText: "Waxing essentials service",
    galleryImageUrls: [SERVICE_IMAGE_URLS[5], SERVICE_IMAGE_URLS[2]],
    featured: true,
    sortOrder: 20,
  },
  {
    categorySlug: "waxing",
    name: "Rica Arms and Underarms",
    slug: "rica-arms-underarms",
    shortDescription:
      "Comfortable waxing for arms and underarms with premium wax.",
    fullDescription:
      "A focused Rica waxing service with hygiene-first prep and soothing post-wax care.",
    durationMinutes: 45,
    pricePaise: 69900,
    compareAtPricePaise: 99900,
    inclusions: ["Rica wax", "Disposable spatulas", "Soothing finish"],
    imageUrl: SERVICE_IMAGE_URLS[5],
    imageAltText: "Rica arms and underarms waxing",
    featured: false,
    sortOrder: 21,
  },
  {
    categorySlug: "waxing",
    name: "Full Body Waxing",
    slug: "full-body-waxing",
    shortDescription: "Full body waxing with clean setup and post-care finish.",
    fullDescription:
      "A complete waxing package for smooth skin with trained professionals and single-use essentials.",
    durationMinutes: 110,
    pricePaise: 199900,
    compareAtPricePaise: 259900,
    dealPricePaise: 169900,
    inclusions: ["Full body coverage", "Premium wax", "Post-wax care"],
    imageUrl: SERVICE_IMAGE_URLS[4],
    imageAltText: "Full body waxing service",
    featured: true,
    sortOrder: 22,
  },
  {
    categorySlug: "mani-pedi",
    name: "Manicure & Pedicure Ritual",
    slug: "manicure-pedicure-ritual",
    legacySlugs: ["seed-manicure-pedicure-ritual"],
    shortDescription:
      "Hand and foot care with soak, shaping, scrub and massage.",
    fullDescription:
      "A complete mani-pedi ritual for clean, polished hands and feet without visiting a salon.",
    durationMinutes: 90,
    pricePaise: 149900,
    compareAtPricePaise: 199900,
    dealPricePaise: 129900,
    inclusions: ["Nail shaping", "Scrub and massage", "Moisture lock"],
    imageUrl: SERVICE_IMAGE_URLS[2],
    imageAltText: "Manicure and pedicure ritual",
    galleryImageUrls: [SERVICE_IMAGE_URLS[3], SERVICE_IMAGE_URLS[5]],
    featured: true,
    sortOrder: 30,
  },
  {
    categorySlug: "mani-pedi",
    name: "Express Manicure",
    slug: "express-manicure",
    shortDescription: "Quick hand care with shaping, buffing and moisturising.",
    fullDescription:
      "A quick manicure for neat nails and refreshed hands before work, travel or events.",
    durationMinutes: 40,
    pricePaise: 49900,
    compareAtPricePaise: 69900,
    inclusions: ["Nail shaping", "Cuticle care", "Hand moisturiser"],
    imageUrl: SERVICE_IMAGE_URLS[2],
    imageAltText: "Express manicure service",
    featured: false,
    sortOrder: 31,
  },
  {
    categorySlug: "mani-pedi",
    name: "Spa Pedicure",
    slug: "spa-pedicure",
    shortDescription: "Foot soak, scrub and massage for refreshed feet.",
    fullDescription:
      "A relaxing pedicure with foot soak, exfoliation, nail shaping and massage.",
    durationMinutes: 50,
    pricePaise: 89900,
    compareAtPricePaise: 119900,
    inclusions: ["Foot soak", "Heel scrub", "Relaxing massage"],
    imageUrl: SERVICE_IMAGE_URLS[3],
    imageAltText: "Spa pedicure service",
    featured: true,
    sortOrder: 32,
  },
  {
    categorySlug: "hair-spa",
    name: "Relaxing Hair Spa",
    slug: "relaxing-hair-spa",
    legacySlugs: ["seed-hair-spa-ritual"],
    shortDescription:
      "A scalp and hair-care session designed for softness and shine.",
    fullDescription:
      "A nourishing home hair-spa service with scalp massage, conditioning and a neat service setup.",
    durationMinutes: 75,
    pricePaise: 149900,
    compareAtPricePaise: 219900,
    dealPricePaise: 119900,
    inclusions: ["Scalp massage", "Steam care", "Conditioning mask"],
    imageUrl: SERVICE_IMAGE_URLS[1],
    imageAltText: "Relaxing hair spa service",
    galleryImageUrls: [SERVICE_IMAGE_URLS[3], SERVICE_IMAGE_URLS[0]],
    featured: true,
    sortOrder: 40,
  },
  {
    categorySlug: "hair-spa",
    name: "Anti-Frizz Hair Spa",
    slug: "anti-frizz-hair-spa",
    shortDescription: "Conditioning care for smoother, softer hair at home.",
    fullDescription:
      "A smoothing hair spa with scalp massage, anti-frizz mask and careful rinse support.",
    durationMinutes: 85,
    pricePaise: 169900,
    compareAtPricePaise: 229900,
    inclusions: ["Anti-frizz mask", "Scalp massage", "Smooth finish"],
    imageUrl: SERVICE_IMAGE_URLS[1],
    imageAltText: "Anti-frizz hair spa",
    featured: true,
    sortOrder: 41,
  },
  {
    categorySlug: "hair-spa",
    name: "Head Massage and Hair Wash",
    slug: "head-massage-hair-wash",
    shortDescription: "A calming oil massage with hair wash support.",
    fullDescription:
      "A compact relaxation service with head massage, wash support and light conditioning.",
    durationMinutes: 50,
    pricePaise: 69900,
    compareAtPricePaise: 99900,
    inclusions: ["Oil massage", "Hair wash", "Light conditioning"],
    imageUrl: SERVICE_IMAGE_URLS[1],
    imageAltText: "Head massage and hair wash",
    featured: false,
    sortOrder: 42,
  },
  {
    categorySlug: "body-care",
    name: "Body Polishing",
    slug: "body-polishing",
    legacySlugs: ["seed-body-polishing"],
    shortDescription:
      "Body exfoliation and nourishing finish for refreshed skin.",
    fullDescription:
      "A premium body-care session with exfoliation, massage and hydration care.",
    durationMinutes: 100,
    pricePaise: 229900,
    compareAtPricePaise: 289900,
    dealPricePaise: 199900,
    inclusions: ["Gentle exfoliation", "Hydration care", "Clean setup"],
    imageUrl: SERVICE_IMAGE_URLS[5],
    imageAltText: "Body polishing service",
    galleryImageUrls: [SERVICE_IMAGE_URLS[0], SERVICE_IMAGE_URLS[6]],
    featured: true,
    sortOrder: 50,
  },
  {
    categorySlug: "body-care",
    name: "Back and Shoulder Massage",
    slug: "back-shoulder-massage",
    shortDescription: "Focused massage care for back, neck and shoulders.",
    fullDescription:
      "A targeted relaxation session for back and shoulder stiffness with a clean at-home setup.",
    durationMinutes: 55,
    pricePaise: 99900,
    compareAtPricePaise: 139900,
    inclusions: ["Back massage", "Shoulder relief", "Warm towel finish"],
    imageUrl: SERVICE_IMAGE_URLS[5],
    imageAltText: "Back and shoulder massage",
    featured: false,
    sortOrder: 51,
  },
  {
    categorySlug: "body-care",
    name: "De-Tan Body Cleanup",
    slug: "de-tan-body-cleanup",
    shortDescription: "Clean-up care for dullness with scrub and pack finish.",
    fullDescription:
      "A de-tan cleanup service with gentle exfoliation, body pack and hydration care.",
    durationMinutes: 80,
    pricePaise: 129900,
    compareAtPricePaise: 179900,
    inclusions: ["De-tan scrub", "Body pack", "Hydration care"],
    imageUrl: SERVICE_IMAGE_URLS[6],
    imageAltText: "De-tan body cleanup",
    featured: true,
    sortOrder: 52,
  },
  {
    categorySlug: "makeup",
    name: "Soft Glam Makeup",
    slug: "soft-glam-makeup",
    legacySlugs: ["seed-soft-glam-makeup"],
    shortDescription:
      "Polished natural makeup for small events and celebrations.",
    fullDescription:
      "A soft glam makeup session with skin prep, base, eye detail and finishing spray.",
    durationMinutes: 80,
    pricePaise: 249900,
    compareAtPricePaise: 329900,
    dealPricePaise: 219900,
    inclusions: ["Skin prep", "Soft glam base", "Finishing spray"],
    imageUrl: SERVICE_IMAGE_URLS[6],
    imageAltText: "Soft glam makeup service",
    galleryImageUrls: [SERVICE_IMAGE_URLS[0], SERVICE_IMAGE_URLS[2]],
    featured: true,
    sortOrder: 60,
  },
  {
    categorySlug: "makeup",
    name: "Party Makeup",
    slug: "party-makeup",
    shortDescription: "Camera-ready event makeup with neat skin prep.",
    fullDescription:
      "An at-home party makeup session for dinners, family events and celebrations.",
    durationMinutes: 95,
    pricePaise: 299900,
    compareAtPricePaise: 389900,
    inclusions: ["Skin prep", "Eye detail", "Long-wear finish"],
    imageUrl: SERVICE_IMAGE_URLS[6],
    imageAltText: "Party makeup service",
    featured: true,
    sortOrder: 61,
  },
  {
    categorySlug: "makeup",
    name: "Saree Draping and Hair Styling",
    slug: "saree-draping-hair-styling",
    shortDescription: "Draping and hair styling support for special occasions.",
    fullDescription:
      "A finishing service for saree draping, basic hair styling and event-ready polish.",
    durationMinutes: 70,
    pricePaise: 129900,
    compareAtPricePaise: 179900,
    inclusions: ["Saree draping", "Hair setting", "Final styling"],
    imageUrl: SERVICE_IMAGE_URLS[3],
    imageAltText: "Saree draping and hair styling",
    featured: false,
    sortOrder: 62,
  },
];

const SEED_REVIEWS: SeedReviewDefinition[] = [
  {
    bookingPublicId: "seed-review-booking-001",
    paymentProviderRef: "seed-review-payment-001",
    customerName: "Diksha",
    phone: "+919810000101",
    serviceSlug: "signature-gold-facial",
    rating: 5,
    comment: "I am satisfied with the services.",
    highlights: [
      "The professional arrived on time.",
      "The professional was excellent in all services.",
    ],
    scheduledStartAt: "2026-08-20T05:30:00.000Z",
    createdAt: "2026-08-20T09:45:00.000Z",
    addressLine1: "Gomti Nagar, Lucknow",
    postalCode: "226010",
  },
  {
    bookingPublicId: "seed-review-booking-002",
    paymentProviderRef: "seed-review-payment-002",
    customerName: "Tisha Mittal",
    phone: "+919810000102",
    serviceSlug: "relaxing-hair-spa",
    rating: 5,
    comment:
      "The professional was good and very clean. The service was amazing.",
    highlights: [
      "The professional groomed properly.",
      "The professional used disposable items before the service started.",
    ],
    scheduledStartAt: "2026-08-22T06:30:00.000Z",
    createdAt: "2026-08-22T10:20:00.000Z",
    addressLine1: "Indira Nagar, Lucknow",
    postalCode: "226016",
  },
  {
    bookingPublicId: "seed-review-booking-003",
    paymentProviderRef: "seed-review-payment-003",
    customerName: "Kanishka Maan",
    phone: "+919810000103",
    serviceSlug: "manicure-pedicure-ritual",
    rating: 5,
    comment: "Very good service.",
    highlights: [
      "The professional arrived on time.",
      "The professional confirmed availability before coming.",
      "The professional cleaned properly after the service.",
    ],
    scheduledStartAt: "2026-08-24T04:30:00.000Z",
    createdAt: "2026-08-24T08:25:00.000Z",
    addressLine1: "Hazratganj, Lucknow",
    postalCode: "226001",
  },
  {
    bookingPublicId: "seed-review-booking-004",
    paymentProviderRef: "seed-review-payment-004",
    customerName: "Pratibha Jaiswal",
    phone: "+919810000104",
    serviceSlug: "waxing-essentials",
    rating: 5,
    comment: "Excellent service. Everything was perfect.",
    highlights: [
      "The professional confirmed availability before coming.",
      "The professional used disposable items before the service started.",
      "I am satisfied with the services.",
    ],
    scheduledStartAt: "2026-08-25T07:00:00.000Z",
    createdAt: "2026-08-25T11:10:00.000Z",
    addressLine1: "Aliganj, Lucknow",
    postalCode: "226024",
  },
  {
    bookingPublicId: "seed-review-booking-005",
    paymentProviderRef: "seed-review-payment-005",
    customerName: "Radhika Sinha",
    phone: "+919810000105",
    serviceSlug: "body-polishing",
    rating: 4,
    comment: "Relaxing session and very polite professional.",
    highlights: [
      "The professional arrived on time.",
      "The professional cleaned properly after the service.",
      "The professional's behavior was exemplary.",
    ],
    scheduledStartAt: "2026-08-26T05:00:00.000Z",
    createdAt: "2026-08-26T09:15:00.000Z",
    addressLine1: "Mahanagar, Lucknow",
    postalCode: "226006",
  },
  {
    bookingPublicId: "seed-review-booking-006",
    paymentProviderRef: "seed-review-payment-006",
    customerName: "Ananya Verma",
    phone: "+919810000106",
    serviceSlug: "soft-glam-makeup",
    rating: 5,
    comment: "Clean setup, calm process and a polished final look.",
    highlights: [
      "The professional groomed properly.",
      "The professional was excellent in all services.",
      "I am satisfied with the services.",
    ],
    scheduledStartAt: "2026-08-27T06:00:00.000Z",
    createdAt: "2026-08-27T10:40:00.000Z",
    addressLine1: "Jankipuram, Lucknow",
    postalCode: "226021",
  },
];

const SEED_PACKAGES: SeedPackageDefinition[] = [
  {
    categorySlug: "facials",
    name: "Make Your Own Glow Package",
    slug: "make-your-own-glow-package",
    description:
      "Start with the admin-approved minimum facial package, then add upgrades before checkout.",
    minPricePaise: 298900,
    compareAtPricePaise: 373600,
    discountBps: 2000,
    durationMinutes: 215,
    inclusions: [
      "One premium facial",
      "Waxing add-on",
      "Mani-pedi upgrade option",
    ],
    sortOrder: 10,
    items: [
      {
        serviceSlug: "spa-pedicure",
        tierType: ServiceTierType.PREMIUM,
        label: "Pedicure: Candle spa pedicure",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 0,
      },
      {
        serviceSlug: "waxing-essentials",
        tierType: ServiceTierType.PREMIUM,
        label: "Waxing: Full arms and full legs",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 1,
      },
      {
        serviceSlug: "korean-glass-glow-facial",
        tierType: ServiceTierType.PREMIUM,
        label: "Facial & cleanup: Glass skin hydration facial",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 2,
      },
    ],
  },
  {
    categorySlug: "mani-pedi",
    name: "Mani Pedi Care Package",
    slug: "mani-pedi-care-package",
    description:
      "A 20 percent off hand and foot care package with editable service quantities.",
    minPricePaise: 219900,
    compareAtPricePaise: 274900,
    discountBps: 2000,
    durationMinutes: 180,
    inclusions: [
      "Manicure and pedicure ritual",
      "Spa pedicure upgrade option",
      "Express nail care add-on",
    ],
    sortOrder: 15,
    items: [
      {
        serviceSlug: "manicure-pedicure-ritual",
        tierType: ServiceTierType.PREMIUM,
        label: "Mani-pedi: Complete hand and foot ritual",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 0,
      },
      {
        serviceSlug: "spa-pedicure",
        tierType: ServiceTierType.PREMIUM,
        label: "Pedicure: Spa soak and massage",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 1,
      },
      {
        serviceSlug: "express-manicure",
        tierType: ServiceTierType.PREMIUM,
        label: "Manicure: Cut, file and polish",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 2,
      },
    ],
  },
  {
    categorySlug: "waxing",
    name: "Monthly Maintenance Package",
    slug: "monthly-maintenance-package",
    description:
      "A regular care package for waxing, cleanup, mani-pedi and facial hair removal.",
    minPricePaise: 191200,
    compareAtPricePaise: 212400,
    discountBps: 1000,
    durationMinutes: 130,
    inclusions: [
      "Waxing essentials",
      "Cleanup service",
      "Manicure or pedicure",
      "Facial hair removal",
    ],
    sortOrder: 20,
    items: [
      {
        serviceSlug: "waxing-essentials",
        tierType: ServiceTierType.PREMIUM,
        label: "Waxing: Full arms and full legs",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 0,
      },
      {
        serviceSlug: "hydra-clean-facial",
        tierType: ServiceTierType.PREMIUM,
        label: "Cleanup: Sara fruit cleanup",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 1,
      },
      {
        serviceSlug: "express-manicure",
        tierType: ServiceTierType.PREMIUM,
        label: "Manicure - Pedicure: Cut, file and polish",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 2,
      },
      {
        serviceSlug: "rica-arms-underarms",
        tierType: ServiceTierType.PREMIUM,
        label: "Facial hair removal: Eyebrow and upper lip",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 3,
      },
    ],
  },
  {
    categorySlug: "body-care",
    name: "Luxury Body Reset",
    slug: "luxury-body-reset",
    description:
      "Body polishing and relaxation services grouped for a longer private salon session.",
    minPricePaise: 339900,
    compareAtPricePaise: 429900,
    discountBps: 1500,
    durationMinutes: 175,
    inclusions: ["Body polishing", "Back massage", "Hydration finish"],
    sortOrder: 30,
    items: [
      {
        serviceSlug: "body-polishing",
        tierType: ServiceTierType.LUXURY,
        label: "Body care: Luxury body polishing",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 0,
      },
      {
        serviceSlug: "back-shoulder-massage",
        tierType: ServiceTierType.PREMIUM,
        label: "Massage: Back and shoulder relaxation",
        quantity: 1,
        minQuantity: 1,
        sortOrder: 1,
      },
    ],
  },
];

const SEED_STAFF: SeedStaffDefinition[] = [
  {
    name: "Nisha Verma",
    phone: "+919810001201",
    employeeCode: "LKO-STF-001",
    engagementType: StaffEngagementType.SALARIED,
    serviceSlugs: [
      "signature-gold-facial",
      "korean-glass-glow-facial",
      "hydra-clean-facial",
      "soft-glam-makeup",
      "party-makeup",
    ],
  },
  {
    name: "Pooja Srivastava",
    phone: "+919810001202",
    employeeCode: "LKO-STF-002",
    engagementType: StaffEngagementType.GIG,
    serviceSlugs: [
      "waxing-essentials",
      "rica-arms-underarms",
      "full-body-waxing",
      "body-polishing",
      "back-shoulder-massage",
      "de-tan-body-cleanup",
    ],
  },
  {
    name: "Ayesha Khan",
    phone: "+919810001203",
    employeeCode: "LKO-STF-003",
    engagementType: StaffEngagementType.SALARIED,
    serviceSlugs: [
      "manicure-pedicure-ritual",
      "express-manicure",
      "spa-pedicure",
      "relaxing-hair-spa",
      "anti-frizz-hair-spa",
      "head-massage-hair-wash",
    ],
  },
  {
    name: "Ritika Singh",
    phone: "+919810001204",
    employeeCode: "LKO-STF-004",
    engagementType: StaffEngagementType.GIG,
    serviceSlugs: SEED_CATALOGUE_SERVICES.map((service) => service.slug),
  },
];

const ROLE_GRANTS: Record<string, PermissionGrant[]> = {
  SUPER_ADMIN: permissionResourceSchema.options.flatMap((resource) =>
    permissionActionSchema.options.map((action) => ({ resource, action })),
  ),
  OPERATIONS_ADMIN: [
    { resource: "dashboard", action: "view" },
    { resource: "bookings", action: "view" },
    { resource: "bookings", action: "create" },
    { resource: "bookings", action: "update" },
    { resource: "bookings", action: "assign" },
    { resource: "customers", action: "view" },
    { resource: "staff", action: "view" },
    { resource: "staff", action: "create" },
    { resource: "staff", action: "update" },
    { resource: "staff", action: "assign" },
    { resource: "staff", action: "delete" },
    { resource: "staff", action: "export" },
    { resource: "contacts", action: "view" },
    { resource: "contacts", action: "update" },
    { resource: "reviews", action: "view" },
    { resource: "reviews", action: "update" },
    { resource: "reviews", action: "approve" },
  ],
  CATALOGUE_MANAGER: [
    { resource: "dashboard", action: "view" },
    { resource: "categories", action: "view" },
    { resource: "categories", action: "create" },
    { resource: "categories", action: "update" },
    { resource: "categories", action: "delete" },
    { resource: "categories", action: "export" },
    { resource: "categories", action: "publish" },
    { resource: "services", action: "view" },
    { resource: "services", action: "create" },
    { resource: "services", action: "update" },
    { resource: "services", action: "delete" },
    { resource: "services", action: "export" },
    { resource: "services", action: "publish" },
  ],
  FINANCE_ADMIN: [
    { resource: "dashboard", action: "view" },
    { resource: "payments", action: "view" },
    { resource: "payments", action: "update" },
    { resource: "refunds", action: "view" },
    { resource: "refunds", action: "refund" },
    { resource: "invoices", action: "view" },
    { resource: "reports", action: "view" },
    { resource: "reports", action: "export" },
  ],
};

function permissionDescription(
  resource: PermissionResource,
  action: PermissionAction,
): string {
  return `${action.replaceAll("_", " ")} ${resource.replaceAll("_", " ")}`;
}

async function seedPermissions(): Promise<Map<string, Permission>> {
  const permissions = new Map<string, Permission>();

  for (const resource of permissionResourceSchema.options) {
    for (const action of permissionActionSchema.options) {
      const permission = await prisma.permission.upsert({
        where: {
          resource_action: {
            resource,
            action,
          },
        },
        update: {
          description: permissionDescription(resource, action),
        },
        create: {
          resource,
          action,
          description: permissionDescription(resource, action),
        },
      });

      permissions.set(`${resource}:${action}`, permission);
    }
  }

  return permissions;
}

async function seedRoles(
  permissions: Map<string, Permission>,
): Promise<string> {
  let superAdminRoleId = "";

  for (const [name, grants] of Object.entries(ROLE_GRANTS)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {
        archivedAt: null,
        isSystem: true,
      },
      create: {
        name,
        description: `${name.toLowerCase().replaceAll("_", " ")} system role`,
        isSystem: true,
      },
    });

    if (name === "SUPER_ADMIN") {
      superAdminRoleId = role.id;
    }

    for (const grant of grants) {
      const permission = permissions.get(`${grant.resource}:${grant.action}`);

      if (!permission) {
        throw new Error(`Missing permission ${grant.resource}:${grant.action}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  if (!superAdminRoleId) {
    throw new Error("SUPER_ADMIN role was not created.");
  }

  return superAdminRoleId;
}

async function seedBootstrapSuperAdmin(
  superAdminRoleId: string,
): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.warn(
      "SUPER_ADMIN_EMAIL and SUPER_ADMIN_BOOTSTRAP_PASSWORD were not both set; skipped bootstrap admin creation.",
    );
    return;
  }

  if (password.length < 12) {
    throw new Error(
      "SUPER_ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.accountType !== "ADMIN") {
    throw new Error("Bootstrap email already belongs to a non-admin account.");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      accountType: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: existingUser?.emailVerifiedAt ?? now,
    },
    create: {
      email,
      name: "Bootstrap Super Admin",
      accountType: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: now,
    },
  });

  await prisma.authAccount.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: email,
      },
    },
    update: {
      userId: user.id,
      passwordHash,
    },
    create: {
      userId: user.id,
      providerId: "credential",
      accountId: email,
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRoleId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRoleId,
    },
  });

  await prisma.securityEvent.create({
    data: {
      actorId: user.id,
      event: "admin.bootstrap_super_admin",
      metadata: {
        source: "seed",
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "admin.bootstrap_super_admin",
      resourceType: "User",
      resourceId: user.id,
      requestId: "seed",
      after: {
        accountType: "ADMIN",
        status: "ACTIVE",
        role: "SUPER_ADMIN",
      },
    },
  });

  console.log(`Bootstrap SUPER_ADMIN is ready for ${email}.`);
}

async function upsertSeedMediaAsset(objectKey: string, altText: string) {
  return prisma.mediaAsset.upsert({
    where: { objectKey },
    update: {
      bucket: SEED_MEDIA_BUCKET,
      contentType: "image/jpeg",
      sizeBytes: 1,
      altText,
    },
    create: {
      bucket: SEED_MEDIA_BUCKET,
      objectKey,
      contentType: "image/jpeg",
      sizeBytes: 1,
      altText,
    },
  });
}

async function ensureSeedCategory(
  definition: SeedCategoryDefinition,
): Promise<Category> {
  const imageAsset = await upsertSeedMediaAsset(
    definition.imageUrl,
    definition.imageAltText,
  );
  const exactCategory = await prisma.category.findFirst({
    where: {
      parentId: null,
      slug: definition.slug,
    },
  });
  const legacyCategory =
    exactCategory || !definition.legacySlugs?.length
      ? null
      : await prisma.category.findFirst({
          where: {
            parentId: null,
            slug: { in: definition.legacySlugs },
          },
        });
  const existingCategory = exactCategory ?? legacyCategory;
  const categoryData = {
    name: definition.name,
    slug: definition.slug,
    description: definition.description,
    imageAssetId: imageAsset.id,
    seoTitle: `${definition.name} at home in Lucknow`,
    seoDescription: definition.description,
    status: PublishStatus.PUBLISHED,
    sortOrder: definition.sortOrder,
    archivedAt: null,
  };

  if (existingCategory) {
    const category = await prisma.category.update({
      where: { id: existingCategory.id },
      data: categoryData,
    });

    if (exactCategory && definition.legacySlugs?.length) {
      await prisma.category.updateMany({
        where: {
          parentId: null,
          slug: { in: definition.legacySlugs },
          id: { not: category.id },
        },
        data: {
          status: PublishStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      });
    }

    return category;
  }

  return prisma.category.create({
    data: categoryData,
  });
}

async function findSeedService(
  definition: SeedServiceDefinition,
): Promise<Service | null> {
  const exactService = await prisma.service.findUnique({
    where: { slug: definition.slug },
  });

  if (exactService || !definition.legacySlugs?.length) {
    return exactService;
  }

  return prisma.service.findFirst({
    where: {
      slug: { in: definition.legacySlugs },
    },
  });
}

async function syncSeedServiceImages(
  service: Service,
  definition: SeedServiceDefinition,
): Promise<void> {
  const imageUrls = [
    definition.imageUrl,
    ...(definition.galleryImageUrls ?? []),
  ];
  const desiredUrls = new Set(imageUrls);
  const existingImages = await prisma.serviceImage.findMany({
    where: { serviceId: service.id },
    include: { mediaAsset: true },
  });

  for (const existingImage of existingImages) {
    if (
      existingImage.mediaAsset.bucket === SEED_MEDIA_BUCKET &&
      !desiredUrls.has(existingImage.mediaAsset.objectKey)
    ) {
      await prisma.serviceImage.update({
        where: { id: existingImage.id },
        data: { sortOrder: 1000 },
      });
    }
  }

  for (const [index, imageUrl] of imageUrls.entries()) {
    const altText =
      index === 0
        ? definition.imageAltText
        : `${definition.name} gallery image ${index}`;
    const mediaAsset = await upsertSeedMediaAsset(imageUrl, altText);
    const existingImage = existingImages.find(
      (image) => image.mediaAsset.objectKey === imageUrl,
    );

    if (existingImage) {
      await prisma.serviceImage.update({
        where: { id: existingImage.id },
        data: {
          mediaAssetId: mediaAsset.id,
          altText,
          sortOrder: index,
        },
      });
    } else {
      await prisma.serviceImage.create({
        data: {
          serviceId: service.id,
          mediaAssetId: mediaAsset.id,
          altText,
          sortOrder: index,
        },
      });
    }
  }
}

function luxuryPricePaise(service: Service): number {
  return Math.ceil((service.pricePaise * 1.35) / 100) * 100;
}

function luxuryCompareAtPricePaise(service: Service): number {
  const baseCompareAt = service.compareAtPricePaise ?? service.pricePaise;
  return Math.ceil((baseCompareAt * 1.4) / 100) * 100;
}

async function syncSeedServiceTiers(
  service: Service,
  definition: SeedServiceDefinition,
): Promise<void> {
  const premiumProducts: Prisma.InputJsonValue = [
    "Professional-grade cleanser",
    "Single-use hygiene kit",
    ...definition.inclusions.slice(0, 2),
  ];
  const luxuryProducts: Prisma.InputJsonValue = [
    "Imported luxury product line",
    "Extended massage cream",
    "Finishing serum or mask",
    "Single-use hygiene kit",
  ];
  const tiers = [
    {
      tierType: ServiceTierType.PREMIUM,
      name: "Premium",
      description: "Trusted salon-grade essentials for this service.",
      durationMinutes: service.durationMinutes,
      pricePaise: service.pricePaise,
      compareAtPricePaise: service.compareAtPricePaise,
      productsUsed: premiumProducts,
      sortOrder: 0,
    },
    {
      tierType: ServiceTierType.LUXURY,
      name: "Luxury",
      description:
        "Upgraded products and extra finishing care for a more indulgent session.",
      durationMinutes: service.durationMinutes + 15,
      pricePaise: luxuryPricePaise(service),
      compareAtPricePaise: luxuryCompareAtPricePaise(service),
      productsUsed: luxuryProducts,
      sortOrder: 1,
    },
  ];

  for (const tier of tiers) {
    await prisma.serviceTier.upsert({
      where: {
        serviceId_tierType: {
          serviceId: service.id,
          tierType: tier.tierType,
        },
      },
      update: {
        name: tier.name,
        description: tier.description,
        durationMinutes: tier.durationMinutes,
        pricePaise: tier.pricePaise,
        compareAtPricePaise: tier.compareAtPricePaise,
        productsUsed: tier.productsUsed,
        status: PublishStatus.PUBLISHED,
        sortOrder: tier.sortOrder,
      },
      create: {
        serviceId: service.id,
        tierType: tier.tierType,
        name: tier.name,
        description: tier.description,
        durationMinutes: tier.durationMinutes,
        pricePaise: tier.pricePaise,
        compareAtPricePaise: tier.compareAtPricePaise,
        productsUsed: tier.productsUsed,
        status: PublishStatus.PUBLISHED,
        sortOrder: tier.sortOrder,
      },
    });
  }
}

async function seedCatalogueServices(): Promise<Map<string, Service>> {
  const categories = new Map<string, Category>();
  const services = new Map<string, Service>();
  const now = new Date();
  const dealStartsAt = new Date(SEED_DEAL_STARTS_AT);
  const dealEndsAt = new Date(SEED_DEAL_ENDS_AT);

  for (const definition of SEED_CATEGORIES) {
    const category = await ensureSeedCategory(definition);
    categories.set(definition.slug, category);
  }

  for (const definition of SEED_CATALOGUE_SERVICES) {
    const category = categories.get(definition.categorySlug);

    if (!category) {
      throw new Error(`Missing seed category ${definition.categorySlug}.`);
    }

    const inclusions: Prisma.InputJsonValue = definition.inclusions;
    const exclusions: Prisma.InputJsonValue = [];
    const existingService = await findSeedService(definition);
    const serviceData = {
      categoryId: category.id,
      name: definition.name,
      slug: definition.slug,
      shortDescription: definition.shortDescription,
      fullDescription: definition.fullDescription,
      durationMinutes: definition.durationMinutes,
      pricePaise: definition.pricePaise,
      compareAtPricePaise: definition.compareAtPricePaise,
      gstRateBps: 1800,
      dealEnabled: definition.dealPricePaise !== undefined,
      dealPricePaise: definition.dealPricePaise ?? null,
      dealStartsAt:
        definition.dealPricePaise !== undefined ? dealStartsAt : null,
      dealEndsAt: definition.dealPricePaise !== undefined ? dealEndsAt : null,
      inclusions,
      exclusions,
      status: PublishStatus.PUBLISHED,
      featured: definition.featured,
      sortOrder: definition.sortOrder,
      seoTitle: `${definition.name} at home in Lucknow`,
      seoDescription: definition.shortDescription,
      publishedAt: now,
      archivedAt: null,
    };
    const service = existingService
      ? await prisma.service.update({
          where: { id: existingService.id },
          data: serviceData,
        })
      : await prisma.service.create({
          data: serviceData,
        });

    if (definition.legacySlugs?.length) {
      await prisma.service.updateMany({
        where: {
          slug: { in: definition.legacySlugs },
          id: { not: service.id },
        },
        data: {
          status: PublishStatus.ARCHIVED,
          archivedAt: now,
        },
      });
    }

    await syncSeedServiceImages(service, definition);
    await syncSeedServiceTiers(service, definition);
    services.set(definition.slug, service);

    for (const legacySlug of definition.legacySlugs ?? []) {
      services.set(legacySlug, service);
    }
  }

  console.log(
    `Seeded ${SEED_CATALOGUE_SERVICES.length} published services with category images and deals.`,
  );

  return services;
}

async function seedServicePackages(
  services: Map<string, Service>,
): Promise<void> {
  const categories = await prisma.category.findMany({
    where: {
      slug: { in: SEED_PACKAGES.map((definition) => definition.categorySlug) },
    },
  });
  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  const now = new Date();

  for (const definition of SEED_PACKAGES) {
    const category = categoryBySlug.get(definition.categorySlug);

    if (!category) {
      throw new Error(`Missing seed category ${definition.categorySlug}.`);
    }

    const inclusions: Prisma.InputJsonValue = definition.inclusions;
    const servicePackage = await prisma.servicePackage.upsert({
      where: { slug: definition.slug },
      update: {
        categoryId: category.id,
        name: definition.name,
        description: definition.description,
        minPricePaise: definition.minPricePaise,
        compareAtPricePaise: definition.compareAtPricePaise,
        discountBps: definition.discountBps,
        durationMinutes: definition.durationMinutes,
        inclusions,
        status: PublishStatus.PUBLISHED,
        sortOrder: definition.sortOrder,
        publishedAt: now,
        archivedAt: null,
      },
      create: {
        categoryId: category.id,
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        minPricePaise: definition.minPricePaise,
        compareAtPricePaise: definition.compareAtPricePaise,
        discountBps: definition.discountBps,
        durationMinutes: definition.durationMinutes,
        inclusions,
        status: PublishStatus.PUBLISHED,
        sortOrder: definition.sortOrder,
        publishedAt: now,
      },
    });

    await prisma.servicePackageItem.deleteMany({
      where: { packageId: servicePackage.id },
    });

    for (const item of definition.items) {
      const service = services.get(item.serviceSlug);

      if (!service) {
        throw new Error(`Missing seed package service ${item.serviceSlug}.`);
      }

      const serviceTier = await prisma.serviceTier.findUnique({
        where: {
          serviceId_tierType: {
            serviceId: service.id,
            tierType: item.tierType,
          },
        },
      });

      await prisma.servicePackageItem.create({
        data: {
          packageId: servicePackage.id,
          serviceId: service.id,
          serviceTierId: serviceTier?.id ?? null,
          label: item.label,
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          sortOrder: item.sortOrder,
        },
      });
    }
  }

  console.log(`Seeded ${SEED_PACKAGES.length} editable service packages.`);
}

async function seedStaffServiceAssignments(
  services: Map<string, Service>,
): Promise<void> {
  const now = new Date();

  for (const definition of SEED_STAFF) {
    const user = await prisma.user.upsert({
      where: { phone: definition.phone },
      update: {
        name: definition.name,
        accountType: AccountType.STAFF,
        status: UserStatus.ACTIVE,
        phoneVerifiedAt: now,
      },
      create: {
        phone: definition.phone,
        name: definition.name,
        accountType: AccountType.STAFF,
        status: UserStatus.ACTIVE,
        phoneVerifiedAt: now,
      },
    });
    const staffProfile = await prisma.staffProfile.upsert({
      where: { employeeCode: definition.employeeCode },
      update: {
        userId: user.id,
        engagementType: definition.engagementType,
        status: UserStatus.ACTIVE,
      },
      create: {
        userId: user.id,
        employeeCode: definition.employeeCode,
        engagementType: definition.engagementType,
        status: UserStatus.ACTIVE,
      },
    });
    const serviceIds = definition.serviceSlugs
      .map((serviceSlug) => services.get(serviceSlug)?.id)
      .filter((serviceId): serviceId is string => Boolean(serviceId));

    await prisma.staffService.deleteMany({
      where: { staffProfileId: staffProfile.id },
    });

    if (serviceIds.length > 0) {
      await prisma.staffService.createMany({
        data: [...new Set(serviceIds)].map((serviceId) => ({
          staffProfileId: staffProfile.id,
          serviceId,
        })),
      });
    }

    await prisma.staffSchedule.deleteMany({
      where: { staffProfileId: staffProfile.id },
    });
    await prisma.staffSchedule.createMany({
      data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
        staffProfileId: staffProfile.id,
        weekday,
        startsAtMinute: 9 * 60,
        endsAtMinute: 20 * 60,
      })),
    });
  }

  console.log(`Seeded ${SEED_STAFF.length} active staff service maps.`);
}

async function upsertSeedCustomer(definition: SeedReviewDefinition) {
  const now = new Date();
  const existingUser = await prisma.user.findUnique({
    where: { phone: definition.phone },
  });

  if (existingUser && existingUser.accountType !== AccountType.CUSTOMER) {
    throw new Error(
      `Seed review phone ${definition.phone} belongs to a non-customer account.`,
    );
  }

  const user = await prisma.user.upsert({
    where: { phone: definition.phone },
    update: {
      name: definition.customerName,
      accountType: AccountType.CUSTOMER,
      status: UserStatus.ACTIVE,
      phoneVerifiedAt: existingUser?.phoneVerifiedAt ?? now,
    },
    create: {
      phone: definition.phone,
      name: definition.customerName,
      accountType: AccountType.CUSTOMER,
      status: UserStatus.ACTIVE,
      phoneVerifiedAt: now,
    },
  });

  const customerProfile = await prisma.customerProfile.upsert({
    where: { userId: user.id },
    update: {
      displayName: definition.customerName,
      segment: "SEEDED_REVIEW",
      notes: "Seed customer for homepage review content.",
    },
    create: {
      userId: user.id,
      displayName: definition.customerName,
      segment: "SEEDED_REVIEW",
      notes: "Seed customer for homepage review content.",
    },
  });

  const existingAddress = await prisma.address.findFirst({
    where: {
      customerProfileId: customerProfile.id,
      label: "Home",
      archivedAt: null,
    },
  });

  const addressData = {
    customerProfileId: customerProfile.id,
    label: "Home",
    line1: definition.addressLine1,
    line2: null,
    city: "Lucknow",
    region: "Uttar Pradesh",
    postalCode: definition.postalCode,
    isDefault: true,
    archivedAt: null,
  };

  const address = existingAddress
    ? await prisma.address.update({
        where: { id: existingAddress.id },
        data: addressData,
      })
    : await prisma.address.create({
        data: addressData,
      });

  return { customerProfile, address };
}

async function seedApprovedReviews(
  services: Map<string, Service>,
): Promise<void> {
  const moderator = await prisma.user.findFirst({
    where: {
      accountType: AccountType.ADMIN,
      status: UserStatus.ACTIVE,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const definition of SEED_REVIEWS) {
    const service = services.get(definition.serviceSlug);

    if (!service) {
      throw new Error(`Missing seed service ${definition.serviceSlug}.`);
    }

    const { customerProfile, address } = await upsertSeedCustomer(definition);
    const scheduledStartAt = new Date(definition.scheduledStartAt);
    const scheduledEndAt = new Date(
      scheduledStartAt.getTime() + service.durationMinutes * 60 * 1000,
    );
    const createdAt = new Date(definition.createdAt);
    const totalPaise = service.pricePaise;
    const booking = await prisma.booking.upsert({
      where: { publicId: definition.bookingPublicId },
      update: {
        customerProfileId: customerProfile.id,
        addressId: address.id,
        status: BookingStatus.COMPLETED,
        scheduledStartAt,
        scheduledEndAt,
        subtotalPaise: totalPaise,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise,
        notes: "Seeded completed booking for homepage review content.",
      },
      create: {
        publicId: definition.bookingPublicId,
        customerProfileId: customerProfile.id,
        addressId: address.id,
        status: BookingStatus.COMPLETED,
        scheduledStartAt,
        scheduledEndAt,
        subtotalPaise: totalPaise,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise,
        notes: "Seeded completed booking for homepage review content.",
        createdAt,
      },
    });

    await prisma.bookingItem.deleteMany({
      where: { bookingId: booking.id },
    });

    await prisma.bookingItem.create({
      data: {
        bookingId: booking.id,
        serviceId: service.id,
        serviceName: service.name,
        quantity: 1,
        unitPaise: totalPaise,
        taxPaise: 0,
        totalPaise,
      },
    });

    await prisma.bookingStatusHistory.deleteMany({
      where: {
        bookingId: booking.id,
        reason: "Seeded completed booking for homepage review content.",
      },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: BookingStatus.COMPLETED,
        actorId: moderator?.id ?? null,
        reason: "Seeded completed booking for homepage review content.",
        createdAt,
      },
    });

    await prisma.payment.upsert({
      where: {
        provider_providerRef: {
          provider: "seed",
          providerRef: definition.paymentProviderRef,
        },
      },
      update: {
        bookingId: booking.id,
        status: PaymentStatus.CAPTURED,
        amountPaise: totalPaise,
        currency: "INR",
        idempotencyKey: definition.paymentProviderRef,
        capturedAt: createdAt,
      },
      create: {
        bookingId: booking.id,
        provider: "seed",
        providerRef: definition.paymentProviderRef,
        status: PaymentStatus.CAPTURED,
        amountPaise: totalPaise,
        currency: "INR",
        idempotencyKey: definition.paymentProviderRef,
        capturedAt: createdAt,
        createdAt,
      },
    });

    const highlights: Prisma.InputJsonValue = definition.highlights;

    await prisma.review.upsert({
      where: { bookingId: booking.id },
      update: {
        customerProfileId: customerProfile.id,
        rating: definition.rating,
        comment: definition.comment,
        highlights,
        status: ReviewModerationStatus.APPROVED,
        showOnHomepage: true,
        moderatedById: moderator?.id ?? null,
        moderatedAt: createdAt,
      },
      create: {
        bookingId: booking.id,
        customerProfileId: customerProfile.id,
        rating: definition.rating,
        comment: definition.comment,
        highlights,
        status: ReviewModerationStatus.APPROVED,
        showOnHomepage: true,
        moderatedById: moderator?.id ?? null,
        moderatedAt: createdAt,
        createdAt,
      },
    });
  }

  console.log(`Seeded ${SEED_REVIEWS.length} approved homepage reviews.`);
}

async function main(): Promise<void> {
  const permissions = await seedPermissions();
  const superAdminRoleId = await seedRoles(permissions);
  await seedBootstrapSuperAdmin(superAdminRoleId);
  const services = await seedCatalogueServices();
  await seedServicePackages(services);
  await seedStaffServiceAssignments(services);
  await seedApprovedReviews(services);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
