import { z } from "zod";
import {
  publicHomepageConfigSchema,
  servicePackageInputSchema,
  serviceTierInputSchema,
} from "./customer.js";
import { paginationQuerySchema } from "./http.js";
import {
  permissionActionSchema,
  permissionKeySchema,
  permissionResourceSchema,
  staffEngagementTypeSchema,
  userStatusSchema,
} from "./rbac.js";

export const adminLoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

export const adminModuleKeySchema = z.enum([
  "bookings",
  "customers",
  "staff",
  "catalogue",
  "payments",
  "reviews",
  "reports",
  "notifications",
  "roles",
]);

export const adminListQuerySchema = paginationQuerySchema.extend({
  status: z.string().trim().max(40).optional(),
});

export const adminStaffSortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "employeeCode_asc",
    "employeeCode_desc",
    "status_asc",
    "status_desc",
    "engagementType_asc",
    "engagementType_desc",
  ])
  .default("updatedAt_desc");

export const adminStaffListQuerySchema = paginationQuerySchema.extend({
  status: userStatusSchema.optional(),
  sort: adminStaffSortSchema,
});

export const adminCategorySortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "name_asc",
    "name_desc",
    "status_asc",
    "status_desc",
  ])
  .default("updatedAt_desc");

export const adminCategoryListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: adminCategorySortSchema,
});

export const adminServiceSortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "name_asc",
    "name_desc",
    "status_asc",
    "status_desc",
    "price_asc",
    "price_desc",
    "duration_asc",
    "duration_desc",
  ])
  .default("updatedAt_desc");

export const adminServiceListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: adminServiceSortSchema,
});

export const adminPackageSortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "name_asc",
    "name_desc",
    "status_asc",
    "status_desc",
    "price_asc",
    "price_desc",
    "duration_asc",
    "duration_desc",
  ])
  .default("updatedAt_desc");

export const adminPackageListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().trim().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: adminPackageSortSchema,
});

export const adminBookingSortSchema = z
  .enum([
    "scheduledStartAt_desc",
    "scheduledStartAt_asc",
    "createdAt_desc",
    "createdAt_asc",
    "status_asc",
    "status_desc",
    "total_asc",
    "total_desc",
  ])
  .default("scheduledStartAt_desc");

export const adminBookingListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      "DRAFT",
      "CONFIRMED",
      "ASSIGNMENT_PENDING",
      "ASSIGNED",
      "ACCEPTED",
      "EN_ROUTE",
      "ARRIVED",
      "IN_SERVICE",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  sort: adminBookingSortSchema,
});

export const adminPaymentStatusSchema = z.enum([
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const adminPaymentSortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "createdAt_desc",
    "createdAt_asc",
    "amount_desc",
    "amount_asc",
    "status_asc",
    "status_desc",
  ])
  .default("updatedAt_desc");

export const adminPaymentListQuerySchema = paginationQuerySchema.extend({
  status: adminPaymentStatusSchema.optional(),
  provider: z.string().trim().max(60).optional(),
  sort: adminPaymentSortSchema,
});

export const adminUpdateBookingAssignmentRequestSchema = z.object({
  scheduledStartAt: z.string().datetime(),
  staffProfileId: z.string().trim().min(1).optional(),
  reason: z.string().trim().max(500).optional(),
});

export const adminUserSortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "name_asc",
    "name_desc",
    "status_asc",
    "status_desc",
  ])
  .default("updatedAt_desc");

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  status: userStatusSchema.optional(),
  sort: adminUserSortSchema,
});

export const adminRoleSortSchema = z
  .enum([
    "updatedAt_desc",
    "updatedAt_asc",
    "name_asc",
    "name_desc",
    "status_asc",
    "status_desc",
  ])
  .default("updatedAt_desc");

export const adminRoleListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  sort: adminRoleSortSchema,
});

export const reviewModerationStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "HIDDEN",
  "REJECTED",
]);

export const adminReviewSortSchema = z
  .enum([
    "createdAt_desc",
    "createdAt_asc",
    "rating_desc",
    "rating_asc",
    "status_asc",
    "status_desc",
  ])
  .default("createdAt_desc");

