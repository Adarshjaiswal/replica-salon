import { z } from "zod";

export const customerPhoneSchema = z.string().trim().min(8).max(20);

export const customerOtpRequestSchema = z.object({
  phone: customerPhoneSchema,
});

export const customerOtpVerifySchema = z.object({
  phone: customerPhoneSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  name: z.string().trim().min(1).max(160).optional(),
});

export const customerCompleteProfileRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]),
});

export const publicCatalogueQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  categorySlug: z.string().trim().max(160).optional(),
});

export const serviceTierTypeSchema = z.enum(["PREMIUM", "LUXURY"]);

export const serviceTierInputSchema = z.object({
  tierType: serviceTierTypeSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(600).optional(),
  pricePaise: z.number().int().min(0).max(10_000_000),
  compareAtPricePaise: z.number().int().min(0).max(10_000_000).optional(),
  productsUsed: z.array(z.string().trim().min(1).max(160)).max(16).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});

export const servicePackageItemInputSchema = z.object({
  serviceId: z.string().trim().min(1),
  serviceTierId: z.string().trim().min(1).optional(),
  label: z.string().trim().max(180).optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  minQuantity: z.number().int().min(1).max(10).default(1),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});

export const servicePackageInputSchema = z
  .object({
    categoryId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(180),
    description: z.string().trim().max(700).optional(),
    minPricePaise: z.number().int().min(0).max(10_000_000),
    compareAtPricePaise: z.number().int().min(0).max(10_000_000).optional(),
    discountBps: z.number().int().min(0).max(10_000).default(0),
    durationMinutes: z.number().int().min(5).max(900),
    inclusions: z.array(z.string().trim().min(1).max(180)).max(16).default([]),
    items: z.array(servicePackageItemInputSchema).min(1).max(20),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    sortOrder: z.number().int().min(0).max(1_000_000).default(0),
  })
  .superRefine((value, ctx) => {
    if (
      value.compareAtPricePaise !== undefined &&
      value.compareAtPricePaise < value.minPricePaise
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Package compare-at price cannot be lower than minimum price.",
        path: ["compareAtPricePaise"],
      });
    }

    for (const [index, item] of value.items.entries()) {
      if (item.minQuantity > item.quantity) {
        ctx.addIssue({
          code: "custom",
          message: "Minimum quantity cannot exceed included quantity.",
          path: ["items", index, "minQuantity"],
        });
      }
    }
  });

export const customerAvailabilityQuerySchema = z.object({
  serviceId: z.string().trim().min(1),
  serviceIds: z.string().trim().max(800).optional(),
  items: z.string().trim().max(5000).optional(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const customerAddressInputSchema = z.object({
  label: z.string().trim().min(1).max(80).default("Home"),
  line1: z.string().trim().min(4).max(220),
  line2: z.string().trim().max(220).optional(),
  city: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(4).max(20),
  isDefault: z.boolean().optional(),
});

export const customerBookingItemSchema = z.object({
  serviceId: z.string().trim().min(1),
  serviceTierId: z.string().trim().min(1).optional(),
  packageId: z.string().trim().min(1).optional(),
  quantity: z.number().int().min(1).max(10),
});

export const customerCreateBookingRequestSchema = z
  .object({
    items: z.array(customerBookingItemSchema).min(1).max(24),
    addressId: z.string().trim().min(1).optional(),
    address: customerAddressInputSchema.optional(),
    scheduledStartAt: z.string().datetime(),
    notes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().min(12).max(120).optional(),
  })
  .refine((value) => value.addressId || value.address, {
    message: "Provide a saved address or a new address.",
    path: ["addressId"],
  });

export const customerPaymentMethodSchema = z.enum([
  "RAZORPAY",
  "PAY_AFTER_SERVICE",
]);

export const customerCreatePaymentRequestSchema = z.object({
  bookingId: z.string().trim().min(1),
  method: customerPaymentMethodSchema.default("RAZORPAY"),
  idempotencyKey: z.string().trim().min(12).max(120).optional(),
});

export const customerVerifyPaymentRequestSchema = z.object({
  bookingId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  razorpayOrderId: z.string().trim().min(1).optional(),
  razorpayPaymentId: z.string().trim().min(1).optional(),
  razorpaySignature: z.string().trim().min(1).optional(),
  developmentPaymentToken: z.string().trim().min(24).optional(),
});

export const customerContactRequestSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: customerPhoneSchema.optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  message: z.string().trim().min(10).max(2000),
});

export const customerReviewHighlightSchema = z.string().trim().min(3).max(180);

export const customerCreateReviewRequestSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    highlights: z.array(customerReviewHighlightSchema).max(8).default([]),
    comment: z.string().trim().max(1200).optional(),
  })
  .refine(
    (value) => value.highlights.length > 0 || Boolean(value.comment?.trim()),
    {
      message: "Add at least one review highlight or written comment.",
      path: ["comment"],
    },
  );

const homepageOptionalTextSchema = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const homepageUrlSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .max(1000)
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
      "Use a public URL or a local path beginning with /.",
    )
    .optional(),
);

const homepageTextBlockSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180),
  subtitle: z.string().trim().min(1).max(520),
});

export const publicHomepageHighlightCardSchema = z.object({
  id: homepageOptionalTextSchema(80),
  title: z.string().trim().min(1).max(140),
  subtitle: homepageOptionalTextSchema(260),
  label: homepageOptionalTextSchema(80),
  mediaUrl: homepageUrlSchema,
  videoUrl: homepageUrlSchema,
  linkUrl: homepageUrlSchema,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});

