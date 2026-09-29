import { useState } from 'react'
import { Check, CircleCheck, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import type { Meeting, SectionId } from '@/lib/demo-meetings'
import { cn } from '@/lib/utils'

export type ChecklistItem = {
  id: string
  label: string
  done: boolean
  section: SectionId
  action: string
}

type ChecklistInput = {
  guestCount: number
  agendaCount: number
  materialCount: number
  description: string | null
}

/** Prep steps for a meeting or a session. `description: null` skips that step. */
export function getChecklist(input: ChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [
    {
      id: 'guests',
      label: 'Invite guests',
      done: input.guestCount > 1,
      section: 'people',
      action: 'Invite',
    },
    {
      id: 'agenda',
      label: 'Add an agenda',
      done: input.agendaCount > 0,
      section: 'agenda',
      action: 'Add',
    },
    {
      id: 'materials',
      label: 'Attach a pre-read',
      done: input.materialCount > 0,
      section: 'materials',
      action: 'Attach',
    },
  ]
  if (input.description !== null) {
    items.push({
      id: 'description',
      label: 'Write a description',
      done: input.description.trim() !== '',
      section: 'details',
      action: 'Write',
    })
  }
  return items
}

export function getMeetingChecklist(meeting: Meeting) {
  return getChecklist({
    guestCount: meeting.guests.length,
    agendaCount: meeting.agenda.length,
    materialCount: meeting.materials.length,
    description: meeting.details.description,
  })
}

export function SetupChecklistCard({
  items,
  title = 'Get this meeting ready',
  onOpenSection,
}: {
  items: readonly ChecklistItem[]
  title?: string
  onOpenSection: (section: SectionId) => void
}) {
  const done = items.filter((item) => item.done).length
  const isComplete = done === items.length

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{isComplete ? 'Ready to go' : title}</CardTitle>
        <CardDescription>
          {done} of {items.length} done
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Progress
          value={(done / items.length) * 100}
          aria-label="Meeting setup progress"
          className="h-1.5"
        />
        <ul className="grid">
          {items.map((item) => (
            <li key={item.id} className="flex min-h-10 items-center gap-3">
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  item.done &&
                    'border-primary bg-primary text-primary-foreground',
                )}
              >
                {item.done && <Check className="size-3" />}
              </span>
              <span
                className={cn(
                  'flex-1 text-sm',
                  item.done && 'text-muted-foreground line-through',
                )}
              >
                {item.label}
              </span>
              {!item.done && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onOpenSection(item.section)}
                >
                  {item.action}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function JoinInfoCard({ meeting }: { meeting: Meeting }) {
  const { copied, copy } = useCopyToClipboard()
  const passcode = meeting.access.passcode

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>How to join</CardTitle>
        <CardDescription>Shared in the calendar invite</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <dt className="text-xs text-muted-foreground">Meeting link</dt>
            <dd className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {meeting.link}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copied ? 'Link copied' : 'Copy meeting link'}
                onClick={() => void copy(meeting.link)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <dt className="text-xs text-muted-foreground">Meeting code</dt>
              <dd className="font-mono text-xs">{meeting.code}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-xs text-muted-foreground">Passcode</dt>
              <dd className="font-mono text-xs">{passcode ?? 'None'}</dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

const RSVP_OPTIONS = [
  { value: 'accepted', label: 'Yes' },
  { value: 'tentative', label: 'Maybe' },
  { value: 'declined', label: 'No' },
] as const
type RsvpChoice = (typeof RSVP_OPTIONS)[number]['value']

export function RsvpCard({ initial }: { initial: RsvpChoice | null }) {
  const [rsvp, setRsvp] = useState<RsvpChoice | null>(initial)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Going?</CardTitle>
        <CardDescription>
          {rsvp === 'accepted'
            ? 'You’re going. The host will see your reply.'
            : 'Let the host know if you can make it.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="group"
          aria-label="Your reply"
          className="grid grid-cols-3 gap-2"
        >
          {RSVP_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={rsvp === option.value ? 'default' : 'outline'}
              aria-pressed={rsvp === option.value}
              onClick={() => {
                setRsvp(option.value)
                toast.success(`Reply sent: ${option.label}`)
              }}
            >
              {rsvp === option.value && <CircleCheck />}
              {option.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
