import type { StateCreator } from "zustand"
import type { RivoState, NotificationsSlice, RivoNotification, NotificationType } from "./types"
import { supabase } from "@/lib/supabase"

// ─── DB row shape ─────────────────────────────────────────────────────────────

interface DbNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string | null
  is_read: boolean
  created_at: string
}

function mapDbNotif(row: DbNotification): RivoNotification {
  return {
    id: row.id,
    dbId: row.id,
    type: (row.type as NotificationType | null) ?? "sale",
    title: row.title,
    message: row.message,
    read: row.is_read,
    createdAt: row.created_at,
  }
}

// ─── Slice ────────────────────────────────────────────────────────────────────

export const createNotificationsSlice: StateCreator<RivoState, [], [], NotificationsSlice> = (set, get) => ({
  notifications: [],

  // ── In-app (non-DB) notification — generated locally ──────────────────────
  addNotification: (payload) =>
    set((s) => ({
      notifications: [
        {
          ...payload,
          id: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...s.notifications,
      ].slice(0, 50),
    })),

  // ── Load existing notifications from Supabase ──────────────────────────────
  loadNotifications: async () => {
    const session = get().currentSession
    if (!session) return

    // The DB trigger already resolved the correct recipients (barber user + admins)
    // and stored user_id for each row — so every role filters the same way.
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) { console.error("[notif] loadNotifications:", error); return }

    const dbNotifs = (data ?? []).map(mapDbNotif)

    set((s) => {
      // Replace all DB-backed entries with the fresh DB snapshot;
      // keep any local-only notifications (those without a dbId).
      const localOnly = s.notifications.filter((n) => !n.dbId)
      return { notifications: [...dbNotifs, ...localOnly].slice(0, 60) }
    })
  },

  // ── Supabase Realtime — live INSERT listener ───────────────────────────────
  subscribeToNotifications: () => {
    const session = get().currentSession
    if (!session) return () => {}

    // Filter server-side to only receive rows addressed to the current user.
    // The DB trigger handles all role/barber resolution before inserting.
    const channel = supabase
      .channel("rivo_notifications_rt")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.userId}`,
        },
        (payload) => {
          const notif = mapDbNotif(payload.new as DbNotification)
          set((s) => ({
            notifications: [notif, ...s.notifications].slice(0, 60),
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  // ── Broadcast to all active users — direct Supabase insert (fire-and-forget) ─
  broadcastNotification: async (title, message) => {
    const allUsers = get().users
    const session = get().currentSession

    let recipientIds = allUsers.filter(u => u.status === "active").map(u => u.id)
    // Fallback for edge case where users list hasn't loaded yet
    if (recipientIds.length === 0 && session) recipientIds = [session.userId]
    if (recipientIds.length === 0) return

    const rows = recipientIds.map(userId => ({ user_id: userId, title, message, is_read: false }))
    const { error } = await supabase.from("notifications").insert(rows)
    if (error) console.error("[notif] broadcastNotification:", error)
  },

  // ── Mark single notification read — updates DB when backed by a row ────────
  markNotificationRead: (id) => {
    const notif = get().notifications.find((n) => n.id === id)
    if (!notif || notif.read) return

    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))

    if (notif.dbId) {
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.dbId)
        .then(({ error }) => { if (error) console.error("[notif] markRead:", error) })
    }
  },

  // ── Mark all read — batch-updates DB rows ──────────────────────────────────
  markAllNotificationsRead: () => {
    const unreadDbIds = get()
      .notifications
      .filter((n) => !n.read && n.dbId)
      .map((n) => n.dbId!)

    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }))

    if (unreadDbIds.length > 0) {
      supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadDbIds)
        .then(({ error }) => { if (error) console.error("[notif] markAllRead:", error) })
    }
  },

  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
})
