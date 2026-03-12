import type { CommandContext } from 'discord-hono'
import type { Env, GuildConfig } from '../types'
import { getGuildId, getUserId } from '../utils/permissions'

export async function handleConfig(c: CommandContext<Env>) {
  const interaction = c.interaction
  const guildId = getGuildId(interaction)
  if (!guildId) {
    return c.flags('EPHEMERAL').res('This command can only be used in a server.')
  }

  // Check admin permission (permission bit 0x8 = ADMINISTRATOR)
  const permissions = BigInt(interaction.member?.permissions || '0')
  if ((permissions & 0x8n) === 0n) {
    return c.flags('EPHEMERAL').res('You need Administrator permission to use this command.')
  }

  const sub = c.sub.command

  if (sub === 'set-host-role') {
    const roleId = c.var.role as string | undefined
    if (!roleId) {
      return c.flags('EPHEMERAL').res('Please provide a role.')
    }

    const config: GuildConfig = { host_role_id: roleId }
    await c.env.POKER_KV.put(`guild:${guildId}:config`, JSON.stringify(config))

    return c.flags('EPHEMERAL').res(`Host role set to <@&${roleId}>. Users with this role can manage poker sessions.`)
  }

  if (sub === 'view') {
    const config = await c.env.POKER_KV.get<GuildConfig>(`guild:${guildId}:config`, 'json')
    if (!config?.host_role_id) {
      return c.flags('EPHEMERAL').res(
        'No configuration set yet. Use `/config set-host-role` to set the poker host role.',
      )
    }
    return c.flags('EPHEMERAL').res(`**Server Configuration**\nHost Role: <@&${config.host_role_id}>`)
  }

  return c.flags('EPHEMERAL').res('Unknown subcommand.')
}
