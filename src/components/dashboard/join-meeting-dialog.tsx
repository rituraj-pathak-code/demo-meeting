import { useState } from 'react'
import type { FormEvent } from 'react'

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

// Accepts a bare code ("abc-defg-hij") or a full link that ends with one.
const MEETING_CODE = /([a-z]{3}-[a-z]{4}-[a-z]{3})\/?$/i

type JoinMeetingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinMeetingDialog({
  open,
  onOpenChange,
}: JoinMeetingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Content unmounts on close, so the form starts fresh every time. */}
        <JoinMeetingForm onJoined={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function JoinMeetingForm({ onJoined }: { onJoined: () => void }) {
  const [value, setValue] = useState('')
  const [showError, setShowError] = useState(false)

  const code = MEETING_CODE.exec(value.trim())?.[1]?.toLowerCase()
  const isInvalid = showError && !code

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code) {
      setShowError(true)
      return
    }
    // TODO: route to the meeting room once it exists.
    onJoined()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>Join a meeting</DialogTitle>
        <DialogDescription>
          Enter the meeting code or paste the link your host shared.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="meeting-code">Meeting code or link</Label>
        <Input
          id="meeting-code"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="abc-defg-hij"
          value={value}
          aria-invalid={isInvalid}
          aria-describedby="meeting-code-hint"
          onChange={(event) => setValue(event.target.value)}
        />
        <p
          id="meeting-code-hint"
          className={
            isInvalid
              ? 'text-xs text-destructive-foreground'
              : 'text-xs text-muted-foreground'
          }
        >
          {isInvalid
            ? 'That doesn’t look like a meeting code. Codes look like abc-defg-hij.'
            : 'You’ll get a chance to check your camera and mic before joining.'}
        </p>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={value.trim() === ''}>
          Join
        </Button>
      </DialogFooter>
    </form>
  )
}
