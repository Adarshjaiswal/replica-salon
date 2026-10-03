import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppEnv } from "@replica/config";
import {
  adminCreateCategoryRequestSchema,
  adminCreateRoleRequestSchema,
  adminCreateServiceRequestSchema,
  adminCreateStaffRequestSchema,
  adminCreateUserRequestSchema,
  adminCreatePackageRequestSchema,
  adminBookingListQuerySchema,
  adminBlogListQuerySchema,
  adminCreateBlogRequestSchema,
  adminCategoryListQuerySchema,
  adminImageUploadRequestSchema,
  adminPackageListQuerySchema,
  adminPaymentListQuerySchema,
  adminReviewListQuerySchema,
  adminRoleListQuerySchema,
  adminServiceListQuerySchema,
  adminStaffListQuerySchema,
  adminUpdateBookingAssignmentRequestSchema,
  adminUpdateBlogRequestSchema,
  adminUpdatePackageRequestSchema,
  adminUpdateReviewRequestSchema,
  adminUpdateCategoryRequestSchema,
  adminUpdateHomepageRequestSchema,
  adminUpdateRoleRequestSchema,
  adminUpdateServiceRequestSchema,
  adminUpdateStaffRequestSchema,
  adminUpdateUserRequestSchema,
  adminUserListQuerySchema,
  adminLoginRequestSchema,
  adminModuleKeySchema,
  defaultPublicHomepageConfig,
  errorEnvelope,
  permissionActionSchema,
  permissionResourceSchema,
  publicHomepageConfigSchema,
  successEnvelope,
  toPermissionKey,
  type AdminCategorySort,
  type AdminBookingSort,
  type AdminModuleKey,
  type AdminPackageSort,
  type AdminPaymentSort,
  type AdminRoleSort,
  type AdminReviewSort,
  type AdminServiceSort,
  type AdminStaffSort,
  type AdminUserSort,
  type PermissionAction,
  type PermissionKey,
  type PermissionResource,
  type PublicHomepageConfig,
  type ReviewModerationStatus,
} from "@replica/contracts";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  authorize,
  createSessionExpiry,
  createSessionToken,
  hashPassword,
  hashContextValue,
  hashSessionToken,
  verifyPassword,
} from "@replica/auth";
import {
  prisma,
  type BookingStatus,
  type PaymentStatus,
  type Prisma,
} from "@replica/db";
import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import {
  BookingConflictError,
  recordPaymentStateAndMaybeConfirmBooking,
} from "./paymentLifecycle.js";
import {
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  mapRazorpayPaymentStatus,
  selectMostRelevantRazorpayPayment,
  type RazorpayPaymentEntity,
} from "./razorpay.js";

interface AdminActor {
  id: string;
  publicId: string;
  email: string | null;
  name: string;
  accountType: "ADMIN";
  status: "ACTIVE";
  roles: string[];
  permissions: PermissionKey[];
  permissionSet: ReadonlySet<PermissionKey>;
}

interface LoadedAdminSession {
  actor: AdminActor;
  sessionId: string;
  tokenHash: string;
}

interface DashboardCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "success" | "warning";
}

interface DashboardChartPoint {
  label: string;
  bookings: number;
  revenuePaise: number;
}

interface DashboardStatusSlice {
  label: string;
  value: number;
}

interface ModuleRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updatedAt: string | null;
}

interface ModuleSnapshot {
  key: AdminModuleKey;
  label: string;
  totalCount: number;
  activeCount: number | null;
  records: ModuleRecord[];
  emptyMessage: string;
}

interface ModuleDefinition {
  label: string;
  permission: {
    resource: PermissionResource;
    action: PermissionAction;
  };
  emptyMessage: string;
}

interface PermissionOption {
  key: PermissionKey;
  resource: PermissionResource;
  action: PermissionAction;
  description: string | null;
}

type StaffProfileWithUser = Prisma.StaffProfileGetPayload<{
  include: {
    user: true;
    services: {
      include: {
        service: true;
      };
    };
  };
}>;

type AdminUserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true;
      };
    };
  };
}>;

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: { permissions: { include: { permission: true } } };
}>;

type AdminReviewWithRelations = Prisma.ReviewGetPayload<{
  include: {
    customerProfile: true;
    booking: {
      include: {
        items: true;
        payments: true;
      };
    };
    moderatedBy: true;
  };
}>;

type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: { parent: true; imageAsset: true };
}>;

type ServiceWithCategory = Prisma.ServiceGetPayload<{
  include: {
    category: true;
    tiers: true;
    images: {
      include: {
        mediaAsset: true;
      };
    };
  };
}>;

type ServicePackageWithRelations = Prisma.ServicePackageGetPayload<{
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

type AdminBookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    customerProfile: {
      include: {
        user: true;
      };
    };
    address: true;
    items: true;
    payments: true;
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

type AdminPaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    booking: {
      include: {
        customerProfile: {
          include: {
            user: true;
          };
        };
        items: true;
      };
    };
    invoice: true;
    refunds: true;
    webhookEvents: {
      orderBy: { receivedAt: "desc" };
      take: 3;
    };
  };
}>;

const ADMIN_PAYMENT_INCLUDE = {
  booking: {
    include: {
      customerProfile: {
        include: {
          user: true,
        },
      },
      items: true,
    },
  },
  invoice: true,
  refunds: true,
  webhookEvents: {
    orderBy: { receivedAt: "desc" },
    take: 3,
  },
} as const satisfies Prisma.PaymentInclude;

interface StaffListRow {
  id: string;
  name: string;
  employeeCode: string;
  email: string | null;
  phone: string | null;
  engagementType: "SALARIED" | "GIG";
  emergencyPhone: string | null;
  serviceIds: string[];
  services: Array<{
    id: string;
    name: string;
  }>;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  createdAt: string;
  updatedAt: string;
}

