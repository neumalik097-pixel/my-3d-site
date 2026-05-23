// Convenience re-exports — keeps component imports clean
export { useAuth, useUsers, useRivoStore } from "@/lib/store"
export { can, canAccessRoute, getDefaultRoute } from "@/lib/auth/permissions"
export type { UserRole, UserStatus, User, AuthSession } from "@/lib/auth/types"
