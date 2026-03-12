import type { CommandContext } from 'discord-hono'
import type { Env } from '../types'
import { getGuildId, getUserId } from '../utils/permissions'
import { dollarsToCents, validateAmount } from '../utils/money'
import { formatAmount } from '../utils/format'
import * as queries from '../db/queries'

export async function handleBuyin(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  const db = c.env.POKER_DB
  const sessionId = c.var.session as string | undefined
  const amountDollars = c.var.amount as number | undefined

  if (!sessionId) return c.flags('EPHEMERAL').res('Please select a session.')

  const session = await queries.getSession(db, sessionId)
  if (!session || session.guild_id !== guildId) {
    return c.flags('EPHEMERAL').res('Session not found.')
  }
  if (session.status !== 'active') {
    return c.flags('EPHEMERAL').res('This session is no longer active.')
  }

  let buyinCents: number
  if (session.fixed_buyin !== null) {
    // Fixed buy-in session: ignore user amount
    buyinCents = session.fixed_buyin
  } else {
    // Variable buy-in: amount is required
    if (amountDollars === undefined || amountDollars === null) {
      return c.flags('EPHEMERAL').res('This session has variable buy-in. Please provide an amount.')
    }
    const err = validateAmount(amountDollars)
    if (err) return c.flags('EPHEMERAL').res(err)
    buyinCents = dollarsToCents(amountDollars)!
  }

  const userId = getUserId(interaction)
  const success = await queries.buyIn(db, sessionId, userId, buyinCents)

  if (!success) {
    return c.flags('EPHEMERAL').res(
      'Could not buy in. You may already be in this session, or the session is no longer active.',
    )
  }

  return c.res(`<@${userId}> bought in for ${formatAmount(buyinCents)}!`)
}
