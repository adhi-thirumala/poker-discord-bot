/**
 * Format cents as a dollar string with sign.
 * e.g. 2550 -> "+$25.50", -1000 -> "-$10.00", 0 -> "$0.00"
 */
export function formatDollars(cents: number): string {
  const sign = cents < 0 ? '-' : cents > 0 ? '+' : ''
  return `${sign}$${Math.abs(cents / 100).toFixed(2)}`
}

/**
 * Format cents as a dollar string without sign (for amounts, not P/L).
 * e.g. 2550 -> "$25.50"
 */
export function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format a duration between two ISO timestamps as "Xh Ym".
 */
export function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Convert an ISO timestamp to a Discord relative timestamp.
 * e.g. "<t:1234567890:R>" for "3 hours ago"
 */
export function discordTimestamp(iso: string, style: 'R' | 'f' | 'F' | 't' | 'T' | 'd' | 'D' = 'R'): string {
  const epoch = Math.floor(new Date(iso).getTime() / 1000)
  return `<t:${epoch}:${style}>`
}
