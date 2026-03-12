import { Embed } from 'discord-hono'
import type { LeaderboardEntry } from '../types'
import { formatDollars, discordTimestamp } from '../utils/format'

export function buildLeaderboardEmbed(
  entries: LeaderboardEntry[],
  records: {
    biggestWin: { user_id: string; net: number; ended_at: string } | null
    biggestLoss: { user_id: string; net: number; ended_at: string } | null
  },
): Embed {
  if (entries.length === 0) {
    return new Embed()
      .title('Poker Leaderboard')
      .color(0xf1c40f)
      .description('No completed sessions yet. Start playing!')
  }

  const lines = entries.map((e, i) => {
    const winRate = e.sessions_played > 0 ? Math.round((e.wins / e.sessions_played) * 100) : 0
    return `**${i + 1}.** <@${e.user_id}> ${formatDollars(e.total_net)} | Win: ${winRate}% | ${e.sessions_played} sessions`
  })

  const recordLines: string[] = []
  if (records.biggestWin) {
    recordLines.push(
      `Biggest Win: <@${records.biggestWin.user_id}> ${formatDollars(records.biggestWin.net)} (${discordTimestamp(records.biggestWin.ended_at)})`,
    )
  }
  if (records.biggestLoss) {
    recordLines.push(
      `Biggest Loss: <@${records.biggestLoss.user_id}> ${formatDollars(records.biggestLoss.net)} (${discordTimestamp(records.biggestLoss.ended_at)})`,
    )
  }

  const embed = new Embed()
    .title('Poker Leaderboard')
    .color(0xf1c40f)
    .description(lines.join('\n'))

  if (recordLines.length > 0) {
    embed.fields({ name: 'Records', value: recordLines.join('\n'), inline: false })
  }

  return embed
}
