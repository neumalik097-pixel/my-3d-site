"use client"

import { useCanDo } from "@/hooks/use-permission"
import type { PermissionKey } from "@/lib/auth/permission-keys"

interface PermissionGateProps {
  /** The PERM.* key the current user must hold to see the children. */
  perm: PermissionKey
  /** Rendered when the user lacks the permission. Defaults to null (hidden). */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Renders children only when the active session holds the given permission.
 * Use this to hide action buttons, admin controls, and sensitive UI elements.
 *
 * @example
 *   <PermissionGate perm={PERM.DELETE_INVOICE}>
 *     <button onClick={handleDelete}>حذف الفاتورة</button>
 *   </PermissionGate>
 *
 *   // With fallback:
 *   <PermissionGate perm={PERM.MANAGE_USERS} fallback={<span>غير مصرح</span>}>
 *     <UserManagementPanel />
 *   </PermissionGate>
 */
export function PermissionGate({ perm, fallback = null, children }: PermissionGateProps) {
  const allowed = useCanDo(perm)
  return allowed ? <>{children}</> : <>{fallback}</>
}
