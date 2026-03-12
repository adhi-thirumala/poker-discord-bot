// Shared TypeScript types

export interface Session {
  id: string
  guild_id: string
  created_by: string
  fixed_buyin: number | null
  status: 'active' | 'completed'
  started_at: string
  ended_at: string | null
  channel_id: string
}

export interface Player {
  id: string
  session_id: string
  user_id: string
  buyin: number
  rebuys: number
  cashout: number | null
  joined_at: string
  cashed_out_at: string | null
}

export interface GuildConfig {
  host_role_id: string
}

/** Player with computed net P/L */
export interface PlayerResult extends Player {
  net: number // cashout - (buyin + rebuys)
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  user_id: string
  total_net: number
  sessions_played: number
  wins: number
  losses: number
}

/** Profile stats */
export interface ProfileStats {
  user_id: string
  total_net: number
  sessions_played: number
  wins: number
  losses: number
  avg_profit: number
  best_session: number | null
  worst_session: number | null
  best_session_time: string | null
  worst_session_time: string | null
  recent_nets: number[]
}

export type Env = {
  Bindings: {
    POKER_DB: D1Database
    POKER_KV: KVNamespace
    DISCORD_APPLICATION_ID: string
    DISCORD_PUBLIC_KEY: string
    DISCORD_TOKEN: string
  }
  Variables: {
    // Command option values (populated by discord-hono from option names)
    role?: string
    session?: string
    amount?: number
    fixed_buyin?: number
    user?: string
  }
}
