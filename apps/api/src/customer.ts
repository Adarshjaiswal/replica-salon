import crypto, { createHmac, randomInt, randomUUID } from "node:crypto";
import type { AppEnv } from "@replica/config";
import {
  customerAddressInputSchema,
  customerAvailabilityQuerySchema,
  customerBookingItemSchema,
  customerCompleteProfileRequestSchema,
  customerContactRequestSchema,
  customerCreateBookingRequestSchema,
  customerCreatePaymentRequestSchema,
  customerCreateReviewRequestSchema,
  customerOtpRequestSchema,
  customerOtpVerifySchema,
  customerVerifyPaymentRequestSchema,
  defaultPublicHomepageConfig,
  errorEnvelope,
  publicHomepageConfigSchema,
  publicCatalogueQuerySchema,
  successEnvelope,
  type CustomerAddressInput,
  type PublicHomepageConfig,
} from "@replica/contracts";
import {
  createSessionToken,
  hashContextValue,
  hashSessionToken,
} from "@replica/auth";
import { prisma, type BookingStatus, type Prisma } from "@replica/db";
import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { z } from "zod";
import {
  BOOKING_FINAL_STATUSES,
  BookingConflictError,
  NON_BLOCKING_BOOKING_STATUSES,
  isPaymentAcceptedStatus,
  recordPaymentStateAndMaybeConfirmBooking,
} from "./paymentLifecycle.js";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  hashRazorpayWebhookPayload,
  isRazorpayConfigured,
  isRazorpayWebhookConfigured,
  mapRazorpayPaymentStatus,
  parseRazorpayWebhookPayload,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  type RazorpayPaymentEntity,
} from "./razorpay.js";

const CUSTOMER_SESSION_COOKIE_NAME = "replica_customer_session";
const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const SLOT_STEP_MINUTES = 30;
const INDIA_OFFSET_MINUTES = 330;
const DEFAULT_START_MINUTE = 9 * 60;
const DEFAULT_END_MINUTE = 21 * 60;
const FALLBACK_HERO_IMAGE =
  "https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg?auto=compress&cs=tinysrgb&w=1200";
const FALLBACK_SERVICE_IMAGES = [
  "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/3993320/pexels-photo-3993320.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=900",
];
const PUBLIC_HOMEPAGE_CONTENT_SLUG = "public-homepage";

const logger = pino({
  name: "replica-customer-api",
  redact: [
    "*.otp",
    "*.token",
    "*.developmentPaymentToken",
    "*.razorpaySignature",
    "*.phone",
  ],
});

interface CustomerActor {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE";
  customerProfileId: string;
  displayName: string;
}

interface LoadedCustomerSession {
  actor: CustomerActor;
  sessionId: string;
  tokenHash: string;
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
  dealEnabled: boolean;
  dealPricePaise: number | null;
  dealStartsAt: string | null;
  dealEndsAt: string | null;
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

interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  availableCount: number;
}

type ServiceForPublic = Prisma.ServiceGetPayload<{
  include: {
    category: true;
    images: { include: { mediaAsset: true } };
    tiers: true;
  };
}>;

type PackageForPublic = Prisma.ServicePackageGetPayload<{
  include: {
    category: true;
    items: {
      include: {
        service: true;
        serviceTier: true;
      };
    };
  };
}>;

type CategoryForPublic = Prisma.CategoryGetPayload<{
  include: {
    parent: true;
    imageAsset: true;
  };
}>;

type ServiceForBooking = Prisma.ServiceGetPayload<{
  include: {
    skills: true;
    tiers: true;
  };
}>;

type ServiceTierForBooking = ServiceForBooking["tiers"][number];

type StaffForAvailability = Prisma.StaffProfileGetPayload<{
  include: {
    user: true;
    services: true;
    schedules: true;
    exceptions: true;
    assignments: {
      include: {
        booking: true;
      };
    };
  };
}>;

