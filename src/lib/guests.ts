import type { Guest } from '@/lib/demo-meetings'

const WORKSPACE_DOMAIN = 'leapcast.io'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

export type InviteeResult =
  { ok: true; guest: Guest } | { ok: false; error: string }

/** Turns a typed email into a pending guest, or explains why it can't. */
export function parseInvitee(
  input: string,
  alreadyInvited: readonly { email: string }[],
): InviteeResult {
  const email = input.trim().toLowerCase()
  if (!EMAIL.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  if (alreadyInvited.some((guest) => guest.email === email)) {
    return { ok: false, error: 'That person is already invited.' }
  }
  return {
    ok: true,
    guest: {
      name: nameFromEmail(email),
      email,
      rsvp: 'pending',
      role: 'participant',
      isExternal: !email.endsWith(`@${WORKSPACE_DOMAIN}`),
    },
  }
}
