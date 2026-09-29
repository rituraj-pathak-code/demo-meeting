import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleAlert } from 'lucide-react'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { SessionActionButton } from '@/components/meetings/session-action-button'
import { ShareMeetingButton } from '@/components/meetings/share-meeting-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { NOW } from '@/lib/demo-meetings'
import { formatSlot } from '@/lib/meeting-time'
import { getEffectiveSession, getSessionWindow } from '@/lib/sessions'
import type { SessionEntry } from '@/lib/sessions'

const MINUTE = 60_000

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

type NowAndNextProps = {
  live: readonly SessionEntry[]
  next: SessionEntry | undefined
}

/** Live sessions and the next one, as one list. */
export function NowAndNext({ live, next }: NowAndNextProps) {
  if (live.length === 0 && !next) return null

  return (
    <section aria-labelledby="now-and-next" className="grid grid-cols-1 gap-3">
      <h2 id="now-and-next" className="text-lg font-semibold tracking-tight">
        Now & next
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border">
        {live.map((entry) => (
          <LiveRow
            key={`${entry.meeting.id}-${entry.session.id}`}
            entry={entry}
          />
        ))}
        {next && <UpNextRow entry={next} />}
      </ul>
    </section>
  )
}

function RowTitle({ entry }: { entry: SessionEntry }) {
  return (
    <Link
      to="/meetings/$meetingId/sessions/$sessionId"
      params={{ meetingId: entry.meeting.id, sessionId: entry.session.id }}
      className="truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
    >
      {entry.meeting.details.title}
    </Link>
  )
}

function sessionLabel(entry: SessionEntry) {
  const { time } = getEffectiveSession(entry.meeting, entry.session)
  const range = `${formatSlot(time.start)} – ${formatSlot(time.end)}`
  return entry.meeting.recurrence
    ? `Session ${entry.session.number} · ${range}`
    : range
}

function LiveRow({ entry }: { entry: SessionEntry }) {
  const { meeting, session } = entry
  const { startsAt, endsAt } = getSessionWindow(meeting, session)
  const elapsed = Math.round((NOW.getTime() - startsAt) / MINUTE)
  const remaining = Math.round((endsAt - NOW.getTime()) / MINUTE)
  const inCall = getEffectiveSession(meeting, session).guests.filter(
    (guest) => guest.rsvp === 'accepted',
  )

  return (
    <li className="relative flex flex-col gap-3 bg-red-500/4 px-4 py-4 md:flex-row md:items-center md:gap-6">
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
            </span>
            Live now
          </Badge>
          <RowTitle entry={entry} />
        </div>
        <p className="text-xs text-muted-foreground">
          {sessionLabel(entry)} · started {formatMinutes(elapsed)} ago ·{' '}
          {formatMinutes(remaining)} left
        </p>
        <Progress
          value={(elapsed / (elapsed + remaining)) * 100}
          aria-label="Time elapsed"
          className="h-1 max-w-md bg-red-500/15 *:bg-red-500"
        />
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        <AttendeeStack people={inCall} max={4} size="sm" />
        <span className="text-xs text-muted-foreground">
          {inCall.length} in call
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ShareMeetingButton meeting={meeting} session={session} />
        <SessionActionButton
          meeting={meeting}
          session={session}
          showHint={false}
        />
      </div>
    </li>
  )
}

function UpNextRow({ entry }: { entry: SessionEntry }) {
  const { meeting, session } = entry
  const effective = getEffectiveSession(meeting, session)
  const { startsAt } = getSessionWindow(meeting, session)
  const minutesUntil = Math.round((startsAt - NOW.getTime()) / MINUTE)
  const isHost = meeting.role === 'host'
  const needsAgenda = isHost && effective.agenda.length === 0

  return (
    <li className="relative flex flex-col gap-3 bg-primary/3 px-4 py-4 md:flex-row md:items-center md:gap-6">
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            Up next ·{' '}
            {minutesUntil < 24 * 60
              ? `in ${formatMinutes(minutesUntil)}`
              : 'later this week'}
          </Badge>
          <RowTitle entry={entry} />
          {isHost && <Badge variant="outline">Host</Badge>}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{sessionLabel(entry)}</span>
          <span aria-hidden>·</span>
          <span>{effective.guests.length} invited</span>
          <span aria-hidden>·</span>
          {needsAgenda ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
              <CircleAlert className="size-3" />
              No agenda yet
            </span>
          ) : (
            <span>{effective.agenda.length} agenda topics</span>
          )}
        </p>
      </div>
      <div className="hidden lg:block">
        <AttendeeStack people={effective.guests} max={4} size="sm" />
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-1">
        <ShareMeetingButton meeting={meeting} session={session} />
        <Button variant="ghost" asChild>
          <Link
            to="/meetings/$meetingId/sessions/$sessionId"
            params={{ meetingId: meeting.id, sessionId: session.id }}
          >
            {isHost ? 'Prepare' : 'Details'}
            <ArrowRight />
          </Link>
        </Button>
        <SessionActionButton
          meeting={meeting}
          session={session}
          showHint={false}
        />
      </div>
    </li>
  )
}
