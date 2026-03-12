import type { APIInteraction } from 'discord-api-types/v10'
import type { GuildConfig } from '../types'

/**
 * Check if the interacting user has the configured host role.
 * Returns true if the user has the role, or if no host role is configured (first-time setup).
 */
export async function hasHostRole(
  kv: KVNamespace,
  interaction: APIInteraction,
): Promise<boolean> {
  const guildId = interaction.guild_id
  if (!guildId) return false

  const config = await kv.get<GuildConfig>(`guild:${guildId}:config`, 'json')
  if (!config?.host_role_id) {
    // No host role configured -- only allow server admins (permission bit 0x8)
    const permissions = BigInt(('member' in interaction && interaction.member?.permissions) || '0')
    return (permissions & 0x8n) !== 0n
  }

  const memberRoles = ('member' in interaction && interaction.member?.roles) || []
  return memberRoles.includes(config.host_role_id)
}

/**
 * Get the guild ID from an interaction, or null if in DMs.
 */
export function getGuildId(interaction: APIInteraction): string | null {
  return interaction.guild_id ?? null
}

/**
 * Get the user ID from an interaction.
 */
export function getUserId(interaction: APIInteraction): string {
  return interaction.member?.user?.id ?? interaction.user?.id ?? ''
}

/**
 * Get the channel ID from an interaction.
 */
export function getChannelId(interaction: APIInteraction): string {
  return interaction.channel?.id ?? ''
}
