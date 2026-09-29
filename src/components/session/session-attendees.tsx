import { useState } from 'react'
import { CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  Guest,
  SessionAnalytics,
  SessionAttendee,
} from '@/lib/demo-meetings'
import { roleBadge } from '@/lib/roles'
import { cn, getInitials } from '@/lib/utils'

type InvitedGuest = Guest & { source: 'series' | 'session' }

type Row =
  | { kind: 'attended'; guest: InvitedGuest; attendance: SessionAttendee }
  | { kind: 'absent'; guest: InvitedGuest }
  | { kind: 'uninvited'; attendance: SessionAttendee }

const FILTERS = ['all', 'attended', 'absent', 'uninvited'] as const
type Filter = (typeof FILTERS)[number]

function isFilter(value: string): value is Filter {
  return FILTERS.some((filter) => filter === value)
}

function buildRows(
  invited: readonly InvitedGuest[],
  analytics: SessionAnalytics,
): Row[] {
  const byEmail = new Map(
    analytics.attendees.map((attendee) => [attendee.email, attendee]),
  )
  const invitedRows = invited.map((guest): Row => {
    const attendance = byEmail.get(guest.email)
    return attendance
      ? { kind: 'attended', guest, attendance }
      : { kind: 'absent', guest }
  })
  const uninvitedRows = analytics.attendees
    .filter((attendee) => !attendee.invited)
    .map((attendance): Row => ({ kind: 'uninvited', attendance }))
  // Attended first, then walk-ins, then people who didn't join.
  const order: Record<Row['kind'], number> = {
    attended: 0,
    uninvited: 1,
    absent: 2,
  }
  return [...invitedRows, ...uninvitedRows].sort(
    (a, b) => order[a.kind] - order[b.kind],
  )
}

export function SessionAttendees({
  invited,
  analytics,
}: {
  invited: readonly InvitedGuest[]
  analytics: SessionAnalytics
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const rows = buildRows(invited, analytics)
  const counts: Record<Filter, number> = {
    all: rows.length,
    attended: rows.filter((row) => row.kind === 'attended').length,
    absent: rows.filter((row) => row.kind === 'absent').length,
    uninvited: rows.filter((row) => row.kind === 'uninvited').length,
  }
  const shown =
    filter === 'all' ? rows : rows.filter((row) => row.kind === filter)
  const labels: Record<Filter, string> = {
    all: 'Everyone',
    attended: 'Attended',
    absent: 'Didn’t join',
    uninvited: 'Not invited',
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Attendees</CardTitle>
        <CardDescription>
          {counts.attended} of {invited.length} invited attended
          {counts.uninvited > 0 &&
            ` · ${counts.uninvited} joined without an invite`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Tabs
          value={filter}
          onValueChange={(value) => {
            if (isFilter(value)) setFilter(value)
          }}
        >
          <TabsList className="h-auto flex-wrap">
            {FILTERS.filter(
              (option) => option !== 'uninvited' || counts.uninvited > 0,
            ).map((option) => (
              <TabsTrigger key={option} value={option}>
                {labels[option]}
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {counts[option]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ul className="grid divide-y overflow-hidden rounded-lg border">
          {shown.map((row) => (
            <AttendeeRow
              key={
                row.kind === 'uninvited'
                  ? row.attendance.email
                  : row.guest.email
              }
              row={row}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function AttendeeRow({ row }: { row: Row }) {
  const name = row.kind === 'uninvited' ? row.attendance.name : row.guest.name
  const email =
    row.kind === 'uninvited' ? row.attendance.email : row.guest.email
  const badge = row.kind === 'uninvited' ? null : roleBadge(row.guest.role)
  const attendance = row.kind === 'absent' ? null : row.attendance

  return (
    <li
      className={cn(
        'flex items-center gap-3 border-l-[3px] px-3 py-2.5',
        row.kind === 'attended' && 'border-l-primary bg-primary/[0.04]',
        row.kind === 'uninvited' && 'border-l-amber-500 bg-amber-500/[0.06]',
        row.kind === 'absent' && 'border-l-transparent',
      )}
    >
      <Avatar className={cn(row.kind === 'absent' && 'opacity-50')}>
        <AvatarFallback className="bg-secondary text-xs font-medium">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'min-w-0 flex-1',
          row.kind === 'absent' && 'text-muted-foreground',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {badge && (
            <Badge variant="outline" className="shrink-0">
              {badge}
            </Badge>
          )}
          {row.kind !== 'uninvited' && row.guest.source === 'session' && (
            <Badge
              variant="outline"
              className="shrink-0 border-primary/30 text-primary"
            >
              This session only
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        {row.kind === 'attended' && (
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            <CircleCheck />
            Attended
          </Badge>
        )}
        {row.kind === 'uninvited' && (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-700 dark:text-amber-400"
          >
            <TriangleAlert />
            Not invited
          </Badge>
        )}
        {row.kind === 'absent' && (
          <Badge variant="outline" className="text-muted-foreground">
            <CircleDashed />
            Didn’t join
          </Badge>
        )}
        {attendance && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Joined {attendance.joinedAt} · {attendance.minutes} min
            {attendance.leftEarly && ' · left early'}
          </p>
        )}
      </div>
    </li>
  )
}
