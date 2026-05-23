import type { Barber, BarberFormValues } from "@/types/barber"
import type { Service, ServiceFormValues } from "@/types/service"
import type { InventoryItem, InventoryFormValues } from "@/types/inventory"
import type { Client, ClientFormValues } from "@/types/client"
import type { Appointment, AppointmentFormValues } from "@/types/appointment"
import type { Transaction } from "@/types/transaction"
import type { User, AuthSession, UserFormData } from "@/lib/auth/types"
import type { PermissionKey } from "@/lib/auth/permission-keys"

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string
  type: "service" | "product" | "minibar"
  itemId: string
  name: string
  price: number
  quantity: number
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SettingsData {
  salonName: string
  managerName: string
  email: string
  phone: string
  address: string
  workingHours: string
  notifAppointments: boolean
  notifReminders: boolean
  notifDailyReport: boolean
  notifReviews: boolean
}

export const DEFAULT_SETTINGS: SettingsData = {
  salonName: "RIVO للحلاقة الفاخرة",
  managerName: "محمد الأحمد",
  email: "admin@rivo.sa",
  phone: "٠٥٠٠١٢٣٤٥٦",
  address: "الرياض، حي النزهة، شارع الأمير محمد بن عبدالعزيز",
  workingHours: "٩:٠٠ ص — ١١:٠٠ م",
  notifAppointments: true,
  notifReminders: true,
  notifDailyReport: false,
  notifReviews: true,
}

// ─── Slice interfaces ─────────────────────────────────────────────────────────

export interface MetaSlice {
  _hydrated: boolean
}

export interface BarbersSlice {
  barbers: Barber[]
  /** Reloads barbers[] from Supabase. */
  loadBarbers: () => Promise<void>
  addBarber: (data: BarberFormValues) => Promise<{ success: boolean; error?: string }>
  updateBarber: (id: string, data: BarberFormValues) => Promise<{ success: boolean; error?: string }>
  /** Toggles archived ↔ active in DB and local state. */
  toggleArchiveBarber: (id: string) => Promise<void>
  deleteBarber: (id: string) => Promise<void>
}

export interface ServicesSlice {
  services: Service[]
  /** Reloads services[] from Supabase. */
  loadServices: () => Promise<void>
  addService: (data: ServiceFormValues) => Promise<{ success: boolean; error?: string }>
  updateService: (id: string, data: ServiceFormValues) => Promise<{ success: boolean; error?: string }>
  /** Toggles archived ↔ active. Sets both is_archived and is_active in DB. */
  toggleArchiveService: (id: string) => Promise<void>
  deleteService: (id: string) => Promise<void>
}

