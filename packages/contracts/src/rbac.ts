import { z } from "zod";

export const accountTypeSchema = z.enum(["CUSTOMER", "STAFF", "ADMIN"]);
export const userStatusSchema = z.enum([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
]);
export const staffEngagementTypeSchema = z.enum(["SALARIED", "GIG"]);

export const permissionResourceSchema = z.enum([
  "dashboard",
  "bookings",
  "customers",
  "staff",
  "categories",
  "services",
  "payments",
  "refunds",
  "invoices",
  "reports",
  "notifications",
  "reviews",
  "roles",
  "admin_users",
  "content",
  "contacts",
  "audit_logs",
  "settings",
]);

export const permissionActionSchema = z.enum([
  "view",
  "create",
  "update",
  "approve",
  "delete",
  "assign",
  "export",
  "publish",
  "refund",
  "manage_permissions",
]);

export const permissionKeySchema = z.templateLiteral([
  permissionResourceSchema,
  ":",
  permissionActionSchema,
]);

export type AccountType = z.infer<typeof accountTypeSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type StaffEngagementType = z.infer<typeof staffEngagementTypeSchema>;
export type PermissionResource = z.infer<typeof permissionResourceSchema>;
export type PermissionAction = z.infer<typeof permissionActionSchema>;
export type PermissionKey = z.infer<typeof permissionKeySchema>;

export function toPermissionKey(
  resource: PermissionResource,
  action: PermissionAction,
): PermissionKey {
  return `${resource}:${action}` as PermissionKey;
}
