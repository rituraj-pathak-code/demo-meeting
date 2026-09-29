import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  RotateCcw,
  Sparkles,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { InviteDialog } from '@/components/meeting/invite-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NOW } from '@/lib/demo-meetings'
import type { Meeting, Session } from '@/lib/demo-meetings'
import {
  formatRelativeDay,
  formatShortDate,
  formatSlot,
} from '@/lib/meeting-time'
import {
  getEffectiveSession,
  getNextSession,
  getPastSessions,
  getUpcomingSessions,
  inviteGuest,
  isPastSession,
  setSessionStatus,
} from '@/lib/sessions'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

type SessionsListProps = {
  meeting: Meeting
  onChange: (update: (meeting: Meeting) => Meeting) => void
}

export function SessionsList({ meeting, onChange }: SessionsListProps) {
  const upcoming = getUpcomingSessions(meeting)
  const past = getPastSessions(meeting)
  const [visible, setVisible] = useState({
    upcoming: PAGE_SIZE,
    past: PAGE_SIZE,
  })
  const [inviteTo, setInviteTo] = useState<Session | null>(null)

  const inviteTarget = inviteTo ? getEffectiveSession(meeting, inviteTo) : null

  return (
    <Card className="gap-4">
      <Tabs defaultValue="upcoming" className="gap-4">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Open a session to prepare it, change it on its own, or see what
            happened.
          </CardDescription>
          <TabsList className="col-span-full mt-2">
            <TabsTrigger value="upcoming">
              Upcoming
              <Badge variant="secondary" className="px-1.5 tabular-nums">
                {upcoming.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past">
              Past
              <Badge variant="secondary" className="px-1.5 tabular-nums">
                {past.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          {(['upcoming', 'past'] as const).map((tab) => {
            const sessions = tab === 'upcoming' ? upcoming : past
            const shown = sessions.slice(0, visible[tab])
            return (
              <TabsContent key={tab} value={tab} className="grid gap-2">
                {sessions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {tab === 'upcoming'
                      ? 'No upcoming sessions.'
                      : 'No sessions have happened yet.'}
                  </p>
                ) : (
                  <ul className="-mx-2 grid">
                    {shown.map((session) => (
                      <SessionRow
                        key={session.id}
                        meeting={meeting}
                        session={session}
                        onInvite={() => setInviteTo(session)}
                        onChange={onChange}
                      />
                    ))}
                  </ul>
                )}
                {sessions.length > shown.length && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-self-center"
                    onClick={() =>
                      setVisible((current) => ({
                        ...current,
                        [tab]: current[tab] + PAGE_SIZE,
                      }))
                    }
                  >
                    Show {Math.min(PAGE_SIZE, sessions.length - shown.length)}{' '}
                    more
                  </Button>
                )}
              </TabsContent>
            )
          })}
        </CardContent>
      </Tabs>

      {inviteTo && inviteTarget && (
        <InviteDialog
          open
          onOpenChange={(open) => {
            if (!open) setInviteTo(null)
          }}
          sessionLabel={`Session ${inviteTo.number} · ${formatShortDate(inviteTarget.time.date)}, ${formatSlot(inviteTarget.time.start)}`}
          invited={inviteTarget.guests}
          onInvite={(guest, scope) => {
            onChange((current) =>
              inviteGuest(current, inviteTo.id, guest, scope),
            )
            toast.success(`Invited ${guest.name}`, {
              description:
                scope === 'session'
                  ? `To session ${inviteTo.number} only`
                  : 'To this and all future sessions',
            })
          }}
        />
      )}
    </Card>
  )
}

