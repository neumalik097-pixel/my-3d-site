import type { UserRole } from "./types"
import { PERM, type PermissionKey } from "./permission-keys"

// ─── Route permissions ────────────────────────────────────────────────────────
// Maps pathname → roles that may access it.
// Duplicated verbatim in middleware.ts (Edge runtime cannot import from here).

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/": ["super_admin", "admin"],
  "/appointments": ["super_admin", "admin"],
  "/barbers": ["super_admin", "admin"],
  "/clients": ["super_admin", "admin"],
  "/minibar": ["super_admin", "admin"],
  "/pos": ["super_admin", "admin", "staff"],
  "/products": ["super_admin", "admin"],
  "/reports": ["super_admin", "admin"],
  "/services": ["super_admin", "admin"],
  "/settings": ["super_admin"],
}

// ─── Action permissions (legacy — kept for backward compatibility) ─────────────
// New code should call canDo(PERM.*) via the store. These are still used by
// any components that imported can() directly before the PERM migration.

export const ACTION_PERMISSIONS: Record<string, UserRole[]> = {
  "transaction:delete": ["super_admin", "admin"],
  "transaction:return": ["super_admin", "admin"],
  "transaction:view_all": ["super_admin", "admin"],
  "product:modify": ["super_admin", "admin"],
  "service:modify": ["super_admin", "admin"],
  "minibar:modify": ["super_admin", "admin"],
  "barber:modify": ["super_admin", "admin"],
  "client:manage": ["super_admin", "admin"],
  "appointment:manage": ["super_admin", "admin"],
  "user:manage": ["super_admin"],
  "settings:access": ["super_admin"],
  "analytics:view": ["super_admin", "admin"],
  "report:view": ["super_admin", "admin"],
}

// ─── Static role-permission defaults ─────────────────────────────────────────
// Fallback when the role_permissions table has no row for a given role+key.
// DB rows in role_permissions ALWAYS override these defaults.
//
// Roles:
//   super_admin — unrestricted
//   admin       — full operations, no user/settings management
//   staff       — POS checkout + customer lookup only

const STATIC_PERMISSIONS: Readonly<Record<UserRole, readonly PermissionKey[]>> = {
  super_admin: Object.values(PERM) as PermissionKey[],

  admin: [
    PERM.CREATE_INVOICE,
    PERM.DELETE_INVOICE,
    PERM.REFUND_INVOICE,
    PERM.VIEW_ALL_TRANSACTIONS,
    PERM.MANAGE_INVENTORY,
    PERM.EDIT_PRICES,
    PERM.RESTOCK_INVENTORY,
    PERM.MANAGE_BARBERS,
    PERM.MANAGE_SERVICES,
    PERM.MANAGE_CUSTOMERS,
    PERM.MANAGE_APPOINTMENTS,
    PERM.EDIT_APPOINTMENTS,
    PERM.VIEW_REPORTS,
    PERM.VIEW_ANALYTICS,
    PERM.VIEW_AUDIT_LOGS,
    // NOT granted: MANAGE_USERS, ACCESS_SETTINGS
  ],

  staff: [
    PERM.CREATE_INVOICE,
    PERM.MANAGE_CUSTOMERS, // customer lookup / creation during POS
    // NOT granted: anything else
  ],
}

// ─── Check helpers ────────────────────────────────────────────────────────────

/**
 * Legacy helper — checks the colon-delimited action keys in ACTION_PERMISSIONS.
 * Kept for backward compatibility with components that call can(role, "transaction:return").
 * New code should use store.canDo(PERM.*) instead.
 */
export function can(role: UserRole | undefined | null, action: string): boolean {
  if (!role) return false
  const allowed = ACTION_PERMISSIONS[action]
  if (!allowed) return false
  return allowed.includes(role)
}

/**
 * Checks a PERM.* key against the static defaults (no DB involved).
 * Called by PermissionsSlice.canDo() when no DB override exists for the role.
 */
export function staticCan(role: UserRole | undefined | null, key: PermissionKey): boolean {
  if (!role) return false
  return (STATIC_PERMISSIONS[role] as readonly string[]).includes(key)
}

/** Returns true if the given role may access the given pathname. */
export function canAccessRoute(role: UserRole | undefined | null, pathname: string): boolean {
  if (!role) return false
  const allowed = ROUTE_PERMISSIONS[pathname]
  // Routes not in the map are unrestricted (e.g., /login, API routes)
  if (!allowed) return true
  return allowed.includes(role)
}

/** Returns the landing route for a given role after successful login. */
export function getDefaultRoute(role: UserRole): string {
  if (role === "staff") return "/pos"
  return "/"
}
