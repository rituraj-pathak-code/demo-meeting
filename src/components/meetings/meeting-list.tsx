import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  Pencil,
  Repeat,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { SessionActionButton } from '@/components/meetings/session-action-button'
import { ShareMeetingButton } from '@/components/meetings/share-meeting-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NOW } from '@/lib/demo-meetings'
import type { Meeting } from '@/lib/demo-meetings'
import {
  formatLongDate,
  formatRelativeDay,
  formatShortDate,
  formatSlot,
} from '@/lib/meeting-time'
import {
  getEffectiveSession,
  getLastCompletedSession,
  getNextSession,
  getPastSessions,
  getSessionAction,
  isLiveSession,
} from '@/lib/sessions'
import { cn } from '@/lib/utils'

// Shared by the header and every row so columns line up.
const ROW_GRID =
  'md:grid md:grid-cols-[minmax(0,1fr)_11rem_7rem_16rem] md:items-center md:gap-6'

export const MEETING_TABS = ['upcoming', 'past', 'drafts', 'cancelled'] as const
export type MeetingTab = (typeof MEETING_TABS)[number]

const WHEN_HEADINGS: Record<MeetingTab, string> = {
  upcoming: 'Next session',
  past: 'Last session',
  drafts: 'Planned for',
  cancelled: 'Cancelled',
}

const EMPTY_MESSAGES: Record<MeetingTab, string> = {
  upcoming: 'No upcoming meetings match.',
  past: 'No past meetings match.',
  drafts: 'No drafts. Meetings you haven’t sent invites for show up here.',
  cancelled: 'Nothing cancelled.',
}

export type MeetingListActions = {
  onDeleteDraft: (meeting: Meeting) => void
  onRestore: (meeting: Meeting) => void
}

type MeetingListProps = MeetingListActions & {
  meetings: readonly Meeting[]
  tab: MeetingTab
}

/** Meetings as a list: what it is, when it runs, who's in it, and what to do. */
export function MeetingList({ meetings, tab, ...actions }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-16 text-center text-sm text-muted-foreground">
        {EMPTY_MESSAGES[tab]}
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div
        className={cn(
          ROW_GRID,
          'hidden border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid',
        )}
      >
        <span>Meeting</span>
        <span>{WHEN_HEADINGS[tab]}</span>
        <span>People</span>
        <span className="sr-only">Action</span>
      </div>
      <ul className="divide-y">
        {meetings.map((meeting) => (
          <MeetingRow
            key={meeting.id}
            meeting={meeting}
            tab={tab}
            {...actions}
          />
        ))}
      </ul>
    </div>
  )
}

type RowProps = MeetingListActions & { meeting: Meeting; tab: MeetingTab }

function MeetingRow({ meeting, tab, ...actions }: RowProps) {
  const next = tab === 'upcoming' ? getNextSession(meeting) : undefined
  const isLive = next ? isLiveSession(meeting, next) : false
  const isHost = meeting.role === 'host'
  const held = getPastSessions(meeting).filter(
    (session) => session.status === 'completed',
  ).length
  const isInactive = tab === 'drafts' || tab === 'cancelled'

  return (
    <li
      className={cn(
        ROW_GRID,
        'relative flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40',
        isLive && 'bg-red-500/4',
      )}
    >
      {/* Meeting */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: meeting.id }}
            className={cn(
              'truncate text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50 focus-visible:after:ring-inset',
              tab === 'cancelled' && 'text-muted-foreground line-through',
            )}
          >
            {meeting.details.title}
          </Link>
          {isLive && (
            <Badge className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
              <span className="size-1.5 rounded-full bg-red-500" />
              Live
            </Badge>
          )}
          {tab === 'drafts' && <Badge variant="secondary">Draft</Badge>}
          {isHost && <Badge variant="outline">Host</Badge>}
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {meeting.recurrence ? (
            <Repeat className="size-3 shrink-0" />
          ) : (
            <CalendarDays className="size-3 shrink-0" />
          )}
          <span className="truncate">
            {meeting.recurrence
              ? `${meeting.recurrence.label} · ${formatSlot(meeting.details.start)}${held > 0 && !isInactive ? ` · ${held} held` : ''}`
              : 'One-off'}
            {!isHost && ` · Hosted by ${meeting.host.name}`}
          </span>
        </p>
      </div>

      {/* When */}
      <div className="text-sm">
        <WhenCell meeting={meeting} tab={tab} />
      </div>

      {/* People */}
      <div className="hidden md:block">
        <AttendeeStack people={meeting.guests} max={3} size="sm" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 md:justify-self-end">
        <RowActions meeting={meeting} tab={tab} {...actions} />
      </div>
    </li>
  )
}

/** "today" / "yesterday" read naturally mid-sentence; dates keep their case. */
function formatEditedDay(date: Date) {
  const relative = formatRelativeDay(date, NOW)
  return relative === 'Today' || relative === 'Yesterday'
    ? relative.toLowerCase()
    : relative
}

