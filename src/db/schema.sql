-- Poker Discord Bot - D1 Schema

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  fixed_buyin INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  channel_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  buyin INTEGER NOT NULL,
  rebuys INTEGER NOT NULL DEFAULT 0,
  cashout INTEGER,
  joined_at TEXT NOT NULL,
  cashed_out_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sessions_guild ON sessions(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);

-- Partial unique index: at most one active (uncashed) player entry per session per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_one_active ON players(session_id, user_id) WHERE cashout IS NULL;
