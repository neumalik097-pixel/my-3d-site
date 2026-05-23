// ─── Auth types ───────────────────────────────────────────────────────────────
// Design note: User and AuthSession are shaped to map cleanly to Supabase Auth +
// a `profiles` table in a future migration. Keep this file free of UI imports.

export type UserRole = "super_admin" | "admin" | "staff"
export type UserStatus = "active" | "archived"

export interface User {
  id: string
  name: string
  username: string
  /** Plaintext for local localStorage phase. Swap for bcrypt hash when migrating to Supabase. */
  password: string
  role: UserRole
  status: UserStatus
  /** Staff users: links this account to a specific Barber record for isolated reporting. */
  barberId?: string
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  userId: string
  name: string
  username: string
  role: UserRole
  barberId?: string
  loginAt: string
}

export interface UserFormData {
  name: string
  username: string
  password: string
  role: UserRole
  status: UserStatus
  barberId?: string
}

// ─── Display labels ───────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "مشرف عام",
  admin: "مدير",
  staff: "موظف",
}

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-rivo-green/10 text-rivo-green",
  admin: "bg-blue-50 text-blue-600",
  staff: "bg-amber-50 text-amber-700",
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "نشط",
  archived: "مؤرشف",
}
