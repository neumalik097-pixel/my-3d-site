import type { StateCreator } from "zustand"
import type { RivoState, AuthSlice } from "./types"
import type { User, AuthSession, UserFormData } from "@/lib/auth/types"
import { supabase, mapDbUser } from "@/lib/supabase"
import { logAudit } from "@/lib/audit"
import { PERM } from "@/lib/auth/permission-keys"

// ─── Dev-only structured logging ──────────────────────────────────────────────

const devLog = (event: string, payload?: unknown) => {
  if (process.env.NODE_ENV !== "development") return
  console.log(
    `%c[RIVO AUTH] ${event}`,
    "color:#1B3C2B;font-weight:bold;background:#F2F4EE;padding:2px 6px;border-radius:3px",
    payload ?? ""
  )
}

// ─── Session cookie helpers ───────────────────────────────────────────────────
// The rivo-auth cookie carries a minimal {userId, role} payload.
// It is read by Next.js middleware (middleware.ts) for edge-level route protection.
// The authoritative session is still Zustand + localStorage.

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function setSessionCookie(userId: string, role: string) {
  if (typeof document === "undefined") return
  const value = JSON.stringify({ userId, role })
  document.cookie = `rivo-auth=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`
}

function clearSessionCookie() {
  if (typeof document === "undefined") return
  document.cookie = "rivo-auth=; path=/; max-age=0; SameSite=Strict"
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_SUPERADMIN = {
  name: "المدير العام",
  username: "superadmin",
  password: "123456",
  role: "super_admin" as const,
  is_archived: false,
}

// ─── Auth slice ───────────────────────────────────────────────────────────────

export const createAuthSlice: StateCreator<RivoState, [], [], AuthSlice> = (set, get) => ({
  users: [],
  currentSession: null,

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  initAuth: async () => {
    const { data, error } = await supabase.from("users").select("*")

    if (error) {
      devLog("initAuth:error", error.message)
      return
    }

    let rows = data ?? []

    // Seed superadmin when table is empty (first install)
    if (rows.length === 0) {
      const { data: inserted, error: seedError } = await supabase
        .from("users")
        .insert({ ...SEED_SUPERADMIN })
        .select()

      if (seedError) {
        devLog("initAuth:seed_error", seedError.message)
      } else {
        rows = inserted ?? []
        devLog("initAuth:seeded_superadmin")
      }
    }

    const users = rows.map(mapDbUser)
    set({ users })
    devLog("initAuth:complete", { usersCount: users.length })

    // Revoke persisted session if user was deleted or archived
    const session = get().currentSession
    if (session) {
      const user = users.find((u) => u.id === session.userId)
      if (!user || user.status === "archived") {
        set({ currentSession: null })
        clearSessionCookie()
        devLog("initAuth:session_revoked", { userId: session.userId })
      }
    }
  },

  loadUsers: async () => {
    const { data, error } = await supabase.from("users").select("*")
    if (error) {
      devLog("loadUsers:error", error.message)
      return
    }
    set({ users: (data ?? []).map(mapDbUser) })
  },

  // ─── Authentication ─────────────────────────────────────────────────────────

  login: async (username, password) => {
    devLog("login:attempt", { username })

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("is_archived", false)

    if (error) {
      devLog("login:db_error", error.message)
      return { success: false, error: "خطأ في الاتصال بالخادم" }
    }

    const row = (data ?? []).find(
      (r) => r.username.toLowerCase() === username.toLowerCase()
    )

    if (!row) {
      devLog("login:fail — not found or archived")
      return { success: false, error: "اسم المستخدم غير موجود أو الحساب مؤرشف" }
    }

    if (row.password !== password) {
      devLog("login:fail — wrong password")
      return { success: false, error: "كلمة المرور غير صحيحة" }
    }

    const session: AuthSession = {
      userId: row.id,
      name: row.name,
      username: row.username,
      role: row.role,
      barberId: row.barber_id ?? undefined,
      loginAt: new Date().toISOString(),
    }
    set({ currentSession: session })
    setSessionCookie(row.id, row.role)
    devLog("login:success", { userId: row.id, role: row.role })
    logAudit({
      actionType: "LOGIN",
      entityType: "user",
      entityId: row.id,
      entityName: row.name,
      performedBy: row.id,
      performerName: row.name,
      details: { role: row.role, username: row.username },
    })
    return { success: true }
  },

  logout: () => {
    const session = get().currentSession
    devLog("logout")
    set({ currentSession: null })
    clearSessionCookie()
    if (session) {
      logAudit({
        actionType: "LOGOUT",
        entityType: "user",
        entityId: session.userId,
        entityName: session.name,
        performedBy: session.userId,
        performerName: session.name,
      })
    }
  },

  // ─── User management (MANAGE_USERS permission required) ────────────────────

  addUser: async (data: UserFormData) => {
    if (!get().canDo(PERM.MANAGE_USERS))
      return { success: false, error: "غير مصرح" }

    const actor = get().currentSession!

    const name     = data.name.trim()
    const username = data.username.trim()
    const password = data.password.trim()

    if (!name)     return { success: false, error: "الاسم مطلوب" }
    if (!username) return { success: false, error: "اسم المستخدم مطلوب" }
    if (!password) return { success: false, error: "كلمة المرور مطلوبة" }

    const { data: existing, error: collisionError } = await supabase
      .from("users")
      .select("id")
      .ilike("username", username)
      .maybeSingle()

    if (collisionError) {
      devLog("addUser:collision_check_error", collisionError.message)
      return { success: false, error: "فشل التحقق من اسم المستخدم" }
    }
    if (existing)
      return { success: false, error: "اسم المستخدم مستخدم بالفعل" }

    const row: Record<string, unknown> = {
      name,
      username,
      password,
      role: data.role,
      is_archived: false,
    }
    if (data.role === "staff" && data.barberId?.trim()) {
      row.barber_id = data.barberId.trim()
    }

    const { data: inserted, error } = await supabase.from("users").insert(row).select().single()
    if (error) {
      devLog("addUser:error", error.message)
      return { success: false, error: "فشل إنشاء المستخدم" }
    }

    const newUser: User = mapDbUser(inserted)
    set((s) => ({ users: [...s.users, newUser] }))
    devLog("addUser:success", { id: inserted.id, username, role: data.role })
    logAudit({
      actionType: "CREATE",
      entityType: "user",
      entityId: inserted.id,
      entityName: name,
      performedBy: actor.userId,
      performerName: actor.name,
      details: { role: data.role, username },
    })
    return { success: true }
  },

  updateUser: async (id, data) => {
    if (!get().canDo(PERM.MANAGE_USERS))
      return { success: false, error: "غير مصرح" }

    const actor = get().currentSession!
    const targetUser = get().users.find((u) => u.id === id)

    if (data.username) {
      const trimmed = data.username.trim()
      const collision = get().users.find(
        (u) => u.username.toLowerCase() === trimmed.toLowerCase() && u.id !== id
      )
      if (collision)
        return { success: false, error: "اسم المستخدم مستخدم بالفعل" }
    }

    const patch: Record<string, unknown> = {}
    if (data.name?.trim())     patch.name      = data.name.trim()
    if (data.username?.trim()) patch.username  = data.username.trim()
    if (data.password?.trim()) patch.password  = data.password.trim()
    if (data.role)             patch.role      = data.role
    if ("barberId" in data)    patch.barber_id = data.barberId?.trim() || null

    const { error } = await supabase.from("users").update(patch).eq("id", id)
    if (error) {
      devLog("updateUser:error", error.message)
      return { success: false, error: "فشل تحديث بيانات المستخدم" }
    }

    set((s) => {
      const now = new Date().toISOString()
      const updatedUsers = s.users.map((u) => {
        if (u.id !== id) return u
        return {
          ...u,
          ...(data.name?.trim()     ? { name: data.name.trim() }         : {}),
          ...(data.username?.trim() ? { username: data.username.trim() } : {}),
          ...(data.password?.trim() ? { password: data.password.trim() } : {}),
          ...(data.role             ? { role: data.role }                 : {}),
          barberId: "barberId" in data ? (data.barberId?.trim() || undefined) : u.barberId,
          updatedAt: now,
        }
      })

      const isEditingSelf = s.currentSession?.userId === id
      const sessionPatch =
        isEditingSelf && s.currentSession
          ? {
              currentSession: {
                ...s.currentSession,
                ...(data.name?.trim()     ? { name: data.name.trim() }         : {}),
                ...(data.username?.trim() ? { username: data.username.trim() } : {}),
              },
            }
          : {}

      devLog("updateUser:success", { id, isEditingSelf })
      return { users: updatedUsers, ...sessionPatch }
    })

    logAudit({
      actionType: "UPDATE",
      entityType: "user",
      entityId: id,
      entityName: targetUser?.name ?? "",
      performedBy: actor.userId,
      performerName: actor.name,
      details: { changed: Object.keys(patch) },
    })
    return { success: true }
  },

  archiveUser: async (id) => {
    if (!get().canDo(PERM.MANAGE_USERS)) return

    const actor = get().currentSession!
    if (actor.userId === id) return // prevent self-archive

    const target = get().users.find((u) => u.id === id)
    if (!target) return

    const newIsArchived = target.status === "active"

    const { error } = await supabase
      .from("users")
      .update({ is_archived: newIsArchived })
      .eq("id", id)

    if (error) {
      devLog("archiveUser:error", error.message)
      return
    }

    const newStatus = newIsArchived ? "archived" : "active"
    set((s) => ({
      users: s.users.map((u) =>
        u.id === id ? { ...u, status: newStatus, updatedAt: new Date().toISOString() } : u
      ),
    }))

    if (newIsArchived) {
      get().addNotification({
        type: "user_archived",
        title: "تم أرشفة مستخدم",
        message: `تم أرشفة حساب ${target.name}`,
      })
    }

    logAudit({
      actionType: "ARCHIVE",
      entityType: "user",
      entityId: id,
      entityName: target.name,
      performedBy: actor.userId,
      performerName: actor.name,
      details: { archived: newIsArchived },
    })
    devLog("archiveUser:success", { id, newStatus })
  },

  deleteUser: async (id) => {
    if (!get().canDo(PERM.MANAGE_USERS)) return

    const actor = get().currentSession!
    if (actor.userId === id) return // prevent self-deletion

    const target = get().users.find((u) => u.id === id)

    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) {
      devLog("deleteUser:error", error.message)
      return
    }

    set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    devLog("deleteUser:success", { id })
    logAudit({
      actionType: "DELETE",
      entityType: "user",
      entityId: id,
      entityName: target?.name ?? "",
      performedBy: actor.userId,
      performerName: actor.name,
    })
  },

  resetUserPassword: async (id, newPassword) => {
    if (!get().canDo(PERM.MANAGE_USERS)) return
    if (!newPassword?.trim()) return

    const actor = get().currentSession!
    const target = get().users.find((u) => u.id === id)

    const { error } = await supabase
      .from("users")
      .update({ password: newPassword.trim() })
      .eq("id", id)

    if (error) {
      devLog("resetUserPassword:error", error.message)
      return
    }

    set((s) => ({
      users: s.users.map((u) =>
        u.id === id
          ? { ...u, password: newPassword.trim(), updatedAt: new Date().toISOString() }
          : u
      ),
    }))

    if (target) {
      get().addNotification({
        type: "password_change",
        title: "تغيير كلمة المرور",
        message: `تم تغيير كلمة مرور ${target.name}`,
      })
    }

    logAudit({
      actionType: "UPDATE",
      entityType: "user",
      entityId: id,
      entityName: target?.name ?? "",
      performedBy: actor.userId,
      performerName: actor.name,
      details: { changed: ["password"] },
    })
    devLog("resetUserPassword:success", { id })
  },

  // ─── Self-service profile mutations ────────────────────────────────────────

  updateCurrentUserProfile: async (name) => {
    const uid = get().currentSession?.userId
    if (!uid) return

    const { error } = await supabase.from("users").update({ name }).eq("id", uid)
    if (error) {
      devLog("updateCurrentUserProfile:error", error.message)
      return
    }

    set((s) => {
      if (!s.currentSession) return {}
      return {
        users: s.users.map((u) =>
          u.id === uid ? { ...u, name, updatedAt: new Date().toISOString() } : u
        ),
        currentSession: { ...s.currentSession, name },
      }
    })

    get().addNotification({
      type: "profile_update",
      title: "تم تحديث الملف الشخصي",
      message: `تم تغيير الاسم إلى ${name}`,
    })
    logAudit({
      actionType: "UPDATE",
      entityType: "user",
      entityId: uid,
      entityName: name,
      performedBy: uid,
      performerName: name,
      details: { changed: ["name"] },
    })
    devLog("updateCurrentUserProfile:success", { uid, name })
  },

  updateCurrentUserCredentials: async (data) => {
    const snapshot = get()
    if (!snapshot.currentSession) return { success: false, error: "غير مصرح" }

    const uid = snapshot.currentSession.userId

    if (data.username !== undefined) {
      const trimmed = data.username.trim()
      if (!trimmed)
        return { success: false, error: "اسم المستخدم لا يمكن أن يكون فارغاً" }
      const collision = snapshot.users.find(
        (u) => u.username.toLowerCase() === trimmed.toLowerCase() && u.id !== uid
      )
      if (collision)
        return { success: false, error: "اسم المستخدم مستخدم بالفعل" }
    }

    const patch: Record<string, string> = {}
    if (data.username?.trim()) patch.username = data.username.trim()
    if (data.password?.trim()) patch.password = data.password.trim()

    if (Object.keys(patch).length === 0) return { success: true }

    const { error } = await supabase.from("users").update(patch).eq("id", uid)
    if (error) {
      devLog("updateCurrentUserCredentials:error", error.message)
      return { success: false, error: "فشل تحديث بيانات الدخول" }
    }

    set((s) => {
      if (!s.currentSession) return {}
      return {
        users: s.users.map((u) =>
          u.id === uid
            ? { ...u, ...patch, updatedAt: new Date().toISOString() }
            : u
        ),
        currentSession: {
          ...s.currentSession,
          ...(patch.username ? { username: patch.username } : {}),
        },
      }
    })

    get().addNotification({
      type: "password_change",
      title: "تم تحديث بيانات الدخول",
      message: data.password?.trim()
        ? "تم تغيير كلمة المرور واسم المستخدم"
        : "تم تحديث اسم المستخدم",
    })
    logAudit({
      actionType: "UPDATE",
      entityType: "user",
      entityId: uid,
      entityName: snapshot.currentSession.name,
      performedBy: uid,
      performerName: snapshot.currentSession.name,
      details: { changed: Object.keys(patch) },
    })
    devLog("updateCurrentUserCredentials:success", { uid })
    return { success: true }
  },
})
