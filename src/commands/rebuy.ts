import type { CommandContext } from 'discord-hono'
import type { Env } from '../types'
import { getGuildId, getUserId } from '../utils/permissions'
import { dollarsToCents, validateAmount } from '../utils/money'
import { formatAmount } from '../utils/format'
import * as queries from '../db/queries'

export async function handleRebuy(c: CommandContext<Env>) {
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
    return c.flags('EPHEMERAL').res('Please provide a rebuy amount.')
  }

  const err = validateAmount(amountDollars)
  if (err) return c.flags('EPHEMERAL').res(err)

  const session = await queries.getSession(db, sessionId)
  if (!session || session.guild_id !== guildId) {
    return c.flags('EPHEMERAL').res('Session not found.')
  }
  if (session.status !== 'active') {
    return c.flags('EPHEMERAL').res('This session is no longer active.')
  }

  let rebuyCents: number
  if (session.fixed_buyin !== null) {
    // Fixed buy-in session: rebuy is the fixed amount, ignore user amount
    rebuyCents = session.fixed_buyin
  } else {
    rebuyCents = dollarsToCents(amountDollars)!
  }

  const userId = getUserId(interaction)
  const success = await queries.rebuy(db, sessionId, userId, rebuyCents)

  if (!success) {
    return c.flags('EPHEMERAL').res(
      'Could not rebuy. You may not be in this session, or you have already cashed out.',
    )
  }

  return c.res(`<@${userId}> rebought for ${formatAmount(rebuyCents)}!`)
}
