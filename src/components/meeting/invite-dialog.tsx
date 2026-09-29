import { useState } from 'react'
import type { FormEvent } from 'react'
import { UserPlus } from 'lucide-react'

import { RoleSelect } from '@/components/meeting/role-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

export const INVITE_SCOPES: Record<InviteScope, string> = {
  session: 'Only this session',
  series: 'This and all future sessions',
}

function isInviteScope(value: string): value is InviteScope {
  return value in INVITE_SCOPES
}

type InviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** e.g. "Session 20 · Tue, Oct 13" */
  sessionLabel: string
  invited: readonly { email: string }[]
  onInvite: (guest: Guest, scope: InviteScope) => void
}

export function InviteDialog({
  open,
  onOpenChange,
  ...formProps
}: InviteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Content unmounts on close, so the form starts fresh every time. */}
        <InviteForm {...formProps} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function InviteForm({
  sessionLabel,
  invited,
  onInvite,
  onDone,
}: Omit<InviteDialogProps, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [scope, setScope] = useState<InviteScope>('session')
  const [role, setRole] = useState<AssignableRole>('participant')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseInvitee(email, invited)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onInvite({ ...result.guest, role }, scope)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>Invite to this session</DialogTitle>
        <DialogDescription>{sessionLabel}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="invite-dialog-email">Email</Label>
          <Input
            id="invite-dialog-email"
            type="email"
            autoFocus
            placeholder="name@company.com"
            value={email}
            aria-invalid={error !== null}
            aria-describedby={error ? 'invite-dialog-error' : undefined}
            onChange={(event) => {
              setEmail(event.target.value)
              setError(null)
            }}
          />
          {error && (
            <p
              id="invite-dialog-error"
              className="text-xs text-destructive-foreground"
            >
              {error}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-dialog-role">Role</Label>
          <RoleSelect
            id="invite-dialog-role"
            value={role}
            onChange={setRole}
            label="Role"
            size="default"
            className="w-full"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-dialog-scope">Invite to</Label>
          <Select
            value={scope}
            onValueChange={(value) => {
              if (isInviteScope(value)) setScope(value)
            }}
          >
            <SelectTrigger id="invite-dialog-scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INVITE_SCOPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {scope === 'session'
              ? 'They get an invite for this date only.'
              : 'They join the series and get every upcoming session.'}
          </p>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={email.trim() === ''}>
          <UserPlus />
          Send invite
        </Button>
      </DialogFooter>
    </form>
  )
}
