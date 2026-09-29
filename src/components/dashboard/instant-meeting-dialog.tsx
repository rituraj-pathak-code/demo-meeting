import { Check, Copy, Video } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { INSTANT_MEETING_LINK } from '@/lib/demo-dashboard'

const ROOM_OPTIONS = [
  {
    id: 'instant-record',
    label: 'Record automatically',
    description: 'Starts recording when the first guest joins',
    defaultChecked: true,
  },
  {
    id: 'instant-notes',
    label: 'AI notes & summary',
    description: 'Shared with attendees when the meeting ends',
    defaultChecked: true,
  },
  {
    id: 'instant-lobby',
    label: 'Waiting room',
    description: 'You admit guests from outside your workspace',
    defaultChecked: false,
  },
] as const

type InstantMeetingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstantMeetingDialog({
  open,
  onOpenChange,
}: InstantMeetingDialogProps) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your meeting room is ready</DialogTitle>
          <DialogDescription>
            Share this link with the people you want to meet with. It stays
            active for 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="instant-link">Meeting link</Label>
          <div className="flex gap-2">
            <Input
              id="instant-link"
              readOnly
              value={INSTANT_MEETING_LINK}
              className="font-mono text-xs"
              onFocus={(event) => event.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={copied ? 'Link copied' : 'Copy link'}
              onClick={() => void copy(INSTANT_MEETING_LINK)}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>

        <div className="divide-y rounded-lg border">
          {ROOM_OPTIONS.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between gap-4 px-3 py-2.5"
            >
              <div className="grid gap-0.5">
                <Label htmlFor={option.id}>{option.label}</Label>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <Switch id={option.id} defaultChecked={option.defaultChecked} />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copy(INSTANT_MEETING_LINK)}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy invite'}
          </Button>
          {/* TODO: route to the meeting room once it exists. */}
          <Button type="button">
            <Video />
            Join now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
