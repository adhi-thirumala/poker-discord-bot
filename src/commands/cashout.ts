import type { CommandContext } from 'discord-hono'
import { $channels$_$messages } from 'discord-hono'
import type { Env } from '../types'
import { getGuildId, getUserId } from '../utils/permissions'
import { dollarsToCents, validateAmount } from '../utils/money'
import { formatAmount } from '../utils/format'
import * as queries from '../db/queries'
import { buildSessionSummaryEmbed } from '../embeds/session'

export async function handleCashout(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  const db = c.env.POKER_DB
  const sessionId = c.var.session as string | undefined
  const amountDollars = c.var.amount as number | undefined

  if (!sessionId) return c.flags('EPHEMERAL').res('Please select a session.')
  if (amountDollars === undefined || amountDollars === null) {
    return c.flags('EPHEMERAL').res('Please provide your cashout amount.')
  }

  // Allow $0 cashout (lost everything) but not negative
  if (typeof amountDollars !== 'number' || isNaN(amountDollars) || amountDollars < 0) {
    return c.flags('EPHEMERAL').res('Cashout amount must be $0 or more.')
  }

  const str = amountDollars.toString()
  const dotIndex = str.indexOf('.')
  if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
    return c.flags('EPHEMERAL').res('Amount cannot have more than 2 decimal places.')
  }

  const cashoutCents = dollarsToCents(amountDollars)!

  const session = await queries.getSession(db, sessionId)
  if (!session || session.guild_id !== guildId) {
    return c.flags('EPHEMERAL').res('Session not found.')
  }
  if (session.status !== 'active') {
    return c.flags('EPHEMERAL').res('This session is no longer active.')
  }

  const userId = getUserId(interaction)
  const { didCashout, didEndSession } = await queries.cashout(db, sessionId, userId, cashoutCents)

  if (!didCashout) {
    return c.flags('EPHEMERAL').res(
      'Could not cash out. You may not be in this session, or you have already cashed out.',
    )
  }

  if (didEndSession) {
    // Session auto-ended: post summary
    const updatedSession = await queries.getSession(db, sessionId)
    const players = await queries.getSessionPlayers(db, sessionId)
    const summaryEmbed = buildSessionSummaryEmbed(updatedSession!, players)

    return c.res({
      content: `<@${userId}> cashed out for ${formatAmount(cashoutCents)}. All players have cashed out!`,
      embeds: [summaryEmbed],
    })
  }

  return c.res(`<@${userId}> cashed out for ${formatAmount(cashoutCents)}.`)
}
