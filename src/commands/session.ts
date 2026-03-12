import type { CommandContext } from 'discord-hono'
import type { Env } from '../types'
import { hasHostRole, getGuildId, getUserId, getChannelId } from '../utils/permissions'
import { dollarsToCents, validateAmount } from '../utils/money'
import { formatAmount } from '../utils/format'
import * as queries from '../db/queries'
import { buildSessionViewEmbed, buildSessionSummaryEmbed } from '../embeds/session'

export async function handleSession(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  if (!(await hasHostRole(c.env.POKER_KV, interaction))) {
    return c.flags('EPHEMERAL').res('You need the poker host role to manage sessions. Ask an admin to set it with `/config set-host-role`.')
  }

  const sub = c.sub.command
  const db = c.env.POKER_DB

  if (sub === 'start') {
    const fixedBuyinDollars = c.var.fixed_buyin as number | undefined
    let fixedBuyinCents: number | null = null

    if (fixedBuyinDollars !== undefined && fixedBuyinDollars !== null) {
      const err = validateAmount(fixedBuyinDollars)
      if (err) return c.flags('EPHEMERAL').res(err)
      fixedBuyinCents = dollarsToCents(fixedBuyinDollars)!
    }

    const session = await queries.createSession(
      db,
      guildId,
      getUserId(interaction),
      getChannelId(interaction),
      fixedBuyinCents,
    )

    const buyinText = fixedBuyinCents !== null ? `Fixed buy-in: ${formatAmount(fixedBuyinCents)}` : 'Variable buy-in'
    return c.res(
      `**New Poker Session Started!**\n${buyinText}\n\nUse \`/buyin\` to join the session.`,
    )
  }

  if (sub === 'end') {
    const sessionId = c.var.session as string | undefined
    if (!sessionId) return c.flags('EPHEMERAL').res('Please select a session.')

    const session = await queries.getSession(db, sessionId)
    if (!session || session.guild_id !== guildId) {
      return c.flags('EPHEMERAL').res('Session not found.')
    }
    if (session.status !== 'active') {
      return c.flags('EPHEMERAL').res('This session has already ended.')
    }

    const { ended, uncashedPlayers } = await queries.forceEndSession(db, sessionId)
    if (!ended) {
      const mentions = uncashedPlayers.map((p) => `<@${p.user_id}>`).join(', ')
      return c.flags('EPHEMERAL').res(
        `Cannot end session. The following players still need to cash out:\n${mentions}`,
      )
    }

    // Post summary
    const updatedSession = await queries.getSession(db, sessionId)
    const players = await queries.getSessionPlayers(db, sessionId)
    return c.res({
      embeds: [buildSessionSummaryEmbed(updatedSession!, players)],
    })
  }

  if (sub === 'view') {
    const sessionId = c.var.session as string | undefined

    if (sessionId) {
      const session = await queries.getSession(db, sessionId)
      if (!session || session.guild_id !== guildId) {
        return c.flags('EPHEMERAL').res('Session not found.')
      }
      const players = await queries.getSessionPlayers(db, sessionId)
      return c.res({ embeds: [buildSessionViewEmbed(session, players)] })
    }

    // List all active sessions
    const sessions = await queries.getActiveSessions(db, guildId)
    if (sessions.length === 0) {
      return c.flags('EPHEMERAL').res('No active sessions. Use `/session start` to create one.')
    }

    const lines = sessions.map((s) => {
      const buyinText = s.fixed_buyin !== null ? formatAmount(s.fixed_buyin) : 'Variable'
      return `**Session** (by <@${s.created_by}>) | Buy-in: ${buyinText} | Started: <t:${Math.floor(new Date(s.started_at).getTime() / 1000)}:R>`
    })

    return c.res(`**Active Sessions (${sessions.length})**\n\n${lines.join('\n')}`)
  }

  return c.flags('EPHEMERAL').res('Unknown subcommand.')
}
