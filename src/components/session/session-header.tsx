import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

import { ShareMeetingButton } from '@/components/meetings/share-meeting-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NOW } from '@/lib/demo-meetings'
import type { Meeting, Session, SessionTime } from '@/lib/demo-meetings'
import {
  formatLongDate,
  formatRelativeDay,
  formatSlot,
} from '@/lib/meeting-time'

type SessionHeaderProps = {
  meeting: Meeting
  session: Session
  time: SessionTime
  primaryAction: ReactNode
}

const STATUS: Record<
  Session['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  upcoming: { label: 'Upcoming', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export function SessionHeader({
  meeting,
  session,
  time,
  primaryAction,
}: SessionHeaderProps) {
  const index = meeting.sessions.findIndex((other) => other.id === session.id)
  const previous = meeting.sessions[index - 1]
  const next = meeting.sessions[index + 1]
  const relative = formatRelativeDay(time.date, NOW)

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2.5 min-w-0 text-muted-foreground"
        >
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: meeting.id }}
            search={{ tab: 'sessions' }}
          >
            <ArrowLeft />
            <span className="truncate">{meeting.details.title}</span>
          </Link>
        </Button>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            asChild={previous !== undefined}
            disabled={previous === undefined}
            aria-label="Previous session"
          >
            {previous ? (
              <Link
                to="/meetings/$meetingId/sessions/$sessionId"
                params={{ meetingId: meeting.id, sessionId: previous.id }}
              >
                <ChevronLeft />
              </Link>
            ) : (
              <ChevronLeft />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            asChild={next !== undefined}
            disabled={next === undefined}
            aria-label="Next session"
          >
            {next ? (
              <Link
                to="/meetings/$meetingId/sessions/$sessionId"
                params={{ meetingId: meeting.id, sessionId: next.id }}
              >
                <ChevronRight />
              </Link>
            ) : (
              <ChevronRight />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Session {session.number}</Badge>
            <Badge variant={STATUS[session.status].variant}>
              {STATUS[session.status].label}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {meeting.details.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {relative === 'Today' ||
            relative === 'Tomorrow' ||
            relative === 'Yesterday'
              ? `${relative}, ${formatLongDate(time.date)}`
              : formatLongDate(time.date)}{' '}
            · {formatSlot(time.start)} – {formatSlot(time.end)} ·{' '}
            {meeting.details.location.label}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {session.status !== 'cancelled' && (
            <ShareMeetingButton
              meeting={meeting}
              session={session}
              size="default"
            />
          )}
          {primaryAction}
        </div>
      </div>
    </div>
  )
}