export interface ProductsSlice {
  products: InventoryItem[]
  /** Reloads products[] from Supabase. */
  loadProducts: () => Promise<void>
  addProduct: (data: InventoryFormValues) => Promise<{ success: boolean; error?: string }>
  updateProduct: (id: string, data: InventoryFormValues) => Promise<{ success: boolean; error?: string }>
  /** Sets is_archived=true, is_active=false in DB. Never hard-deletes. */
  toggleArchiveProduct: (id: string) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

export interface MinibarSlice {
  minibarItems: InventoryItem[]
  /** Reloads minibarItems[] from Supabase. */
  loadMinibarItems: () => Promise<void>
  addMinibarItem: (data: InventoryFormValues) => Promise<{ success: boolean; error?: string }>
  updateMinibarItem: (id: string, data: InventoryFormValues) => Promise<{ success: boolean; error?: string }>
  /** Sets is_archived=true, is_active=false in DB. Never hard-deletes. */
  toggleArchiveMinibarItem: (id: string) => Promise<void>
  deleteMinibarItem: (id: string) => Promise<void>
}

export interface ClientsSlice {
  clients: Client[]
  loadClients: () => Promise<void>
  addClient: (data: ClientFormValues) => Promise<{ success: boolean; error?: string }>
  updateClient: (id: string, data: ClientFormValues) => Promise<{ success: boolean; error?: string }>
  /** Soft-deletes: sets is_active=false in DB. Client disappears from active list but stays linked to invoices. */
  deleteClient: (id: string) => Promise<void>
}

export interface AppointmentsSlice {
  appointments: Appointment[]
  /** Loads all appointments from Supabase, ordered by date + time ascending. */
  loadAppointments: () => Promise<void>
  addAppointment: (data: AppointmentFormValues) => Promise<{ success: boolean; error?: string }>
  updateAppointment: (id: string, data: AppointmentFormValues) => Promise<{ success: boolean; error?: string }>
  updateAppointmentStatus: (id: string, status: Appointment["status"]) => Promise<void>
  deleteAppointment: (id: string) => Promise<void>
}

export interface TransactionsSlice {
  transactions: Transaction[]
  _nextInvoiceNum: number
  /** Loads all invoices (with items) from Supabase and derives _nextInvoiceNum. */
  loadTransactions: () => Promise<void>
  commitTransaction: (
    transaction: Transaction,
    stockDeductions: Array<{ kind: "product" | "minibar"; id: string; quantity: number }>,
    clientId?: string
  ) => Promise<{ success: boolean; error?: string }>
  /**
   * Persists return to Supabase (status="returned"), then restores product/minibar stock
   * in local state and syncs quantities back to DB in the background.
   */
  returnTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  deleteTransaction: (id: string) => Promise<void>
}

export interface SettingsSlice {
  settings: SettingsData
  updateSettings: (data: Partial<SettingsData>) => void
}

export interface PosCartSlice {
  posCart: CartItem[]
  posBarberId: string
  posClientName: string
  posNotes: string
  posDiscountType: "percentage" | "fixed"
  posDiscountValue: string
  posTaxEnabled: boolean
  posPaymentMethod: "cash" | "card"
  posAddItem: (item: Omit<CartItem, "id" | "quantity">) => void
  posRemoveItem: (id: string) => void
  posSetQty: (id: string, qty: number) => void
  posClearCart: () => void
  posSetBarberId: (id: string) => void
  posSetClientName: (name: string) => void
  posSetNotes: (notes: string) => void
  posSetDiscountType: (type: "percentage" | "fixed") => void
  posSetDiscountValue: (value: string) => void
  posSetTaxEnabled: (enabled: boolean) => void
  posSetPaymentMethod: (method: "cash" | "card") => void
  posReset: () => void
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "appointment"
  | "low_stock"
  | "sale"
  | "user_archived"
  | "password_change"
  | "profile_update"

export interface RivoNotification {
  id: string
  /** Present when this notification is backed by a row in the Supabase `notifications` table. */
  dbId?: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface NotificationsSlice {
  notifications: RivoNotification[]
  /** Creates a local-only (non-DB) in-app notification. */
  addNotification: (payload: Omit<RivoNotification, "id" | "read" | "createdAt" | "dbId">) => void
  /** Fetches unread + recent notifications from Supabase, filtered by the current session's role. */
  loadNotifications: () => Promise<void>
  /** Opens a Supabase Realtime channel for live INSERT events on the notifications table.
   *  Returns a cleanup function that removes the channel. */
  subscribeToNotifications: () => () => void
  /** Inserts a notification row into Supabase for every active user (fire-and-forget). */
  broadcastNotification: (title: string, message: string) => Promise<void>
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  dismissNotification: (id: string) => void
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSlice {
  users: User[]
  currentSession: AuthSession | null
  /** Called once on app start: loads users from Supabase, seeds superadmin if table empty, validates persisted session. */
  initAuth: () => Promise<void>
  /** Reloads users[] from Supabase. */
  loadUsers: () => Promise<void>
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  addUser: (data: UserFormData) => Promise<{ success: boolean; error?: string }>
  updateUser: (id: string, data: Partial<UserFormData>) => Promise<{ success: boolean; error?: string }>
  archiveUser: (id: string) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  resetUserPassword: (id: string, newPassword: string) => Promise<void>
  /** Updates the logged-in user's display name in both users[] and the live currentSession. */
  updateCurrentUserProfile: (name: string) => Promise<void>
  /** Updates username and/or password for the logged-in user. Password skipped if empty. */
  updateCurrentUserCredentials: (data: { username?: string; password?: string }) => Promise<{ success: boolean; error?: string }>
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export interface PermissionsSlice {
  /**
   * Flat map of `"${role}:${permission_key}"` → boolean loaded from role_permissions table.
   * Never persisted to localStorage — always reloaded from Supabase on boot.
   */
  rolePermissions: Record<string, boolean>
  /** True once loadPermissions() has resolved (even on error — static defaults remain active). */
  _permissionsLoaded: boolean
  /** Fetches all rows from role_permissions and caches them in rolePermissions. */
  loadPermissions: () => Promise<void>
  /**
   * Returns true if the current session's role may perform the given action.
   * Check order: DB override → static default → deny.
   * Always returns false when no session is active.
   */
  canDo: (key: PermissionKey) => boolean
}

// ─── Combined state ───────────────────────────────────────────────────────────

export type RivoState = MetaSlice &
  BarbersSlice &
  ServicesSlice &
  ProductsSlice &
  MinibarSlice &
  ClientsSlice &
  AppointmentsSlice &
  TransactionsSlice &
  SettingsSlice &
  PosCartSlice &
  AuthSlice &
  NotificationsSlice &
  PermissionsSlice
