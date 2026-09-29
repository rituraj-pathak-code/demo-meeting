import { useState } from 'react'
import { Trash2, Undo2, UserPlus } from 'lucide-react'

import {
  EditableSection,
  SectionEditForm,
} from '@/components/meeting/editable-section'
import { INVITE_SCOPES } from '@/components/meeting/invite-dialog'
import { RoleSelect } from '@/components/meeting/role-select'
import { GuestIdentity, RSVP_TEXT } from '@/components/meeting/people-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Guest } from '@/lib/demo-meetings'
import { parseInvitee } from '@/lib/guests'
import type { AssignableRole } from '@/lib/roles'
import type { InviteScope } from '@/lib/sessions'

export type SessionGuestsDraft = {
  /** Invited to this session only. */
  added: readonly Guest[]
  /** Series guests left out of this session. */
  removed: readonly string[]
  /** New people who join the whole series from here. */
  seriesInvites: readonly Guest[]
  /** Series guests with a different role in this session only. */
  roles: Readonly<Record<string, AssignableRole>>
}

type SessionPeopleSectionProps = {
  seriesGuests: readonly Guest[]
  value: SessionGuestsDraft
  canEdit: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (value: SessionGuestsDraft) => void
  onReset: () => void
}

type ListedGuest = Guest & {
  tag: 'series' | 'session' | 'joins-series'
  roleChanged: boolean
}

function listGuests(
  seriesGuests: readonly Guest[],
  draft: SessionGuestsDraft,
): ListedGuest[] {
  return [
    ...seriesGuests
      .filter((guest) => !draft.removed.includes(guest.email))
      .map((guest) => {
        const override =
          guest.role === 'host' ? undefined : draft.roles[guest.email]
        return {
          ...guest,
          role: override ?? guest.role,
          tag: 'series' as const,
          roleChanged: override !== undefined,
        }
      }),
    ...draft.seriesInvites.map((guest) => ({
      ...guest,
      tag: 'joins-series' as const,
      roleChanged: false,
    })),
    ...draft.added.map((guest) => ({
      ...guest,
      tag: 'session' as const,
      roleChanged: false,
    })),
  ]
}

function GuestTag({ guest }: { guest: ListedGuest }) {
  const label =
    guest.tag === 'session'
      ? 'This session only'
      : guest.tag === 'joins-series'
        ? 'Joins the series'
        : guest.roleChanged
          ? 'Role changed'
          : null
  if (!label) return null
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-primary/30 text-primary"
    >
      {label}
    </Badge>
  )
}

