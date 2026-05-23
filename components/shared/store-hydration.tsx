"use client"

import { useEffect, useRef } from "react"
import { useRivoStore } from "@/lib/store"

export function StoreHydration() {
  const ran = useRef(false)
  // Holds the Realtime channel cleanup returned by subscribeToNotifications().
  const channelCleanup = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Guard: run exactly once even in React Strict Mode's double-invocation.
    if (ran.current) return
    ran.current = true

    Promise.resolve(useRivoStore.persist.rehydrate()).then(async () => {
      // Run all fetches in parallel — none depend on each other.
      // loadPermissions is included so canDo() has DB overrides before any
      // component renders. Static defaults remain active if it errors.
      // loadNotifications fetches the initial DB snapshot for the current user.
      await Promise.all([
        useRivoStore.getState().initAuth(),
        useRivoStore.getState().loadBarbers(),
        useRivoStore.getState().loadServices(),
        useRivoStore.getState().loadProducts(),
        useRivoStore.getState().loadMinibarItems(),
        useRivoStore.getState().loadTransactions(),
        useRivoStore.getState().loadAppointments(),
        useRivoStore.getState().loadClients(),
        useRivoStore.getState().loadPermissions(),
        useRivoStore.getState().loadNotifications(),
      ])

      // Mark the store as ready AFTER all data (including notifications) is loaded.
      useRivoStore.setState({ _hydrated: true })

      // Open the Realtime channel now that auth + session are confirmed.
      // The returned cleanup removes the channel when the app unmounts.
      channelCleanup.current = useRivoStore.getState().subscribeToNotifications()
    })

    return () => {
      channelCleanup.current?.()
      channelCleanup.current = null
    }
  }, [])

  return null
}
