export function formatIQD(amount: number | null | undefined): string {
  const value = amount ?? 0
  return value.toLocaleString("en-US") + " د.ع"
}

export function formatIQDCompact(amount: number | null | undefined): string {
  const value = amount ?? 0
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "م"
  if (value >= 1_000) return (value / 1_000).toFixed(0) + "ك"
  return String(Math.round(value))
}
