import type { GuestRole } from '@/lib/demo-meetings'

export type AssignableRole = Exclude<GuestRole, 'host'>

export const ROLES: Record<
  AssignableRole,
  { label: string; description: string }
> = {
  'co-host': {
    label: 'Co-host',
    description: 'Helps run it: admits people, manages guests and recording',
  },
  participant: {
    label: 'Participant',
    description: 'Can talk, share their screen and chat',
  },
  viewer: {
    label: 'Viewer',
    description: 'Watches and chats; can’t unmute or share',
  },
}

export function isAssignableRole(value: string): value is AssignableRole {
  return value in ROLES
}

/** Badge text for a role; participants are the default, so they get none. */
export function roleBadge(role: GuestRole): string | null {
  switch (role) {
    case 'host':
      return 'Host'
    case 'co-host':
      return 'Co-host'
    case 'viewer':
      return 'Viewer'
    case 'participant':
      return null
    default: {
      const unhandled: never = role
      throw new Error(`Unhandled role: ${String(unhandled)}`)
    }
  }
}
