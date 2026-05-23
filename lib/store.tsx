"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useCallback } from "react"
import type { RivoState, CartItem } from "./stores/types"
import { createBarbersSlice } from "./stores/barbers.slice"
import { createServicesSlice } from "./stores/services.slice"
import { createProductsSlice } from "./stores/products.slice"
import { createMinibarSlice } from "./stores/minibar.slice"
import { createClientsSlice } from "./stores/clients.slice"
import { createAppointmentsSlice } from "./stores/appointments.slice"
import { createTransactionsSlice } from "./stores/transactions.slice"
import { createSettingsSlice } from "./stores/settings.slice"
import { createPosCartSlice } from "./stores/pos-cart.slice"
import { createAuthSlice } from "./stores/auth.slice"
import { createNotificationsSlice } from "./stores/notifications.slice"
import { createPermissionsSlice } from "./stores/permissions.slice"
import type { Transaction } from "@/types/transaction"
import type { PermissionKey } from "@/lib/auth/permission-keys"

export type { CartItem }

// ─── Combined Zustand store ───────────────────────────────────────────────────

export const useRivoStore = create<RivoState>()(
  persist(
    (...a) => ({
      // Meta (not persisted — see partialize below)
      _hydrated: false,

      // Domain slices
      ...createBarbersSlice(...a),
      ...createServicesSlice(...a),
      ...createProductsSlice(...a),
      ...createMinibarSlice(...a),
      ...createClientsSlice(...a),
      ...createAppointmentsSlice(...a),
      ...createTransactionsSlice(...a),
      ...createSettingsSlice(...a),
      ...createPosCartSlice(...a),
      ...createAuthSlice(...a),
      ...createNotificationsSlice(...a),
      ...createPermissionsSlice(...a),
    }),
    {
      name: "rivo-store-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,

      // ── Schema version ──────────────────────────────────────────────────────
      version: 10,

      migrate: (stored: unknown, fromVersion: number) => {
        const s = (stored ?? {}) as Record<string, unknown>
        if (fromVersion < 2) {
          return { ...s, users: [], currentSession: null }
        }
        if (fromVersion < 3) {
          return { ...s, users: [] }
        }
        if (fromVersion < 4) {
          const { barbers: _b, ...rest } = s
          return rest
        }
        if (fromVersion < 5) {
          const { services: _sv, ...rest } = s
          return rest
        }
        if (fromVersion < 6) {
          const { products: _p, ...rest } = s
          return rest
        }
        if (fromVersion < 7) {
          // v6 → v7: minibarItems[] moved to Supabase
          const { minibarItems: _m, ...rest } = s
          return rest
        }
        if (fromVersion < 8) {
          // v7 → v8: transactions[] and _nextInvoiceNum moved to Supabase
          const { transactions: _t, _nextInvoiceNum: _n, ...rest } = s
          return rest
        }
        if (fromVersion < 9) {
          // v8 → v9: appointments[] moved to Supabase
          const { appointments: _a, ...rest } = s
          return rest
        }
        if (fromVersion < 10) {
          // v9 → v10: clients[] moved to Supabase
          const { clients: _c, ...rest } = s
          return rest
        }
        return stored
      },

      // ── Partialize ──────────────────────────────────────────────────────────
      // Only plain data fields — functions cannot serialize and must be excluded
      // to prevent them from polluting Zustand's snapshot change-detection.
      // rolePermissions is intentionally excluded: always reloaded from Supabase.
      partialize: (state) => ({
        settings: state.settings,
        posCart: state.posCart,
        posBarberId: state.posBarberId,
        posClientName: state.posClientName,
        posNotes: state.posNotes,
        posDiscountType: state.posDiscountType,
        posDiscountValue: state.posDiscountValue,
        posTaxEnabled: state.posTaxEnabled,
        posPaymentMethod: state.posPaymentMethod,
        currentSession: state.currentSession,
        notifications: state.notifications,
      }),

      // ── Merge ───────────────────────────────────────────────────────────────
      // Merges the persisted snapshot over the initial state atomically.
      // _hydrated is set to true here to avoid a double-render flash.
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<RivoState> | null | undefined
        return {
          ...currentState,
          ...(ps ?? {}),
          // These are never persisted — always loaded from Supabase on boot
          barbers: [],
          services: [],
          products: [],
          minibarItems: [],
          appointments: [],
          clients: [],
          transactions: [],
          _nextInvoiceNum: 1,
          users: [],
          // Permissions: always fetched fresh from role_permissions table
          rolePermissions: {},
          _permissionsLoaded: false,
          // Null-safe: always produce null (not undefined) for absent session key
          currentSession: ps?.currentSession ?? null,
          // Keep false until StoreHydration sets it after initAuth() completes
          _hydrated: false,
        }
      },
    }
  )
)

// ─── Convenience selectors ────────────────────────────────────────────────────

export const useIsHydrated = () => useRivoStore((s) => s._hydrated)

// ─── Domain hooks (same public API as before — components unchanged) ──────────

export function useBarbers() {
  const barbers = useRivoStore((s) => s.barbers)
  const loadBarbers = useRivoStore((s) => s.loadBarbers)
  const addBarber = useRivoStore((s) => s.addBarber)
  const updateBarber = useRivoStore((s) => s.updateBarber)
  const toggleArchive = useRivoStore((s) => s.toggleArchiveBarber)
  const deleteBarber = useRivoStore((s) => s.deleteBarber)
  return { barbers, loadBarbers, addBarber, updateBarber, toggleArchive, deleteBarber }
}

