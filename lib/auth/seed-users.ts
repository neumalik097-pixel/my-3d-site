import type { User } from "./types"

// Default users for local development phase.
// Passwords are plaintext here — swap for bcrypt hashes in production.
// Barber ID "b1" links staff1 to أحمد خالد from SEED_BARBERS.

export const SEED_USERS: User[] = [
  {
    id: "u1",
    name: "محمد الأحمد",
    username: "superadmin",
    password: "rivo@2026",
    role: "super_admin",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "u2",
    name: "أحمد الخالد",
    username: "admin",
    password: "admin123",
    role: "admin",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "u3",
    name: "خالد محمد",
    username: "staff1",
    password: "staff123",
    role: "staff",
    status: "active",
    barberId: "b1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
]
