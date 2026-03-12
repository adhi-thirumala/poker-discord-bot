import { Command, SubCommand, Option, register } from 'discord-hono'

const commands = [
  new Command('config', 'Server configuration').options(
    new SubCommand('set-host-role', 'Set the poker host role').options(
      new Option('role', 'The role that can manage sessions', 'Role').required(),
    ),
    new SubCommand('view', 'View current config'),
  ),
  new Command('session', 'Manage poker sessions').options(
    new SubCommand('start', 'Start a new poker session').options(
      new Option('fixed_buyin', 'Fixed buy-in amount in dollars (leave empty for variable)', 'Number'),
    ),
    new SubCommand('end', 'Force-end a session').options(
      new Option('session', 'Session to end', 'String').autocomplete().required(),
    ),
    new SubCommand('view', 'View active session(s)').options(
      new Option('session', 'Session to view (omit for all active)', 'String').autocomplete(),
    ),
  ),
  new Command('buyin', 'Join a poker session').options(
    new Option('session', 'Session to join', 'String').autocomplete().required(),
    new Option('amount', 'Buy-in amount in dollars (required for variable buy-in)', 'Number'),
  ),
  new Command('rebuy', 'Rebuy into a session').options(
    new Option('session', 'Session to rebuy into', 'String').autocomplete().required(),
    new Option('amount', 'Rebuy amount in dollars', 'Number').required(),
  ),
  new Command('cashout', 'Cash out of a session').options(
    new Option('session', 'Session to cash out of', 'String').autocomplete().required(),
    new Option('amount', 'Your cashout amount in dollars', 'Number').required(),
  ),
  new Command('leaderboard', 'View the poker leaderboard'),
  new Command('profile', 'View player stats').options(
    new Option('user', 'Player to look up (default: yourself)', 'User'),
  ),
  new Command('history', 'View session history').options(
    new Option('session', 'Specific session to view', 'String').autocomplete(),
  ),
]

register(
  commands,
  process.env.DISCORD_APPLICATION_ID,
  process.env.DISCORD_TOKEN,
  process.env.DISCORD_TEST_GUILD_ID,
)
