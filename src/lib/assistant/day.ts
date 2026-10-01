import { NOW, listMeetings } from '@/lib/demo-meetings'
import type { Guest, Meeting } from '@/lib/demo-meetings'
import {
  getEffectiveSession,
  getSessionWindow,
  isLiveSession,
} from '@/lib/sessions'

// A day of meetings as the assistant reads it from the real meeting data,
// so "live" means a session is actually in progress right now.

export type DayStatus = 'done' | 'live' | 'upcoming'

export type DayItem = {
  meetingId: string
  sessionId: string
  title: string
  start: number
  end: number
  role: Meeting['role']
  status: DayStatus
  /** Minutes until it starts; only for upcoming sessions. */
  minutesAway: number | null
  location: string
  guests: readonly Guest[]
  hasRecap: boolean
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function getDaySchedule(date: Date): DayItem[] {
  return listMeetings()
    .filter((meeting) => meeting.lifecycle.status === 'active')
    .flatMap((meeting) =>
      meeting.sessions
        .filter((session) => session.status !== 'cancelled')
        .map((session) => {
          const effective = getEffectiveSession(meeting, session)
          return { meeting, session, effective }
        })
        .filter(({ effective }) => sameDay(effective.time.date, date))
        .map(({ meeting, session, effective }): DayItem => {
          const { startsAt } = getSessionWindow(meeting, session)
          const status: DayStatus = isLiveSession(meeting, session)
            ? 'live'
            : session.status === 'completed' || startsAt < NOW.getTime()
              ? 'done'
              : 'upcoming'
          return {
            meetingId: meeting.id,
            sessionId: session.id,
            title: meeting.details.title,
            start: effective.time.start,
            end: effective.time.end,
            role: meeting.role,
            status,
            minutesAway:
              status === 'upcoming'
                ? Math.round((startsAt - NOW.getTime()) / 60_000)
                : null,
            location: meeting.details.location.label,
            guests: effective.guests.filter(
              (guest) => guest.rsvp !== 'declined',
            ),
            hasRecap: session.recap !== null,
          }
        }),
    )
    .sort((a, b) => a.start - b.start)
}
