import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, MapPin, Repeat, Users, Video } from 'lucide-react'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { SessionActionButton } from '@/components/meetings/session-action-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import type { CalendarEvent, EventStatus } from '@/lib/calendar'
import { NOW } from '@/lib/demo-meetings'
import { formatLongDate, formatSlot } from '@/lib/meeting-time'
import { getEffectiveSession } from '@/lib/sessions'
import { cn } from '@/lib/utils'

/** Hosting and attending get distinct accents; state dims or strikes through. */
export function eventToneClassName(event: CalendarEvent) {
  return cn(
    'border-l-2',
    event.meeting.role === 'host'
      ? 'border-l-primary bg-primary/10 hover:bg-primary/15'
      : 'border-l-chart-2 bg-chart-2/15 hover:bg-chart-2/25',
    event.status === 'live' &&
      'border-l-red-500 bg-red-500/10 hover:bg-red-500/15',
    event.status === 'completed' && 'opacity-60',
    event.status === 'cancelled' &&
      'border-l-muted-foreground/40 bg-muted text-muted-foreground line-through opacity-70 hover:bg-muted',
  )
}

export function formatEventRange(event: CalendarEvent) {
  return `${formatSlot(event.start)} – ${formatSlot(event.end)}`
}

const STATUS_BADGES: Record<EventStatus, ReactNode> = {
  live: (
    <Badge className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
      Live now
    </Badge>
  ),
  upcoming: null,
  completed: <Badge variant="secondary">Completed</Badge>,
  cancelled: <Badge variant="outline">Cancelled</Badge>,
}

type EventPopoverProps = {
  event: CalendarEvent
  /** The chip or block that opens the details. */
  children: ReactNode
}

/** Session details on click, with a way into the session and to join it. */
export function EventPopover({ event, children }: EventPopoverProps) {
  const { meeting, session } = event
  const { guests } = getEffectiveSession(meeting, session)
  const canEnter =
    (event.status === 'live' || event.status === 'upcoming') &&
    event.date.toDateString() === NOW.toDateString()
  const LocationIcon = meeting.details.location.kind === 'video' ? Video : MapPin

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_BADGES[event.status]}
              <Badge variant="outline">
                {meeting.role === 'host' ? 'Hosting' : 'Attending'}
              </Badge>
            </div>
            <h3
              className={cn(
                'leading-snug font-semibold',
                event.status === 'cancelled' && 'line-through',
              )}
            >
              {meeting.details.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatLongDate(event.date)} · {formatEventRange(event)}
            </p>
          </div>

          <ul className="grid gap-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <LocationIcon className="size-4 shrink-0" />
              {meeting.details.location.label}
            </li>
            {meeting.recurrence && (
              <li className="flex items-center gap-2">
                <Repeat className="size-4 shrink-0" />
                Session {session.number} · {meeting.recurrence.label}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Users className="size-4 shrink-0" />
              {guests.length} invited · hosted by {meeting.host.name}
            </li>
          </ul>

          {guests.length > 0 && (
            <AttendeeStack people={guests} max={6} size="sm" />
          )}

          <Separator />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/meetings/$meetingId/sessions/$sessionId"
                params={{ meetingId: meeting.id, sessionId: session.id }}
              >
                {event.status === 'completed' ? 'View recap' : 'Open session'}
                <ArrowRight />
              </Link>
            </Button>
            {canEnter && (
              <SessionActionButton
                meeting={meeting}
                session={session}
                showHint={false}
              />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