export function SessionPeopleSection({
  seriesGuests,
  value,
  canEdit,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onReset,
}: SessionPeopleSectionProps) {
  const listed = listGuests(seriesGuests, value)
  const removedGuests = seriesGuests.filter((guest) =>
    value.removed.includes(guest.email),
  )
  const isChanged =
    value.added.length > 0 ||
    value.removed.length > 0 ||
    Object.keys(value.roles).length > 0

  return (
    <EditableSection
      id="people"
      title={`People · ${listed.length}`}
      description="Everyone in the series, plus anyone invited to just this session"
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={isChanged ? { onReset } : undefined}
    >
      {isEditing ? (
        <SessionPeopleForm
          seriesGuests={seriesGuests}
          initial={value}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <div className="grid gap-3">
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {listed.map((guest) => (
              <li key={guest.email} className="flex items-center gap-3 py-2">
                <GuestIdentity guest={guest} />
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <GuestTag guest={guest} />
                  <span className="text-xs text-muted-foreground">
                    {RSVP_TEXT[guest.rsvp]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {removedGuests.length > 0 && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Not invited to this session:{' '}
              {removedGuests.map((guest) => guest.name).join(', ')}
            </p>
          )}
        </div>
      )}
    </EditableSection>
  )
}

function SessionPeopleForm({
  seriesGuests,
  initial,
  onCancel,
  onSave,
}: {
  seriesGuests: readonly Guest[]
  initial: SessionGuestsDraft
  onCancel: () => void
  onSave: (value: SessionGuestsDraft) => void
}) {
  const [draft, setDraft] = useState(initial)
  const [email, setEmail] = useState('')
  const [scope, setScope] = useState<InviteScope>('session')
  const [role, setRole] = useState<AssignableRole>('participant')
  const [error, setError] = useState<string | null>(null)

  const listed = listGuests(seriesGuests, draft)
  const removedGuests = seriesGuests.filter((guest) =>
    draft.removed.includes(guest.email),
  )

  function invite() {
    const result = parseInvitee(email, [...listed, ...removedGuests])
    if (!result.ok) {
      setError(result.error)
      return
    }
    const invited = { ...result.guest, role }
    setDraft(
      scope === 'session'
        ? { ...draft, added: [...draft.added, invited] }
        : { ...draft, seriesInvites: [...draft.seriesInvites, invited] },
    )
    setEmail('')
    setError(null)
  }

  function changeRole(guest: ListedGuest, nextRole: AssignableRole) {
    const update = (list: readonly Guest[]) =>
      list.map((other) =>
        other.email === guest.email ? { ...other, role: nextRole } : other,
      )
    switch (guest.tag) {
      case 'session':
        setDraft({ ...draft, added: update(draft.added) })
        break
      case 'joins-series':
        setDraft({ ...draft, seriesInvites: update(draft.seriesInvites) })
        break
      case 'series': {
        // Only store a role that differs from the series.
        const seriesRole = seriesGuests.find(
          (other) => other.email === guest.email,
        )?.role
        const { [guest.email]: _previous, ...rest } = draft.roles
        setDraft({
          ...draft,
          roles:
            seriesRole === nextRole
              ? rest
              : { ...rest, [guest.email]: nextRole },
        })
        break
      }
      default: {
        const unhandled: never = guest.tag
        throw new Error(`Unhandled guest tag: ${String(unhandled)}`)
      }
    }
  }

  function remove(guest: ListedGuest) {
    switch (guest.tag) {
      case 'session':
        setDraft({
          ...draft,
          added: draft.added.filter((other) => other.email !== guest.email),
        })
        break
      case 'joins-series':
        setDraft({
          ...draft,
          seriesInvites: draft.seriesInvites.filter(
            (other) => other.email !== guest.email,
          ),
        })
        break
      case 'series':
        setDraft({ ...draft, removed: [...draft.removed, guest.email] })
        break
      default: {
        const unhandled: never = guest.tag
        throw new Error(`Unhandled guest tag: ${String(unhandled)}`)
      }
    }
  }

  return (
    <SectionEditForm
      editScope="session"
      onCancel={onCancel}
      onSave={() => onSave(draft)}
    >
      <div className="grid gap-2">
        <Label htmlFor="session-invite-email">Invite people</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="session-invite-email"
            type="email"
            autoFocus
            placeholder="name@company.com"
            value={email}
            aria-invalid={error !== null}
            aria-describedby={error ? 'session-invite-error' : undefined}
            onChange={(event) => {
              setEmail(event.target.value)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                invite()
              }
            }}
          />
          <Select
            value={scope}
            onValueChange={(value) => {
              if (value === 'session' || value === 'series') setScope(value)
            }}
          >
            <SelectTrigger aria-label="Invite to" className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INVITE_SCOPES).map(([option, label]) => (
                <SelectItem key={option} value={option}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RoleSelect
            value={role}
            onChange={setRole}
            label="Role for the new invite"
            size="default"
            className="w-full sm:w-36"
          />
          <Button
            type="button"
            variant="outline"
            onClick={invite}
            disabled={email.trim() === ''}
          >
            <UserPlus />
            Invite
          </Button>
        </div>
        {error && (
          <p
            id="session-invite-error"
            className="text-xs text-destructive-foreground"
          >
            {error}
          </p>
        )}
      </div>

      <ul className="grid divide-y rounded-lg border">
        {listed.map((guest) => (
          <li key={guest.email} className="flex items-center gap-3 px-3 py-2.5">
            <GuestIdentity guest={guest} />
            <GuestTag guest={guest} />
            {guest.role !== 'host' && (
              <RoleSelect
                value={guest.role}
                label={`Role for ${guest.name}`}
                onChange={(nextRole) => changeRole(guest, nextRole)}
              />
            )}
            {guest.role === 'host' ? (
              <span className="w-8 shrink-0" aria-hidden />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  guest.tag === 'series'
                    ? `Leave ${guest.name} out of this session`
                    : `Remove ${guest.name}`
                }
                onClick={() => remove(guest)}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
        {removedGuests.map((guest) => (
          <li
            key={guest.email}
            className="flex items-center gap-3 bg-muted/40 px-3 py-2.5 text-muted-foreground"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm line-through">{guest.name}</p>
              <p className="text-xs">Left out of this session only</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft({
                  ...draft,
                  removed: draft.removed.filter(
                    (email) => email !== guest.email,
                  ),
                })
              }
            >
              <Undo2 />
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </SectionEditForm>
  )
}
