import { useState } from 'react'
import { BellRing, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  EditableSection,
  SectionEditForm,
} from '@/components/meeting/editable-section'
import type {
  EditScope,
  SectionProps,
} from '@/components/meeting/editable-section'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoleSelect } from '@/components/meeting/role-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Guest } from '@/lib/demo-meetings'
import { parseInvitee } from '@/lib/guests'
import { roleBadge } from '@/lib/roles'
import type { AssignableRole } from '@/lib/roles'
import type { SaveScope } from '@/lib/sessions'
import { cn, getInitials } from '@/lib/utils'

export const RSVP_TEXT: Record<Guest['rsvp'], string> = {
  accepted: 'Going',
  tentative: 'Maybe',
  pending: 'No reply yet',
  declined: 'Not going',
}

export function GuestIdentity({ guest }: { guest: Guest }) {
  return (
    <>
      <Avatar>
        <AvatarFallback className="bg-secondary text-xs font-medium">
          {getInitials(guest.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{guest.name}</p>
          {roleBadge(guest.role) && (
            <Badge variant="outline" className="shrink-0">
              {roleBadge(guest.role)}
            </Badge>
          )}
          {guest.isExternal && (
            <Badge variant="secondary" className="shrink-0">
              External
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{guest.email}</p>
      </div>
    </>
  )
}

export function PeopleSection({
  value,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: SectionProps<readonly Guest[]>) {
  const counts = {
    accepted: value.filter((guest) => guest.rsvp === 'accepted').length,
    tentative: value.filter((guest) => guest.rsvp === 'tentative').length,
    pending: value.filter((guest) => guest.rsvp === 'pending').length,
  }
  const summary = [
    `${counts.accepted} going`,
    counts.tentative > 0 && `${counts.tentative} maybe`,
    counts.pending > 0 && `${counts.pending} no reply`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <EditableSection
      id="people"
      title={`People · ${value.length}`}
      description={summary}
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
      action={
        canEdit &&
        counts.pending > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.success(`Reminder sent to ${counts.pending} guests`)
            }
          >
            <BellRing />
            Nudge
          </Button>
        )
      }
    >
      {isEditing ? (
        <PeopleForm
          initial={value}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {value.map((guest) => (
            <li key={guest.email} className="flex items-center gap-3 py-2">
              <GuestIdentity guest={guest} />
              <span
                className={cn(
                  'shrink-0 text-xs',
                  guest.rsvp === 'accepted'
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {RSVP_TEXT[guest.rsvp]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </EditableSection>
  )
}

function PeopleForm({
  initial,
  editScope,
  onCancel,
  onSave,
}: {
  initial: readonly Guest[]
  editScope: EditScope
  onCancel: () => void
  onSave: (value: readonly Guest[], scope: SaveScope) => void
}) {
  const [guests, setGuests] = useState(initial)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AssignableRole>('participant')
  const [error, setError] = useState<string | null>(null)

  function invite() {
    const result = parseInvitee(email, guests)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setGuests([...guests, { ...result.guest, role }])
    setEmail('')
    setError(null)
  }

  return (
    <SectionEditForm
      editScope={editScope}
      onCancel={onCancel}
      onSave={(scope) => onSave(guests, scope)}
    >
      <div className="grid gap-2">
        <Label htmlFor="invite-email">Invite people</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="invite-email"
            type="email"
            autoFocus
            placeholder="name@company.com"
            value={email}
            aria-invalid={error !== null}
            aria-describedby={error ? 'invite-error' : undefined}
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
          <p id="invite-error" className="text-xs text-destructive-foreground">
            {error}
          </p>
        )}
      </div>

      <ul className="grid divide-y rounded-lg border">
        {guests.map((guest) => (
          <li key={guest.email} className="flex items-center gap-3 px-3 py-2.5">
            <GuestIdentity guest={guest} />
            {guest.role === 'host' ? (
              // Same width as the role select + remove button beside other guests.
              <span className="w-43 shrink-0 pl-3 text-xs text-muted-foreground">
                Organizer
              </span>
            ) : (
              <>
                <RoleSelect
                  value={guest.role}
                  label={`Role for ${guest.name}`}
                  onChange={(nextRole) =>
                    setGuests(
                      guests.map((other) =>
                        other.email === guest.email
                          ? { ...other, role: nextRole }
                          : other,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${guest.name}`}
                  onClick={() =>
                    setGuests(
                      guests.filter((other) => other.email !== guest.email),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </SectionEditForm>
  )
}