export const adminReviewListQuerySchema = paginationQuerySchema.extend({
  status: reviewModerationStatusSchema.optional(),
  sort: adminReviewSortSchema,
});

export const adminUpdateReviewRequestSchema = z.object({
  status: reviewModerationStatusSchema,
  showOnHomepage: z.boolean(),
});

export const rolePermissionSchema = z.object({
  resource: permissionResourceSchema,
  action: permissionActionSchema,
  enabled: z.boolean(),
});

export const publishStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const adminInviteRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(120),
  roleIds: z.array(z.string().min(1)).min(1),
});

export const adminCreateStaffRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    phone: z.string().trim().min(6).max(32).optional(),
    employeeCode: z.string().trim().min(1).max(80),
    engagementType: staffEngagementTypeSchema,
    emergencyPhone: z.string().trim().min(6).max(32).optional(),
    serviceIds: z.array(z.string().trim().min(1)).max(100).default([]),
    status: userStatusSchema.optional(),
  })
  .refine((value) => value.email || value.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
  });

export const adminUpdateStaffRequestSchema = adminCreateStaffRequestSchema;

export const adminCreateRoleRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  permissionKeys: z.array(permissionKeySchema).min(1).max(200),
});

export const adminUpdateRoleRequestSchema = adminCreateRoleRequestSchema;

export const adminCreateCategoryRequestSchema = z.object({
  name: z.string().trim().min(1).max(160),
  parentId: z.string().trim().min(1).optional(),
  description: z.string().trim().max(1000).optional(),
  imageAssetId: z.string().trim().min(1).optional(),
  status: publishStatusSchema.optional(),
});

export const adminUpdateCategoryRequestSchema =
  adminCreateCategoryRequestSchema;

export const adminCreateServiceRequestSchema = z
  .object({
    categoryId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(180),
    shortDescription: z.string().trim().max(320).optional(),
    fullDescription: z.string().trim().max(12_000).optional(),
    durationMinutes: z.number().int().min(5).max(600),
    pricePaise: z.number().int().min(0).max(10_000_000),
    compareAtPricePaise: z.number().int().min(0).max(10_000_000).optional(),
    gstRateBps: z.number().int().min(0).max(10_000).optional(),
    featured: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
    dealEnabled: z.boolean().optional(),
    dealPricePaise: z.number().int().min(0).max(10_000_000).optional(),
    dealStartsAt: z.string().datetime().optional(),
    dealEndsAt: z.string().datetime().optional(),
    mainImageAssetId: z.string().trim().min(1).optional(),
    imageAssetIds: z.array(z.string().trim().min(1)).max(12).optional(),
    tiers: z.array(serviceTierInputSchema).min(2).max(2).optional(),
    status: publishStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.dealPricePaise !== undefined &&
      value.dealPricePaise > value.pricePaise
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Deal price cannot be higher than the service price.",
        path: ["dealPricePaise"],
      });
    }

    if (value.dealEnabled && !value.dealStartsAt) {
      ctx.addIssue({
        code: "custom",
        message: "Choose when the deal starts.",
        path: ["dealStartsAt"],
      });
    }

    if (value.dealEnabled && !value.dealEndsAt) {
      ctx.addIssue({
        code: "custom",
        message: "Choose when the deal ends.",
        path: ["dealEndsAt"],
      });
    }

    if (value.dealStartsAt && value.dealEndsAt) {
      const startsAt = Date.parse(value.dealStartsAt);
      const endsAt = Date.parse(value.dealEndsAt);

      if (!Number.isNaN(startsAt) && !Number.isNaN(endsAt)) {
        if (startsAt >= endsAt) {
          ctx.addIssue({
            code: "custom",
            message: "Deal end time must be after the start time.",
            path: ["dealEndsAt"],
          });
        }
      }
    }
  });

export const adminUpdateServiceRequestSchema = adminCreateServiceRequestSchema;

export const adminCreatePackageRequestSchema = servicePackageInputSchema;
export const adminUpdatePackageRequestSchema = servicePackageInputSchema;