interface CategoryListRow {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  imageAssetId: string | null;
  imageUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MediaImageRow {
  id: string;
  publicId: string;
  url: string;
  altText: string | null;
  contentType: string;
  sizeBytes: number;
}

interface ServiceListRow {
  id: string;
  publicId: string;
  categoryId: string;
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
  sortOrder: number;
  mainImage: MediaImageRow | null;
  galleryImages: MediaImageRow[];
  tiers: ServiceTierRow[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServiceTierRow {
  id: string;
  publicId: string;
  tierType: "PREMIUM" | "LUXURY";
  name: string;
  description: string | null;
  durationMinutes: number | null;
  pricePaise: number;
  compareAtPricePaise: number | null;
  productsUsed: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
}

interface ServicePackageItemRow {
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

interface ServicePackageRow {
  id: string;
  publicId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  minPricePaise: number;
  compareAtPricePaise: number | null;
  discountBps: number;
  durationMinutes: number;
  inclusions: string[];
  items: ServicePackageItemRow[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminBookingRow {
  id: string;
  publicId: string;
  customerName: string;
  customerPhone: string | null;
  addressSummary: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  serviceNames: string[];
  staff: {
    id: string;
    name: string;
    employeeCode: string;
    status: string;
  } | null;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminPaymentRow {
  id: string;
  bookingId: string;
  bookingPublicId: string;
  customerName: string;
  customerPhone: string | null;
  serviceNames: string[];
  provider: string;
  providerRef: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerStatus: string | null;
  status: string;
  amountPaise: number;
  currency: string;
  capturedAt: string | null;
  verifiedAt: string | null;
  invoiceNo: string | null;
  refundCount: number;
  refundedPaise: number;
  latestWebhookStatus: string | null;
  latestWebhookEvent: string | null;
  createdAt: string;
  updatedAt: string;
}

type StaffForAdminAssignment = Prisma.StaffProfileGetPayload<{
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

const ASSIGNMENT_NON_BLOCKING_BOOKING_STATUSES = [
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
] as const;
const ASSIGNMENT_NON_BLOCKING_BOOKING_STATUS_SET = new Set<string>(
  ASSIGNMENT_NON_BLOCKING_BOOKING_STATUSES,
);

interface AdminUserRow {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  roles: Array<{
    id: string;
    name: string;
    isSystem: boolean;
  }>;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: PermissionKey[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminReviewRow {
  id: string;
  bookingId: string;
  bookingPublicId: string;
  customerName: string;
  serviceNames: string[];
  rating: number;
  comment: string | null;
  highlights: string[];
  status: ReviewModerationStatus;
  showOnHomepage: boolean;
  paymentStatus: string;
  moderatedByName: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PUBLIC_HOMEPAGE_CONTENT_SLUG = "public-homepage";

const MODULE_DEFINITIONS: Record<AdminModuleKey, ModuleDefinition> = {
  bookings: {
    label: "Bookings",
    permission: { resource: "bookings", action: "view" },
    emptyMessage: "No bookings exist yet.",
  },
  customers: {
    label: "Customers",
    permission: { resource: "customers", action: "view" },
    emptyMessage: "No customer profiles exist yet.",
  },
  staff: {
    label: "Staff",
    permission: { resource: "staff", action: "view" },
    emptyMessage: "No staff profiles exist yet.",
  },
  catalogue: {
    label: "Catalogue",
    permission: { resource: "services", action: "view" },
    emptyMessage: "No categories or services exist yet.",
  },
  payments: {
    label: "Payments",
    permission: { resource: "payments", action: "view" },
    emptyMessage: "No payment records exist yet.",
  },
  reviews: {
    label: "Reviews",
    permission: { resource: "reviews", action: "view" },
    emptyMessage: "No customer reviews have been submitted yet.",
  },
  reports: {
    label: "Reports",
    permission: { resource: "reports", action: "view" },
    emptyMessage: "Reports will populate after bookings and payments exist.",
  },
  notifications: {
    label: "Notifications",
    permission: { resource: "notifications", action: "view" },
    emptyMessage: "No notification templates or rules exist yet.",
  },
  roles: {
    label: "Roles",
    permission: { resource: "roles", action: "view" },
    emptyMessage: "No roles exist yet.",
  },
};

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

class AdminConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConflictError";
  }
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

function serializeSessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean,
): string {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  const parts = [
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
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

function serializeClearSessionCookie(secure: boolean): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE_NAME}=`,
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

function safePermissionKey(
  resource: string,
  action: string,
): PermissionKey | null {
  const parsedResource = permissionResourceSchema.safeParse(resource);
  const parsedAction = permissionActionSchema.safeParse(action);

  if (!parsedResource.success || !parsedAction.success) {
    return null;
  }

  return toPermissionKey(parsedResource.data, parsedAction.data);
}

function toSlug(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

  return slug || "item";
}

function normalizeRoleName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function sanitizeRichHtml(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const stripped = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("javascript:.*?"|'javascript:.*?'|javascript:[^\s>]+)/gi,
      "",
    );

  const allowedTags = new Set([
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h3",
    "h4",
  ]);

  return stripped
    .replace(
      /<(\/?)([a-z0-9-]+)(\s[^>]*)?>/gi,
      (_match, closingSlash: string, tagName: string) => {
        const normalizedTagName = tagName.toLowerCase();
        return allowedTags.has(normalizedTagName)
          ? `<${closingSlash}${normalizedTagName}>`
          : "";
      },
    )
    .trim();
}

function getLocalUploadRoot(): string {
  const cwd = process.cwd();
  const repoRoot =
    path.basename(cwd) === "api" && path.basename(path.dirname(cwd)) === "apps"
      ? path.resolve(cwd, "../..")
      : cwd;

  return path.join(repoRoot, "apps/web/public/uploads/admin");
}

function sanitizeUploadFilename(filename: string, contentType: string): string {
  const extensionByContentType: Record<string, string> = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const baseName =
    path
      .basename(filename)
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "image";

  return `${baseName}-${randomUUID()}${extensionByContentType[contentType] ?? ".img"}`;
}

function isValidImageBuffer(buffer: Buffer, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  if (contentType === "image/png") {
    return (
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (contentType === "image/webp") {
    return (
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (contentType === "image/gif") {
    return (
      buffer.length > 6 && buffer.subarray(0, 4).toString("ascii") === "GIF8"
    );
  }

  return false;
}

function serializeActor(actor: AdminActor): Omit<AdminActor, "permissionSet"> {
  return {
    id: actor.id,
    publicId: actor.publicId,
    email: actor.email,
    name: actor.name,
    accountType: actor.accountType,
    status: actor.status,
    roles: actor.roles,
    permissions: actor.permissions,
  };
}

async function loadAdminSessionByTokenHash(
  tokenHash: string,
): Promise<LoadedAdminSession | null> {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  if (
    session.user.accountType !== "ADMIN" ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  const permissions = new Set<PermissionKey>();
  const roles: string[] = [];

  for (const userRole of session.user.userRoles) {
    if (userRole.role.archivedAt) {
      continue;
    }

    roles.push(userRole.role.name);

    for (const rolePermission of userRole.role.permissions) {
      const permissionKey = safePermissionKey(
        rolePermission.permission.resource,
        rolePermission.permission.action,
      );

      if (permissionKey) {
        permissions.add(permissionKey);
      }
    }
  }

  return {
    actor: {
      id: session.user.id,
      publicId: session.user.publicId,
      email: session.user.email,
      name: session.user.name,
      accountType: "ADMIN",
      status: "ACTIVE",
      roles,
      permissions: [...permissions].sort(),
      permissionSet: permissions,
    },
    sessionId: session.id,
    tokenHash,
  };
}

async function loadAdminSession(
  req: Request,
): Promise<LoadedAdminSession | null> {
  const token = parseCookies(req.header("cookie")).get(
    ADMIN_SESSION_COOKIE_NAME,
  );

  if (!token) {
    return null;
  }

  return loadAdminSessionByTokenHash(hashSessionToken(token));
}

function requireActiveAdmin(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const loadedSession = await loadAdminSession(req);

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

function requirePermission(
  resource: PermissionResource,
  action: PermissionAction,
): RequestHandler {
  const permission = toPermissionKey(resource, action);

  return asyncHandler(async (req, res, next) => {
    const loadedSession = await loadAdminSession(req);

    if (!loadedSession) {
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }

    const decision = authorize(
      {
        id: loadedSession.actor.id,
        accountType: loadedSession.actor.accountType,
        status: loadedSession.actor.status,
        permissions: loadedSession.actor.permissionSet,
      },
      permission,
    );

    if (!decision.allowed) {
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission for this operation.",
      );
      return;
    }

    res.locals.actor = loadedSession.actor;
    res.locals.sessionId = loadedSession.sessionId;
    res.locals.tokenHash = loadedSession.tokenHash;
    next();
  });
}

function getActor(res: Response): AdminActor {
  const actor = res.locals.actor;

  if (!actor || typeof actor !== "object") {
    throw new Error("Admin actor was not loaded.");
  }

  return actor as AdminActor;
}

function actorHasAnyPermission(
  actor: AdminActor,
  permissions: PermissionKey[],
): boolean {
  return permissions.some(
    (permission) =>
      authorize(
        {
          id: actor.id,
          accountType: actor.accountType,
          status: actor.status,
          permissions: actor.permissionSet,
        },
        permission,
      ).allowed,
  );
}

async function recordSecurityEvent(
  req: Request,
  actorId: string | null,
  event: string,
): Promise<void> {
  await prisma.securityEvent.create({
    data: {
      actorId,
      event,
      ipHash: hashContextValue(getClientIp(req)),
      userAgent: getUserAgent(req),
    },
  });
}

async function recordAuditLog(
  req: Request,
  res: Response,
  action: string,
  resourceType: string,
  resourceId: string,
  after: Record<string, unknown>,
  before?: Record<string, unknown>,
): Promise<void> {
  const actor = getActor(res);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action,
      resourceType,
      resourceId,
      requestId: getRequestId(res),
      ipHash: hashContextValue(getClientIp(req)),
      userAgent: getUserAgent(req),
      ...(before ? { before: toJsonObject(before) } : {}),
      after: toJsonObject(after),
    },
  });
}

function serializePermissionOption(permission: {
  resource: string;
  action: string;
  description: string | null;
}): PermissionOption | null {
  const key = safePermissionKey(permission.resource, permission.action);
  const parsedResource = permissionResourceSchema.safeParse(
    permission.resource,
  );
  const parsedAction = permissionActionSchema.safeParse(permission.action);

  if (!key || !parsedResource.success || !parsedAction.success) {
    return null;
  }

  return {
    key,
    resource: parsedResource.data,
    action: parsedAction.data,
    description: permission.description,
  };
}

function isPermissionOption(
  value: PermissionOption | null,
): value is PermissionOption {
  return value !== null;
}

function serializeStaffRow(staff: StaffProfileWithUser): StaffListRow {
  const serviceRows = [...staff.services].sort((left, right) =>
    left.service.name.localeCompare(right.service.name),
  );

  return {
    id: staff.id,
    name: staff.user.name,
    employeeCode: staff.employeeCode,
    email: staff.user.email,
    phone: staff.user.phone,
    engagementType: staff.engagementType,
    emergencyPhone: staff.emergencyPhone,
    serviceIds: serviceRows.map((item) => item.serviceId),
    services: serviceRows.map((item) => ({
      id: item.serviceId,
      name: item.service.name,
    })),
    status: staff.status,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

function serializeAdminUserRow(user: AdminUserWithRoles): AdminUserRow {
  return {
    id: user.id,
    publicId: user.publicId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    roles: user.userRoles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      isSystem: userRole.role.isSystem,
    })),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function serializeRoleRow(role: RoleWithPermissions): RoleRow {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionKeys: role.permissions
      .map((rolePermission) =>
        safePermissionKey(
          rolePermission.permission.resource,
          rolePermission.permission.action,
        ),
      )
      .filter((permissionKey): permissionKey is PermissionKey =>
        Boolean(permissionKey),
      )
      .sort(),
    archivedAt: role.archivedAt?.toISOString() ?? null,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

function mediaAssetToRow(mediaAsset: {
  id: string;
  publicId: string;
  objectKey: string;
  altText: string | null;
  contentType: string;
  sizeBytes: number;
}): MediaImageRow {
  return {
    id: mediaAsset.id,
    publicId: mediaAsset.publicId,
    url: mediaAsset.objectKey,
    altText: mediaAsset.altText,
    contentType: mediaAsset.contentType,
    sizeBytes: mediaAsset.sizeBytes,
  };
}

type BlogPostRecord = {
  id: string;
  publicId: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author?: { name: string } | null;
};

function serializeBlogPost(post: BlogPostRecord): Record<string, unknown> {
  return {
    id: post.id,
    publicId: post.publicId,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
    authorName: post.author?.name ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    archivedAt: post.archivedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function blogAuditSummary(
  post: Pick<
    BlogPostRecord,
    "id" | "title" | "slug" | "status" | "publishedAt"
  >,
): Record<string, unknown> {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}

function jsonStringArray(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function serializeServiceTierRow(
  tier: ServiceWithCategory["tiers"][number],
): ServiceTierRow {
  return {
    id: tier.id,
    publicId: tier.publicId,
    tierType: tier.tierType,
    name: tier.name,
    description: tier.description,
    durationMinutes: tier.durationMinutes,
    pricePaise: tier.pricePaise,
    compareAtPricePaise: tier.compareAtPricePaise,
    productsUsed: jsonStringArray(tier.productsUsed),
    status: tier.status,
    sortOrder: tier.sortOrder,
  };
}

function serializeAdminReviewRow(
  review: AdminReviewWithRelations,
): AdminReviewRow {
  const latestPayment = review.booking.payments.at(0);
  const serviceNames = [
    ...new Set(review.booking.items.map((item) => item.serviceName)),
  ].slice(0, 6);

  return {
    id: review.id,
    bookingId: review.bookingId,
    bookingPublicId: review.booking.publicId,
    customerName: review.customerProfile.displayName,
    serviceNames,
    rating: review.rating,
    comment: review.comment,
    highlights: jsonStringArray(review.highlights),
    status: review.status,
    showOnHomepage: review.showOnHomepage,
    paymentStatus: latestPayment?.status ?? "UNKNOWN",
    moderatedByName: review.moderatedBy?.name ?? null,
    moderatedAt: review.moderatedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

function reviewAuditSummary(
  review: Pick<
    AdminReviewWithRelations,
    "id" | "status" | "showOnHomepage" | "rating" | "booking"
  >,
): Record<string, unknown> {
  return {
    id: review.id,
    bookingPublicId: review.booking.publicId,
    rating: review.rating,
    status: review.status,
    showOnHomepage: review.showOnHomepage,
  };
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

function homepageAuditSummary(
  homepage: PublicHomepageConfig,
): Record<string, unknown> {
  return {
    heroTitle: homepage.hero.title,
    heroAccent: homepage.hero.titleAccent,
    offerTitle: homepage.offers.title,
    highlightCardCount: homepage.highlights.cards.length,
    publishedHighlightCardCount: homepage.highlights.cards.filter(
      (card) => card.status === "PUBLISHED",
    ).length,
    serviceSectionCount: homepage.serviceSections.length,
    publishedServiceSectionCount: homepage.serviceSections.filter(
      (section) => section.status === "PUBLISHED",
    ).length,
  };
}

async function loadHomepageContent(): Promise<{
  homepage: PublicHomepageConfig;
  updatedAt: string | null;
}> {
  const contentPage = await prisma.contentPage.findUnique({
    where: { slug: PUBLIC_HOMEPAGE_CONTENT_SLUG },
    include: {
      revisions: {
        orderBy: { revisionNo: "desc" },
        take: 1,
      },
    },
  });

  if (!contentPage) {
    return {
      homepage: defaultPublicHomepageConfig,
      updatedAt: null,
    };
  }

  return {
    homepage: parseHomepageConfig(contentPage.revisions.at(0)?.bodyText),
    updatedAt: contentPage.updatedAt.toISOString(),
  };
}

function userAuditSummary(user: AdminUserWithRoles): Record<string, unknown> {
  return {
    accountType: user.accountType,
    status: user.status,
    roleNames: user.userRoles.map((userRole) => userRole.role.name).sort(),
    hasEmail: Boolean(user.email),
    hasPhone: Boolean(user.phone),
  };
}

function staffAuditSummary(
  staff: StaffProfileWithUser,
): Record<string, unknown> {
  return {
    employeeCode: staff.employeeCode,
    engagementType: staff.engagementType,
    serviceIds: staff.services.map((item) => item.serviceId).sort(),
    status: staff.status,
    userId: staff.userId,
    userStatus: staff.user.status,
    hasEmail: Boolean(staff.user.email),
    hasPhone: Boolean(staff.user.phone),
    hasEmergencyPhone: Boolean(staff.emergencyPhone),
  };
}

async function loadActiveServicesByIds(
  serviceIds: string[],
): Promise<Map<string, { id: string; name: string }>> {
  const uniqueServiceIds = [...new Set(serviceIds)];

  if (uniqueServiceIds.length === 0) {
    return new Map();
  }

  const services = await prisma.service.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
      status: { not: "ARCHIVED" },
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return new Map(services.map((service) => [service.id, service]));
}

async function activeServiceIdsExist(serviceIds: string[]): Promise<boolean> {
  const uniqueServiceIds = [...new Set(serviceIds)];
  const serviceById = await loadActiveServicesByIds(uniqueServiceIds);

  return serviceById.size === uniqueServiceIds.length;
}

async function validatePackageRelations(data: {
  categoryId: string;
  items: Array<{ serviceId: string; serviceTierId?: string | undefined }>;
}): Promise<string | null> {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category || category.archivedAt || category.status === "ARCHIVED") {
    return "Choose an active category for this package.";
  }

  const serviceIds = [...new Set(data.items.map((item) => item.serviceId))];

  if (!(await activeServiceIdsExist(serviceIds))) {
    return "Choose only active services for this package.";
  }

  const tierIds = [
    ...new Set(
      data.items
        .map((item) => item.serviceTierId)
        .filter((tierId): tierId is string => Boolean(tierId)),
    ),
  ];

  if (tierIds.length === 0) {
    return null;
  }

  const tiers = await prisma.serviceTier.findMany({
    where: {
      id: {
        in: tierIds,
      },
      status: { not: "ARCHIVED" },
    },
    select: {
      id: true,
      serviceId: true,
    },
  });
  const tierById = new Map(tiers.map((tier) => [tier.id, tier]));

  if (tierById.size !== tierIds.length) {
    return "Choose only active service tiers for this package.";
  }

  for (const item of data.items) {
    if (!item.serviceTierId) {
      continue;
    }

    const tier = tierById.get(item.serviceTierId);

    if (tier?.serviceId !== item.serviceId) {
      return "Package tier must belong to the selected service.";
    }
  }

  return null;
}

function defaultServiceTiersForAdmin(data: {
  durationMinutes: number;
  pricePaise: number;
  compareAtPricePaise?: number | null;
}) {
  const luxuryPricePaise = Math.round(data.pricePaise * 1.35);
  const compareAtPricePaise =
    data.compareAtPricePaise === undefined ? null : data.compareAtPricePaise;

  return [
    {
      tierType: "PREMIUM" as const,
      name: "Premium",
      description: "Professional essentials and standard products.",
      durationMinutes: data.durationMinutes,
      pricePaise: data.pricePaise,
      compareAtPricePaise,
      productsUsed: ["Professional single-use kit", "Premium care products"],
      status: "PUBLISHED" as const,
      sortOrder: 0,
    },
    {
      tierType: "LUXURY" as const,
      name: "Luxury",
      description: "Upgraded ritual with advanced products and extra care.",
      durationMinutes: data.durationMinutes + 15,
      pricePaise: luxuryPricePaise,
      compareAtPricePaise:
        compareAtPricePaise === null
          ? Math.round(luxuryPricePaise * 1.2)
          : Math.max(compareAtPricePaise, Math.round(luxuryPricePaise * 1.2)),
      productsUsed: [
        "Luxury single-use kit",
        "Advanced treatment products",
        "Finishing serum",
      ],
      status: "PUBLISHED" as const,
      sortOrder: 1,
    },
  ];
}

function serviceTierRowsForWrite(
  serviceId: string,
  tiers:
    | Array<{
        tierType: "PREMIUM" | "LUXURY";
        name: string;
        description?: string | undefined;
        durationMinutes?: number | undefined;
        pricePaise: number;
        compareAtPricePaise?: number | undefined;
        productsUsed: string[];
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        sortOrder: number;
      }>
    | undefined,
  fallback: {
    durationMinutes: number;
    pricePaise: number;
    compareAtPricePaise?: number | null;
  },
): Prisma.ServiceTierUncheckedCreateInput[] {
  const resolvedTiers = tiers ?? defaultServiceTiersForAdmin(fallback);

  return resolvedTiers.map((tier, index) => ({
    serviceId,
    tierType: tier.tierType,
    name: tier.name,
    description: tier.description ?? null,
    durationMinutes: tier.durationMinutes ?? null,
    pricePaise: tier.pricePaise,
    compareAtPricePaise: tier.compareAtPricePaise ?? null,
    productsUsed: tier.productsUsed,
    status: tier.status,
    sortOrder: tier.sortOrder ?? index,
  }));
}

function getStaffOrderBy(
  sort: AdminStaffSort,
): Prisma.StaffProfileOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "employeeCode_asc":
      return [{ employeeCode: "asc" }];
    case "employeeCode_desc":
      return [{ employeeCode: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { updatedAt: "desc" }];
    case "engagementType_asc":
      return [{ engagementType: "asc" }, { updatedAt: "desc" }];
    case "engagementType_desc":
      return [{ engagementType: "desc" }, { updatedAt: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
  }
}

function getAdminUserOrderBy(
  sort: AdminUserSort,
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "name_desc":
      return [{ name: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { updatedAt: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getRoleOrderBy(
  sort: AdminRoleSort,
): Prisma.RoleOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "name_desc":
      return [{ name: "desc" }];
    case "status_asc":
      return [{ archivedAt: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ archivedAt: "desc" }, { updatedAt: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getReviewOrderBy(
  sort: AdminReviewSort,
): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case "createdAt_asc":
      return [{ createdAt: "asc" }];
    case "rating_desc":
      return [{ rating: "desc" }, { createdAt: "desc" }];
    case "rating_asc":
      return [{ rating: "asc" }, { createdAt: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { createdAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { createdAt: "desc" }];
    case "createdAt_desc":
      return [{ createdAt: "desc" }];
  }
}

function getAdminUserWhere(
  search: string | undefined,
  status: AdminUserRow["status"] | undefined,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    accountType: "ADMIN",
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      {
        userRoles: {
          some: {
            role: {
              name: { contains: search },
            },
          },
        },
      },
    ];
  }

  return where;
}

function getReviewWhere(
  search: string | undefined,
  status: ReviewModerationStatus | undefined,
): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { comment: { contains: search } },
      {
        customerProfile: {
          is: {
            displayName: { contains: search },
          },
        },
      },
      {
        booking: {
          is: {
            publicId: { contains: search },
          },
        },
      },
      {
        booking: {
          is: {
            items: {
              some: {
                serviceName: { contains: search },
              },
            },
          },
        },
      },
    ];
  }

  return where;
}

function getRoleWhere(
  search: string | undefined,
  status: "ACTIVE" | "ARCHIVED" | undefined,
): Prisma.RoleWhereInput {
  const where: Prisma.RoleWhereInput = {};

  if (status === "ACTIVE") {
    where.archivedAt = null;
  }

  if (status === "ARCHIVED") {
    where.archivedAt = { not: null };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  return where;
}

function getStaffWhere(
  search: string | undefined,
  status: StaffListRow["status"] | undefined,
): Prisma.StaffProfileWhereInput {
  const where: Prisma.StaffProfileWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { employeeCode: { contains: search } },
      { emergencyPhone: { contains: search } },
      { user: { is: { name: { contains: search } } } },
      { user: { is: { email: { contains: search } } } },
      { user: { is: { phone: { contains: search } } } },
    ];
  }

  return where;
}

function escapeCsvField(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const rawValue = String(value);

  if (!/[",\n\r]/.test(rawValue)) {
    return rawValue;
  }

  return `"${rawValue.replaceAll('"', '""')}"`;
}

function staffRowsToCsv(rows: StaffProfileWithUser[]): string {
  const header = [
    "Name",
    "Employee code",
    "Email",
    "Phone",
    "Engagement",
    "Services",
    "Emergency phone",
    "Status",
    "Updated at",
  ];
  const body = rows.map((staff) => [
    staff.user.name,
    staff.employeeCode,
    staff.user.email,
    staff.user.phone,
    staff.engagementType,
    staff.services
      .map((item) => item.service.name)
      .sort()
      .join(" | "),
    staff.emergencyPhone,
    staff.status,
    staff.updatedAt.toISOString(),
  ]);

  return [header, ...body]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

function adminUserRowsToCsv(rows: AdminUserWithRoles[]): string {
  const header = [
    "Name",
    "Email",
    "Phone",
    "Roles",
    "Status",
    "Last login at",
    "Updated at",
  ];
  const body = rows.map((user) => [
    user.name,
    user.email,
    user.phone,
    user.userRoles.map((userRole) => userRole.role.name).join(" | "),
    user.status,
    user.lastLoginAt?.toISOString() ?? null,
    user.updatedAt.toISOString(),
  ]);

  return [header, ...body]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

function roleRowsToCsv(rows: RoleWithPermissions[]): string {
  const header = [
    "Name",
    "Description",
    "Type",
    "Permissions",
    "Status",
    "Archived at",
    "Updated at",
  ];
  const body = rows.map((role) => [
    role.name,
    role.description,
    role.isSystem ? "System" : "Custom",
    serializeRoleRow(role).permissionKeys.join(" | "),
    role.archivedAt ? "ARCHIVED" : "ACTIVE",
    role.archivedAt?.toISOString() ?? null,
    role.updatedAt.toISOString(),
  ]);

  return [header, ...body]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

async function getSelectedPermissionIds(
  permissionKeys: PermissionKey[],
): Promise<string[] | null> {
  const requestedKeys = new Set<PermissionKey>(permissionKeys);
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });
  const selectedPermissionIds: string[] = [];

  for (const permission of permissions) {
    const key = safePermissionKey(permission.resource, permission.action);

    if (key && requestedKeys.has(key)) {
      selectedPermissionIds.push(permission.id);
    }
  }

  return selectedPermissionIds.length === requestedKeys.size
    ? selectedPermissionIds
    : null;
}

function roleAuditSummary(role: RoleWithPermissions): Record<string, unknown> {
  return {
    name: role.name,
    isSystem: role.isSystem,
    archived: Boolean(role.archivedAt),
    permissionKeys: serializeRoleRow(role).permissionKeys,
  };
}

function serializeCategoryRow(category: CategoryWithParent): CategoryListRow {
  return {
    id: category.id,
    publicId: category.publicId,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    parentName: category.parent?.name ?? null,
    description: category.description,
    imageAssetId: category.imageAssetId,
    imageUrl: category.imageAsset?.objectKey ?? null,
    status: category.status,
    archivedAt: category.archivedAt?.toISOString() ?? null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function serviceDealWriteData(data: {
  dealEnabled?: boolean | undefined;
  dealPricePaise?: number | undefined;
  dealStartsAt?: string | undefined;
  dealEndsAt?: string | undefined;
}): {
  dealEnabled: boolean;
  dealPricePaise: number | null;
  dealStartsAt: Date | null;
  dealEndsAt: Date | null;
} {
  const dealEnabled = data.dealEnabled ?? false;

  return {
    dealEnabled,
    dealPricePaise: dealEnabled ? (data.dealPricePaise ?? null) : null,
    dealStartsAt:
      dealEnabled && data.dealStartsAt ? new Date(data.dealStartsAt) : null,
    dealEndsAt:
      dealEnabled && data.dealEndsAt ? new Date(data.dealEndsAt) : null,
  };
}

function serializeServiceRow(service: ServiceWithCategory): ServiceListRow {
  const images = [...service.images].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const [mainImage, ...galleryImages] = images;

  return {
    id: service.id,
    publicId: service.publicId,
    categoryId: service.categoryId,
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
    sortOrder: service.sortOrder,
    mainImage: mainImage ? mediaAssetToRow(mainImage.mediaAsset) : null,
    galleryImages: galleryImages.map((image) =>
      mediaAssetToRow(image.mediaAsset),
    ),
    tiers: [...service.tiers]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(serializeServiceTierRow),
    status: service.status,
    publishedAt: service.publishedAt?.toISOString() ?? null,
    archivedAt: service.archivedAt?.toISOString() ?? null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

function serializePackageRow(
  servicePackage: ServicePackageWithRelations,
): ServicePackageRow {
  return {
    id: servicePackage.id,
    publicId: servicePackage.publicId,
    categoryId: servicePackage.categoryId,
    categoryName: servicePackage.category.name,
    name: servicePackage.name,
    slug: servicePackage.slug,
    description: servicePackage.description,
    minPricePaise: servicePackage.minPricePaise,
    compareAtPricePaise: servicePackage.compareAtPricePaise,
    discountBps: servicePackage.discountBps,
    durationMinutes: servicePackage.durationMinutes,
    inclusions: jsonStringArray(servicePackage.inclusions),
    items: [...servicePackage.items]
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
    status: servicePackage.status,
    sortOrder: servicePackage.sortOrder,
    publishedAt: servicePackage.publishedAt?.toISOString() ?? null,
    archivedAt: servicePackage.archivedAt?.toISOString() ?? null,
    createdAt: servicePackage.createdAt.toISOString(),
    updatedAt: servicePackage.updatedAt.toISOString(),
  };
}

function addressSummary(address: AdminBookingWithRelations["address"]): string {
  return [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postalCode,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function serializeAdminBookingRow(
  booking: AdminBookingWithRelations,
): AdminBookingRow {
  const assignment = booking.assignments.at(0);
  const latestPayment = booking.payments.at(0);

  return {
    id: booking.id,
    publicId: booking.publicId,
    customerName: booking.customerProfile.displayName,
    customerPhone: booking.customerProfile.user.phone,
    addressSummary: addressSummary(booking.address),
    status: booking.status,
    scheduledStartAt: booking.scheduledStartAt.toISOString(),
    scheduledEndAt: booking.scheduledEndAt.toISOString(),
    subtotalPaise: booking.subtotalPaise,
    taxPaise: booking.taxPaise,
    totalPaise: booking.totalPaise,
    serviceNames: [
      ...new Set(
        booking.items.map((item) =>
          item.packageName
            ? `${item.packageName}: ${item.serviceName}`
            : item.serviceTierName
              ? `${item.serviceName} (${item.serviceTierName})`
              : item.serviceName,
        ),
      ),
    ],
    staff: assignment
      ? {
          id: assignment.staffProfileId,
          name: assignment.staffProfile.user.name,
          employeeCode: assignment.staffProfile.employeeCode,
          status: assignment.status,
        }
      : null,
    paymentStatus: latestPayment?.status ?? "PENDING",
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

function serializeAdminPaymentRow(
  payment: AdminPaymentWithRelations,
): AdminPaymentRow {
  const latestWebhook = payment.webhookEvents.at(0) ?? null;
  const refundedPaise = payment.refunds.reduce(
    (total, refund) => total + refund.amountPaise,
    0,
  );

  return {
    id: payment.id,
    bookingId: payment.bookingId,
    bookingPublicId: payment.booking.publicId,
    customerName: payment.booking.customerProfile.displayName,
    customerPhone: payment.booking.customerProfile.user.phone,
    serviceNames: [
      ...new Set(
        payment.booking.items.map((item) =>
          item.packageName
            ? `${item.packageName}: ${item.serviceName}`
            : item.serviceTierName
              ? `${item.serviceName} (${item.serviceTierName})`
              : item.serviceName,
        ),
      ),
    ],
    provider: payment.provider,
    providerRef: payment.providerRef,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    providerStatus: payment.providerStatus,
    status: payment.status,
    amountPaise: payment.amountPaise,
    currency: payment.currency,
    capturedAt: payment.capturedAt?.toISOString() ?? null,
    verifiedAt: payment.verifiedAt?.toISOString() ?? null,
    invoiceNo: payment.invoice?.invoiceNo ?? null,
    refundCount: payment.refunds.length,
    refundedPaise,
    latestWebhookStatus: latestWebhook?.processingStatus ?? null,
    latestWebhookEvent: latestWebhook?.eventName ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function categoryAuditSummary(
  category: CategoryWithParent,
): Record<string, unknown> {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    imageAssetId: category.imageAssetId,
    status: category.status,
    archived: Boolean(category.archivedAt),
  };
}

function serviceAuditSummary(
  service: ServiceWithCategory,
): Record<string, unknown> {
  return {
    categoryId: service.categoryId,
    durationMinutes: service.durationMinutes,
    name: service.name,
    pricePaise: service.pricePaise,
    compareAtPricePaise: service.compareAtPricePaise,
    gstRateBps: service.gstRateBps,
    dealEnabled: service.dealEnabled,
    dealPricePaise: service.dealPricePaise,
    dealStartsAt: service.dealStartsAt?.toISOString() ?? null,
    dealEndsAt: service.dealEndsAt?.toISOString() ?? null,
    tierCount: service.tiers.length,
    featured: service.featured,
    sortOrder: service.sortOrder,
    imageCount: service.images.length,
    status: service.status,
    archived: Boolean(service.archivedAt),
  };
}

function packageAuditSummary(
  servicePackage: ServicePackageWithRelations,
): Record<string, unknown> {
  return {
    categoryId: servicePackage.categoryId,
    name: servicePackage.name,
    slug: servicePackage.slug,
    minPricePaise: servicePackage.minPricePaise,
    compareAtPricePaise: servicePackage.compareAtPricePaise,
    discountBps: servicePackage.discountBps,
    durationMinutes: servicePackage.durationMinutes,
    itemCount: servicePackage.items.length,
    status: servicePackage.status,
    archived: Boolean(servicePackage.archivedAt),
  };
}

function bookingAssignmentAuditSummary(
  booking: AdminBookingWithRelations,
): Record<string, unknown> {
  const assignment = booking.assignments.at(0);

  return {
    publicId: booking.publicId,
    status: booking.status,
    scheduledStartAt: booking.scheduledStartAt.toISOString(),
    scheduledEndAt: booking.scheduledEndAt.toISOString(),
    staffProfileId: assignment?.staffProfileId ?? null,
    assignmentStatus: assignment?.status ?? null,
  };
}

function minutesInIndia(date: Date): number {
  const indiaDate = new Date(date.getTime() + 330 * 60 * 1000);

  return indiaDate.getUTCHours() * 60 + indiaDate.getUTCMinutes();
}

function weekdayInIndia(date: Date): number {
  return new Date(date.getTime() + 330 * 60 * 1000).getUTCDay();
}

function staffCoversServices(
  staff: Pick<StaffForAdminAssignment, "services">,
  serviceIds: string[],
): boolean {
  const supportedServiceIds = new Set(
    staff.services.map((service) => service.serviceId),
  );

  return serviceIds.every((serviceId) => supportedServiceIds.has(serviceId));
}

function staffIsScheduledForWindow(
  staff: Pick<StaffForAdminAssignment, "schedules">,
  startsAt: Date,
  endsAt: Date,
): boolean {
  if (staff.schedules.length === 0) {
    return true;
  }

  const weekday = weekdayInIndia(startsAt);
  const startMinute = minutesInIndia(startsAt);
  const endMinute = minutesInIndia(endsAt);

  return staff.schedules.some(
    (schedule) =>
      schedule.weekday === weekday &&
      schedule.startsAtMinute <= startMinute &&
      schedule.endsAtMinute >= endMinute,
  );
}

function staffIsFreeForAdminWindow(
  staff: StaffForAdminAssignment,
  startsAt: Date,
  endsAt: Date,
): boolean {
  if (!staffIsScheduledForWindow(staff, startsAt, endsAt)) {
    return false;
  }

  const hasException = staff.exceptions.some(
    (exception) => exception.startsAt < endsAt && exception.endsAt > startsAt,
  );

  if (hasException) {
    return false;
  }

  return !staff.assignments.some(
    (assignment) =>
      assignment.status !== "REJECTED" &&
      assignment.booking.scheduledStartAt < endsAt &&
      assignment.booking.scheduledEndAt > startsAt &&
      !ASSIGNMENT_NON_BLOCKING_BOOKING_STATUS_SET.has(
        assignment.booking.status,
      ),
  );
}

async function loadAssignableStaff(
  serviceIds: string[],
  startsAt: Date,
  endsAt: Date,
  excludedBookingId: string,
  staffProfileId?: string,
): Promise<StaffForAdminAssignment[]> {
  const staffRows = await prisma.staffProfile.findMany({
    where: {
      status: "ACTIVE",
      ...(staffProfileId ? { id: staffProfileId } : {}),
      user: {
        is: {
          accountType: "STAFF",
          status: "ACTIVE",
        },
      },
      AND: serviceIds.map((serviceId) => ({
        services: {
          some: {
            serviceId,
          },
        },
      })),
    },
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
          bookingId: { not: excludedBookingId },
          status: { not: "REJECTED" },
          booking: {
            status: {
              notIn: [...ASSIGNMENT_NON_BLOCKING_BOOKING_STATUSES],
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

  return staffRows.filter(
    (staff) =>
      staffCoversServices(staff, serviceIds) &&
      staffIsFreeForAdminWindow(staff, startsAt, endsAt),
  );
}

async function chooseStaffForAdminAssignment(
  serviceIds: string[],
  startsAt: Date,
  endsAt: Date,
  bookingId: string,
  staffProfileId?: string,
): Promise<StaffForAdminAssignment | null> {
  const availableStaff = await loadAssignableStaff(
    serviceIds,
    startsAt,
    endsAt,
    bookingId,
    staffProfileId,
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
          notIn: [...ASSIGNMENT_NON_BLOCKING_BOOKING_STATUSES],
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

function getCategoryOrderBy(
  sort: AdminCategorySort,
): Prisma.CategoryOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "name_desc":
      return [{ name: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { updatedAt: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getServiceOrderBy(
  sort: AdminServiceSort,
): Prisma.ServiceOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "name_desc":
      return [{ name: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { updatedAt: "desc" }];
    case "price_asc":
      return [{ pricePaise: "asc" }];
    case "price_desc":
      return [{ pricePaise: "desc" }];
    case "duration_asc":
      return [{ durationMinutes: "asc" }];
    case "duration_desc":
      return [{ durationMinutes: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getPackageOrderBy(
  sort: AdminPackageSort,
): Prisma.ServicePackageOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "name_asc":
      return [{ name: "asc" }];
    case "name_desc":
      return [{ name: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { updatedAt: "desc" }];
    case "price_asc":
      return [{ minPricePaise: "asc" }];
    case "price_desc":
      return [{ minPricePaise: "desc" }];
    case "duration_asc":
      return [{ durationMinutes: "asc" }];
    case "duration_desc":
      return [{ durationMinutes: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getBookingOrderBy(
  sort: AdminBookingSort,
): Prisma.BookingOrderByWithRelationInput[] {
  switch (sort) {
    case "scheduledStartAt_asc":
      return [{ scheduledStartAt: "asc" }];
    case "createdAt_desc":
      return [{ createdAt: "desc" }];
    case "createdAt_asc":
      return [{ createdAt: "asc" }];
    case "status_asc":
      return [{ status: "asc" }, { scheduledStartAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { scheduledStartAt: "desc" }];
    case "total_asc":
      return [{ totalPaise: "asc" }];
    case "total_desc":
      return [{ totalPaise: "desc" }];
    case "scheduledStartAt_desc":
      return [{ scheduledStartAt: "desc" }];
    default:
      return [{ scheduledStartAt: "desc" }];
  }
}

function getPaymentOrderBy(
  sort: AdminPaymentSort,
): Prisma.PaymentOrderByWithRelationInput[] {
  switch (sort) {
    case "updatedAt_asc":
      return [{ updatedAt: "asc" }];
    case "createdAt_desc":
      return [{ createdAt: "desc" }];
    case "createdAt_asc":
      return [{ createdAt: "asc" }];
    case "amount_desc":
      return [{ amountPaise: "desc" }, { updatedAt: "desc" }];
    case "amount_asc":
      return [{ amountPaise: "asc" }, { updatedAt: "desc" }];
    case "status_asc":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "status_desc":
      return [{ status: "desc" }, { updatedAt: "desc" }];
    case "updatedAt_desc":
      return [{ updatedAt: "desc" }];
    default:
      return [{ updatedAt: "desc" }];
  }
}

function getCategoryWhere(
  search: string | undefined,
  status: CategoryListRow["status"] | undefined,
): Prisma.CategoryWhereInput {
  const where: Prisma.CategoryWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { description: { contains: search } },
      { parent: { is: { name: { contains: search } } } },
    ];
  }

  return where;
}

function getServiceWhere(
  search: string | undefined,
  status: ServiceListRow["status"] | undefined,
): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { shortDescription: { contains: search } },
      { category: { is: { name: { contains: search } } } },
    ];
  }

  return where;
}

function getPackageWhere(
  search: string | undefined,
  status: ServicePackageRow["status"] | undefined,
  categoryId: string | undefined,
): Prisma.ServicePackageWhereInput {
  const where: Prisma.ServicePackageWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { description: { contains: search } },
      { category: { is: { name: { contains: search } } } },
      { items: { some: { service: { is: { name: { contains: search } } } } } },
    ];
  }

  return where;
}

function getBookingWhere(
  search: string | undefined,
  status: BookingStatus | undefined,
): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { publicId: { contains: search } },
      { customerProfile: { is: { displayName: { contains: search } } } },
      {
        customerProfile: {
          is: {
            user: {
              is: {
                phone: { contains: search },
              },
            },
          },
        },
      },
      { items: { some: { serviceName: { contains: search } } } },
      { items: { some: { packageName: { contains: search } } } },
    ];
  }

  return where;
}

function getPaymentWhere(
  search: string | undefined,
  status: PaymentStatus | undefined,
  provider: string | undefined,
): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (provider) {
    where.provider = provider;
  }

  if (search) {
    where.OR = [
      { id: { contains: search } },
      { providerRef: { contains: search } },
      { providerOrderId: { contains: search } },
      { providerPaymentId: { contains: search } },
      { providerStatus: { contains: search } },
      { booking: { is: { publicId: { contains: search } } } },
      {
        booking: {
          is: {
            customerProfile: {
              is: {
                displayName: { contains: search },
              },
            },
          },
        },
      },
      {
        booking: {
          is: {
            customerProfile: {
              is: {
                user: {
                  is: {
                    phone: { contains: search },
                  },
                },
              },
            },
          },
        },
      },
      {
        booking: {
          is: {
            items: {
              some: {
                serviceName: { contains: search },
              },
            },
          },
        },
      },
    ];
  }

  return where;
}

function localRazorpayOrderIdForAdminPayment(
  payment: Pick<AdminPaymentWithRelations, "providerOrderId" | "providerRef">,
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

function razorpayPaymentMatchesAdminRecord(
  providerPayment: RazorpayPaymentEntity,
  payment: Pick<
    AdminPaymentWithRelations,
    "amountPaise" | "currency" | "providerOrderId" | "providerRef"
  >,
): boolean {
  const expectedOrderId = localRazorpayOrderIdForAdminPayment(payment);

  return (
    Boolean(expectedOrderId) &&
    providerPayment.orderId === expectedOrderId &&
    providerPayment.amount === payment.amountPaise &&
    providerPayment.currency.toUpperCase() === payment.currency.toUpperCase()
  );
}

async function fetchRazorpayPaymentForAdminSync(
  env: AppEnv,
  payment: Pick<
    AdminPaymentWithRelations,
    "providerPaymentId" | "providerOrderId" | "providerRef"
  >,
): Promise<RazorpayPaymentEntity> {
  if (payment.providerPaymentId) {
    return fetchRazorpayPayment(env, payment.providerPaymentId);
  }

  const orderId = localRazorpayOrderIdForAdminPayment(payment);

  if (!orderId) {
    throw new AdminConflictError("Payment does not have a Razorpay order id.");
  }

  const providerPayments = await fetchRazorpayOrderPayments(env, orderId);
  const selectedPayment = selectMostRelevantRazorpayPayment(providerPayments);

  if (!selectedPayment) {
    throw new AdminConflictError(
      "No Razorpay payment attempts were found for this order.",
    );
  }

  return selectedPayment;
}

function paymentAuditSummary(
  payment: AdminPaymentRow,
): Record<string, unknown> {
  return {
    id: payment.id,
    bookingPublicId: payment.bookingPublicId,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    providerStatus: payment.providerStatus,
    status: payment.status,
    amountPaise: payment.amountPaise,
    currency: payment.currency,
  };
}

function categoryRowsToCsv(rows: CategoryWithParent[]): string {
  const header = [
    "Name",
    "Slug",
    "Parent",
    "Description",
    "Image URL",
    "Status",
    "Archived at",
    "Updated at",
  ];
  const body = rows.map((category) => [
    category.name,
    category.slug,
    category.parent?.name ?? "Root category",
    category.description,
    category.imageAsset?.objectKey ?? null,
    category.status,
    category.archivedAt?.toISOString() ?? null,
    category.updatedAt.toISOString(),
  ]);

  return [header, ...body]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

function serviceRowsToCsv(rows: ServiceWithCategory[]): string {
  const header = [
    "Name",
    "Slug",
    "Category",
    "Short description",
    "Full description",
    "Duration minutes",
    "Price INR",
    "Compare-at price INR",
    "GST %",
    "Deal enabled",
    "Deal price INR",
    "Deal starts at",
    "Deal ends at",
    "Featured",
    "Sort order",
    "Main image URL",
    "Gallery image URLs",
    "Status",
    "Archived at",
    "Updated at",
  ];
  const body = rows.map((service) => [
    service.name,
    service.slug,
    service.category.name,
    service.shortDescription,
    service.fullDescription,
    service.durationMinutes,
    (service.pricePaise / 100).toFixed(2),
    service.compareAtPricePaise === null
      ? null
      : (service.compareAtPricePaise / 100).toFixed(2),
    service.gstRateBps === null ? null : (service.gstRateBps / 100).toFixed(2),
    service.dealEnabled ? "Yes" : "No",
    service.dealPricePaise === null
      ? null
      : (service.dealPricePaise / 100).toFixed(2),
    service.dealStartsAt?.toISOString() ?? null,
    service.dealEndsAt?.toISOString() ?? null,
    service.featured ? "Yes" : "No",
    service.sortOrder,
    service.images[0]?.mediaAsset.objectKey ?? null,
    service.images
      .slice(1)
      .map((image) => image.mediaAsset.objectKey)
      .join(" | "),
    service.status,
    service.archivedAt?.toISOString() ?? null,
    service.updatedAt.toISOString(),
  ]);

  return [header, ...body]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

async function hasActiveCategoryDependencies(
  categoryId: string,
): Promise<boolean> {
  const [childCount, serviceCount] = await Promise.all([
    prisma.category.count({
      where: {
        parentId: categoryId,
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
    }),
    prisma.service.count({
      where: {
        categoryId,
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
    }),
  ]);

  return childCount > 0 || serviceCount > 0;
}

async function mediaAssetsExist(mediaAssetIds: string[]): Promise<boolean> {
  const uniqueMediaAssetIds = [...new Set(mediaAssetIds)];

  if (uniqueMediaAssetIds.length === 0) {
    return true;
  }

  const count = await prisma.mediaAsset.count({
    where: {
      id: {
        in: uniqueMediaAssetIds,
      },
      contentType: {
        in: ["image/gif", "image/jpeg", "image/png", "image/webp"],
      },
    },
  });

  return count === uniqueMediaAssetIds.length;
}

function getOrderedServiceImageIds(
  mainImageAssetId: string | undefined,
  imageAssetIds: string[] | undefined,
): string[] {
  const orderedImageIds: string[] = [];

  for (const imageAssetId of [
    mainImageAssetId,
    ...(imageAssetIds ?? []),
  ].filter((value): value is string => Boolean(value))) {
    if (!orderedImageIds.includes(imageAssetId)) {
      orderedImageIds.push(imageAssetId);
    }
  }

  return orderedImageIds;
}

async function hasActiveSuperAdminRole(userId: string): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: "SUPER_ADMIN",
        archivedAt: null,
      },
    },
  });

  return Boolean(userRole);
}

async function countActiveSuperAdminUsers(
  excludedUserId?: string,
): Promise<number> {
  return prisma.user.count({
    where: {
      accountType: "ADMIN",
      status: "ACTIVE",
      ...(excludedUserId ? { id: { not: excludedUserId } } : {}),
      userRoles: {
        some: {
          role: {
            name: "SUPER_ADMIN",
            archivedAt: null,
          },
        },
      },
    },
  });
}

async function getDashboardSummary(env: AppEnv): Promise<{
  cards: DashboardCard[];
  activeBookings: ModuleRecord[];
  bookingTrend: DashboardChartPoint[];
  statusMix: DashboardStatusSlice[];
  recentOrders: ModuleRecord[];
  providerReadiness: Array<{
    key: string;
    label: string;
    status: "configured" | "unconfigured";
  }>;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trendWindows = Array.from({ length: 7 }, (_value, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - (6 - index));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return { start, end };
  });
  const [
    bookingCount,
    activeBookingCount,
    customerCount,
    activeStaffCount,
    reviewCount,
    ratingAggregate,
    paymentAggregate,
    activeBookings,
    recentOrders,
    statusRows,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({
      where: {
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    }),
    prisma.customerProfile.count(),
    prisma.staffProfile.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.review.count(),
    prisma.review.aggregate({
      _avg: {
        rating: true,
      },
    }),
    prisma.payment.aggregate({
      _sum: {
        amountPaise: true,
      },
      where: {
        status: "CAPTURED",
      },
    }),
    prisma.booking.findMany({
      take: 5,
      where: {
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      orderBy: {
        scheduledStartAt: "asc",
      },
      include: {
        customerProfile: true,
      },
    }),
    prisma.booking.findMany({
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customerProfile: true,
        payments: true,
      },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);
  const trendRows = await Promise.all(
    trendWindows.map(async ({ start, end }) => {
      const [bookings, revenue] = await Promise.all([
        prisma.booking.count({
          where: {
            createdAt: {
              gte: start,
              lt: end,
            },
          },
        }),
        prisma.payment.aggregate({
          _sum: {
            amountPaise: true,
          },
          where: {
            status: "CAPTURED",
            createdAt: {
              gte: start,
              lt: end,
            },
          },
        }),
      ]);

      return {
        label: start.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        bookings,
        revenuePaise: revenue._sum.amountPaise ?? 0,
      };
    }),
  );

  const capturedRevenuePaise = paymentAggregate._sum.amountPaise ?? 0;
  const averageRating = ratingAggregate._avg.rating;

  return {
    cards: [
      {
        key: "bookings",
        label: "Bookings",
        value: String(bookingCount),
        detail: `${activeBookingCount} active`,
        tone: activeBookingCount > 0 ? "warning" : "neutral",
      },
      {
        key: "revenue",
        label: "Captured revenue",
        value: `INR ${(capturedRevenuePaise / 100).toLocaleString("en-IN")}`,
        detail: "From captured payments",
        tone: capturedRevenuePaise > 0 ? "success" : "neutral",
      },
      {
        key: "staff",
        label: "Active staff",
        value: String(activeStaffCount),
        detail: "Available from staff profiles",
        tone: activeStaffCount > 0 ? "success" : "neutral",
      },
      {
        key: "customers",
        label: "Customers",
        value: String(customerCount),
        detail: "Customer profiles",
        tone: customerCount > 0 ? "success" : "neutral",
      },
      {
        key: "rating",
        label: "Average rating",
        value:
          reviewCount > 0 && averageRating !== null
            ? averageRating.toFixed(1)
            : "N/A",
        detail: `${reviewCount} reviews`,
        tone: reviewCount > 0 ? "success" : "neutral",
      },
    ],
    activeBookings: activeBookings.map((booking) => ({
      id: booking.publicId,
      title: `Booking ${booking.publicId.slice(-8)}`,
      subtitle: `${booking.customerProfile.displayName} · ${booking.scheduledStartAt.toISOString()}`,
      status: booking.status,
      updatedAt: booking.updatedAt.toISOString(),
    })),
    bookingTrend: trendRows,
    statusMix: statusRows.map((row) => ({
      label: row.status,
      value: row._count._all,
    })),
    recentOrders: recentOrders.map((booking) => ({
      id: booking.publicId,
      title: `Booking ${booking.publicId.slice(-8)}`,
      subtitle: `${booking.customerProfile.displayName} · INR ${(booking.totalPaise / 100).toLocaleString("en-IN")}`,
      status: booking.payments.at(0)?.status ?? booking.status,
      updatedAt: booking.createdAt.toISOString(),
    })),
    providerReadiness: [
      {
        key: "razorpay",
        label: "Razorpay",
        status:
          env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
            ? "configured"
            : "unconfigured",
      },
      {
        key: "sms",
        label: "OTP/SMS",
        status: env.SMS_PROVIDER_API_KEY ? "configured" : "unconfigured",
      },
      {
        key: "email",
        label: "Email",
        status: env.EMAIL_SMTP_URL ? "configured" : "unconfigured",
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        status: env.WHATSAPP_PROVIDER_TOKEN ? "configured" : "unconfigured",
      },
      {
        key: "maps",
        label: "Maps",
        status: env.MAPS_API_KEY ? "configured" : "unconfigured",
      },
      {
        key: "storage",
        label: "Media storage",
        status:
          env.S3_ENDPOINT && env.S3_BUCKET ? "configured" : "unconfigured",
      },
    ],
  };
}

async function getModuleCounts(
  moduleKey: AdminModuleKey,
): Promise<{ totalCount: number; activeCount: number | null }> {
  switch (moduleKey) {
    case "bookings": {
      const [totalCount, activeCount] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({
          where: {
            status: {
              notIn: ["COMPLETED", "CANCELLED"],
            },
          },
        }),
      ]);
      return { totalCount, activeCount };
    }
    case "customers":
      return {
        totalCount: await prisma.customerProfile.count(),
        activeCount: null,
      };
    case "staff": {
      const [totalCount, activeCount] = await Promise.all([
        prisma.staffProfile.count(),
        prisma.staffProfile.count({ where: { status: "ACTIVE" } }),
      ]);
      return { totalCount, activeCount };
    }
    case "catalogue": {
      const [serviceCount, publishedServiceCount, categoryCount] =
        await Promise.all([
          prisma.service.count(),
          prisma.service.count({ where: { status: "PUBLISHED" } }),
          prisma.category.count(),
        ]);
      return {
        totalCount: serviceCount + categoryCount,
        activeCount: publishedServiceCount,
      };
    }
    case "payments": {
      const [totalCount, activeCount] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.count({
          where: { status: { in: ["PENDING", "AUTHORIZED"] } },
        }),
      ]);
      return { totalCount, activeCount };
    }
    case "reviews": {
      const [totalCount, activeCount] = await Promise.all([
        prisma.review.count(),
        prisma.review.count({
          where: { status: "PENDING" },
        }),
      ]);
      return { totalCount, activeCount };
    }
    case "reports":
      return { totalCount: 0, activeCount: null };
    case "notifications": {
      const [templateCount, enabledRuleCount] = await Promise.all([
        prisma.notificationTemplate.count(),
        prisma.notificationRule.count({ where: { enabled: true } }),
      ]);
      return { totalCount: templateCount, activeCount: enabledRuleCount };
    }
    case "roles": {
      const [totalCount, activeCount] = await Promise.all([
        prisma.role.count(),
        prisma.role.count({ where: { archivedAt: null } }),
      ]);
      return { totalCount, activeCount };
    }
  }
}

async function getModuleSnapshot(
  moduleKey: AdminModuleKey,
): Promise<ModuleSnapshot> {
  const definition = MODULE_DEFINITIONS[moduleKey];
  const counts = await getModuleCounts(moduleKey);

  switch (moduleKey) {
    case "bookings": {
      const records = await prisma.booking.findMany({
        take: 10,
        orderBy: { scheduledStartAt: "asc" },
        include: { customerProfile: true },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: records.map((booking) => ({
          id: booking.publicId,
          title: `Booking ${booking.publicId.slice(-8)}`,
          subtitle: `${booking.customerProfile.displayName} · ${booking.scheduledStartAt.toISOString()}`,
          status: booking.status,
          updatedAt: booking.updatedAt.toISOString(),
        })),
      };
    }
    case "customers": {
      const records = await prisma.customerProfile.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
        include: { user: true },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: records.map((customer) => ({
          id: customer.id,
          title: customer.displayName,
          subtitle:
            customer.user.phone ?? customer.user.email ?? "No contact on file",
          status: customer.user.status,
          updatedAt: customer.updatedAt.toISOString(),
        })),
      };
    }
    case "staff": {
      const records = await prisma.staffProfile.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
        include: { user: true },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: records.map((staff) => ({
          id: staff.id,
          title: `${staff.user.name} (${staff.employeeCode})`,
          subtitle: `${staff.engagementType} · ${staff.user.phone ?? staff.user.email ?? "No contact on file"}`,
          status: staff.status,
          updatedAt: staff.updatedAt.toISOString(),
        })),
      };
    }
    case "catalogue": {
      const [categories, services] = await Promise.all([
        prisma.category.findMany({
          take: 6,
          orderBy: { updatedAt: "desc" },
          include: { parent: true, imageAsset: true },
        }),
        prisma.service.findMany({
          take: 8,
          orderBy: { updatedAt: "desc" },
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
      ]);

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: [
          ...categories.map((category) => ({
            id: category.publicId,
            title: category.name,
            subtitle: category.parent
              ? `Subcategory of ${category.parent.name}`
              : "Root category",
            status: category.status,
            updatedAt: category.updatedAt.toISOString(),
          })),
          ...services.map((service) => ({
            id: service.publicId,
            title: service.name,
            subtitle: `${service.category.name} · INR ${(service.pricePaise / 100).toLocaleString("en-IN")}`,
            status: service.status,
            updatedAt: service.updatedAt.toISOString(),
          })),
        ],
      };
    }
    case "payments": {
      const payments = await prisma.payment.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: payments.map((payment) => ({
          id: payment.id,
          title: `INR ${(payment.amountPaise / 100).toLocaleString("en-IN")}`,
          subtitle: `${payment.provider} · ${payment.currency}`,
          status: payment.status,
          updatedAt: payment.updatedAt.toISOString(),
        })),
      };
    }
    case "reviews": {
      const reviews = await prisma.review.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customerProfile: true,
          booking: {
            include: {
              items: true,
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
          moderatedBy: true,
        },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: reviews.map((review) => ({
          id: review.id,
          title: `${review.customerProfile.displayName} · ${review.rating}/5`,
          subtitle:
            review.comment ??
            review.booking.items
              .map((item) => item.serviceName)
              .slice(0, 3)
              .join(", "),
          status: review.showOnHomepage ? "SHOWN" : review.status,
          updatedAt: review.updatedAt.toISOString(),
        })),
      };
    }
    case "reports":
      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: [],
      };
    case "notifications": {
      const templates = await prisma.notificationTemplate.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: templates.map((template) => ({
          id: template.id,
          title: template.name,
          subtitle: template.channel,
          status: template.status,
          updatedAt: template.updatedAt.toISOString(),
        })),
      };
    }
    case "roles": {
      const roles = await prisma.role.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
      });

      return {
        key: moduleKey,
        label: definition.label,
        totalCount: counts.totalCount,
        activeCount: counts.activeCount,
        emptyMessage: definition.emptyMessage,
        records: roles.map((role) => ({
          id: role.id,
          title: role.name,
          subtitle: role.isSystem ? "System role" : "Custom role",
          status: role.archivedAt ? "ARCHIVED" : "ACTIVE",
          updatedAt: role.updatedAt.toISOString(),
        })),
      };
    }
  }
}

export function createAdminRouter(env: AppEnv): Router {
  const router = Router();
  const secureCookie = env.NODE_ENV === "production";

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  router.post(
    "/auth/login",
    loginLimiter,
    asyncHandler(async (req, res) => {
      const parsed = adminLoginRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Check the submitted fields.",
          parsed.error.issues,
        );
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          email: parsed.data.email,
          accountType: "ADMIN",
        },
        include: {
          authAccounts: {
            where: {
              providerId: "credential",
              accountId: parsed.data.email,
            },
            take: 1,
          },
        },
      });

      const authAccount = user?.authAccounts.at(0) ?? null;
      const passwordHash = authAccount?.passwordHash ?? null;
      const validPassword = passwordHash
        ? await verifyPassword(parsed.data.password, passwordHash)
        : false;

      if (!user || user.status !== "ACTIVE" || !validPassword) {
        await recordSecurityEvent(req, user?.id ?? null, "admin.login_failed");
        sendError(
          res,
          401,
          "UNAUTHENTICATED",
          "Email or password is incorrect.",
        );
        return;
      }

      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = createSessionExpiry();

      await prisma.$transaction(async (transaction) => {
        await transaction.authSession.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
          },
        });

        await transaction.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await transaction.securityEvent.create({
          data: {
            actorId: user.id,
            event: "admin.login_succeeded",
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
          },
        });
      });

      const loadedSession = await loadAdminSessionByTokenHash(tokenHash);

      if (!loadedSession) {
        throw new Error("Admin session was created but could not be loaded.");
      }

      res.setHeader(
        "Set-Cookie",
        serializeSessionCookie(token, expiresAt, secureCookie),
      );
      res.json(
        successEnvelope(
          {
            user: serializeActor(loadedSession.actor),
            expiresAt: expiresAt.toISOString(),
          },
          getRequestId(res),
          {
            sessionTtlSeconds: ADMIN_SESSION_TTL_MS / 1000,
          },
        ),
      );
    }),
  );

  router.post(
    "/auth/logout",
    requireActiveAdmin(),
    asyncHandler(async (req, res) => {
      const tokenHash = res.locals.tokenHash;
      const actor = getActor(res);

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

      await recordSecurityEvent(req, actor.id, "admin.logout");
      res.setHeader("Set-Cookie", serializeClearSessionCookie(secureCookie));
      res.json(successEnvelope({ ok: true }, getRequestId(res)));
    }),
  );

  router.get(
    "/auth/me",
    requireActiveAdmin(),
    asyncHandler(async (_req, res) => {
      const actor = getActor(res);
      res.json(
        successEnvelope({ user: serializeActor(actor) }, getRequestId(res)),
      );
    }),
  );

  router.get(
    "/dashboard",
    requirePermission("dashboard", "view"),
    asyncHandler(async (_req, res) => {
      res.json(
        successEnvelope(await getDashboardSummary(env), getRequestId(res)),
      );
    }),
  );

  router.get(
    "/operations/summary",
    requirePermission("dashboard", "view"),
    asyncHandler(async (_req, res) => {
      const actor = getActor(res);
      const modules = await Promise.all(
        adminModuleKeySchema.options.map(async (moduleKey) => {
          const definition = MODULE_DEFINITIONS[moduleKey];
          const permission = toPermissionKey(
            definition.permission.resource,
            definition.permission.action,
          );
          const decision = authorize(
            {
              id: actor.id,
              accountType: actor.accountType,
              status: actor.status,
              permissions: actor.permissionSet,
            },
            permission,
          );

          if (!decision.allowed) {
            return {
              key: moduleKey,
              label: definition.label,
              allowed: false,
              totalCount: null,
              activeCount: null,
            };
          }

          const counts = await getModuleCounts(moduleKey);
          return {
            key: moduleKey,
            label: definition.label,
            allowed: true,
            totalCount: counts.totalCount,
            activeCount: counts.activeCount,
          };
        }),
      );

      res.json(successEnvelope({ modules }, getRequestId(res)));
    }),
  );

  router.get(
    "/operations/:moduleKey",
    requireActiveAdmin(),
    asyncHandler(async (req, res) => {
      const parsedModuleKey = adminModuleKeySchema.safeParse(
        req.params.moduleKey,
      );

      if (!parsedModuleKey.success) {
        sendError(res, 404, "NOT_FOUND", "Admin module not found.");
        return;
      }

      const actor = getActor(res);
      const definition = MODULE_DEFINITIONS[parsedModuleKey.data];
      const permission = toPermissionKey(
        definition.permission.resource,
        definition.permission.action,
      );
      const decision = authorize(
        {
          id: actor.id,
          accountType: actor.accountType,
          status: actor.status,
          permissions: actor.permissionSet,
        },
        permission,
      );

      if (!decision.allowed) {
        sendError(
          res,
          403,
          "FORBIDDEN",
          "You do not have permission for this operation.",
        );
        return;
      }

      res.json(
        successEnvelope(
          await getModuleSnapshot(parsedModuleKey.data),
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/permissions",
    requirePermission("roles", "manage_permissions"),
    asyncHandler(async (_req, res) => {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      });

      res.json(
        successEnvelope(
          {
            permissions: permissions
              .map(serializePermissionOption)
              .filter(isPermissionOption),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/payments",
    requirePermission("payments", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminPaymentListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted payment list filters.",
          parsed.error.issues,
        );
        return;
      }

      const provider = parsed.data.provider?.trim() || undefined;
      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getPaymentWhere(search, status, provider);
      const [totalCount, payments, capturedAggregate, statusRows] =
        await Promise.all([
          prisma.payment.count({ where }),
          prisma.payment.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: getPaymentOrderBy(sort),
            include: ADMIN_PAYMENT_INCLUDE,
          }),
          prisma.payment.aggregate({
            where: {
              ...where,
              status: "CAPTURED",
            },
            _sum: {
              amountPaise: true,
            },
          }),
          prisma.payment.groupBy({
            by: ["status"],
            where,
            _count: {
              _all: true,
            },
          }),
        ]);

      res.json(
        successEnvelope(
          {
            payments: payments.map(serializeAdminPaymentRow),
            pagination: {
              page,
              pageSize,
              totalCount,
              totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
            },
            summary: {
              capturedAmountPaise: capturedAggregate._sum.amountPaise ?? 0,
              byStatus: statusRows.map((row) => ({
                status: row.status,
                count: row._count._all,
              })),
            },
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/payments/:paymentId",
    requirePermission("payments", "view"),
    asyncHandler(async (req, res) => {
      const paymentId = getRouteParam(req.params.paymentId);

      if (!paymentId) {
        sendError(res, 404, "NOT_FOUND", "Payment was not found.");
        return;
      }

      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { id: paymentId },
            { providerRef: paymentId },
            { providerOrderId: paymentId },
            { providerPaymentId: paymentId },
          ],
        },
        include: ADMIN_PAYMENT_INCLUDE,
      });

      if (!payment) {
        sendError(res, 404, "NOT_FOUND", "Payment was not found.");
        return;
      }

      res.json(
        successEnvelope(
          { payment: serializeAdminPaymentRow(payment) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/payments/:paymentId/sync",
    requirePermission("payments", "update"),
    asyncHandler(async (req, res) => {
      const paymentId = getRouteParam(req.params.paymentId);

      if (!paymentId) {
        sendError(res, 404, "NOT_FOUND", "Payment was not found.");
        return;
      }

      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { id: paymentId },
            { providerRef: paymentId },
            { providerOrderId: paymentId },
            { providerPaymentId: paymentId },
          ],
        },
        include: ADMIN_PAYMENT_INCLUDE,
      });

      if (!payment) {
        sendError(res, 404, "NOT_FOUND", "Payment was not found.");
        return;
      }

      if (payment.provider !== "razorpay") {
        sendError(
          res,
          400,
          "BAD_REQUEST",
          "Only Razorpay payments can be synced with the provider.",
        );
        return;
      }

      if (!isRazorpayConfigured(env)) {
        sendError(
          res,
          503,
          "INTERNAL_ERROR",
          "Razorpay API credentials are not configured.",
        );
        return;
      }

      let providerPayment: RazorpayPaymentEntity;

      try {
        providerPayment = await fetchRazorpayPaymentForAdminSync(env, payment);
      } catch (error) {
        if (error instanceof AdminConflictError) {
          sendError(res, 409, "CONFLICT", error.message);
          return;
        }

        sendError(
          res,
          503,
          "INTERNAL_ERROR",
          "Razorpay provider status could not be synced.",
        );
        return;
      }

      if (!razorpayPaymentMatchesAdminRecord(providerPayment, payment)) {
        sendError(
          res,
          409,
          "CONFLICT",
          "Razorpay payment details did not match the local payment record.",
        );
        return;
      }

      const before = paymentAuditSummary(serializeAdminPaymentRow(payment));

      await prisma.$transaction(async (transaction) => {
        await recordPaymentStateAndMaybeConfirmBooking(
          transaction,
          payment.bookingId,
          payment.id,
          verifiedStateFromRazorpayPayment(providerPayment),
          { requireBookingConfirmation: false },
        );
      });

      const refreshedPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: ADMIN_PAYMENT_INCLUDE,
      });
      const paymentRow = serializeAdminPaymentRow(refreshedPayment);

      await recordAuditLog(
        req,
        res,
        "payment.razorpay_sync",
        "Payment",
        payment.id,
        paymentAuditSummary(paymentRow),
        before,
      );

      res.json(successEnvelope({ payment: paymentRow }, getRequestId(res)));
    }),
  );

  router.get(
    "/reviews",
    requirePermission("reviews", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminReviewListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted review list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getReviewWhere(search, status);
      const [totalCount, reviews] = await Promise.all([
        prisma.review.count({ where }),
        prisma.review.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getReviewOrderBy(sort),
          include: {
            customerProfile: true,
            booking: {
              include: {
                items: true,
                payments: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
            moderatedBy: true,
          },
        }),
      ]);

      res.json(
        successEnvelope(
          {
            reviews: reviews.map(serializeAdminReviewRow),
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

  router.patch(
    "/reviews/:reviewId",
    requirePermission("reviews", "approve"),
    asyncHandler(async (req, res) => {
      const parsed = adminUpdateReviewRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted review moderation fields.",
          parsed.error.issues,
        );
        return;
      }

      if (parsed.data.showOnHomepage && parsed.data.status !== "APPROVED") {
        sendValidationError(
          res,
          "Only approved reviews can be shown on the homepage.",
        );
        return;
      }

      const reviewIdParam = req.params.reviewId;

      if (typeof reviewIdParam !== "string" || !reviewIdParam.trim()) {
        sendValidationError(res, "Review id is required.");
        return;
      }

      const reviewId = reviewIdParam;
      const actor = getActor(res);
      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          customerProfile: true,
          booking: {
            include: {
              items: true,
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
          moderatedBy: true,
        },
      });

      if (!existingReview) {
        sendError(res, 404, "NOT_FOUND", "Review not found.");
        return;
      }

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: parsed.data.status,
          showOnHomepage: parsed.data.showOnHomepage,
          moderatedById: actor.id,
          moderatedAt: new Date(),
        },
        include: {
          customerProfile: true,
          booking: {
            include: {
              items: true,
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
          moderatedBy: true,
        },
      });

      await recordAuditLog(
        req,
        res,
        "review.moderate",
        "Review",
        updatedReview.id,
        reviewAuditSummary(updatedReview),
        reviewAuditSummary(existingReview),
      );

      res.json(
        successEnvelope(
          {
            review: serializeAdminReviewRow(updatedReview),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/catalogue/options",
    requireActiveAdmin(),
    asyncHandler(async (_req, res) => {
      const actor = getActor(res);
      const canUseCatalogueOptions = [
        toPermissionKey("categories", "view"),
        toPermissionKey("categories", "create"),
        toPermissionKey("categories", "update"),
        toPermissionKey("services", "view"),
        toPermissionKey("services", "create"),
        toPermissionKey("services", "update"),
      ].some(
        (permission) =>
          authorize(
            {
              id: actor.id,
              accountType: actor.accountType,
              status: actor.status,
              permissions: actor.permissionSet,
            },
            permission,
          ).allowed,
      );

      if (!canUseCatalogueOptions) {
        sendError(
          res,
          403,
          "FORBIDDEN",
          "You do not have permission for this operation.",
        );
        return;
      }

      const categories = await prisma.category.findMany({
        where: {
          archivedAt: null,
          status: { not: "ARCHIVED" },
        },
        orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        include: {
          parent: true,
        },
      });

      res.json(
        successEnvelope(
          {
            categories: categories.map((category) => ({
              id: category.id,
              publicId: category.publicId,
              name: category.name,
              parentId: category.parentId,
              parentName: category.parent?.name ?? null,
              status: category.status,
            })),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/homepage",
    requirePermission("content", "view"),
    asyncHandler(async (_req, res) => {
      res.json(successEnvelope(await loadHomepageContent(), getRequestId(res)));
    }),
  );

  router.put(
    "/homepage",
    requirePermission("content", "update"),
    asyncHandler(async (req, res) => {
      const parsed = adminUpdateHomepageRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted homepage fields.",
          parsed.error.issues,
        );
        return;
      }

      const actor = getActor(res);
      const previousHomepage = await loadHomepageContent();
      const serializedHomepage = JSON.stringify(parsed.data);
      const now = new Date();
      const contentPage = await prisma.$transaction(async (transaction) => {
        const page = await transaction.contentPage.upsert({
          where: { slug: PUBLIC_HOMEPAGE_CONTENT_SLUG },
          update: {
            title: "Public homepage",
            status: "PUBLISHED",
            publishedAt: now,
          },
          create: {
            slug: PUBLIC_HOMEPAGE_CONTENT_SLUG,
            title: "Public homepage",
            status: "PUBLISHED",
            publishedAt: now,
          },
        });

        const latestRevision = await transaction.contentRevision.findFirst({
          where: { contentPageId: page.id },
          orderBy: { revisionNo: "desc" },
          select: { revisionNo: true },
        });

        await transaction.contentRevision.create({
          data: {
            contentPageId: page.id,
            authorId: actor.id,
            bodyHtml: serializedHomepage,
            bodyText: serializedHomepage,
            revisionNo: (latestRevision?.revisionNo ?? 0) + 1,
          },
        });

        return transaction.contentPage.update({
          where: { id: page.id },
          data: { title: "Public homepage" },
        });
      });

      await recordAuditLog(
        req,
        res,
        "homepage.update",
        "ContentPage",
        contentPage.id,
        homepageAuditSummary(parsed.data),
        homepageAuditSummary(previousHomepage.homepage),
      );

      res.json(
        successEnvelope(
          {
            homepage: parsed.data,
            updatedAt: contentPage.updatedAt.toISOString(),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/media/images",
    requireActiveAdmin(),
    asyncHandler(async (req, res) => {
      const actor = getActor(res);
      const canUploadMedia = actorHasAnyPermission(actor, [
        toPermissionKey("categories", "create"),
        toPermissionKey("categories", "update"),
        toPermissionKey("services", "create"),
        toPermissionKey("services", "update"),
        toPermissionKey("content", "create"),
        toPermissionKey("content", "update"),
      ]);

      if (!canUploadMedia) {
        sendError(
          res,
          403,
          "FORBIDDEN",
          "You do not have permission for this operation.",
        );
        return;
      }

      const parsed = adminImageUploadRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted image fields.",
          parsed.error.issues,
        );
        return;
      }

      const dataBase64 = parsed.data.dataBase64.replace(
        /^data:image\/[a-z0-9.+-]+;base64,/i,
        "",
      );
      const buffer = Buffer.from(dataBase64, "base64");

      if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
        sendValidationError(res, "Image files must be 5 MB or smaller.");
        return;
      }

      if (!isValidImageBuffer(buffer, parsed.data.contentType)) {
        sendValidationError(
          res,
          "The uploaded file does not match its image type.",
        );
        return;
      }

      const uploadRoot = getLocalUploadRoot();
      const storedFilename = sanitizeUploadFilename(
        parsed.data.filename,
        parsed.data.contentType,
      );
      const objectKey = `/uploads/admin/${storedFilename}`;

      await mkdir(uploadRoot, { recursive: true });
      await writeFile(path.join(uploadRoot, storedFilename), buffer, {
        flag: "wx",
      });

      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          bucket: "local-public",
          objectKey,
          contentType: parsed.data.contentType,
          sizeBytes: buffer.length,
          altText: parsed.data.altText ?? parsed.data.filename,
        },
      });

      await recordAuditLog(
        req,
        res,
        "media.image_upload",
        "MediaAsset",
        mediaAsset.id,
        {
          contentType: mediaAsset.contentType,
          objectKey: mediaAsset.objectKey,
          sizeBytes: mediaAsset.sizeBytes,
        },
      );

      res.status(201).json(
        successEnvelope(
          {
            image: mediaAssetToRow(mediaAsset),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/blogs",
    requirePermission("content", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminBlogListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted blog filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where: Prisma.BlogPostWhereInput = {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { excerpt: { contains: search } },
              ],
            }
          : {}),
      };
      const orderBy: Prisma.BlogPostOrderByWithRelationInput =
        sort === "updatedAt_asc"
          ? { updatedAt: "asc" }
          : sort === "title_asc"
            ? { title: "asc" }
            : sort === "title_desc"
              ? { title: "desc" }
              : sort === "publishedAt_desc"
                ? { publishedAt: "desc" }
                : { updatedAt: "desc" };
      const [totalCount, posts] = await Promise.all([
        prisma.blogPost.count({ where }),
        prisma.blogPost.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { author: { select: { name: true } } },
        }),
      ]);
      res.json(
        successEnvelope(
          {
            posts: posts.map(serializeBlogPost),
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
    "/blogs/:blogId",
    requirePermission("content", "view"),
    asyncHandler(async (req, res) => {
      const blogId = getRouteParam(req.params.blogId);
      const post = blogId
        ? await prisma.blogPost.findUnique({
            where: { id: blogId },
            include: { author: { select: { name: true } } },
          })
        : null;
      if (!post) {
        sendError(res, 404, "NOT_FOUND", "Blog post was not found.");
        return;
      }
      res.json(
        successEnvelope({ post: serializeBlogPost(post) }, getRequestId(res)),
      );
    }),
  );

  router.post(
    "/blogs",
    requirePermission("content", "create"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreateBlogRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted blog fields.",
          parsed.error.issues,
        );
        return;
      }
      const actor = getActor(res);
      const slug = parsed.data.slug ?? toSlug(parsed.data.title);
      if (await prisma.blogPost.findUnique({ where: { slug } })) {
        sendValidationError(res, "A blog post with this slug already exists.");
        return;
      }
      const now = new Date();
      const post = await prisma.blogPost.create({
        data: {
          ...parsed.data,
          slug,
          authorId: actor.id,
          coverImageUrl: parsed.data.coverImageUrl || null,
          coverImageAlt: parsed.data.coverImageAlt || null,
          seoTitle: parsed.data.seoTitle || null,
          seoDescription: parsed.data.seoDescription || null,
          publishedAt: parsed.data.status === "PUBLISHED" ? now : null,
          archivedAt: parsed.data.status === "ARCHIVED" ? now : null,
        },
        include: { author: { select: { name: true } } },
      });
      await recordAuditLog(
        req,
        res,
        "blog.create",
        "BlogPost",
        post.id,
        blogAuditSummary(post),
      );
      res
        .status(201)
        .json(
          successEnvelope({ post: serializeBlogPost(post) }, getRequestId(res)),
        );
    }),
  );

  router.put(
    "/blogs/:blogId",
    requirePermission("content", "update"),
    asyncHandler(async (req, res) => {
      const blogId = getRouteParam(req.params.blogId);
      const parsed = adminUpdateBlogRequestSchema.safeParse(req.body);
      if (!blogId) {
        sendError(res, 404, "NOT_FOUND", "Blog post was not found.");
        return;
      }
      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted blog fields.",
          parsed.error.issues,
        );
        return;
      }
      const existing = await prisma.blogPost.findUnique({
        where: { id: blogId },
      });
      if (!existing) {
        sendError(res, 404, "NOT_FOUND", "Blog post was not found.");
        return;
      }
      const slug = parsed.data.slug ?? toSlug(parsed.data.title);
      const duplicate = await prisma.blogPost.findFirst({
        where: { slug, id: { not: blogId } },
      });
      if (duplicate) {
        sendValidationError(res, "A blog post with this slug already exists.");
        return;
      }
      const now = new Date();
      const post = await prisma.blogPost.update({
        where: { id: blogId },
        data: {
          ...parsed.data,
          slug,
          coverImageUrl: parsed.data.coverImageUrl || null,
          coverImageAlt: parsed.data.coverImageAlt || null,
          seoTitle: parsed.data.seoTitle || null,
          seoDescription: parsed.data.seoDescription || null,
          publishedAt:
            parsed.data.status === "PUBLISHED"
              ? (existing.publishedAt ?? now)
              : null,
          archivedAt:
            parsed.data.status === "ARCHIVED"
              ? (existing.archivedAt ?? now)
              : null,
        },
        include: { author: { select: { name: true } } },
      });
      await recordAuditLog(
        req,
        res,
        "blog.update",
        "BlogPost",
        post.id,
        blogAuditSummary(post),
        blogAuditSummary(existing),
      );
      res.json(
        successEnvelope({ post: serializeBlogPost(post) }, getRequestId(res)),
      );
    }),
  );

  router.delete(
    "/blogs/:blogId",
    requirePermission("content", "delete"),
    asyncHandler(async (req, res) => {
      const blogId = getRouteParam(req.params.blogId);
      const existing = blogId
        ? await prisma.blogPost.findUnique({ where: { id: blogId } })
        : null;
      if (!existing) {
        sendError(res, 404, "NOT_FOUND", "Blog post was not found.");
        return;
      }
      const post = await prisma.blogPost.update({
        where: { id: existing.id },
        data: {
          status: "ARCHIVED",
          archivedAt: existing.archivedAt ?? new Date(),
        },
        include: { author: { select: { name: true } } },
      });
      await recordAuditLog(
        req,
        res,
        "blog.archive",
        "BlogPost",
        post.id,
        blogAuditSummary(post),
        blogAuditSummary(existing),
      );
      res.json(
        successEnvelope({ post: serializeBlogPost(post) }, getRequestId(res)),
      );
    }),
  );

  router.get(
    "/admin-users/options",
    requireActiveAdmin(),
    asyncHandler(async (_req, res) => {
      const actor = getActor(res);
      const canUseUserOptions = actorHasAnyPermission(actor, [
        toPermissionKey("admin_users", "view"),
        toPermissionKey("admin_users", "create"),
        toPermissionKey("admin_users", "update"),
        toPermissionKey("roles", "view"),
        toPermissionKey("roles", "manage_permissions"),
      ]);

      if (!canUseUserOptions) {
        sendError(
          res,
          403,
          "FORBIDDEN",
          "You do not have permission for this operation.",
        );
        return;
      }

      const roles = await prisma.role.findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
      });

      res.json(
        successEnvelope(
          {
            roles: roles.map((role) => ({
              id: role.id,
              name: role.name,
              description: role.description,
              isSystem: role.isSystem,
            })),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/admin-users",
    requirePermission("admin_users", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminUserListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted user list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getAdminUserWhere(search, status);
      const [totalCount, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getAdminUserOrderBy(sort),
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        }),
      ]);

      res.json(
        successEnvelope(
          {
            users: users.map(serializeAdminUserRow),
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
    "/admin-users/export",
    requirePermission("admin_users", "export"),
    asyncHandler(async (req, res) => {
      const parsed = adminUserListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted user export filters.",
          parsed.error.issues,
        );
        return;
      }

      const { search, status, sort } = parsed.data;
      const where = getAdminUserWhere(search, status);
      const users = await prisma.user.findMany({
        where,
        take: 5_000,
        orderBy: getAdminUserOrderBy(sort),
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      await recordAuditLog(req, res, "admin_user.export", "User", "export", {
        rowCount: users.length,
        searchApplied: Boolean(search),
        status: status ?? "ALL",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="replica-admin-users-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(adminUserRowsToCsv(users));
    }),
  );

  router.get(
    "/admin-users/:userId",
    requirePermission("admin_users", "view"),
    asyncHandler(async (req, res) => {
      const userId = getRouteParam(req.params.userId);

      if (!userId) {
        sendError(res, 404, "NOT_FOUND", "Admin user was not found.");
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          accountType: "ADMIN",
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        sendError(res, 404, "NOT_FOUND", "Admin user was not found.");
        return;
      }

      res.json(
        successEnvelope(
          { user: serializeAdminUserRow(user) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/admin-users",
    requirePermission("admin_users", "create"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreateUserRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted user fields.",
          parsed.error.issues,
        );
        return;
      }

      const email = parsed.data.email;

      if (!email) {
        sendValidationError(res, "Admin users need an email login.");
        return;
      }

      const userIdentifierFilters: Prisma.UserWhereInput[] = [{ email }];

      if (parsed.data.phone) {
        userIdentifierFilters.push({ phone: parsed.data.phone });
      }

      const roleIds = [...new Set(parsed.data.roleIds)];
      const [duplicateUser, roles] = await Promise.all([
        prisma.user.findFirst({
          where: {
            OR: userIdentifierFilters,
          },
        }),
        prisma.role.findMany({
          where: {
            id: { in: roleIds },
            archivedAt: null,
          },
        }),
      ]);

      if (duplicateUser) {
        sendValidationError(res, "A user with this email or phone exists.");
        return;
      }

      if (roles.length !== roleIds.length) {
        sendValidationError(res, "One or more selected roles do not exist.");
        return;
      }

      const actor = getActor(res);
      const status = parsed.data.status ?? "ACTIVE";
      const passwordHash = await hashPassword(parsed.data.temporaryPassword);
      const user = await prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            name: parsed.data.name,
            email,
            phone: parsed.data.phone ?? null,
            accountType: "ADMIN",
            status,
          },
        });

        await transaction.authAccount.create({
          data: {
            userId: createdUser.id,
            providerId: "credential",
            accountId: email,
            passwordHash,
          },
        });

        await transaction.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: createdUser.id,
            roleId,
          })),
        });

        const createdUserWithRoles = await transaction.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "admin_user.create",
            resourceType: "User",
            resourceId: createdUser.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            after: toJsonObject(userAuditSummary(createdUserWithRoles)),
          },
        });

        return createdUserWithRoles;
      });

      res.status(201).json(
        successEnvelope(
          {
            user: serializeAdminUserRow(user),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.patch(
    "/admin-users/:userId",
    requirePermission("admin_users", "update"),
    asyncHandler(async (req, res) => {
      const userId = getRouteParam(req.params.userId);

      if (!userId) {
        sendError(res, 404, "NOT_FOUND", "Admin user was not found.");
        return;
      }

      const parsed = adminUpdateUserRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted user fields.",
          parsed.error.issues,
        );
        return;
      }

      const email = parsed.data.email;

      if (!email) {
        sendValidationError(res, "Admin users need an email login.");
        return;
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          id: userId,
          accountType: "ADMIN",
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!existingUser) {
        sendError(res, 404, "NOT_FOUND", "Admin user was not found.");
        return;
      }

      const actor = getActor(res);
      const status = parsed.data.status ?? existingUser.status;

      if (actor.id === existingUser.id && status !== "ACTIVE") {
        sendValidationError(res, "You cannot deactivate your own account.");
        return;
      }

      const emailChanged = existingUser.email !== email;

      if (emailChanged && !parsed.data.temporaryPassword) {
        sendValidationError(
          res,
          "Set a temporary password when changing an admin login email.",
        );
        return;
      }

      const userIdentifierFilters: Prisma.UserWhereInput[] = [{ email }];

      if (parsed.data.phone) {
        userIdentifierFilters.push({ phone: parsed.data.phone });
      }

      const roleIds = [...new Set(parsed.data.roleIds)];
      const [duplicateUser, roles] = await Promise.all([
        prisma.user.findFirst({
          where: {
            id: { not: existingUser.id },
            OR: userIdentifierFilters,
          },
        }),
        prisma.role.findMany({
          where: {
            id: { in: roleIds },
            archivedAt: null,
          },
        }),
      ]);

      if (duplicateUser) {
        sendValidationError(res, "A user with this email or phone exists.");
        return;
      }

      if (roles.length !== roleIds.length) {
        sendValidationError(res, "One or more selected roles do not exist.");
        return;
      }

      const hadSuperAdmin = existingUser.userRoles.some(
        (userRole) => userRole.role.name === "SUPER_ADMIN",
      );
      const keepsSuperAdmin = roles.some((role) => role.name === "SUPER_ADMIN");

      if (
        hadSuperAdmin &&
        (!keepsSuperAdmin || status !== "ACTIVE") &&
        (await countActiveSuperAdminUsers(existingUser.id)) === 0
      ) {
        sendValidationError(
          res,
          "At least one active SUPER_ADMIN account must remain.",
        );
        return;
      }

      const passwordHash = parsed.data.temporaryPassword
        ? await hashPassword(parsed.data.temporaryPassword)
        : null;
      const updatedUser = await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: existingUser.id },
          data: {
            name: parsed.data.name,
            email,
            phone: parsed.data.phone ?? null,
            status,
          },
        });

        if (passwordHash) {
          await transaction.authAccount.deleteMany({
            where: {
              userId: existingUser.id,
              providerId: "credential",
            },
          });

          await transaction.authAccount.create({
            data: {
              userId: existingUser.id,
              providerId: "credential",
              accountId: email,
              passwordHash,
            },
          });
        }

        await transaction.userRole.deleteMany({
          where: { userId: existingUser.id },
        });

        await transaction.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: existingUser.id,
            roleId,
          })),
        });

        await transaction.authSession.updateMany({
          where: {
            userId: existingUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        const userWithRoles = await transaction.user.findUniqueOrThrow({
          where: { id: existingUser.id },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "admin_user.update",
            resourceType: "User",
            resourceId: existingUser.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            before: toJsonObject(userAuditSummary(existingUser)),
            after: toJsonObject(userAuditSummary(userWithRoles)),
          },
        });

        return userWithRoles;
      });

      res.json(
        successEnvelope(
          {
            user: serializeAdminUserRow(updatedUser),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.delete(
    "/admin-users/:userId",
    requirePermission("admin_users", "delete"),
    asyncHandler(async (req, res) => {
      const userId = getRouteParam(req.params.userId);

      if (!userId) {
        sendError(res, 404, "NOT_FOUND", "Admin user was not found.");
        return;
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          id: userId,
          accountType: "ADMIN",
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!existingUser) {
        sendError(res, 404, "NOT_FOUND", "Admin user was not found.");
        return;
      }

      const actor = getActor(res);

      if (actor.id === existingUser.id) {
        sendValidationError(res, "You cannot deactivate your own account.");
        return;
      }

      if (
        (await hasActiveSuperAdminRole(existingUser.id)) &&
        (await countActiveSuperAdminUsers(existingUser.id)) === 0
      ) {
        sendValidationError(
          res,
          "At least one active SUPER_ADMIN account must remain.",
        );
        return;
      }

      const disabledUser = await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: existingUser.id },
          data: { status: "DISABLED" },
        });

        await transaction.authSession.updateMany({
          where: {
            userId: existingUser.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        const userWithRoles = await transaction.user.findUniqueOrThrow({
          where: { id: existingUser.id },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "admin_user.deactivate",
            resourceType: "User",
            resourceId: existingUser.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            before: toJsonObject(userAuditSummary(existingUser)),
            after: toJsonObject(userAuditSummary(userWithRoles)),
          },
        });

        return userWithRoles;
      });

      res.json(
        successEnvelope(
          {
            user: serializeAdminUserRow(disabledUser),
          },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/bookings",
    requirePermission("bookings", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminBookingListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted booking list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getBookingWhere(search, status);
      const [totalCount, bookings] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getBookingOrderBy(sort),
          include: {
            customerProfile: {
              include: {
                user: true,
              },
            },
            address: true,
            items: true,
            payments: {
              orderBy: { createdAt: "desc" },
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
            bookings: bookings.map(serializeAdminBookingRow),
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
    "/bookings/:bookingId",
    requirePermission("bookings", "view"),
    asyncHandler(async (req, res) => {
      const bookingId = getRouteParam(req.params.bookingId);

      if (!bookingId) {
        sendError(res, 404, "NOT_FOUND", "Booking was not found.");
        return;
      }

      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ id: bookingId }, { publicId: bookingId }],
        },
        include: {
          customerProfile: {
            include: {
              user: true,
            },
          },
          address: true,
          items: true,
          payments: {
            orderBy: { createdAt: "desc" },
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

      if (!booking) {
        sendError(res, 404, "NOT_FOUND", "Booking was not found.");
        return;
      }

      res.json(
        successEnvelope(
          { booking: serializeAdminBookingRow(booking) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.patch(
    "/bookings/:bookingId/assignment",
    requirePermission("bookings", "assign"),
    asyncHandler(async (req, res) => {
      const bookingId = getRouteParam(req.params.bookingId);

      if (!bookingId) {
        sendError(res, 404, "NOT_FOUND", "Booking was not found.");
        return;
      }

      const parsed = adminUpdateBookingAssignmentRequestSchema.safeParse(
        req.body,
      );

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted assignment fields.",
          parsed.error.issues,
        );
        return;
      }

      const existingBooking = await prisma.booking.findFirst({
        where: {
          OR: [{ id: bookingId }, { publicId: bookingId }],
        },
        include: {
          customerProfile: {
            include: {
              user: true,
            },
          },
          address: true,
          items: true,
          payments: {
            orderBy: { createdAt: "desc" },
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

      if (!existingBooking) {
        sendError(res, 404, "NOT_FOUND", "Booking was not found.");
        return;
      }

      if (
        existingBooking.status === "COMPLETED" ||
        existingBooking.status === "CANCELLED"
      ) {
        sendError(
          res,
          409,
          "CONFLICT",
          "Completed or cancelled bookings cannot be reassigned.",
        );
        return;
      }

      const serviceIds = [
        ...new Set(existingBooking.items.map((item) => item.serviceId)),
      ];
      const services = await prisma.service.findMany({
        where: {
          id: {
            in: serviceIds,
          },
        },
        include: {
          tiers: true,
        },
      });
      const serviceById = new Map(
        services.map((service) => [service.id, service]),
      );

      if (serviceById.size !== serviceIds.length) {
        sendError(
          res,
          409,
          "CONFLICT",
          "One or more booked services no longer exist.",
        );
        return;
      }

      const startsAt = new Date(parsed.data.scheduledStartAt);
      const durationMinutes = existingBooking.items.reduce((total, item) => {
        const service = serviceById.get(item.serviceId);
        const tier = item.serviceTierId
          ? service?.tiers.find(
              (candidate) => candidate.id === item.serviceTierId,
            )
          : null;

        return (
          total +
          (tier?.durationMinutes ?? service?.durationMinutes ?? 0) *
            item.quantity
        );
      }, 0);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
      const selectedStaff = await chooseStaffForAdminAssignment(
        serviceIds,
        startsAt,
        endsAt,
        existingBooking.id,
        parsed.data.staffProfileId,
      );

      if (!selectedStaff) {
        sendError(
          res,
          409,
          "CONFLICT",
          parsed.data.staffProfileId
            ? "Selected staff member is not available for this booking."
            : "No eligible staff member is available for this booking.",
        );
        return;
      }

      const actor = getActor(res);
      let updatedBooking: AdminBookingWithRelations;

      try {
        updatedBooking = await prisma.$transaction(async (transaction) => {
          const overlap = await transaction.staffAssignment.findFirst({
            where: {
              bookingId: { not: existingBooking.id },
              staffProfileId: selectedStaff.id,
              status: { not: "REJECTED" },
              booking: {
                status: {
                  notIn: [...ASSIGNMENT_NON_BLOCKING_BOOKING_STATUSES],
                },
                scheduledStartAt: { lt: endsAt },
                scheduledEndAt: { gt: startsAt },
              },
            },
          });

          if (overlap) {
            throw new AdminConflictError(
              "Selected staff member is no longer available for this slot.",
            );
          }

          await transaction.booking.update({
            where: { id: existingBooking.id },
            data: {
              scheduledStartAt: startsAt,
              scheduledEndAt: endsAt,
              status:
                existingBooking.status === "DRAFT"
                  ? "ASSIGNMENT_PENDING"
                  : existingBooking.status,
            },
          });

          await transaction.staffAssignment.updateMany({
            where: {
              bookingId: existingBooking.id,
              status: { not: "REJECTED" },
            },
            data: {
              status: "REJECTED",
              rejectedAt: new Date(),
            },
          });

          await transaction.staffAssignment.create({
            data: {
              bookingId: existingBooking.id,
              staffProfileId: selectedStaff.id,
              status: "ASSIGNED",
            },
          });

          await transaction.bookingStatusHistory.create({
            data: {
              bookingId: existingBooking.id,
              status:
                existingBooking.status === "DRAFT"
                  ? "ASSIGNMENT_PENDING"
                  : existingBooking.status,
              actorId: actor.id,
              reason:
                parsed.data.reason ??
                "Admin updated slot and professional assignment.",
            },
          });

          await transaction.auditLog.create({
            data: {
              actorId: actor.id,
              action: "booking.assignment_update",
              resourceType: "Booking",
              resourceId: existingBooking.id,
              requestId: getRequestId(res),
              ipHash: hashContextValue(getClientIp(req)),
              userAgent: getUserAgent(req),
              before: toJsonObject(
                bookingAssignmentAuditSummary(existingBooking),
              ),
              after: toJsonObject({
                publicId: existingBooking.publicId,
                scheduledStartAt: startsAt.toISOString(),
                scheduledEndAt: endsAt.toISOString(),
                staffProfileId: selectedStaff.id,
              }),
            },
          });

          return transaction.booking.findUniqueOrThrow({
            where: { id: existingBooking.id },
            include: {
              customerProfile: {
                include: {
                  user: true,
                },
              },
              address: true,
              items: true,
              payments: {
                orderBy: { createdAt: "desc" },
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
      } catch (assignmentError) {
        if (assignmentError instanceof AdminConflictError) {
          sendError(res, 409, "CONFLICT", assignmentError.message);
          return;
        }

        throw assignmentError;
      }

      res.json(
        successEnvelope(
          { booking: serializeAdminBookingRow(updatedBooking) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/staff",
    requirePermission("staff", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminStaffListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted staff list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getStaffWhere(search, status);
      const [totalCount, staff] = await Promise.all([
        prisma.staffProfile.count({ where }),
        prisma.staffProfile.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getStaffOrderBy(sort),
          include: {
            user: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        }),
      ]);

      res.json(
        successEnvelope(
          {
            staff: staff.map(serializeStaffRow),
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
    "/staff/export",
    requirePermission("staff", "export"),
    asyncHandler(async (req, res) => {
      const parsed = adminStaffListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted staff export filters.",
          parsed.error.issues,
        );
        return;
      }

      const { search, status, sort } = parsed.data;
      const where = getStaffWhere(search, status);
      const staff = await prisma.staffProfile.findMany({
        where,
        take: 5_000,
        orderBy: getStaffOrderBy(sort),
        include: {
          user: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      await recordAuditLog(req, res, "staff.export", "StaffProfile", "export", {
        rowCount: staff.length,
        searchApplied: Boolean(search),
        status: status ?? "ALL",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="replica-staff-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(staffRowsToCsv(staff));
    }),
  );

  router.get(
    "/staff/:staffId",
    requirePermission("staff", "view"),
    asyncHandler(async (req, res) => {
      const staffId = getRouteParam(req.params.staffId);

      if (!staffId) {
        sendError(res, 404, "NOT_FOUND", "Staff member was not found.");
        return;
      }

      const staff = await prisma.staffProfile.findUnique({
        where: { id: staffId },
        include: {
          user: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!staff) {
        sendError(res, 404, "NOT_FOUND", "Staff member was not found.");
        return;
      }

      res.json(
        successEnvelope({ staff: serializeStaffRow(staff) }, getRequestId(res)),
      );
    }),
  );

  router.post(
    "/staff",
    requirePermission("staff", "create"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreateStaffRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted staff fields.",
          parsed.error.issues,
        );
        return;
      }

      const userIdentifierFilters: Prisma.UserWhereInput[] = [];

      if (parsed.data.email) {
        userIdentifierFilters.push({ email: parsed.data.email });
      }

      if (parsed.data.phone) {
        userIdentifierFilters.push({ phone: parsed.data.phone });
      }

      const [duplicateUser, duplicateStaff] = await Promise.all([
        prisma.user.findFirst({
          where: {
            OR: userIdentifierFilters,
          },
        }),
        prisma.staffProfile.findUnique({
          where: {
            employeeCode: parsed.data.employeeCode,
          },
        }),
      ]);

      if (duplicateUser) {
        sendValidationError(res, "A user with this email or phone exists.");
        return;
      }

      if (duplicateStaff) {
        sendValidationError(
          res,
          "A staff member with this employee code exists.",
        );
        return;
      }

      if (!(await activeServiceIdsExist(parsed.data.serviceIds))) {
        sendValidationError(res, "Choose only active services for this staff.");
        return;
      }

      const actor = getActor(res);
      const status = parsed.data.status ?? "ACTIVE";
      const serviceIds = [...new Set(parsed.data.serviceIds)];
      const staff = await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email ?? null,
            phone: parsed.data.phone ?? null,
            accountType: "STAFF",
            status,
          },
        });

        const profile = await transaction.staffProfile.create({
          data: {
            userId: user.id,
            employeeCode: parsed.data.employeeCode,
            engagementType: parsed.data.engagementType,
            emergencyPhone: parsed.data.emergencyPhone ?? null,
            status,
          },
        });

        if (serviceIds.length > 0) {
          await transaction.staffService.createMany({
            data: serviceIds.map((serviceId) => ({
              staffProfileId: profile.id,
              serviceId,
            })),
          });
        }

        const savedProfile = await transaction.staffProfile.findUniqueOrThrow({
          where: { id: profile.id },
          include: {
            user: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "staff.create",
            resourceType: "StaffProfile",
            resourceId: profile.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            after: toJsonObject({
              employeeCode: profile.employeeCode,
              engagementType: profile.engagementType,
              status: profile.status,
              userId: user.id,
              serviceIds,
            }),
          },
        });

        return serializeStaffRow(savedProfile);
      });

      res.status(201).json(successEnvelope({ staff }, getRequestId(res)));
    }),
  );

  router.patch(
    "/staff/:staffId",
    requirePermission("staff", "update"),
    asyncHandler(async (req, res) => {
      const staffId = getRouteParam(req.params.staffId);

      if (!staffId) {
        sendError(res, 404, "NOT_FOUND", "Staff member was not found.");
        return;
      }

      const parsed = adminUpdateStaffRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted staff fields.",
          parsed.error.issues,
        );
        return;
      }

      const existingStaff = await prisma.staffProfile.findUnique({
        where: { id: staffId },
        include: {
          user: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!existingStaff) {
        sendError(res, 404, "NOT_FOUND", "Staff member was not found.");
        return;
      }

      const userIdentifierFilters: Prisma.UserWhereInput[] = [];

      if (parsed.data.email) {
        userIdentifierFilters.push({ email: parsed.data.email });
      }

      if (parsed.data.phone) {
        userIdentifierFilters.push({ phone: parsed.data.phone });
      }

      const [duplicateUser, duplicateStaff] = await Promise.all([
        userIdentifierFilters.length > 0
          ? prisma.user.findFirst({
              where: {
                id: { not: existingStaff.userId },
                OR: userIdentifierFilters,
              },
            })
          : null,
        prisma.staffProfile.findFirst({
          where: {
            id: { not: existingStaff.id },
            employeeCode: parsed.data.employeeCode,
          },
        }),
      ]);

      if (duplicateUser) {
        sendValidationError(res, "A user with this email or phone exists.");
        return;
      }

      if (duplicateStaff) {
        sendValidationError(
          res,
          "A staff member with this employee code exists.",
        );
        return;
      }

      if (!(await activeServiceIdsExist(parsed.data.serviceIds))) {
        sendValidationError(res, "Choose only active services for this staff.");
        return;
      }

      const actor = getActor(res);
      const status = parsed.data.status ?? existingStaff.status;
      const serviceIds = [...new Set(parsed.data.serviceIds)];
      const updatedStaff = await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: existingStaff.userId },
          data: {
            name: parsed.data.name,
            email: parsed.data.email ?? null,
            phone: parsed.data.phone ?? null,
            status,
          },
        });

        const profile = await transaction.staffProfile.update({
          where: { id: existingStaff.id },
          data: {
            employeeCode: parsed.data.employeeCode,
            engagementType: parsed.data.engagementType,
            emergencyPhone: parsed.data.emergencyPhone ?? null,
            status,
          },
        });

        await transaction.staffService.deleteMany({
          where: { staffProfileId: existingStaff.id },
        });

        if (serviceIds.length > 0) {
          await transaction.staffService.createMany({
            data: serviceIds.map((serviceId) => ({
              staffProfileId: existingStaff.id,
              serviceId,
            })),
          });
        }

        const savedProfile = await transaction.staffProfile.findUniqueOrThrow({
          where: { id: profile.id },
          include: {
            user: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "staff.update",
            resourceType: "StaffProfile",
            resourceId: profile.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            before: toJsonObject(staffAuditSummary(existingStaff)),
            after: toJsonObject(staffAuditSummary(savedProfile)),
          },
        });

        return savedProfile;
      });

      res.json(
        successEnvelope(
          { staff: serializeStaffRow(updatedStaff) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.delete(
    "/staff/:staffId",
    requirePermission("staff", "delete"),
    asyncHandler(async (req, res) => {
      const staffId = getRouteParam(req.params.staffId);

      if (!staffId) {
        sendError(res, 404, "NOT_FOUND", "Staff member was not found.");
        return;
      }

      const existingStaff = await prisma.staffProfile.findUnique({
        where: { id: staffId },
        include: {
          user: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!existingStaff) {
        sendError(res, 404, "NOT_FOUND", "Staff member was not found.");
        return;
      }

      const actor = getActor(res);
      const disabledStaff = await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: existingStaff.userId },
          data: { status: "DISABLED" },
        });

        const profile = await transaction.staffProfile.update({
          where: { id: existingStaff.id },
          data: { status: "DISABLED" },
          include: {
            user: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        });

        await transaction.authSession.updateMany({
          where: {
            userId: existingStaff.userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "staff.delete_soft",
            resourceType: "StaffProfile",
            resourceId: profile.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            before: toJsonObject(staffAuditSummary(existingStaff)),
            after: toJsonObject(staffAuditSummary(profile)),
          },
        });

        return profile;
      });

      res.json(
        successEnvelope(
          { staff: serializeStaffRow(disabledStaff) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/roles",
    requirePermission("roles", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminRoleListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted role list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getRoleWhere(search, status);
      const [totalCount, roles] = await Promise.all([
        prisma.role.count({ where }),
        prisma.role.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getRoleOrderBy(sort),
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        }),
      ]);

      res.json(
        successEnvelope(
          {
            roles: roles.map(serializeRoleRow),
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
    "/roles/export",
    requirePermission("roles", "export"),
    asyncHandler(async (req, res) => {
      const parsed = adminRoleListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted role export filters.",
          parsed.error.issues,
        );
        return;
      }

      const { search, status, sort } = parsed.data;
      const where = getRoleWhere(search, status);
      const roles = await prisma.role.findMany({
        where,
        take: 5_000,
        orderBy: getRoleOrderBy(sort),
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      await recordAuditLog(req, res, "role.export", "Role", "export", {
        rowCount: roles.length,
        searchApplied: Boolean(search),
        status: status ?? "ALL",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="replica-roles-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(roleRowsToCsv(roles));
    }),
  );

  router.get(
    "/roles/:roleId",
    requirePermission("roles", "view"),
    asyncHandler(async (req, res) => {
      const roleId = getRouteParam(req.params.roleId);

      if (!roleId) {
        sendError(res, 404, "NOT_FOUND", "Role was not found.");
        return;
      }

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        sendError(res, 404, "NOT_FOUND", "Role was not found.");
        return;
      }

      res.json(
        successEnvelope({ role: serializeRoleRow(role) }, getRequestId(res)),
      );
    }),
  );

  router.post(
    "/roles",
    requirePermission("roles", "manage_permissions"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreateRoleRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted role fields.",
          parsed.error.issues,
        );
        return;
      }

      const name = normalizeRoleName(parsed.data.name);

      if (!name) {
        sendValidationError(res, "Role name must include letters or numbers.");
        return;
      }

      const existingRole = await prisma.role.findUnique({
        where: { name },
      });

      if (existingRole) {
        sendValidationError(res, "A role with this name already exists.");
        return;
      }

      const selectedPermissionIds = await getSelectedPermissionIds(
        parsed.data.permissionKeys,
      );

      if (!selectedPermissionIds) {
        sendValidationError(
          res,
          "One or more selected permissions do not exist.",
        );
        return;
      }

      const actor = getActor(res);
      const role = await prisma.$transaction(async (transaction) => {
        const createdRole = await transaction.role.create({
          data: {
            name,
            description: parsed.data.description ?? null,
            isSystem: false,
          },
        });

        await transaction.rolePermission.createMany({
          data: selectedPermissionIds.map((permissionId) => ({
            roleId: createdRole.id,
            permissionId,
          })),
        });

        const roleWithPermissions = await transaction.role.findUniqueOrThrow({
          where: { id: createdRole.id },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "role.create",
            resourceType: "Role",
            resourceId: createdRole.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            after: toJsonObject(roleAuditSummary(roleWithPermissions)),
          },
        });

        return roleWithPermissions;
      });

      res
        .status(201)
        .json(
          successEnvelope({ role: serializeRoleRow(role) }, getRequestId(res)),
        );
    }),
  );

  router.patch(
    "/roles/:roleId",
    requirePermission("roles", "manage_permissions"),
    asyncHandler(async (req, res) => {
      const roleId = getRouteParam(req.params.roleId);

      if (!roleId) {
        sendError(res, 404, "NOT_FOUND", "Role was not found.");
        return;
      }

      const parsed = adminUpdateRoleRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted role fields.",
          parsed.error.issues,
        );
        return;
      }

      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!existingRole) {
        sendError(res, 404, "NOT_FOUND", "Role was not found.");
        return;
      }

      if (existingRole.isSystem) {
        sendValidationError(res, "System roles cannot be edited.");
        return;
      }

      if (existingRole.archivedAt) {
        sendValidationError(res, "Archived roles cannot be edited.");
        return;
      }

      const name = normalizeRoleName(parsed.data.name);

      if (!name) {
        sendValidationError(res, "Role name must include letters or numbers.");
        return;
      }

      const duplicateRole = await prisma.role.findFirst({
        where: {
          id: { not: existingRole.id },
          name,
        },
      });

      if (duplicateRole) {
        sendValidationError(res, "A role with this name already exists.");
        return;
      }

      const selectedPermissionIds = await getSelectedPermissionIds(
        parsed.data.permissionKeys,
      );

      if (!selectedPermissionIds) {
        sendValidationError(
          res,
          "One or more selected permissions do not exist.",
        );
        return;
      }

      const actor = getActor(res);
      const role = await prisma.$transaction(async (transaction) => {
        await transaction.role.update({
          where: { id: existingRole.id },
          data: {
            name,
            description: parsed.data.description ?? null,
          },
        });

        await transaction.rolePermission.deleteMany({
          where: { roleId: existingRole.id },
        });

        await transaction.rolePermission.createMany({
          data: selectedPermissionIds.map((permissionId) => ({
            roleId: existingRole.id,
            permissionId,
          })),
        });

        const assignedUserIds = await transaction.userRole.findMany({
          where: { roleId: existingRole.id },
          select: { userId: true },
        });

        if (assignedUserIds.length > 0) {
          await transaction.authSession.updateMany({
            where: {
              userId: {
                in: assignedUserIds.map((userRole) => userRole.userId),
              },
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        const roleWithPermissions = await transaction.role.findUniqueOrThrow({
          where: { id: existingRole.id },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "role.update",
            resourceType: "Role",
            resourceId: existingRole.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            before: toJsonObject(roleAuditSummary(existingRole)),
            after: toJsonObject(roleAuditSummary(roleWithPermissions)),
          },
        });

        return roleWithPermissions;
      });

      res.json(
        successEnvelope({ role: serializeRoleRow(role) }, getRequestId(res)),
      );
    }),
  );

  router.delete(
    "/roles/:roleId",
    requirePermission("roles", "delete"),
    asyncHandler(async (req, res) => {
      const roleId = getRouteParam(req.params.roleId);

      if (!roleId) {
        sendError(res, 404, "NOT_FOUND", "Role was not found.");
        return;
      }

      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!existingRole) {
        sendError(res, 404, "NOT_FOUND", "Role was not found.");
        return;
      }

      if (existingRole.isSystem) {
        sendValidationError(res, "System roles cannot be deactivated.");
        return;
      }

      const actor = getActor(res);
      const archivedRole = await prisma.$transaction(async (transaction) => {
        const assignedUserIds = await transaction.userRole.findMany({
          where: { roleId: existingRole.id },
          select: { userId: true },
        });

        const role = await transaction.role.update({
          where: { id: existingRole.id },
          data: {
            archivedAt: existingRole.archivedAt ?? new Date(),
          },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (assignedUserIds.length > 0) {
          await transaction.authSession.updateMany({
            where: {
              userId: {
                in: assignedUserIds.map((userRole) => userRole.userId),
              },
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: "role.delete_soft",
            resourceType: "Role",
            resourceId: existingRole.id,
            requestId: getRequestId(res),
            ipHash: hashContextValue(getClientIp(req)),
            userAgent: getUserAgent(req),
            before: toJsonObject(roleAuditSummary(existingRole)),
            after: toJsonObject(roleAuditSummary(role)),
          },
        });

        return role;
      });

      res.json(
        successEnvelope(
          { role: serializeRoleRow(archivedRole) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/categories",
    requirePermission("categories", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminCategoryListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted category list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getCategoryWhere(search, status);
      const [totalCount, categories] = await Promise.all([
        prisma.category.count({ where }),
        prisma.category.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getCategoryOrderBy(sort),
          include: { parent: true, imageAsset: true },
        }),
      ]);

      res.json(
        successEnvelope(
          {
            categories: categories.map(serializeCategoryRow),
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
    "/categories/export",
    requirePermission("categories", "export"),
    asyncHandler(async (req, res) => {
      const parsed = adminCategoryListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted category export filters.",
          parsed.error.issues,
        );
        return;
      }

      const { search, status, sort } = parsed.data;
      const where = getCategoryWhere(search, status);
      const categories = await prisma.category.findMany({
        where,
        take: 5_000,
        orderBy: getCategoryOrderBy(sort),
        include: { parent: true, imageAsset: true },
      });

      await recordAuditLog(req, res, "category.export", "Category", "export", {
        rowCount: categories.length,
        searchApplied: Boolean(search),
        status: status ?? "ALL",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="replica-categories-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(categoryRowsToCsv(categories));
    }),
  );

  router.get(
    "/categories/:categoryId",
    requirePermission("categories", "view"),
    asyncHandler(async (req, res) => {
      const categoryId = getRouteParam(req.params.categoryId);

      if (!categoryId) {
        sendError(res, 404, "NOT_FOUND", "Category was not found.");
        return;
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { parent: true, imageAsset: true },
      });

      if (!category) {
        sendError(res, 404, "NOT_FOUND", "Category was not found.");
        return;
      }

      res.json(
        successEnvelope(
          { category: serializeCategoryRow(category) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/categories",
    requirePermission("categories", "create"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreateCategoryRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted category fields.",
          parsed.error.issues,
        );
        return;
      }

      const parent = parsed.data.parentId
        ? await prisma.category.findUnique({
            where: {
              id: parsed.data.parentId,
            },
          })
        : null;

      if (parsed.data.parentId && !parent) {
        sendValidationError(res, "Parent category was not found.");
        return;
      }

      if (parent?.parentId) {
        sendValidationError(res, "Only one subcategory level is allowed.");
        return;
      }

      if (parent?.archivedAt || parent?.status === "ARCHIVED") {
        sendValidationError(
          res,
          "Subcategories cannot be added under archived categories.",
        );
        return;
      }

      if (
        parsed.data.imageAssetId &&
        !(await mediaAssetsExist([parsed.data.imageAssetId]))
      ) {
        sendValidationError(res, "Selected category image was not found.");
        return;
      }

      const slug = toSlug(parsed.data.name);
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          parentId: parent?.id ?? null,
          slug,
        },
      });

      if (duplicateCategory) {
        sendValidationError(
          res,
          "A category with this name already exists at this level.",
        );
        return;
      }

      const status = parsed.data.status ?? "DRAFT";
      const now = new Date();
      const category = await prisma.category.create({
        data: {
          name: parsed.data.name,
          slug,
          parentId: parent?.id ?? null,
          description: parsed.data.description ?? null,
          imageAssetId: parsed.data.imageAssetId ?? null,
          status,
          archivedAt: status === "ARCHIVED" ? now : null,
        },
        include: { parent: true, imageAsset: true },
      });

      await recordAuditLog(
        req,
        res,
        "category.create",
        "Category",
        category.id,
        categoryAuditSummary(category),
      );

      res
        .status(201)
        .json(
          successEnvelope(
            { category: serializeCategoryRow(category) },
            getRequestId(res),
          ),
        );
    }),
  );

  router.patch(
    "/categories/:categoryId",
    requirePermission("categories", "update"),
    asyncHandler(async (req, res) => {
      const categoryId = getRouteParam(req.params.categoryId);

      if (!categoryId) {
        sendError(res, 404, "NOT_FOUND", "Category was not found.");
        return;
      }

      const parsed = adminUpdateCategoryRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted category fields.",
          parsed.error.issues,
        );
        return;
      }

      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { parent: true, imageAsset: true },
      });

      if (!existingCategory) {
        sendError(res, 404, "NOT_FOUND", "Category was not found.");
        return;
      }

      const parent = parsed.data.parentId
        ? await prisma.category.findUnique({
            where: {
              id: parsed.data.parentId,
            },
          })
        : null;

      if (parsed.data.parentId && !parent) {
        sendValidationError(res, "Parent category was not found.");
        return;
      }

      if (parent?.id === existingCategory.id) {
        sendValidationError(res, "A category cannot be its own parent.");
        return;
      }

      if (parent?.parentId) {
        sendValidationError(res, "Only one subcategory level is allowed.");
        return;
      }

      if (parent?.archivedAt || parent?.status === "ARCHIVED") {
        sendValidationError(
          res,
          "Subcategories cannot be added under archived categories.",
        );
        return;
      }

      const movingUnderParent = Boolean(parent);

      if (movingUnderParent) {
        const childCount = await prisma.category.count({
          where: {
            parentId: existingCategory.id,
            archivedAt: null,
            status: { not: "ARCHIVED" },
          },
        });

        if (childCount > 0) {
          sendValidationError(
            res,
            "A category with active subcategories cannot become a subcategory.",
          );
          return;
        }
      }

      const slug = toSlug(parsed.data.name);
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          id: { not: existingCategory.id },
          parentId: parent?.id ?? null,
          slug,
        },
      });

      if (duplicateCategory) {
        sendValidationError(
          res,
          "A category with this name already exists at this level.",
        );
        return;
      }

      if (
        parsed.data.imageAssetId &&
        !(await mediaAssetsExist([parsed.data.imageAssetId]))
      ) {
        sendValidationError(res, "Selected category image was not found.");
        return;
      }

      const status = parsed.data.status ?? existingCategory.status;
      const archiving = status === "ARCHIVED";

      if (
        archiving &&
        !existingCategory.archivedAt &&
        (await hasActiveCategoryDependencies(existingCategory.id))
      ) {
        sendValidationError(
          res,
          "Archive active subcategories and services before deleting this category.",
        );
        return;
      }

      const category = await prisma.category.update({
        where: { id: existingCategory.id },
        data: {
          name: parsed.data.name,
          slug,
          parentId: parent?.id ?? null,
          description: parsed.data.description ?? null,
          imageAssetId: parsed.data.imageAssetId ?? null,
          status,
          archivedAt: archiving
            ? (existingCategory.archivedAt ?? new Date())
            : null,
        },
        include: { parent: true, imageAsset: true },
      });

      await recordAuditLog(
        req,
        res,
        "category.update",
        "Category",
        category.id,
        categoryAuditSummary(category),
        categoryAuditSummary(existingCategory),
      );

      res.json(
        successEnvelope(
          { category: serializeCategoryRow(category) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.delete(
    "/categories/:categoryId",
    requirePermission("categories", "delete"),
    asyncHandler(async (req, res) => {
      const categoryId = getRouteParam(req.params.categoryId);

      if (!categoryId) {
        sendError(res, 404, "NOT_FOUND", "Category was not found.");
        return;
      }

      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { parent: true, imageAsset: true },
      });

      if (!existingCategory) {
        sendError(res, 404, "NOT_FOUND", "Category was not found.");
        return;
      }

      if (await hasActiveCategoryDependencies(existingCategory.id)) {
        sendValidationError(
          res,
          "Archive active subcategories and services before deleting this category.",
        );
        return;
      }

      const category = await prisma.category.update({
        where: { id: existingCategory.id },
        data: {
          status: "ARCHIVED",
          archivedAt: existingCategory.archivedAt ?? new Date(),
        },
        include: { parent: true, imageAsset: true },
      });

      await recordAuditLog(
        req,
        res,
        "category.delete_soft",
        "Category",
        category.id,
        categoryAuditSummary(category),
        categoryAuditSummary(existingCategory),
      );

      res.json(
        successEnvelope(
          { category: serializeCategoryRow(category) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/packages",
    requirePermission("services", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminPackageListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted package list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort, categoryId } = parsed.data;
      const where = getPackageWhere(search, status, categoryId);
      const [totalCount, packages] = await Promise.all([
        prisma.servicePackage.count({ where }),
        prisma.servicePackage.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getPackageOrderBy(sort),
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

      res.json(
        successEnvelope(
          {
            packages: packages.map(serializePackageRow),
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
    "/packages/:packageId",
    requirePermission("services", "view"),
    asyncHandler(async (req, res) => {
      const packageId = getRouteParam(req.params.packageId);

      if (!packageId) {
        sendError(res, 404, "NOT_FOUND", "Package was not found.");
        return;
      }

      const servicePackage = await prisma.servicePackage.findUnique({
        where: { id: packageId },
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
      });

      if (!servicePackage) {
        sendError(res, 404, "NOT_FOUND", "Package was not found.");
        return;
      }

      res.json(
        successEnvelope(
          { package: serializePackageRow(servicePackage) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/packages",
    requirePermission("services", "create"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreatePackageRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted package fields.",
          parsed.error.issues,
        );
        return;
      }

      const relationError = await validatePackageRelations(parsed.data);

      if (relationError) {
        sendValidationError(res, relationError);
        return;
      }

      const slug = toSlug(parsed.data.name);
      const duplicatePackage = await prisma.servicePackage.findUnique({
        where: { slug },
      });

      if (duplicatePackage) {
        sendValidationError(res, "A package with this name already exists.");
        return;
      }

      const status = parsed.data.status ?? "DRAFT";
      const now = new Date();
      const servicePackage = await prisma.$transaction(async (transaction) => {
        const createdPackage = await transaction.servicePackage.create({
          data: {
            categoryId: parsed.data.categoryId,
            name: parsed.data.name,
            slug,
            description: parsed.data.description ?? null,
            minPricePaise: parsed.data.minPricePaise,
            compareAtPricePaise: parsed.data.compareAtPricePaise ?? null,
            discountBps: parsed.data.discountBps,
            durationMinutes: parsed.data.durationMinutes,
            inclusions: parsed.data.inclusions,
            status,
            sortOrder: parsed.data.sortOrder,
            publishedAt: status === "PUBLISHED" ? now : null,
            archivedAt: status === "ARCHIVED" ? now : null,
          },
        });

        await transaction.servicePackageItem.createMany({
          data: parsed.data.items.map((item, index) => ({
            packageId: createdPackage.id,
            serviceId: item.serviceId,
            serviceTierId: item.serviceTierId ?? null,
            label: item.label ?? null,
            quantity: item.quantity,
            minQuantity: item.minQuantity,
            sortOrder: item.sortOrder ?? index,
          })),
        });

        return transaction.servicePackage.findUniqueOrThrow({
          where: { id: createdPackage.id },
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
        });
      });

      await recordAuditLog(
        req,
        res,
        "package.create",
        "ServicePackage",
        servicePackage.id,
        packageAuditSummary(servicePackage),
      );

      res
        .status(201)
        .json(
          successEnvelope(
            { package: serializePackageRow(servicePackage) },
            getRequestId(res),
          ),
        );
    }),
  );

  router.patch(
    "/packages/:packageId",
    requirePermission("services", "update"),
    asyncHandler(async (req, res) => {
      const packageId = getRouteParam(req.params.packageId);

      if (!packageId) {
        sendError(res, 404, "NOT_FOUND", "Package was not found.");
        return;
      }

      const parsed = adminUpdatePackageRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted package fields.",
          parsed.error.issues,
        );
        return;
      }

      const [existingPackage, relationError] = await Promise.all([
        prisma.servicePackage.findUnique({
          where: { id: packageId },
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
        validatePackageRelations(parsed.data),
      ]);

      if (!existingPackage) {
        sendError(res, 404, "NOT_FOUND", "Package was not found.");
        return;
      }

      if (relationError) {
        sendValidationError(res, relationError);
        return;
      }

      const slug = toSlug(parsed.data.name);
      const duplicatePackage = await prisma.servicePackage.findFirst({
        where: {
          id: { not: existingPackage.id },
          slug,
        },
      });

      if (duplicatePackage) {
        sendValidationError(res, "A package with this name already exists.");
        return;
      }

      const status = parsed.data.status ?? existingPackage.status;
      const now = new Date();
      const servicePackage = await prisma.$transaction(async (transaction) => {
        await transaction.servicePackage.update({
          where: { id: existingPackage.id },
          data: {
            categoryId: parsed.data.categoryId,
            name: parsed.data.name,
            slug,
            description: parsed.data.description ?? null,
            minPricePaise: parsed.data.minPricePaise,
            compareAtPricePaise: parsed.data.compareAtPricePaise ?? null,
            discountBps: parsed.data.discountBps,
            durationMinutes: parsed.data.durationMinutes,
            inclusions: parsed.data.inclusions,
            status,
            sortOrder: parsed.data.sortOrder,
            publishedAt:
              status === "PUBLISHED"
                ? (existingPackage.publishedAt ?? now)
                : null,
            archivedAt:
              status === "ARCHIVED"
                ? (existingPackage.archivedAt ?? now)
                : null,
          },
        });

        await transaction.servicePackageItem.deleteMany({
          where: { packageId: existingPackage.id },
        });

        await transaction.servicePackageItem.createMany({
          data: parsed.data.items.map((item, index) => ({
            packageId: existingPackage.id,
            serviceId: item.serviceId,
            serviceTierId: item.serviceTierId ?? null,
            label: item.label ?? null,
            quantity: item.quantity,
            minQuantity: item.minQuantity,
            sortOrder: item.sortOrder ?? index,
          })),
        });

        return transaction.servicePackage.findUniqueOrThrow({
          where: { id: existingPackage.id },
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
        });
      });

      await recordAuditLog(
        req,
        res,
        "package.update",
        "ServicePackage",
        servicePackage.id,
        packageAuditSummary(servicePackage),
        packageAuditSummary(existingPackage),
      );

      res.json(
        successEnvelope(
          { package: serializePackageRow(servicePackage) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.delete(
    "/packages/:packageId",
    requirePermission("services", "delete"),
    asyncHandler(async (req, res) => {
      const packageId = getRouteParam(req.params.packageId);

      if (!packageId) {
        sendError(res, 404, "NOT_FOUND", "Package was not found.");
        return;
      }

      const existingPackage = await prisma.servicePackage.findUnique({
        where: { id: packageId },
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
      });

      if (!existingPackage) {
        sendError(res, 404, "NOT_FOUND", "Package was not found.");
        return;
      }

      const servicePackage = await prisma.servicePackage.update({
        where: { id: existingPackage.id },
        data: {
          status: "ARCHIVED",
          archivedAt: existingPackage.archivedAt ?? new Date(),
        },
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
      });

      await recordAuditLog(
        req,
        res,
        "package.delete_soft",
        "ServicePackage",
        servicePackage.id,
        packageAuditSummary(servicePackage),
        packageAuditSummary(existingPackage),
      );

      res.json(
        successEnvelope(
          { package: serializePackageRow(servicePackage) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.get(
    "/services",
    requirePermission("services", "view"),
    asyncHandler(async (req, res) => {
      const parsed = adminServiceListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted service list filters.",
          parsed.error.issues,
        );
        return;
      }

      const { page, pageSize, search, status, sort } = parsed.data;
      const where = getServiceWhere(search, status);
      const [totalCount, services] = await Promise.all([
        prisma.service.count({ where }),
        prisma.service.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: getServiceOrderBy(sort),
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
      ]);

      res.json(
        successEnvelope(
          {
            services: services.map(serializeServiceRow),
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
    "/services/export",
    requirePermission("services", "export"),
    asyncHandler(async (req, res) => {
      const parsed = adminServiceListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted service export filters.",
          parsed.error.issues,
        );
        return;
      }

      const { search, status, sort } = parsed.data;
      const where = getServiceWhere(search, status);
      const services = await prisma.service.findMany({
        where,
        take: 5_000,
        orderBy: getServiceOrderBy(sort),
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

      await recordAuditLog(req, res, "service.export", "Service", "export", {
        rowCount: services.length,
        searchApplied: Boolean(search),
        status: status ?? "ALL",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="replica-services-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(serviceRowsToCsv(services));
    }),
  );

  router.get(
    "/services/:serviceId",
    requirePermission("services", "view"),
    asyncHandler(async (req, res) => {
      const serviceId = getRouteParam(req.params.serviceId);

      if (!serviceId) {
        sendError(res, 404, "NOT_FOUND", "Service was not found.");
        return;
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
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
        sendError(res, 404, "NOT_FOUND", "Service was not found.");
        return;
      }

      res.json(
        successEnvelope(
          { service: serializeServiceRow(service) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.post(
    "/services",
    requirePermission("services", "create"),
    asyncHandler(async (req, res) => {
      const parsed = adminCreateServiceRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted service fields.",
          parsed.error.issues,
        );
        return;
      }

      if (
        parsed.data.compareAtPricePaise !== undefined &&
        parsed.data.compareAtPricePaise < parsed.data.pricePaise
      ) {
        sendValidationError(
          res,
          "MRP / compare-at price cannot be lower than the selling price.",
        );
        return;
      }

      const category = await prisma.category.findUnique({
        where: {
          id: parsed.data.categoryId,
        },
      });

      if (!category || category.archivedAt || category.status === "ARCHIVED") {
        sendValidationError(res, "Choose an active category for this service.");
        return;
      }

      const slug = toSlug(parsed.data.name);
      const duplicateService = await prisma.service.findUnique({
        where: {
          slug,
        },
      });

      if (duplicateService) {
        sendValidationError(res, "A service with this name already exists.");
        return;
      }

      const orderedImageAssetIds = getOrderedServiceImageIds(
        parsed.data.mainImageAssetId,
        parsed.data.imageAssetIds,
      );

      if (!(await mediaAssetsExist(orderedImageAssetIds))) {
        sendValidationError(
          res,
          "One or more selected service images were not found.",
        );
        return;
      }

      const status = parsed.data.status ?? "DRAFT";
      const dealData = serviceDealWriteData(parsed.data);
      const now = new Date();
      const service = await prisma.$transaction(async (transaction) => {
        const createdService = await transaction.service.create({
          data: {
            categoryId: category.id,
            name: parsed.data.name,
            slug,
            shortDescription: parsed.data.shortDescription ?? null,
            fullDescription: sanitizeRichHtml(parsed.data.fullDescription),
            durationMinutes: parsed.data.durationMinutes,
            pricePaise: parsed.data.pricePaise,
            compareAtPricePaise: parsed.data.compareAtPricePaise ?? null,
            gstRateBps: parsed.data.gstRateBps ?? null,
            ...dealData,
            featured: parsed.data.featured ?? false,
            sortOrder: parsed.data.sortOrder ?? 0,
            status,
            publishedAt: status === "PUBLISHED" ? now : null,
            archivedAt: status === "ARCHIVED" ? now : null,
          },
        });

        if (orderedImageAssetIds.length > 0) {
          await transaction.serviceImage.createMany({
            data: orderedImageAssetIds.map((mediaAssetId, sortOrder) => ({
              serviceId: createdService.id,
              mediaAssetId,
              altText: parsed.data.name,
              sortOrder,
            })),
          });
        }

        await transaction.serviceTier.createMany({
          data: serviceTierRowsForWrite(createdService.id, parsed.data.tiers, {
            durationMinutes: parsed.data.durationMinutes,
            pricePaise: parsed.data.pricePaise,
            compareAtPricePaise: parsed.data.compareAtPricePaise ?? null,
          }),
        });

        return transaction.service.findUniqueOrThrow({
          where: { id: createdService.id },
          include: {
            category: true,
            tiers: {
              orderBy: { sortOrder: "asc" },
            },
            images: {
              include: {
                mediaAsset: true,
              },
            },
          },
        });
      });

      await recordAuditLog(req, res, "service.create", "Service", service.id, {
        ...serviceAuditSummary(service),
      });

      res
        .status(201)
        .json(
          successEnvelope(
            { service: serializeServiceRow(service) },
            getRequestId(res),
          ),
        );
    }),
  );

  router.patch(
    "/services/:serviceId",
    requirePermission("services", "update"),
    asyncHandler(async (req, res) => {
      const serviceId = getRouteParam(req.params.serviceId);

      if (!serviceId) {
        sendError(res, 404, "NOT_FOUND", "Service was not found.");
        return;
      }

      const parsed = adminUpdateServiceRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(
          res,
          "Check the submitted service fields.",
          parsed.error.issues,
        );
        return;
      }

      if (
        parsed.data.compareAtPricePaise !== undefined &&
        parsed.data.compareAtPricePaise < parsed.data.pricePaise
      ) {
        sendValidationError(
          res,
          "MRP / compare-at price cannot be lower than the selling price.",
        );
        return;
      }

      const [existingService, category] = await Promise.all([
        prisma.service.findUnique({
          where: { id: serviceId },
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
        prisma.category.findUnique({
          where: { id: parsed.data.categoryId },
        }),
      ]);

      if (!existingService) {
        sendError(res, 404, "NOT_FOUND", "Service was not found.");
        return;
      }

      const status = parsed.data.status ?? existingService.status;

      if (!category) {
        sendValidationError(
          res,
          "Choose an existing category for this service.",
        );
        return;
      }

      if (
        status !== "ARCHIVED" &&
        (category.archivedAt || category.status === "ARCHIVED")
      ) {
        sendValidationError(res, "Choose an active category for this service.");
        return;
      }

      const slug = toSlug(parsed.data.name);
      const duplicateService = await prisma.service.findFirst({
        where: {
          id: { not: existingService.id },
          slug,
        },
      });

      if (duplicateService) {
        sendValidationError(res, "A service with this name already exists.");
        return;
      }

      const orderedImageAssetIds = getOrderedServiceImageIds(
        parsed.data.mainImageAssetId,
        parsed.data.imageAssetIds,
      );

      if (!(await mediaAssetsExist(orderedImageAssetIds))) {
        sendValidationError(
          res,
          "One or more selected service images were not found.",
        );
        return;
      }

      const now = new Date();
      const dealData = serviceDealWriteData(parsed.data);
      const service = await prisma.$transaction(async (transaction) => {
        await transaction.service.update({
          where: { id: existingService.id },
          data: {
            categoryId: parsed.data.categoryId,
            name: parsed.data.name,
            slug,
            shortDescription: parsed.data.shortDescription ?? null,
            fullDescription: sanitizeRichHtml(parsed.data.fullDescription),
            durationMinutes: parsed.data.durationMinutes,
            pricePaise: parsed.data.pricePaise,
            compareAtPricePaise: parsed.data.compareAtPricePaise ?? null,
            gstRateBps: parsed.data.gstRateBps ?? null,
            ...dealData,
            featured: parsed.data.featured ?? existingService.featured,
            sortOrder: parsed.data.sortOrder ?? existingService.sortOrder,
            status,
            publishedAt:
              status === "PUBLISHED"
                ? (existingService.publishedAt ?? now)
                : null,
            archivedAt:
              status === "ARCHIVED"
                ? (existingService.archivedAt ?? now)
                : null,
          },
        });

        await transaction.serviceImage.deleteMany({
          where: { serviceId: existingService.id },
        });

        if (orderedImageAssetIds.length > 0) {
          await transaction.serviceImage.createMany({
            data: orderedImageAssetIds.map((mediaAssetId, sortOrder) => ({
              serviceId: existingService.id,
              mediaAssetId,
              altText: parsed.data.name,
              sortOrder,
            })),
          });
        }

        await transaction.serviceTier.deleteMany({
          where: { serviceId: existingService.id },
        });

        await transaction.serviceTier.createMany({
          data: serviceTierRowsForWrite(existingService.id, parsed.data.tiers, {
            durationMinutes: parsed.data.durationMinutes,
            pricePaise: parsed.data.pricePaise,
            compareAtPricePaise: parsed.data.compareAtPricePaise ?? null,
          }),
        });

        return transaction.service.findUniqueOrThrow({
          where: { id: existingService.id },
          include: {
            category: true,
            tiers: {
              orderBy: { sortOrder: "asc" },
            },
            images: {
              include: {
                mediaAsset: true,
              },
            },
          },
        });
      });

      await recordAuditLog(
        req,
        res,
        "service.update",
        "Service",
        service.id,
        serviceAuditSummary(service),
        serviceAuditSummary(existingService),
      );

      res.json(
        successEnvelope(
          { service: serializeServiceRow(service) },
          getRequestId(res),
        ),
      );
    }),
  );

  router.delete(
    "/services/:serviceId",
    requirePermission("services", "delete"),
    asyncHandler(async (req, res) => {
      const serviceId = getRouteParam(req.params.serviceId);

      if (!serviceId) {
        sendError(res, 404, "NOT_FOUND", "Service was not found.");
        return;
      }

      const existingService = await prisma.service.findUnique({
        where: { id: serviceId },
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

      if (!existingService) {
        sendError(res, 404, "NOT_FOUND", "Service was not found.");
        return;
      }

      const service = await prisma.service.update({
        where: { id: existingService.id },
        data: {
          status: "ARCHIVED",
          archivedAt: existingService.archivedAt ?? new Date(),
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

      await recordAuditLog(
        req,
        res,
        "service.delete_soft",
        "Service",
        service.id,
        serviceAuditSummary(service),
        serviceAuditSummary(existingService),
      );

      res.json(
        successEnvelope(
          { service: serializeServiceRow(service) },
          getRequestId(res),
        ),
      );
    }),
  );

  return router;
}
