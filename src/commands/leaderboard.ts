import type { CommandContext } from 'discord-hono'
import type { Env } from '../types'
import { getGuildId } from '../utils/permissions'
import { getLeaderboard, getRecords } from '../db/stats'
import { buildLeaderboardEmbed } from '../embeds/leaderboard'

export async function handleLeaderboard(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  const db = c.env.POKER_DB
  const [entries, records] = await Promise.all([getLeaderboard(db, guildId), getRecords(db, guildId)])

  return c.res({ embeds: [buildLeaderboardEmbed(entries, records)] })
}