export const adminUpdateHomepageRequestSchema = publicHomepageConfigSchema;

export const adminCreateUserRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    phone: z.string().trim().min(6).max(32).optional(),
    status: userStatusSchema.optional(),
    roleIds: z.array(z.string().trim().min(1)).min(1).max(20),
    temporaryPassword: z.string().min(12).max(256),
  })
  .refine((value) => value.email || value.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
  });

export const adminUpdateUserRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    phone: z.string().trim().min(6).max(32).optional(),
    status: userStatusSchema.optional(),
    roleIds: z.array(z.string().trim().min(1)).min(1).max(20),
    temporaryPassword: z.string().min(12).max(256).optional(),
  })
  .refine((value) => value.email || value.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
  });

export const adminImageUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  dataBase64: z.string().min(1).max(7_000_000),
  altText: z.string().trim().max(240).optional(),
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminStaffListQuery = z.infer<typeof adminStaffListQuerySchema>;
export type AdminStaffSort = z.infer<typeof adminStaffSortSchema>;
export type AdminCategoryListQuery = z.infer<
  typeof adminCategoryListQuerySchema
>;
export type AdminCategorySort = z.infer<typeof adminCategorySortSchema>;
export type AdminServiceListQuery = z.infer<typeof adminServiceListQuerySchema>;
export type AdminServiceSort = z.infer<typeof adminServiceSortSchema>;
export type AdminPackageListQuery = z.infer<typeof adminPackageListQuerySchema>;
export type AdminPackageSort = z.infer<typeof adminPackageSortSchema>;
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;
export type AdminBookingSort = z.infer<typeof adminBookingSortSchema>;
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;
export type AdminPaymentSort = z.infer<typeof adminPaymentSortSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserSort = z.infer<typeof adminUserSortSchema>;
export type AdminRoleListQuery = z.infer<typeof adminRoleListQuerySchema>;
export type AdminRoleSort = z.infer<typeof adminRoleSortSchema>;
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;
export type AdminReviewSort = z.infer<typeof adminReviewSortSchema>;
export type ReviewModerationStatus = z.infer<
  typeof reviewModerationStatusSchema
>;
export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminModuleKey = z.infer<typeof adminModuleKeySchema>;
export type RolePermission = z.infer<typeof rolePermissionSchema>;
export type AdminInviteRequest = z.infer<typeof adminInviteRequestSchema>;
export type AdminCreateStaffRequest = z.infer<
  typeof adminCreateStaffRequestSchema
>;
export type AdminUpdateStaffRequest = z.infer<
  typeof adminUpdateStaffRequestSchema
>;
export type AdminCreateRoleRequest = z.infer<
  typeof adminCreateRoleRequestSchema
>;
export type AdminUpdateRoleRequest = z.infer<
  typeof adminUpdateRoleRequestSchema
>;
export type AdminCreateCategoryRequest = z.infer<
  typeof adminCreateCategoryRequestSchema
>;
export type AdminUpdateCategoryRequest = z.infer<
  typeof adminUpdateCategoryRequestSchema
>;
export type AdminCreateServiceRequest = z.infer<
  typeof adminCreateServiceRequestSchema
>;
export type AdminUpdateServiceRequest = z.infer<
  typeof adminUpdateServiceRequestSchema
>;
export type AdminCreatePackageRequest = z.infer<
  typeof adminCreatePackageRequestSchema
>;
export type AdminUpdatePackageRequest = z.infer<
  typeof adminUpdatePackageRequestSchema
>;
export type AdminUpdateBookingAssignmentRequest = z.infer<
  typeof adminUpdateBookingAssignmentRequestSchema
>;
export type AdminUpdateHomepageRequest = z.infer<
  typeof adminUpdateHomepageRequestSchema
>;
export type AdminCreateUserRequest = z.infer<
  typeof adminCreateUserRequestSchema
>;
export type AdminUpdateUserRequest = z.infer<
  typeof adminUpdateUserRequestSchema
>;
export type AdminImageUploadRequest = z.infer<
  typeof adminImageUploadRequestSchema
>;
