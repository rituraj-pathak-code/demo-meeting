import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  ListChecks,
  MapPin,
  PlayCircle,
  Sparkles,
  Users,
} from 'lucide-react'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  DayGroup,
  HostPrep,
  MeetingRole,
  PastMeeting,
  UpcomingMeeting,
} from '@/lib/demo-dashboard'
import { cn } from '@/lib/utils'

type MeetingsCardProps = {
  className?: string
  upcoming: readonly DayGroup<UpcomingMeeting>[]
  past: readonly DayGroup<PastMeeting>[]
}

function countMeetings(groups: readonly DayGroup<unknown>[]) {
  return groups.reduce((total, group) => total + group.meetings.length, 0)
}

function onlyHosted<T extends { role: MeetingRole }>(
  groups: readonly DayGroup<T>[],
): DayGroup<T>[] {
  return groups
    .map((group) => ({
      ...group,
      meetings: group.meetings.filter((meeting) => meeting.role === 'host'),
    }))
    .filter((group) => group.meetings.length > 0)
}

function missingChecks(prep: HostPrep) {
  return prep.checks.filter((check) => !check.ok)
}

function joinLabels(labels: readonly string[]) {
  return labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}

export function MeetingsCard({ className, upcoming, past }: MeetingsCardProps) {
  const [hostingOnly, setHostingOnly] = useState(false)

  const upcomingGroups = hostingOnly ? onlyHosted(upcoming) : upcoming
  const pastGroups = hostingOnly ? onlyHosted(past) : past

  const hosted = upcomingGroups
    .flatMap((group) => group.meetings)
    .filter((meeting) => meeting.prep !== null)
  const needsPrep = hosted.filter(
    (meeting) => meeting.prep && missingChecks(meeting.prep).length > 0,
  ).length

  return (
    <Card className={cn('gap-4', className)}>
      <Tabs defaultValue="upcoming" className="min-h-0 flex-1 gap-4">
        <CardHeader>
          <CardTitle>Meetings</CardTitle>
          <CardDescription>
            {hostingOnly
              ? `${hosted.length} coming up · ${
                  needsPrep > 0
                    ? `${needsPrep} need${needsPrep === 1 ? 's' : ''} prep`
                    : 'all ready'
                }`
              : 'Your schedule, and what already happened'}
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/meetings">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardAction>
          <div className="col-span-full mt-2 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {countMeetings(upcomingGroups)}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="past">
                Past
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {countMeetings(pastGroups)}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Switch
                id="meetings-hosting-only"
                checked={hostingOnly}
                onCheckedChange={setHostingOnly}
              />
              <Label
                htmlFor="meetings-hosting-only"
                className="text-sm font-normal"
              >
                I’m hosting
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-0">
          <TabsContent value="upcoming" className="flex min-h-0 flex-col">
            <GroupedList
              groups={upcomingGroups}
              renderMeeting={(meeting) =>
                hostingOnly && meeting.prep ? (
                  <HostedRow meeting={meeting} prep={meeting.prep} />
                ) : (
                  <UpcomingRow meeting={meeting} />
                )
              }
            />
          </TabsContent>
          <TabsContent value="past" className="flex min-h-0 flex-col">
            <GroupedList
              groups={pastGroups}
              renderMeeting={(meeting) => <PastRow meeting={meeting} />}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

function GroupedList<T extends { id: string }>({
  groups,
  renderMeeting,
}: {
  groups: readonly DayGroup<T>[]
  renderMeeting: (meeting: T) => ReactNode
}) {
  return (
    <ScrollArea className="min-h-[26rem] flex-1 basis-0">
      <div className="grid gap-4 px-6 pb-1">
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">
              {group.label}
            </h3>
            <ul className="-mx-2 grid">
              {group.meetings.map((meeting) => (
                <li key={meeting.id}>{renderMeeting(meeting)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ScrollArea>
  )
}

function RowTime({ time, duration }: { time: string; duration: string }) {
  return (
    <div className="w-[4.5rem] shrink-0 text-xs tabular-nums">
      <p className="font-medium">{time}</p>
      <p className="text-muted-foreground">{duration}</p>
    </div>
  )
}

const ROW_CLASS =
  'flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60'

function UpcomingRow({ meeting }: { meeting: UpcomingMeeting }) {
  if (!meeting.detailId) {
    return (
      <div className={ROW_CLASS}>
        <UpcomingRowContent meeting={meeting} />
      </div>
    )
  }
  return (
    <Link
      to="/meetings/$meetingId"
      params={{ meetingId: meeting.detailId }}
      className={`${ROW_CLASS} outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`}
    >
      <UpcomingRowContent meeting={meeting} />
    </Link>
  )
}

function UpcomingRowContent({ meeting }: { meeting: UpcomingMeeting }) {
  return (
    <>
      <RowTime time={meeting.time} duration={meeting.durationLabel} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{meeting.title}</p>
          {meeting.role === 'host' && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {meeting.prep && missingChecks(meeting.prep).length > 0 && (
                <span className="size-1.5 rounded-full bg-amber-500" />
              )}
              Host
            </Badge>
          )}
          {meeting.isExternal && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              External
            </Badge>
          )}
        </div>
        {meeting.location.kind === 'room' && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{meeting.location.label}</span>
          </p>
        )}
      </div>
      <div className="hidden sm:block">
        <AttendeeStack people={meeting.attendees} max={3} size="sm" />
      </div>
    </>
  )
}

function HostedRow({
  meeting,
  prep,
}: {
  meeting: UpcomingMeeting
  prep: HostPrep
}) {
  const missing = missingChecks(prep)
  const done = prep.checks.length - missing.length
  const isReady = missing.length === 0
  const pendingRsvp = prep.rsvp.total - prep.rsvp.accepted

  return (
    <div className="flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60">
      <RowTime time={meeting.time} duration={meeting.durationLabel} />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {meeting.detailId ? (
              <Link
                to="/meetings/$meetingId"
                params={{ meetingId: meeting.detailId }}
                className="underline-offset-4 hover:underline"
              >
                {meeting.title}
              </Link>
            ) : (
              meeting.title
            )}
          </p>
          {meeting.isExternal && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              External
            </Badge>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users className="size-3" />
            {prep.rsvp.accepted}/{prep.rsvp.total} accepted
            {pendingRsvp > 0 && ` · ${pendingRsvp} waiting`}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <ListChecks className="size-3" />
            {done}/{prep.checks.length} prep done
          </span>
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {prep.checks.map((check) => (
            <li
              key={check.label}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]',
                check.ok
                  ? 'text-muted-foreground'
                  : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              )}
            >
              {check.ok ? (
                <CircleCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CircleAlert className="size-3" />
              )}
              {check.label}
            </li>
          ))}
        </ul>
        {!isReady && meeting.detailId && missing[0] && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No {joinLabels(missing.map((check) => check.label.toLowerCase()))}{' '}
              yet
            </p>
            <Button variant="outline" size="xs" asChild>
              <Link
                to="/meetings/$meetingId"
                params={{ meetingId: meeting.detailId }}
                search={{ edit: missing[0].section }}
              >
                Add {missing[0].label.toLowerCase()}
              </Link>
            </Button>
          </div>
        )}
      </div>
      {isReady ? (
        <Badge
          variant="outline"
          className="shrink-0 text-emerald-700 dark:text-emerald-400"
        >
          <CircleCheck />
          Ready
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400"
        >
          Needs prep
        </Badge>
      )}
    </div>
  )
}

function PastRow({ meeting }: { meeting: PastMeeting }) {
  return (
    <div className={ROW_CLASS}>
      <RowTime time={meeting.time} duration={meeting.durationLabel} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{meeting.title}</p>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {meeting.attendeeCount}
          </span>
          {meeting.actionItems > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" />
              {meeting.actionItems} action{meeting.actionItems === 1 ? '' : 's'}
            </span>
          )}
          {meeting.role === 'host' && <span>You hosted</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {meeting.hasNotes && (
          <Button variant="ghost" size="xs" className="hidden sm:inline-flex">
            <Sparkles />
            Notes
          </Button>
        )}
        {meeting.recordingLength ? (
          <Button variant="outline" size="xs" className="tabular-nums">
            <PlayCircle />
            {meeting.recordingLength}
          </Button>
        ) : (
          <span className="px-2 text-xs text-muted-foreground">
            No recording
          </span>
        )}
      </div>
    </div>
  )
}
