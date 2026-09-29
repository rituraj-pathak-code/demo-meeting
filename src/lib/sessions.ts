import type {
  AccessSettings,
  AgendaItem,
  LiveStreamSettings,
  RecordingSettings,
  Guest,
  Material,
  Meeting,
  RecapActionItem,
  Session,
  SessionOverrides,
  SessionTime,
} from '@/lib/demo-meetings'
import { NOW } from '@/lib/demo-meetings'

export type OverridableKey = keyof SessionOverrides

/** What a session actually looks like: series defaults plus its own changes. */
export type EffectiveSession = {
  session: Session
  agenda: readonly AgendaItem[]
  materials: readonly Material[]
  description: string
  time: SessionTime
  access: AccessSettings
  recording: RecordingSettings
  liveStream: LiveStreamSettings
  guests: readonly (Guest & { source: 'series' | 'session' })[]
  changed: ReadonlySet<OverridableKey | 'guests'>
}

export function getEffectiveSession(
  meeting: Meeting,
  session: Session,
): EffectiveSession {
  const { overrides } = session
  const roles = overrides.roles ?? {}
  const changed = new Set<OverridableKey | 'guests'>(
    (Object.keys(overrides) as OverridableKey[]).filter(
      (key) => overrides[key] !== undefined && key !== 'roles',
    ),
  )
  if (
    session.addedGuests.length > 0 ||
    session.removedGuests.length > 0 ||
    Object.keys(roles).length > 0
  ) {
    changed.add('guests')
  }

  return {
    session,
    agenda: overrides.agenda ?? meeting.agenda,
    materials: overrides.materials ?? meeting.materials,
    description: overrides.description ?? meeting.details.description,
    time: overrides.time ?? {
      date: session.date,
      start: session.start,
      end: session.end,
    },
    access: overrides.access ?? meeting.access,
    recording: overrides.recording ?? meeting.recording,
    liveStream: overrides.liveStream ?? meeting.liveStream,
    guests: [
      ...meeting.guests
        .filter((guest) => !session.removedGuests.includes(guest.email))
        .map((guest) => ({
          ...guest,
          role:
            guest.role === 'host'
              ? guest.role
              : (roles[guest.email] ?? guest.role),
          source: 'series' as const,
        })),
      ...session.addedGuests.map((guest) => ({
        ...guest,
        source: 'session' as const,
      })),
    ],
    changed,
  }
}

export type SaveScope = 'this' | 'following'

/** Settings that exist on the series and can be overridden per session. */
export type SeriesField =
  'agenda' | 'materials' | 'access' | 'recording' | 'liveStream'

function replaceSession(
  meeting: Meeting,
  sessionId: string,
  update: (session: Session) => Session,
): Meeting {
  return {
    ...meeting,
    sessions: meeting.sessions.map((session) =>
      session.id === sessionId ? update(session) : session,
    ),
  }
}

/**
 * Saves an agenda or file list from a session page. "This session" stores an
 * override; "this and following" becomes the new series default, and earlier
 * upcoming sessions keep the old value as their own override.
 */
export function saveSessionField<K extends SeriesField>(
  meeting: Meeting,
  sessionId: string,
  key: K,
  value: Meeting[K],
  scope: SaveScope,
): Meeting {
  if (scope === 'this') {
    return replaceSession(meeting, sessionId, (session) => ({
      ...session,
      overrides: { ...session.overrides, [key]: value },
    }))
  }

  const target = meeting.sessions.find((session) => session.id === sessionId)
  if (!target) return meeting
  const previous = meeting[key]

  return {
    ...meeting,
    [key]: value,
    sessions: meeting.sessions.map((session) => {
      if (session.status !== 'upcoming') return session
      if (session.number < target.number) {
        return session.overrides[key] !== undefined
          ? session
          : { ...session, overrides: { ...session.overrides, [key]: previous } }
      }
      const { [key]: _dropped, ...rest } = session.overrides
      return { ...session, overrides: rest }
    }),
  }
}

export function saveSessionOverride<K extends OverridableKey>(
  meeting: Meeting,
  sessionId: string,
  key: K,
  value: SessionOverrides[K],
): Meeting {
  return replaceSession(meeting, sessionId, (session) => ({
    ...session,
    overrides: { ...session.overrides, [key]: value },
  }))
}

export function resetSessionOverride(
  meeting: Meeting,
  sessionId: string,
  key: OverridableKey | 'guests',
): Meeting {
  return replaceSession(meeting, sessionId, (session) => {
    if (key === 'guests') {
      const { roles: _roles, ...rest } = session.overrides
      return { ...session, addedGuests: [], removedGuests: [], overrides: rest }
    }
    const { [key]: _dropped, ...rest } = session.overrides
    return { ...session, overrides: rest }
  })
}

