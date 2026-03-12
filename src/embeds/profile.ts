import { Embed } from 'discord-hono'
import type { ProfileStats } from '../types'
import { formatDollars, discordTimestamp } from '../utils/format'

export function buildProfileEmbed(
  stats: ProfileStats,
  streak: string,
  displayName: string,
): Embed {
  const winRate =
    stats.sessions_played > 0
      ? `${Math.round((stats.wins / stats.sessions_played) * 100)}% (${stats.wins}W / ${stats.losses}L)`
      : 'N/A'

  const recentLine =
    stats.recent_nets.length > 0 ? stats.recent_nets.map((n) => formatDollars(n)).join(' | ') : 'None'

  const embed = new Embed()
    .title(`${displayName}'s Poker Profile`)
    .color(0x9b59b6)
    .fields(
      { name: 'Cumulative Net', value: formatDollars(stats.total_net), inline: true },
      { name: 'Sessions Played', value: `${stats.sessions_played}`, inline: true },
      { name: 'Win Rate', value: winRate, inline: true },
      { name: 'Avg Profit/Session', value: formatDollars(stats.avg_profit), inline: true },
      { name: 'Current Streak', value: streak, inline: true },
    )

  const personalRecords: string[] = []
  if (stats.best_session !== null && stats.best_session_time) {
    personalRecords.push(`Best: ${formatDollars(stats.best_session)} (${discordTimestamp(stats.best_session_time)})`)
  }
  if (stats.worst_session !== null && stats.worst_session_time) {
    personalRecords.push(`Worst: ${formatDollars(stats.worst_session)} (${discordTimestamp(stats.worst_session_time)})`)
  }
  if (personalRecords.length > 0) {
    embed.fields({ name: 'Personal Records', value: personalRecords.join('\n'), inline: false })
  }

  embed.fields({ name: 'Last 5 Sessions', value: recentLine, inline: false })

  return embed
}
