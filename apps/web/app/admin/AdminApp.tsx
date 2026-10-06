"use client";

import type {
  AdminBookingSort,
  AdminModuleKey,
  AdminPaymentSort,
} from "@replica/contracts";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Bold,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  Download,
  Edit3,
  FolderTree,
  Home,
  ImagePlus,
  Italic,
  LayoutDashboard,
  List,
  LogIn,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Scissors,
  ShoppingBag,
  Tags,
  Trash2,
  UserRound,
  UserPlus,
  Users,
  UserX,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import BrandLogo from "../BrandLogo";
import { BRAND_NAME } from "../brand";
import AdminDataTable, { type AdminDataTableColumn } from "./AdminDataTable";
import type { AdminCommand } from "./adminCommands";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

const ADMIN_MODULES: Array<{ key: AdminModuleKey; label: string }> = [
  { key: "bookings", label: "Bookings" },
  { key: "customers", label: "Customers" },
  { key: "staff", label: "Staff" },
  { key: "catalogue", label: "Catalogue" },
  { key: "payments", label: "Payments" },
  { key: "reviews", label: "Reviews" },
  { key: "reports", label: "Reports" },
  { key: "notifications", label: "Notifications" },
];

const MODULE_ICONS: Record<AdminModuleKey, LucideIcon> = {
  bookings: CalendarCheck,
  customers: Users,
  staff: UserRound,
  catalogue: FolderTree,
  payments: CreditCard,
  reviews: Quote,
  reports: BarChart3,
  notifications: Bell,
  roles: ShieldCheck,
};

const CATALOGUE_NAV_ITEMS: Array<{
  key: CatalogueArea;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "categories", label: "Categories", icon: Tags },
  { key: "services", label: "Services", icon: Scissors },
  { key: "packages", label: "Packages", icon: ShoppingBag },
  { key: "homepage", label: "Homepage", icon: Home },
];

const USER_MANAGEMENT_NAV_ITEMS: Array<{
  key: UserManagementArea;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "users", label: "Users", icon: Users },
  { key: "roles", label: "Roles", icon: ShieldCheck },
];

const ADMIN_COMMANDS: AdminCommand[] = [
  { label: "Dashboard", group: "Workspace", path: "/admin" },
  { label: "Bookings", group: "Operations", path: "/admin/bookings" },
  { label: "Customers", group: "Operations", path: "/admin/customers" },
  { label: "Staff", group: "Operations", path: "/admin/staff" },
  {
    label: "Categories",
    group: "Catalogue",
    path: "/admin/catalogue/categories",
  },
  {
    label: "Services",
    group: "Catalogue",
    path: "/admin/catalogue/services",
  },
  {
    label: "Packages",
    group: "Catalogue",
    path: "/admin/catalogue/packages",
  },
  {
    label: "Homepage",
    group: "Catalogue",
    path: "/admin/catalogue/homepage",
  },
  { label: "Payments", group: "Finance", path: "/admin/payments" },
  { label: "Reviews", group: "Content", path: "/admin/reviews" },
  { label: "Reports", group: "Insights", path: "/admin/reports" },
  {
    label: "Notifications",
    group: "System",
    path: "/admin/notifications",
  },
  { label: "Blogs", group: "Content", path: "/admin/blogs" },
  {
    label: "Admin users",
    group: "User management",
    path: "/admin/user-management/users",
    keywords: "access accounts administrators",
  },
  {
    label: "Roles and permissions",
    group: "User management",
    path: "/admin/user-management/roles",
    keywords: "access control rbac",
  },
];

type StaffEngagementType = "SALARIED" | "GIG";
type UserStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type ServiceTierType = "PREMIUM" | "LUXURY";
type ReviewModerationStatus = "PENDING" | "APPROVED" | "HIDDEN" | "REJECTED";
type PublishStatusFilter = PublishStatus | "ALL";
type ReviewStatusFilter = ReviewModerationStatus | "ALL";
type PaymentStatusFilter =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "ALL";
type PaymentProviderFilter =
  "razorpay" | "pay_after_service" | "development_razorpay" | "seed" | "ALL";
type BookingStatusFilter =
  | "DRAFT"
  | "CONFIRMED"
  | "ASSIGNMENT_PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "ALL";
type CatalogueArea = "categories" | "services" | "packages" | "homepage";
type UserManagementArea = "users" | "roles";
type RoleStatusFilter = "ACTIVE" | "ARCHIVED" | "ALL";

const SERVICE_TIER_TYPES: ServiceTierType[] = ["PREMIUM", "LUXURY"];
const PACKAGE_ITEM_FORM_ROWS = 8;

interface AdminUser {
  id: string;
  publicId: string;
  email: string | null;
  name: string;
  accountType: "ADMIN";
  status: "ACTIVE";
  roles: string[];
  permissions: string[];
}

interface AuthPayload {
  user: AdminUser;
  expiresAt?: string;
}

interface MePayload {
  user: AdminUser;
}

interface DashboardCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "success" | "warning";
}

interface ModuleRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updatedAt: string | null;
}

interface DashboardPayload {
  cards: DashboardCard[];
  activeBookings: ModuleRecord[];
  bookingTrend: Array<{
    label: string;
    bookings: number;
    revenuePaise: number;
  }>;
  statusMix: Array<{
    label: string;
    value: number;
  }>;
  recentOrders: ModuleRecord[];
  providerReadiness: Array<{
    key: string;
    label: string;
    status: "configured" | "unconfigured";
  }>;
}

interface ModuleSnapshot {
  key: AdminModuleKey;
  label: string;
  totalCount: number;
  activeCount: number | null;
  records: ModuleRecord[];
  emptyMessage: string;
}

interface PermissionOption {
  key: string;
  resource: string;
  action: string;
  description: string | null;
}

interface PermissionsPayload {
  permissions: PermissionOption[];
}

interface CategoryOption {
  id: string;
  publicId: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  status: PublishStatus;
}

interface CatalogueOptionsPayload {
  categories: CategoryOption[];
}

type StaffPageMode = "list" | "create" | "edit";
type StaffStatusFilter = UserStatus | "ALL";
type RecordPageMode = "list" | "create" | "edit";

interface StaffRouteState {
  mode: StaffPageMode;
  staffId: string | null;
}

interface CatalogueRouteState {
  area: CatalogueArea;
  mode: RecordPageMode;
  recordId: string | null;
}

interface UserManagementRouteState {
  area: UserManagementArea;
  mode: RecordPageMode;
  recordId: string | null;
}