export type InviteScope = 'session' | 'series'

/** Invites someone to one session, or to the series (all future sessions). */
export function inviteGuest(
  meeting: Meeting,
  sessionId: string,
  guest: Guest,
  scope: InviteScope,
): Meeting {
  if (scope === 'series') {
    return {
      ...meeting,
      guests: [...meeting.guests, guest],
      sessions: meeting.sessions.map((session) => ({
        ...session,
        removedGuests: session.removedGuests.filter(
          (email) => email !== guest.email,
        ),
      })),
    }
  }
  return replaceSession(meeting, sessionId, (session) => ({
    ...session,
    addedGuests: [...session.addedGuests, guest],
    removedGuests: session.removedGuests.filter(
      (email) => email !== guest.email,
    ),
  }))
}

export function removeGuestFromSession(
  meeting: Meeting,
  sessionId: string,
  email: string,
): Meeting {
  return replaceSession(meeting, sessionId, (session) => {
    const addedHere = session.addedGuests.some((guest) => guest.email === email)
    return addedHere
      ? {
          ...session,
          addedGuests: session.addedGuests.filter(
            (guest) => guest.email !== email,
          ),
        }
      : { ...session, removedGuests: [...session.removedGuests, email] }
  })
}

export function setSessionStatus(
  meeting: Meeting,
  sessionId: string,
  status: 'upcoming' | 'cancelled',
): Meeting {
  return replaceSession(meeting, sessionId, (session) => ({
    ...session,
    status,
  }))
}

// ---------------------------------------------------------------------------
// Series memory

/** Completed sessions, and cancelled ones whose date has gone by. */
export function isPastSession(session: Session) {
  if (session.status === 'completed') return true
  const endsAt = new Date(session.date)
  endsAt.setHours(Math.floor(session.end / 60), session.end % 60, 0, 0)
  return session.status === 'cancelled' && endsAt.getTime() <= NOW.getTime()
}

export function getUpcomingSessions(meeting: Meeting) {
  return meeting.sessions.filter((session) => !isPastSession(session))
}

/** Newest first. */
export function getPastSessions(meeting: Meeting) {
  return meeting.sessions.filter(isPastSession).reverse()
}

function getCompletedSessions(meeting: Meeting) {
  return getPastSessions(meeting).filter(
    (session) => session.status === 'completed',
  )
}

export function getNextSession(meeting: Meeting) {
  return meeting.sessions.find((session) => session.status === 'upcoming')
}

export function getLastCompletedSession(meeting: Meeting) {
  return getCompletedSessions(meeting)[0]
}

export function getPreviousCompletedSession(
  meeting: Meeting,
  session: Session,
) {
  return getCompletedSessions(meeting).find(
    (other) => other.number < session.number,
  )
}

export type CarriedActionItem = RecapActionItem & { session: Session }

/** Follow-ups from earlier sessions that are still open, newest first. */
export function getOpenActionItems(
  meeting: Meeting,
  beforeNumber = Infinity,
): CarriedActionItem[] {
  return getPastSessions(meeting)
    .filter((session) => session.number < beforeNumber)
    .flatMap((session) =>
      (session.recap?.actionItems ?? [])
        .filter((item) => !item.done)
        .map((item) => ({ ...item, session })),
    )
}

export function getDecisionLog(meeting: Meeting) {
  return getPastSessions(meeting).flatMap((session) =>
    (session.recap?.decisions ?? []).map((decision) => ({ decision, session })),
  )
}

export function getSeriesStats(meeting: Meeting) {
  const past = getCompletedSessions(meeting)
  const withAnalytics = past.filter((session) => session.analytics !== null)
  const attendanceRates = withAnalytics.map(
    (session) => (session.analytics!.joined / session.analytics!.invited) * 100,
  )
  const items = past.flatMap((session) => session.recap?.actionItems ?? [])
  const average = (values: readonly number[]) =>
    values.length === 0
      ? 0
      : values.reduce((sum, value) => sum + value, 0) / values.length

  return {
    held: past.length,
    cancelled: getPastSessions(meeting).filter(
      (session) => session.status === 'cancelled',
    ).length,
    attendanceRate: Math.round(average(attendanceRates)),
    averageMinutes: Math.round(
      average(withAnalytics.map((session) => session.analytics!.actualMinutes)),
    ),
    actionItemsDone:
      items.length === 0
        ? 0
        : Math.round(
            (items.filter((item) => item.done).length / items.length) * 100,
          ),
    attendanceTrend: withAnalytics
      .slice(0, 10)
      .reverse()
      .map((session) => ({
        session: `#${session.number}`,
        rate: Math.round(
          (session.analytics!.joined / session.analytics!.invited) * 100,
        ),
      })),
  }
}