export const publicHomepageServiceSectionSchema = z.object({
  id: homepageOptionalTextSchema(80),
  title: z.string().trim().min(1).max(140),
  subtitle: homepageOptionalTextSchema(260),
  serviceIds: z.array(z.string().trim().min(1).max(120)).max(24),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});

export const publicHomepageConfigSchema = z.object({
  hero: homepageTextBlockSchema.extend({
    titleAccent: z.string().trim().min(1).max(140),
    primaryCtaLabel: z.string().trim().min(1).max(80),
    secondaryCtaLabel: z.string().trim().min(1).max(80),
  }),
  offers: homepageTextBlockSchema,
  categories: homepageTextBlockSchema,
  highlights: homepageTextBlockSchema.extend({
    cards: z.array(publicHomepageHighlightCardSchema).max(12),
  }),
  services: homepageTextBlockSchema,
  serviceSections: z
    .array(publicHomepageServiceSectionSchema)
    .max(12)
    .default([]),
  trust: homepageTextBlockSchema,
});

export const defaultPublicHomepageConfig = publicHomepageConfigSchema.parse({
  hero: {
    eyebrow: "Salon at home - Lucknow",
    title: "Beauty & spa,",
    titleAccent: "delivered at home",
    subtitle:
      "From facials and waxing to manicure, hair spa, body care and makeup packages, Replica brings salon services to your doorstep with clear prices and assigned professionals.",
    primaryCtaLabel: "Book Appointment",
    secondaryCtaLabel: "Call Now",
  },
  offers: {
    eyebrow: "Limited-time welcome offer",
    title: "Claim a service before your slot fills up.",
    subtitle:
      "Featured services and compare-at pricing are managed from the admin catalogue, then displayed here for customers.",
  },
  categories: {
    eyebrow: "At-home menu",
    title: "Choose a category",
    subtitle:
      "Explore facials, waxing, spa, mani-pedi and more - then book for your area in a few taps.",
  },
  highlights: {
    eyebrow: "Beauty in motion",
    title: "See results before you book.",
    subtitle:
      "Browse quick service reels, real transformations, and tap to open bookable highlights.",
    cards: [
      {
        id: "gold-facial",
        title: "Gold Facial",
        subtitle: "Skin glow service",
        label: "Tap to explore",
        mediaUrl:
          "https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=900",
        linkUrl: "/services",
        status: "PUBLISHED",
        sortOrder: 0,
      },
      {
        id: "manicure",
        title: "Manicure",
        subtitle: "Nail care at home",
        label: "Tap to explore",
        mediaUrl:
          "https://images.pexels.com/photos/3997387/pexels-photo-3997387.jpeg?auto=compress&cs=tinysrgb&w=900",
        linkUrl: "/services",
        status: "PUBLISHED",
        sortOrder: 1,
      },
      {
        id: "pedicure",
        title: "Pedicure",
        subtitle: "Foot care ritual",
        label: "Tap to explore",
        mediaUrl:
          "https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=900",
        linkUrl: "/services",
        status: "PUBLISHED",
        sortOrder: 2,
      },
    ],
  },
  services: {
    eyebrow: "Curated favourites",
    title: "Best-selling packages, made for easy booking.",
    subtitle:
      "High-performing service combinations with clear value, social proof, and a cleaner premium presentation.",
  },
  serviceSections: [],
  trust: {
    eyebrow: "Trusted beauty at home",
    title: "Why choose Replica",
    subtitle:
      "Premium salon experiences should feel calm from the first tap. We bring verified professionals, clear pricing, and appointment flexibility together.",
  },
});

export type CustomerOtpRequest = z.infer<typeof customerOtpRequestSchema>;
export type CustomerOtpVerify = z.infer<typeof customerOtpVerifySchema>;
export type PublicCatalogueQuery = z.infer<typeof publicCatalogueQuerySchema>;
export type CustomerAvailabilityQuery = z.infer<
  typeof customerAvailabilityQuerySchema
>;
export type ServiceTierType = z.infer<typeof serviceTierTypeSchema>;
export type ServiceTierInput = z.infer<typeof serviceTierInputSchema>;
export type ServicePackageInput = z.infer<typeof servicePackageInputSchema>;
export type ServicePackageItemInput = z.infer<
  typeof servicePackageItemInputSchema
>;
export type CustomerAddressInput = z.infer<typeof customerAddressInputSchema>;
export type CustomerCreateBookingRequest = z.infer<
  typeof customerCreateBookingRequestSchema
>;
export type CustomerCreateReviewRequest = z.infer<
  typeof customerCreateReviewRequestSchema
>;
export type CustomerPaymentMethod = z.infer<typeof customerPaymentMethodSchema>;
export type CustomerCreatePaymentRequest = z.infer<
  typeof customerCreatePaymentRequestSchema
>;
export type CustomerVerifyPaymentRequest = z.infer<
  typeof customerVerifyPaymentRequestSchema
>;
export type CustomerContactRequest = z.infer<
  typeof customerContactRequestSchema
>;
export type PublicHomepageHighlightCard = z.infer<
  typeof publicHomepageHighlightCardSchema
>;
export type PublicHomepageServiceSection = z.infer<
  typeof publicHomepageServiceSectionSchema
>;
export type PublicHomepageConfig = z.infer<typeof publicHomepageConfigSchema>;