interface StaffRow {
  id: string;
  name: string;
  employeeCode: string;
  email: string | null;
  phone: string | null;
  engagementType: StaffEngagementType;
  emergencyPhone: string | null;
  serviceIds: string[];
  services: Array<{
    id: string;
    name: string;
  }>;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

interface StaffListPayload {
  staff: StaffRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

interface StaffDetailPayload {
  staff: StaffRow;
}

interface PaginationPayload {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface BookingRow {
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

interface BookingListPayload {
  bookings: BookingRow[];
  pagination: PaginationPayload;
}

interface BookingDetailPayload {
  booking: BookingRow;
}

interface PaymentRow {
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

interface PaymentSummaryPayload {
  capturedAmountPaise: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
}

interface PaymentListPayload {
  payments: PaymentRow[];
  pagination: PaginationPayload;
  summary: PaymentSummaryPayload;
}

interface PaymentDetailPayload {
  payment: PaymentRow;
}

interface ReviewRow {
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

interface ReviewListPayload {
  reviews: ReviewRow[];
  pagination: PaginationPayload;
}

interface ReviewDetailPayload {
  review: ReviewRow;
}

interface CategoryRow {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  imageAssetId: string | null;
  imageUrl: string | null;
  status: PublishStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MediaImage {
  id: string;
  publicId?: string;
  url: string;
  altText: string | null;
  contentType?: string;
  sizeBytes?: number;
}

interface ServiceTierRow {
  id: string;
  publicId: string;
  tierType: ServiceTierType;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  pricePaise: number;
  compareAtPricePaise: number | null;
  productsUsed: string[];
  status: PublishStatus;
  sortOrder: number;
}

interface ServiceRow {
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
  mainImage: MediaImage | null;
  galleryImages: MediaImage[];
  tiers: ServiceTierRow[];
  status: PublishStatus;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  status: PublishStatus;
  sortOrder: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CategoryListPayload {
  categories: CategoryRow[];
  pagination: PaginationPayload;
}

interface CategoryDetailPayload {
  category: CategoryRow;
}

interface ServiceListPayload {
  services: ServiceRow[];
  pagination: PaginationPayload;
}

interface ServiceDetailPayload {
  service: ServiceRow;
}

interface ServicePackageListPayload {
  packages: ServicePackageRow[];
  pagination: PaginationPayload;
}

interface ServicePackageDetailPayload {
  package: ServicePackageRow;
}

interface ServiceTierFormPayload {
  tierType: ServiceTierType;
  name: string;
  description?: string | undefined;
  durationMinutes?: number | undefined;
  pricePaise: number;
  compareAtPricePaise?: number | undefined;
  productsUsed: string[];
  status: PublishStatus;
  sortOrder: number;
}

interface ServicePackageItemFormPayload {
  serviceId: string;
  serviceTierId?: string | undefined;
  label?: string | undefined;
  quantity: number;
  minQuantity: number;
  sortOrder: number;
}

interface MediaUploadPayload {
  image: MediaImage;
}

interface HomepageTextBlock {
  eyebrow: string;
  title: string;
  subtitle: string;
}

interface HomepageHeroBlock extends HomepageTextBlock {
  titleAccent: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

interface HomepageHighlightCard {
  id?: string;
  title: string;
  subtitle?: string;
  label?: string;
  mediaUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  status: PublishStatus;
  sortOrder: number;
}

interface HomepageServiceSection {
  id?: string;
  title: string;
  subtitle?: string;
  serviceIds: string[];
  status: PublishStatus;
  sortOrder: number;
}

interface HomepageConfig {
  hero: HomepageHeroBlock;
  offers: HomepageTextBlock;
  categories: HomepageTextBlock;
  highlights: HomepageTextBlock & {
    cards: HomepageHighlightCard[];
  };
  services: HomepageTextBlock;
  serviceSections: HomepageServiceSection[];
  trust: HomepageTextBlock;
}

interface HomepagePayload {
  homepage: HomepageConfig;
  updatedAt: string | null;
}

interface AdminRoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface AdminUserRow {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  roles: AdminRoleOption[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminRoleRow {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminUserListPayload {
  users: AdminUserRow[];
  pagination: PaginationPayload;
}

interface AdminUserDetailPayload {
  user: AdminUserRow;
}

interface AdminRoleListPayload {
  roles: AdminRoleRow[];
  pagination: PaginationPayload;
}

interface AdminRoleDetailPayload {
  role: AdminRoleRow;
}

interface AdminUserOptionsPayload {
  roles: AdminRoleOption[];
}

type CatalogueDeleteTarget =
  | { area: "categories"; row: CategoryRow }
  | { area: "services"; row: ServiceRow }
  | { area: "packages"; row: ServicePackageRow };

type UserManagementDeleteTarget =
  { area: "users"; row: AdminUserRow } | { area: "roles"; row: AdminRoleRow };

interface ApiErrorShape {
  code: string;
  message: string;
  requestId: string;
}

class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    code: string,
    requestId: string | null,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

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

async function apiFetch<TData>(
  path: string,
  init?: RequestInit,
): Promise<TData> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
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

  return "An unexpected error occurred.";
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function datetimeLocalToIso(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatServiceDealWindow(row: ServiceRow): string {
  if (!row.dealEnabled) {
    return "Not scheduled";
  }

  return `${formatTimestamp(row.dealStartsAt)} - ${formatTimestamp(row.dealEndsAt)}`;
}

function isAdminModuleKey(value: string): value is AdminModuleKey {
  return ADMIN_MODULES.some((moduleItem) => moduleItem.key === value);
}

function getModuleFromPath(pathname: string | null): AdminModuleKey | null {
  const moduleSegment = pathname?.split("/").filter(Boolean).at(1);
  return moduleSegment && isAdminModuleKey(moduleSegment)
    ? moduleSegment
    : null;
}

function getModulePath(moduleKey: AdminModuleKey): string {
  if (moduleKey === "catalogue") {
    return "/admin/catalogue/categories";
  }

  return `/admin/${moduleKey}`;
}

function getCatalogueAreaFromSegment(
  segment: string | undefined,
): CatalogueArea {
  if (segment === "services" || segment === "service") {
    return "services";
  }

  if (segment === "packages" || segment === "package") {
    return "packages";
  }

  if (segment === "homepage" || segment === "home") {
    return "homepage";
  }

  return "categories";
}

function getCatalogueRouteState(
  pathname: string | null,
): CatalogueRouteState | null {
  const segments = pathname?.split("/").filter(Boolean) ?? [];

  if (segments[0] !== "admin" || segments[1] !== "catalogue") {
    return null;
  }

  const area = getCatalogueAreaFromSegment(segments[2]);

  if (segments.length <= 3) {
    return { area, mode: "list", recordId: null };
  }

  if (segments[3] === "new") {
    return { area, mode: "create", recordId: null };
  }

  if (segments[3] && segments[4] === "edit") {
    return { area, mode: "edit", recordId: decodeURIComponent(segments[3]) };
  }

  return { area, mode: "list", recordId: null };
}

function getUserManagementAreaFromSegment(
  segment: string | undefined,
): UserManagementArea {
  return segment === "roles" || segment === "role" ? "roles" : "users";
}

function getUserManagementRouteState(
  pathname: string | null,
): UserManagementRouteState | null {
  const segments = pathname?.split("/").filter(Boolean) ?? [];

  if (segments[0] !== "admin" || segments[1] !== "user-management") {
    return null;
  }

  const area = getUserManagementAreaFromSegment(segments[2]);

  if (segments.length <= 3) {
    return { area, mode: "list", recordId: null };
  }

  if (segments[3] === "new") {
    return { area, mode: "create", recordId: null };
  }

  if (segments[3] && segments[4] === "edit") {
    return { area, mode: "edit", recordId: decodeURIComponent(segments[3]) };
  }

  return { area, mode: "list", recordId: null };
}

function getStaffRouteState(pathname: string | null): StaffRouteState | null {
  const segments = pathname?.split("/").filter(Boolean) ?? [];

  if (segments[0] !== "admin" || segments[1] !== "staff") {
    return null;
  }

  if (segments.length === 2) {
    return { mode: "list", staffId: null };
  }

  if (segments[2] === "new") {
    return { mode: "create", staffId: null };
  }

  if (segments[2] && segments[3] === "edit") {
    return { mode: "edit", staffId: decodeURIComponent(segments[2]) };
  }

  return { mode: "list", staffId: null };
}

function getStaffEditPath(staffId: string): string {
  return `/admin/staff/${encodeURIComponent(staffId)}/edit`;
}

function getCatalogueAreaPath(area: CatalogueArea): string {
  return `/admin/catalogue/${area}`;
}

function getCatalogueNewPath(area: CatalogueArea): string {
  return `/admin/catalogue/${area}/new`;
}

function getCatalogueEditPath(area: CatalogueArea, recordId: string): string {
  return `/admin/catalogue/${area}/${encodeURIComponent(recordId)}/edit`;
}

function getUserManagementAreaPath(area: UserManagementArea): string {
  return `/admin/user-management/${area}`;
}

function getUserManagementNewPath(area: UserManagementArea): string {
  return `/admin/user-management/${area}/new`;
}

function getUserManagementEditPath(
  area: UserManagementArea,
  recordId: string,
): string {
  return `/admin/user-management/${area}/${encodeURIComponent(recordId)}/edit`;
}

function hasPermission(user: AdminUser | null, permission: string): boolean {
  return user?.permissions.includes(permission) ?? false;
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalFormString(
  formData: FormData,
  key: string,
): string | undefined {
  const value = getFormString(formData, key);
  return value.length > 0 ? value : undefined;
}

function buildServiceTierPayloads(
  formData: FormData,
): ServiceTierFormPayload[] | null {
  const tiers: ServiceTierFormPayload[] = [];

  for (const tierType of SERVICE_TIER_TYPES) {
    const fieldPrefix = tierFieldName(tierType, "");
    const pricePaise = parseDecimalToScaledInteger(
      getFormString(formData, `${fieldPrefix}price`),
      100,
    );
    const compareAtInput = getOptionalFormString(
      formData,
      `${fieldPrefix}compare-at-price`,
    );
    const compareAtPricePaise = compareAtInput
      ? parseDecimalToScaledInteger(compareAtInput, 100)
      : undefined;
    const durationMinutes = Number(
      getFormString(formData, `${fieldPrefix}duration-minutes`),
    );
    const sortOrder = Number(
      getFormString(formData, `${fieldPrefix}sort-order`),
    );

    if (
      pricePaise === null ||
      compareAtPricePaise === null ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return null;
    }

    if (compareAtPricePaise !== undefined && compareAtPricePaise < pricePaise) {
      return null;
    }

    tiers.push({
      tierType,
      name:
        getOptionalFormString(formData, `${fieldPrefix}name`) ??
        defaultTierName(tierType),
      description: getOptionalFormString(formData, `${fieldPrefix}description`),
      durationMinutes,
      pricePaise,
      compareAtPricePaise,
      productsUsed: parseTextList(
        getFormString(formData, `${fieldPrefix}products-used`),
      ),
      status: getPublishStatus(getFormString(formData, `${fieldPrefix}status`)),
      sortOrder,
    });
  }

  return tiers;
}

function buildPackageItemPayloads(
  formData: FormData,
): ServicePackageItemFormPayload[] | null {
  const items: ServicePackageItemFormPayload[] = [];

  for (let index = 0; index < PACKAGE_ITEM_FORM_ROWS; index += 1) {
    const serviceId = getOptionalFormString(
      formData,
      `package-item-${index}-service-id`,
    );

    if (!serviceId) {
      continue;
    }

    const quantity = Number(
      getFormString(formData, `package-item-${index}-quantity`),
    );
    const minQuantity = Number(
      getFormString(formData, `package-item-${index}-min-quantity`),
    );
    const sortOrder = Number(
      getFormString(formData, `package-item-${index}-sort-order`),
    );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isInteger(minQuantity) ||
      minQuantity < 1 ||
      minQuantity > quantity ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return null;
    }

    items.push({
      serviceId,
      serviceTierId: getOptionalFormString(
        formData,
        `package-item-${index}-service-tier-id`,
      ),
      label: getOptionalFormString(formData, `package-item-${index}-label`),
      quantity,
      minQuantity,
      sortOrder,
    });
  }

  return items;
}

function getUserStatus(value: string): UserStatus {
  switch (value) {
    case "INVITED":
    case "SUSPENDED":
    case "DISABLED":
      return value;
    default:
      return "ACTIVE";
  }
}

function getStaffStatusFilter(value: string): StaffStatusFilter {
  switch (value) {
    case "INVITED":
    case "ACTIVE":
    case "SUSPENDED":
    case "DISABLED":
      return value;
    default:
      return "ALL";
  }
}

function getPublishStatusFilter(value: string): PublishStatusFilter {
  switch (value) {
    case "DRAFT":
    case "PUBLISHED":
    case "ARCHIVED":
      return value;
    default:
      return "ALL";
  }
}

function getRoleStatusFilter(value: string): RoleStatusFilter {
  switch (value) {
    case "ACTIVE":
    case "ARCHIVED":
      return value;
    default:
      return "ALL";
  }
}

function getReviewStatusFilter(value: string): ReviewStatusFilter {
  switch (value) {
    case "PENDING":
    case "APPROVED":
    case "HIDDEN":
    case "REJECTED":
      return value;
    default:
      return "ALL";
  }
}

function getBookingStatusFilter(value: string): BookingStatusFilter {
  switch (value) {
    case "DRAFT":
    case "CONFIRMED":
    case "ASSIGNMENT_PENDING":
    case "ASSIGNED":
    case "ACCEPTED":
    case "EN_ROUTE":
    case "ARRIVED":
    case "IN_SERVICE":
    case "COMPLETED":
    case "CANCELLED":
      return value;
    default:
      return "ALL";
  }
}

function getPaymentStatusFilter(value: string): PaymentStatusFilter {
  switch (value) {
    case "PENDING":
    case "AUTHORIZED":
    case "CAPTURED":
    case "FAILED":
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return value;
    default:
      return "ALL";
  }
}

function getPaymentProviderFilter(value: string): PaymentProviderFilter {
  switch (value) {
    case "razorpay":
    case "pay_after_service":
    case "development_razorpay":
    case "seed":
      return value;
    default:
      return "ALL";
  }
}

function getBookingSort(value: string): AdminBookingSort {
  switch (value) {
    case "scheduledStartAt_asc":
    case "createdAt_desc":
    case "createdAt_asc":
    case "status_asc":
    case "status_desc":
    case "total_asc":
    case "total_desc":
      return value;
    default:
      return "scheduledStartAt_desc";
  }
}

function getPaymentSort(value: string): AdminPaymentSort {
  switch (value) {
    case "updatedAt_asc":
    case "createdAt_desc":
    case "createdAt_asc":
    case "amount_desc":
    case "amount_asc":
    case "status_asc":
    case "status_desc":
      return value;
    default:
      return "updatedAt_desc";
  }
}

function getPublishStatus(value: string): PublishStatus {
  switch (value) {
    case "PUBLISHED":
    case "ARCHIVED":
      return value;
    default:
      return "DRAFT";
  }
}

function normalizeHomepageConfig(config: HomepageConfig): HomepageConfig {
  return {
    ...config,
    serviceSections: Array.isArray(config.serviceSections)
      ? config.serviceSections
      : [],
  };
}

function getStaffEngagementType(value: string): StaffEngagementType {
  return value === "GIG" ? "GIG" : "SALARIED";
}

function parseDecimalToScaledInteger(value: string, scale: 100): number | null {
  const normalized = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole = "0", fraction = ""] = normalized.split(".");
  const scaledFraction = fraction.padEnd(2, "0");
  return Number(whole) * scale + Number(scaledFraction);
}

function formatInrPaise(value: number): string {
  return `INR ${(value / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBpsPercent(value: number | null): string {
  if (value === null) {
    return "Not set";
  }

  return `${(value / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function formatPaiseInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : (value / 100).toFixed(2);
}

function formatBpsInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : (value / 100).toFixed(2);
}

function listToTextareaValue(values: string[]): string {
  return values.join("\n");
}

function parseTextList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function tierFieldName(tierType: ServiceTierType, field: string): string {
  return `service-tier-${tierType.toLowerCase()}-${field}`;
}

function defaultTierName(tierType: ServiceTierType): string {
  return tierType === "PREMIUM" ? "Premium" : "Luxury";
}

function resolveServiceTierForForm(
  service: ServiceRow | null,
  tierType: ServiceTierType,
): ServiceTierRow | null {
  return service?.tiers.find((tier) => tier.tierType === tierType) ?? null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected image could not be read."));
    });
    reader.addEventListener("error", () => {
      reject(new Error("The selected image could not be read."));
    });
    reader.readAsDataURL(file);
  });
}

function getSelectedPermissionKeys(formData: FormData): string[] {
  return formData
    .getAll("permissionKeys")
    .filter((value): value is string => typeof value === "string");
}

export default function AdminApp(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const routeModule = useMemo(() => getModuleFromPath(pathname), [pathname]);
  const staffRoute = useMemo(() => getStaffRouteState(pathname), [pathname]);
  const catalogueRoute = useMemo(
    () => getCatalogueRouteState(pathname),
    [pathname],
  );
  const userManagementRoute = useMemo(
    () => getUserManagementRouteState(pathname),
    [pathname],
  );
  const richTextEditorRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activeModule, setActiveModule] = useState<AdminModuleKey>(
    routeModule ?? "bookings",
  );
  const [moduleSnapshot, setModuleSnapshot] = useState<ModuleSnapshot | null>(
    null,
  );
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [staffTotalCount, setStaffTotalCount] = useState(0);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);
  const [staffSearchInput, setStaffSearchInput] = useState("");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] =
    useState<StaffStatusFilter>("ALL");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffDetail, setStaffDetail] = useState<StaffRow | null>(null);
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<StaffRow | null>(
    null,
  );
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [categoryTotalCount, setCategoryTotalCount] = useState(0);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(10);
  const [categorySearchInput, setCategorySearchInput] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [categoryStatusFilter, setCategoryStatusFilter] =
    useState<PublishStatusFilter>("ALL");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryDetail, setCategoryDetail] = useState<CategoryRow | null>(
    null,
  );
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [serviceTotalCount, setServiceTotalCount] = useState(0);
  const [servicePage, setServicePage] = useState(1);
  const [servicePageSize, setServicePageSize] = useState(10);
  const [serviceSearchInput, setServiceSearchInput] = useState("");
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] =
    useState<PublishStatusFilter>("ALL");
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceDetail, setServiceDetail] = useState<ServiceRow | null>(null);
  const [packageRows, setPackageRows] = useState<ServicePackageRow[]>([]);
  const [packageTotalCount, setPackageTotalCount] = useState(0);
  const [packagePage, setPackagePage] = useState(1);
  const [packagePageSize, setPackagePageSize] = useState(10);
  const [packageSearchInput, setPackageSearchInput] = useState("");
  const [packageSearchQuery, setPackageSearchQuery] = useState("");
  const [packageStatusFilter, setPackageStatusFilter] =
    useState<PublishStatusFilter>("ALL");
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageDetail, setPackageDetail] = useState<ServicePackageRow | null>(
    null,
  );
  const [catalogueDeleteTarget, setCatalogueDeleteTarget] =
    useState<CatalogueDeleteTarget | null>(null);
  const [categoryImage, setCategoryImage] = useState<MediaImage | null>(null);
  const [serviceMainImage, setServiceMainImage] = useState<MediaImage | null>(
    null,
  );
  const [serviceGalleryImages, setServiceGalleryImages] = useState<
    MediaImage[]
  >([]);
  const [serviceDescriptionHtml, setServiceDescriptionHtml] = useState("");
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(
    null,
  );
  const [homepageUpdatedAt, setHomepageUpdatedAt] = useState<string | null>(
    null,
  );
  const [homepageLoading, setHomepageLoading] = useState(false);
  const [homepageServiceOptions, setHomepageServiceOptions] = useState<
    ServiceRow[]
  >([]);
  const [homepageServiceOptionsLoading, setHomepageServiceOptionsLoading] =
    useState(false);
  const [homepageServiceOptionsError, setHomepageServiceOptionsError] =
    useState<string | null>(null);
  const [bookingRows, setBookingRows] = useState<BookingRow[]>([]);
  const [bookingTotalCount, setBookingTotalCount] = useState(0);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10);
  const [bookingSearchInput, setBookingSearchInput] = useState("");
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] =
    useState<BookingStatusFilter>("ALL");
  const [bookingSort, setBookingSort] = useState<AdminBookingSort>(
    "scheduledStartAt_desc",
  );
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingRow | null>(null);
  const [bookingStaffOptions, setBookingStaffOptions] = useState<StaffRow[]>(
    [],
  );
  const [bookingStaffOptionsLoading, setBookingStaffOptionsLoading] =
    useState(false);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [paymentTotalCount, setPaymentTotalCount] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const [paymentSearchInput, setPaymentSearchInput] = useState("");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("ALL");
  const [paymentProviderFilter, setPaymentProviderFilter] =
    useState<PaymentProviderFilter>("ALL");
  const [paymentSort, setPaymentSort] =
    useState<AdminPaymentSort>("updatedAt_desc");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDetail, setPaymentDetail] = useState<PaymentRow | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryPayload>({
    capturedAmountPaise: 0,
    byStatus: [],
  });
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [reviewTotalCount, setReviewTotalCount] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageSize, setReviewPageSize] = useState(10);
  const [reviewSearchInput, setReviewSearchInput] = useState("");
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] =
    useState<ReviewStatusFilter>("ALL");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [adminUserRows, setAdminUserRows] = useState<AdminUserRow[]>([]);
  const [adminUserTotalCount, setAdminUserTotalCount] = useState(0);
  const [adminUserPage, setAdminUserPage] = useState(1);
  const [adminUserPageSize, setAdminUserPageSize] = useState(10);
  const [adminUserSearchInput, setAdminUserSearchInput] = useState("");
  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState("");
  const [adminUserStatusFilter, setAdminUserStatusFilter] =
    useState<StaffStatusFilter>("ALL");
  const [adminUserLoading, setAdminUserLoading] = useState(false);
  const [adminUserDetail, setAdminUserDetail] = useState<AdminUserRow | null>(
    null,
  );
  const [roleOptions, setRoleOptions] = useState<AdminRoleOption[]>([]);
  const [roleRows, setRoleRows] = useState<AdminRoleRow[]>([]);
  const [roleTotalCount, setRoleTotalCount] = useState(0);
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(10);
  const [roleSearchInput, setRoleSearchInput] = useState("");
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [roleStatusFilter, setRoleStatusFilter] =
    useState<RoleStatusFilter>("ALL");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleDetail, setRoleDetail] = useState<AdminRoleRow | null>(null);
  const [userManagementDeleteTarget, setUserManagementDeleteTarget] =
    useState<UserManagementDeleteTarget | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem("replica-admin-sidebar-collapsed") === "true",
    );
  }, []);

  useEffect(() => {
    if (!bookingDetail) {
      return;
    }

    function closeBookingDialog(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setBookingDetail(null);
      }
    }

    window.addEventListener("keydown", closeBookingDialog);
    return () => window.removeEventListener("keydown", closeBookingDialog);
  }, [bookingDetail]);

  const activeModuleLabel = useMemo(
    () =>
      ADMIN_MODULES.find((item) => item.key === activeModule)?.label ??
      "Operations",
    [activeModule],
  );
  const rootCategories = useMemo(
    () => categoryOptions.filter((category) => !category.parentId),
    [categoryOptions],
  );
  const permissionGroups = useMemo(() => {
    const groups = new Map<string, PermissionOption[]>();

    for (const permission of permissions) {
      const resourcePermissions = groups.get(permission.resource) ?? [];
      resourcePermissions.push(permission);
      groups.set(permission.resource, resourcePermissions);
    }

    return [...groups.entries()].map(([resource, resourcePermissions]) => ({
      resource,
      permissions: resourcePermissions,
    }));
  }, [permissions]);
  const isStaffRoute = routeModule === "staff" && staffRoute !== null;
  const isDashboardRoute =
    (pathname?.split("?").at(0)?.replace(/\/$/, "") ?? "") === "/admin";
  const staffPageMode = staffRoute?.mode ?? "list";
  const staffWorkspaceTitle =
    staffPageMode === "create"
      ? "Add Staff"
      : staffPageMode === "edit"
        ? "Edit Staff"
        : "Staff";
  const canViewStaff = hasPermission(user, "staff:view");
  const canCreateStaff = hasPermission(user, "staff:create");
  const canUpdateStaff = hasPermission(user, "staff:update");
  const canDeleteStaff = hasPermission(user, "staff:delete");
  const canExportStaff = hasPermission(user, "staff:export");
  const isCatalogueRoute =
    routeModule === "catalogue" && catalogueRoute !== null;
  const catalogueArea = catalogueRoute?.area ?? "categories";
  const cataloguePageMode = catalogueRoute?.mode ?? "list";
  const catalogueSingularLabel =
    catalogueArea === "categories"
      ? "Category"
      : catalogueArea === "services"
        ? "Service"
        : catalogueArea === "packages"
          ? "Package"
          : "Homepage";
  const cataloguePluralLabel =
    catalogueArea === "categories"
      ? "Categories"
      : catalogueArea === "services"
        ? "Services"
        : catalogueArea === "packages"
          ? "Packages"
          : "Homepage";
  const catalogueWorkspaceTitle =
    catalogueArea === "homepage"
      ? "Homepage"
      : cataloguePageMode === "create"
        ? `Add ${catalogueSingularLabel}`
        : cataloguePageMode === "edit"
          ? `Edit ${catalogueSingularLabel}`
          : cataloguePluralLabel;
  const canCreateCategory = hasPermission(user, "categories:create");
  const canUpdateCategory = hasPermission(user, "categories:update");
  const canDeleteCategory = hasPermission(user, "categories:delete");
  const canExportCategory = hasPermission(user, "categories:export");
  const canCreateService = hasPermission(user, "services:create");
  const canUpdateService = hasPermission(user, "services:update");
  const canDeleteService = hasPermission(user, "services:delete");
  const canExportService = hasPermission(user, "services:export");
  const canCreatePackage = canCreateService;
  const canUpdatePackage = canUpdateService;
  const canDeletePackage = canDeleteService;
  const canViewHomepage = hasPermission(user, "content:view");
  const canUpdateHomepage = hasPermission(user, "content:update");
  const isBookingsRoute = routeModule === "bookings";
  const canViewBookings = hasPermission(user, "bookings:view");
  const canAssignBookings = hasPermission(user, "bookings:assign");
  const isPaymentsRoute = routeModule === "payments";
  const canViewPayments = hasPermission(user, "payments:view");
  const canSyncPayments = hasPermission(user, "payments:update");
  const isReviewsRoute = routeModule === "reviews";
  const canViewReviews = hasPermission(user, "reviews:view");
  const canModerateReviews =
    hasPermission(user, "reviews:approve") ||
    hasPermission(user, "reviews:update");
  const isUserManagementRoute = userManagementRoute !== null;
  const userManagementArea = userManagementRoute?.area ?? "users";
  const userManagementPageMode = userManagementRoute?.mode ?? "list";
  const userManagementSingularLabel =
    userManagementArea === "users" ? "User" : "Role";
  const userManagementPluralLabel =
    userManagementArea === "users" ? "Users" : "Roles";
  const userManagementWorkspaceTitle =
    userManagementPageMode === "create"
      ? `Add ${userManagementSingularLabel}`
      : userManagementPageMode === "edit"
        ? `Edit ${userManagementSingularLabel}`
        : userManagementPluralLabel;
  const canCreateAdminUser = hasPermission(user, "admin_users:create");
  const canUpdateAdminUser = hasPermission(user, "admin_users:update");
  const canDeleteAdminUser = hasPermission(user, "admin_users:delete");
  const canExportAdminUser = hasPermission(user, "admin_users:export");
  const canCreateRole = hasPermission(user, "roles:manage_permissions");
  const canUpdateRole = hasPermission(user, "roles:manage_permissions");
  const canDeleteRole = hasPermission(user, "roles:delete");
  const canExportRole = hasPermission(user, "roles:export");
  const workspaceTitle = isStaffRoute
    ? staffWorkspaceTitle
    : isCatalogueRoute
      ? catalogueWorkspaceTitle
      : isUserManagementRoute
        ? userManagementWorkspaceTitle
        : isDashboardRoute
          ? "Dashboard"
          : routeModule
            ? activeModuleLabel
            : "Dashboard";
  const staffColumns = useMemo<Array<AdminDataTableColumn<StaffRow>>>(() => {
    const columns: Array<AdminDataTableColumn<StaffRow>> = [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.employeeCode}</span>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{row.email ?? "No email"}</span>
            <small>{row.phone ?? "No phone"}</small>
          </div>
        ),
      },
      {
        key: "engagement",
        header: "Engagement",
        render: (row) => formatLabel(row.engagementType),
      },
      {
        key: "services",
        header: "Services",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>
              {row.services.length === 0
                ? "No services mapped"
                : row.services
                    .slice(0, 2)
                    .map((service) => service.name)
                    .join(", ")}
            </span>
            {row.services.length > 2 ? (
              <small>+{row.services.length - 2} more</small>
            ) : null}
          </div>
        ),
      },
      {
        key: "emergency",
        header: "Emergency",
        render: (row) => row.emergencyPhone ?? "Not set",
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`status-badge staff-status-${row.status.toLowerCase()}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ];

    if (canUpdateStaff || canDeleteStaff) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <div className="table-row-actions">
            {canUpdateStaff ? (
              <button
                aria-label={`Edit ${row.name}`}
                className="icon-button table-icon-button"
                onClick={() => router.push(getStaffEditPath(row.id))}
                title="Edit staff"
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
              </button>
            ) : null}
            {canDeleteStaff ? (
              <button
                aria-label={`Delete ${row.name}`}
                className="icon-button table-icon-button danger-icon-button"
                onClick={() => setStaffDeleteTarget(row)}
                title="Delete staff"
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return columns;
  }, [canDeleteStaff, canUpdateStaff, router]);
  const categoryColumns = useMemo<
    Array<AdminDataTableColumn<CategoryRow>>
  >(() => {
    const columns: Array<AdminDataTableColumn<CategoryRow>> = [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.slug}</span>
          </div>
        ),
      },
      {
        key: "parent",
        header: "Parent",
        render: (row) => row.parentName ?? "Root category",
      },
      {
        key: "type",
        header: "Type",
        render: (row) => (row.parentId ? "Subcategory" : "Category"),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`status-badge publish-status-${row.status.toLowerCase()}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ];

    if (canUpdateCategory || canDeleteCategory) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <div className="table-row-actions">
            {canUpdateCategory ? (
              <button
                aria-label={`Edit ${row.name}`}
                className="icon-button table-icon-button"
                onClick={() =>
                  router.push(getCatalogueEditPath("categories", row.id))
                }
                title="Edit category"
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
              </button>
            ) : null}
            {canDeleteCategory ? (
              <button
                aria-label={`Delete ${row.name}`}
                className="icon-button table-icon-button danger-icon-button"
                onClick={() =>
                  setCatalogueDeleteTarget({ area: "categories", row })
                }
                title="Delete category"
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return columns;
  }, [canDeleteCategory, canUpdateCategory, router]);
  const serviceColumns = useMemo<
    Array<AdminDataTableColumn<ServiceRow>>
  >(() => {
    const columns: Array<AdminDataTableColumn<ServiceRow>> = [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.slug}</span>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (row) => row.categoryName,
      },
      {
        key: "duration",
        header: "Duration",
        render: (row) => `${row.durationMinutes} min`,
      },
      {
        key: "price",
        header: "Price",
        render: (row) => formatInrPaise(row.pricePaise),
      },
      {
        key: "tiers",
        header: "Tiers",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>
              {row.tiers.find((tier) => tier.tierType === "PREMIUM")?.name ??
                "Premium"}
            </span>
            <small>
              {row.tiers.find((tier) => tier.tierType === "LUXURY")?.name ??
                "Luxury"}
            </small>
          </div>
        ),
      },
      {
        key: "compareAtPrice",
        header: "MRP",
        render: (row) =>
          row.compareAtPricePaise === null
            ? "Not set"
            : formatInrPaise(row.compareAtPricePaise),
      },
      {
        key: "gst",
        header: "GST",
        render: (row) => formatBpsPercent(row.gstRateBps),
      },
      {
        key: "homepage",
        header: "Homepage",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.featured ? "Featured" : "Standard"}</strong>
            <span>Order {row.sortOrder}</span>
          </div>
        ),
      },
      {
        key: "deal",
        header: "Deal",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.dealEnabled ? "Deal enabled" : "No deal"}</strong>
            <span>
              {row.dealEnabled && row.dealPricePaise !== null
                ? formatInrPaise(row.dealPricePaise)
                : "Uses service price"}
            </span>
            <span>{formatServiceDealWindow(row)}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`status-badge publish-status-${row.status.toLowerCase()}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ];

    if (canUpdateService || canDeleteService) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <div className="table-row-actions">
            {canUpdateService ? (
              <button
                aria-label={`Edit ${row.name}`}
                className="icon-button table-icon-button"
                onClick={() =>
                  router.push(getCatalogueEditPath("services", row.id))
                }
                title="Edit service"
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
              </button>
            ) : null}
            {canDeleteService ? (
              <button
                aria-label={`Delete ${row.name}`}
                className="icon-button table-icon-button danger-icon-button"
                onClick={() =>
                  setCatalogueDeleteTarget({ area: "services", row })
                }
                title="Delete service"
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return columns;
  }, [canDeleteService, canUpdateService, router]);
  const packageColumns = useMemo<
    Array<AdminDataTableColumn<ServicePackageRow>>
  >(() => {
    const columns: Array<AdminDataTableColumn<ServicePackageRow>> = [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.slug}</span>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (row) => row.categoryName,
      },
      {
        key: "items",
        header: "Services",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{row.items.length} services</span>
            <small>
              Min {formatInrPaise(row.minPricePaise)} ·{" "}
              {formatBpsPercent(row.discountBps)}
            </small>
          </div>
        ),
      },
      {
        key: "duration",
        header: "Duration",
        render: (row) => `${row.durationMinutes} min`,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`status-badge publish-status-${row.status.toLowerCase()}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ];

    if (canUpdatePackage || canDeletePackage) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <div className="table-row-actions">
            {canUpdatePackage ? (
              <button
                aria-label={`Edit ${row.name}`}
                className="icon-button table-icon-button"
                onClick={() =>
                  router.push(getCatalogueEditPath("packages", row.id))
                }
                title="Edit package"
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
              </button>
            ) : null}
            {canDeletePackage ? (
              <button
                aria-label={`Delete ${row.name}`}
                className="icon-button table-icon-button danger-icon-button"
                onClick={() =>
                  setCatalogueDeleteTarget({ area: "packages", row })
                }
                title="Delete package"
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return columns;
  }, [canDeletePackage, canUpdatePackage, router]);
  const bookingColumns = useMemo<
    Array<AdminDataTableColumn<BookingRow>>
  >(() => {
    const columns: Array<AdminDataTableColumn<BookingRow>> = [
      {
        key: "booking",
        header: "Booking",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>#{row.publicId.slice(-8)}</strong>
            <span>{row.customerName}</span>
            {row.customerPhone ? <span>{row.customerPhone}</span> : null}
          </div>
        ),
      },
      {
        key: "services",
        header: "Services",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{row.serviceNames.slice(0, 2).join(", ")}</span>
            {row.serviceNames.length > 2 ? (
              <small>+{row.serviceNames.length - 2} more</small>
            ) : null}
          </div>
        ),
      },
      {
        key: "slot",
        header: "Slot",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{formatTimestamp(row.scheduledStartAt)}</span>
            <small>Ends {formatTimestamp(row.scheduledEndAt)}</small>
          </div>
        ),
      },
      {
        key: "staff",
        header: "Staff",
        render: (row) =>
          row.staff ? (
            <div className="table-stacked-cell">
              <span>{row.staff.name}</span>
              <small>
                {row.staff.employeeCode} · {formatLabel(row.staff.status)}
              </small>
            </div>
          ) : (
            "Best available pending"
          ),
      },
      {
        key: "payment",
        header: "Payment",
        render: (row) => formatLabel(row.paymentStatus),
      },
      {
        key: "total",
        header: "Total",
        render: (row) => formatInrPaise(row.totalPaise),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span className="status-badge">{formatLabel(row.status)}</span>
        ),
      },
    ];

    if (canAssignBookings) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <button
            className="secondary-button table-compact-action"
            onClick={() => void loadBookingDetail(row.id)}
            type="button"
          >
            <Edit3 aria-hidden="true" size={15} />
            <span>Manage</span>
          </button>
        ),
      });
    }

    return columns;
  }, [canAssignBookings]);
  const paymentColumns = useMemo<
    Array<AdminDataTableColumn<PaymentRow>>
  >(() => {
    const columns: Array<AdminDataTableColumn<PaymentRow>> = [
      {
        key: "payment",
        header: "Payment",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{formatInrPaise(row.amountPaise)}</strong>
            <span>{row.currency}</span>
            <span>{row.id.slice(-10)}</span>
          </div>
        ),
      },
      {
        key: "booking",
        header: "Booking",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>#{row.bookingPublicId.slice(-8)}</strong>
            <span>{row.customerName}</span>
            {row.customerPhone ? <span>{row.customerPhone}</span> : null}
          </div>
        ),
      },
      {
        key: "services",
        header: "Services",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{row.serviceNames.slice(0, 2).join(", ")}</span>
            {row.serviceNames.length > 2 ? (
              <small>+{row.serviceNames.length - 2} more</small>
            ) : null}
          </div>
        ),
      },
      {
        key: "provider",
        header: "Provider",
        render: (row) => (
          <div className="table-stacked-cell payment-reference-cell">
            <span>{formatLabel(row.provider)}</span>
            <small title={row.providerOrderId ?? row.providerRef ?? undefined}>
              Order: {row.providerOrderId ?? row.providerRef ?? "Not recorded"}
            </small>
            <small title={row.providerPaymentId ?? undefined}>
              Payment: {row.providerPaymentId ?? "Not verified"}
            </small>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div className="table-primary-cell">
            <span className="status-badge">{formatLabel(row.status)}</span>
            <span>{row.providerStatus ?? "Provider pending"}</span>
          </div>
        ),
      },
      {
        key: "verification",
        header: "Verified",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{formatTimestamp(row.verifiedAt)}</span>
            <small>Captured {formatTimestamp(row.capturedAt)}</small>
          </div>
        ),
      },
      {
        key: "reconciliation",
        header: "Reconciliation",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{row.invoiceNo ?? "No invoice yet"}</span>
            <small>
              {row.latestWebhookEvent
                ? `${formatLabel(row.latestWebhookEvent)} · ${
                    row.latestWebhookStatus
                      ? formatLabel(row.latestWebhookStatus)
                      : "Received"
                  }`
                : "No webhook received"}
            </small>
          </div>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "table-actions-column payment-actions-column",
        render: (row) => {
          const syncKey = `payment-sync-${row.id}`;
          const canSyncRow = canSyncPayments && row.provider === "razorpay";

          return (
            <div className="table-row-actions payment-row-actions">
              <button
                className="secondary-button compact-action-button"
                onClick={() => void loadPaymentDetail(row.id)}
                type="button"
              >
                <Edit3 aria-hidden="true" size={15} />
                <span>Details</span>
              </button>
              <button
                className="secondary-button compact-action-button"
                disabled={!canSyncRow || actionSubmitting === syncKey}
                onClick={() => void syncRazorpayPayment(row.id)}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={15} />
                <span>{actionSubmitting === syncKey ? "Syncing" : "Sync"}</span>
              </button>
            </div>
          );
        },
      },
    ];

    return columns;
  }, [actionSubmitting, canSyncPayments]);
  const reviewColumns = useMemo<Array<AdminDataTableColumn<ReviewRow>>>(() => {
    const columns: Array<AdminDataTableColumn<ReviewRow>> = [
      {
        key: "customer",
        header: "Customer",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.customerName}</strong>
            <span>Booking #{row.bookingPublicId.slice(-8)}</span>
          </div>
        ),
      },
      {
        key: "rating",
        header: "Rating",
        render: (row) => <strong>{row.rating}/5</strong>,
      },
      {
        key: "review",
        header: "Review",
        render: (row) => (
          <div className="review-table-copy">
            {row.highlights.length > 0 ? (
              <ul>
                {row.highlights.slice(0, 4).map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}
            {row.comment ? <p>{row.comment}</p> : null}
          </div>
        ),
      },
      {
        key: "services",
        header: "Services",
        render: (row) => row.serviceNames.join(", ") || "Not linked",
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div className="table-primary-cell">
            <span
              className={`status-badge review-status-${row.status.toLowerCase()}`}
            >
              {row.status}
            </span>
            <span>{row.showOnHomepage ? "Shown on homepage" : "Hidden"}</span>
          </div>
        ),
      },
      {
        key: "moderated",
        header: "Moderated",
        render: (row) => (
          <div className="table-stacked-cell">
            <span>{row.moderatedByName ?? "Not moderated"}</span>
            <small>{formatTimestamp(row.moderatedAt ?? row.updatedAt)}</small>
          </div>
        ),
      },
    ];

    if (canModerateReviews) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column review-actions-column",
        render: (row) => (
          <div className="table-row-actions review-row-actions">
            <button
              className="secondary-button compact-action-button"
              disabled={
                actionSubmitting === row.id ||
                (row.status === "APPROVED" && row.showOnHomepage)
              }
              onClick={() => void updateReviewModeration(row, "APPROVED", true)}
              type="button"
            >
              Show
            </button>
            <button
              className="secondary-button compact-action-button"
              disabled={
                actionSubmitting === row.id ||
                (row.status === "HIDDEN" && !row.showOnHomepage)
              }
              onClick={() => void updateReviewModeration(row, "HIDDEN", false)}
              type="button"
            >
              Hide
            </button>
            <button
              className="danger-button compact-action-button"
              disabled={
                actionSubmitting === row.id ||
                (row.status === "REJECTED" && !row.showOnHomepage)
              }
              onClick={() =>
                void updateReviewModeration(row, "REJECTED", false)
              }
              type="button"
            >
              Reject
            </button>
          </div>
        ),
      });
    }

    return columns;
  }, [actionSubmitting, canModerateReviews]);
  const moduleColumns = useMemo<Array<AdminDataTableColumn<ModuleRecord>>>(
    () => [
      {
        key: "title",
        header: "Record",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.title}</strong>
            <span>{row.subtitle}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <span className="status-badge">{row.status}</span>,
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ],
    [],
  );
  const adminUserColumns = useMemo<
    Array<AdminDataTableColumn<AdminUserRow>>
  >(() => {
    const columns: Array<AdminDataTableColumn<AdminUserRow>> = [
      {
        key: "name",
        header: "User",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.email ?? "No email"}</span>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Phone",
        render: (row) => row.phone ?? "Not set",
      },
      {
        key: "roles",
        header: "Roles",
        render: (row) => (
          <div className="inline-chip-list">
            {row.roles.length > 0
              ? row.roles.map((role) => (
                  <span className="status-badge" key={role.id}>
                    {role.name}
                  </span>
                ))
              : "No role"}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`status-badge staff-status-${row.status.toLowerCase()}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "last-login",
        header: "Last login",
        render: (row) => formatTimestamp(row.lastLoginAt),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ];

    if (canUpdateAdminUser || canDeleteAdminUser) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <div className="table-row-actions">
            {canUpdateAdminUser ? (
              <button
                aria-label={`Edit ${row.name}`}
                className="icon-button table-icon-button"
                onClick={() =>
                  router.push(getUserManagementEditPath("users", row.id))
                }
                title="Edit user"
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
              </button>
            ) : null}
            {canDeleteAdminUser ? (
              <button
                aria-label={`Deactivate ${row.name}`}
                className="icon-button table-icon-button danger-icon-button"
                onClick={() =>
                  setUserManagementDeleteTarget({ area: "users", row })
                }
                title="Deactivate user"
                type="button"
              >
                <UserX aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return columns;
  }, [canDeleteAdminUser, canUpdateAdminUser, router]);
  const roleColumns = useMemo<Array<AdminDataTableColumn<AdminRoleRow>>>(() => {
    const columns: Array<AdminDataTableColumn<AdminRoleRow>> = [
      {
        key: "name",
        header: "Role",
        render: (row) => (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.description ?? "No description"}</span>
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (row) => (row.isSystem ? "System" : "Custom"),
      },
      {
        key: "permissions",
        header: "Permissions",
        render: (row) => row.permissionKeys.length,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span
            className={`status-badge ${
              row.archivedAt ? "publish-status-archived" : "staff-status-active"
            }`}
          >
            {row.archivedAt ? "ARCHIVED" : "ACTIVE"}
          </span>
        ),
      },
      {
        key: "updated",
        header: "Updated",
        render: (row) => formatTimestamp(row.updatedAt),
      },
    ];

    if (canUpdateRole || canDeleteRole) {
      columns.push({
        key: "actions",
        header: "Actions",
        className: "table-actions-column",
        render: (row) => (
          <div className="table-row-actions">
            {canUpdateRole ? (
              <button
                aria-label={`Edit ${row.name}`}
                className="icon-button table-icon-button"
                disabled={row.isSystem || Boolean(row.archivedAt)}
                onClick={() =>
                  router.push(getUserManagementEditPath("roles", row.id))
                }
                title="Edit role"
                type="button"
              >
                <Edit3 aria-hidden="true" size={16} />
              </button>
            ) : null}
            {canDeleteRole ? (
              <button
                aria-label={`Archive ${row.name}`}
                className="icon-button table-icon-button danger-icon-button"
                disabled={row.isSystem || Boolean(row.archivedAt)}
                onClick={() =>
                  setUserManagementDeleteTarget({ area: "roles", row })
                }
                title="Archive role"
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            ) : null}
          </div>
        ),
      });
    }

    return columns;
  }, [canDeleteRole, canUpdateRole, router]);

  async function loadDashboardAndModule(
    moduleKey: AdminModuleKey,
    actor: AdminUser | null = user,
  ): Promise<void> {
    const [dashboardPayload, snapshotPayload] = await Promise.all([
      apiFetch<DashboardPayload>("/admin/dashboard"),
      apiFetch<ModuleSnapshot>(`/admin/operations/${moduleKey}`),
    ]);

    setDashboard(dashboardPayload);
    setModuleSnapshot(snapshotPayload);

    await loadModuleOptions(moduleKey, actor);
  }

  async function loadModuleOptions(
    moduleKey: AdminModuleKey,
    actor: AdminUser | null = user,
  ): Promise<void> {
    if (
      moduleKey === "roles" &&
      hasPermission(actor, "roles:manage_permissions")
    ) {
      const payload = await apiFetch<PermissionsPayload>("/admin/permissions");
      setPermissions(payload.permissions);
      return;
    }

    if (
      moduleKey === "catalogue" &&
      (hasPermission(actor, "categories:view") ||
        hasPermission(actor, "categories:create") ||
        hasPermission(actor, "categories:update") ||
        hasPermission(actor, "services:view") ||
        hasPermission(actor, "services:create") ||
        hasPermission(actor, "services:update"))
    ) {
      const payload = await apiFetch<CatalogueOptionsPayload>(
        "/admin/catalogue/options",
      );
      setCategoryOptions(payload.categories);
    }
  }

  function getStaffQueryString(includePagination: boolean): string {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(staffPage));
      params.set("pageSize", String(staffPageSize));
    }

    if (staffSearchQuery) {
      params.set("search", staffSearchQuery);
    }

    if (staffStatusFilter !== "ALL") {
      params.set("status", staffStatusFilter);
    }

    return params.toString();
  }

  async function loadStaffList(): Promise<void> {
    setStaffLoading(true);
    setError(null);

    try {
      const query = getStaffQueryString(true);
      const payload = await apiFetch<StaffListPayload>(
        `/admin/staff${query ? `?${query}` : ""}`,
      );
      setStaffRows(payload.staff);
      setStaffTotalCount(payload.pagination.totalCount);
    } catch (staffError) {
      setError(getErrorMessage(staffError));
      setStaffRows([]);
      setStaffTotalCount(0);
    } finally {
      setStaffLoading(false);
    }
  }

  async function loadStaffDetail(staffId: string): Promise<void> {
    setStaffLoading(true);
    setError(null);
    setStaffDetail(null);

    try {
      const payload = await apiFetch<StaffDetailPayload>(
        `/admin/staff/${encodeURIComponent(staffId)}`,
      );
      setStaffDetail(payload.staff);
    } catch (staffError) {
      setError(getErrorMessage(staffError));
    } finally {
      setStaffLoading(false);
    }
  }

  async function handleStaffSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setStaffPage(1);
    setStaffSearchQuery(staffSearchInput.trim());
  }

  function handleStaffPageSizeChange(nextPageSize: number): void {
    setStaffPage(1);
    setStaffPageSize(nextPageSize);
  }

  function getBookingQueryString(): string {
    const params = new URLSearchParams({
      page: String(bookingPage),
      pageSize: String(bookingPageSize),
      sort: bookingSort,
    });

    if (bookingSearchQuery) {
      params.set("search", bookingSearchQuery);
    }

    if (bookingStatusFilter !== "ALL") {
      params.set("status", bookingStatusFilter);
    }

    return params.toString();
  }

  async function loadBookingList(): Promise<void> {
    if (!canViewBookings) {
      setBookingRows([]);
      setBookingTotalCount(0);
      return;
    }

    setBookingLoading(true);
    setError(null);

    try {
      const query = getBookingQueryString();
      const payload = await apiFetch<BookingListPayload>(
        `/admin/bookings${query ? `?${query}` : ""}`,
      );
      setBookingRows(payload.bookings);
      setBookingTotalCount(payload.pagination.totalCount);
    } catch (bookingError) {
      setError(getErrorMessage(bookingError));
      setBookingRows([]);
      setBookingTotalCount(0);
    } finally {
      setBookingLoading(false);
    }
  }

  async function loadBookingDetail(bookingId: string): Promise<void> {
    setBookingLoading(true);
    setError(null);

    try {
      const payload = await apiFetch<BookingDetailPayload>(
        `/admin/bookings/${encodeURIComponent(bookingId)}`,
      );
      setBookingDetail(payload.booking);
    } catch (bookingError) {
      setError(getErrorMessage(bookingError));
      setBookingDetail(null);
    } finally {
      setBookingLoading(false);
    }
  }

  async function loadBookingStaffOptions(): Promise<void> {
    if (!canAssignBookings || !canViewStaff) {
      setBookingStaffOptions([]);
      return;
    }

    setBookingStaffOptionsLoading(true);

    try {
      const payload = await apiFetch<StaffListPayload>(
        "/admin/staff?page=1&pageSize=100&status=ACTIVE",
      );
      setBookingStaffOptions(payload.staff);
    } catch {
      setBookingStaffOptions([]);
    } finally {
      setBookingStaffOptionsLoading(false);
    }
  }

  async function handleBookingSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setBookingPage(1);
    setBookingSearchQuery(bookingSearchInput.trim());
  }

  function handleBookingPageSizeChange(nextPageSize: number): void {
    setBookingPage(1);
    setBookingPageSize(nextPageSize);
  }

  async function handleSaveBookingAssignment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!bookingDetail) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const scheduledStartAt = datetimeLocalToIso(
      getFormString(formData, "booking-scheduled-start"),
    );
    const staffProfileId = getOptionalFormString(
      formData,
      "booking-staff-profile-id",
    );
    const reason = getOptionalFormString(formData, "booking-assignment-reason");

    if (!scheduledStartAt) {
      setError("Choose a valid booking start date and time.");
      return;
    }

    setActionSubmitting("booking-assignment-update");
    setError(null);
    setNotice(null);

    try {
      const payload = await apiFetch<BookingDetailPayload>(
        `/admin/bookings/${encodeURIComponent(bookingDetail.id)}/assignment`,
        {
          method: "PATCH",
          body: JSON.stringify({
            scheduledStartAt,
            staffProfileId,
            reason,
          }),
        },
      );
      setBookingDetail(payload.booking);
      setNotice("Booking assignment updated.");
      await loadBookingList();
    } catch (bookingError) {
      setError(getErrorMessage(bookingError));
    } finally {
      setActionSubmitting(null);
    }
  }

  function getPaymentQueryString(): string {
    const params = new URLSearchParams({
      page: String(paymentPage),
      pageSize: String(paymentPageSize),
      sort: paymentSort,
    });

    if (paymentSearchQuery) {
      params.set("search", paymentSearchQuery);
    }

    if (paymentStatusFilter !== "ALL") {
      params.set("status", paymentStatusFilter);
    }

    if (paymentProviderFilter !== "ALL") {
      params.set("provider", paymentProviderFilter);
    }

    return params.toString();
  }

  async function loadPaymentList(): Promise<void> {
    if (!canViewPayments) {
      setPaymentRows([]);
      setPaymentTotalCount(0);
      setPaymentSummary({ capturedAmountPaise: 0, byStatus: [] });
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      const query = getPaymentQueryString();
      const payload = await apiFetch<PaymentListPayload>(
        `/admin/payments${query ? `?${query}` : ""}`,
      );
      setPaymentRows(payload.payments);
      setPaymentTotalCount(payload.pagination.totalCount);
      setPaymentSummary(payload.summary);
    } catch (paymentError) {
      setError(getErrorMessage(paymentError));
      setPaymentRows([]);
      setPaymentTotalCount(0);
      setPaymentSummary({ capturedAmountPaise: 0, byStatus: [] });
    } finally {
      setPaymentLoading(false);
    }
  }

  async function loadPaymentDetail(paymentId: string): Promise<void> {
    if (!canViewPayments) {
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      const payload = await apiFetch<PaymentDetailPayload>(
        `/admin/payments/${encodeURIComponent(paymentId)}`,
      );
      setPaymentDetail(payload.payment);
    } catch (paymentError) {
      setError(getErrorMessage(paymentError));
      setPaymentDetail(null);
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handlePaymentSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setPaymentPage(1);
    setPaymentSearchQuery(paymentSearchInput.trim());
  }

  function handlePaymentPageSizeChange(nextPageSize: number): void {
    setPaymentPage(1);
    setPaymentPageSize(nextPageSize);
  }

  async function syncRazorpayPayment(paymentId: string): Promise<void> {
    if (!canSyncPayments) {
      return;
    }

    const submitKey = `payment-sync-${paymentId}`;
    setActionSubmitting(submitKey);
    setError(null);
    setNotice(null);

    try {
      const payload = await apiFetch<PaymentDetailPayload>(
        `/admin/payments/${encodeURIComponent(paymentId)}/sync`,
        {
          method: "POST",
        },
      );

      setPaymentDetail(payload.payment);
      setPaymentRows((currentRows) =>
        currentRows.map((row) =>
          row.id === payload.payment.id ? payload.payment : row,
        ),
      );
      setNotice("Razorpay payment status synced.");
      await loadPaymentList();
    } catch (paymentError) {
      setError(getErrorMessage(paymentError));
    } finally {
      setActionSubmitting(null);
    }
  }

  function getReviewQueryString(): string {
    const params = new URLSearchParams({
      page: String(reviewPage),
      pageSize: String(reviewPageSize),
    });

    if (reviewSearchQuery) {
      params.set("search", reviewSearchQuery);
    }

    if (reviewStatusFilter !== "ALL") {
      params.set("status", reviewStatusFilter);
    }

    return params.toString();
  }

  async function loadReviewList(): Promise<void> {
    if (!canViewReviews) {
      setReviewRows([]);
      setReviewTotalCount(0);
      return;
    }

    setReviewLoading(true);
    setError(null);

    try {
      const query = getReviewQueryString();
      const payload = await apiFetch<ReviewListPayload>(
        `/admin/reviews${query ? `?${query}` : ""}`,
      );
      setReviewRows(payload.reviews);
      setReviewTotalCount(payload.pagination.totalCount);
    } catch (reviewError) {
      setError(getErrorMessage(reviewError));
      setReviewRows([]);
      setReviewTotalCount(0);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleReviewSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setReviewPage(1);
    setReviewSearchQuery(reviewSearchInput.trim());
  }

  function handleReviewPageSizeChange(nextPageSize: number): void {
    setReviewPage(1);
    setReviewPageSize(nextPageSize);
  }

  async function updateReviewModeration(
    row: ReviewRow,
    status: ReviewModerationStatus,
    showOnHomepage: boolean,
  ): Promise<void> {
    setActionSubmitting(row.id);
    setError(null);
    setNotice(null);

    try {
      const payload = await apiFetch<ReviewDetailPayload>(
        `/admin/reviews/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            showOnHomepage,
          }),
        },
      );

      setReviewRows((current) =>
        current.map((review) =>
          review.id === payload.review.id ? payload.review : review,
        ),
      );
      setNotice(
        showOnHomepage
          ? "Review approved and shown on homepage."
          : "Review visibility updated.",
      );
      void loadReviewList();
    } catch (reviewError) {
      setError(getErrorMessage(reviewError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleExportStaff(): Promise<void> {
    setActionSubmitting("staff-export");
    setError(null);
    setNotice(null);

    try {
      const query = getStaffQueryString(false);
      const response = await fetch(
        `${API_BASE}/admin/staff/export${query ? `?${query}` : ""}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const apiError = getApiError(payload);
        throw new ApiRequestError(
          apiError?.message ?? "Staff export failed.",
          response.status,
          apiError?.code ?? "REQUEST_FAILED",
          apiError?.requestId ?? null,
        );
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `replica-staff-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setNotice("Staff export downloaded.");
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSaveStaff(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editingStaffId =
      staffPageMode === "edit" ? staffRoute?.staffId : null;
    const serviceIds = formData
      .getAll("staff-service-ids")
      .filter((value): value is string => typeof value === "string");
    const payload = {
      name: getFormString(formData, "staff-name"),
      email: getOptionalFormString(formData, "staff-email"),
      phone: getOptionalFormString(formData, "staff-phone"),
      employeeCode: getFormString(formData, "staff-employee-code"),
      engagementType: getStaffEngagementType(
        getFormString(formData, "staff-engagement-type"),
      ),
      emergencyPhone: getOptionalFormString(formData, "staff-emergency-phone"),
      serviceIds,
      status: getUserStatus(getFormString(formData, "staff-status")),
    };

    setActionSubmitting(editingStaffId ? "staff-update" : "staff-create");
    setError(null);
    setNotice(null);

    try {
      await apiFetch<StaffDetailPayload>(
        editingStaffId
          ? `/admin/staff/${encodeURIComponent(editingStaffId)}`
          : "/admin/staff",
        {
          method: editingStaffId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setNotice(
        editingStaffId ? "Staff member updated." : "Staff member added.",
      );
      router.push("/admin/staff");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleConfirmDeleteStaff(): Promise<void> {
    if (!staffDeleteTarget) {
      return;
    }

    setActionSubmitting("staff-delete");
    setError(null);
    setNotice(null);

    try {
      await apiFetch<StaffDetailPayload>(
        `/admin/staff/${encodeURIComponent(staffDeleteTarget.id)}`,
        {
          method: "DELETE",
        },
      );
      setNotice("Staff member deleted.");
      setStaffDeleteTarget(null);
      await loadStaffList();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setActionSubmitting(null);
    }
  }

  function getCategoryQueryString(includePagination: boolean): string {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(categoryPage));
      params.set("pageSize", String(categoryPageSize));
    }

    if (categorySearchQuery) {
      params.set("search", categorySearchQuery);
    }

    if (categoryStatusFilter !== "ALL") {
      params.set("status", categoryStatusFilter);
    }

    return params.toString();
  }

  function getServiceQueryString(includePagination: boolean): string {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(servicePage));
      params.set("pageSize", String(servicePageSize));
    }

    if (serviceSearchQuery) {
      params.set("search", serviceSearchQuery);
    }

    if (serviceStatusFilter !== "ALL") {
      params.set("status", serviceStatusFilter);
    }

    return params.toString();
  }

  function getPackageQueryString(includePagination: boolean): string {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(packagePage));
      params.set("pageSize", String(packagePageSize));
    }

    if (packageSearchQuery) {
      params.set("search", packageSearchQuery);
    }

    if (packageStatusFilter !== "ALL") {
      params.set("status", packageStatusFilter);
    }

    return params.toString();
  }

  async function loadCategoryList(): Promise<void> {
    setCategoryLoading(true);
    setError(null);

    try {
      const query = getCategoryQueryString(true);
      const payload = await apiFetch<CategoryListPayload>(
        `/admin/categories${query ? `?${query}` : ""}`,
      );
      setCategoryRows(payload.categories);
      setCategoryTotalCount(payload.pagination.totalCount);
    } catch (categoryError) {
      setError(getErrorMessage(categoryError));
      setCategoryRows([]);
      setCategoryTotalCount(0);
    } finally {
      setCategoryLoading(false);
    }
  }

  async function loadServiceList(): Promise<void> {
    setServiceLoading(true);
    setError(null);

    try {
      const query = getServiceQueryString(true);
      const payload = await apiFetch<ServiceListPayload>(
        `/admin/services${query ? `?${query}` : ""}`,
      );
      setServiceRows(payload.services);
      setServiceTotalCount(payload.pagination.totalCount);
    } catch (serviceError) {
      setError(getErrorMessage(serviceError));
      setServiceRows([]);
      setServiceTotalCount(0);
    } finally {
      setServiceLoading(false);
    }
  }

  async function loadPackageList(): Promise<void> {
    setPackageLoading(true);
    setError(null);

    try {
      const query = getPackageQueryString(true);
      const payload = await apiFetch<ServicePackageListPayload>(
        `/admin/packages${query ? `?${query}` : ""}`,
      );
      setPackageRows(payload.packages);
      setPackageTotalCount(payload.pagination.totalCount);
    } catch (packageError) {
      setError(getErrorMessage(packageError));
      setPackageRows([]);
      setPackageTotalCount(0);
    } finally {
      setPackageLoading(false);
    }
  }

  async function loadCategoryDetail(categoryId: string): Promise<void> {
    setCategoryLoading(true);
    setError(null);
    setCategoryDetail(null);

    try {
      const payload = await apiFetch<CategoryDetailPayload>(
        `/admin/categories/${encodeURIComponent(categoryId)}`,
      );
      setCategoryDetail(payload.category);
    } catch (categoryError) {
      setError(getErrorMessage(categoryError));
    } finally {
      setCategoryLoading(false);
    }
  }

  async function loadServiceDetail(serviceId: string): Promise<void> {
    setServiceLoading(true);
    setError(null);
    setServiceDetail(null);

    try {
      const payload = await apiFetch<ServiceDetailPayload>(
        `/admin/services/${encodeURIComponent(serviceId)}`,
      );
      setServiceDetail(payload.service);
    } catch (serviceError) {
      setError(getErrorMessage(serviceError));
    } finally {
      setServiceLoading(false);
    }
  }

  async function loadPackageDetail(packageId: string): Promise<void> {
    setPackageLoading(true);
    setError(null);
    setPackageDetail(null);

    try {
      const payload = await apiFetch<ServicePackageDetailPayload>(
        `/admin/packages/${encodeURIComponent(packageId)}`,
      );
      setPackageDetail(payload.package);
    } catch (packageError) {
      setError(getErrorMessage(packageError));
    } finally {
      setPackageLoading(false);
    }
  }

  async function loadHomepageConfig(): Promise<void> {
    setHomepageLoading(true);
    setError(null);

    try {
      const payload = await apiFetch<HomepagePayload>("/admin/homepage");
      setHomepageConfig(normalizeHomepageConfig(payload.homepage));
      setHomepageUpdatedAt(payload.updatedAt);
    } catch (homepageError) {
      setError(getErrorMessage(homepageError));
      setHomepageConfig(null);
      setHomepageUpdatedAt(null);
    } finally {
      setHomepageLoading(false);
    }
  }

  async function loadHomepageServiceOptions(): Promise<void> {
    if (!hasPermission(user, "services:view")) {
      setHomepageServiceOptions([]);
      setHomepageServiceOptionsLoading(false);
      return;
    }

    setHomepageServiceOptionsLoading(true);
    setHomepageServiceOptionsError(null);

    try {
      const payload = await apiFetch<ServiceListPayload>(
        "/admin/services?page=1&pageSize=100&status=PUBLISHED&sort=name_asc",
      );
      setHomepageServiceOptions(payload.services);
    } catch (serviceOptionError) {
      setHomepageServiceOptions([]);
      setHomepageServiceOptionsError(getErrorMessage(serviceOptionError));
    } finally {
      setHomepageServiceOptionsLoading(false);
    }
  }

  async function loadCatalogueOptionList(): Promise<void> {
    if (!(
      hasPermission(user, "categories:view") ||
      hasPermission(user, "categories:create") ||
      hasPermission(user, "categories:update") ||
      hasPermission(user, "services:view") ||
      hasPermission(user, "services:create") ||
      hasPermission(user, "services:update")
    )) {
      return;
    }

    const payload = await apiFetch<CatalogueOptionsPayload>(
      "/admin/catalogue/options",
    );
    setCategoryOptions(payload.categories);
  }

  async function loadAdminUserOptionList(): Promise<void> {
    if (!(
      hasPermission(user, "admin_users:view") ||
      hasPermission(user, "admin_users:create") ||
      hasPermission(user, "admin_users:update") ||
      hasPermission(user, "roles:view") ||
      hasPermission(user, "roles:manage_permissions")
    )) {
      return;
    }

    const payload = await apiFetch<AdminUserOptionsPayload>(
      "/admin/admin-users/options",
    );
    setRoleOptions(payload.roles);
  }

  async function loadPermissionList(): Promise<void> {
    if (!hasPermission(user, "roles:manage_permissions")) {
      return;
    }

    const payload = await apiFetch<PermissionsPayload>("/admin/permissions");
    setPermissions(payload.permissions);
  }

  function getAdminUserQueryString(includePagination: boolean): string {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(adminUserPage));
      params.set("pageSize", String(adminUserPageSize));
    }

    if (adminUserSearchQuery) {
      params.set("search", adminUserSearchQuery);
    }

    if (adminUserStatusFilter !== "ALL") {
      params.set("status", adminUserStatusFilter);
    }

    return params.toString();
  }

  function getRoleQueryString(includePagination: boolean): string {
    const params = new URLSearchParams();

    if (includePagination) {
      params.set("page", String(rolePage));
      params.set("pageSize", String(rolePageSize));
    }

    if (roleSearchQuery) {
      params.set("search", roleSearchQuery);
    }

    if (roleStatusFilter !== "ALL") {
      params.set("status", roleStatusFilter);
    }

    return params.toString();
  }

  async function loadAdminUserList(): Promise<void> {
    setAdminUserLoading(true);
    setError(null);

    try {
      const query = getAdminUserQueryString(true);
      const payload = await apiFetch<AdminUserListPayload>(
        `/admin/admin-users${query ? `?${query}` : ""}`,
      );
      setAdminUserRows(payload.users);
      setAdminUserTotalCount(payload.pagination.totalCount);
    } catch (userError) {
      setError(getErrorMessage(userError));
      setAdminUserRows([]);
      setAdminUserTotalCount(0);
    } finally {
      setAdminUserLoading(false);
    }
  }

  async function loadAdminUserDetail(userId: string): Promise<void> {
    setAdminUserLoading(true);
    setError(null);
    setAdminUserDetail(null);

    try {
      const payload = await apiFetch<AdminUserDetailPayload>(
        `/admin/admin-users/${encodeURIComponent(userId)}`,
      );
      setAdminUserDetail(payload.user);
    } catch (userError) {
      setError(getErrorMessage(userError));
    } finally {
      setAdminUserLoading(false);
    }
  }

  async function loadRoleList(): Promise<void> {
    setRoleLoading(true);
    setError(null);

    try {
      const query = getRoleQueryString(true);
      const payload = await apiFetch<AdminRoleListPayload>(
        `/admin/roles${query ? `?${query}` : ""}`,
      );
      setRoleRows(payload.roles);
      setRoleTotalCount(payload.pagination.totalCount);
    } catch (roleError) {
      setError(getErrorMessage(roleError));
      setRoleRows([]);
      setRoleTotalCount(0);
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadRoleDetail(roleId: string): Promise<void> {
    setRoleLoading(true);
    setError(null);
    setRoleDetail(null);

    try {
      const payload = await apiFetch<AdminRoleDetailPayload>(
        `/admin/roles/${encodeURIComponent(roleId)}`,
      );
      setRoleDetail(payload.role);
    } catch (roleError) {
      setError(getErrorMessage(roleError));
    } finally {
      setRoleLoading(false);
    }
  }

  async function uploadImageFile(file: File): Promise<MediaImage> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose an image file.");
    }

    const dataBase64 = await readFileAsDataUrl(file);
    const payload = await apiFetch<MediaUploadPayload>("/admin/media/images", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        dataBase64,
        altText: file.name,
      }),
    });

    return payload.image;
  }

  async function handleCategoryImageFiles(
    files: FileList | File[],
  ): Promise<void> {
    const image = Array.from(files).at(0);

    if (!image) {
      return;
    }

    setActionSubmitting("category-image-upload");
    setError(null);

    try {
      setCategoryImage(await uploadImageFile(image));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleServiceMainImageFiles(
    files: FileList | File[],
  ): Promise<void> {
    const image = Array.from(files).at(0);

    if (!image) {
      return;
    }

    setActionSubmitting("service-main-image-upload");
    setError(null);

    try {
      setServiceMainImage(await uploadImageFile(image));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleServiceGalleryImageFiles(
    files: FileList | File[],
  ): Promise<void> {
    const images = Array.from(files);

    if (images.length === 0) {
      return;
    }

    setActionSubmitting("service-gallery-image-upload");
    setError(null);

    try {
      const uploadedImages: MediaImage[] = [];

      for (const image of images.slice(0, 12)) {
        uploadedImages.push(await uploadImageFile(image));
      }

      setServiceGalleryImages((currentImages) => {
        const mergedImages = [...currentImages];

        for (const uploadedImage of uploadedImages) {
          if (!mergedImages.some((image) => image.id === uploadedImage.id)) {
            mergedImages.push(uploadedImage);
          }
        }

        return mergedImages.slice(0, 12);
      });
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setActionSubmitting(null);
    }
  }

  function handleImageInputChange(
    event: ChangeEvent<HTMLInputElement>,
    handler: (files: FileList) => Promise<void>,
  ): void {
    const { files } = event.currentTarget;

    if (files) {
      void handler(files);
    }

    event.currentTarget.value = "";
  }

  function handleImageDrop(
    event: DragEvent<HTMLLabelElement>,
    handler: (files: FileList) => Promise<void>,
  ): void {
    event.preventDefault();
    void handler(event.dataTransfer.files);
  }

  function updateHomepageTextBlock(
    block: "offers" | "categories" | "services" | "trust",
    field: keyof HomepageTextBlock,
    value: string,
  ): void {
    setHomepageConfig((currentConfig) =>
      currentConfig
        ? {
            ...currentConfig,
            [block]: {
              ...currentConfig[block],
              [field]: value,
            },
          }
        : currentConfig,
    );
  }

  function updateHomepageHeroField(
    field: keyof HomepageHeroBlock,
    value: string,
  ): void {
    setHomepageConfig((currentConfig) =>
      currentConfig
        ? {
            ...currentConfig,
            hero: {
              ...currentConfig.hero,
              [field]: value,
            },
          }
        : currentConfig,
    );
  }

  function updateHomepageHighlightsField(
    field: keyof HomepageTextBlock,
    value: string,
  ): void {
    setHomepageConfig((currentConfig) =>
      currentConfig
        ? {
            ...currentConfig,
            highlights: {
              ...currentConfig.highlights,
              [field]: value,
            },
          }
        : currentConfig,
    );
  }

  function updateHomepageHighlightCardText(
    cardIndex: number,
    field: "title" | "subtitle" | "label" | "mediaUrl" | "videoUrl" | "linkUrl",
    value: string,
  ): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        highlights: {
          ...currentConfig.highlights,
          cards: currentConfig.highlights.cards.map((card, index) =>
            index === cardIndex ? { ...card, [field]: value } : card,
          ),
        },
      };
    });
  }

  function updateHomepageHighlightCardStatus(
    cardIndex: number,
    status: PublishStatus,
  ): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        highlights: {
          ...currentConfig.highlights,
          cards: currentConfig.highlights.cards.map((card, index) =>
            index === cardIndex ? { ...card, status } : card,
          ),
        },
      };
    });
  }

  function updateHomepageHighlightCardSortOrder(
    cardIndex: number,
    value: string,
  ): void {
    const sortOrder = Math.max(0, Number.parseInt(value || "0", 10) || 0);

    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        highlights: {
          ...currentConfig.highlights,
          cards: currentConfig.highlights.cards.map((card, index) =>
            index === cardIndex ? { ...card, sortOrder } : card,
          ),
        },
      };
    });
  }

  function addHomepageHighlightCard(): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      const nextCard: HomepageHighlightCard = {
        id: `highlight-${Date.now()}`,
        title: "New homepage highlight",
        subtitle: "",
        label: "Tap to explore",
        mediaUrl: "",
        videoUrl: "",
        linkUrl: "/services",
        status: "DRAFT",
        sortOrder: currentConfig.highlights.cards.length,
      };

      return {
        ...currentConfig,
        highlights: {
          ...currentConfig.highlights,
          cards: [...currentConfig.highlights.cards, nextCard].slice(0, 12),
        },
      };
    });
  }

  function removeHomepageHighlightCard(cardIndex: number): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        highlights: {
          ...currentConfig.highlights,
          cards: currentConfig.highlights.cards.filter(
            (_card, index) => index !== cardIndex,
          ),
        },
      };
    });
  }

  function updateHomepageServiceSectionText(
    sectionIndex: number,
    field: "title" | "subtitle",
    value: string,
  ): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        serviceSections: currentConfig.serviceSections.map((section, index) =>
          index === sectionIndex ? { ...section, [field]: value } : section,
        ),
      };
    });
  }

  function updateHomepageServiceSectionStatus(
    sectionIndex: number,
    status: PublishStatus,
  ): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        serviceSections: currentConfig.serviceSections.map((section, index) =>
          index === sectionIndex ? { ...section, status } : section,
        ),
      };
    });
  }

  function updateHomepageServiceSectionSortOrder(
    sectionIndex: number,
    value: string,
  ): void {
    const sortOrder = Math.max(0, Number.parseInt(value || "0", 10) || 0);

    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        serviceSections: currentConfig.serviceSections.map((section, index) =>
          index === sectionIndex ? { ...section, sortOrder } : section,
        ),
      };
    });
  }

  function toggleHomepageSectionService(
    sectionIndex: number,
    serviceId: string,
  ): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        serviceSections: currentConfig.serviceSections.map((section, index) => {
          if (index !== sectionIndex) {
            return section;
          }

          const selected = new Set(section.serviceIds);
          if (selected.has(serviceId)) {
            selected.delete(serviceId);
          } else if (selected.size < 24) {
            selected.add(serviceId);
          }

          return {
            ...section,
            serviceIds: Array.from(selected),
          };
        }),
      };
    });
  }

  function addHomepageServiceSection(): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      const firstServiceId = homepageServiceOptions[0]?.id;
      const nextSection: HomepageServiceSection = {
        id: `service-section-${Date.now()}`,
        title: "Facials under 1299",
        subtitle: "",
        serviceIds: firstServiceId ? [firstServiceId] : [],
        status: "DRAFT",
        sortOrder: currentConfig.serviceSections.length,
      };

      return {
        ...currentConfig,
        serviceSections: [...currentConfig.serviceSections, nextSection].slice(
          0,
          12,
        ),
      };
    });
  }

  function removeHomepageServiceSection(sectionIndex: number): void {
    setHomepageConfig((currentConfig) => {
      if (!currentConfig) {
        return currentConfig;
      }

      return {
        ...currentConfig,
        serviceSections: currentConfig.serviceSections.filter(
          (_section, index) => index !== sectionIndex,
        ),
      };
    });
  }

  function applyRichTextCommand(
    command: "bold" | "italic" | "insertUnorderedList" | "formatBlock",
    value?: string,
  ): void {
    richTextEditorRef.current?.focus();
    document.execCommand(command, false, value);
    setServiceDescriptionHtml(richTextEditorRef.current?.innerHTML ?? "");
  }

  async function handleCategorySearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setCategoryPage(1);
    setCategorySearchQuery(categorySearchInput.trim());
  }

  async function handleServiceSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setServicePage(1);
    setServiceSearchQuery(serviceSearchInput.trim());
  }

  async function handlePackageSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setPackagePage(1);
    setPackageSearchQuery(packageSearchInput.trim());
  }

  function handleCategoryPageSizeChange(nextPageSize: number): void {
    setCategoryPage(1);
    setCategoryPageSize(nextPageSize);
  }

  function handleServicePageSizeChange(nextPageSize: number): void {
    setServicePage(1);
    setServicePageSize(nextPageSize);
  }

  function handlePackagePageSizeChange(nextPageSize: number): void {
    setPackagePage(1);
    setPackagePageSize(nextPageSize);
  }

  async function handleAdminUserSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setAdminUserPage(1);
    setAdminUserSearchQuery(adminUserSearchInput.trim());
  }

  async function handleRoleSearch(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setRolePage(1);
    setRoleSearchQuery(roleSearchInput.trim());
  }

  function handleAdminUserPageSizeChange(nextPageSize: number): void {
    setAdminUserPage(1);
    setAdminUserPageSize(nextPageSize);
  }

  function handleRolePageSizeChange(nextPageSize: number): void {
    setRolePage(1);
    setRolePageSize(nextPageSize);
  }

  async function handleExportCatalogue(
    area: "categories" | "services",
  ): Promise<void> {
    const isCategoryExport = area === "categories";
    const query = isCategoryExport
      ? getCategoryQueryString(false)
      : getServiceQueryString(false);
    const exportKey = isCategoryExport ? "category-export" : "service-export";
    const resourcePath = isCategoryExport ? "categories" : "services";
    const filenamePrefix = isCategoryExport
      ? "replica-categories"
      : "replica-services";

    setActionSubmitting(exportKey);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `${API_BASE}/admin/${resourcePath}/export${query ? `?${query}` : ""}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const apiError = getApiError(payload);
        throw new ApiRequestError(
          apiError?.message ?? "Catalogue export failed.",
          response.status,
          apiError?.code ?? "REQUEST_FAILED",
          apiError?.requestId ?? null,
        );
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setNotice(`${cataloguePluralLabel} export downloaded.`);
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleExportAdminUsers(): Promise<void> {
    const query = getAdminUserQueryString(false);

    setActionSubmitting("admin-user-export");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `${API_BASE}/admin/admin-users/export${query ? `?${query}` : ""}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const apiError = getApiError(payload);
        throw new ApiRequestError(
          apiError?.message ?? "User export failed.",
          response.status,
          apiError?.code ?? "REQUEST_FAILED",
          apiError?.requestId ?? null,
        );
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `replica-admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setNotice("Users export downloaded.");
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleExportRoles(): Promise<void> {
    const query = getRoleQueryString(false);

    setActionSubmitting("role-export");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `${API_BASE}/admin/roles/export${query ? `?${query}` : ""}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const apiError = getApiError(payload);
        throw new ApiRequestError(
          apiError?.message ?? "Role export failed.",
          response.status,
          apiError?.code ?? "REQUEST_FAILED",
          apiError?.requestId ?? null,
        );
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `replica-roles-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setNotice("Roles export downloaded.");
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSaveHomepage(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!homepageConfig) {
      return;
    }

    setActionSubmitting("homepage-update");
    setError(null);
    setNotice(null);

    try {
      const payload = await apiFetch<HomepagePayload>("/admin/homepage", {
        method: "PUT",
        body: JSON.stringify(homepageConfig),
      });

      setHomepageConfig(normalizeHomepageConfig(payload.homepage));
      setHomepageUpdatedAt(payload.updatedAt);
      setNotice("Homepage content updated.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSaveCategory(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editingCategoryId =
      cataloguePageMode === "edit" && catalogueArea === "categories"
        ? catalogueRoute?.recordId
        : null;

    setActionSubmitting(
      editingCategoryId ? "category-update" : "category-create",
    );
    setError(null);
    setNotice(null);

    try {
      await apiFetch<CategoryDetailPayload>(
        editingCategoryId
          ? `/admin/categories/${encodeURIComponent(editingCategoryId)}`
          : "/admin/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          body: JSON.stringify({
            name: getFormString(formData, "category-name"),
            parentId: getOptionalFormString(formData, "category-parent-id"),
            description: getOptionalFormString(
              formData,
              "category-description",
            ),
            imageAssetId: categoryImage?.id,
            status: getPublishStatus(
              getFormString(formData, "category-status"),
            ),
          }),
        },
      );
      await loadCatalogueOptionList();
      setNotice(editingCategoryId ? "Category updated." : "Category added.");
      router.push(getCatalogueAreaPath("categories"));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSaveService(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editingServiceId =
      cataloguePageMode === "edit" && catalogueArea === "services"
        ? catalogueRoute?.recordId
        : null;
    const pricePaise = parseDecimalToScaledInteger(
      getFormString(formData, "service-price"),
      100,
    );
    const gstInput = getOptionalFormString(formData, "service-gst-rate");
    const compareAtInput = getOptionalFormString(
      formData,
      "service-compare-at-price",
    );
    const compareAtPricePaise = compareAtInput
      ? parseDecimalToScaledInteger(compareAtInput, 100)
      : undefined;
    const gstRateBps = gstInput
      ? parseDecimalToScaledInteger(gstInput, 100)
      : undefined;
    const dealEnabled = formData.get("service-deal-enabled") === "on";
    const dealPriceInput = getOptionalFormString(
      formData,
      "service-deal-price",
    );
    const dealPricePaise = dealPriceInput
      ? parseDecimalToScaledInteger(dealPriceInput, 100)
      : undefined;
    const dealStartsAtInput = getOptionalFormString(
      formData,
      "service-deal-starts-at",
    );
    const dealEndsAtInput = getOptionalFormString(
      formData,
      "service-deal-ends-at",
    );
    const dealStartsAt = datetimeLocalToIso(dealStartsAtInput);
    const dealEndsAt = datetimeLocalToIso(dealEndsAtInput);
    const sortOrder = Number(getFormString(formData, "service-sort-order"));
    const tiers = buildServiceTierPayloads(formData);

    setActionSubmitting(editingServiceId ? "service-update" : "service-create");
    setError(null);
    setNotice(null);

    if (
      pricePaise === null ||
      gstRateBps === null ||
      compareAtPricePaise === null ||
      dealPricePaise === null
    ) {
      setError(
        "Enter service price, MRP, GST and deal price with up to 2 decimal places.",
      );
      setActionSubmitting(null);
      return;
    }

    if (!tiers) {
      setError(
        "Enter valid Premium and Luxury tier prices, durations, MRP and sort order.",
      );
      setActionSubmitting(null);
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Enter a whole-number homepage sort order.");
      setActionSubmitting(null);
      return;
    }

    if (compareAtPricePaise !== undefined && compareAtPricePaise < pricePaise) {
      setError("MRP / compare-at price cannot be lower than selling price.");
      setActionSubmitting(null);
      return;
    }

    if (dealPricePaise !== undefined && dealPricePaise > pricePaise) {
      setError("Deal price cannot be higher than the selling price.");
      setActionSubmitting(null);
      return;
    }

    if (dealEnabled && (!dealStartsAtInput || !dealEndsAtInput)) {
      setError("Choose the deal start and end date/time.");
      setActionSubmitting(null);
      return;
    }

    if (dealEnabled && (!dealStartsAt || !dealEndsAt)) {
      setError("Choose a valid deal start and end date/time.");
      setActionSubmitting(null);
      return;
    }

    if (
      dealStartsAt &&
      dealEndsAt &&
      new Date(dealStartsAt).getTime() >= new Date(dealEndsAt).getTime()
    ) {
      setError("Deal end date/time must be after the start date/time.");
      setActionSubmitting(null);
      return;
    }

    try {
      await apiFetch<ServiceDetailPayload>(
        editingServiceId
          ? `/admin/services/${encodeURIComponent(editingServiceId)}`
          : "/admin/services",
        {
          method: editingServiceId ? "PATCH" : "POST",
          body: JSON.stringify({
            categoryId: getFormString(formData, "service-category-id"),
            name: getFormString(formData, "service-name"),
            shortDescription: getOptionalFormString(
              formData,
              "service-short-description",
            ),
            fullDescription: serviceDescriptionHtml,
            durationMinutes: Number(
              getFormString(formData, "service-duration-minutes"),
            ),
            pricePaise,
            compareAtPricePaise,
            gstRateBps,
            featured: formData.get("service-featured") === "on",
            sortOrder,
            dealEnabled,
            dealPricePaise,
            dealStartsAt: dealEnabled ? dealStartsAt : undefined,
            dealEndsAt: dealEnabled ? dealEndsAt : undefined,
            mainImageAssetId: serviceMainImage?.id,
            imageAssetIds: serviceGalleryImages.map((image) => image.id),
            tiers,
            status: getPublishStatus(getFormString(formData, "service-status")),
          }),
        },
      );
      setNotice(editingServiceId ? "Service updated." : "Service added.");
      router.push(getCatalogueAreaPath("services"));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSavePackage(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editingPackageId =
      cataloguePageMode === "edit" && catalogueArea === "packages"
        ? catalogueRoute?.recordId
        : null;
    const minPricePaise = parseDecimalToScaledInteger(
      getFormString(formData, "package-min-price"),
      100,
    );
    const compareAtInput = getOptionalFormString(
      formData,
      "package-compare-at-price",
    );
    const compareAtPricePaise = compareAtInput
      ? parseDecimalToScaledInteger(compareAtInput, 100)
      : undefined;
    const discountBps = parseDecimalToScaledInteger(
      getFormString(formData, "package-discount-percent") || "0",
      100,
    );
    const durationMinutes = Number(
      getFormString(formData, "package-duration-minutes"),
    );
    const sortOrder = Number(getFormString(formData, "package-sort-order"));
    const items = buildPackageItemPayloads(formData);

    setActionSubmitting(editingPackageId ? "package-update" : "package-create");
    setError(null);
    setNotice(null);

    if (
      minPricePaise === null ||
      compareAtPricePaise === null ||
      discountBps === null ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError(
        "Enter valid package price, MRP, discount, duration and sort order.",
      );
      setActionSubmitting(null);
      return;
    }

    if (
      compareAtPricePaise !== undefined &&
      compareAtPricePaise < minPricePaise
    ) {
      setError("Package MRP cannot be lower than minimum package price.");
      setActionSubmitting(null);
      return;
    }

    if (discountBps < 0 || discountBps > 10_000) {
      setError("Package discount must be between 0% and 100%.");
      setActionSubmitting(null);
      return;
    }

    if (!items || items.length === 0) {
      setError(
        "Add at least one package service with valid quantity and minimum quantity.",
      );
      setActionSubmitting(null);
      return;
    }

    try {
      await apiFetch<ServicePackageDetailPayload>(
        editingPackageId
          ? `/admin/packages/${encodeURIComponent(editingPackageId)}`
          : "/admin/packages",
        {
          method: editingPackageId ? "PATCH" : "POST",
          body: JSON.stringify({
            categoryId: getFormString(formData, "package-category-id"),
            name: getFormString(formData, "package-name"),
            description: getOptionalFormString(formData, "package-description"),
            minPricePaise,
            compareAtPricePaise,
            discountBps,
            durationMinutes,
            inclusions: parseTextList(
              getFormString(formData, "package-inclusions"),
            ),
            items,
            status: getPublishStatus(getFormString(formData, "package-status")),
            sortOrder,
          }),
        },
      );
      setNotice(editingPackageId ? "Package updated." : "Package added.");
      router.push(getCatalogueAreaPath("packages"));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSaveAdminUser(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editingUserId =
      userManagementPageMode === "edit" && userManagementArea === "users"
        ? userManagementRoute?.recordId
        : null;
    const roleIds = formData
      .getAll("admin-user-role-ids")
      .filter((value): value is string => typeof value === "string");
    const temporaryPassword = getOptionalFormString(
      formData,
      "admin-user-temporary-password",
    );

    setActionSubmitting(
      editingUserId ? "admin-user-update" : "admin-user-create",
    );
    setError(null);
    setNotice(null);

    try {
      await apiFetch<AdminUserDetailPayload>(
        editingUserId
          ? `/admin/admin-users/${encodeURIComponent(editingUserId)}`
          : "/admin/admin-users",
        {
          method: editingUserId ? "PATCH" : "POST",
          body: JSON.stringify({
            name: getFormString(formData, "admin-user-name"),
            email: getOptionalFormString(formData, "admin-user-email"),
            phone: getOptionalFormString(formData, "admin-user-phone"),
            status: getUserStatus(getFormString(formData, "admin-user-status")),
            roleIds,
            ...(temporaryPassword ? { temporaryPassword } : {}),
          }),
        },
      );
      setNotice(editingUserId ? "User updated." : "User added.");
      router.push(getUserManagementAreaPath("users"));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleSaveRole(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editingRoleId =
      userManagementPageMode === "edit" && userManagementArea === "roles"
        ? userManagementRoute?.recordId
        : null;
    const permissionKeys = getSelectedPermissionKeys(formData);

    setActionSubmitting(editingRoleId ? "role-update" : "role-create");
    setError(null);
    setNotice(null);

    try {
      await apiFetch<AdminRoleDetailPayload>(
        editingRoleId
          ? `/admin/roles/${encodeURIComponent(editingRoleId)}`
          : "/admin/roles",
        {
          method: editingRoleId ? "PATCH" : "POST",
          body: JSON.stringify({
            name: getFormString(formData, "role-name"),
            description: getOptionalFormString(formData, "role-description"),
            permissionKeys,
          }),
        },
      );
      setNotice(editingRoleId ? "Role updated." : "Role added.");
      router.push(getUserManagementAreaPath("roles"));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleConfirmDeleteCatalogue(): Promise<void> {
    if (!catalogueDeleteTarget) {
      return;
    }

    const actionKey =
      catalogueDeleteTarget.area === "categories"
        ? "category-delete"
        : catalogueDeleteTarget.area === "services"
          ? "service-delete"
          : "package-delete";
    const resourcePath =
      catalogueDeleteTarget.area === "categories"
        ? "categories"
        : catalogueDeleteTarget.area === "services"
          ? "services"
          : "packages";
    const deletedLabel =
      catalogueDeleteTarget.area === "categories"
        ? "Category"
        : catalogueDeleteTarget.area === "services"
          ? "Service"
          : "Package";

    setActionSubmitting(actionKey);
    setError(null);
    setNotice(null);

    try {
      await apiFetch<
        | CategoryDetailPayload
        | ServiceDetailPayload
        | ServicePackageDetailPayload
      >(
        `/admin/${resourcePath}/${encodeURIComponent(catalogueDeleteTarget.row.id)}`,
        { method: "DELETE" },
      );
      setNotice(`${deletedLabel} deleted.`);
      setCatalogueDeleteTarget(null);

      if (catalogueDeleteTarget.area === "categories") {
        await loadCategoryList();
        await loadCatalogueOptionList();
      } else if (catalogueDeleteTarget.area === "services") {
        await loadServiceList();
      } else {
        await loadPackageList();
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setActionSubmitting(null);
    }
  }

  async function handleConfirmDeleteUserManagement(): Promise<void> {
    if (!userManagementDeleteTarget) {
      return;
    }

    const isUserTarget = userManagementDeleteTarget.area === "users";
    const actionKey = isUserTarget ? "admin-user-delete" : "role-delete";
    const resourcePath = isUserTarget ? "admin-users" : "roles";

    setActionSubmitting(actionKey);
    setError(null);
    setNotice(null);

    try {
      await apiFetch<AdminUserDetailPayload | AdminRoleDetailPayload>(
        `/admin/${resourcePath}/${encodeURIComponent(userManagementDeleteTarget.row.id)}`,
        { method: "DELETE" },
      );
      setNotice(isUserTarget ? "User deactivated." : "Role archived.");
      setUserManagementDeleteTarget(null);

      if (isUserTarget) {
        await loadAdminUserList();
      } else {
        await loadRoleList();
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setActionSubmitting(null);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadSession(): Promise<void> {
      setBootstrapping(true);
      setError(null);

      try {
        const me = await apiFetch<MePayload>("/admin/auth/me");

        if (ignore) {
          return;
        }

        setUser(me.user);
        await loadDashboardAndModule(activeModule, me.user);
      } catch (loadError) {
        if (!ignore) {
          const apiError =
            loadError instanceof ApiRequestError ? loadError : null;
          setUser(null);
          setDashboard(null);
          setModuleSnapshot(null);
          setError(
            apiError?.status === 401 ? null : getErrorMessage(loadError),
          );
        }
      } finally {
        if (!ignore) {
          setBootstrapping(false);
        }
      }
    }

    void loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!user || !routeModule || routeModule === activeModule) {
      return;
    }

    setActiveModule(routeModule);
    setModuleLoading(true);
    setError(null);
    setNotice(null);

    apiFetch<ModuleSnapshot>(`/admin/operations/${routeModule}`)
      .then(async (snapshotPayload) => {
        setModuleSnapshot(snapshotPayload);
        await loadModuleOptions(routeModule, user);
      })
      .catch((moduleError: unknown) => {
        setError(getErrorMessage(moduleError));
      })
      .finally(() => {
        setModuleLoading(false);
      });
  }, [activeModule, routeModule, user]);

  useEffect(() => {
    if (!user || !isStaffRoute) {
      return;
    }

    if (staffPageMode === "list") {
      void loadStaffList();
      return;
    }

    void loadHomepageServiceOptions();

    if (staffPageMode === "create") {
      setStaffDetail(null);
      setStaffLoading(false);
      return;
    }

    if (staffRoute?.staffId) {
      void loadStaffDetail(staffRoute.staffId);
    }
  }, [
    isStaffRoute,
    staffPage,
    staffPageMode,
    staffPageSize,
    staffRoute?.staffId,
    staffSearchQuery,
    staffStatusFilter,
    user,
  ]);

  useEffect(() => {
    if (!user || !isCatalogueRoute) {
      return;
    }

    if (catalogueArea === "homepage") {
      if (canViewHomepage || canUpdateHomepage) {
        void loadHomepageConfig();
        void loadHomepageServiceOptions();
      } else {
        setHomepageConfig(null);
        setHomepageUpdatedAt(null);
        setHomepageServiceOptions([]);
        setHomepageLoading(false);
      }

      return;
    }

    if (catalogueArea === "categories") {
      if (cataloguePageMode === "list") {
        void loadCategoryList();
        return;
      }

      void loadCatalogueOptionList();

      if (cataloguePageMode === "create") {
        setCategoryDetail(null);
        setCategoryLoading(false);
        return;
      }

      if (catalogueRoute?.recordId) {
        void loadCategoryDetail(catalogueRoute.recordId);
      }

      return;
    }

    if (catalogueArea === "packages") {
      void loadCatalogueOptionList();
      void loadHomepageServiceOptions();

      if (cataloguePageMode === "list") {
        void loadPackageList();
        return;
      }

      if (cataloguePageMode === "create") {
        setPackageDetail(null);
        setPackageLoading(false);
        return;
      }

      if (catalogueRoute?.recordId) {
        void loadPackageDetail(catalogueRoute.recordId);
      }

      return;
    }

    void loadCatalogueOptionList();

    if (cataloguePageMode === "list") {
      void loadServiceList();
      return;
    }

    if (cataloguePageMode === "create") {
      setServiceDetail(null);
      setServiceLoading(false);
      return;
    }

    if (catalogueRoute?.recordId) {
      void loadServiceDetail(catalogueRoute.recordId);
    }
  }, [
    catalogueArea,
    cataloguePageMode,
    catalogueRoute?.recordId,
    categoryPage,
    categoryPageSize,
    categorySearchQuery,
    categoryStatusFilter,
    canUpdateHomepage,
    canViewHomepage,
    isCatalogueRoute,
    packagePage,
    packagePageSize,
    packageSearchQuery,
    packageStatusFilter,
    servicePage,
    servicePageSize,
    serviceSearchQuery,
    serviceStatusFilter,
    user,
  ]);

  useEffect(() => {
    if (!user || !isUserManagementRoute) {
      return;
    }

    if (userManagementArea === "users") {
      if (userManagementPageMode === "list") {
        void loadAdminUserList();
        void loadAdminUserOptionList();
        return;
      }

      void loadAdminUserOptionList();

      if (userManagementPageMode === "create") {
        setAdminUserDetail(null);
        setAdminUserLoading(false);
        return;
      }

      if (userManagementRoute?.recordId) {
        void loadAdminUserDetail(userManagementRoute.recordId);
      }

      return;
    }

    if (userManagementPageMode === "list") {
      void loadRoleList();
      return;
    }

    void loadPermissionList();

    if (userManagementPageMode === "create") {
      setRoleDetail(null);
      setRoleLoading(false);
      return;
    }

    if (userManagementRoute?.recordId) {
      void loadRoleDetail(userManagementRoute.recordId);
    }
  }, [
    adminUserPage,
    adminUserPageSize,
    adminUserSearchQuery,
    adminUserStatusFilter,
    isUserManagementRoute,
    rolePage,
    rolePageSize,
    roleSearchQuery,
    roleStatusFilter,
    user,
    userManagementArea,
    userManagementPageMode,
    userManagementRoute?.recordId,
  ]);

  useEffect(() => {
    if (!user || !isReviewsRoute) {
      return;
    }

    void loadReviewList();
  }, [
    isReviewsRoute,
    reviewPage,
    reviewPageSize,
    reviewSearchQuery,
    reviewStatusFilter,
    user,
  ]);

  useEffect(() => {
    if (!user || !isPaymentsRoute) {
      return;
    }

    void loadPaymentList();
  }, [
    canViewPayments,
    isPaymentsRoute,
    paymentPage,
    paymentPageSize,
    paymentProviderFilter,
    paymentSearchQuery,
    paymentSort,
    paymentStatusFilter,
    user,
  ]);

  useEffect(() => {
    if (!user || !isBookingsRoute) {
      return;
    }

    void loadBookingList();
    void loadBookingStaffOptions();
  }, [
    bookingPage,
    bookingPageSize,
    bookingSearchQuery,
    bookingSort,
    bookingStatusFilter,
    canAssignBookings,
    canViewBookings,
    canViewStaff,
    isBookingsRoute,
    user,
  ]);

  useEffect(() => {
    if (!isCatalogueRoute || catalogueArea !== "categories") {
      return;
    }

    if (cataloguePageMode === "create") {
      setCategoryImage(null);
      return;
    }

    if (cataloguePageMode === "edit" && categoryDetail) {
      setCategoryImage(
        categoryDetail.imageAssetId && categoryDetail.imageUrl
          ? {
              id: categoryDetail.imageAssetId,
              url: categoryDetail.imageUrl,
              altText: categoryDetail.name,
            }
          : null,
      );
    }
  }, [catalogueArea, cataloguePageMode, categoryDetail, isCatalogueRoute]);

  useEffect(() => {
    if (!isCatalogueRoute || catalogueArea !== "services") {
      return;
    }

    if (cataloguePageMode === "create") {
      setServiceMainImage(null);
      setServiceGalleryImages([]);
      setServiceDescriptionHtml("");
      return;
    }

    if (cataloguePageMode === "edit" && serviceDetail) {
      setServiceMainImage(serviceDetail.mainImage);
      setServiceGalleryImages(serviceDetail.galleryImages);
      setServiceDescriptionHtml(serviceDetail.fullDescription ?? "");
    }
  }, [catalogueArea, cataloguePageMode, isCatalogueRoute, serviceDetail]);

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const auth = await apiFetch<AuthPayload>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      setUser(auth.user);
      setPassword("");
      await loadDashboardAndModule(activeModule, auth.user);
      setNotice("Signed in.");
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
      setBootstrapping(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setRefreshing(true);
    setError(null);
    setNotice(null);

    try {
      await apiFetch<{ ok: boolean }>("/admin/auth/logout", {
        method: "POST",
      });
      setUser(null);
      setDashboard(null);
      setModuleSnapshot(null);
      setNotice("Signed out.");
    } catch (logoutError) {
      setError(getErrorMessage(logoutError));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    setError(null);
    setNotice(null);

    try {
      if (isStaffRoute) {
        if (staffPageMode === "list") {
          await loadStaffList();
        } else if (staffRoute?.staffId) {
          await loadStaffDetail(staffRoute.staffId);
          await loadHomepageServiceOptions();
        } else {
          await loadHomepageServiceOptions();
        }
      } else if (isCatalogueRoute) {
        if (catalogueArea === "categories") {
          if (cataloguePageMode === "list") {
            await loadCategoryList();
          } else if (catalogueRoute?.recordId) {
            await loadCategoryDetail(catalogueRoute.recordId);
          }
          await loadCatalogueOptionList();
        } else if (catalogueArea === "services") {
          if (cataloguePageMode === "list") {
            await loadServiceList();
          } else if (catalogueRoute?.recordId) {
            await loadServiceDetail(catalogueRoute.recordId);
          }
          await loadCatalogueOptionList();
        } else if (catalogueArea === "packages") {
          if (cataloguePageMode === "list") {
            await loadPackageList();
          } else if (catalogueRoute?.recordId) {
            await loadPackageDetail(catalogueRoute.recordId);
          }
          await loadCatalogueOptionList();
          await loadHomepageServiceOptions();
        }
      } else if (isUserManagementRoute) {
        if (userManagementArea === "users") {
          if (userManagementPageMode === "list") {
            await loadAdminUserList();
          } else if (userManagementRoute?.recordId) {
            await loadAdminUserDetail(userManagementRoute.recordId);
          }
          await loadAdminUserOptionList();
        } else {
          if (userManagementPageMode === "list") {
            await loadRoleList();
          } else if (userManagementRoute?.recordId) {
            await loadRoleDetail(userManagementRoute.recordId);
          }
          await loadPermissionList();
        }
      } else if (isReviewsRoute) {
        await loadReviewList();
      } else if (isPaymentsRoute) {
        await loadPaymentList();
        if (paymentDetail) {
          await loadPaymentDetail(paymentDetail.id);
        }
      } else if (isBookingsRoute) {
        await loadBookingList();
        await loadBookingStaffOptions();
      } else {
        await loadDashboardAndModule(activeModule, user);
      }
      setNotice("Data refreshed.");
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setRefreshing(false);
    }
  }

  async function selectModule(moduleKey: AdminModuleKey): Promise<void> {
    setActiveModule(moduleKey);
    setModuleLoading(true);
    setError(null);
    setNotice(null);
    router.push(getModulePath(moduleKey));

    try {
      setModuleSnapshot(
        await apiFetch<ModuleSnapshot>(`/admin/operations/${moduleKey}`),
      );
      await loadModuleOptions(moduleKey, user);
      setNavOpen(false);
    } catch (moduleError) {
      setError(getErrorMessage(moduleError));
    } finally {
      setModuleLoading(false);
    }
  }

  function selectCatalogueArea(area: CatalogueArea): void {
    setActiveModule("catalogue");
    setModuleLoading(false);
    setError(null);
    setNotice(null);
    setNavOpen(false);
    router.push(getCatalogueAreaPath(area));
  }

  function selectDashboard(): void {
    setModuleLoading(false);
    setError(null);
    setNotice(null);
    setNavOpen(false);
    router.push("/admin");
  }

  function selectUserManagementArea(area: UserManagementArea): void {
    setModuleLoading(false);
    setError(null);
    setNotice(null);
    setNavOpen(false);
    router.push(getUserManagementAreaPath(area));
  }

  function renderStaffListPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Staff list">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleStaffSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="staff-search">
                Search staff
              </label>
              <input
                className="text-field"
                id="staff-search"
                name="staff-search"
                onChange={(event) => setStaffSearchInput(event.target.value)}
                placeholder="Name, code, email or phone"
                type="search"
                value={staffSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="staff-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="staff-status-filter"
                name="staff-status-filter"
                onChange={(event) => {
                  setStaffPage(1);
                  setStaffStatusFilter(
                    getStaffStatusFilter(event.currentTarget.value),
                  );
                }}
                value={staffStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="INVITED">Invited</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={staffLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            {canExportStaff ? (
              <button
                className="secondary-button"
                disabled={actionSubmitting === "staff-export"}
                onClick={() => void handleExportStaff()}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                <span>
                  {actionSubmitting === "staff-export" ? "Exporting" : "Export"}
                </span>
              </button>
            ) : null}
            {canCreateStaff ? (
              <button
                className="primary-button table-add-button"
                onClick={() => router.push("/admin/staff/new")}
                type="button"
              >
                <UserPlus aria-hidden="true" size={16} />
                <span>Add Staff</span>
              </button>
            ) : null}
          </div>
        </div>
        <AdminDataTable
          columns={staffColumns}
          emptyMessage="No staff records found."
          getRowId={(row) => row.id}
          loading={staffLoading}
          onPageChange={setStaffPage}
          onPageSizeChange={handleStaffPageSizeChange}
          page={staffPage}
          pageSize={staffPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={staffRows}
          totalCount={staffTotalCount}
        />
      </section>
    );
  }

  function renderStaffFormPage(): React.ReactElement {
    const isEditMode = staffPageMode === "edit";
    const canSubmit = isEditMode ? canUpdateStaff : canCreateStaff;
    const formStaff = isEditMode ? staffDetail : null;
    const submitKey = isEditMode ? "staff-update" : "staff-create";

    if (!canSubmit) {
      return (
        <section className="staff-page" aria-label="Staff permission">
          <div className="empty-state staff-empty-state">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>You do not have permission for this operation.</span>
          </div>
        </section>
      );
    }

    if (isEditMode && staffLoading && !formStaff) {
      return (
        <section className="staff-page" aria-label="Loading staff">
          <div className="empty-state staff-empty-state">
            <RefreshCw aria-hidden="true" size={20} />
            <span>Loading staff member</span>
          </div>
        </section>
      );
    }

    if (isEditMode && !formStaff) {
      return (
        <section className="staff-page" aria-label="Staff unavailable">
          <div className="empty-state staff-empty-state">
            <AlertTriangle aria-hidden="true" size={20} />
            <span>Staff member is not available.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label={workspaceTitle}>
        <div className="record-page-header">
          <button
            className="secondary-button"
            onClick={() => router.push("/admin/staff")}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back</span>
          </button>
        </div>
        <form
          className="admin-form staff-record-form"
          onSubmit={handleSaveStaff}
        >
          <div className="form-grid form-grid-two">
            <div className="field-group">
              <label className="field-label" htmlFor="staff-name">
                Name
              </label>
              <input
                className="text-field"
                defaultValue={formStaff?.name ?? ""}
                id="staff-name"
                name="staff-name"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="staff-employee-code">
                Employee code
              </label>
              <input
                className="text-field"
                defaultValue={formStaff?.employeeCode ?? ""}
                id="staff-employee-code"
                name="staff-employee-code"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="staff-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="text-field"
                defaultValue={formStaff?.email ?? ""}
                id="staff-email"
                name="staff-email"
                type="email"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="staff-phone">
                Phone
              </label>
              <input
                autoComplete="tel"
                className="text-field"
                defaultValue={formStaff?.phone ?? ""}
                id="staff-phone"
                name="staff-phone"
                type="tel"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="staff-engagement-type">
                Engagement
              </label>
              <select
                className="text-field"
                defaultValue={formStaff?.engagementType ?? "SALARIED"}
                id="staff-engagement-type"
                name="staff-engagement-type"
              >
                <option value="SALARIED">Salaried</option>
                <option value="GIG">Gig</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="staff-status">
                Status
              </label>
              <select
                className="text-field"
                defaultValue={formStaff?.status ?? "ACTIVE"}
                id="staff-status"
                name="staff-status"
              >
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="SUSPENDED">Suspended</option>
                {isEditMode ? <option value="DISABLED">Disabled</option> : null}
              </select>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="staff-emergency-phone">
              Emergency phone
            </label>
            <input
              className="text-field"
              defaultValue={formStaff?.emergencyPhone ?? ""}
              id="staff-emergency-phone"
              name="staff-emergency-phone"
              type="tel"
            />
          </div>
          <fieldset className="service-deal-panel form-grid form-grid-span">
            <legend>Eligible services</legend>
            <p className="form-help-text">
              Select every service this staff member can perform. Booking
              assignment uses this list before checking availability.
            </p>
            {homepageServiceOptionsLoading ? (
              <div className="empty-state staff-empty-state">
                <RefreshCw aria-hidden="true" size={18} />
                <span>Loading services</span>
              </div>
            ) : homepageServiceOptions.length === 0 ? (
              <div className="empty-state staff-empty-state">
                <AlertTriangle aria-hidden="true" size={18} />
                <span>No published services are available to assign.</span>
              </div>
            ) : (
              <div className="admin-check-grid">
                {homepageServiceOptions.map((serviceOption) => (
                  <label className="admin-check-tile" key={serviceOption.id}>
                    <input
                      defaultChecked={
                        formStaff?.serviceIds.includes(serviceOption.id) ??
                        false
                      }
                      name="staff-service-ids"
                      type="checkbox"
                      value={serviceOption.id}
                    />
                    <span>
                      <strong>{serviceOption.name}</strong>
                      <small>{serviceOption.categoryName}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div className="form-actions-row">
            <button
              className="secondary-button"
              onClick={() => router.push("/admin/staff")}
              type="button"
            >
              Cancel
            </button>
            <button
              className="primary-button inline-submit"
              disabled={actionSubmitting === submitKey}
              type="submit"
            >
              {isEditMode ? (
                <Edit3 aria-hidden="true" size={16} />
              ) : (
                <UserPlus aria-hidden="true" size={16} />
              )}
              <span>
                {actionSubmitting === submitKey
                  ? isEditMode
                    ? "Saving"
                    : "Adding"
                  : isEditMode
                    ? "Save Staff"
                    : "Add Staff"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderStaffPage(): React.ReactElement {
    return staffPageMode === "list"
      ? renderStaffListPage()
      : renderStaffFormPage();
  }

  function renderStaffDeleteDialog(): React.ReactElement | null {
    if (!staffDeleteTarget) {
      return null;
    }

    return (
      <div className="modal-backdrop" role="presentation">
        <section
          aria-describedby="staff-delete-description"
          aria-labelledby="staff-delete-title"
          aria-modal="true"
          className="confirm-dialog"
          role="alertdialog"
        >
          <div className="confirm-icon">
            <AlertTriangle aria-hidden="true" size={22} />
          </div>
          <div>
            <h2 id="staff-delete-title">Delete staff member?</h2>
            <p id="staff-delete-description">
              {staffDeleteTarget.name} will be disabled and kept in the database
              for history.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={actionSubmitting === "staff-delete"}
              onClick={() => setStaffDeleteTarget(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="danger-button"
              disabled={actionSubmitting === "staff-delete"}
              onClick={() => void handleConfirmDeleteStaff()}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === "staff-delete" ? "Deleting" : "Delete"}
              </span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderSingleImageUpload(
    label: string,
    inputId: string,
    image: MediaImage | null,
    onRemove: () => void,
    handler: (files: FileList) => Promise<void>,
    uploadKey: string,
  ): React.ReactElement {
    const uploading = actionSubmitting === uploadKey;

    return (
      <div className="field-group">
        <span className="field-label">{label}</span>
        <label
          className="image-dropzone"
          htmlFor={inputId}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleImageDrop(event, handler)}
        >
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="file-input-hidden"
            id={inputId}
            onChange={(event) => handleImageInputChange(event, handler)}
            type="file"
          />
          {image ? (
            <span className="image-preview-row">
              <img alt={image.altText ?? label} src={image.url} />
              <span>{image.altText ?? "Selected image"}</span>
            </span>
          ) : (
            <span className="image-dropzone-copy">
              <ImagePlus aria-hidden="true" size={18} />
              <span>
                {uploading ? "Uploading image" : "Drop image or browse"}
              </span>
            </span>
          )}
        </label>
        {image ? (
          <button
            className="secondary-button compact-action-button"
            onClick={onRemove}
            type="button"
          >
            <Trash2 aria-hidden="true" size={15} />
            <span>Remove</span>
          </button>
        ) : null}
      </div>
    );
  }

  function renderGalleryImageUpload(): React.ReactElement {
    const uploading = actionSubmitting === "service-gallery-image-upload";

    return (
      <div className="field-group">
        <span className="field-label">Gallery images</span>
        <label
          className="image-dropzone"
          htmlFor="service-gallery-images"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) =>
            handleImageDrop(event, handleServiceGalleryImageFiles)
          }
        >
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="file-input-hidden"
            id="service-gallery-images"
            multiple
            onChange={(event) =>
              handleImageInputChange(event, handleServiceGalleryImageFiles)
            }
            type="file"
          />
          <span className="image-dropzone-copy">
            <ImagePlus aria-hidden="true" size={18} />
            <span>
              {uploading ? "Uploading images" : "Drop images or browse"}
            </span>
          </span>
        </label>
        {serviceGalleryImages.length > 0 ? (
          <div className="gallery-preview-grid">
            {serviceGalleryImages.map((image) => (
              <div className="gallery-preview-item" key={image.id}>
                <img alt={image.altText ?? "Service image"} src={image.url} />
                <button
                  aria-label="Remove gallery image"
                  className="icon-button table-icon-button danger-icon-button"
                  onClick={() =>
                    setServiceGalleryImages((currentImages) =>
                      currentImages.filter(
                        (currentImage) => currentImage.id !== image.id,
                      ),
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderCategoryListPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Category list">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleCategorySearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="category-search">
                Search categories
              </label>
              <input
                className="text-field"
                id="category-search"
                name="category-search"
                onChange={(event) => setCategorySearchInput(event.target.value)}
                placeholder="Name, slug, parent or description"
                type="search"
                value={categorySearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="category-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="category-status-filter"
                name="category-status-filter"
                onChange={(event) => {
                  setCategoryPage(1);
                  setCategoryStatusFilter(
                    getPublishStatusFilter(event.currentTarget.value),
                  );
                }}
                value={categoryStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={categoryLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            {canExportCategory ? (
              <button
                className="secondary-button"
                disabled={actionSubmitting === "category-export"}
                onClick={() => void handleExportCatalogue("categories")}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                <span>
                  {actionSubmitting === "category-export"
                    ? "Exporting"
                    : "Export"}
                </span>
              </button>
            ) : null}
            {canCreateCategory ? (
              <button
                className="primary-button table-add-button"
                onClick={() => router.push(getCatalogueNewPath("categories"))}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                <span>Add Category</span>
              </button>
            ) : null}
          </div>
        </div>
        <AdminDataTable
          columns={categoryColumns}
          emptyMessage="No category records found."
          getRowId={(row) => row.id}
          loading={categoryLoading}
          onPageChange={setCategoryPage}
          onPageSizeChange={handleCategoryPageSizeChange}
          page={categoryPage}
          pageSize={categoryPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={categoryRows}
          totalCount={categoryTotalCount}
        />
      </section>
    );
  }

  function renderServiceListPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Service list">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleServiceSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="service-search">
                Search services
              </label>
              <input
                className="text-field"
                id="service-search"
                name="service-search"
                onChange={(event) => setServiceSearchInput(event.target.value)}
                placeholder="Name, slug, category or description"
                type="search"
                value={serviceSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="service-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="service-status-filter"
                name="service-status-filter"
                onChange={(event) => {
                  setServicePage(1);
                  setServiceStatusFilter(
                    getPublishStatusFilter(event.currentTarget.value),
                  );
                }}
                value={serviceStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={serviceLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            {canExportService ? (
              <button
                className="secondary-button"
                disabled={actionSubmitting === "service-export"}
                onClick={() => void handleExportCatalogue("services")}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                <span>
                  {actionSubmitting === "service-export"
                    ? "Exporting"
                    : "Export"}
                </span>
              </button>
            ) : null}
            {canCreateService ? (
              <button
                className="primary-button table-add-button"
                onClick={() => router.push(getCatalogueNewPath("services"))}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                <span>Add Service</span>
              </button>
            ) : null}
          </div>
        </div>
        <AdminDataTable
          columns={serviceColumns}
          emptyMessage="No service records found."
          getRowId={(row) => row.id}
          loading={serviceLoading}
          onPageChange={setServicePage}
          onPageSizeChange={handleServicePageSizeChange}
          page={servicePage}
          pageSize={servicePageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={serviceRows}
          totalCount={serviceTotalCount}
        />
      </section>
    );
  }

  function renderPackageListPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Package list">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handlePackageSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="package-search">
                Search packages
              </label>
              <input
                className="text-field"
                id="package-search"
                name="package-search"
                onChange={(event) => setPackageSearchInput(event.target.value)}
                placeholder="Name, slug, category or inclusion"
                type="search"
                value={packageSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="package-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="package-status-filter"
                name="package-status-filter"
                onChange={(event) => {
                  setPackagePage(1);
                  setPackageStatusFilter(
                    getPublishStatusFilter(event.currentTarget.value),
                  );
                }}
                value={packageStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={packageLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            {canCreatePackage ? (
              <button
                className="primary-button table-add-button"
                onClick={() => router.push(getCatalogueNewPath("packages"))}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                <span>Add Package</span>
              </button>
            ) : null}
          </div>
        </div>
        <AdminDataTable
          columns={packageColumns}
          emptyMessage="No package records found."
          getRowId={(row) => row.id}
          loading={packageLoading}
          onPageChange={setPackagePage}
          onPageSizeChange={handlePackagePageSizeChange}
          page={packagePage}
          pageSize={packagePageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={packageRows}
          totalCount={packageTotalCount}
        />
      </section>
    );
  }

  function renderCategoryFormPage(): React.ReactElement {
    const isEditMode = cataloguePageMode === "edit";
    const canSubmit = isEditMode ? canUpdateCategory : canCreateCategory;
    const formCategory = isEditMode ? categoryDetail : null;
    const submitKey = isEditMode ? "category-update" : "category-create";
    const parentOptions = rootCategories.filter(
      (category) => category.id !== formCategory?.id,
    );

    if (!canSubmit) {
      return (
        <section className="staff-page" aria-label="Category permission">
          <div className="empty-state staff-empty-state">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>You do not have permission for this operation.</span>
          </div>
        </section>
      );
    }

    if (isEditMode && categoryLoading && !formCategory) {
      return (
        <section className="staff-page" aria-label="Loading category">
          <div className="empty-state staff-empty-state">
            <RefreshCw aria-hidden="true" size={20} />
            <span>Loading category</span>
          </div>
        </section>
      );
    }

    if (isEditMode && !formCategory) {
      return (
        <section className="staff-page" aria-label="Category unavailable">
          <div className="empty-state staff-empty-state">
            <AlertTriangle aria-hidden="true" size={20} />
            <span>Category is not available.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label={workspaceTitle}>
        <div className="record-page-header">
          <button
            className="secondary-button"
            onClick={() => router.push(getCatalogueAreaPath("categories"))}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back</span>
          </button>
        </div>
        <form
          className="admin-form staff-record-form"
          onSubmit={handleSaveCategory}
        >
          <div className="form-grid form-grid-two">
            <div className="field-group">
              <label className="field-label" htmlFor="category-name">
                Name
              </label>
              <input
                className="text-field"
                defaultValue={formCategory?.name ?? ""}
                id="category-name"
                name="category-name"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="category-parent-id">
                Parent category
              </label>
              <select
                className="text-field"
                defaultValue={formCategory?.parentId ?? ""}
                id="category-parent-id"
                name="category-parent-id"
              >
                <option value="">Root category</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="category-status">
                Status
              </label>
              <select
                className="text-field"
                defaultValue={formCategory?.status ?? "DRAFT"}
                id="category-status"
                name="category-status"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                {isEditMode ? <option value="ARCHIVED">Archived</option> : null}
              </select>
            </div>
          </div>
          {renderSingleImageUpload(
            "Category image",
            "category-image",
            categoryImage,
            () => setCategoryImage(null),
            handleCategoryImageFiles,
            "category-image-upload",
          )}
          <div className="field-group">
            <label className="field-label" htmlFor="category-description">
              Description
            </label>
            <textarea
              className="text-field text-area"
              defaultValue={formCategory?.description ?? ""}
              id="category-description"
              name="category-description"
              rows={4}
            />
          </div>
          <div className="form-actions-row">
            <button
              className="secondary-button"
              onClick={() => router.push(getCatalogueAreaPath("categories"))}
              type="button"
            >
              Cancel
            </button>
            <button
              className="primary-button inline-submit"
              disabled={actionSubmitting === submitKey}
              type="submit"
            >
              <Tags aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === submitKey
                  ? isEditMode
                    ? "Saving"
                    : "Adding"
                  : isEditMode
                    ? "Save Category"
                    : "Add Category"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderServiceTierFieldset(
    tierType: ServiceTierType,
    formService: ServiceRow | null,
  ): React.ReactElement {
    const tier = resolveServiceTierForForm(formService, tierType);
    const fieldPrefix = tierFieldName(tierType, "");
    const tierLabel = defaultTierName(tierType);

    return (
      <fieldset className="service-deal-panel form-grid form-grid-two form-grid-span">
        <legend>{tierLabel} tier</legend>
        <div className="field-group">
          <label className="field-label" htmlFor={`${fieldPrefix}name`}>
            Tier name
          </label>
          <input
            className="text-field"
            defaultValue={tier?.name ?? tierLabel}
            id={`${fieldPrefix}name`}
            name={`${fieldPrefix}name`}
            required
            type="text"
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor={`${fieldPrefix}status`}>
            Tier status
          </label>
          <select
            className="text-field"
            defaultValue={tier?.status ?? "PUBLISHED"}
            id={`${fieldPrefix}status`}
            name={`${fieldPrefix}status`}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor={`${fieldPrefix}price`}>
            Selling price INR
          </label>
          <input
            className="text-field"
            defaultValue={formatPaiseInput(
              tier?.pricePaise ?? formService?.pricePaise,
            )}
            id={`${fieldPrefix}price`}
            inputMode="decimal"
            name={`${fieldPrefix}price`}
            placeholder="999.00"
            required
            type="text"
          />
        </div>
        <div className="field-group">
          <label
            className="field-label"
            htmlFor={`${fieldPrefix}compare-at-price`}
          >
            MRP INR
          </label>
          <input
            className="text-field"
            defaultValue={formatPaiseInput(
              tier?.compareAtPricePaise ?? formService?.compareAtPricePaise,
            )}
            id={`${fieldPrefix}compare-at-price`}
            inputMode="decimal"
            name={`${fieldPrefix}compare-at-price`}
            placeholder="1499.00"
            type="text"
          />
        </div>
        <div className="field-group">
          <label
            className="field-label"
            htmlFor={`${fieldPrefix}duration-minutes`}
          >
            Duration minutes
          </label>
          <input
            className="text-field"
            defaultValue={
              tier?.durationMinutes ?? formService?.durationMinutes ?? ""
            }
            id={`${fieldPrefix}duration-minutes`}
            min={5}
            name={`${fieldPrefix}duration-minutes`}
            required
            type="number"
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor={`${fieldPrefix}sort-order`}>
            Sort order
          </label>
          <input
            className="text-field"
            defaultValue={tier?.sortOrder ?? (tierType === "PREMIUM" ? 0 : 1)}
            id={`${fieldPrefix}sort-order`}
            min={0}
            name={`${fieldPrefix}sort-order`}
            required
            type="number"
          />
        </div>
        <div className="field-group form-grid-span">
          <label className="field-label" htmlFor={`${fieldPrefix}description`}>
            Customer description
          </label>
          <textarea
            className="text-field text-area"
            defaultValue={tier?.description ?? ""}
            id={`${fieldPrefix}description`}
            name={`${fieldPrefix}description`}
            rows={3}
          />
        </div>
        <div className="field-group form-grid-span">
          <label
            className="field-label"
            htmlFor={`${fieldPrefix}products-used`}
          >
            Products used
          </label>
          <textarea
            className="text-field text-area"
            defaultValue={listToTextareaValue(tier?.productsUsed ?? [])}
            id={`${fieldPrefix}products-used`}
            name={`${fieldPrefix}products-used`}
            placeholder="One product per line"
            rows={3}
          />
        </div>
      </fieldset>
    );
  }

  function renderServiceFormPage(): React.ReactElement {
    const isEditMode = cataloguePageMode === "edit";
    const canSubmit = isEditMode ? canUpdateService : canCreateService;
    const formService = isEditMode ? serviceDetail : null;
    const submitKey = isEditMode ? "service-update" : "service-create";
    const categoryOptionsContainCurrent =
      formService &&
      categoryOptions.some(
        (category) => category.id === formService.categoryId,
      );

    if (!canSubmit) {
      return (
        <section className="staff-page" aria-label="Service permission">
          <div className="empty-state staff-empty-state">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>You do not have permission for this operation.</span>
          </div>
        </section>
      );
    }

    if (isEditMode && serviceLoading && !formService) {
      return (
        <section className="staff-page" aria-label="Loading service">
          <div className="empty-state staff-empty-state">
            <RefreshCw aria-hidden="true" size={20} />
            <span>Loading service</span>
          </div>
        </section>
      );
    }

    if (isEditMode && !formService) {
      return (
        <section className="staff-page" aria-label="Service unavailable">
          <div className="empty-state staff-empty-state">
            <AlertTriangle aria-hidden="true" size={20} />
            <span>Service is not available.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label={workspaceTitle}>
        <div className="record-page-header">
          <button
            className="secondary-button"
            onClick={() => router.push(getCatalogueAreaPath("services"))}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back</span>
          </button>
        </div>
        <form
          className="admin-form staff-record-form"
          onSubmit={handleSaveService}
        >
          <div className="form-grid form-grid-two">
            <div className="field-group">
              <label className="field-label" htmlFor="service-category-id">
                Category
              </label>
              <select
                className="text-field"
                defaultValue={formService?.categoryId ?? ""}
                id="service-category-id"
                name="service-category-id"
                required
              >
                <option value="">Choose category</option>
                {formService && !categoryOptionsContainCurrent ? (
                  <option value={formService.categoryId}>
                    {formService.categoryName}
                  </option>
                ) : null}
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parentName
                      ? `${category.parentName} / ${category.name}`
                      : category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-name">
                Service name
              </label>
              <input
                className="text-field"
                defaultValue={formService?.name ?? ""}
                id="service-name"
                name="service-name"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-duration-minutes">
                Duration minutes
              </label>
              <input
                className="text-field"
                defaultValue={formService?.durationMinutes ?? ""}
                id="service-duration-minutes"
                min={5}
                name="service-duration-minutes"
                required
                type="number"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-price">
                Price INR
              </label>
              <input
                className="text-field"
                defaultValue={
                  formService ? (formService.pricePaise / 100).toFixed(2) : ""
                }
                id="service-price"
                inputMode="decimal"
                name="service-price"
                placeholder="999.00"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-compare-at-price">
                MRP / compare-at INR
              </label>
              <input
                className="text-field"
                defaultValue={
                  formService?.compareAtPricePaise === null ||
                  formService?.compareAtPricePaise === undefined
                    ? ""
                    : (formService.compareAtPricePaise / 100).toFixed(2)
                }
                id="service-compare-at-price"
                inputMode="decimal"
                name="service-compare-at-price"
                placeholder="1499.00"
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-gst-rate">
                GST %
              </label>
              <input
                className="text-field"
                defaultValue={
                  formService?.gstRateBps === null ||
                  formService?.gstRateBps === undefined
                    ? ""
                    : (formService.gstRateBps / 100).toFixed(2)
                }
                id="service-gst-rate"
                inputMode="decimal"
                name="service-gst-rate"
                placeholder="18"
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-status">
                Status
              </label>
              <select
                className="text-field"
                defaultValue={formService?.status ?? "DRAFT"}
                id="service-status"
                name="service-status"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                {isEditMode ? <option value="ARCHIVED">Archived</option> : null}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="service-sort-order">
                Homepage sort order
              </label>
              <input
                className="text-field"
                defaultValue={formService?.sortOrder ?? 0}
                id="service-sort-order"
                min={0}
                name="service-sort-order"
                type="number"
              />
            </div>
            <label className="field-group checkbox-field">
              <span className="field-label">Offer rail</span>
              <span className="checkbox-row">
                <input
                  defaultChecked={formService?.featured ?? false}
                  name="service-featured"
                  type="checkbox"
                />
                <span>Feature this service on the public home page</span>
              </span>
            </label>
            <fieldset className="service-deal-panel form-grid form-grid-two form-grid-span">
              <legend>Deal of the day</legend>
              <label className="field-group checkbox-field form-grid-span">
                <span className="field-label">Deal status</span>
                <span className="checkbox-row">
                  <input
                    defaultChecked={formService?.dealEnabled ?? false}
                    name="service-deal-enabled"
                    type="checkbox"
                  />
                  <span>Show this service inside the public deal section</span>
                </span>
              </label>
              <div className="field-group">
                <label className="field-label" htmlFor="service-deal-price">
                  Deal price INR
                </label>
                <input
                  className="text-field"
                  defaultValue={
                    formService?.dealPricePaise === null ||
                    formService?.dealPricePaise === undefined
                      ? ""
                      : (formService.dealPricePaise / 100).toFixed(2)
                  }
                  id="service-deal-price"
                  inputMode="decimal"
                  name="service-deal-price"
                  placeholder="Leave blank for same price"
                  type="text"
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="service-deal-starts-at">
                  Deal starts
                </label>
                <input
                  className="text-field"
                  defaultValue={formatDateTimeLocalValue(
                    formService?.dealStartsAt ?? null,
                  )}
                  id="service-deal-starts-at"
                  name="service-deal-starts-at"
                  type="datetime-local"
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="service-deal-ends-at">
                  Deal ends
                </label>
                <input
                  className="text-field"
                  defaultValue={formatDateTimeLocalValue(
                    formService?.dealEndsAt ?? null,
                  )}
                  id="service-deal-ends-at"
                  name="service-deal-ends-at"
                  type="datetime-local"
                />
              </div>
              <p className="form-help-text form-grid-span">
                The public deal section only shows published services while the
                current time is inside this range. Keep deal price blank to use
                the normal service price.
              </p>
            </fieldset>
            {renderServiceTierFieldset("PREMIUM", formService)}
            {renderServiceTierFieldset("LUXURY", formService)}
          </div>
          <div className="form-grid form-grid-two">
            {renderSingleImageUpload(
              "Main image",
              "service-main-image",
              serviceMainImage,
              () => setServiceMainImage(null),
              handleServiceMainImageFiles,
              "service-main-image-upload",
            )}
            {renderGalleryImageUpload()}
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="service-short-description">
              Short description
            </label>
            <textarea
              className="text-field text-area"
              defaultValue={formService?.shortDescription ?? ""}
              id="service-short-description"
              name="service-short-description"
              rows={4}
            />
          </div>
          <div className="field-group">
            <span className="field-label">Full description</span>
            <div className="rich-text-toolbar" aria-label="Formatting">
              <button
                className="icon-button table-icon-button"
                onClick={() => applyRichTextCommand("bold")}
                title="Bold"
                type="button"
              >
                <Bold aria-hidden="true" size={16} />
              </button>
              <button
                className="icon-button table-icon-button"
                onClick={() => applyRichTextCommand("italic")}
                title="Italic"
                type="button"
              >
                <Italic aria-hidden="true" size={16} />
              </button>
              <button
                className="icon-button table-icon-button"
                onClick={() => applyRichTextCommand("insertUnorderedList")}
                title="Bulleted list"
                type="button"
              >
                <List aria-hidden="true" size={16} />
              </button>
              <button
                className="icon-button table-icon-button"
                onClick={() =>
                  applyRichTextCommand("formatBlock", "blockquote")
                }
                title="Quote"
                type="button"
              >
                <Quote aria-hidden="true" size={16} />
              </button>
            </div>
            <div
              className="text-field rich-text-editor"
              contentEditable
              dangerouslySetInnerHTML={{ __html: serviceDescriptionHtml }}
              onInput={(event) =>
                setServiceDescriptionHtml(event.currentTarget.innerHTML)
              }
              ref={richTextEditorRef}
              role="textbox"
              suppressContentEditableWarning
            />
          </div>
          <div className="form-actions-row">
            <button
              className="secondary-button"
              onClick={() => router.push(getCatalogueAreaPath("services"))}
              type="button"
            >
              Cancel
            </button>
            <button
              className="primary-button inline-submit"
              disabled={
                actionSubmitting === submitKey ||
                (!formService && categoryOptions.length === 0)
              }
              type="submit"
            >
              <Scissors aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === submitKey
                  ? isEditMode
                    ? "Saving"
                    : "Adding"
                  : isEditMode
                    ? "Save Service"
                    : "Add Service"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderPackageFormPage(): React.ReactElement {
    const isEditMode = cataloguePageMode === "edit";
    const canSubmit = isEditMode ? canUpdatePackage : canCreatePackage;
    const formPackage = isEditMode ? packageDetail : null;
    const submitKey = isEditMode ? "package-update" : "package-create";
    const categoryOptionsContainCurrent =
      formPackage &&
      categoryOptions.some(
        (category) => category.id === formPackage.categoryId,
      );
    const tierOptions = homepageServiceOptions.flatMap((serviceOption) =>
      serviceOption.tiers.map((tier) => ({
        id: tier.id,
        label: `${serviceOption.name} / ${tier.name}`,
      })),
    );

    if (!canSubmit) {
      return (
        <section className="staff-page" aria-label="Package permission">
          <div className="empty-state staff-empty-state">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>You do not have permission for this operation.</span>
          </div>
        </section>
      );
    }

    if (isEditMode && packageLoading && !formPackage) {
      return (
        <section className="staff-page" aria-label="Loading package">
          <div className="empty-state staff-empty-state">
            <RefreshCw aria-hidden="true" size={20} />
            <span>Loading package</span>
          </div>
        </section>
      );
    }

    if (isEditMode && !formPackage) {
      return (
        <section className="staff-page" aria-label="Package unavailable">
          <div className="empty-state staff-empty-state">
            <AlertTriangle aria-hidden="true" size={20} />
            <span>Package is not available.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label={workspaceTitle}>
        <div className="record-page-header">
          <button
            className="secondary-button"
            onClick={() => router.push(getCatalogueAreaPath("packages"))}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back</span>
          </button>
        </div>
        <form
          className="admin-form staff-record-form"
          onSubmit={handleSavePackage}
        >
          <div className="form-grid form-grid-two">
            <div className="field-group">
              <label className="field-label" htmlFor="package-category-id">
                Category
              </label>
              <select
                className="text-field"
                defaultValue={formPackage?.categoryId ?? ""}
                id="package-category-id"
                name="package-category-id"
                required
              >
                <option value="">Choose category</option>
                {formPackage && !categoryOptionsContainCurrent ? (
                  <option value={formPackage.categoryId}>
                    {formPackage.categoryName}
                  </option>
                ) : null}
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parentName
                      ? `${category.parentName} / ${category.name}`
                      : category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-name">
                Package name
              </label>
              <input
                className="text-field"
                defaultValue={formPackage?.name ?? ""}
                id="package-name"
                name="package-name"
                placeholder="Make your own package"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-min-price">
                Minimum price INR
              </label>
              <input
                className="text-field"
                defaultValue={formatPaiseInput(formPackage?.minPricePaise)}
                id="package-min-price"
                inputMode="decimal"
                name="package-min-price"
                placeholder="2989.00"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-compare-at-price">
                MRP INR
              </label>
              <input
                className="text-field"
                defaultValue={formatPaiseInput(
                  formPackage?.compareAtPricePaise,
                )}
                id="package-compare-at-price"
                inputMode="decimal"
                name="package-compare-at-price"
                placeholder="3736.00"
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-discount-percent">
                Discount %
              </label>
              <input
                className="text-field"
                defaultValue={formatBpsInput(formPackage?.discountBps ?? 0)}
                id="package-discount-percent"
                inputMode="decimal"
                name="package-discount-percent"
                placeholder="20"
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-duration-minutes">
                Duration minutes
              </label>
              <input
                className="text-field"
                defaultValue={formPackage?.durationMinutes ?? ""}
                id="package-duration-minutes"
                min={5}
                name="package-duration-minutes"
                required
                type="number"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-status">
                Status
              </label>
              <select
                className="text-field"
                defaultValue={formPackage?.status ?? "DRAFT"}
                id="package-status"
                name="package-status"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                {isEditMode ? <option value="ARCHIVED">Archived</option> : null}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="package-sort-order">
                Sort order
              </label>
              <input
                className="text-field"
                defaultValue={formPackage?.sortOrder ?? 0}
                id="package-sort-order"
                min={0}
                name="package-sort-order"
                type="number"
              />
            </div>
            <div className="field-group form-grid-span">
              <label className="field-label" htmlFor="package-description">
                Description
              </label>
              <textarea
                className="text-field text-area"
                defaultValue={formPackage?.description ?? ""}
                id="package-description"
                name="package-description"
                rows={4}
              />
            </div>
            <div className="field-group form-grid-span">
              <label className="field-label" htmlFor="package-inclusions">
                Inclusions
              </label>
              <textarea
                className="text-field text-area"
                defaultValue={listToTextareaValue(
                  formPackage?.inclusions ?? [],
                )}
                id="package-inclusions"
                name="package-inclusions"
                placeholder="One inclusion per line"
                rows={4}
              />
            </div>
          </div>
          <fieldset className="service-deal-panel form-grid form-grid-span">
            <legend>Package services</legend>
            <p className="form-help-text">
              Add included services and optional tier locks. Customers can edit
              quantities above the admin minimum, but cannot book below the
              minimum quantities.
            </p>
            {homepageServiceOptionsLoading ? (
              <div className="empty-state staff-empty-state">
                <RefreshCw aria-hidden="true" size={18} />
                <span>Loading services</span>
              </div>
            ) : (
              <div className="homepage-card-editor-list">
                {Array.from({ length: PACKAGE_ITEM_FORM_ROWS }).map(
                  (_row, index) => {
                    const packageItem = formPackage?.items[index] ?? null;

                    return (
                      <div className="homepage-card-editor" key={index}>
                        <div className="homepage-card-editor-head">
                          <span>
                            <ShoppingBag aria-hidden="true" size={18} />
                            Item {index + 1}
                          </span>
                        </div>
                        <div className="form-grid form-grid-two">
                          <div className="field-group">
                            <label
                              className="field-label"
                              htmlFor={`package-item-${index}-service-id`}
                            >
                              Service
                            </label>
                            <select
                              className="text-field"
                              defaultValue={packageItem?.serviceId ?? ""}
                              id={`package-item-${index}-service-id`}
                              name={`package-item-${index}-service-id`}
                              required={index === 0}
                            >
                              <option value="">No service</option>
                              {packageItem &&
                              !homepageServiceOptions.some(
                                (serviceOption) =>
                                  serviceOption.id === packageItem.serviceId,
                              ) ? (
                                <option value={packageItem.serviceId}>
                                  {packageItem.serviceName}
                                </option>
                              ) : null}
                              {homepageServiceOptions.map((serviceOption) => (
                                <option
                                  key={serviceOption.id}
                                  value={serviceOption.id}
                                >
                                  {serviceOption.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field-group">
                            <label
                              className="field-label"
                              htmlFor={`package-item-${index}-service-tier-id`}
                            >
                              Tier
                            </label>
                            <select
                              className="text-field"
                              defaultValue={packageItem?.serviceTierId ?? ""}
                              id={`package-item-${index}-service-tier-id`}
                              name={`package-item-${index}-service-tier-id`}
                            >
                              <option value="">Customer can choose</option>
                              {packageItem?.serviceTierId &&
                              !tierOptions.some(
                                (tierOption) =>
                                  tierOption.id === packageItem.serviceTierId,
                              ) ? (
                                <option value={packageItem.serviceTierId}>
                                  {packageItem.serviceTierName ?? "Saved tier"}
                                </option>
                              ) : null}
                              {tierOptions.map((tierOption) => (
                                <option
                                  key={tierOption.id}
                                  value={tierOption.id}
                                >
                                  {tierOption.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field-group">
                            <label
                              className="field-label"
                              htmlFor={`package-item-${index}-label`}
                            >
                              Display label
                            </label>
                            <input
                              className="text-field"
                              defaultValue={packageItem?.label ?? ""}
                              id={`package-item-${index}-label`}
                              name={`package-item-${index}-label`}
                              placeholder="Pedicure, cleanup, waxing"
                              type="text"
                            />
                          </div>
                          <div className="field-group">
                            <label
                              className="field-label"
                              htmlFor={`package-item-${index}-quantity`}
                            >
                              Included quantity
                            </label>
                            <input
                              className="text-field"
                              defaultValue={packageItem?.quantity ?? 1}
                              id={`package-item-${index}-quantity`}
                              min={1}
                              name={`package-item-${index}-quantity`}
                              type="number"
                            />
                          </div>
                          <div className="field-group">
                            <label
                              className="field-label"
                              htmlFor={`package-item-${index}-min-quantity`}
                            >
                              Minimum quantity
                            </label>
                            <input
                              className="text-field"
                              defaultValue={packageItem?.minQuantity ?? 1}
                              id={`package-item-${index}-min-quantity`}
                              min={1}
                              name={`package-item-${index}-min-quantity`}
                              type="number"
                            />
                          </div>
                          <div className="field-group">
                            <label
                              className="field-label"
                              htmlFor={`package-item-${index}-sort-order`}
                            >
                              Sort order
                            </label>
                            <input
                              className="text-field"
                              defaultValue={packageItem?.sortOrder ?? index}
                              id={`package-item-${index}-sort-order`}
                              min={0}
                              name={`package-item-${index}-sort-order`}
                              type="number"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </fieldset>
          <div className="form-actions-row">
            <button
              className="secondary-button"
              onClick={() => router.push(getCatalogueAreaPath("packages"))}
              type="button"
            >
              Cancel
            </button>
            <button
              className="primary-button inline-submit"
              disabled={
                actionSubmitting === submitKey ||
                (!formPackage &&
                  (categoryOptions.length === 0 ||
                    homepageServiceOptions.length === 0))
              }
              type="submit"
            >
              <ShoppingBag aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === submitKey
                  ? isEditMode
                    ? "Saving"
                    : "Adding"
                  : isEditMode
                    ? "Save Package"
                    : "Add Package"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderHomepageTextBlockEditor(
    blockKey: "offers" | "categories" | "services" | "trust",
    title: string,
  ): React.ReactElement | null {
    if (!homepageConfig) {
      return null;
    }

    const block = homepageConfig[blockKey];

    return (
      <fieldset className="homepage-editor-panel form-grid">
        <legend>{title}</legend>
        <label>
          Eyebrow
          <input
            disabled={!canUpdateHomepage}
            maxLength={120}
            onChange={(event) =>
              updateHomepageTextBlock(blockKey, "eyebrow", event.target.value)
            }
            required
            value={block.eyebrow}
          />
        </label>
        <label>
          Title
          <input
            disabled={!canUpdateHomepage}
            maxLength={180}
            onChange={(event) =>
              updateHomepageTextBlock(blockKey, "title", event.target.value)
            }
            required
            value={block.title}
          />
        </label>
        <label className="form-grid-span">
          Subtitle
          <textarea
            className="text-area"
            disabled={!canUpdateHomepage}
            maxLength={520}
            onChange={(event) =>
              updateHomepageTextBlock(blockKey, "subtitle", event.target.value)
            }
            required
            value={block.subtitle}
          />
        </label>
      </fieldset>
    );
  }

  function renderHomepageServiceSectionsEditor(): React.ReactElement | null {
    if (!homepageConfig) {
      return null;
    }

    return (
      <fieldset className="homepage-editor-panel form-grid">
        <legend>Homepage service sections</legend>
        <div className="section-supporting-copy">
          Add a homepage section title, choose published services, then publish
          the section to show that exact service grid on the public website.
        </div>

        <div className="homepage-card-editor-list">
          {homepageConfig.serviceSections.map((section, sectionIndex) => {
            const selectedServiceIds = new Set(section.serviceIds);

            return (
              <div
                className="homepage-card-editor"
                key={section.id ?? sectionIndex}
              >
                <div className="homepage-card-editor-head">
                  <span>
                    <Scissors aria-hidden="true" size={18} />
                    Section {sectionIndex + 1}
                  </span>
                  <button
                    className="icon-button danger-icon-button"
                    disabled={!canUpdateHomepage}
                    onClick={() => removeHomepageServiceSection(sectionIndex)}
                    title="Remove service section"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>

                <div className="form-grid form-grid-two">
                  <label>
                    Section title
                    <input
                      disabled={!canUpdateHomepage}
                      maxLength={140}
                      onChange={(event) =>
                        updateHomepageServiceSectionText(
                          sectionIndex,
                          "title",
                          event.target.value,
                        )
                      }
                      required
                      value={section.title}
                    />
                  </label>
                  <label>
                    Sort order
                    <input
                      disabled={!canUpdateHomepage}
                      min={0}
                      onChange={(event) =>
                        updateHomepageServiceSectionSortOrder(
                          sectionIndex,
                          event.target.value,
                        )
                      }
                      type="number"
                      value={section.sortOrder}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      disabled={!canUpdateHomepage}
                      onChange={(event) =>
                        updateHomepageServiceSectionStatus(
                          sectionIndex,
                          getPublishStatus(event.target.value),
                        )
                      }
                      value={section.status}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </label>
                  <label className="form-grid-span">
                    Subtitle
                    <textarea
                      className="text-area"
                      disabled={!canUpdateHomepage}
                      maxLength={260}
                      onChange={(event) =>
                        updateHomepageServiceSectionText(
                          sectionIndex,
                          "subtitle",
                          event.target.value,
                        )
                      }
                      value={section.subtitle ?? ""}
                    />
                  </label>
                </div>

                <div className="homepage-service-picker">
                  <div className="homepage-service-picker-head">
                    <span>
                      {section.serviceIds.length} selected · maximum 24
                    </span>
                  </div>
                  {homepageServiceOptionsLoading ? (
                    <div className="empty-table-state">
                      <RefreshCw aria-hidden="true" size={18} />
                      <span>Loading published services...</span>
                    </div>
                  ) : homepageServiceOptionsError ? (
                    <div className="homepage-picker-error">
                      <AlertTriangle aria-hidden="true" size={18} />
                      <span>Published services could not be loaded.</span>
                      <button
                        className="secondary-action-button"
                        onClick={() => void loadHomepageServiceOptions()}
                        type="button"
                      >
                        <RefreshCw aria-hidden="true" size={15} />
                        <span>Retry</span>
                      </button>
                    </div>
                  ) : homepageServiceOptions.length === 0 ? (
                    <div className="empty-table-state">
                      <Scissors aria-hidden="true" size={18} />
                      <span>
                        Publish services first, then choose them for homepage
                        sections.
                      </span>
                    </div>
                  ) : (
                    <div className="checkbox-grid homepage-service-checkbox-grid">
                      {homepageServiceOptions.map((service) => (
                        <label className="checkbox-row" key={service.id}>
                          <input
                            checked={selectedServiceIds.has(service.id)}
                            disabled={!canUpdateHomepage}
                            onChange={() =>
                              toggleHomepageSectionService(
                                sectionIndex,
                                service.id,
                              )
                            }
                            type="checkbox"
                          />
                          <span>
                            <strong>{service.name}</strong>
                            <small>
                              {service.categoryName} ·{" "}
                              {formatInrPaise(service.pricePaise)}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="secondary-action-button inline-submit"
          disabled={
            !canUpdateHomepage || homepageConfig.serviceSections.length >= 12
          }
          onClick={addHomepageServiceSection}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          <span>Add service section</span>
        </button>
      </fieldset>
    );
  }

  function renderHomepageEditorPage(): React.ReactElement {
    if (!canViewHomepage && !canUpdateHomepage) {
      return (
        <section className="staff-page" aria-label="Homepage permission">
          <div className="empty-table-state">
            <ShieldCheck aria-hidden="true" size={22} />
            <span>You do not have permission to manage homepage content.</span>
          </div>
        </section>
      );
    }

    if (homepageLoading && !homepageConfig) {
      return (
        <section className="staff-page" aria-label="Homepage loading">
          <div className="empty-table-state">
            <RefreshCw aria-hidden="true" size={22} />
            <span>Loading homepage content...</span>
          </div>
        </section>
      );
    }

    if (!homepageConfig) {
      return (
        <section className="staff-page" aria-label="Homepage unavailable">
          <div className="homepage-unavailable-state">
            <AlertTriangle aria-hidden="true" size={22} />
            <div>
              <strong>Homepage content could not be loaded</strong>
              <span>
                Check that the local API is running, then try loading the editor
                again.
              </span>
            </div>
            <button
              className="secondary-action-button"
              onClick={() => void loadHomepageConfig()}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              <span>Try again</span>
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label="Homepage content editor">
        <form
          className="staff-record-form homepage-editor-form"
          onSubmit={handleSaveHomepage}
        >
          <div className="homepage-editor-toolbar">
            <div className="homepage-editor-heading">
              <p className="section-kicker">Public website</p>
              <h2>Homepage content</h2>
              <span>
                {homepageUpdatedAt
                  ? `Last updated ${formatTimestamp(homepageUpdatedAt)}`
                  : "Using default content until saved."}
              </span>
            </div>
            <button
              className="primary-action-button homepage-save-button"
              disabled={
                !canUpdateHomepage || actionSubmitting === "homepage-update"
              }
              type="submit"
            >
              {actionSubmitting === "homepage-update" ? (
                <RefreshCw aria-hidden="true" size={18} />
              ) : (
                <Save aria-hidden="true" size={18} />
              )}
              <span>
                {actionSubmitting === "homepage-update"
                  ? "Saving..."
                  : "Save Homepage"}
              </span>
            </button>
          </div>

          <fieldset className="homepage-editor-panel form-grid form-grid-two">
            <legend>Hero</legend>
            <label>
              Eyebrow
              <input
                disabled={!canUpdateHomepage}
                maxLength={120}
                onChange={(event) =>
                  updateHomepageHeroField("eyebrow", event.target.value)
                }
                required
                value={homepageConfig.hero.eyebrow}
              />
            </label>
            <label>
              Main title
              <input
                disabled={!canUpdateHomepage}
                maxLength={180}
                onChange={(event) =>
                  updateHomepageHeroField("title", event.target.value)
                }
                required
                value={homepageConfig.hero.title}
              />
            </label>
            <label>
              Title accent
              <input
                disabled={!canUpdateHomepage}
                maxLength={140}
                onChange={(event) =>
                  updateHomepageHeroField("titleAccent", event.target.value)
                }
                required
                value={homepageConfig.hero.titleAccent}
              />
            </label>
            <label>
              Primary CTA
              <input
                disabled={!canUpdateHomepage}
                maxLength={80}
                onChange={(event) =>
                  updateHomepageHeroField("primaryCtaLabel", event.target.value)
                }
                required
                value={homepageConfig.hero.primaryCtaLabel}
              />
            </label>
            <label>
              Secondary CTA
              <input
                disabled={!canUpdateHomepage}
                maxLength={80}
                onChange={(event) =>
                  updateHomepageHeroField(
                    "secondaryCtaLabel",
                    event.target.value,
                  )
                }
                required
                value={homepageConfig.hero.secondaryCtaLabel}
              />
            </label>
            <label className="form-grid-span">
              Subtitle
              <textarea
                className="text-area"
                disabled={!canUpdateHomepage}
                maxLength={520}
                onChange={(event) =>
                  updateHomepageHeroField("subtitle", event.target.value)
                }
                required
                value={homepageConfig.hero.subtitle}
              />
            </label>
          </fieldset>

          <div className="homepage-editor-grid">
            {renderHomepageTextBlockEditor("offers", "Offers section")}
            {renderHomepageTextBlockEditor("categories", "Category section")}
            {renderHomepageTextBlockEditor("services", "Service groups")}
            {renderHomepageTextBlockEditor("trust", "Trust section")}
          </div>

          {renderHomepageServiceSectionsEditor()}

          <fieldset className="homepage-editor-panel form-grid">
            <legend>Video and highlight cards</legend>
            <div className="form-grid form-grid-two">
              <label>
                Eyebrow
                <input
                  disabled={!canUpdateHomepage}
                  maxLength={120}
                  onChange={(event) =>
                    updateHomepageHighlightsField("eyebrow", event.target.value)
                  }
                  required
                  value={homepageConfig.highlights.eyebrow}
                />
              </label>
              <label>
                Title
                <input
                  disabled={!canUpdateHomepage}
                  maxLength={180}
                  onChange={(event) =>
                    updateHomepageHighlightsField("title", event.target.value)
                  }
                  required
                  value={homepageConfig.highlights.title}
                />
              </label>
              <label className="form-grid-span">
                Subtitle
                <textarea
                  className="text-area"
                  disabled={!canUpdateHomepage}
                  maxLength={520}
                  onChange={(event) =>
                    updateHomepageHighlightsField(
                      "subtitle",
                      event.target.value,
                    )
                  }
                  required
                  value={homepageConfig.highlights.subtitle}
                />
              </label>
            </div>

            <div className="homepage-card-editor-list">
              {homepageConfig.highlights.cards.map((card, index) => (
                <div className="homepage-card-editor" key={card.id ?? index}>
                  <div className="homepage-card-editor-head">
                    <span>
                      <Video aria-hidden="true" size={18} />
                      Highlight {index + 1}
                    </span>
                    <button
                      className="icon-button danger-icon-button"
                      disabled={!canUpdateHomepage}
                      onClick={() => removeHomepageHighlightCard(index)}
                      title="Remove highlight"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                  <div className="form-grid form-grid-two">
                    <label>
                      Title
                      <input
                        disabled={!canUpdateHomepage}
                        maxLength={140}
                        onChange={(event) =>
                          updateHomepageHighlightCardText(
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                        required
                        value={card.title}
                      />
                    </label>
                    <label>
                      Label
                      <input
                        disabled={!canUpdateHomepage}
                        maxLength={80}
                        onChange={(event) =>
                          updateHomepageHighlightCardText(
                            index,
                            "label",
                            event.target.value,
                          )
                        }
                        value={card.label ?? ""}
                      />
                    </label>
                    <label>
                      Image / poster URL
                      <input
                        disabled={!canUpdateHomepage}
                        maxLength={1000}
                        onChange={(event) =>
                          updateHomepageHighlightCardText(
                            index,
                            "mediaUrl",
                            event.target.value,
                          )
                        }
                        placeholder="/uploads/admin/image.webp"
                        value={card.mediaUrl ?? ""}
                      />
                    </label>
                    <label>
                      Video URL
                      <input
                        disabled={!canUpdateHomepage}
                        maxLength={1000}
                        onChange={(event) =>
                          updateHomepageHighlightCardText(
                            index,
                            "videoUrl",
                            event.target.value,
                          )
                        }
                        placeholder="https://... or /uploads/..."
                        value={card.videoUrl ?? ""}
                      />
                    </label>
                    <label>
                      Link URL
                      <input
                        disabled={!canUpdateHomepage}
                        maxLength={1000}
                        onChange={(event) =>
                          updateHomepageHighlightCardText(
                            index,
                            "linkUrl",
                            event.target.value,
                          )
                        }
                        placeholder="/services"
                        value={card.linkUrl ?? ""}
                      />
                    </label>
                    <label>
                      Sort order
                      <input
                        disabled={!canUpdateHomepage}
                        min={0}
                        onChange={(event) =>
                          updateHomepageHighlightCardSortOrder(
                            index,
                            event.target.value,
                          )
                        }
                        type="number"
                        value={card.sortOrder}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        disabled={!canUpdateHomepage}
                        onChange={(event) =>
                          updateHomepageHighlightCardStatus(
                            index,
                            getPublishStatus(event.target.value),
                          )
                        }
                        value={card.status}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </label>
                    <label className="form-grid-span">
                      Subtitle
                      <textarea
                        className="text-area"
                        disabled={!canUpdateHomepage}
                        maxLength={260}
                        onChange={(event) =>
                          updateHomepageHighlightCardText(
                            index,
                            "subtitle",
                            event.target.value,
                          )
                        }
                        value={card.subtitle ?? ""}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="secondary-action-button inline-submit"
              disabled={
                !canUpdateHomepage ||
                homepageConfig.highlights.cards.length >= 12
              }
              onClick={addHomepageHighlightCard}
              type="button"
            >
              <Plus aria-hidden="true" size={18} />
              <span>Add highlight</span>
            </button>
          </fieldset>
        </form>
      </section>
    );
  }

  function renderCataloguePage(): React.ReactElement {
    if (catalogueArea === "homepage") {
      return renderHomepageEditorPage();
    }

    if (catalogueArea === "categories") {
      return cataloguePageMode === "list"
        ? renderCategoryListPage()
        : renderCategoryFormPage();
    }

    if (catalogueArea === "packages") {
      return cataloguePageMode === "list"
        ? renderPackageListPage()
        : renderPackageFormPage();
    }

    return cataloguePageMode === "list"
      ? renderServiceListPage()
      : renderServiceFormPage();
  }

  function renderCatalogueDeleteDialog(): React.ReactElement | null {
    if (!catalogueDeleteTarget) {
      return null;
    }

    const title =
      catalogueDeleteTarget.area === "categories"
        ? "Delete category?"
        : catalogueDeleteTarget.area === "services"
          ? "Delete service?"
          : "Delete package?";
    const rowName = catalogueDeleteTarget.row.name;
    const actionKey =
      catalogueDeleteTarget.area === "categories"
        ? "category-delete"
        : catalogueDeleteTarget.area === "services"
          ? "service-delete"
          : "package-delete";

    return (
      <div className="modal-backdrop" role="presentation">
        <section
          aria-describedby="catalogue-delete-description"
          aria-labelledby="catalogue-delete-title"
          aria-modal="true"
          className="confirm-dialog"
          role="alertdialog"
        >
          <div className="confirm-icon">
            <AlertTriangle aria-hidden="true" size={22} />
          </div>
          <div>
            <h2 id="catalogue-delete-title">{title}</h2>
            <p id="catalogue-delete-description">
              {rowName} will be archived and kept in the database for history.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={actionSubmitting === actionKey}
              onClick={() => setCatalogueDeleteTarget(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="danger-button"
              disabled={actionSubmitting === actionKey}
              onClick={() => void handleConfirmDeleteCatalogue()}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === actionKey ? "Deleting" : "Delete"}
              </span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderDashboardPage(): React.ReactElement {
    const trend = dashboard?.bookingTrend ?? [];
    const maxBookings = Math.max(1, ...trend.map((point) => point.bookings));
    const statusMix = dashboard?.statusMix ?? [];
    const statusTotal = statusMix.reduce(
      (total, point) => total + point.value,
      0,
    );
    const pieColors = ["#5b0f7a", "#7c22ce", "#b781eb", "#d4af37", "#2f855a"];
    let currentPercent = 0;
    const statusGradient =
      statusTotal > 0
        ? `conic-gradient(${statusMix
            .map((point, index) => {
              const slice = (point.value / statusTotal) * 100;
              const start = currentPercent;
              currentPercent += slice;
              return `${pieColors[index % pieColors.length]} ${start}% ${currentPercent}%`;
            })
            .join(", ")})`
        : "conic-gradient(#e9dcfb 0% 100%)";
    const recentOrders = dashboard?.recentOrders ?? [];

    return (
      <>
        <section className="metrics-grid" aria-label="Dashboard metrics">
          {dashboard?.cards.map((card) => (
            <article
              className={`metric-card metric-${card.tone}`}
              key={card.key}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-chart-grid" aria-label="Dashboard charts">
          <article className="operation-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Last 7 days</p>
                <h2>Booking trend</h2>
              </div>
              <BarChart3 aria-hidden="true" className="panel-icon" size={20} />
            </div>
            <div className="bar-chart" aria-label="Bookings by day">
              {trend.map((point) => (
                <div className="bar-chart-column" key={point.label}>
                  <span
                    className="bar-chart-bar"
                    style={{
                      height: `${Math.max(8, (point.bookings / maxBookings) * 100)}%`,
                    }}
                  />
                  <strong>{point.bookings}</strong>
                  <small>{point.label}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="operation-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Booking state</p>
                <h2>Status mix</h2>
              </div>
              <LayoutDashboard
                aria-hidden="true"
                className="panel-icon"
                size={20}
              />
            </div>
            <div className="pie-chart-layout">
              <div className="pie-chart" style={{ background: statusGradient }}>
                <span>{statusTotal}</span>
              </div>
              <div className="provider-list">
                {statusMix.length > 0 ? (
                  statusMix.map((point, index) => (
                    <div className="provider-row" key={point.label}>
                      <span>
                        <i
                          className="legend-dot"
                          style={{
                            background: pieColors[index % pieColors.length],
                          }}
                        />
                        {formatLabel(point.label)}
                      </span>
                      <span className="status-badge">{point.value}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state dashboard-empty-state">
                    <span>No booking status data yet.</span>
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="staff-page" aria-label="Recent orders">
          <div className="panel-heading table-section-heading">
            <div>
              <p className="eyebrow">Latest activity</p>
              <h2>Recent orders</h2>
            </div>
          </div>
          <AdminDataTable
            columns={moduleColumns}
            emptyMessage="No recent orders exist yet."
            getRowId={(row) => row.id}
            loading={moduleLoading}
            onPageChange={() => undefined}
            onPageSizeChange={() => undefined}
            page={1}
            pageSize={Math.max(10, recentOrders.length || 10)}
            pageSizeOptions={[10]}
            rows={recentOrders}
            totalCount={recentOrders.length}
          />
        </section>
      </>
    );
  }

  function renderGenericModulePage(): React.ReactElement {
    const rows = moduleSnapshot?.records ?? [];

    return (
      <section className="staff-page" aria-label={`${activeModuleLabel} list`}>
        <AdminDataTable
          columns={moduleColumns}
          emptyMessage={moduleSnapshot?.emptyMessage ?? "No records found."}
          getRowId={(row) => row.id}
          loading={moduleLoading}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          page={1}
          pageSize={Math.max(10, rows.length || 10)}
          pageSizeOptions={[10]}
          rows={rows}
          totalCount={rows.length}
        />
      </section>
    );
  }

  function renderBookingAssignmentPanel(): React.ReactElement | null {
    if (!bookingDetail) {
      return null;
    }

    const currentStaffAlreadyListed =
      bookingDetail.staff === null
        ? true
        : bookingStaffOptions.some(
            (staff) => staff.id === bookingDetail.staff?.id,
          );

    return (
      <div
        className="modal-backdrop booking-modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setBookingDetail(null);
          }
        }}
      >
        <section
          aria-labelledby="booking-assignment-title"
          aria-modal="true"
          className="booking-assignment-panel booking-assignment-modal"
          role="dialog"
        >
          <div className="panel-heading booking-panel-heading">
            <div>
              <p className="eyebrow">
                Booking #{bookingDetail.publicId.slice(-8)}
              </p>
              <h2 id="booking-assignment-title">Manage booking</h2>
            </div>
            <button
              aria-label="Close booking detail"
              className="icon-button"
              onClick={() => setBookingDetail(null)}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>

          <div className="booking-summary-grid">
            <div>
              <span>Customer</span>
              <strong>{bookingDetail.customerName}</strong>
              {bookingDetail.customerPhone ? (
                <small>{bookingDetail.customerPhone}</small>
              ) : null}
            </div>
            <div>
              <span>Status</span>
              <strong>{formatLabel(bookingDetail.status)}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{formatLabel(bookingDetail.paymentStatus)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatInrPaise(bookingDetail.totalPaise)}</strong>
            </div>
          </div>

          <div className="booking-detail-block">
            <span className="field-label">Address</span>
            <p>{bookingDetail.addressSummary || "Address not captured"}</p>
          </div>

          <div className="booking-detail-block">
            <span className="field-label">Booked services</span>
            <ul className="booking-service-list">
              {bookingDetail.serviceNames.map((serviceName) => (
                <li key={serviceName}>{serviceName}</li>
              ))}
            </ul>
          </div>

          <form
            className="admin-form booking-assignment-form"
            key={bookingDetail.id}
            onSubmit={handleSaveBookingAssignment}
          >
            <div className="field-group">
              <label className="field-label" htmlFor="booking-scheduled-start">
                Slot start
              </label>
              <input
                className="text-field"
                defaultValue={formatDateTimeLocalValue(
                  bookingDetail.scheduledStartAt,
                )}
                id="booking-scheduled-start"
                name="booking-scheduled-start"
                required
                type="datetime-local"
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="booking-staff-profile-id">
                Professional assignment
              </label>
              <select
                className="text-field"
                defaultValue={bookingDetail.staff?.id ?? ""}
                disabled={!canAssignBookings || bookingStaffOptionsLoading}
                id="booking-staff-profile-id"
                name="booking-staff-profile-id"
              >
                <option value="">
                  Auto assign least-loaded eligible staff
                </option>
                {bookingDetail.staff && !currentStaffAlreadyListed ? (
                  <option value={bookingDetail.staff.id}>
                    {bookingDetail.staff.name} ·{" "}
                    {bookingDetail.staff.employeeCode}
                  </option>
                ) : null}
                {bookingStaffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} · {staff.employeeCode}
                  </option>
                ))}
              </select>
              <p className="form-help-text">
                The backend checks service eligibility, schedule windows and
                overlapping work before saving.
              </p>
            </div>

            <div className="field-group">
              <label
                className="field-label"
                htmlFor="booking-assignment-reason"
              >
                Change note
              </label>
              <textarea
                className="text-field text-area"
                id="booking-assignment-reason"
                maxLength={500}
                name="booking-assignment-reason"
                placeholder="Reason for changing slot or professional"
              />
            </div>

            <button
              className="primary-button"
              disabled={
                !canAssignBookings ||
                actionSubmitting === "booking-assignment-update"
              }
              type="submit"
            >
              <CalendarCheck aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === "booking-assignment-update"
                  ? "Saving"
                  : "Save assignment"}
              </span>
            </button>
          </form>
        </section>
      </div>
    );
  }

  function renderBookingsPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Booking operations">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleBookingSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="booking-search">
                Search bookings
              </label>
              <input
                className="text-field"
                id="booking-search"
                name="booking-search"
                onChange={(event) => setBookingSearchInput(event.target.value)}
                placeholder="Booking ID, customer, phone, service or address"
                type="search"
                value={bookingSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="booking-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="booking-status-filter"
                name="booking-status-filter"
                onChange={(event) => {
                  setBookingPage(1);
                  setBookingStatusFilter(
                    getBookingStatusFilter(event.currentTarget.value),
                  );
                }}
                value={bookingStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="ASSIGNMENT_PENDING">Assignment pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="EN_ROUTE">En route</option>
                <option value="ARRIVED">Arrived</option>
                <option value="IN_SERVICE">In service</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={bookingLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            <label className="page-size-control">
              <span>Sort</span>
              <select
                className="compact-select"
                onChange={(event) => {
                  setBookingPage(1);
                  setBookingSort(getBookingSort(event.currentTarget.value));
                }}
                value={bookingSort}
              >
                <option value="scheduledStartAt_desc">Latest slots</option>
                <option value="scheduledStartAt_asc">Earliest slots</option>
                <option value="createdAt_desc">Newest bookings</option>
                <option value="createdAt_asc">Oldest bookings</option>
                <option value="status_asc">Status A-Z</option>
                <option value="status_desc">Status Z-A</option>
                <option value="total_desc">Highest total</option>
                <option value="total_asc">Lowest total</option>
              </select>
            </label>
            <span className="status-badge">
              {
                bookingRows.filter((row) => row.status === "ASSIGNMENT_PENDING")
                  .length
              }{" "}
              pending on this page
            </span>
          </div>
        </div>

        <div className="booking-list-layout">
          <AdminDataTable
            columns={bookingColumns}
            emptyMessage={
              canViewBookings
                ? "No bookings match the current filters."
                : "You do not have permission to view bookings."
            }
            getRowId={(row) => row.id}
            loading={bookingLoading}
            onPageChange={setBookingPage}
            onPageSizeChange={handleBookingPageSizeChange}
            page={bookingPage}
            pageSize={bookingPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            rows={bookingRows}
            totalCount={bookingTotalCount}
          />
        </div>
        {renderBookingAssignmentPanel()}
      </section>
    );
  }

  function renderPaymentDetailPanel(): React.ReactElement | null {
    if (!paymentDetail) {
      return (
        <aside className="booking-assignment-panel" aria-label="Payment detail">
          <div className="empty-state staff-empty-state">
            <CreditCard aria-hidden="true" size={20} />
            <span>Select a payment to inspect provider verification.</span>
          </div>
        </aside>
      );
    }

    const syncKey = `payment-sync-${paymentDetail.id}`;
    const canSyncSelected =
      canSyncPayments && paymentDetail.provider === "razorpay";

    return (
      <aside className="booking-assignment-panel" aria-label="Payment detail">
        <div className="panel-heading booking-panel-heading">
          <div>
            <p className="eyebrow">
              Booking #{paymentDetail.bookingPublicId.slice(-8)}
            </p>
            <h2>Payment</h2>
          </div>
          <button
            aria-label="Close payment detail"
            className="icon-button"
            onClick={() => setPaymentDetail(null)}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>

        <div className="booking-summary-grid">
          <div>
            <span>Customer</span>
            <strong>{paymentDetail.customerName}</strong>
            {paymentDetail.customerPhone ? (
              <small>{paymentDetail.customerPhone}</small>
            ) : null}
          </div>
          <div>
            <span>Status</span>
            <strong>{formatLabel(paymentDetail.status)}</strong>
            <small>{paymentDetail.providerStatus ?? "Provider pending"}</small>
          </div>
          <div>
            <span>Amount</span>
            <strong>{formatInrPaise(paymentDetail.amountPaise)}</strong>
            <small>{paymentDetail.currency}</small>
          </div>
          <div>
            <span>Provider</span>
            <strong>{formatLabel(paymentDetail.provider)}</strong>
          </div>
        </div>

        <div className="booking-detail-block">
          <span className="field-label">Provider references</span>
          <ul className="booking-service-list payment-detail-list">
            <li>Order: {paymentDetail.providerOrderId ?? "Not recorded"}</li>
            <li>
              Payment: {paymentDetail.providerPaymentId ?? "Not verified"}
            </li>
            <li>Reference: {paymentDetail.providerRef ?? "Not recorded"}</li>
          </ul>
        </div>

        <div className="booking-detail-block">
          <span className="field-label">Verification</span>
          <p>Verified {formatTimestamp(paymentDetail.verifiedAt)}</p>
          <p>Captured {formatTimestamp(paymentDetail.capturedAt)}</p>
          <p>Updated {formatTimestamp(paymentDetail.updatedAt)}</p>
        </div>

        <div className="booking-detail-block">
          <span className="field-label">Reconciliation</span>
          <p>Invoice {paymentDetail.invoiceNo ?? "not issued"}</p>
          <p>
            Refunds {paymentDetail.refundCount} ·{" "}
            {formatInrPaise(paymentDetail.refundedPaise)}
          </p>
          <p>
            Webhook{" "}
            {paymentDetail.latestWebhookEvent
              ? `${formatLabel(paymentDetail.latestWebhookEvent)} / ${
                  paymentDetail.latestWebhookStatus
                    ? formatLabel(paymentDetail.latestWebhookStatus)
                    : "Received"
                }`
              : "not received"}
          </p>
        </div>

        <div className="booking-detail-block">
          <span className="field-label">Booked services</span>
          <ul className="booking-service-list">
            {paymentDetail.serviceNames.map((serviceName) => (
              <li key={serviceName}>{serviceName}</li>
            ))}
          </ul>
        </div>

        <button
          className="primary-button"
          disabled={!canSyncSelected || actionSubmitting === syncKey}
          onClick={() => void syncRazorpayPayment(paymentDetail.id)}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={16} />
          <span>
            {actionSubmitting === syncKey ? "Syncing" : "Sync Razorpay"}
          </span>
        </button>
      </aside>
    );
  }

  function renderPaymentsPage(): React.ReactElement {
    const capturedCount =
      paymentSummary.byStatus.find((row) => row.status === "CAPTURED")?.count ??
      0;

    return (
      <section className="staff-page" aria-label="Payment operations">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handlePaymentSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="payment-search">
                Search payments
              </label>
              <input
                className="text-field"
                id="payment-search"
                name="payment-search"
                onChange={(event) => setPaymentSearchInput(event.target.value)}
                placeholder="Booking, customer, phone or provider reference"
                type="search"
                value={paymentSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="payment-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="payment-status-filter"
                name="payment-status-filter"
                onChange={(event) => {
                  setPaymentPage(1);
                  setPaymentStatusFilter(
                    getPaymentStatusFilter(event.currentTarget.value),
                  );
                }}
                value={paymentStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="AUTHORIZED">Authorized</option>
                <option value="CAPTURED">Captured</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
                <option value="PARTIALLY_REFUNDED">Partially refunded</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={paymentLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            <label className="page-size-control">
              <span>Provider</span>
              <select
                className="compact-select"
                onChange={(event) => {
                  setPaymentPage(1);
                  setPaymentProviderFilter(
                    getPaymentProviderFilter(event.currentTarget.value),
                  );
                }}
                value={paymentProviderFilter}
              >
                <option value="ALL">All</option>
                <option value="razorpay">Razorpay</option>
                <option value="pay_after_service">Pay after service</option>
                <option value="development_razorpay">Development</option>
                <option value="seed">Seed</option>
              </select>
            </label>
            <label className="page-size-control">
              <span>Sort</span>
              <select
                className="compact-select"
                onChange={(event) => {
                  setPaymentPage(1);
                  setPaymentSort(getPaymentSort(event.currentTarget.value));
                }}
                value={paymentSort}
              >
                <option value="updatedAt_desc">Recently updated</option>
                <option value="updatedAt_asc">Oldest updated</option>
                <option value="createdAt_desc">Newest created</option>
                <option value="createdAt_asc">Oldest created</option>
                <option value="amount_desc">Highest amount</option>
                <option value="amount_asc">Lowest amount</option>
                <option value="status_asc">Status A-Z</option>
                <option value="status_desc">Status Z-A</option>
              </select>
            </label>
            <span className="status-badge">
              {capturedCount} captured ·{" "}
              {formatInrPaise(paymentSummary.capturedAmountPaise)}
            </span>
          </div>
        </div>

        <div className="payment-summary-strip" aria-label="Payment status mix">
          {paymentSummary.byStatus.length > 0 ? (
            paymentSummary.byStatus.map((row) => (
              <span className="status-badge" key={row.status}>
                {formatLabel(row.status)} {row.count}
              </span>
            ))
          ) : (
            <span className="status-badge">No status totals</span>
          )}
        </div>

        <div className="booking-desk-layout">
          <AdminDataTable
            columns={paymentColumns}
            emptyMessage={
              canViewPayments
                ? "No payments match the current filters."
                : "You do not have permission to view payments."
            }
            getRowId={(row) => row.id}
            loading={paymentLoading}
            onPageChange={setPaymentPage}
            onPageSizeChange={handlePaymentPageSizeChange}
            page={paymentPage}
            pageSize={paymentPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            rows={paymentRows}
            totalCount={paymentTotalCount}
          />
          {renderPaymentDetailPanel()}
        </div>
      </section>
    );
  }

  function renderReviewsPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Review moderation">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleReviewSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="review-search">
                Search reviews
              </label>
              <input
                className="text-field"
                id="review-search"
                name="review-search"
                onChange={(event) => setReviewSearchInput(event.target.value)}
                placeholder="Customer, booking, service or comment"
                type="search"
                value={reviewSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="review-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="review-status-filter"
                name="review-status-filter"
                onChange={(event) => {
                  setReviewPage(1);
                  setReviewStatusFilter(
                    getReviewStatusFilter(event.currentTarget.value),
                  );
                }}
                value={reviewStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="HIDDEN">Hidden</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={reviewLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            <span className="status-badge">
              {reviewRows.filter((row) => row.status === "PENDING").length}{" "}
              pending on this page
            </span>
          </div>
        </div>

        <AdminDataTable
          columns={reviewColumns}
          emptyMessage={
            canViewReviews
              ? "No customer reviews match the current filters."
              : "You do not have permission to view reviews."
          }
          getRowId={(row) => row.id}
          loading={reviewLoading}
          onPageChange={setReviewPage}
          onPageSizeChange={handleReviewPageSizeChange}
          page={reviewPage}
          pageSize={reviewPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={reviewRows}
          totalCount={reviewTotalCount}
        />
      </section>
    );
  }

  function renderAdminUserListPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="User list">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleAdminUserSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="admin-user-search">
                Search users
              </label>
              <input
                className="text-field"
                id="admin-user-search"
                name="admin-user-search"
                onChange={(event) =>
                  setAdminUserSearchInput(event.target.value)
                }
                placeholder="Name, email, phone or role"
                type="search"
                value={adminUserSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="admin-user-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="admin-user-status-filter"
                name="admin-user-status-filter"
                onChange={(event) => {
                  setAdminUserPage(1);
                  setAdminUserStatusFilter(
                    getStaffStatusFilter(event.currentTarget.value),
                  );
                }}
                value={adminUserStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="INVITED">Invited</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={adminUserLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            {canExportAdminUser ? (
              <button
                className="secondary-button"
                disabled={actionSubmitting === "admin-user-export"}
                onClick={() => void handleExportAdminUsers()}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                <span>
                  {actionSubmitting === "admin-user-export"
                    ? "Exporting"
                    : "Export"}
                </span>
              </button>
            ) : null}
            {canCreateAdminUser ? (
              <button
                className="primary-button table-add-button"
                onClick={() => router.push(getUserManagementNewPath("users"))}
                type="button"
              >
                <UserPlus aria-hidden="true" size={16} />
                <span>Add User</span>
              </button>
            ) : null}
          </div>
        </div>
        <AdminDataTable
          columns={adminUserColumns}
          emptyMessage="No admin users found."
          getRowId={(row) => row.id}
          loading={adminUserLoading}
          onPageChange={setAdminUserPage}
          onPageSizeChange={handleAdminUserPageSizeChange}
          page={adminUserPage}
          pageSize={adminUserPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={adminUserRows}
          totalCount={adminUserTotalCount}
        />
      </section>
    );
  }

  function renderAdminUserFormPage(): React.ReactElement {
    const isEditMode = userManagementPageMode === "edit";
    const canSubmit = isEditMode ? canUpdateAdminUser : canCreateAdminUser;
    const formUser = isEditMode ? adminUserDetail : null;
    const submitKey = isEditMode ? "admin-user-update" : "admin-user-create";
    const assignedRoleIds = new Set(
      formUser?.roles.map((role) => role.id) ?? [],
    );

    if (!canSubmit) {
      return (
        <section className="staff-page" aria-label="User permission">
          <div className="empty-state staff-empty-state">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>You do not have permission for this operation.</span>
          </div>
        </section>
      );
    }

    if (isEditMode && adminUserLoading && !formUser) {
      return (
        <section className="staff-page" aria-label="Loading user">
          <div className="empty-state staff-empty-state">
            <RefreshCw aria-hidden="true" size={20} />
            <span>Loading user</span>
          </div>
        </section>
      );
    }

    if (isEditMode && !formUser) {
      return (
        <section className="staff-page" aria-label="User unavailable">
          <div className="empty-state staff-empty-state">
            <AlertTriangle aria-hidden="true" size={20} />
            <span>User is not available.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label={workspaceTitle}>
        <div className="record-page-header">
          <button
            className="secondary-button"
            onClick={() => router.push(getUserManagementAreaPath("users"))}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back</span>
          </button>
        </div>
        <form
          className="admin-form staff-record-form"
          onSubmit={handleSaveAdminUser}
        >
          <div className="form-grid form-grid-two">
            <div className="field-group">
              <label className="field-label" htmlFor="admin-user-name">
                Name
              </label>
              <input
                className="text-field"
                defaultValue={formUser?.name ?? ""}
                id="admin-user-name"
                name="admin-user-name"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-user-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="text-field"
                defaultValue={formUser?.email ?? ""}
                id="admin-user-email"
                name="admin-user-email"
                required
                type="email"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-user-phone">
                Phone
              </label>
              <input
                autoComplete="tel"
                className="text-field"
                defaultValue={formUser?.phone ?? ""}
                id="admin-user-phone"
                name="admin-user-phone"
                type="tel"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-user-status">
                Status
              </label>
              <select
                className="text-field"
                defaultValue={formUser?.status ?? "ACTIVE"}
                id="admin-user-status"
                name="admin-user-status"
              >
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="SUSPENDED">Suspended</option>
                {isEditMode ? <option value="DISABLED">Disabled</option> : null}
              </select>
            </div>
            <div className="field-group form-grid-span">
              <label
                className="field-label"
                htmlFor="admin-user-temporary-password"
              >
                Temporary password
              </label>
              <input
                autoComplete="new-password"
                className="text-field"
                id="admin-user-temporary-password"
                minLength={12}
                name="admin-user-temporary-password"
                required={!isEditMode}
                type="password"
              />
            </div>
          </div>
          <fieldset className="permission-group user-role-fieldset">
            <legend>Assigned roles</legend>
            <div className="checkbox-grid">
              {roleOptions.map((role) => (
                <label className="checkbox-row" key={role.id}>
                  <input
                    defaultChecked={assignedRoleIds.has(role.id)}
                    name="admin-user-role-ids"
                    type="checkbox"
                    value={role.id}
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-actions-row">
            <button
              className="secondary-button"
              onClick={() => router.push(getUserManagementAreaPath("users"))}
              type="button"
            >
              Cancel
            </button>
            <button
              className="primary-button inline-submit"
              disabled={
                actionSubmitting === submitKey || roleOptions.length === 0
              }
              type="submit"
            >
              <UserPlus aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === submitKey
                  ? "Saving"
                  : isEditMode
                    ? "Save User"
                    : "Add User"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderRoleListPage(): React.ReactElement {
    return (
      <section className="staff-page" aria-label="Role list">
        <div className="table-toolbar">
          <form className="table-search-form" onSubmit={handleRoleSearch}>
            <div className="field-group table-search-field">
              <label className="field-label" htmlFor="role-search">
                Search roles
              </label>
              <input
                className="text-field"
                id="role-search"
                name="role-search"
                onChange={(event) => setRoleSearchInput(event.target.value)}
                placeholder="Name or description"
                type="search"
                value={roleSearchInput}
              />
            </div>
            <div className="field-group table-filter-field">
              <label className="field-label" htmlFor="role-status-filter">
                Status
              </label>
              <select
                className="text-field"
                id="role-status-filter"
                name="role-status-filter"
                onChange={(event) => {
                  setRolePage(1);
                  setRoleStatusFilter(
                    getRoleStatusFilter(event.currentTarget.value),
                  );
                }}
                value={roleStatusFilter}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <button
              className="secondary-button table-search-button"
              disabled={roleLoading}
              type="submit"
            >
              <Search aria-hidden="true" size={16} />
              <span>Search</span>
            </button>
          </form>
          <div className="table-toolbar-actions">
            {canExportRole ? (
              <button
                className="secondary-button"
                disabled={actionSubmitting === "role-export"}
                onClick={() => void handleExportRoles()}
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                <span>
                  {actionSubmitting === "role-export" ? "Exporting" : "Export"}
                </span>
              </button>
            ) : null}
            {canCreateRole ? (
              <button
                className="primary-button table-add-button"
                onClick={() => router.push(getUserManagementNewPath("roles"))}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                <span>Add Role</span>
              </button>
            ) : null}
          </div>
        </div>
        <AdminDataTable
          columns={roleColumns}
          emptyMessage="No roles found."
          getRowId={(row) => row.id}
          loading={roleLoading}
          onPageChange={setRolePage}
          onPageSizeChange={handleRolePageSizeChange}
          page={rolePage}
          pageSize={rolePageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          rows={roleRows}
          totalCount={roleTotalCount}
        />
      </section>
    );
  }

  function renderRoleFormPage(): React.ReactElement {
    const isEditMode = userManagementPageMode === "edit";
    const canSubmit = isEditMode ? canUpdateRole : canCreateRole;
    const formRole = isEditMode ? roleDetail : null;
    const submitKey = isEditMode ? "role-update" : "role-create";
    const selectedPermissionKeys = new Set(formRole?.permissionKeys ?? []);

    if (!canSubmit) {
      return (
        <section className="staff-page" aria-label="Role permission">
          <div className="empty-state staff-empty-state">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>You do not have permission for this operation.</span>
          </div>
        </section>
      );
    }

    if (isEditMode && roleLoading && !formRole) {
      return (
        <section className="staff-page" aria-label="Loading role">
          <div className="empty-state staff-empty-state">
            <RefreshCw aria-hidden="true" size={20} />
            <span>Loading role</span>
          </div>
        </section>
      );
    }

    if (isEditMode && (!formRole || formRole.isSystem || formRole.archivedAt)) {
      return (
        <section className="staff-page" aria-label="Role unavailable">
          <div className="empty-state staff-empty-state">
            <AlertTriangle aria-hidden="true" size={20} />
            <span>Role is not available for editing.</span>
          </div>
        </section>
      );
    }

    return (
      <section className="staff-page" aria-label={workspaceTitle}>
        <div className="record-page-header">
          <button
            className="secondary-button"
            onClick={() => router.push(getUserManagementAreaPath("roles"))}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            <span>Back</span>
          </button>
        </div>
        <form
          className="admin-form staff-record-form"
          onSubmit={handleSaveRole}
        >
          <div className="form-grid form-grid-two">
            <div className="field-group">
              <label className="field-label" htmlFor="role-name">
                Role name
              </label>
              <input
                className="text-field"
                defaultValue={formRole?.name ?? ""}
                id="role-name"
                name="role-name"
                required
                type="text"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="role-description">
                Description
              </label>
              <input
                className="text-field"
                defaultValue={formRole?.description ?? ""}
                id="role-description"
                name="role-description"
                type="text"
              />
            </div>
          </div>
          <div className="permission-matrix" aria-label="Permissions">
            {permissionGroups.length > 0 ? (
              permissionGroups.map((group) => (
                <fieldset className="permission-group" key={group.resource}>
                  <legend>{formatLabel(group.resource)}</legend>
                  <div className="checkbox-grid">
                    {group.permissions.map((permission) => (
                      <label className="checkbox-row" key={permission.key}>
                        <input
                          defaultChecked={selectedPermissionKeys.has(
                            permission.key,
                          )}
                          name="permissionKeys"
                          type="checkbox"
                          value={permission.key}
                        />
                        <span>{formatLabel(permission.action)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))
            ) : (
              <div className="empty-state module-tool-empty">
                <RefreshCw aria-hidden="true" size={18} />
                <span>Loading permissions</span>
              </div>
            )}
          </div>
          <div className="form-actions-row">
            <button
              className="secondary-button"
              onClick={() => router.push(getUserManagementAreaPath("roles"))}
              type="button"
            >
              Cancel
            </button>
            <button
              className="primary-button inline-submit"
              disabled={
                actionSubmitting === submitKey || permissionGroups.length === 0
              }
              type="submit"
            >
              <ShieldCheck aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === submitKey
                  ? "Saving"
                  : isEditMode
                    ? "Save Role"
                    : "Add Role"}
              </span>
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderUserManagementPage(): React.ReactElement {
    if (userManagementArea === "users") {
      return userManagementPageMode === "list"
        ? renderAdminUserListPage()
        : renderAdminUserFormPage();
    }

    return userManagementPageMode === "list"
      ? renderRoleListPage()
      : renderRoleFormPage();
  }

  function renderUserManagementDeleteDialog(): React.ReactElement | null {
    if (!userManagementDeleteTarget) {
      return null;
    }

    const isUserTarget = userManagementDeleteTarget.area === "users";
    const rowName = userManagementDeleteTarget.row.name;
    const actionKey = isUserTarget ? "admin-user-delete" : "role-delete";

    return (
      <div className="modal-backdrop" role="presentation">
        <section
          aria-describedby="user-management-delete-description"
          aria-labelledby="user-management-delete-title"
          aria-modal="true"
          className="confirm-dialog"
          role="alertdialog"
        >
          <div className="confirm-icon">
            <AlertTriangle aria-hidden="true" size={22} />
          </div>
          <div>
            <h2 id="user-management-delete-title">
              {isUserTarget ? "Deactivate user?" : "Archive role?"}
            </h2>
            <p id="user-management-delete-description">
              {rowName} will be {isUserTarget ? "disabled" : "archived"} and
              kept in the database for history.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={actionSubmitting === actionKey}
              onClick={() => setUserManagementDeleteTarget(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="danger-button"
              disabled={actionSubmitting === actionKey}
              onClick={() => void handleConfirmDeleteUserManagement()}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              <span>
                {actionSubmitting === actionKey
                  ? isUserTarget
                    ? "Deactivating"
                    : "Archiving"
                  : isUserTarget
                    ? "Deactivate"
                    : "Archive"}
              </span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <main className="admin-auth-screen" aria-busy="true">
        <section
          className="auth-panel auth-panel-narrow"
          aria-label="Checking session"
        >
          <div className="auth-brand">
            <BrandLogo className="replica-brand-admin-auth" subtitle="Admin" />
          </div>
          <div className="auth-loading">
            <RefreshCw aria-hidden="true" size={18} />
            <span>Checking session</span>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-auth-screen admin-login-screen">
        <section className="login-visual-panel" aria-label="Operations preview">
          <div className="login-visual-header">
            <div className="auth-brand auth-brand-light">
              <BrandLogo
                className="replica-brand-admin-auth"
                subtitle="Admin"
              />
            </div>
            <span className="visual-status">Live</span>
          </div>

          <div className="visual-stage" aria-hidden="true">
            <div className="visual-route">
              <span />
              <span />
              <span />
            </div>
            <div className="visual-card visual-card-booking">
              <strong>12:30</strong>
              <span>Home facial</span>
            </div>
            <div className="visual-card visual-card-staff">
              <strong>Assigned</strong>
              <span>South zone</span>
            </div>
            <div className="visual-card visual-card-payment">
              <strong>Ready</strong>
              <span>Payment sync</span>
            </div>
            <div className="visual-calendar">
              {["M", "T", "W", "T", "F", "S"].map((day, index) => (
                <span
                  className={index === 2 || index === 4 ? "is-active" : ""}
                  key={`${day}-${index}`}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          <div className="visual-copy">
            <p className="eyebrow">{BRAND_NAME}</p>
            <h2>Operations desk for bookings, staff and service control.</h2>
          </div>
        </section>

        <section className="auth-panel" aria-labelledby="admin-login-title">
          <div className="auth-panel-heading">
            <div className="auth-brand compact-brand">
              <BrandLogo
                className="replica-brand-admin-auth"
                subtitle="Admin"
              />
            </div>
            <div>
              <p className="eyebrow">Invite-only access</p>
              <h1 className="auth-title" id="admin-login-title">
                Sign in
              </h1>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="text-field"
                id="admin-email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="admin-password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className="text-field"
                id="admin-password"
                minLength={1}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {error ? (
              <div className="message message-error">{error}</div>
            ) : null}
            {notice ? (
              <div className="message message-success">{notice}</div>
            ) : null}
            <button
              className="primary-button"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <RefreshCw aria-hidden="true" size={17} />
              ) : (
                <LogIn aria-hidden="true" size={17} />
              )}
              <span>{submitting ? "Signing in" : "Sign in"}</span>
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div
      className={`admin-app-shell ${sidebarCollapsed ? "admin-app-shell-collapsed" : ""}`}
    >
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onClose={() => setNavOpen(false)}
        open={navOpen}
        userName={user.name}
      >
        <nav className="admin-module-nav">
          <p className="admin-nav-section-label">Workspace</p>
          <button
            aria-current={isDashboardRoute ? "page" : undefined}
            className="admin-module-button"
            onClick={selectDashboard}
            type="button"
          >
            <Home aria-hidden="true" size={16} />
            <span>Dashboard</span>
          </button>
          {ADMIN_MODULES.map((moduleItem) => {
            const ModuleIcon = MODULE_ICONS[moduleItem.key];

            if (moduleItem.key === "catalogue") {
              return (
                <div className="admin-nav-group" key={moduleItem.key}>
                  <button
                    aria-expanded={isCatalogueRoute}
                    className="admin-module-button admin-module-parent"
                    data-active={isCatalogueRoute ? "true" : undefined}
                    disabled={moduleLoading && moduleItem.key === activeModule}
                    onClick={() => selectCatalogueArea("categories")}
                    type="button"
                  >
                    <ModuleIcon aria-hidden="true" size={16} />
                    <span>{moduleItem.label}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="nav-parent-chevron"
                      size={15}
                    />
                  </button>
                  {isCatalogueRoute ? (
                    <div className="admin-subnav" aria-label="Catalogue pages">
                      {CATALOGUE_NAV_ITEMS.map((childItem) => {
                        const ChildIcon = childItem.icon;

                        return (
                          <button
                            aria-current={
                              childItem.key === catalogueArea
                                ? "page"
                                : undefined
                            }
                            className="admin-module-button admin-subnav-button"
                            key={childItem.key}
                            onClick={() => selectCatalogueArea(childItem.key)}
                            type="button"
                          >
                            <ChildIcon aria-hidden="true" size={15} />
                            <span>{childItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <button
                aria-current={
                  routeModule === moduleItem.key ? "page" : undefined
                }
                className="admin-module-button"
                disabled={moduleLoading && moduleItem.key === activeModule}
                key={moduleItem.key}
                onClick={() => void selectModule(moduleItem.key)}
                type="button"
              >
                <ModuleIcon aria-hidden="true" size={16} />
                <span>{moduleItem.label}</span>
              </button>
            );
          })}
          <button
            className="admin-module-button"
            onClick={() => router.push("/admin/blogs")}
            type="button"
          >
            <BookOpen aria-hidden="true" size={16} />
            <span>Blogs</span>
          </button>
          <p className="admin-nav-section-label admin-nav-section-spacer">
            Access control
          </p>
          <div className="admin-nav-group">
            <button
              aria-expanded={isUserManagementRoute}
              className="admin-module-button admin-module-parent"
              data-active={isUserManagementRoute ? "true" : undefined}
              onClick={() => selectUserManagementArea("users")}
              type="button"
            >
              <Users aria-hidden="true" size={16} />
              <span>User Management</span>
              <ChevronDown
                aria-hidden="true"
                className="nav-parent-chevron"
                size={15}
              />
            </button>
            {isUserManagementRoute ? (
              <div className="admin-subnav" aria-label="User management pages">
                {USER_MANAGEMENT_NAV_ITEMS.map((childItem) => {
                  const ChildIcon = childItem.icon;

                  return (
                    <button
                      aria-current={
                        childItem.key === userManagementArea
                          ? "page"
                          : undefined
                      }
                      className="admin-module-button admin-subnav-button"
                      key={childItem.key}
                      onClick={() => selectUserManagementArea(childItem.key)}
                      type="button"
                    >
                      <ChildIcon aria-hidden="true" size={15} />
                      <span>{childItem.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>
      </AdminSidebar>

      {navOpen ? (
        <button
          aria-label="Close navigation"
          className="admin-nav-backdrop"
          onClick={() => setNavOpen(false)}
          type="button"
        />
      ) : null}

      <main
        className={`admin-workspace ${
          isDashboardRoute ? "admin-dashboard-workspace" : ""
        }`}
      >
        <AdminHeader
          collapsed={sidebarCollapsed}
          commands={ADMIN_COMMANDS}
          onCommand={(path) => router.push(path)}
          onLogout={() => void handleLogout()}
          onOpenMobileNavigation={() => setNavOpen(true)}
          onRefresh={() => void handleRefresh()}
          onToggleCollapsed={() => {
            const nextValue = !sidebarCollapsed;
            setSidebarCollapsed(nextValue);
            window.localStorage.setItem(
              "replica-admin-sidebar-collapsed",
              String(nextValue),
            );
          }}
          refreshing={refreshing}
          title={workspaceTitle}
          userName={user.name}
          userRole={
            user.roles[0] ? formatLabel(user.roles[0]) : "Administrator"
          }
        />

        <div
          className={`admin-page-titlebar ${isDashboardRoute ? "admin-dashboard-welcome" : ""}`}
        >
          <div>
            {isDashboardRoute ? (
              <>
                <h1 className="workspace-title">
                  Welcome back, {user.name.split(" ")[0]}
                </h1>
                <p className="admin-page-subtitle">
                  Bookings, customers and salon operations at a glance.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Admin operations</p>
                <h1 className="workspace-title">{workspaceTitle}</h1>
              </>
            )}
          </div>
        </div>

        {error ? <div className="message message-error">{error}</div> : null}
        {notice ? (
          <div className="message message-success">{notice}</div>
        ) : null}

        {isStaffRoute
          ? renderStaffPage()
          : isCatalogueRoute
            ? renderCataloguePage()
            : isUserManagementRoute
              ? renderUserManagementPage()
              : isBookingsRoute
                ? renderBookingsPage()
                : isPaymentsRoute
                  ? renderPaymentsPage()
                  : isReviewsRoute
                    ? renderReviewsPage()
                    : isDashboardRoute
                      ? renderDashboardPage()
                      : renderGenericModulePage()}
        {renderStaffDeleteDialog()}
        {renderCatalogueDeleteDialog()}
        {renderUserManagementDeleteDialog()}
      </main>
    </div>
  );
}