export function setActionItemDone(
  meeting: Meeting,
  sessionId: string,
  itemId: string,
  done: boolean,
): Meeting {
  return replaceSession(meeting, sessionId, (session) =>
    session.recap
      ? {
          ...session,
          recap: {
            ...session.recap,
            actionItems: session.recap.actionItems.map((item) =>
              item.id === itemId ? { ...item, done } : item,
            ),
          },
        }
      : session,
  )
}

export type PersonAttendance = {
  guest: Guest
  attended: number
  /** Completed sessions this person was invited to. */
  invitedTo: number
}

/** How often each invited person showed up, plus people who came uninvited. */
export function getAttendanceByPerson(meeting: Meeting) {
  const completed = getCompletedSessions(meeting).filter(
    (session) => session.analytics !== null,
  )

  const people: PersonAttendance[] = meeting.guests.map((guest) => {
    const invitedSessions = completed.filter(
      (session) => !session.removedGuests.includes(guest.email),
    )
    return {
      guest,
      invitedTo: invitedSessions.length,
      attended: invitedSessions.filter((session) =>
        session.analytics!.attendees.some(
          (attendee) => attendee.email === guest.email,
        ),
      ).length,
    }
  })

  const walkIns = new Map<
    string,
    { name: string; email: string; sessions: number }
  >()
  for (const session of completed) {
    for (const attendee of session.analytics!.attendees) {
      if (attendee.invited) continue
      const entry = walkIns.get(attendee.email) ?? {
        name: attendee.name,
        email: attendee.email,
        sessions: 0,
      }
      walkIns.set(attendee.email, { ...entry, sessions: entry.sessions + 1 })
    }
  }

  return {
    people: people.sort(
      (a, b) =>
        b.attended / (b.invitedTo || 1) - a.attended / (a.invitedTo || 1),
    ),
    walkIns: [...walkIns.values()].sort((a, b) => b.sessions - a.sessions),
  }
}

/** Start and end of a session as timestamps, using its own time if changed. */
export function getSessionWindow(meeting: Meeting, session: Session) {
  const { date, start, end } = getEffectiveSession(meeting, session).time
  const at = (minutes: number) => {
    const moment = new Date(date)
    moment.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
    return moment.getTime()
  }
  return { startsAt: at(start), endsAt: at(end) }
}

export function isLiveSession(meeting: Meeting, session: Session) {
  if (session.status !== 'upcoming') return false
  const { startsAt, endsAt } = getSessionWindow(meeting, session)
  return startsAt <= NOW.getTime() && NOW.getTime() < endsAt
}

export type SessionEntry = { meeting: Meeting; session: Session }

/** Every session across meetings, split into upcoming (soonest first) and past (newest first). */
export function getAllSessions(meetings: readonly Meeting[]) {
  const entries = meetings.flatMap((meeting) =>
    meeting.sessions.map((session) => ({ meeting, session })),
  )
  const startOf = (entry: SessionEntry) =>
    getSessionWindow(entry.meeting, entry.session).startsAt
  return {
    upcoming: entries
      .filter((entry) => !isPastSession(entry.session))
      .sort((a, b) => startOf(a) - startOf(b)),
    past: entries
      .filter((entry) => isPastSession(entry.session))
      .sort((a, b) => startOf(b) - startOf(a)),
  }
}

/** Hosts can start "on time" from this many minutes before the start. */
export const START_WINDOW_MINUTES = 15

export type SessionAction =
  | { kind: 'rejoin' }
  | { kind: 'start-now' }
  | { kind: 'start-early'; minutesUntil: number }
  | { kind: 'join-now' }
  | { kind: 'join-waiting'; minutesUntil: number }

/**
 * What the primary button does for this person: hosts can always start
 * (early if it's still a while off); attendees can join only once it's live.
 */
export function getSessionAction(
  meeting: Meeting,
  session: Session,
): SessionAction {
  const isHost = meeting.role === 'host'
  if (isLiveSession(meeting, session)) {
    return isHost ? { kind: 'rejoin' } : { kind: 'join-now' }
  }
  const minutesUntil = Math.max(
    Math.round(
      (getSessionWindow(meeting, session).startsAt - NOW.getTime()) / 60_000,
    ),
    0,
  )
  if (!isHost) return { kind: 'join-waiting', minutesUntil }
  return minutesUntil <= START_WINDOW_MINUTES
    ? { kind: 'start-now' }
    : { kind: 'start-early', minutesUntil }
}
