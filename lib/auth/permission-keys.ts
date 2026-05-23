/**
 * Central registry of all permission keys used across the RIVO platform.
 *
 * These keys are stored in the `role_permissions` table (role + permission_key → allowed).
 * Static role defaults live in permissions.ts and are the fallback when no DB row exists.
 * DB rows always take precedence, enabling per-deployment customisation without code changes.
 *
 * Naming convention: snake_case strings, grouped by domain.
 */

export const PERM = {
  // ── POS / Invoices ─────────────────────────────────────────────────────────
  /** Create a new invoice at checkout */
  CREATE_INVOICE:        "create_invoice",
  /** Hard-delete an invoice and its line items */
  DELETE_INVOICE:        "delete_invoice",
  /** Mark an invoice as returned and restore stock */
  REFUND_INVOICE:        "refund_invoice",
  /** View all transactions (not just the current barber's) */
  VIEW_ALL_TRANSACTIONS: "view_all_transactions",

  // ── Inventory ──────────────────────────────────────────────────────────────
  /** Add, edit, archive, or delete products and minibar items */
  MANAGE_INVENTORY:  "manage_inventory",
  /** Modify buy/sell prices on inventory items */
  EDIT_PRICES:       "edit_prices",
  /** Adjust or restock item quantities */
  RESTOCK_INVENTORY: "restock_inventory",

  // ── Users ──────────────────────────────────────────────────────────────────
  /** Create, update, archive, and delete user accounts */
  MANAGE_USERS: "manage_users",

  // ── Barbers / Services ─────────────────────────────────────────────────────
  /** Add, update, archive, and delete barber profiles */
  MANAGE_BARBERS:  "manage_barbers",
  /** Add, update, archive, and delete service definitions */
  MANAGE_SERVICES: "manage_services",

  // ── Customers ──────────────────────────────────────────────────────────────
  /** Add, update, and soft-delete customer records */
  MANAGE_CUSTOMERS: "manage_customers",

  // ── Appointments ───────────────────────────────────────────────────────────
  /** Book new appointments */
  MANAGE_APPOINTMENTS: "manage_appointments",
  /** Edit or delete existing appointments */
  EDIT_APPOINTMENTS: "edit_appointments",

  // ── Analytics / Reports ────────────────────────────────────────────────────
  /** View sales reports and summaries */
  VIEW_REPORTS:    "view_reports",
  /** View the analytics dashboard */
  VIEW_ANALYTICS:  "view_analytics",
  /** View the full audit log trail */
  VIEW_AUDIT_LOGS: "view_audit_logs",

  // ── Settings ───────────────────────────────────────────────────────────────
  /** Access and modify shop-wide settings */
  ACCESS_SETTINGS: "access_settings",
} as const

export type PermissionKey = typeof PERM[keyof typeof PERM]
