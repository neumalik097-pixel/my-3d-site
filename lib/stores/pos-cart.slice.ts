import type { StateCreator } from "zustand"
import type { RivoState, PosCartSlice, CartItem } from "./types"

const POS_INITIAL = {
  posCart: [] as CartItem[],
  posBarberId: "",
  posClientName: "",
  posNotes: "",
  posDiscountType: "percentage" as const,
  posDiscountValue: "",
  posTaxEnabled: false,
  posPaymentMethod: "cash" as const,
}

export const createPosCartSlice: StateCreator<RivoState, [], [], PosCartSlice> = (set) => ({
  ...POS_INITIAL,

  posAddItem: (item) =>
    set((s) => {
      const existing = s.posCart.find(
        (i) => i.itemId === item.itemId && i.type === item.type
      )
      if (existing) {
        return {
          posCart: s.posCart.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return {
        posCart: [...s.posCart, { ...item, id: crypto.randomUUID(), quantity: 1 }],
      }
    }),

  posRemoveItem: (id) =>
    set((s) => ({ posCart: s.posCart.filter((i) => i.id !== id) })),

  posSetQty: (id, qty) =>
    set((s) => ({
      posCart: s.posCart.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, qty) } : i
      ),
    })),

  posClearCart: () => set({ posCart: [] }),

  posSetBarberId: (id) => set({ posBarberId: id }),
  posSetClientName: (name) => set({ posClientName: name }),
  posSetNotes: (notes) => set({ posNotes: notes }),
  posSetDiscountType: (type) => set({ posDiscountType: type }),
  posSetDiscountValue: (value) => set({ posDiscountValue: value }),
  posSetTaxEnabled: (enabled) => set({ posTaxEnabled: enabled }),
  posSetPaymentMethod: (method) => set({ posPaymentMethod: method }),

  posReset: () => set({ ...POS_INITIAL }),
})
