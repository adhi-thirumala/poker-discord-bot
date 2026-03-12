import type { CommandContext } from 'discord-hono'
import type { Env } from '../types'
import { getGuildId, getUserId } from '../utils/permissions'
import { getProfileStats, getCurrentStreak } from '../db/stats'
import { buildProfileEmbed } from '../embeds/profile'

export async function handleProfile(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  const db = c.env.POKER_DB

  // If a user was specified via the option, use that; otherwise use the caller
  const targetUserId = (c.var.user as string | undefined) || getUserId(interaction)

  const [stats, streak] = await Promise.all([
    getProfileStats(db, guildId, targetUserId),
    getCurrentStreak(db, guildId, targetUserId),
  ])

  if (!stats) {
    return c.flags('EPHEMERAL').res(`<@${targetUserId}> hasn't played any completed sessions yet.`)
  }

  const displayName = `<@${targetUserId}>`
  return c.res({ embeds: [buildProfileEmbed(stats, streak, displayName)] })
}
