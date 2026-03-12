import { uuidv7 } from 'uuidv7'
import type { Session, Player } from '../types'

// ─── Session Queries ───

export async function createSession(
  db: D1Database,
  guildId: string,
  createdBy: string,
  channelId: string,
  fixedBuyin: number | null,
): Promise<Session> {
  const id = uuidv7()
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO sessions (id, guild_id, created_by, fixed_buyin, status, started_at, channel_id)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    )
    .bind(id, guildId, createdBy, fixedBuyin, now, channelId)
    .run()
  return {
    id,
    guild_id: guildId,
    created_by: createdBy,
    fixed_buyin: fixedBuyin,
    status: 'active',
    started_at: now,
    ended_at: null,
    channel_id: channelId,
  }
}

export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
  const result = await db.prepare('SELECT * FROM sessions WHERE id = ?').bind(sessionId).first<Session>()
  return result ?? null
}

export async function getActiveSessions(db: D1Database, guildId: string): Promise<Session[]> {
  const result = await db
    .prepare("SELECT * FROM sessions WHERE guild_id = ? AND status = 'active' ORDER BY started_at DESC")
    .bind(guildId)
    .all<Session>()
  return result.results
}

export async function getRecentSessions(db: D1Database, guildId: string, limit = 25): Promise<Session[]> {
  const result = await db
    .prepare('SELECT * FROM sessions WHERE guild_id = ? ORDER BY started_at DESC LIMIT ?')
    .bind(guildId, limit)
    .all<Session>()
  return result.results
}

// ─── Player Queries ───

/**
 * Atomic buy-in: INSERT only if player isn't already active in session AND session is active.
 * Returns true if the insert succeeded.
 */
export async function buyIn(
  db: D1Database,
  sessionId: string,
  userId: string,
  buyinCents: number,
): Promise<boolean> {
  const id = uuidv7()
  const now = new Date().toISOString()
  const result = await db
    .prepare(
      `INSERT INTO players (id, session_id, user_id, buyin, rebuys, joined_at)
       SELECT ?, ?, ?, ?, 0, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM players WHERE session_id = ? AND user_id = ? AND cashout IS NULL
       )
       AND EXISTS (
         SELECT 1 FROM sessions WHERE id = ? AND status = 'active'
       )`,
    )
    .bind(id, sessionId, userId, buyinCents, now, sessionId, userId, sessionId)
    .run()
  return (result.meta?.changes ?? 0) > 0
}

/**
 * Atomic rebuy: adds to rebuys only if player is active (uncashed) in session.
 * Returns true if the update succeeded.
 */
export async function rebuy(
  db: D1Database,
  sessionId: string,
  userId: string,
  rebuyCents: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE players SET rebuys = rebuys + ?
       WHERE session_id = ? AND user_id = ? AND cashout IS NULL`,
    )
    .bind(rebuyCents, sessionId, userId)
    .run()
  return (result.meta?.changes ?? 0) > 0
}

/**
 * Atomic cashout + conditional session end in a single batch transaction.
 * Returns { didCashout, didEndSession }.
 */
export async function cashout(
  db: D1Database,
  sessionId: string,
  userId: string,
  cashoutCents: number,
): Promise<{ didCashout: boolean; didEndSession: boolean }> {
  const now = new Date().toISOString()
  const results = await db.batch([
    db
      .prepare(
        `UPDATE players SET cashout = ?, cashed_out_at = ?
         WHERE session_id = ? AND user_id = ? AND cashout IS NULL`,
      )
      .bind(cashoutCents, now, sessionId, userId),
    db
      .prepare(
        `UPDATE sessions SET status = 'completed', ended_at = ?
         WHERE id = ? AND status = 'active'
         AND NOT EXISTS (SELECT 1 FROM players WHERE session_id = ? AND cashout IS NULL)`,
      )
      .bind(now, sessionId, sessionId),
  ])
  return {
    didCashout: ((results[0] as D1Result).meta?.changes ?? 0) > 0,
    didEndSession: ((results[1] as D1Result).meta?.changes ?? 0) > 0,
  }
}

export async function getSessionPlayers(db: D1Database, sessionId: string): Promise<Player[]> {
  const result = await db
    .prepare('SELECT * FROM players WHERE session_id = ? ORDER BY joined_at ASC')
    .bind(sessionId)
    .all<Player>()
  return result.results
}

export async function getUncashedPlayers(db: D1Database, sessionId: string): Promise<Player[]> {
  const result = await db
    .prepare('SELECT * FROM players WHERE session_id = ? AND cashout IS NULL ORDER BY joined_at ASC')
    .bind(sessionId)
    .all<Player>()
  return result.results
}

/**
 * Force-end a session. Only succeeds if all players have cashed out.
 * Returns { ended, uncashedPlayers }.
 */
export async function forceEndSession(
  db: D1Database,
  sessionId: string,
): Promise<{ ended: boolean; uncashedPlayers: Player[] }> {
  const uncashed = await getUncashedPlayers(db, sessionId)
  if (uncashed.length > 0) {
    return { ended: false, uncashedPlayers: uncashed }
  }
  const now = new Date().toISOString()
  const result = await db
    .prepare(
      `UPDATE sessions SET status = 'completed', ended_at = ?
       WHERE id = ? AND status = 'active'`,
    )
    .bind(now, sessionId)
    .run()
  return { ended: (result.meta?.changes ?? 0) > 0, uncashedPlayers: [] }
}

/**
 * Get a player's active entry in a session (not yet cashed out).
 */
export async function getActivePlayer(
  db: D1Database,
  sessionId: string,
  userId: string,
): Promise<Player | null> {
  const result = await db
    .prepare('SELECT * FROM players WHERE session_id = ? AND user_id = ? AND cashout IS NULL')
    .bind(sessionId, userId)
    .first<Player>()
  return result ?? null
}
