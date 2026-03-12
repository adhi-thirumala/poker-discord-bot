import type { CommandContext } from 'discord-hono'
import type { Env } from '../types'
import { getGuildId } from '../utils/permissions'
import { formatAmount, formatDuration, discordTimestamp } from '../utils/format'
import * as queries from '../db/queries'
import { buildSessionViewEmbed } from '../embeds/session'

export async function handleHistory(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  const db = c.env.POKER_DB
  const sessionId = c.var.session as string | undefined

  if (sessionId) {
    // Show details for a specific session
    const session = await queries.getSession(db, sessionId)
    if (!session || session.guild_id !== guildId) {
      return c.flags('EPHEMERAL').res('Session not found.')
    }
    const players = await queries.getSessionPlayers(db, sessionId)
    return c.res({ embeds: [buildSessionViewEmbed(session, players)] })
  }

  // List recent sessions
  const sessions = await queries.getRecentSessions(db, guildId, 10)
  if (sessions.length === 0) {
    return c.flags('EPHEMERAL').res('No sessions found for this server.')
  }

  const lines = sessions.map((s) => {
    const status = s.status === 'active' ? 'Active' : 'Completed'
    const buyinText = s.fixed_buyin !== null ? formatAmount(s.fixed_buyin) : 'Variable'
    const duration =
      s.ended_at ? formatDuration(s.started_at, s.ended_at) : 'ongoing'
    return `**${status}** | Buy-in: ${buyinText} | ${discordTimestamp(s.started_at)} | ${duration}`
  })

  return c.res(`**Session History (last ${sessions.length})**\n\n${lines.join('\n')}`)
}
