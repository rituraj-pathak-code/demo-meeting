import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import type { Meeting, Session } from '@/lib/demo-meetings'
import {
  getEffectiveSession,
  isLiveSession,
  isPastSession,
} from '@/lib/sessions'

export const CALENDAR_VIEWS = ['month', 'week', 'day'] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

export function isCalendarView(value: unknown): value is CalendarView {
  return CALENDAR_VIEWS.some((view) => view === value)
}

// ---------------------------------------------------------------------------
// Visible range

/** The days a view shows. Month pads out to whole weeks. */
export function getVisibleDays(view: CalendarView, anchor: Date) {
  switch (view) {
    case 'month':
      return eachDayOfInterval({
        start: startOfWeek(startOfMonth(anchor)),
        end: endOfWeek(endOfMonth(anchor)),
      })
    case 'week':
      return eachDayOfInterval({
        start: startOfWeek(anchor),
        end: endOfWeek(anchor),
      })
    case 'day':
      return [anchor]
    default: {
      const unhandled: never = view
      throw new Error(`Unhandled calendar view: ${String(unhandled)}`)
    }
  }
}

/** Moves the anchor one view-length forward (1) or back (-1). */
export function shiftAnchor(view: CalendarView, anchor: Date, step: 1 | -1) {
  switch (view) {
    case 'month':
      return addMonths(anchor, step)
    case 'week':
      return addWeeks(anchor, step)
    case 'day':
      return addDays(anchor, step)
    default: {
      const unhandled: never = view
      throw new Error(`Unhandled calendar view: ${String(unhandled)}`)
    }
  }
}

export function formatRangeTitle(view: CalendarView, anchor: Date) {
  if (view === 'month') return format(anchor, 'MMMM yyyy')
  if (view === 'day') return format(anchor, 'EEEE, MMMM d')

  const start = startOfWeek(anchor)
  const end = endOfWeek(anchor)
  if (isSameMonth(start, end)) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
  }
  if (isSameYear(start, end)) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

// ---------------------------------------------------------------------------
// Events

export type EventStatus = 'live' | 'upcoming' | 'completed' | 'cancelled'

/** One session placed on the calendar, using its own time if it was moved. */
export type CalendarEvent = {
  key: string
  meeting: Meeting
  session: Session
  date: Date
  /** Minutes since midnight. */
  start: number
  end: number
  status: EventStatus
}

function getEventStatus(meeting: Meeting, session: Session): EventStatus {
  if (session.status === 'cancelled') return 'cancelled'
  if (isLiveSession(meeting, session)) return 'live'
  return isPastSession(session) ? 'completed' : 'upcoming'
}

/** Every session of active meetings, ordered by start time. */
export function buildEvents(meetings: readonly Meeting[]): CalendarEvent[] {
  return meetings
    .filter((meeting) => meeting.lifecycle.status === 'active')
    .flatMap((meeting) =>
      meeting.sessions.map((session): CalendarEvent => {
        const { time } = getEffectiveSession(meeting, session)
        return {
          key: `${meeting.id}-${session.id}`,
          meeting,
          session,
          date: time.date,
          start: time.start,
          end: time.end,
          status: getEventStatus(meeting, session),
        }
      }),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.start - b.start)
}

export function getEventsOn(events: readonly CalendarEvent[], day: Date) {
  return events.filter((event) => isSameDay(event.date, day))
}

export type PositionedEvent = CalendarEvent & {
  /** Column within its overlap group, and how many columns that group has. */
  lane: number
  lanes: number
}

/**
 * Lays out one day's events side by side where they overlap. Events that
 * touch (one ends as the next starts) share a column.
 */
export function layoutDay(events: readonly CalendarEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end)
  const result: PositionedEvent[] = []
  let group: PositionedEvent[] = []
  let laneEnds: number[] = []
  let groupEnd = -1

  const closeGroup = () => {
    for (const event of group) event.lanes = laneEnds.length
    result.push(...group)
    group = []
    laneEnds = []
  }

  for (const event of sorted) {
    if (event.start >= groupEnd) closeGroup()
    const free = laneEnds.findIndex((end) => end <= event.start)
    const lane = free === -1 ? laneEnds.length : free
    laneEnds[lane] = event.end
    group.push({ ...event, lane, lanes: 1 })
    groupEnd = Math.max(groupEnd, event.end)
  }
  closeGroup()

  return result
}
