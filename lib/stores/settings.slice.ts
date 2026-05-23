import type { StateCreator } from "zustand"
import type { RivoState, SettingsSlice, SettingsData } from "./types"
import { DEFAULT_SETTINGS } from "./types"

export const createSettingsSlice: StateCreator<RivoState, [], [], SettingsSlice> = (set) => ({
  settings: { ...DEFAULT_SETTINGS },

  updateSettings: (data: Partial<SettingsData>) =>
    set((s) => ({ settings: { ...s.settings, ...data } })),
})
