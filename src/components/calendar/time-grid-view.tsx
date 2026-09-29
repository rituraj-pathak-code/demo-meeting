import { useEffect, useRef } from 'react'
import { format, isSameDay } from 'date-fns'

import {
  EventPopover,
  eventToneClassName,
  formatEventRange,
} from '@/components/calendar/calendar-event'
import type { CalendarEvent, PositionedEvent } from '@/lib/calendar'
import { getEventsOn, layoutDay } from '@/lib/calendar'
import { NOW } from '@/lib/demo-meetings'
import { formatSlot } from '@/lib/meeting-time'
import { cn } from '@/lib/utils'

const HOUR_HEIGHT = 56
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
/** Where the grid opens scrolled to, unless something earlier is on. */
const DEFAULT_SCROLL_HOUR = 8

const toPixels = (minutes: number) => (minutes / 60) * HOUR_HEIGHT

type TimeGridViewProps = {
  days: readonly Date[]
  events: readonly CalendarEvent[]
  onSelectDay: (day: Date) => void
}

/** Week and day views: days as columns, hours down the side. */
export function TimeGridView({ days, events, onSelectDay }: TimeGridViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const columns = days.map((day) => ({
    day,
    events: layoutDay(getEventsOn(events, day)),
  }))
  const earliest = Math.min(
    ...columns.flatMap((column) => column.events.map((event) => event.start)),
  )
  const scrollHour = Math.min(
    DEFAULT_SCROLL_HOUR,
    Number.isFinite(earliest) ? Math.floor(earliest / 60) : DEFAULT_SCROLL_HOUR,
  )
  const rangeKey = days[0]?.toDateString()

  // Bring working hours into view whenever the visible range changes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollHour * HOUR_HEIGHT })
  }, [rangeKey, scrollHour])

  const template = {
    gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`,
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div
        ref={scrollRef}
        className="max-h-[calc(100svh-18rem)] min-h-96 overflow-auto overscroll-contain"
      >
        <div className={cn(days.length > 1 && 'min-w-[44rem]')}>
          <div
            className="sticky top-0 z-30 grid border-b bg-background"
            style={template}
          >
            <span aria-hidden className="bg-muted/40" />
            {days.map((day) => (
              <DayHeading
                key={day.toISOString()}
                day={day}
                onSelectDay={days.length > 1 ? onSelectDay : undefined}
              />
            ))}
          </div>

          <div className="grid" style={template}>
            <HourLabels />
            {columns.map((column) => (
              <DayColumn
                key={column.day.toISOString()}
                day={column.day}
                events={column.events}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type DayHeadingProps = {
  day: Date
  onSelectDay?: (day: Date) => void
}

function DayHeading({ day, onSelectDay }: DayHeadingProps) {
  const isToday = isSameDay(day, NOW)
  const content = (
    <>
      <span className="text-xs text-muted-foreground uppercase">
        {format(day, 'EEE')}
      </span>
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-lg font-semibold tabular-nums',
          isToday && 'bg-primary text-primary-foreground',
        )}
      >
        {format(day, 'd')}
      </span>
    </>
  )

  const className =
    'flex flex-col items-center gap-0.5 border-l bg-muted/40 py-2'

  if (!onSelectDay) return <div className={className}>{content}</div>

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day)}
      aria-label={`View ${format(day, 'EEEE, MMMM d')}`}
      className={cn(
        className,
        'outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
      )}
    >
      {content}
    </button>
  )
}

function HourLabels() {
  return (
    <div aria-hidden className="relative">
      {HOURS.map((hour) => (
        <div
          key={hour}
          style={{ height: HOUR_HEIGHT }}
          className="relative pr-2 text-right"
        >
          {hour > 0 && (
            <span className="absolute -top-2 right-2 text-[0.6875rem] text-muted-foreground tabular-nums">
              {formatSlot(hour * 60).replace(':00', '')}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

type DayColumnProps = {
  day: Date
  events: readonly PositionedEvent[]
}

function DayColumn({ day, events }: DayColumnProps) {
  const isToday = isSameDay(day, NOW)
  const nowMinutes = NOW.getHours() * 60 + NOW.getMinutes()

  return (
    <div
      role="group"
      aria-label={format(day, 'EEEE, MMMM d')}
      className={cn('relative border-l', isToday && 'bg-primary/2')}
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          style={{ height: HOUR_HEIGHT }}
          className="border-b border-dashed border-border/70 last:border-b-0"
        />
      ))}

      {events.map((event) => (
        <TimedEvent key={event.key} event={event} />
      ))}

      {isToday && (
        <div
          aria-hidden
          style={{ top: toPixels(nowMinutes) }}
          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
        >
          <span className="-ml-1 size-2 rounded-full bg-red-500" />
          <span className="h-px flex-1 bg-red-500" />
        </div>
      )}
    </div>
  )
}

function TimedEvent({ event }: { event: PositionedEvent }) {
  const duration = event.end - event.start
  const isShort = duration < 45
  const width = 100 / event.lanes

  return (
    <EventPopover event={event}>
      <button
        type="button"
        style={{
          top: toPixels(event.start),
          height: Math.max(toPixels(duration), 20) - 2,
          left: `calc(${event.lane * width}% + 2px)`,
          width: `calc(${width}% - 4px)`,
        }}
        className={cn(
          'absolute z-10 flex min-w-0 overflow-hidden rounded-md px-2 text-left text-xs outline-none focus-visible:z-30 focus-visible:ring-[3px] focus-visible:ring-ring/50',
          isShort ? 'items-center gap-1.5 py-0.5' : 'flex-col gap-0.5 py-1',
          eventToneClassName(event),
        )}
      >
        <span className="truncate font-medium">
          {event.meeting.details.title}
        </span>
        <span className="truncate text-muted-foreground tabular-nums">
          {isShort ? formatSlot(event.start) : formatEventRange(event)}
        </span>
      </button>
    </EventPopover>
  )
}
