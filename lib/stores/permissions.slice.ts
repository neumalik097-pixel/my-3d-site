import type { StateCreator } from "zustand"
import type { RivoState, PermissionsSlice } from "./types"
import type { PermissionKey } from "@/lib/auth/permission-keys"
import { staticCan } from "@/lib/auth/permissions"
import { supabase } from "@/lib/supabase"

export const createPermissionsSlice: StateCreator<RivoState, [], [], PermissionsSlice> = (set, get) => ({
  rolePermissions: {},
  _permissionsLoaded: false,

  // ─── Load from Supabase ───────────────────────────────────────────────────
  // Fetches ALL rows from role_permissions and builds a flat lookup map.
  // Called once during StoreHydration. Safe to call again to refresh.

  loadPermissions: async () => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permission_key, allowed")

    if (error) {
      console.error("loadPermissions:", error)
      // Mark loaded so boot doesn't stall — static defaults are still active
      set({ _permissionsLoaded: true })
      return
    }

    const map: Record<string, boolean> = {}
    for (const row of data ?? []) {
      // Key format: "${role}:${permission_key}"
      map[`${row.role}:${row.permission_key}`] = row.allowed
    }

    set({ rolePermissions: map, _permissionsLoaded: true })
  },

  // ─── Permission check ─────────────────────────────────────────────────────
  // Priority: DB row (if present) → static default → deny.
  // This means an admin can grant or revoke any permission per-deployment via DB
  // without touching code.

  canDo: (key: PermissionKey) => {
    const role = get().currentSession?.role
    if (!role) return false

    const map = get().rolePermissions
    const dbKey = `${role}:${key}`

    if (dbKey in map) return map[dbKey]

    return staticCan(role, key)
  },
})
