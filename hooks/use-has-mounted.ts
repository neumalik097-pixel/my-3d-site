"use client"

import { useEffect, useState } from "react"

/**
 * Returns true after the component has mounted on the client.
 * Prevents hydration mismatches when rendering localStorage-dependent content.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
