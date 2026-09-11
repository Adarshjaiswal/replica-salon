import type { PermissionKey } from "@replica/contracts";

export interface AuthenticatedActor {
  id: string;
  accountType: "CUSTOMER" | "STAFF" | "ADMIN";
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  permissions: ReadonlySet<PermissionKey>;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason:
    "allowed" | "unauthenticated" | "inactive_account" | "missing_permission";
}

export function authorize(
  actor: AuthenticatedActor | null,
  permission: PermissionKey,
): AuthorizationDecision {
  if (!actor) {
    return { allowed: false, reason: "unauthenticated" };
  }

  if (actor.status !== "ACTIVE") {
    return { allowed: false, reason: "inactive_account" };
  }

  if (!actor.permissions.has(permission)) {
    return { allowed: false, reason: "missing_permission" };
  }

  return { allowed: true, reason: "allowed" };
}
