"use client"

import { useRivoStore } from "@/lib/store"
import type { PermissionKey } from "@/lib/auth/permission-keys"

/**
 * Returns true if the current session holder is allowed to perform the given action.
 * Re-renders automatically when permissions or the active session change.
 *
 * @example
 *   const canDelete = useCanDo(PERM.DELETE_INVOICE)
 *   return <button disabled={!canDelete}>حذف</button>
 */
export function useCanDo(key: PermissionKey): boolean {
  return useRivoStore((s) => s.canDo(key))
}

/**
 * Returns a stable object of permission-checking utilities for use inside
 * callbacks, effects, or multi-permission component logic.
 *
 * @example
 *   const { canDo } = usePermissions()
 *   if (!canDo(PERM.REFUND_INVOICE)) return toast.error("غير مصرح")
 */
export function usePermissions() {
  const canDo = useRivoStore((s) => s.canDo)
  return { canDo }
}