function SessionRow({
  meeting,
  session,
  onInvite,
  onChange,
}: {
  meeting: Meeting
  session: Session
  onInvite: () => void
  onChange: SessionsListProps['onChange']
}) {
  const effective = getEffectiveSession(meeting, session)
  const { date, start, end } = effective.time
  const isHost = meeting.role === 'host'
  const isNext = getNextSession(meeting)?.id === session.id
  const isCancelled = session.status === 'cancelled'
  const isPast = isPastSession(session)
  const addedCount = session.addedGuests.length
  const removedCount = session.removedGuests.length

  return (
    <li className="relative flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      <div
        className={cn(
          'flex w-12 shrink-0 flex-col items-center rounded-md border py-1 leading-none',
          isNext && 'border-primary/40 bg-primary/5',
          isCancelled && 'opacity-50',
        )}
        aria-hidden
      >
        <span className="text-[0.65rem] font-medium text-muted-foreground uppercase">
          {monthFormatter.format(date)}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {date.getDate()}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">
          {weekdayFormatter.format(date)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to="/meetings/$meetingId/sessions/$sessionId"
            params={{ meetingId: meeting.id, sessionId: session.id }}
            className={cn(
              'text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50',
              isCancelled && 'text-muted-foreground line-through',
            )}
          >
            Session {session.number}
            <span className="sr-only">, {formatRelativeDay(date, NOW)}</span>
          </Link>
          {isNext && <Badge>Next</Badge>}
          {isCancelled && <Badge variant="outline">Cancelled</Badge>}
          {effective.changed.has('time') && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              Rescheduled
            </Badge>
          )}
          {effective.changed.has('agenda') && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              Custom agenda
            </Badge>
          )}
          {effective.changed.has('materials') && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              Custom files
            </Badge>
          )}
          {addedCount > 0 && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              +{addedCount} guest{addedCount === 1 ? '' : 's'}
            </Badge>
          )}
          {removedCount > 0 && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              −{removedCount} guest{removedCount === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatRelativeDay(date, NOW)} · {formatSlot(start)} –{' '}
          {formatSlot(end)}
          {session.analytics
            ? ` · ${session.analytics.joined} of ${session.analytics.invited} attended · ${session.analytics.actualMinutes} min`
            : !isCancelled
              ? ` · ${effective.guests.length} invited`
              : ''}
        </p>
      </div>

      {isPast && session.recap && (
        <div className="relative z-10 hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="xs" asChild>
            <Link
              to="/meetings/$meetingId/sessions/$sessionId"
              params={{ meetingId: meeting.id, sessionId: session.id }}
              search={{ tab: 'recap' }}
            >
              <Sparkles />
              Recap
            </Link>
          </Button>
          {session.recap.recordingLength && (
            <Button variant="ghost" size="xs" className="tabular-nums">
              <PlayCircle />
              {session.recap.recordingLength}
            </Button>
          )}
        </div>
      )}

      {isHost && !isPast && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative z-10"
              aria-label={`Actions for session ${session.number}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {!isCancelled && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    to="/meetings/$meetingId/sessions/$sessionId"
                    params={{ meetingId: meeting.id, sessionId: session.id }}
                    search={{ edit: 'agenda' }}
                  >
                    <Pencil />
                    Edit this session
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/meetings/$meetingId/sessions/$sessionId"
                    params={{ meetingId: meeting.id, sessionId: session.id }}
                    search={{ edit: 'time' }}
                  >
                    <CalendarClock />
                    Reschedule
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onInvite}>
                  <UserPlus />
                  Invite to this session
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {isCancelled ? (
              <DropdownMenuItem
                onSelect={() => {
                  onChange((current) =>
                    setSessionStatus(current, session.id, 'upcoming'),
                  )
                  toast.success(`Session ${session.number} restored`)
                }}
              >
                <RotateCcw />
                Restore session
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  onChange((current) =>
                    setSessionStatus(current, session.id, 'cancelled'),
                  )
                  toast.success(`Session ${session.number} cancelled`, {
                    description:
                      'Guests will get a cancellation. The rest of the series is unchanged.',
                  })
                }}
              >
                <XCircle />
                Cancel this session
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
}
