"use client"

import { Toaster } from "@/components/ui/toaster"
import { StoreHydration } from "@/components/shared/store-hydration"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHydration />
      {children}
      <Toaster />
    </>
  )
}