type CustomerBookingForResponse = Prisma.BookingGetPayload<{
  include: {
    address: true;
    items: true;
    payments: true;
    reviews: true;
    assignments: {
      include: {
        staffProfile: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

type CustomerAddressForResponse = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  isDefault: boolean;
};

type PublicReviewForResponse = Prisma.ReviewGetPayload<{
  include: {
    customerProfile: true;
    booking: {
      include: {
        items: true;
      };
    };
  };
}>;

interface BookingRequestItem {
  serviceId: string;
  serviceTierId?: string | undefined;
  packageId?: string | undefined;
  quantity: number;
}

interface BookingLineDraft {
  service: ServiceForBooking;
  tier: ServiceTierForBooking | null;
  packageId: string | null;
  packageName: string | null;
  serviceName: string;
  serviceTierName: string | null;
  durationMinutes: number;
  quantity: number;
  unitPaise: number;
  netPaise: number;
  taxPaise: number;
  totalPaise: number;
}

const availabilityItemsSchema = z
  .array(customerBookingItemSchema)
  .min(1)
  .max(24);

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getRequestId(res: Response): string {
  const value = res.locals.requestId;
  return typeof value === "string" ? value : "unknown-request";
}

function sendError(
  res: Response,
  status: number,
  code: Parameters<typeof errorEnvelope>[0],
  message: string,
  details: unknown[] = [],
): void {
  res
    .status(status)
    .json(errorEnvelope(code, message, getRequestId(res), details));
}

function sendValidationError(
  res: Response,
  message: string,
  details: unknown[] = [],
): void {
  sendError(res, 400, "VALIDATION_ERROR", message, details);
}

function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const name = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();

    try {
      cookies.set(name, decodeURIComponent(rawValue));
    } catch {
      cookies.set(name, rawValue);
    }
  }

  return cookies;
}

function serializeCustomerSessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean,
): string {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  const parts = [
    `${CUSTOMER_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function serializeClearCustomerSessionCookie(secure: boolean): string {
  const parts = [
    `${CUSTOMER_SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.header("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",").at(0)?.trim();

  if (forwardedIp) {
    return forwardedIp;
  }

  return req.ip || req.socket.remoteAddress || undefined;
}

function getUserAgent(req: Request): string | null {
  const value = req.header("user-agent")?.trim();
  return value ? value.slice(0, 512) : null;
}

function getRouteParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getActor(res: Response): CustomerActor {
  const actor = res.locals.actor;

  if (!actor || typeof actor !== "object") {
    throw new Error("Customer actor was not loaded.");
  }

  return actor as CustomerActor;
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

function maskPhone(phone: string): string {
  if (phone.length <= 5) {
    return "*****";
  }

  return `${phone.slice(0, 3)}*****${phone.slice(-2)}`;
}

function createOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function createCustomerSessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + CUSTOMER_SESSION_TTL_MS);
}

function hashOtp(identifier: string, otp: string, env: AppEnv): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${identifier}:${otp}`)
    .digest("hex");
}

function hashDevelopmentToken(token: string, env: AppEnv): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`development-payment:${token}`)
    .digest("hex");
}

function isLocalDevelopment(env: AppEnv): boolean {
  return env.APP_ENV === "local" && env.NODE_ENV !== "production";
}

function serializeCustomerActor(actor: CustomerActor): CustomerActor {
  return actor;
}

async function loadCustomerSessionByTokenHash(
  tokenHash: string,
): Promise<LoadedCustomerSession | null> {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          customerProfile: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  if (
    session.user.accountType !== "CUSTOMER" ||
    session.user.status !== "ACTIVE" ||
    !session.user.customerProfile
  ) {
    return null;
  }

  return {
    actor: {
      id: session.user.id,
      publicId: session.user.publicId,
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone,
      status: "ACTIVE",
      customerProfileId: session.user.customerProfile.id,
      displayName: session.user.customerProfile.displayName,
    },
    sessionId: session.id,
    tokenHash,
  };
}

async function loadCustomerSession(
  req: Request,
): Promise<LoadedCustomerSession | null> {
  const token = parseCookies(req.header("cookie")).get(
    CUSTOMER_SESSION_COOKIE_NAME,
  );

  if (!token) {
    return null;
  }

  return loadCustomerSessionByTokenHash(hashSessionToken(token));
}

function requireActiveCustomer(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const loadedSession = await loadCustomerSession(req);

    if (!loadedSession) {
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }

    res.locals.actor = loadedSession.actor;
    res.locals.sessionId = loadedSession.sessionId;
    res.locals.tokenHash = loadedSession.tokenHash;
    next();
  });
}

function jsonStringArray(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function publicImageUrl(
  image:
    | {
        mediaAsset: {
          id: string;
          publicId: string;
          objectKey: string;
          altText: string | null;
        };
        altText: string;
      }
    | undefined,
): PublicMediaImage | null {
  if (!image) {
    return null;
  }

  return {
    id: image.mediaAsset.publicId,
    url: image.mediaAsset.objectKey,
    altText: image.altText || image.mediaAsset.altText,
  };
}

function serializePublicCategory(category: CategoryForPublic): PublicCategory {
  return {
    id: category.id,
    publicId: category.publicId,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    parentSlug: category.parent?.slug ?? null,
    description: category.description,
    imageUrl: category.imageAsset?.objectKey ?? null,
  };
}

function serializePublicTier(
  tier: ServiceForPublic["tiers"][number],
  service: Pick<ServiceForPublic, "durationMinutes">,
): PublicServiceTier {
  return {
    id: tier.id,
    publicId: tier.publicId,
    tierType: tier.tierType,
    name: tier.name,
    description: tier.description,
    durationMinutes: tier.durationMinutes ?? service.durationMinutes,
    pricePaise: tier.pricePaise,
    compareAtPricePaise: tier.compareAtPricePaise,
    productsUsed: jsonStringArray(tier.productsUsed),
  };
}

function serviceHasActiveDeal(
  service: Pick<
    ServiceForPublic | ServiceForBooking,
    "dealEnabled" | "dealStartsAt" | "dealEndsAt"
  >,
  now: Date,
): boolean {
  return (
    service.dealEnabled &&
    service.dealStartsAt !== null &&
    service.dealEndsAt !== null &&
    service.dealStartsAt <= now &&
    service.dealEndsAt > now
  );
}

function effectiveServicePricePaise(
  service: Pick<
    ServiceForPublic | ServiceForBooking,
    | "dealEnabled"
    | "dealPricePaise"
    | "dealStartsAt"
    | "dealEndsAt"
    | "pricePaise"
  >,
  now: Date,
): number {
  if (!serviceHasActiveDeal(service, now)) {
    return service.pricePaise;
  }

  return service.dealPricePaise ?? service.pricePaise;
}

function serializePublicService(service: ServiceForPublic): PublicService {
  const sortedImages = [...service.images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const [mainImage, ...galleryImages] = sortedImages;
  const publishedTiers = service.tiers
    .filter((tier) => tier.status === "PUBLISHED")
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    id: service.id,
    publicId: service.publicId,
    categoryId: service.categoryId,
    categorySlug: service.category.slug,
    categoryName: service.category.name,
    name: service.name,
    slug: service.slug,
    shortDescription: service.shortDescription,
    fullDescription: service.fullDescription,
    durationMinutes: service.durationMinutes,
    pricePaise: service.pricePaise,
    compareAtPricePaise: service.compareAtPricePaise,
    gstRateBps: service.gstRateBps,
    dealEnabled: service.dealEnabled,
    dealPricePaise: service.dealPricePaise,
    dealStartsAt: service.dealStartsAt?.toISOString() ?? null,
    dealEndsAt: service.dealEndsAt?.toISOString() ?? null,
    featured: service.featured,
    mainImage: publicImageUrl(mainImage),
    galleryImages: galleryImages.map((image) => ({
      id: image.mediaAsset.publicId,
      url: image.mediaAsset.objectKey,
      altText: image.altText || image.mediaAsset.altText,
    })),
    tiers: publishedTiers.map((tier) => serializePublicTier(tier, service)),
    inclusions: jsonStringArray(service.inclusions),
    exclusions: jsonStringArray(service.exclusions),
  };
}

function serializePublicPackage(
  servicePackage: PackageForPublic,
): PublicServicePackage {
  return {
    id: servicePackage.id,
    publicId: servicePackage.publicId,
    categoryId: servicePackage.categoryId,
    categorySlug: servicePackage.category.slug,
    categoryName: servicePackage.category.name,
    name: servicePackage.name,
    slug: servicePackage.slug,
    description: servicePackage.description,
    minPricePaise: servicePackage.minPricePaise,
    compareAtPricePaise: servicePackage.compareAtPricePaise,
    discountBps: servicePackage.discountBps,
    durationMinutes: servicePackage.durationMinutes,
    inclusions: jsonStringArray(servicePackage.inclusions),
    items: servicePackage.items
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service.name,
        serviceTierId: item.serviceTierId,
        serviceTierName: item.serviceTier?.name ?? null,
        label: item.label,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        sortOrder: item.sortOrder,
      })),
  };
}

function serviceFallbackImage(index: number): string {
  return (
    FALLBACK_SERVICE_IMAGES[index % FALLBACK_SERVICE_IMAGES.length] ??
    FALLBACK_HERO_IMAGE
  );
}

function parseHomepageConfig(
  rawConfig: string | null | undefined,
): PublicHomepageConfig {
  if (!rawConfig) {
    return defaultPublicHomepageConfig;
  }

  try {
    const parsedJson: unknown = JSON.parse(rawConfig);
    const parsedConfig = publicHomepageConfigSchema.safeParse(parsedJson);

    if (parsedConfig.success) {
      return parsedConfig.data;
    }
  } catch {
    return defaultPublicHomepageConfig;
  }

  return defaultPublicHomepageConfig;
}

async function loadPublicHomepageConfig(): Promise<PublicHomepageConfig> {
  const contentPage = await prisma.contentPage.findUnique({
    where: { slug: PUBLIC_HOMEPAGE_CONTENT_SLUG },
    include: {
      revisions: {
        orderBy: { revisionNo: "desc" },
        take: 1,
      },
    },
  });

  if (!contentPage || contentPage.status !== "PUBLISHED") {
    return defaultPublicHomepageConfig;
  }

  return parseHomepageConfig(contentPage.revisions.at(0)?.bodyText);
}

function parseServiceIds(
  primaryServiceId: string,
  serviceIds: string | undefined,
): string[] {
  const ids = [primaryServiceId];

  if (serviceIds) {
    for (const rawId of serviceIds.split(",")) {
      const id = rawId.trim();

      if (id) {
        ids.push(id);
      }
    }
  }

  return [...new Set(ids)].slice(0, 12);
}

function parseDateParts(
  date: string,
): { year: number; month: number; day: number } | null {
  const [yearText, monthText, dayText] = date.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const day = Number.parseInt(dayText ?? "", 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function dateTimeInIndiaToUtc(date: string, minuteOfDay: number): Date {
  const parts = parseDateParts(date);

  if (!parts) {
    throw new Error("Invalid date.");
  }

  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, minuteOfDay) -
      INDIA_OFFSET_MINUTES * 60 * 1000,
  );
}

function indiaDayRange(date: string): { start: Date; end: Date } {
  const start = dateTimeInIndiaToUtc(date, 0);
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

function indiaWeekday(date: string): number {
  const parts = parseDateParts(date);

  if (!parts) {
    throw new Error("Invalid date.");
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function rangesOverlap(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function staffWindowsForDate(
  staff: StaffForAvailability,
  weekday: number,
): Array<{ startsAtMinute: number; endsAtMinute: number }> {
  if (staff.schedules.length === 0) {
    return [
      {
        startsAtMinute: DEFAULT_START_MINUTE,
        endsAtMinute: DEFAULT_END_MINUTE,
      },
    ];
  }

  return staff.schedules
    .filter((schedule) => schedule.weekday === weekday)
    .map((schedule) => ({
      startsAtMinute: schedule.startsAtMinute,
      endsAtMinute: schedule.endsAtMinute,
    }));
}

function staffIsFreeForWindow(
  staff: StaffForAvailability,
  startsAt: Date,
  endsAt: Date,
  ignoredBookingId?: string,
): boolean {
  for (const exception of staff.exceptions) {
    if (rangesOverlap(startsAt, endsAt, exception.startsAt, exception.endsAt)) {
      return false;
    }
  }

  for (const assignment of staff.assignments) {
    if (
      assignment.bookingId === ignoredBookingId ||
      assignment.status === "REJECTED"
    ) {
      continue;
    }

    if (
      rangesOverlap(
        startsAt,
        endsAt,
        assignment.booking.scheduledStartAt,
        assignment.booking.scheduledEndAt,
      )
    ) {
      return false;
    }
  }

  return true;
}

function requiredSkillIdsForServices(services: ServiceForBooking[]): string[] {
  const skillIds = new Set<string>();

  for (const service of services) {
    for (const serviceSkill of service.skills) {
      skillIds.add(serviceSkill.skillId);
    }
  }

  return [...skillIds];
}

async function loadPublishedServices(
  serviceIds: string[],
): Promise<ServiceForBooking[]> {
  const uniqueServiceIds = [...new Set(serviceIds)];
  const services = await prisma.service.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
      status: "PUBLISHED",
      archivedAt: null,
    },
    include: {
      skills: true,
      tiers: true,
    },
  });

  if (services.length !== uniqueServiceIds.length) {
    throw new BookingConflictError(
      "One or more selected services are not available for booking.",
    );
  }

  return services;
}

async function loadEligibleStaff(
  services: ServiceForBooking[],
  startsAt: Date,
  endsAt: Date,
): Promise<StaffForAvailability[]> {
  const skillIds = requiredSkillIdsForServices(services);
  const serviceIds = services.map((service) => service.id);
  const eligibilityFilters: Prisma.StaffProfileWhereInput[] = [
    ...serviceIds.map((serviceId) => ({
      services: {
        some: {
          serviceId,
        },
      },
    })),
    ...skillIds.map((skillId) => ({
      skills: {
        some: {
          skillId,
        },
      },
    })),
  ];

  const where: Prisma.StaffProfileWhereInput = {
    status: "ACTIVE",
    user: {
      is: {
        status: "ACTIVE",
        accountType: "STAFF",
      },
    },
    AND: eligibilityFilters,
  };

  return prisma.staffProfile.findMany({
    where,
    orderBy: [{ ratingAverage: "desc" }, { createdAt: "asc" }],
    include: {
      user: true,
      services: true,
      schedules: true,
      exceptions: {
        where: {
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      },
      assignments: {
        where: {
          status: { not: "REJECTED" },
          booking: {
            status: {
              notIn: [...NON_BLOCKING_BOOKING_STATUSES],
            },
            scheduledStartAt: { lt: endsAt },
            scheduledEndAt: { gt: startsAt },
          },
        },
        include: {
          booking: true,
        },
      },
    },
  });
}

async function getAvailableSlots(
  services: ServiceForBooking[],
  date: string,
  durationMinutes: number,
): Promise<AvailableSlot[]> {
  const dayRange = indiaDayRange(date);
  const weekday = indiaWeekday(date);
  const staffRows = await loadEligibleStaff(
    services,
    dayRange.start,
    dayRange.end,
  );
  const minimumStart = new Date(Date.now() + 30 * 60 * 1000);
  const slotMap = new Map<string, AvailableSlot>();

  for (const staff of staffRows) {
    const windows = staffWindowsForDate(staff, weekday);

    for (const window of windows) {
      for (
        let minute = window.startsAtMinute;
        minute + durationMinutes <= window.endsAtMinute;
        minute += SLOT_STEP_MINUTES
      ) {
        const startsAt = dateTimeInIndiaToUtc(date, minute);
        const endsAt = new Date(
          startsAt.getTime() + durationMinutes * 60 * 1000,
        );

        if (startsAt < minimumStart) {
          continue;
        }

        if (!staffIsFreeForWindow(staff, startsAt, endsAt)) {
          continue;
        }

        const key = startsAt.toISOString();
        const existing = slotMap.get(key);
        if (existing) {
          existing.availableCount += 1;
        } else {
          slotMap.set(key, {
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            availableCount: 1,
          });
        }
      }
    }
  }

  return [...slotMap.values()]
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .slice(0, 64);
}

async function findAvailableStaffForBooking(
  services: ServiceForBooking[],
  startsAt: Date,
  endsAt: Date,
): Promise<StaffForAvailability | null> {
  const staffRows = await loadEligibleStaff(services, startsAt, endsAt);
  const availableStaff = staffRows.filter((staff) =>
    staffIsFreeForWindow(staff, startsAt, endsAt),
  );

  if (availableStaff.length <= 1) {
    return availableStaff[0] ?? null;
  }

  const dayStart = new Date(startsAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const workloadRows = await prisma.staffAssignment.groupBy({
    by: ["staffProfileId"],
    where: {
      staffProfileId: {
        in: availableStaff.map((staff) => staff.id),
      },
      status: { not: "REJECTED" },
      booking: {
        status: {
          notIn: [...BOOKING_FINAL_STATUSES],
        },
        scheduledStartAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    },
    _count: {
      _all: true,
    },
  });
  const workloadByStaffId = new Map(
    workloadRows.map((row) => [row.staffProfileId, row._count._all]),
  );

  return (
    [...availableStaff].sort((left, right) => {
      const leftWorkload = workloadByStaffId.get(left.id) ?? 0;
      const rightWorkload = workloadByStaffId.get(right.id) ?? 0;

      if (leftWorkload !== rightWorkload) {
        return leftWorkload - rightWorkload;
      }

      const leftRating = Number(left.ratingAverage?.toString() ?? "0");
      const rightRating = Number(right.ratingAverage?.toString() ?? "0");

      if (leftRating !== rightRating) {
        return rightRating - leftRating;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })[0] ?? null
  );
}

function serializeBooking(booking: CustomerBookingForResponse) {
  const assignment = booking.assignments.at(0);
  const review = booking.reviews.at(0);

  return {
    id: booking.id,
    publicId: booking.publicId,
    status: booking.status,
    scheduledStartAt: booking.scheduledStartAt.toISOString(),
    scheduledEndAt: booking.scheduledEndAt.toISOString(),
    subtotalPaise: booking.subtotalPaise,
    discountPaise: booking.discountPaise,
    taxPaise: booking.taxPaise,
    totalPaise: booking.totalPaise,
    notes: booking.notes,
    address: {
      id: booking.address.id,
      label: booking.address.label,
      line1: booking.address.line1,
      line2: booking.address.line2,
      city: booking.address.city,
      region: booking.address.region,
      postalCode: booking.address.postalCode,
    },
    items: booking.items.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      serviceTierId: item.serviceTierId,
      packageId: item.packageId,
      serviceName: item.serviceName,
      serviceTierName: item.serviceTierName,
      packageName: item.packageName,
      quantity: item.quantity,
      unitPaise: item.unitPaise,
      taxPaise: item.taxPaise,
      totalPaise: item.totalPaise,
    })),
    staff: assignment
      ? {
          status: assignment.status,
        }
      : null,
    payments: booking.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: payment.status,
      amountPaise: payment.amountPaise,
      currency: payment.currency,
      capturedAt: payment.capturedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    })),
    review: review
      ? {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          highlights: jsonStringArray(review.highlights),
          status: review.status,
          showOnHomepage: review.showOnHomepage,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        }
      : null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

function serializeAddress(address: CustomerAddressForResponse) {
  return {
    id: address.id,
    label: address.label,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

function serializePublicReview(review: PublicReviewForResponse) {
  const serviceNames = [
    ...new Set(review.booking.items.map((item) => item.serviceName)),
  ].slice(0, 4);

  return {
    id: review.id,
    customerName: review.customerProfile.displayName,
    rating: review.rating,
    comment: review.comment,
    highlights: jsonStringArray(review.highlights),
    serviceNames,
    createdAt: review.createdAt.toISOString(),
  };
}

function hasPurchasedBooking(
  booking: Pick<CustomerBookingForResponse, "payments">,
): boolean {
  return booking.payments.some(
    (payment) =>
      payment.status === "CAPTURED" || payment.status === "AUTHORIZED",
  );
}

function toPlainContactMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}

function calculateNetTax(netPaise: number, gstRateBps: number | null): number {
  if (!gstRateBps) {
    return 0;
  }

  return Math.round((netPaise * gstRateBps) / 10_000);
}

function selectedServiceTier(
  service: ServiceForBooking,
  serviceTierId: string | undefined,
) {
  if (!serviceTierId) {
    return null;
  }

  const tier =
    service.tiers.find(
      (candidate) =>
        candidate.id === serviceTierId && candidate.status === "PUBLISHED",
    ) ?? null;

  if (!tier) {
    throw new BookingConflictError(
      "Selected service tier is not available for booking.",
    );
  }

  return tier;
}

function lineDurationMinutes(
  service: ServiceForBooking,
  tier: ReturnType<typeof selectedServiceTier>,
): number {
  return tier?.durationMinutes ?? service.durationMinutes;
}

function lineUnitPricePaise(
  service: ServiceForBooking,
  tier: ReturnType<typeof selectedServiceTier>,
  now: Date,
): number {
  return tier?.pricePaise ?? effectiveServicePricePaise(service, now);
}

async function buildBookingLineDrafts(
  items: BookingRequestItem[],
  serviceById: Map<string, ServiceForBooking>,
  pricingNow: Date,
): Promise<BookingLineDraft[]> {
  const packageIds = [
    ...new Set(
      items
        .map((item) => item.packageId)
        .filter((packageId): packageId is string => Boolean(packageId)),
    ),
  ];
  const packages =
    packageIds.length === 0
      ? []
      : await prisma.servicePackage.findMany({
          where: {
            id: {
              in: packageIds,
            },
            status: "PUBLISHED",
            archivedAt: null,
          },
          include: {
            items: true,
          },
        });

  if (packages.length !== packageIds.length) {
    throw new BookingConflictError(
      "One or more selected packages are not available for booking.",
    );
  }

  const packageById = new Map(packages.map((item) => [item.id, item]));
  const lineDrafts = items.map((item): BookingLineDraft => {
    const service = serviceById.get(item.serviceId);

    if (!service) {
      throw new BookingConflictError("Selected service was not found.");
    }

    const tier = selectedServiceTier(service, item.serviceTierId);
    const servicePackage = item.packageId
      ? (packageById.get(item.packageId) ?? null)
      : null;
    const unitPaise = lineUnitPricePaise(service, tier, pricingNow);
    const netPaise = unitPaise * item.quantity;
    const taxPaise = calculateNetTax(netPaise, service.gstRateBps);

    return {
      service,
      tier,
      packageId: servicePackage?.id ?? null,
      packageName: servicePackage?.name ?? null,
      serviceName: service.name,
      serviceTierName: tier?.name ?? null,
      durationMinutes: lineDurationMinutes(service, tier),
      quantity: item.quantity,
      unitPaise,
      netPaise,
      taxPaise,
      totalPaise: netPaise + taxPaise,
    };
  });

  for (const servicePackage of packages) {
    const packageLines = lineDrafts.filter(
      (lineDraft) => lineDraft.packageId === servicePackage.id,
    );

    if (packageLines.length === 0) {
      throw new BookingConflictError("Selected package has no services.");
    }

    for (const packageItem of servicePackage.items) {
      const selectedQuantity = packageLines
        .filter((lineDraft) => {
          if (lineDraft.service.id !== packageItem.serviceId) {
            return false;
          }

          return packageItem.serviceTierId
            ? lineDraft.tier?.id === packageItem.serviceTierId
            : true;
        })
        .reduce((total, lineDraft) => total + lineDraft.quantity, 0);

      if (selectedQuantity < packageItem.minQuantity) {
        throw new BookingConflictError(
          "Selected package is below the admin-defined minimum.",
        );
      }
    }

    const grossPaise = packageLines.reduce(
      (total, lineDraft) => total + lineDraft.unitPaise * lineDraft.quantity,
      0,
    );
    const discountedPaise = Math.round(
      (grossPaise * (10_000 - servicePackage.discountBps)) / 10_000,
    );
    const packageNetPaise = Math.max(
      discountedPaise,
      servicePackage.minPricePaise,
    );

    if (grossPaise <= 0) {
      continue;
    }

    let allocatedPaise = 0;

    packageLines.forEach((lineDraft, index) => {
      const lineGrossPaise = lineDraft.unitPaise * lineDraft.quantity;
      const lineNetPaise =
        index === packageLines.length - 1
          ? packageNetPaise - allocatedPaise
          : Math.round((lineGrossPaise / grossPaise) * packageNetPaise);

      allocatedPaise += lineNetPaise;
      lineDraft.netPaise = lineNetPaise;
      lineDraft.unitPaise = Math.max(
        0,
        Math.round(lineNetPaise / lineDraft.quantity),
      );
      lineDraft.taxPaise = calculateNetTax(
        lineNetPaise,
        lineDraft.service.gstRateBps,
      );
      lineDraft.totalPaise = lineDraft.netPaise + lineDraft.taxPaise;
    });
  }

  return lineDrafts;
}

async function loadCustomerBooking(
  bookingId: string,
  customerProfileId: string,
): Promise<CustomerBookingForResponse | null> {
  return prisma.booking.findFirst({
    where: {
      id: bookingId,
      customerProfileId,
    },
    include: {
      address: true,
      items: true,
      payments: {
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          staffProfile: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
}

function getBookingPaymentProvider(
  method: "RAZORPAY" | "PAY_AFTER_SERVICE",
  env: AppEnv,
): string {
  if (method === "PAY_AFTER_SERVICE") {
    return "pay_after_service";
  }

  return isRazorpayConfigured(env) ? "razorpay" : "development_razorpay";
}

function localRazorpayOrderId(
  payment: CustomerBookingForResponse["payments"][number],
): string | null {
  return payment.providerOrderId ?? payment.providerRef;
}

function verifiedStateFromRazorpayPayment(payment: RazorpayPaymentEntity) {
  const status = mapRazorpayPaymentStatus(payment);

  return {
    status,
    providerOrderId: payment.orderId,
    providerPaymentId: payment.id,
    providerStatus: payment.status,
    capturedAt: status === "CAPTURED" ? new Date() : undefined,
  };
}

function razorpayPaymentMatchesLocalRecord(
  providerPayment: RazorpayPaymentEntity,
  payment: CustomerBookingForResponse["payments"][number],
  expectedOrderId: string,
): boolean {
  return (
    providerPayment.orderId === expectedOrderId &&
    providerPayment.amount === payment.amountPaise &&
    providerPayment.currency.toUpperCase() === payment.currency.toUpperCase()
  );
}

function createAddressData(
  customerProfileId: string,
  address: CustomerAddressInput,
): Prisma.AddressUncheckedCreateInput {
  return {
    customerProfileId,
    label: address.label,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    isDefault: address.isDefault ?? false,
  };
}

export function createCustomerRouter(env: AppEnv): Router {
  const router = Router();
  const secureCookie = env.NODE_ENV === "production";

  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  const reviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 6,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  router.get(
    "/blogs",
    asyncHandler(async (req, res) => {
      const pageValue = Number(req.query.page ?? 1);
      const page =
        Number.isInteger(pageValue) && pageValue > 0
          ? Math.min(pageValue, 10_000)
          : 1;
      const pageSize = 12;
      const where: Prisma.BlogPostWhereInput = {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        archivedAt: null,
      };
      const [totalCount, posts] = await Promise.all([
        prisma.blogPost.count({ where }),
        prisma.blogPost.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            publicId: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImageUrl: true,
            coverImageAlt: true,
            publishedAt: true,
            updatedAt: true,
            author: { select: { name: true } },
          },
        }),
      ]);
      res.json(
        successEnvelope(
          {
            posts: posts.map((post) => ({
              ...post,
              authorName: post.author?.name ?? null,
              author: undefined,
              publishedAt: post.publishedAt?.toISOString() ?? null,
              updatedAt: post.updatedAt.toISOString(),
            })),
            pagination: {
              page,
              pageSize,
              totalCount,
              totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
            },
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/blogs/:slug",
    asyncHandler(async (req, res) => {
      const slug = getRouteParam(req.params.slug);
      const post = slug
        ? await prisma.blogPost.findFirst({
            where: {
              slug,
              status: "PUBLISHED",
              publishedAt: { lte: new Date() },
              archivedAt: null,
            },
            select: {
              publicId: true,
              title: true,
              slug: true,
              excerpt: true,
              body: true,
              coverImageUrl: true,
              coverImageAlt: true,
              seoTitle: true,
              seoDescription: true,
              publishedAt: true,
              updatedAt: true,
              author: { select: { name: true } },
            },
          })
        : null;
      if (!post) {
        sendError(res, 404, "NOT_FOUND", "Blog post was not found.");
        return;
      }
      res.json(
        successEnvelope(
          {
            post: {
              ...post,
              authorName: post.author?.name ?? null,
              author: undefined,
              publishedAt: post.publishedAt?.toISOString() ?? null,
              updatedAt: post.updatedAt.toISOString(),
            },
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/catalogue",
    asyncHandler(async (req, res) => {
      const parsed = publicCatalogueQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted catalogue filters.",
          parsed.error.issues,
        );
        return;
      }

      const serviceWhere: Prisma.ServiceWhereInput = {
        status: "PUBLISHED",
        archivedAt: null,
      };

      if (parsed.data.categorySlug) {
        serviceWhere.category = {
          OR: [
            { slug: parsed.data.categorySlug },
            { parent: { is: { slug: parsed.data.categorySlug } } },
          ],
        };
      }

      if (parsed.data.search) {
        serviceWhere.OR = [
          { name: { contains: parsed.data.search } },
          { shortDescription: { contains: parsed.data.search } },
          { category: { is: { name: { contains: parsed.data.search } } } },
        ];
      }

      const packageWhere: Prisma.ServicePackageWhereInput = {
        status: "PUBLISHED",
        archivedAt: null,
      };

      if (parsed.data.categorySlug) {
        packageWhere.category = {
          slug: parsed.data.categorySlug,
        };
      }

      const [homepage, categories, services, packages] = await Promise.all([
        loadPublicHomepageConfig(),
        prisma.category.findMany({
          where: {
            status: "PUBLISHED",
            archivedAt: null,
          },
          orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
          include: {
            parent: true,
            imageAsset: true,
          },
        }),
        prisma.service.findMany({
          where: serviceWhere,
          orderBy: [
            { featured: "desc" },
            { sortOrder: "asc" },
            { name: "asc" },
          ],
          include: {
            category: true,
            tiers: {
              orderBy: { sortOrder: "asc" },
            },
            images: {
              orderBy: { sortOrder: "asc" },
              include: { mediaAsset: true },
            },
          },
        }),
        prisma.servicePackage.findMany({
          where: packageWhere,
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            category: true,
            items: {
              orderBy: { sortOrder: "asc" },
              include: {
                service: true,
                serviceTier: true,
              },
            },
          },
        }),
      ]);
      const serializedServices = services.map(serializePublicService);
      const serializedPackages = packages.map(serializePublicPackage);

      res.json(
        successEnvelope(
          {
            business: {
              name: "Replica Home Saloon Service",
              city: "Lucknow",
              area: "Indira Nagar",
              addressLine:
                "C04 Gayatri Nagar (Pani Gao), Indira Nagar, near Peepal Tree, Lucknow 226016",
              supportEmail: "support@replicahomesaloonservice.in",
              websiteUrl: "https://replicahomesaloonservice.in",
              supportPhone: "+91 81128 68347",
              heroImageUrl: FALLBACK_HERO_IMAGE,
              fallbackServiceImages: serializedServices.map((_service, index) =>
                serviceFallbackImage(index),
              ),
              razorpayConfigured: Boolean(
                env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET,
              ),
              otpProviderConfigured: Boolean(env.SMS_PROVIDER_API_KEY),
              developmentMode: isLocalDevelopment(env),
            },
            categories: categories.map(serializePublicCategory),
            homepage,
            services: serializedServices,
            packages: serializedPackages,
            featuredServices:
              serializedServices.filter((service) => service.featured).length >
              0
                ? serializedServices.filter((service) => service.featured)
                : serializedServices.slice(0, 8),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/reviews",
    asyncHandler(async (_req, res) => {
      const reviews = await prisma.review.findMany({
        where: {
          status: "APPROVED",
          showOnHomepage: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 16,
        include: {
          customerProfile: true,
          booking: {
            include: {
              items: true,
            },
          },
        },
      });

      res.json(
        successEnvelope(
          {
            reviews: reviews.map(serializePublicReview),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/services/:slug",
    asyncHandler(async (req, res) => {
      const slug = getRouteParam(req.params.slug);

      if (!slug) {
        sendError(res, 404, "NOT_FOUND", "Service not found.");
        return;
      }

      const service = await prisma.service.findFirst({
        where: {
          slug,
          status: "PUBLISHED",
          archivedAt: null,
        },
        include: {
          category: true,
          tiers: {
            orderBy: { sortOrder: "asc" },
          },
          images: {
            orderBy: { sortOrder: "asc" },
            include: { mediaAsset: true },
          },
        },
      });

      if (!service) {
        sendError(res, 404, "NOT_FOUND", "Service not found.");
        return;
      }

      res.json(
        successEnvelope(
          { service: serializePublicService(service) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/categories/:slug",
    asyncHandler(async (req, res) => {
      const slug = getRouteParam(req.params.slug);

      if (!slug) {
        sendError(res, 404, "NOT_FOUND", "Category not found.");
        return;
      }

      const category = await prisma.category.findFirst({
        where: {
          slug,
          status: "PUBLISHED",
          archivedAt: null,
        },
        include: {
          parent: true,
          imageAsset: true,
        },
      });

      if (!category) {
        sendError(res, 404, "NOT_FOUND", "Category not found.");
        return;
      }

      const services = await prisma.service.findMany({
        where: {
          status: "PUBLISHED",
          archivedAt: null,
          category: {
            OR: [{ id: category.id }, { parentId: category.id }],
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          category: true,
          tiers: {
            orderBy: { sortOrder: "asc" },
          },
          images: {
            orderBy: { sortOrder: "asc" },
            include: { mediaAsset: true },
          },
        },
      });

      res.json(
        successEnvelope(
          {
            category: serializePublicCategory(category),
            services: services.map(serializePublicService),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/content/:slug",
    asyncHandler(async (req, res) => {
      const slug = getRouteParam(req.params.slug);

      if (!slug) {
        sendError(res, 404, "NOT_FOUND", "Content page not found.");
        return;
      }

      const page = await prisma.contentPage.findFirst({
        where: {
          slug,
          status: "PUBLISHED",
        },
        include: {
          revisions: {
            orderBy: { revisionNo: "desc" },
            take: 1,
          },
        },
      });

      if (!page || page.revisions.length === 0) {
        sendError(res, 404, "NOT_FOUND", "Content page not found.");
        return;
      }

      const revision = page.revisions.at(0);
      if (!revision) {
        sendError(res, 404, "NOT_FOUND", "Content page not found.");
        return;
      }

      res.json(
        successEnvelope(
          {
            page: {
              slug: page.slug,
              title: page.title,
              seoTitle: page.seoTitle,
              seoDescription: page.seoDescription,
              bodyHtml: revision.bodyHtml,
              bodyText: revision.bodyText,
              publishedAt: page.publishedAt?.toISOString() ?? null,
            },
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/contact",
    contactLimiter,
    asyncHandler(async (req, res) => {
      const parsed = customerContactRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted contact fields.",
          parsed.error.issues,
        );
        return;
      }

      const normalizedPhone = parsed.data.phone
        ? normalizePhone(parsed.data.phone)
        : null;

      if (parsed.data.phone && !normalizedPhone) {
        sendValidationError(res, "Enter a valid mobile number.");
        return;
      }

      const session = await loadCustomerSession(req);
      const contact = await prisma.contactSubmission.create({
        data: {
          customerProfileId: session?.actor.customerProfileId ?? null,
          name: parsed.data.name,
          phone: normalizedPhone,
          email: parsed.data.email ?? null,
          source: "public_customer_site",
          message: toPlainContactMessage(parsed.data.message),
        },
      });

      res.status(201).json(
        successEnvelope(
          {
            contact: {
              id: contact.id,
              status: contact.status,
              createdAt: contact.createdAt.toISOString(),
            },
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/auth/otp/request",
    otpLimiter,
    asyncHandler(async (req, res) => {
      const parsed = customerOtpRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Enter a valid mobile number.",
          parsed.error.issues,
        );
        return;
      }

      const phone = normalizePhone(parsed.data.phone);

      if (!phone) {
        sendValidationError(res, "Enter a valid mobile number.");
        return;
      }

      const identifier = `customer-login:${phone}`;
      const otp = createOtp();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

      await prisma.$transaction(async (transaction) => {
        await transaction.authVerification.updateMany({
          where: {
            identifier,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });

        await transaction.authVerification.create({
          data: {
            identifier,
            valueHash: hashOtp(identifier, otp, env),
            expiresAt,
          },
        });
      });

      logger.info(
        {
          phone: maskPhone(phone),
          developmentOtpReturned: isLocalDevelopment(env),
        },
        "Customer OTP generated.",
      );

      res.json(
        successEnvelope(
          {
            phone,
            expiresAt: expiresAt.toISOString(),
            delivery: env.SMS_PROVIDER_API_KEY
              ? "sms_provider"
              : "development_preview",
            developmentOtp: isLocalDevelopment(env) ? otp : null,
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/auth/otp/verify",
    otpLimiter,
    asyncHandler(async (req, res) => {
      const parsed = customerOtpVerifySchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted OTP fields.",
          parsed.error.issues,
        );
        return;
      }

      const phone = normalizePhone(parsed.data.phone);

      if (!phone) {
        sendValidationError(res, "Enter a valid mobile number.");
        return;
      }

      const identifier = `customer-login:${phone}`;
      const now = new Date();
      const verification = await prisma.authVerification.findFirst({
        where: {
          identifier,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (
        !verification ||
        verification.valueHash !== hashOtp(identifier, parsed.data.otp, env)
      ) {
        sendError(res, 401, "UNAUTHENTICATED", "OTP is incorrect or expired.");
        return;
      }

      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = createCustomerSessionExpiry();
      const customerName = parsed.data.name ?? `Customer ${phone.slice(-4)}`;

      const authResult = await prisma.$transaction(async (transaction) => {
        await transaction.authVerification.update({
          where: { id: verification.id },
          data: { usedAt: now },
        });

        const existingUser = await transaction.user.findUnique({
          where: { phone },
          include: {
            customerProfile: true,
          },
        });

        if (existingUser && existingUser.accountType !== "CUSTOMER") {
          throw new BookingConflictError(
            "This mobile number is already linked to another account type.",
          );
        }

        const isNewCustomer = !existingUser;
        const savedUser = await transaction.user.upsert({
          where: { phone },
          update: {
            name: existingUser?.name ?? customerName,
            status: "ACTIVE",
            phoneVerifiedAt: existingUser?.phoneVerifiedAt ?? now,
            lastLoginAt: now,
          },
          create: {
            phone,
            name: customerName,
            accountType: "CUSTOMER",
            status: "ACTIVE",
            phoneVerifiedAt: now,
            lastLoginAt: now,
          },
          include: {
            customerProfile: true,
          },
        });

        const profile =
          savedUser.customerProfile ??
          (await transaction.customerProfile.create({
            data: {
              userId: savedUser.id,
              displayName: savedUser.name,
            },
          }));
        const requiresProfileCompletion =
          isNewCustomer ||
          (profile.segment !== "PROFILE_COMPLETE" &&
            /^Customer\s+\d{4}$/i.test(profile.displayName));

        await transaction.authSession.create({
          data: {
            userId: savedUser.id,
            tokenHash,
            expiresAt,
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
          },
        });

        await transaction.securityEvent.create({
          data: {
            actorId: savedUser.id,
            event: "customer.otp_login_succeeded",
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
          },
        });

        return {
          isNewCustomer,
          requiresProfileCompletion,
          user: {
            ...savedUser,
            customerProfile: profile,
          },
        };
      });
      const user = authResult.user;

      const actor: CustomerActor = {
        id: user.id,
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: "ACTIVE",
        customerProfileId: user.customerProfile.id,
        displayName: user.customerProfile.displayName,
      };

      res.setHeader(
        "Set-Cookie",
        serializeCustomerSessionCookie(token, expiresAt, secureCookie),
      );
      res.json(
        successEnvelope(
          {
            user: serializeCustomerActor(actor),
            expiresAt: expiresAt.toISOString(),
            isNewCustomer: authResult.isNewCustomer,
            requiresProfileCompletion: authResult.requiresProfileCompletion,
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/auth/profile",
    requireActiveCustomer(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const parsed = customerCompleteProfileRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted profile fields.",
          parsed.error.issues,
        );
        return;
      }

      const emailOwner = parsed.data.email
        ? await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: { id: true },
          })
        : null;

      if (emailOwner && emailOwner.id !== actor.id) {
        sendValidationError(
          res,
          "This email is already linked to another account.",
        );
        return;
      }

      const profileNotes = JSON.stringify({
        source: "customer_profile_completion",
        dateOfBirth: parsed.data.dateOfBirth ?? null,
        gender: parsed.data.gender ?? null,
      });

      const user = await prisma.$transaction(async (transaction) => {
        const savedUser = await transaction.user.update({
          where: { id: actor.id },
          data: {
            email: parsed.data.email ?? null,
            name: parsed.data.name,
          },
          include: {
            customerProfile: true,
          },
        });

        const profile = await transaction.customerProfile.update({
          where: { id: actor.customerProfileId },
          data: {
            displayName: parsed.data.name,
            notes: profileNotes,
            segment: "PROFILE_COMPLETE",
          },
        });

        await transaction.securityEvent.create({
          data: {
            actorId: actor.id,
            event: "customer.profile_completed",
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
          },
        });

        return {
          ...savedUser,
          customerProfile: profile,
        };
      });

      const updatedActor: CustomerActor = {
        id: user.id,
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: "ACTIVE",
        customerProfileId: user.customerProfile.id,
        displayName: user.customerProfile.displayName,
      };

      res.json(
        successEnvelope(
          {
            user: serializeCustomerActor(updatedActor),
            profileCompleted: true,
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/auth/me",
    requireActiveCustomer(),
    asyncHandler(async (_req, res) => {
      const actor = getActor(res);
      const [addresses, bookings] = await Promise.all([
        prisma.address.findMany({
          where: {
            customerProfileId: actor.customerProfileId,
            archivedAt: null,
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        }),
        prisma.booking.findMany({
          where: {
            customerProfileId: actor.customerProfileId,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            address: true,
            items: true,
            payments: {
              orderBy: { createdAt: "desc" },
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            assignments: {
              orderBy: { assignedAt: "desc" },
              include: {
                staffProfile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      res.json(
        successEnvelope(
          {
            user: serializeCustomerActor(actor),
            addresses: addresses.map(serializeAddress),
            bookings: bookings.map(serializeBooking),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/addresses",
    requireActiveCustomer(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const parsed = customerAddressInputSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted address fields.",
          parsed.error.issues,
        );
        return;
      }

      const existingAddressCount = await prisma.address.count({
        where: {
          customerProfileId: actor.customerProfileId,
          archivedAt: null,
        },
      });
      const shouldSetDefault =
        existingAddressCount === 0 || parsed.data.isDefault === true;

      const result = await prisma.$transaction(async (transaction) => {
        if (shouldSetDefault) {
          await transaction.address.updateMany({
            where: {
              customerProfileId: actor.customerProfileId,
              archivedAt: null,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        const address = await transaction.address.create({
          data: createAddressData(actor.customerProfileId, {
            ...parsed.data,
            isDefault: shouldSetDefault,
          }),
        });

        const addresses = await transaction.address.findMany({
          where: {
            customerProfileId: actor.customerProfileId,
            archivedAt: null,
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return { address, addresses };
      });

      res.status(201).json(
        successEnvelope(
          {
            address: serializeAddress(result.address),
            addresses: result.addresses.map(serializeAddress),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/auth/logout",
    requireActiveCustomer(),
    asyncHandler(async (_req, res) => {
      const tokenHash = res.locals.tokenHash;

      if (typeof tokenHash === "string") {
        await prisma.authSession.updateMany({
          where: {
            tokenHash,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      res.setHeader(
        "Set-Cookie",
        serializeClearCustomerSessionCookie(secureCookie),
      );
      res.json(successEnvelope({ ok: true }, getRequestId(res)));
    }),
  );

  router.get(
    "/availability",
    asyncHandler(async (req, res) => {
      const parsed = customerAvailabilityQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted availability filters.",
          parsed.error.issues,
        );
        return;
      }

      const serviceIds = parseServiceIds(
        parsed.data.serviceId,
        parsed.data.serviceIds,
      );
      let requestedItems: BookingRequestItem[];

      if (parsed.data.items) {
        let rawItems: unknown;

        try {
          rawItems = JSON.parse(parsed.data.items);
        } catch {
          sendValidationError(
            res,
            "Check the submitted availability cart items.",
          );
          return;
        }

        const parsedItems = availabilityItemsSchema.safeParse(rawItems);

        if (!parsedItems.success) {
          sendValidationError(
            res,
            "Check the submitted availability cart items.",
            parsedItems.error.issues,
          );
          return;
        }

        requestedItems = parsedItems.data;
      } else {
        requestedItems = serviceIds.map((serviceId) => ({
          serviceId,
          quantity: 1,
        }));
      }

      let services: ServiceForBooking[];

      try {
        services = await loadPublishedServices(
          requestedItems.map((item) => item.serviceId),
        );
      } catch (error) {
        if (error instanceof BookingConflictError) {
          sendError(res, 404, "NOT_FOUND", error.message);
          return;
        }

        throw error;
      }

      try {
        const serviceById = new Map(
          services.map((service) => [service.id, service]),
        );
        const lineDrafts = await buildBookingLineDrafts(
          requestedItems,
          serviceById,
          new Date(),
        );
        const durationMinutes = lineDrafts.reduce(
          (total, lineDraft) =>
            total + lineDraft.durationMinutes * lineDraft.quantity,
          0,
        );
        const slots = await getAvailableSlots(
          services,
          parsed.data.date,
          durationMinutes,
        );

        res.json(
          successEnvelope(
            {
              date: parsed.data.date,
              durationMinutes,
              slots,
            },
            getRequestId(res),
          ),
        );
      } catch (error) {
        if (error instanceof BookingConflictError) {
          sendError(res, 409, "CONFLICT", error.message);
          return;
        }

        throw error;
      }
    }),
  );

  router.post(
    "/bookings",
    requireActiveCustomer(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const parsed = customerCreateBookingRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted booking fields.",
          parsed.error.issues,
        );
        return;
      }

      if (!parsed.data.addressId && !parsed.data.address) {
        sendValidationError(res, "Provide a saved address or a new address.");
        return;
      }

      const serviceIds = parsed.data.items.map((item) => item.serviceId);
      const startsAt = new Date(parsed.data.scheduledStartAt);
      let services: ServiceForBooking[];

      try {
        services = await loadPublishedServices(serviceIds);
      } catch (error) {
        if (error instanceof BookingConflictError) {
          sendError(res, 404, "NOT_FOUND", error.message);
          return;
        }

        throw error;
      }

      const serviceById = new Map(
        services.map((service) => [service.id, service]),
      );
      const pricingNow = new Date();
      let lineDrafts: BookingLineDraft[];

      try {
        lineDrafts = await buildBookingLineDrafts(
          parsed.data.items,
          serviceById,
          pricingNow,
        );
      } catch (error) {
        if (error instanceof BookingConflictError) {
          sendError(res, 409, "CONFLICT", error.message);
          return;
        }

        throw error;
      }

      const durationMinutes = lineDrafts.reduce(
        (total, lineDraft) =>
          total + lineDraft.durationMinutes * lineDraft.quantity,
        0,
      );
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      if (startsAt <= new Date(Date.now() + 30 * 60 * 1000)) {
        sendValidationError(res, "Choose a slot at least 30 minutes from now.");
        return;
      }

      const selectedStaff = await findAvailableStaffForBooking(
        services,
        startsAt,
        endsAt,
      );

      if (!selectedStaff) {
        sendError(
          res,
          409,
          "CONFLICT",
          "No professional is available for the selected slot.",
        );
        return;
      }

      const subtotalPaise = lineDrafts.reduce(
        (total, lineDraft) => total + lineDraft.netPaise,
        0,
      );
      const taxPaise = lineDrafts.reduce(
        (total, lineDraft) => total + lineDraft.taxPaise,
        0,
      );

      const booking = await prisma.$transaction(async (transaction) => {
        let addressId = parsed.data.addressId;

        if (addressId) {
          const existingAddress = await transaction.address.findFirst({
            where: {
              id: addressId,
              customerProfileId: actor.customerProfileId,
              archivedAt: null,
            },
          });

          if (!existingAddress) {
            throw new BookingConflictError("Selected address was not found.");
          }
        } else if (parsed.data.address) {
          const createdAddress = await transaction.address.create({
            data: createAddressData(
              actor.customerProfileId,
              parsed.data.address,
            ),
          });
          addressId = createdAddress.id;
        }

        if (!addressId) {
          throw new BookingConflictError("Booking address was not resolved.");
        }

        const savedBooking = await transaction.booking.create({
          data: {
            customerProfileId: actor.customerProfileId,
            addressId,
            status: "DRAFT",
            scheduledStartAt: startsAt,
            scheduledEndAt: endsAt,
            subtotalPaise,
            taxPaise,
            totalPaise: subtotalPaise + taxPaise,
            notes: parsed.data.notes ?? null,
            items: {
              create: lineDrafts.map((lineDraft) => ({
                serviceId: lineDraft.service.id,
                serviceTierId: lineDraft.tier?.id ?? null,
                packageId: lineDraft.packageId,
                serviceName: lineDraft.serviceName,
                serviceTierName: lineDraft.serviceTierName,
                packageName: lineDraft.packageName,
                quantity: lineDraft.quantity,
                unitPaise: lineDraft.unitPaise,
                taxPaise: lineDraft.taxPaise,
                totalPaise: lineDraft.totalPaise,
              })),
            },
            assignments: {
              create: {
                staffProfileId: selectedStaff.id,
                status: "HELD",
              },
            },
            statusHistory: {
              create: {
                status: "DRAFT",
                actorId: actor.id,
                reason: "Customer checkout started.",
              },
            },
          },
        });

        return transaction.booking.findUniqueOrThrow({
          where: { id: savedBooking.id },
          include: {
            address: true,
            items: true,
            payments: {
              orderBy: { createdAt: "desc" },
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            assignments: {
              orderBy: { assignedAt: "desc" },
              include: {
                staffProfile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });
      });

      res
        .status(201)
        .json(
          successEnvelope(
            { booking: serializeBooking(booking) },
            getRequestId(res),
          ),
        );
    }),
  );

  router.post(
    "/bookings/:bookingId/reviews",
    reviewLimiter,
    requireActiveCustomer(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const parsed = customerCreateReviewRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted review fields.",
          parsed.error.issues,
        );
        return;
      }

      const bookingIdParam = req.params.bookingId;

      if (typeof bookingIdParam !== "string" || !bookingIdParam.trim()) {
        sendValidationError(res, "Booking id is required.");
        return;
      }

      const bookingId = bookingIdParam;

      const booking = await loadCustomerBooking(
        bookingId,
        actor.customerProfileId,
      );

      if (!booking) {
        sendError(res, 404, "NOT_FOUND", "Booking not found.");
        return;
      }

      if (!hasPurchasedBooking(booking) || booking.status === "CANCELLED") {
        sendError(
          res,
          403,
          "FORBIDDEN",
          "Reviews can only be submitted after a paid service booking.",
        );
        return;
      }

      if (booking.reviews.length > 0) {
        sendError(res, 409, "CONFLICT", "This booking already has a review.");
        return;
      }

      const review = await prisma.review.create({
        data: {
          bookingId: booking.id,
          customerProfileId: actor.customerProfileId,
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
          highlights: parsed.data.highlights,
          status: "PENDING",
          showOnHomepage: false,
        },
      });

      res.status(201).json(
        successEnvelope(
          {
            review: {
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              highlights: jsonStringArray(review.highlights),
              status: review.status,
              showOnHomepage: review.showOnHomepage,
              createdAt: review.createdAt.toISOString(),
              updatedAt: review.updatedAt.toISOString(),
            },
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/payments/razorpay/webhook",
    webhookLimiter,
    asyncHandler(async (req, res) => {
      const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
      const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
      const signature = req.header("x-razorpay-signature");

      if (!isRazorpayWebhookConfigured(env) || !webhookSecret) {
        sendError(
          res,
          503,
          "INTERNAL_ERROR",
          "Razorpay webhook secret is not configured.",
        );
        return;
      }

      if (!rawBody || !signature) {
        sendValidationError(res, "Razorpay webhook payload is invalid.");
        return;
      }

      if (
        !verifyRazorpayWebhookSignature({
          rawBody,
          signature,
          secret: webhookSecret,
        })
      ) {
        sendError(
          res,
          403,
          "FORBIDDEN",
          "Razorpay webhook signature could not be verified.",
        );
        return;
      }

      const parsedWebhook = parseRazorpayWebhookPayload(rawBody);
      const payloadHash = hashRazorpayWebhookPayload(rawBody);

      if (!parsedWebhook) {
        sendValidationError(
          res,
          "Razorpay webhook payload was not recognized.",
        );
        return;
      }

      const existingEvent = await prisma.webhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: "razorpay",
            providerEventId: parsedWebhook.eventId,
          },
        },
      });

      if (existingEvent) {
        await prisma.webhookEvent.update({
          where: { id: existingEvent.id },
          data: {
            attempts: { increment: 1 },
          },
        });
        res.json(
          successEnvelope(
            {
              received: true,
              duplicate: true,
              processingStatus: existingEvent.processingStatus,
            },
            getRequestId(res),
          ),
        );
        return;
      }

      if (!parsedWebhook.payment) {
        await prisma.webhookEvent.create({
          data: {
            provider: "razorpay",
            providerEventId: parsedWebhook.eventId,
            eventName: parsedWebhook.eventName,
            payloadHash,
            processingStatus: "IGNORED",
            attempts: 1,
            lastError: "Webhook event did not contain a payment entity.",
            processedAt: new Date(),
          },
        });

        res.json(
          successEnvelope(
            { received: true, processingStatus: "IGNORED" },
            getRequestId(res),
          ),
        );
        return;
      }

      const providerPayment = parsedWebhook.payment;
      const payment = await prisma.payment.findFirst({
        where: {
          provider: "razorpay",
          OR: [
            { providerPaymentId: providerPayment.id },
            ...(providerPayment.orderId
              ? [
                  { providerOrderId: providerPayment.orderId },
                  { providerRef: providerPayment.orderId },
                ]
              : []),
          ],
        },
      });
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          provider: "razorpay",
          providerEventId: parsedWebhook.eventId,
          eventName: parsedWebhook.eventName,
          payloadHash,
          processingStatus: "RECEIVED",
          attempts: 1,
          paymentId: payment?.id ?? null,
        },
      });

      if (
        !payment ||
        !providerPayment.orderId ||
        providerPayment.amount !== payment.amountPaise ||
        providerPayment.currency.toUpperCase() !==
          payment.currency.toUpperCase()
      ) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processingStatus: "FAILED",
            lastError: payment
              ? "Razorpay payment amount, currency or order id did not match."
              : "Local payment record was not found for the Razorpay event.",
            processedAt: new Date(),
          },
        });

        res
          .status(202)
          .json(
            successEnvelope(
              { received: true, processingStatus: "FAILED" },
              getRequestId(res),
            ),
          );
        return;
      }

      try {
        await prisma.$transaction(async (transaction) => {
          await recordPaymentStateAndMaybeConfirmBooking(
            transaction,
            payment.bookingId,
            payment.id,
            verifiedStateFromRazorpayPayment(providerPayment),
            { requireBookingConfirmation: false },
          );

          await transaction.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              processingStatus: "PROCESSED",
              processedAt: new Date(),
            },
          });
        });
      } catch (error) {
        const message =
          error instanceof BookingConflictError
            ? error.message
            : "Razorpay webhook processing failed.";

        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processingStatus: "FAILED",
            lastError: message,
            processedAt: new Date(),
          },
        });

        if (!(error instanceof BookingConflictError)) {
          throw error;
        }

        res
          .status(202)
          .json(
            successEnvelope(
              { received: true, processingStatus: "FAILED" },
              getRequestId(res),
            ),
          );
        return;
      }

      res.json(
        successEnvelope(
          { received: true, processingStatus: "PROCESSED" },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/payments/checkout",
    requireActiveCustomer(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const parsed = customerCreatePaymentRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted payment fields.",
          parsed.error.issues,
        );
        return;
      }

      const booking = await loadCustomerBooking(
        parsed.data.bookingId,
        actor.customerProfileId,
      );

      if (!booking) {
        sendError(res, 404, "NOT_FOUND", "Booking not found.");
        return;
      }

      if (BOOKING_FINAL_STATUSES.includes(booking.status)) {
        sendError(res, 409, "CONFLICT", "This booking can no longer be paid.");
        return;
      }

      const provider = getBookingPaymentProvider(parsed.data.method, env);

      if (parsed.data.method === "PAY_AFTER_SERVICE") {
        const payment = await prisma.$transaction(async (transaction) => {
          const savedPayment = await transaction.payment.create({
            data: {
              bookingId: booking.id,
              provider,
              providerRef: `pay_after_service_${randomUUID()}`,
              status: "AUTHORIZED",
              amountPaise: booking.totalPaise,
              currency: "INR",
              idempotencyKey: parsed.data.idempotencyKey ?? null,
              providerStatus: "authorized_offline",
              verifiedAt: new Date(),
            },
          });

          await recordPaymentStateAndMaybeConfirmBooking(
            transaction,
            booking.id,
            savedPayment.id,
            {
              status: "AUTHORIZED",
              providerStatus: "authorized_offline",
            },
          );
          return transaction.payment.findUniqueOrThrow({
            where: { id: savedPayment.id },
          });
        });
        const confirmedBooking = await loadCustomerBooking(
          booking.id,
          actor.customerProfileId,
        );

        res.json(
          successEnvelope(
            {
              mode: "pay_after_service",
              payment: {
                id: payment.id,
                provider: payment.provider,
                status: payment.status,
                amountPaise: payment.amountPaise,
                currency: payment.currency,
              },
              booking: confirmedBooking
                ? serializeBooking(confirmedBooking)
                : null,
            },
            getRequestId(res),
          ),
        );
        return;
      }

      if (provider === "razorpay") {
        try {
          const order = await createRazorpayOrder(env, {
            amountPaise: booking.totalPaise,
            receipt: booking.publicId,
            notes: {
              bookingId: booking.id,
              bookingPublicId: booking.publicId,
              customerProfileId: booking.customerProfileId,
            },
          });
          const payment = await prisma.payment.create({
            data: {
              bookingId: booking.id,
              provider,
              providerRef: order.id,
              providerOrderId: order.id,
              providerStatus: order.status,
              status: "PENDING",
              amountPaise: booking.totalPaise,
              currency: order.currency,
              idempotencyKey: parsed.data.idempotencyKey ?? null,
            },
          });

          res.json(
            successEnvelope(
              {
                mode: "razorpay",
                razorpayKeyId: env.RAZORPAY_KEY_ID,
                order: {
                  id: order.id,
                  amount: order.amount,
                  currency: order.currency,
                  status: order.status,
                },
                payment: {
                  id: payment.id,
                  provider: payment.provider,
                  status: payment.status,
                  amountPaise: payment.amountPaise,
                  currency: payment.currency,
                },
              },
              getRequestId(res),
            ),
          );
        } catch (error) {
          logger.warn({ error }, "Razorpay checkout initialization failed.");
          sendError(
            res,
            503,
            "INTERNAL_ERROR",
            "Payment provider could not be initialized.",
          );
        }
        return;
      }

      const developmentPaymentToken = crypto
        .randomBytes(32)
        .toString("base64url");
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider,
          providerRef: `dev_order_${randomUUID()}`,
          providerStatus: "created",
          status: "PENDING",
          amountPaise: booking.totalPaise,
          currency: "INR",
          idempotencyKey: hashDevelopmentToken(developmentPaymentToken, env),
        },
      });

      res.json(
        successEnvelope(
          {
            mode: "development_razorpay",
            payment: {
              id: payment.id,
              provider: payment.provider,
              status: payment.status,
              amountPaise: payment.amountPaise,
              currency: payment.currency,
            },
            developmentPaymentToken,
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/payments/verify",
    requireActiveCustomer(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const parsed = customerVerifyPaymentRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted payment verification fields.",
          parsed.error.issues,
        );
        return;
      }

      const booking = await loadCustomerBooking(
        parsed.data.bookingId,
        actor.customerProfileId,
      );

      if (!booking) {
        sendError(res, 404, "NOT_FOUND", "Booking not found.");
        return;
      }

      const payment = booking.payments.find(
        (candidate) => candidate.id === parsed.data.paymentId,
      );

      if (!payment) {
        sendError(res, 404, "NOT_FOUND", "Payment not found.");
        return;
      }

      if (payment.status === "CAPTURED") {
        res.json(
          successEnvelope(
            {
              booking: serializeBooking(booking),
            },
            getRequestId(res),
          ),
        );
        return;
      }

      let verifiedRazorpayPayment: RazorpayPaymentEntity | null = null;

      if (payment.provider === "razorpay") {
        const storedOrderId = localRazorpayOrderId(payment);

        if (
          !env.RAZORPAY_KEY_SECRET ||
          !storedOrderId ||
          !parsed.data.razorpayOrderId ||
          !parsed.data.razorpayPaymentId ||
          !parsed.data.razorpaySignature
        ) {
          sendValidationError(res, "Razorpay verification data is incomplete.");
          return;
        }

        if (parsed.data.razorpayOrderId !== storedOrderId) {
          sendError(
            res,
            403,
            "FORBIDDEN",
            "Payment order could not be verified.",
          );
          return;
        }

        if (
          payment.providerPaymentId &&
          payment.providerPaymentId !== parsed.data.razorpayPaymentId
        ) {
          sendError(
            res,
            409,
            "CONFLICT",
            "Payment has already been linked to a different Razorpay payment.",
          );
          return;
        }

        const validSignature = verifyRazorpayCheckoutSignature({
          orderId: storedOrderId,
          paymentId: parsed.data.razorpayPaymentId,
          signature: parsed.data.razorpaySignature,
          secret: env.RAZORPAY_KEY_SECRET,
        });

        if (!validSignature) {
          sendError(
            res,
            403,
            "FORBIDDEN",
            "Payment signature could not be verified.",
          );
          return;
        }

        try {
          verifiedRazorpayPayment = await fetchRazorpayPayment(
            env,
            parsed.data.razorpayPaymentId,
          );
        } catch (error) {
          logger.warn({ error }, "Razorpay payment status lookup failed.");
          sendError(
            res,
            503,
            "INTERNAL_ERROR",
            "Payment provider status could not be verified.",
          );
          return;
        }

        if (
          !razorpayPaymentMatchesLocalRecord(
            verifiedRazorpayPayment,
            payment,
            storedOrderId,
          )
        ) {
          sendError(
            res,
            403,
            "FORBIDDEN",
            "Payment provider details did not match the booking.",
          );
          return;
        }
      } else if (payment.provider === "development_razorpay") {
        if (
          !isLocalDevelopment(env) ||
          !parsed.data.developmentPaymentToken ||
          payment.idempotencyKey !==
            hashDevelopmentToken(parsed.data.developmentPaymentToken, env)
        ) {
          sendError(
            res,
            403,
            "FORBIDDEN",
            "Development payment token is invalid.",
          );
          return;
        }
      } else {
        sendError(
          res,
          400,
          "BAD_REQUEST",
          "Payment provider is not verifiable.",
        );
        return;
      }

      const verifiedPaymentState = verifiedRazorpayPayment
        ? verifiedStateFromRazorpayPayment(verifiedRazorpayPayment)
        : {
            status: "CAPTURED" as const,
            providerStatus: "development_captured",
            capturedAt: new Date(),
          };

      try {
        await prisma.$transaction(async (transaction) => {
          await recordPaymentStateAndMaybeConfirmBooking(
            transaction,
            booking.id,
            payment.id,
            verifiedPaymentState,
          );
        });
      } catch (error) {
        if (error instanceof BookingConflictError) {
          sendError(res, 409, "CONFLICT", error.message);
          return;
        }

        throw error;
      }

      if (!isPaymentAcceptedStatus(verifiedPaymentState.status)) {
        sendError(
          res,
          409,
          "CONFLICT",
          "Razorpay payment has not reached an accepted state.",
        );
        return;
      }

      const confirmedBooking = await loadCustomerBooking(
        booking.id,
        actor.customerProfileId,
      );

      res.json(
        successEnvelope(
          {
            booking: confirmedBooking
              ? serializeBooking(confirmedBooking)
              : serializeBooking(booking),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  return router;
}
