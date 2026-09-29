import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  PlayCircle,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { InviteDialog } from '@/components/meeting/invite-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { NOW } from '@/lib/demo-meetings'
import type { Meeting } from '@/lib/demo-meetings'
import {
  formatRelativeDay,
  formatShortDate,
  formatSlot,
} from '@/lib/meeting-time'
import { roleBadge } from '@/lib/roles'
import {
  getAttendanceByPerson,
  getDecisionLog,
  getEffectiveSession,
  getLastCompletedSession,
  getNextSession,
  getOpenActionItems,
  getSeriesStats,
  inviteGuest,
  setActionItemDone,
} from '@/lib/sessions'

type OverviewTabProps = {
  meeting: Meeting
  onChange: (update: (meeting: Meeting) => Meeting) => void
}

export function OverviewTab({ meeting, onChange }: OverviewTabProps) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 gap-4">
        <NextSessionCard meeting={meeting} onChange={onChange} />
        <LastSessionCard meeting={meeting} />
        <DecisionLogCard meeting={meeting} />
      </div>
      <div className="grid min-w-0 gap-4">
        <OpenActionItemsCard meeting={meeting} onChange={onChange} />
        <SeriesStatsCard meeting={meeting} />
        <AttendanceByPersonCard meeting={meeting} />
      </div>
    </div>
  )
}

