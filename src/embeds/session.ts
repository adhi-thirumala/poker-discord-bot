import { Embed } from 'discord-hono'
import type { Session, Player } from '../types'
import { formatDollars, formatAmount, formatDuration, discordTimestamp } from '../utils/format'

/**
 * Build a session view embed showing current status and players.
 */
export function buildSessionViewEmbed(session: Session, players: Player[]): Embed {
  const buyinType = session.fixed_buyin !== null ? `${formatAmount(session.fixed_buyin)} (fixed)` : 'Variable'
  const totalInPlay = players.reduce((sum, p) => sum + p.buyin + p.rebuys, 0)

  let playerLines = ''
  if (players.length === 0) {
    playerLines = 'No players yet.'
  } else {
    playerLines = players
      .map((p) => {
        const status = p.cashout !== null ? `Out: ${formatAmount(p.cashout)}` : 'Playing'
        const rebuys = p.rebuys > 0 ? ` | Rebuys: ${formatAmount(p.rebuys)}` : ''
        return `<@${p.user_id}> | In: ${formatAmount(p.buyin)}${rebuys} | ${status}`
      })
      .join('\n')
  }

  const embed = new Embed()
    .title('Poker Session')
    .color(session.status === 'active' ? 0x57f287 : 0x95a5a6)
    .fields(
      { name: 'Status', value: session.status === 'active' ? 'Active' : 'Completed', inline: true },
      { name: 'Buy-in', value: buyinType, inline: true },
      { name: 'Started', value: discordTimestamp(session.started_at), inline: true },
      { name: `Players (${players.length})`, value: playerLines, inline: false },
      { name: 'Total in play', value: formatAmount(totalInPlay), inline: true },
    )

  if (session.ended_at) {
    embed.fields({ name: 'Duration', value: formatDuration(session.started_at, session.ended_at), inline: true })
  }

  return embed
}

/**
 * Build the session summary embed posted when a session ends.
 */
export function buildSessionSummaryEmbed(session: Session, players: Player[]): Embed {
  const endedAt = session.ended_at ?? new Date().toISOString()
  const duration = formatDuration(session.started_at, endedAt)
  const totalInPlay = players.reduce((sum, p) => sum + p.buyin + p.rebuys, 0)

  // Sort by net P/L descending
  const sorted = [...players]
    .map((p) => ({
      ...p,
      net: (p.cashout ?? 0) - p.buyin - p.rebuys,
    }))
    .sort((a, b) => b.net - a.net)

  const resultLines = sorted
    .map((p, i) => {
      const totalIn = p.buyin + p.rebuys
      return `${i + 1}. <@${p.user_id}> ${formatDollars(p.net)} (In: ${formatAmount(totalIn)} -> Out: ${formatAmount(p.cashout ?? 0)})`
    })
    .join('\n')

  // P/L validation (zero-sum check)
  const plSum = sorted.reduce((sum, p) => sum + p.net, 0)
  const validation =
    plSum === 0 ? 'Sum of P/L = $0.00' : `Sum of P/L = ${formatDollars(plSum)} (mismatch!)`

  return new Embed()
    .title('Session Complete')
    .color(0x3498db)
    .fields(
      { name: 'Duration', value: duration, inline: true },
      { name: 'Total in play', value: formatAmount(totalInPlay), inline: true },
      { name: 'Results', value: resultLines || 'No players.', inline: false },
      { name: 'Validation', value: validation, inline: false },
    )
}