function WhenCell({ meeting, tab }: { meeting: Meeting; tab: MeetingTab }) {
  const lines = (primary: ReactNode, secondary: ReactNode, tone?: string) => (
    <>
      <p className={cn('font-medium', tone)}>{primary}</p>
      <p className="text-xs text-muted-foreground">{secondary}</p>
    </>
  )

  switch (tab) {
    case 'upcoming': {
      const next = getNextSession(meeting)
      if (!next) return <p className="text-muted-foreground">—</p>
      const { time } = getEffectiveSession(meeting, next)
      if (isLiveSession(meeting, next)) {
        return lines(
          'Happening now',
          meeting.recurrence ? `Session ${next.number}` : 'Started',
          'text-red-600 dark:text-red-400',
        )
      }
      const action = getSessionAction(meeting, next)
      return lines(
        `${formatRelativeDay(time.date, NOW)}, ${formatSlot(time.start)}`,
        action.kind === 'join-waiting'
          ? 'Opens when host starts'
          : meeting.recurrence
            ? `Session ${next.number}`
            : formatLongDate(time.date),
      )
    }
    case 'past': {
      const last = getLastCompletedSession(meeting)
      if (!last) return <p className="text-muted-foreground">—</p>
      const { time } = getEffectiveSession(meeting, last)
      return lines(
        `${formatRelativeDay(time.date, NOW)}, ${formatSlot(time.start)}`,
        last.analytics
          ? `${last.analytics.joined} of ${last.analytics.invited} attended`
          : meeting.recurrence
            ? `Session ${last.number}`
            : 'Ended',
      )
    }
    case 'drafts': {
      const edited =
        meeting.lifecycle.status === 'draft'
          ? `Edited ${formatEditedDay(meeting.lifecycle.lastEditedAt)}`
          : 'Not sent'
      return lines(
        `${formatShortDate(meeting.details.date)}, ${formatSlot(meeting.details.start)}`,
        edited,
      )
    }
    case 'cancelled': {
      if (meeting.lifecycle.status !== 'cancelled') {
        return <p className="text-muted-foreground">—</p>
      }
      const { cancelledAt, cancelledBy, reason } = meeting.lifecycle
      const secondary = `by ${cancelledBy}${reason ? ` · ${reason}` : ''}`
      return (
        <>
          <p className="font-medium">{formatRelativeDay(cancelledAt, NOW)}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="relative z-10 truncate text-xs text-muted-foreground">
                {secondary}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{secondary}</TooltipContent>
          </Tooltip>
        </>
      )
    }
    default: {
      const unhandled: never = tab
      throw new Error(`Unhandled tab: ${String(unhandled)}`)
    }
  }
}

function RowActions({ meeting, tab, onDeleteDraft, onRestore }: RowProps) {
  const isHost = meeting.role === 'host'

  switch (tab) {
    case 'upcoming': {
      const next = getNextSession(meeting)
      if (!next) return null
      return (
        <>
          <ShareMeetingButton meeting={meeting} session={next} />
          <SessionActionButton
            meeting={meeting}
            session={next}
            showHint={false}
            className="flex-1 md:flex-none"
          />
        </>
      )
    }
    case 'past': {
      const last = getLastCompletedSession(meeting)
      return (
        <>
          <ShareMeetingButton meeting={meeting} session={last} />
          {last?.recap && (
            <Button
              variant="outline"
              asChild
              className="relative z-10 flex-1 md:flex-none"
            >
              <Link
                to="/meetings/$meetingId/sessions/$sessionId"
                params={{ meetingId: meeting.id, sessionId: last.id }}
                search={{ tab: 'recap' }}
              >
                <Sparkles />
                View recap
              </Link>
            </Button>
          )}
        </>
      )
    }
    case 'drafts':
      return (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 shrink-0 text-muted-foreground"
            aria-label={`Delete draft ${meeting.details.title}`}
            onClick={() => onDeleteDraft(meeting)}
          >
            <Trash2 />
          </Button>
          <Button
            variant="outline"
            asChild
            className="relative z-10 flex-1 md:flex-none"
          >
            <Link
              to="/meetings/$meetingId"
              params={{ meetingId: meeting.id }}
              search={{ tab: 'settings' }}
            >
              <Pencil />
              Continue editing
            </Link>
          </Button>
        </>
      )
    case 'cancelled':
      return isHost ? (
        <Button
          variant="outline"
          className="relative z-10 flex-1 md:flex-none"
          onClick={() => onRestore(meeting)}
        >
          <RotateCcw />
          Restore
        </Button>
      ) : null
    default: {
      const unhandled: never = tab
      throw new Error(`Unhandled tab: ${String(unhandled)}`)
    }
  }
}