export function useServices() {
  const services = useRivoStore((s) => s.services)
  const loadServices = useRivoStore((s) => s.loadServices)
  const addService = useRivoStore((s) => s.addService)
  const updateService = useRivoStore((s) => s.updateService)
  const toggleArchive = useRivoStore((s) => s.toggleArchiveService)
  const deleteService = useRivoStore((s) => s.deleteService)
  return { services, loadServices, addService, updateService, toggleArchive, deleteService }
}

export function useProducts() {
  const items = useRivoStore((s) => s.products)
  const loadProducts = useRivoStore((s) => s.loadProducts)
  const addItem = useRivoStore((s) => s.addProduct)
  const updateItem = useRivoStore((s) => s.updateProduct)
  const toggleArchive = useRivoStore((s) => s.toggleArchiveProduct)
  const deleteItem = useRivoStore((s) => s.deleteProduct)
  const lowStockItems = items.filter(
    (p) => p.status !== "archived" && p.stock <= (p.lowStockThreshold ?? 5)
  )
  return { items, loadProducts, addItem, updateItem, toggleArchive, deleteItem, lowStockItems }
}

export function useMinibar() {
  const items = useRivoStore((s) => s.minibarItems)
  const loadMinibarItems = useRivoStore((s) => s.loadMinibarItems)
  const addItem = useRivoStore((s) => s.addMinibarItem)
  const updateItem = useRivoStore((s) => s.updateMinibarItem)
  const toggleArchive = useRivoStore((s) => s.toggleArchiveMinibarItem)
  const deleteItem = useRivoStore((s) => s.deleteMinibarItem)
  const lowStockItems = items.filter(
    (m) => m.status !== "archived" && m.stock <= (m.lowStockThreshold ?? 5)
  )
  return { items, loadMinibarItems, addItem, updateItem, toggleArchive, deleteItem, lowStockItems }
}

export function useClients() {
  const clients = useRivoStore((s) => s.clients)
  const loadClients = useRivoStore((s) => s.loadClients)
  const addClient = useRivoStore((s) => s.addClient)
  const updateClient = useRivoStore((s) => s.updateClient)
  const deleteClient = useRivoStore((s) => s.deleteClient)
  return { clients, loadClients, addClient, updateClient, deleteClient }
}

export function useAppointments() {
  const appointments = useRivoStore((s) => s.appointments)
  const loadAppointments = useRivoStore((s) => s.loadAppointments)
  const addAppointment = useRivoStore((s) => s.addAppointment)
  const updateAppointment = useRivoStore((s) => s.updateAppointment)
  const updateStatus = useRivoStore((s) => s.updateAppointmentStatus)
  const deleteAppointment = useRivoStore((s) => s.deleteAppointment)
  return { appointments, loadAppointments, addAppointment, updateAppointment, updateStatus, deleteAppointment }
}

export function useTransactions() {
  const transactions = useRivoStore((s) => s.transactions)
  const nextInvoiceNum = useRivoStore((s) => s._nextInvoiceNum)
  const loadTransactions = useRivoStore((s) => s.loadTransactions)
  const _commitTransaction = useRivoStore((s) => s.commitTransaction)
  const _returnTransaction = useRivoStore((s) => s.returnTransaction)
  const _deleteTransaction = useRivoStore((s) => s.deleteTransaction)

  const commitTransaction = useCallback(
    (
      transaction: Transaction,
      stockDeductions: Array<{ kind: "product" | "minibar"; id: string; quantity: number }>,
      clientId?: string
    ) => _commitTransaction(transaction, stockDeductions, clientId),
    [_commitTransaction]
  )

  const returnTransaction = useCallback(
    (id: string) => _returnTransaction(id),
    [_returnTransaction]
  )

  const deleteTransaction = useCallback(
    (id: string) => _deleteTransaction(id),
    [_deleteTransaction]
  )

  return { transactions, nextInvoiceNum, loadTransactions, commitTransaction, returnTransaction, deleteTransaction }
}

// ─── Auth hook ────────────────────────────────────────────────────────────────

export function useAuth() {
  const currentSession = useRivoStore((s) => s.currentSession)
  const login = useRivoStore((s) => s.login)
  const logout = useRivoStore((s) => s.logout)
  const updateCurrentUserProfile = useRivoStore((s) => s.updateCurrentUserProfile)
  const updateCurrentUserCredentials = useRivoStore((s) => s.updateCurrentUserCredentials)
  return { currentSession, login, logout, updateCurrentUserProfile, updateCurrentUserCredentials }
}

export function useUsers() {
  const users = useRivoStore((s) => s.users)
  const loadUsers = useRivoStore((s) => s.loadUsers)
  const addUser = useRivoStore((s) => s.addUser)
  const updateUser = useRivoStore((s) => s.updateUser)
  const archiveUser = useRivoStore((s) => s.archiveUser)
  const deleteUser = useRivoStore((s) => s.deleteUser)
  const resetUserPassword = useRivoStore((s) => s.resetUserPassword)
  return { users, loadUsers, addUser, updateUser, archiveUser, deleteUser, resetUserPassword }
}

export function useNotifications() {
  const notifications = useRivoStore((s) => s.notifications)
  const markNotificationRead = useRivoStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useRivoStore((s) => s.markAllNotificationsRead)
  const dismissNotification = useRivoStore((s) => s.dismissNotification)
  const unreadCount = notifications.filter((n) => !n.read).length
  return { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, dismissNotification }
}

// ─── Permission hook ──────────────────────────────────────────────────────────

/**
 * Returns a stable canDo function and a boolean selector for a given PERM key.
 * Subscribes to rolePermissions + currentSession so it re-renders on permission changes.
 */
export function usePermission(key: PermissionKey): boolean {
  return useRivoStore((s) => s.canDo(key))
}

// ─── Legacy AppProvider shim (no-op — kept for import safety) ─────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
