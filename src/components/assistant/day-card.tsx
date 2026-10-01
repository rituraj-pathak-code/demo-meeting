import { Link } from '@tanstack/react-router'
import { Check, FileText, Video } from 'lucide-react'
import { toast } from 'sonner'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { Button } from '@/components/ui/button'
import { TODAY } from '@/lib/assistant/parse'
import type { DayItem } from '@/lib/assistant/day'
import { NOW } from '@/lib/demo-meetings'
import {
  formatDuration,
  formatLongDate,
  formatRelativeDay,
  formatSlot,
} from '@/lib/meeting-time'
import { cn } from '@/lib/utils'

const SOFT_CARD =
  'overflow-hidden rounded-2xl bg-card shadow-[0_8px_32px_-16px_rgb(0_0_0/0.18)] ring-1 ring-foreground/5 dark:bg-muted/30'

function minutesAwayLabel(minutes: number) {
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `in ${hours}h` : `in ${hours}h ${rest}m`
}

/** "Today's meetings" as the assistant shows them: a day at a glance. */
export function DayCard({
  date,
  items,
}: {
  date: Date
  items: readonly DayItem[]
}) {
  const isToday = date.getTime() === TODAY.getTime()
  const total = items.reduce((sum, item) => sum + item.end - item.start, 0)
  const nextId = isToday
    ? items.find((item) => item.status === 'upcoming')?.sessionId
    : undefined

  return (
    <article className={SOFT_CARD}>
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-5 pt-4 pb-3">
        <h4 className="text-sm font-semibold">
          {formatRelativeDay(date, NOW)}
        </h4>
        <span className="text-sm text-muted-foreground">
          {formatLongDate(date)}
        </span>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {items.length} meetings · {formatDuration(total)}
          </span>
        )}
      </header>

      {items.length > 0 && <DayTrack items={items} showNow={isToday} />}

      <ol className="grid gap-0.5 px-2 pb-2">
        {items.map((item) => (
          <DayRow
            key={item.sessionId}
            item={item}
            isNext={item.sessionId === nextId}
          />
        ))}
      </ol>
    </article>
  )
}

function DayTrack({
  items,
  showNow,
}: {
  items: readonly DayItem[]
  showNow: boolean
}) {
  // Whole hours from at least 8 AM to 7 PM, wider if meetings spill out.
  const from = Math.min(8 * 60, Math.floor(items[0]!.start / 60) * 60)
  const to = Math.max(
    19 * 60,
    Math.ceil(Math.max(...items.map((item) => item.end)) / 60) * 60,
  )
  const span = to - from
  const at = (minutes: number) => `${((minutes - from) / span) * 100}%`
  const now = NOW.getHours() * 60 + NOW.getMinutes()
  const ticks = [9, 12, 15, 18]
    .map((hour) => hour * 60)
    .filter((minutes) => minutes > from && minutes < to)

  return (
    <div className="px-5 pb-4" aria-hidden>
      <div className="relative h-2 rounded-full bg-muted">
        {items.map((item) => (
          <span
            key={item.sessionId}
            className={cn(
              'absolute inset-y-0 rounded-full',
              item.status === 'live'
                ? 'bg-primary'
                : item.status === 'upcoming'
                  ? 'bg-primary/35'
                  : 'bg-muted-foreground/30',
            )}
            style={{
              left: at(item.start),
              width: `calc(${at(item.end)} - ${at(item.start)} - 2px)`,
            }}
          />
        ))}
        {showNow && now > from && now < to && (
          <span
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
            style={{ left: at(now) }}
          />
        )}
      </div>
      <div className="relative mt-1.5 h-3 text-[0.65rem] text-muted-foreground">
        {ticks.map((minutes) => (
          <span
            key={minutes}
            className="absolute -translate-x-1/2 tabular-nums"
            style={{ left: at(minutes) }}
          >
            {formatSlot(minutes).replace(':00', '')}
          </span>
        ))}
      </div>
    </div>
  )
}

function DayRow({ item, isNext }: { item: DayItem; isNext: boolean }) {
  const live = item.status === 'live'
  const done = item.status === 'done'
  const isHost = item.role === 'host'

  return (
    <li
      className={cn(
        'flex items-center gap-4 rounded-xl px-3 py-3 transition-colors',
        live ? 'bg-primary/[0.07]' : 'hover:bg-muted/50',
      )}
    >
      <div className="w-16 shrink-0 text-right">
        <p
          className={cn(
            'text-sm font-medium tabular-nums',
            done && 'text-muted-foreground',
          )}
        >
          {formatSlot(item.start)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDuration(item.end - item.start)}
        </p>
      </div>

      <StatusDot status={item.status} />

      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: item.meetingId }}
            className={cn(
              'truncate text-sm font-medium underline-offset-4 hover:underline',
              done && 'text-muted-foreground',
            )}
          >
            {item.title}
          </Link>
          {live && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
              Live now
            </span>
          )}
          {isNext && item.minutesAway !== null && (
            <span className="shrink-0 text-xs font-medium text-primary">
              {minutesAwayLabel(item.minutesAway)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {item.guests.length > 0 && (
            <AttendeeStack people={item.guests} max={4} size="sm" />
          )}
          <span className="truncate">
            {isHost ? 'You’re hosting' : 'Attending'} · {item.location}
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <RowAction item={item} />
      </div>
    </li>
  )
}

function StatusDot({ status }: { status: DayItem['status'] }) {
  if (status === 'done') {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Check className="size-2.5" />
      </span>
    )
  }
  if (status === 'live') {
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <span className="absolute inline-flex size-3 animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
        <span className="relative size-2.5 rounded-full bg-primary" />
      </span>
    )
  }
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <span className="size-2.5 rounded-full border-2 border-primary/50" />
    </span>
  )
}

function RowAction({ item }: { item: DayItem }) {
  const isHost = item.role === 'host'

  if (item.status === 'done') {
    return item.hasRecap ? (
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
      >
        <Link
          to="/meetings/$meetingId/sessions/$sessionId"
          params={{ meetingId: item.meetingId, sessionId: item.sessionId }}
        >
          <FileText />
          Recap
        </Link>
      </Button>
    ) : (
      <span className="px-3 text-xs text-muted-foreground">Ended</span>
    )
  }

  // TODO: route to the meeting room once it exists.
  if (item.status === 'live') {
    return (
      <Button
        size="sm"
        className="shadow-sm"
        onClick={() =>
          toast.success(isHost ? 'Rejoining' : 'Joining', {
            description: item.title,
          })
        }
      >
        <Video />
        {isHost ? 'Rejoin' : 'Join now'}
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        isHost
          ? toast.success('Starting early', { description: item.title })
          : toast('Not started yet', {
              description: `You can join ${item.title} once the host starts it.`,
            })
      }
    >
      <Video />
      {isHost ? 'Start' : 'Join'}
    </Button>
  )
}
