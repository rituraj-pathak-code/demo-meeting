import { format, isSameDay, isSameMonth } from 'date-fns'

import {
  EventPopover,
  eventToneClassName,
} from '@/components/calendar/calendar-event'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { CalendarEvent } from '@/lib/calendar'
import { getEventsOn } from '@/lib/calendar'
import { NOW } from '@/lib/demo-meetings'
import { formatSlot } from '@/lib/meeting-time'
import { cn } from '@/lib/utils'

const MAX_VISIBLE = 3

type MonthViewProps = {
  anchor: Date
  days: readonly Date[]
  events: readonly CalendarEvent[]
  onSelectDay: (day: Date) => void
}

export function MonthView({ anchor, days, events, onSelectDay }: MonthViewProps) {
  const weekdays = days.slice(0, 7)

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {weekdays.map((day) => (
          <div
            key={day.toISOString()}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            <abbr title={format(day, 'EEEE')} className="no-underline">
              <span className="sm:hidden">{format(day, 'EEEEE')}</span>
              <span className="hidden sm:inline">{format(day, 'EEE')}</span>
            </abbr>
          </div>
        ))}
      </div>
      <div className="grid auto-rows-fr grid-cols-7 [&>*:nth-child(7n)]:border-r-0 [&>*:nth-last-child(-n+7)]:border-b-0">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, anchor)}
            events={getEventsOn(events, day)}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </div>
  )
}

type DayCellProps = {
  day: Date
  inMonth: boolean
  events: readonly CalendarEvent[]
  onSelectDay: (day: Date) => void
}

function DayCell({ day, inMonth, events, onSelectDay }: DayCellProps) {
  const isToday = isSameDay(day, NOW)
  const visible = events.slice(0, MAX_VISIBLE)
  const hidden = events.length - visible.length

  return (
    <div
      className={cn(
        'flex min-h-20 min-w-0 flex-col gap-1 border-r border-b p-1 sm:min-h-28 sm:p-1.5',
        !inMonth && 'bg-muted/30',
      )}
    >
      <button
        type="button"
        onClick={() => onSelectDay(day)}
        aria-label={`${format(day, 'EEEE, MMMM d')}, ${events.length} sessions`}
        className={cn(
          'flex size-7 items-center justify-center self-center rounded-full text-xs tabular-nums outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:self-start',
          !inMonth && 'text-muted-foreground',
          isToday &&
            'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
        )}
      >
        {format(day, 'd')}
      </button>

      {/* Phones: a dot per session; tap the date to see the day. */}
      {events.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5 sm:hidden">
          {events.slice(0, 4).map((event) => (
            <span
              key={event.key}
              className={cn(
                'size-1.5 rounded-full',
                event.meeting.role === 'host' ? 'bg-primary' : 'bg-chart-2',
                event.status === 'cancelled' && 'bg-muted-foreground/40',
              )}
            />
          ))}
        </div>
      )}

      <ul className="hidden min-w-0 flex-col gap-0.5 sm:flex">
        {visible.map((event) => (
          <li key={event.key} className="min-w-0">
            <EventChip event={event} />
          </li>
        ))}
        {hidden > 0 && (
          <li>
            <Popover>
              <PopoverTrigger className="w-full rounded-sm px-1.5 py-0.5 text-left text-xs font-medium text-muted-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50">
                +{hidden} more
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <p className="px-1.5 pb-2 text-sm font-medium">
                  {format(day, 'EEEE, MMMM d')}
                </p>
                <ul className="grid gap-0.5">
                  {events.map((event) => (
                    <li key={event.key}>
                      <EventChip event={event} />
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </li>
        )}
      </ul>
    </div>
  )
}

function EventChip({ event }: { event: CalendarEvent }) {
  return (
    <EventPopover event={event}>
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-left text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          eventToneClassName(event),
        )}
      >
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {formatSlot(event.start).replace(':00', '')}
        </span>
        <span className="truncate font-medium">
          {event.meeting.details.title}
        </span>
      </button>
    </EventPopover>
  )
}