function SessionLink({
  meeting,
  sessionId,
  children,
}: {
  meeting: Meeting
  sessionId: string
  children: React.ReactNode
}) {
  return (
    <Link
      to="/meetings/$meetingId/sessions/$sessionId"
      params={{ meetingId: meeting.id, sessionId }}
      className="underline-offset-4 hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  )
}

function NextSessionCard({ meeting, onChange }: OverviewTabProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const next = getNextSession(meeting)

  if (!next) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No upcoming sessions</CardTitle>
          <CardDescription>
            This series has no sessions scheduled.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const effective = getEffectiveSession(meeting, next)
  const carried = getOpenActionItems(meeting, next.number)
  const { date, start, end } = effective.time
  const isHost = meeting.role === 'host'

  return (
    <Card className="gap-5 bg-linear-to-br from-primary/[0.07] via-card to-card">
      <CardHeader>
        <CardDescription className="font-medium text-primary">
          Next session · Session {next.number}
        </CardDescription>
        <CardTitle className="text-xl">
          {formatRelativeDay(date, NOW)}, {formatSlot(start)} –{' '}
          {formatSlot(end)}
        </CardTitle>
        {effective.changed.size > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className="border-primary/30 text-primary">
              Changed for this session
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <dt className="text-xs text-muted-foreground">Agenda</dt>
            <dd className="text-sm">
              {effective.agenda.length === 0
                ? 'No agenda yet'
                : `${effective.agenda.length} topics · ${effective.changed.has('agenda') ? 'custom for this session' : 'series agenda'}`}
            </dd>
          </div>
          <div className="grid gap-1.5">
            <dt className="text-xs text-muted-foreground">
              {effective.guests.length} invited
            </dt>
            <dd>
              <AttendeeStack people={effective.guests} max={5} size="sm" />
            </dd>
          </div>
          <div className="grid gap-1.5">
            <dt className="text-xs text-muted-foreground">
              From earlier sessions
            </dt>
            <dd className="text-sm">
              {carried.length === 0
                ? 'Nothing carried over'
                : `${carried.length} open follow-up${carried.length === 1 ? '' : 's'}`}
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap gap-2 border-t pt-5 [.border-t]:pt-5">
        <Button asChild>
          <Link
            to="/meetings/$meetingId/sessions/$sessionId"
            params={{ meetingId: meeting.id, sessionId: next.id }}
          >
            {isHost ? 'Prepare session' : 'View session'}
            <ArrowRight />
          </Link>
        </Button>
        {isHost && (
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus />
            Invite to this session
          </Button>
        )}
      </CardFooter>
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        sessionLabel={`Session ${next.number} · ${formatShortDate(date)}, ${formatSlot(start)}`}
        invited={effective.guests}
        onInvite={(guest, scope) => {
          onChange((current) => inviteGuest(current, next.id, guest, scope))
          toast.success(`Invited ${guest.name}`, {
            description:
              scope === 'session'
                ? `To session ${next.number} only`
                : 'To this and all future sessions',
          })
        }}
      />
    </Card>
  )
}

function LastSessionCard({ meeting }: { meeting: Meeting }) {
  const last = getLastCompletedSession(meeting)
  if (!last?.recap) return null
  const { recap, analytics } = last

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Last time</CardTitle>
        <CardDescription>
          Session {last.number} · {formatRelativeDay(last.date, NOW)}
          {analytics &&
            ` · ${analytics.joined} of ${analytics.invited} attended`}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/meetings/$meetingId/sessions/$sessionId"
              params={{ meetingId: meeting.id, sessionId: last.id }}
              search={{ tab: 'recap' }}
            >
              Full recap
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm leading-relaxed">{recap.summary}</p>
        {recap.decisions.length > 0 && (
          <ul className="grid gap-1.5 text-sm">
            {recap.decisions.map((decision) => (
              <li key={decision} className="flex gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                {decision}
              </li>
            ))}
          </ul>
        )}
        {recap.recordingLength && (
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start tabular-nums"
          >
            <PlayCircle />
            Watch recording · {recap.recordingLength}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

const DECISIONS_SHOWN = 6

function DecisionLogCard({ meeting }: { meeting: Meeting }) {
  const [showAll, setShowAll] = useState(false)
  const log = getDecisionLog(meeting)
  if (log.length === 0) return null
  const shown = showAll ? log : log.slice(0, DECISIONS_SHOWN)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Decision log</CardTitle>
        <CardDescription>
          {log.length} decisions across this series, newest first
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative grid gap-4 border-l pl-5">
          {shown.map(({ decision, session }) => (
            <li key={`${session.id}-${decision}`} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[1.5625rem] size-2 rounded-full bg-primary ring-4 ring-card"
              />
              <p className="text-sm">{decision}</p>
              <p className="text-xs text-muted-foreground">
                <SessionLink meeting={meeting} sessionId={session.id}>
                  Session {session.number} · {formatShortDate(session.date)}
                </SessionLink>
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
      {log.length > DECISIONS_SHOWN && (
        <CardFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show fewer' : `Show all ${log.length}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function OpenActionItemsCard({ meeting, onChange }: OverviewTabProps) {
  const items = getOpenActionItems(meeting)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Open follow-ups</CardTitle>
        <CardDescription>
          {items.length === 0
            ? 'Everything from earlier sessions is done'
            : 'Carried into the next session until they’re done'}
        </CardDescription>
      </CardHeader>
      {items.length > 0 && (
        <CardContent>
          <ul className="-mx-2 grid">
            {items.map((item) => {
              const id = `followup-${item.id}`
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                >
                  <Checkbox
                    id={id}
                    className="mt-0.5"
                    onCheckedChange={() => {
                      onChange((current) =>
                        setActionItemDone(
                          current,
                          item.session.id,
                          item.id,
                          true,
                        ),
                      )
                      toast.success('Marked as done', {
                        description: item.title,
                      })
                    }}
                  />
                  <div className="grid min-w-0 gap-0.5">
                    <Label htmlFor={id} className="leading-5 font-normal">
                      {item.title}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {item.owner} · from{' '}
                      <SessionLink
                        meeting={meeting}
                        sessionId={item.session.id}
                      >
                        session {item.session.number}
                      </SessionLink>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}

const chartConfig = {
  rate: { label: 'Attendance', color: 'var(--primary)' },
} satisfies ChartConfig

function SeriesStatsCard({ meeting }: { meeting: Meeting }) {
  const stats = getSeriesStats(meeting)
  if (stats.held === 0) return null

  const tiles = [
    {
      label: 'Sessions held',
      value: String(stats.held),
      hint:
        stats.cancelled > 0 ? `${stats.cancelled} cancelled` : 'None cancelled',
    },
    {
      label: 'Avg attendance',
      value: `${stats.attendanceRate}%`,
      hint: 'of people invited',
    },
    {
      label: 'Avg length',
      value: `${stats.averageMinutes} min`,
      hint: `${meeting.details.end - meeting.details.start} min scheduled`,
    },
    {
      label: 'Follow-ups done',
      value: `${stats.actionItemsDone}%`,
      hint: 'across all sessions',
    },
  ]

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Series at a glance</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{tile.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {tile.value}
              </dd>
              <dd className="text-xs text-muted-foreground">{tile.hint}</dd>
            </div>
          ))}
        </dl>
        {stats.attendanceTrend.length > 1 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Attendance, last {stats.attendanceTrend.length} sessions
            </p>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-32 w-full"
            >
              <BarChart
                accessibilityLayer
                data={stats.attendanceTrend}
                margin={{ top: 4, right: 0, left: -24, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="session"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  fontSize={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                  fontSize={10}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const session = payload[0]?.payload?.session
                        return typeof session === 'string'
                          ? `Session ${session.slice(1)}`
                          : null
                      }}
                      formatter={(value) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Attendance
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {Number(value)}%
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="rate"
                  fill="var(--color-rate)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AttendanceByPersonCard({ meeting }: { meeting: Meeting }) {
  const { people, walkIns } = getAttendanceByPerson(meeting)
  if (people.every((person) => person.invitedTo === 0)) return null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Attendance by person</CardTitle>
        <CardDescription>
          Across the sessions each person was invited to
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid gap-3">
          {people.map(({ guest, attended, invitedTo }) => {
            const rate =
              invitedTo === 0 ? 0 : Math.round((attended / invitedTo) * 100)
            const badge = roleBadge(guest.role)
            return (
              <li key={guest.email} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{guest.name}</span>
                    {badge && (
                      <Badge variant="outline" className="shrink-0">
                        {badge}
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {attended} of {invitedTo}
                  </span>
                </div>
                <Progress
                  value={rate}
                  aria-label={`${guest.name} attended ${attended} of ${invitedTo} sessions`}
                  className="h-1.5"
                />
              </li>
            )
          })}
        </ul>
        {walkIns.length > 0 && (
          <div className="grid gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-3.5" />
              Joined without an invite
            </p>
            <ul className="grid gap-1 text-sm">
              {walkIns.map((person) => (
                <li key={person.email} className="flex justify-between gap-3">
                  <span className="truncate">{person.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {person.sessions} session{person.sessions === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
