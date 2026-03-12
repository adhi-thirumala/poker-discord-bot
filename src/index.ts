import { DiscordHono, Autocomplete } from 'discord-hono'
import type { Env } from './types'
import { handleConfig } from './commands/config'
import { handleSession } from './commands/session'
import { handleBuyin } from './commands/buyin'
import { handleRebuy } from './commands/rebuy'
import { handleCashout } from './commands/cashout'
import { handleLeaderboard } from './commands/leaderboard'
import { handleProfile } from './commands/profile'
import { handleHistory } from './commands/history'
import { getActiveSessions, getRecentSessions } from './db/queries'
import { formatAmount } from './utils/format'

const app = new DiscordHono<Env>()

// ─── Commands ───

app.command('config', handleConfig)
app.command('session', handleSession)
app.command('buyin', handleBuyin)
app.command('rebuy', handleRebuy)
app.command('cashout', handleCashout)
app.command('leaderboard', handleLeaderboard)
app.command('profile', handleProfile)
app.command('history', handleHistory)

// ─── Autocomplete handlers for session selection ───

async function sessionAutocomplete(c: any) {
  const guildId = c.interaction.guild_id
  if (!guildId) return c.resAutocomplete(new Autocomplete(c.focused?.value).choices())

  const db = c.env.POKER_DB
  const sessions = await getActiveSessions(db, guildId)
  const choices = sessions.map((s: any) => {
    const buyinText = s.fixed_buyin !== null ? formatAmount(s.fixed_buyin) : 'Variable'
    const date = new Date(s.started_at).toLocaleDateString()
    return { name: `${date} | ${buyinText} buy-in`, value: s.id }
  })

  return c.resAutocomplete(new Autocomplete(c.focused?.value).choices(...choices))
}

async function historyAutocomplete(c: any) {
  const guildId = c.interaction.guild_id
  if (!guildId) return c.resAutocomplete(new Autocomplete(c.focused?.value).choices())

  const db = c.env.POKER_DB
  const sessions = await getRecentSessions(db, guildId, 25)
  const choices = sessions.map((s: any) => {
    const buyinText = s.fixed_buyin !== null ? formatAmount(s.fixed_buyin) : 'Variable'
    const status = s.status === 'active' ? 'Active' : 'Done'
    const date = new Date(s.started_at).toLocaleDateString()
    return { name: `${status} | ${date} | ${buyinText}`, value: s.id }
  })

  return c.resAutocomplete(new Autocomplete(c.focused?.value).choices(...choices))
}

// session subcommands (end, view) use active sessions
app.autocomplete('session', sessionAutocomplete, handleSession)
// buyin, rebuy, cashout use active sessions
app.autocomplete('buyin', sessionAutocomplete, handleBuyin)
app.autocomplete('rebuy', sessionAutocomplete, handleRebuy)
app.autocomplete('cashout', sessionAutocomplete, handleCashout)
// history uses all sessions (active + completed)
app.autocomplete('history', historyAutocomplete, handleHistory)

export default app
