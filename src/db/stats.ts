import type { LeaderboardEntry, ProfileStats, Player } from '../types'

/**
 * Get the leaderboard for a guild, ranked by cumulative net P/L.
 */
export async function getLeaderboard(db: D1Database, guildId: string, limit = 20): Promise<LeaderboardEntry[]> {
  const result = await db
    .prepare(
      `SELECT
         p.user_id,
         SUM(p.cashout - p.buyin - p.rebuys) as total_net,
         COUNT(*) as sessions_played,
         SUM(CASE WHEN (p.cashout - p.buyin - p.rebuys) > 0 THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN (p.cashout - p.buyin - p.rebuys) < 0 THEN 1 ELSE 0 END) as losses
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       GROUP BY p.user_id
       ORDER BY total_net DESC
       LIMIT ?`,
    )
    .bind(guildId, limit)
    .all<LeaderboardEntry>()
  return result.results
}

/**
 * Get the biggest win and biggest loss for a guild.
 */
export async function getRecords(
  db: D1Database,
  guildId: string,
): Promise<{
  biggestWin: { user_id: string; net: number; ended_at: string } | null
  biggestLoss: { user_id: string; net: number; ended_at: string } | null
}> {
  const [winResult, lossResult] = await db.batch([
    db.prepare(
      `SELECT p.user_id, (p.cashout - p.buyin - p.rebuys) as net, s.ended_at
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       ORDER BY net DESC LIMIT 1`,
    ).bind(guildId),
    db.prepare(
      `SELECT p.user_id, (p.cashout - p.buyin - p.rebuys) as net, s.ended_at
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       ORDER BY net ASC LIMIT 1`,
    ).bind(guildId),
  ])

  const winRows = (winResult as D1Result<{ user_id: string; net: number; ended_at: string }>).results
  const lossRows = (lossResult as D1Result<{ user_id: string; net: number; ended_at: string }>).results

  return {
    biggestWin: winRows.length > 0 ? winRows[0] : null,
    biggestLoss: lossRows.length > 0 && lossRows[0].net < 0 ? lossRows[0] : null,
  }
}

/**
 * Get detailed profile stats for a user in a guild.
 */
export async function getProfileStats(
  db: D1Database,
  guildId: string,
  userId: string,
): Promise<ProfileStats | null> {
  const [summaryResult, bestResult, worstResult, recentResult] = await db.batch([
    // Summary stats
    db.prepare(
      `SELECT
         p.user_id,
         SUM(p.cashout - p.buyin - p.rebuys) as total_net,
         COUNT(*) as sessions_played,
         SUM(CASE WHEN (p.cashout - p.buyin - p.rebuys) > 0 THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN (p.cashout - p.buyin - p.rebuys) < 0 THEN 1 ELSE 0 END) as losses,
         AVG(p.cashout - p.buyin - p.rebuys) as avg_profit
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND p.user_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL`,
    ).bind(guildId, userId),
    // Best session
    db.prepare(
      `SELECT (p.cashout - p.buyin - p.rebuys) as net, s.ended_at
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND p.user_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       ORDER BY net DESC LIMIT 1`,
    ).bind(guildId, userId),
    // Worst session
    db.prepare(
      `SELECT (p.cashout - p.buyin - p.rebuys) as net, s.ended_at
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND p.user_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       ORDER BY net ASC LIMIT 1`,
    ).bind(guildId, userId),
    // Recent 5 sessions
    db.prepare(
      `SELECT (p.cashout - p.buyin - p.rebuys) as net
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND p.user_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       ORDER BY s.ended_at DESC LIMIT 5`,
    ).bind(guildId, userId),
  ])

  type SummaryRow = {
    user_id: string | null
    total_net: number
    sessions_played: number
    wins: number
    losses: number
    avg_profit: number
  }
  type NetTimeRow = { net: number; ended_at: string }
  type NetRow = { net: number }

  const summaryRows = (summaryResult as D1Result<SummaryRow>).results
  if (!summaryRows.length || summaryRows[0].sessions_played === 0) return null

  const summary = summaryRows[0]
  const bestRows = (bestResult as D1Result<NetTimeRow>).results
  const worstRows = (worstResult as D1Result<NetTimeRow>).results
  const recentRows = (recentResult as D1Result<NetRow>).results

  return {
    user_id: userId,
    total_net: summary.total_net,
    sessions_played: summary.sessions_played,
    wins: summary.wins,
    losses: summary.losses,
    avg_profit: Math.round(summary.avg_profit),
    best_session: bestRows.length > 0 ? bestRows[0].net : null,
    worst_session: worstRows.length > 0 ? worstRows[0].net : null,
    best_session_time: bestRows.length > 0 ? bestRows[0].ended_at : null,
    worst_session_time: worstRows.length > 0 ? worstRows[0].ended_at : null,
    recent_nets: recentRows.map((r) => r.net),
  }
}

/**
 * Compute the current streak (wins/losses in a row) for a user.
 */
export async function getCurrentStreak(
  db: D1Database,
  guildId: string,
  userId: string,
): Promise<string> {
  const result = await db
    .prepare(
      `SELECT (p.cashout - p.buyin - p.rebuys) as net
       FROM players p
       JOIN sessions s ON p.session_id = s.id
       WHERE s.guild_id = ? AND p.user_id = ? AND s.status = 'completed' AND p.cashout IS NOT NULL
       ORDER BY s.ended_at DESC
       LIMIT 20`,
    )
    .bind(guildId, userId)
    .all<{ net: number }>()

  const nets = result.results
  if (nets.length === 0) return '0'

  const firstIsWin = nets[0].net > 0
  let streak = 0
  for (const row of nets) {
    const isWin = row.net > 0
    if (isWin === firstIsWin) {
      streak++
    } else {
      break
    }
  }
  return `${streak}${firstIsWin ? 'W' : 'L'}`
}
