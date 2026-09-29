// Static mock data for meetings and their sessions. "Now" is frozen at
// Tue, Sep 29 2026 · 2:48 PM, matching the dashboard.

import type {
  MeetingLocation,
  MeetingRole,
  Person,
  Rsvp,
} from '@/lib/demo-dashboard'
import { expandRecurrence } from '@/lib/recurrence'
import type { RecurrenceRule } from '@/lib/recurrence'

export type AgendaItem = {
  id: string
  title: string
  owner: string
  minutes: number
}

export type MaterialKind = 'doc' | 'design' | 'sheet' | 'slides'

export type Material = {
  id: string
  name: string
  kind: MaterialKind
  addedBy: string
}

export type GuestRole = 'host' | 'co-host' | 'participant' | 'viewer'

export type Guest = Person & {
  rsvp: Rsvp | 'declined'
  role: GuestRole
  isExternal: boolean
}

export type SummaryAudience = 'everyone' | 'attendees' | 'host'

export type RecordingSettings = {
  record: boolean
  transcript: boolean
  aiNotes: boolean
  summaryTo: SummaryAudience
}

export type StreamPlatform =
  'youtube' | 'linkedin' | 'facebook' | 'twitch' | 'custom'

export type LiveStreamSettings = {
  enabled: boolean
  platform: StreamPlatform
  /** RTMP(S) ingest URL. */
  serverUrl: string
  streamKey: string
}

export type AddOns = {
  registration: boolean
  polls: boolean
  qa: boolean
  breakoutRooms: boolean
}

/**
 * - open: anyone with the link joins straight away
 * - trusted: your workspace and invited guests join; others wait to be let in
 * - restricted: only invited people can join
 */
export type AccessLevel = 'trusted' | 'open' | 'restricted'

export type AccessSettings = {
  level: AccessLevel
  passcode: string | null
}

export type MeetingDetails = {
  title: string
  description: string
  /** The one-off date, or the first session of a series. */
  date: Date
  start: number
  end: number
  location: MeetingLocation
}

export type SessionTime = { date: Date; start: number; end: number }

/** Anything a single session can change without touching the series. */
export type SessionOverrides = {
  agenda?: readonly AgendaItem[]
  materials?: readonly Material[]
  description?: string
  time?: SessionTime
  access?: AccessSettings
  recording?: RecordingSettings
  liveStream?: LiveStreamSettings
  /** Series guests with a different role in this session only (by email). */
  roles?: Readonly<Record<string, Exclude<GuestRole, 'host'>>>
}

export type RecapActionItem = {
  id: string
  title: string
  owner: string
  done: boolean
}

export type SessionRecap = {
  summary: string
  decisions: readonly string[]
  actionItems: readonly RecapActionItem[]
  recordingLength: string | null
}

export type SessionAttendee = {
  name: string
  email: string
  /** False when someone joined without an invite (e.g. a forwarded link). */
  invited: boolean
  joinedAt: string
  minutes: number
  leftEarly: boolean
}

export type SessionAnalytics = {
  invited: number
  joined: number
  lateJoiners: number
  scheduledMinutes: number
  actualMinutes: number
  averageMinutesInCall: number
  talkTime: readonly { name: string; share: number }[]
  topics: readonly { title: string; planned: number; actual: number }[]
  engagement: {
    chatMessages: number
    reactions: number
    pollResponses: number | null
    questions: number | null
  }
  attendees: readonly SessionAttendee[]
}

export type SessionStatus = 'completed' | 'upcoming' | 'cancelled'

export type Session = SessionTime & {
  id: string
  number: number
  status: SessionStatus
  overrides: SessionOverrides
  /** Invited to this session only. */
  addedGuests: readonly Guest[]
  /** Series guests left out of this session (by email). */
  removedGuests: readonly string[]
  recap: SessionRecap | null
  analytics: SessionAnalytics | null
}

/** Drafts haven't sent invites yet; cancelled meetings were called off as a whole. */
export type MeetingLifecycle =
  | { status: 'active' }
  | { status: 'draft'; lastEditedAt: Date }
  | {
      status: 'cancelled'
      cancelledAt: Date
      cancelledBy: string
      reason: string | null
    }

export type Meeting = {
  id: string
  lifecycle: MeetingLifecycle
  role: MeetingRole
  host: Person
  link: string
  code: string
  recurrence: { label: string } | null
  details: MeetingDetails
  agenda: readonly AgendaItem[]
  materials: readonly Material[]
  guests: readonly Guest[]
  recording: RecordingSettings
  addOns: AddOns
  access: AccessSettings
  liveStream: LiveStreamSettings
  sessions: readonly Session[]
}

export const SECTION_IDS = [
  'details',
  'agenda',
  'materials',
  'people',
  'recording',
  'access',
  'live-stream',
  'time',
] as const
export type SectionId = (typeof SECTION_IDS)[number]

export function isSectionId(value: unknown): value is SectionId {
  return SECTION_IDS.some((id) => id === value)
}

const VIDEO: MeetingLocation = { kind: 'video', label: 'Leapcast video' }
const ATLAS: MeetingLocation = { kind: 'room', label: 'Atlas · 4th floor' }

export const NOW = new Date(2026, 8, 29, 14, 48)

export const ME: Person = {
  name: 'Rituraj Pathak',
  email: 'rituraj@trueleap.io',
}

const PEOPLE = {
  ananya: { name: 'Ananya Rao', email: 'ananya@leapcast.io' },
  priya: { name: 'Priya Menon', email: 'priya@leapcast.io' },
  marcus: { name: 'Marcus Chen', email: 'marcus@leapcast.io' },
  sofia: { name: 'Sofia Alvarez', email: 'sofia@leapcast.io' },
  daniel: { name: 'Daniel Okafor', email: 'daniel@leapcast.io' },
  leah: { name: 'Leah Kim', email: 'leah@leapcast.io' },
  james: { name: 'James Whitaker', email: 'james@northwind.com' },
  elena: { name: 'Elena Novak', email: 'elena@northwind.com' },
  omar: { name: 'Omar Haddad', email: 'omar@contoso.com' },
  grace: { name: 'Grace Liu', email: 'grace@fabrikam.com' },
} as const satisfies Record<string, Person>

type PersonKey = keyof typeof PEOPLE

function guest(
  key: PersonKey | 'me',
  rsvp: Guest['rsvp'] = 'accepted',
  role: GuestRole = 'participant',
): Guest {
  const person = key === 'me' ? ME : PEOPLE[key]
  return {
    ...person,
    rsvp,
    role,
    isExternal: !person.email.endsWith('@leapcast.io') && key !== 'me',
  }
}

const DEFAULT_RECORDING: RecordingSettings = {
  record: true,
  transcript: true,
  aiNotes: true,
  summaryTo: 'everyone',
}

const NO_ADD_ONS: AddOns = {
  registration: false,
  polls: false,
  qa: false,
  breakoutRooms: false,
}

const DEFAULT_ACCESS: AccessSettings = { level: 'trusted', passcode: null }

const NO_LIVE_STREAM: LiveStreamSettings = {
  enabled: false,
  platform: 'youtube',
  serverUrl: 'rtmp://a.rtmp.youtube.com/live2',
  streamKey: '',
}

const YOUTUBE_STREAM: LiveStreamSettings = {
  enabled: true,
  platform: 'youtube',
  serverUrl: 'rtmp://a.rtmp.youtube.com/live2',
  streamKey: 'x7kd-9f2m-qa41-ph8c-3zrt',
}

// ---------------------------------------------------------------------------
// Session generation

// People who sometimes join without an invite (forwarded links).
const UNINVITED_POOL: readonly Person[] = [
  { name: 'Tom Becker', email: 'tom@leapcast.io' },
  { name: 'Nina Patel', email: 'nina@contoso.com' },
  { name: 'Alex Romero', email: 'alex@leapcast.io' },
]

type RecapSeed = {
  summary: string
  decisions: readonly string[]
  actionItems: readonly { title: string; owner: string }[]
}

/** Small deterministic PRNG so mock analytics are stable across renders. */
function seededRandom(seed: string) {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507)
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
    hash ^= hash >>> 16
    return (hash >>> 0) / 4294967296
  }
}

function formatClock(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
}

function formatLength(minutes: number) {
  const seconds = Math.round((minutes % 1) * 60)
  const whole = Math.floor(minutes)
  return whole >= 60
    ? `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${whole}:${String(seconds).padStart(2, '0')}`
}

function buildAnalytics(
  seed: string,
  guests: readonly Guest[],
  agenda: readonly AgendaItem[],
  start: number,
  end: number,
  addOns: AddOns,
): SessionAnalytics {
  const random = seededRandom(seed)
  const scheduled = end - start
  // Hosts always show up; anyone else might miss a session.
  const present: {
    name: string
    email: string
    role: GuestRole
    invited: boolean
  }[] = guests
    .filter((person) => person.role === 'host' || random() > 0.14)
    .map((person) => ({ ...person, invited: true }))
  const walkIn = UNINVITED_POOL[Math.floor(random() * UNINVITED_POOL.length)]
  if (walkIn && random() < 0.22) {
    present.push({ ...walkIn, role: 'participant', invited: false })
  }
  const actual = Math.max(scheduled + Math.round((random() - 0.55) * 12), 5)

  const weights = present.map(
    (person) => random() + (person.role === 'host' ? 0.9 : 0.25),
  )
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const shares = weights.map((weight) =>
    Math.round((weight / totalWeight) * 100),
  )
  const drift = 100 - shares.reduce((sum, share) => sum + share, 0)
  shares[0] = (shares[0] ?? 0) + drift

  let lateJoiners = 0
  const attendees = present.map((person, index) => {
    const late = index > 0 && random() < 0.25 ? 2 + Math.floor(random() * 8) : 0
    if (late > 0) lateJoiners += 1
    const leftEarly = index > 0 && random() < 0.12
    const minutes = Math.max(
      actual - late - (leftEarly ? 8 + Math.floor(random() * 10) : 0),
      3,
    )
    return {
      name: person.name,
      email: person.email,
      invited: person.invited,
      joinedAt: formatClock(start + late),
      minutes,
      leftEarly,
    }
  })

  const topics = agenda.map((item, index) => {
    const skipped = index === agenda.length - 1 && random() < 0.15
    return {
      title: item.title,
      planned: item.minutes,
      actual: skipped
        ? 0
        : Math.max(item.minutes + Math.round((random() - 0.45) * 8), 1),
    }
  })

  return {
    invited: guests.length,
    joined: present.filter((person) => person.invited).length,
    lateJoiners,
    scheduledMinutes: scheduled,
    actualMinutes: actual,
    averageMinutesInCall: Math.round(
      attendees.reduce((sum, attendee) => sum + attendee.minutes, 0) /
        attendees.length,
    ),
    talkTime: present
      .map((person, index) => ({
        name: person.name,
        share: shares[index] ?? 0,
      }))
      .sort((a, b) => b.share - a.share),
    topics,
    engagement: {
      chatMessages: Math.round(random() * 40),
      reactions: Math.round(random() * 25),
      pollResponses: addOns.polls
        ? present.length - Math.floor(random() * 2)
        : null,
      questions: addOns.qa ? 3 + Math.round(random() * 14) : null,
    },
    attendees,
  }
}

type MeetingSpec = Omit<
  Meeting,
  | 'sessions'
  | 'link'
  | 'recording'
  | 'addOns'
  | 'access'
  | 'liveStream'
  | 'lifecycle'
> & {
  lifecycle?: MeetingLifecycle
  recording?: RecordingSettings
  addOns?: AddOns
  access?: AccessSettings
  liveStream?: LiveStreamSettings
  /** Every occurrence, past and future, in order. */
  dates: readonly Date[]
  recaps: readonly RecapSeed[]
  cancelled?: readonly number[]
  sessionEdits?: Readonly<
    Record<
      number,
      Partial<Pick<Session, 'overrides' | 'addedGuests' | 'removedGuests'>>
    >
  >
}

const PAST_SESSIONS_KEPT = 30
const FUTURE_SESSIONS_KEPT = 10

function sessionEndsBeforeNow(date: Date, end: number) {
  const endsAt = new Date(date)
  endsAt.setHours(Math.floor(end / 60), end % 60, 0, 0)
  return endsAt.getTime() <= NOW.getTime()
}

function defineMeeting(spec: MeetingSpec): Meeting {
  const { dates, recaps, cancelled = [], sessionEdits = {}, ...rest } = spec
  const { start, end } = spec.details
  const addOns = spec.addOns ?? NO_ADD_ONS

  const all = dates.map((date, index): Session => {
    const number = index + 1
    const isPast = sessionEndsBeforeNow(date, end)
    const status: SessionStatus = cancelled.includes(number)
      ? 'cancelled'
      : isPast
        ? 'completed'
        : 'upcoming'
    const edits = sessionEdits[number]
    return {
      id: String(number),
      number,
      date,
      start,
      end,
      status,
      overrides: edits?.overrides ?? {},
      addedGuests: edits?.addedGuests ?? [],
      removedGuests: edits?.removedGuests ?? [],
      recap: null,
      analytics: null,
    }
  })

  const completed = all.filter((session) => session.status === 'completed')
  const recentCutoff = completed.at(-2)?.number ?? 0

  const withRecaps = all.map((session): Session => {
    if (session.status !== 'completed' || recaps.length === 0) return session
    const seed = recaps[(session.number - 1) % recaps.length]
    if (!seed) return session
    const sessionGuests = [
      ...spec.guests.filter(
        (person) => !session.removedGuests.includes(person.email),
      ),
      ...session.addedGuests,
    ]
    const analytics = buildAnalytics(
      `${spec.id}-${session.number}`,
      sessionGuests,
      session.overrides.agenda ?? spec.agenda,
      start,
      end,
      addOns,
    )
    return {
      ...session,
      recap: {
        summary: seed.summary,
        decisions: seed.decisions,
        // The last two sessions still have open follow-ups.
        actionItems: seed.actionItems.map((item, index) => ({
          id: `${spec.id}-${session.number}-${index}`,
          title: item.title,
          owner: item.owner,
          done: !(session.number >= recentCutoff && index === 0),
        })),
        recordingLength: (spec.recording ?? DEFAULT_RECORDING).record
          ? formatLength(analytics.actualMinutes - 0.6)
          : null,
      },
      analytics,
    }
  })

  const firstUpcoming = withRecaps.findIndex(
    (session) => !sessionEndsBeforeNow(session.date, end),
  )
  const splitAt = firstUpcoming === -1 ? withRecaps.length : firstUpcoming
  const sessions = [
    ...withRecaps.slice(0, splitAt).slice(-PAST_SESSIONS_KEPT),
    ...withRecaps.slice(splitAt, splitAt + FUTURE_SESSIONS_KEPT),
  ]

  return {
    ...rest,
    lifecycle: spec.lifecycle ?? { status: 'active' },
    link: `https://leapcast.io/j/${spec.code}`,
    recording: spec.recording ?? DEFAULT_RECORDING,
    addOns,
    access: spec.access ?? DEFAULT_ACCESS,
    liveStream: spec.liveStream ?? NO_LIVE_STREAM,
    sessions,
  }
}

function day(month: number, date: number, year = 2026) {
  return new Date(year, month - 1, date)
}

function repeat(first: Date, rule: RecurrenceRule, limit = 80) {
  return expandRecurrence(first, rule, limit)
}

const NEVER = { kind: 'never' } as const

// ---------------------------------------------------------------------------
// Meetings

const CRITIQUE_AGENDA: readonly AgendaItem[] = [
  {
    id: 'ag-1',
    title: 'Walkthrough of the new signup flow',
    owner: 'Ananya Rao',
    minutes: 15,
  },
  {
    id: 'ag-2',
    title: 'Drop-off data from the last beta',
    owner: 'Marcus Chen',
    minutes: 10,
  },
  {
    id: 'ag-3',
    title: 'Open questions & next iteration',
    owner: 'Everyone',
    minutes: 20,
  },
]

const MEETING_LIST: readonly Meeting[] = [
  defineMeeting({
    id: 'design-critique',
    role: 'host',
    host: ME,
    code: 'dsn-kpqx-rta',
    recurrence: { label: 'Every 2 weeks on Tuesday' },
    details: {
      title: 'Design critique: onboarding flow',
      description:
        'Review the v3 signup flow before it goes to engineering. Come with questions on the workspace setup step — that’s where the beta lost most people.',
      date: day(1, 20),
      start: 15 * 60,
      end: 15 * 60 + 45,
      location: VIDEO,
    },
    agenda: CRITIQUE_AGENDA,
    materials: [
      {
        id: 'mt-1',
        name: 'Onboarding v3 · Figma',
        kind: 'design',
        addedBy: 'Ananya Rao',
      },
      {
        id: 'mt-2',
        name: 'Notes from last critique',
        kind: 'doc',
        addedBy: 'Rituraj Pathak',
      },
      {
        id: 'mt-3',
        name: 'Beta funnel · Sep',
        kind: 'sheet',
        addedBy: 'Marcus Chen',
      },
    ],
    guests: [
      guest('me', 'accepted', 'host'),
      guest('ananya', 'accepted', 'co-host'),
      guest('marcus'),
      guest('sofia'),
      guest('leah', 'tentative'),
      guest('daniel', 'pending'),
    ],
    addOns: { ...NO_ADD_ONS, polls: true },
    dates: repeat(day(1, 20), {
      frequency: 'biweekly',
      days: [2],
      ends: NEVER,
    }),
    cancelled: [15],
    sessionEdits: {
      20: {
        overrides: {
          agenda: [
            {
              id: 'ag-20-1',
              title: 'Usability test findings (5 sessions)',
              owner: 'Leah Kim',
              minutes: 20,
            },
            {
              id: 'ag-20-2',
              title: 'Revised workspace setup step',
              owner: 'Ananya Rao',
              minutes: 15,
            },
            {
              id: 'ag-20-3',
              title: 'Go / no-go for engineering handoff',
              owner: 'Rituraj Pathak',
              minutes: 10,
            },
          ],
        },
        addedGuests: [{ ...guest('priya', 'pending'), isExternal: false }],
      },
      21: {
        overrides: {
          time: { date: day(10, 28), start: 15 * 60, end: 15 * 60 + 45 },
        },
        removedGuests: ['daniel@leapcast.io'],
      },
    },
    recaps: [
      {
        summary:
          'Walked through the revised signup flow. The team liked the shorter first step but worried the workspace setup still asks for too much before people see value.',
        decisions: ['Move workspace naming after the first meeting is created'],
        actionItems: [
          { title: 'Prototype deferred workspace setup', owner: 'Ananya Rao' },
          {
            title: 'Pull drop-off by step for the last 30 days',
            owner: 'Marcus Chen',
          },
        ],
      },
      {
        summary:
          'Reviewed beta drop-off: 38% of new users leave at workspace setup. Compared a single long form, progressive profiling and a guided checklist.',
        decisions: [
          'Go with progressive profiling',
          'Drop the company-size question',
        ],
        actionItems: [
          {
            title: 'Write copy for the progressive steps',
            owner: 'Sofia Alvarez',
          },
          { title: 'Schedule five usability sessions', owner: 'Leah Kim' },
        ],
      },
      {
        summary:
          'Critiqued the empty states and first-run dashboard. Agreed the dashboard should lead with “create your first meeting” rather than analytics.',
        decisions: ['First-run dashboard leads with Quick start'],
        actionItems: [
          { title: 'Redesign first-run empty states', owner: 'Ananya Rao' },
          {
            title: 'Share critique notes with engineering',
            owner: 'Rituraj Pathak',
          },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'northwind-renewal',
    role: 'host',
    host: ME,
    code: 'nwd-rnwl-qcx',
    recurrence: null,
    details: {
      title: 'Northwind · renewal call',
      description: '',
      date: day(9, 29),
      start: 17 * 60 + 30,
      end: 18 * 60 + 15,
      location: VIDEO,
    },
    agenda: [],
    materials: [],
    guests: [
      guest('me', 'accepted', 'host'),
      guest('james', 'pending'),
      guest('elena', 'pending'),
      guest('daniel'),
    ],
    recording: { ...DEFAULT_RECORDING, summaryTo: 'host' },
    dates: [day(9, 29)],
    recaps: [],
  }),
  defineMeeting({
    id: 'quarterly-business-review',
    role: 'attendee',
    host: PEOPLE.daniel,
    code: 'qbr-oct-mtx',
    recurrence: { label: 'Quarterly on the first Thursday' },
    details: {
      title: 'Quarterly business review',
      description:
        'Company-wide look at last quarter’s results and the next quarter’s priorities. Leadership takes questions at the end — submit them in Q&A.',
      date: day(1, 8, 2025),
      start: 14 * 60,
      end: 15 * 60 + 30,
      location: ATLAS,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'Results for the quarter',
        owner: 'Daniel Okafor',
        minutes: 30,
      },
      {
        id: 'ag-2',
        title: 'Product roadmap',
        owner: 'Rituraj Pathak',
        minutes: 25,
      },
      { id: 'ag-3', title: 'Hiring plan', owner: 'Sofia Alvarez', minutes: 15 },
      { id: 'ag-4', title: 'Open Q&A', owner: 'Everyone', minutes: 20 },
    ],
    materials: [
      {
        id: 'mt-1',
        name: 'Q3 business review · deck',
        kind: 'slides',
        addedBy: 'Daniel Okafor',
      },
    ],
    guests: [
      guest('daniel', 'accepted', 'host'),
      guest('me'),
      guest('sofia', 'accepted', 'co-host'),
      guest('ananya'),
      guest('leah', 'tentative', 'viewer'),
      guest('marcus', 'accepted', 'viewer'),
      guest('priya', 'accepted', 'viewer'),
    ],
    addOns: { ...NO_ADD_ONS, qa: true },
    liveStream: YOUTUBE_STREAM,
    dates: [
      day(1, 9, 2025),
      day(4, 3, 2025),
      day(7, 3, 2025),
      day(10, 2, 2025),
      day(1, 8),
      day(4, 2),
      day(7, 2),
      day(10, 1),
      day(1, 7, 2027),
      day(4, 1, 2027),
      day(7, 1, 2027),
      day(10, 7, 2027),
      day(1, 6, 2028),
      day(4, 6, 2028),
      day(7, 6, 2028),
      day(10, 5, 2028),
      day(1, 4, 2029),
      day(4, 5, 2029),
    ],
    recaps: [
      {
        summary:
          'Revenue grew 18% quarter over quarter, led by enterprise expansion. Churn ticked up in the SMB segment, mostly from teams under ten seats.',
        decisions: ['Prioritise SMB onboarding improvements next quarter'],
        actionItems: [
          {
            title: 'Share the churn analysis with product',
            owner: 'Daniel Okafor',
          },
          { title: 'Draft SMB onboarding plan', owner: 'Rituraj Pathak' },
        ],
      },
      {
        summary:
          'Hit 104% of the revenue target. Hiring is behind plan in engineering; two senior roles have been open for over 60 days.',
        decisions: ['Add an external recruiter for senior engineering roles'],
        actionItems: [
          { title: 'Engage recruiting agency', owner: 'Sofia Alvarez' },
          {
            title: 'Update the hiring dashboard monthly',
            owner: 'Sofia Alvarez',
          },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'daily-standup',
    role: 'attendee',
    host: PEOPLE.daniel,
    code: 'std-dly-tmx',
    recurrence: { label: 'Every weekday' },
    details: {
      title: 'Daily standup',
      description: 'Yesterday, today, blockers. Keep it to fifteen minutes.',
      date: day(8, 3),
      start: 10 * 60,
      end: 10 * 60 + 15,
      location: VIDEO,
    },
    agenda: [
      { id: 'ag-1', title: 'Round the room', owner: 'Everyone', minutes: 10 },
      { id: 'ag-2', title: 'Blockers', owner: 'Daniel Okafor', minutes: 5 },
    ],
    materials: [],
    guests: [
      guest('daniel', 'accepted', 'host'),
      guest('me'),
      guest('marcus'),
      guest('priya'),
      guest('sofia'),
      guest('ananya'),
      guest('leah'),
    ],
    dates: repeat(day(8, 3), {
      frequency: 'weekly',
      days: [1, 2, 3, 4, 5],
      ends: NEVER,
    }),
    recaps: [
      {
        summary:
          'Recording export fix is in review. Staging is down until noon; no other blockers.',
        decisions: [],
        actionItems: [
          {
            title: 'Unblock Marcus on staging credentials',
            owner: 'Daniel Okafor',
          },
        ],
      },
      {
        summary:
          'Calendar sync is behind by a day. Priya is pairing with Marcus to close it out.',
        decisions: ['Push calendar sync release to Thursday'],
        actionItems: [
          { title: 'Update the release notes date', owner: 'Priya Menon' },
        ],
      },
      {
        summary: 'Everyone on track. Leah is out Friday.',
        decisions: [],
        actionItems: [
          { title: 'Cover Leah’s usability session', owner: 'Ananya Rao' },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'one-on-one-priya',
    role: 'host',
    host: ME,
    code: 'one-prya-wkl',
    recurrence: { label: 'Weekly on Tuesday' },
    details: {
      title: '1:1 with Priya',
      description:
        'Priya’s agenda first, then mine. Running notes live in the shared doc.',
      date: day(6, 2),
      start: 16 * 60,
      end: 16 * 60 + 30,
      location: VIDEO,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'Priya’s topics',
        owner: 'Priya Menon',
        minutes: 15,
      },
      {
        id: 'ag-2',
        title: 'Feedback & growth',
        owner: 'Rituraj Pathak',
        minutes: 15,
      },
    ],
    materials: [
      {
        id: 'mt-1',
        name: '1:1 running notes',
        kind: 'doc',
        addedBy: 'Rituraj Pathak',
      },
    ],
    guests: [guest('me', 'accepted', 'host'), guest('priya')],
    recording: { ...DEFAULT_RECORDING, record: false, summaryTo: 'attendees' },
    dates: repeat(day(6, 2), { frequency: 'weekly', days: [2], ends: NEVER }),
    cancelled: [9],
    recaps: [
      {
        summary:
          'Priya wants to lead the calendar sync launch. Talked about scoping it to two weeks.',
        decisions: ['Priya owns the calendar sync launch'],
        actionItems: [
          { title: 'Write a launch plan draft', owner: 'Priya Menon' },
          {
            title: 'Introduce Priya to the marketing lead',
            owner: 'Rituraj Pathak',
          },
        ],
      },
      {
        summary:
          'Reviewed quarterly goals; two are on track, one needs re-scoping.',
        decisions: [],
        actionItems: [
          { title: 'Re-scope the API docs goal', owner: 'Priya Menon' },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'customer-advisory-board',
    role: 'host',
    host: ME,
    code: 'cab-mthly-qvx',
    recurrence: { label: 'Monthly on the first Thursday' },
    details: {
      title: 'Customer advisory board',
      description:
        'Monthly session with design partners. We share what’s coming and they tell us what’s missing.',
      date: day(4, 2),
      start: 16 * 60,
      end: 17 * 60 + 30,
      location: VIDEO,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'What shipped this month',
        owner: 'Rituraj Pathak',
        minutes: 20,
      },
      {
        id: 'ag-2',
        title: 'Roadmap preview',
        owner: 'Rituraj Pathak',
        minutes: 30,
      },
      {
        id: 'ag-3',
        title: 'Partner feedback round',
        owner: 'Everyone',
        minutes: 40,
      },
    ],
    materials: [
      {
        id: 'mt-1',
        name: 'CAB roadmap preview · deck',
        kind: 'slides',
        addedBy: 'Rituraj Pathak',
      },
    ],
    guests: [
      guest('me', 'accepted', 'host'),
      guest('sofia', 'accepted', 'co-host'),
      guest('james'),
      guest('elena', 'tentative'),
      guest('omar'),
      guest('grace', 'pending', 'viewer'),
    ],
    addOns: { ...NO_ADD_ONS, polls: true, breakoutRooms: true },
    access: { level: 'restricted', passcode: '771204' },
    dates: repeat(day(4, 2), { frequency: 'monthly', days: [], ends: NEVER }),
    recaps: [
      {
        summary:
          'Partners want recurring meeting analytics across a whole team, not just per meeting. Two asked for a Salesforce integration.',
        decisions: ['Explore team-level analytics for Q1'],
        actionItems: [
          {
            title: 'Send the analytics mock to partners',
            owner: 'Rituraj Pathak',
          },
          { title: 'Size the Salesforce integration', owner: 'Sofia Alvarez' },
        ],
      },
      {
        summary:
          'Live stream beta got strong feedback. Latency on LinkedIn Live is the main complaint.',
        decisions: ['Keep LinkedIn Live in beta another month'],
        actionItems: [
          { title: 'Investigate LinkedIn Live latency', owner: 'Marcus Chen' },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'mobile-beta-go-no-go',
    role: 'host',
    host: ME,
    code: 'mbl-beta-gng',
    recurrence: null,
    details: {
      title: 'Mobile beta go / no-go',
      description:
        'Decide whether the mobile beta goes to the wider waitlist next week.',
      date: day(9, 30),
      start: 14 * 60 + 30,
      end: 15 * 60,
      location: ATLAS,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'QA status & open bugs',
        owner: 'Marcus Chen',
        minutes: 10,
      },
      {
        id: 'ag-2',
        title: 'Crash rate & performance',
        owner: 'Priya Menon',
        minutes: 10,
      },
      { id: 'ag-3', title: 'Decision', owner: 'Rituraj Pathak', minutes: 10 },
    ],
    materials: [
      {
        id: 'mt-1',
        name: 'Beta readiness checklist',
        kind: 'sheet',
        addedBy: 'Marcus Chen',
      },
    ],
    guests: [
      guest('me', 'accepted', 'host'),
      guest('marcus'),
      guest('daniel'),
      guest('priya'),
    ],
    dates: [day(9, 30)],
    recaps: [],
  }),
  defineMeeting({
    id: 'q4-roadmap-review',
    role: 'host',
    host: ME,
    code: 'rdm-q4-rvw',
    recurrence: null,
    details: {
      title: 'Q4 roadmap review',
      description:
        'Lock the Q4 roadmap with product, design and engineering leads.',
      date: day(9, 29),
      start: 11 * 60 + 30,
      end: 12 * 60 + 30,
      location: ATLAS,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'Calendar sync vs analytics revamp',
        owner: 'Rituraj Pathak',
        minutes: 25,
      },
      {
        id: 'ag-2',
        title: 'Mobile beta timing',
        owner: 'Marcus Chen',
        minutes: 20,
      },
      {
        id: 'ag-3',
        title: 'Pricing page refresh',
        owner: 'Sofia Alvarez',
        minutes: 15,
      },
    ],
    materials: [
      {
        id: 'mt-1',
        name: 'Q4 roadmap · draft',
        kind: 'slides',
        addedBy: 'Rituraj Pathak',
      },
    ],
    guests: [
      guest('me', 'accepted', 'host'),
      guest('ananya'),
      guest('marcus'),
      guest('sofia'),
      guest('daniel'),
      guest('priya'),
      guest('leah'),
    ],
    dates: [day(9, 29)],
    recaps: [
      {
        summary:
          'Calendar sync ships before the analytics revamp. Mobile beta moves to week 44, pending QA capacity. Pricing page refresh is paused until the experiment readout.',
        decisions: [
          'Ship calendar sync before the analytics revamp',
          'Mobile beta moves to week 44',
          'Pause the pricing page refresh',
        ],
        actionItems: [
          {
            title: 'Share revised roadmap deck with leadership',
            owner: 'Rituraj Pathak',
          },
          {
            title: 'Book QA capacity for the mobile beta',
            owner: 'Marcus Chen',
          },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'pricing-experiment-readout',
    role: 'attendee',
    host: PEOPLE.sofia,
    code: 'prc-exp-rdt',
    recurrence: null,
    details: {
      title: 'Pricing experiment readout',
      description: 'Results from the annual-first pricing page test.',
      date: day(9, 28),
      start: 16 * 60,
      end: 16 * 60 + 45,
      location: VIDEO,
    },
    agenda: [
      { id: 'ag-1', title: 'Results', owner: 'Sofia Alvarez', minutes: 20 },
      { id: 'ag-2', title: 'Rollout plan', owner: 'Everyone', minutes: 25 },
    ],
    materials: [
      {
        id: 'mt-1',
        name: 'Experiment results',
        kind: 'sheet',
        addedBy: 'Sofia Alvarez',
      },
    ],
    guests: [
      guest('sofia', 'accepted', 'host'),
      guest('me'),
      guest('daniel'),
      guest('marcus'),
      guest('ananya'),
      guest('priya'),
    ],
    dates: [day(9, 28)],
    recaps: [
      {
        summary:
          'Annual-first layout lifted conversion 11% with no change in refund rate. EU pricing copy needs legal review before launch.',
        decisions: [
          'Roll out annual-first layout to all regions next sprint',
          'Keep monthly plan visible as a secondary option',
        ],
        actionItems: [
          {
            title: 'Update pricing FAQ with experiment results',
            owner: 'Sofia Alvarez',
          },
          { title: 'Get legal sign-off on EU copy', owner: 'Daniel Okafor' },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'all-hands',
    role: 'attendee',
    host: PEOPLE.daniel,
    code: 'all-hnds-mth',
    recurrence: { label: 'Monthly on the first Friday' },
    details: {
      title: 'Company all-hands',
      description:
        'Company updates, team spotlights and open Q&A. Streamed for remote teams.',
      date: day(6, 5),
      start: 16 * 60,
      end: 17 * 60,
      location: ATLAS,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'Company update',
        owner: 'Daniel Okafor',
        minutes: 20,
      },
      { id: 'ag-2', title: 'Team spotlight', owner: 'Rotating', minutes: 20 },
      { id: 'ag-3', title: 'Open Q&A', owner: 'Everyone', minutes: 20 },
    ],
    materials: [],
    guests: [
      guest('daniel', 'accepted', 'host'),
      guest('me'),
      guest('sofia', 'accepted', 'co-host'),
      guest('ananya', 'accepted', 'viewer'),
      guest('marcus', 'accepted', 'viewer'),
      guest('priya', 'accepted', 'viewer'),
      guest('leah', 'accepted', 'viewer'),
    ],
    addOns: { ...NO_ADD_ONS, qa: true, polls: true },
    access: { level: 'open', passcode: null },
    liveStream: { ...YOUTUBE_STREAM, streamKey: 'a91c-77bd-kk20-mm4e-v6q8' },
    dates: repeat(day(6, 5), { frequency: 'monthly', days: [], ends: NEVER }),
    recaps: [
      {
        summary:
          'Welcomed four new hires. Design team spotlight on the onboarding revamp.',
        decisions: [],
        actionItems: [
          {
            title: 'Post the all-hands recording in #general',
            owner: 'Sofia Alvarez',
          },
        ],
      },
      {
        summary:
          'Shared H2 goals. Most questions were about the office move timeline.',
        decisions: ['Office move confirmed for January'],
        actionItems: [
          { title: 'Publish the office move FAQ', owner: 'Daniel Okafor' },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'support-escalations',
    role: 'attendee',
    host: PEOPLE.marcus,
    code: 'sup-esc-wkl',
    recurrence: { label: 'Weekly on Tuesday' },
    details: {
      title: 'Support escalations sync',
      description:
        'Walk through open P1/P2 escalations with support and engineering. Decide owners and customer updates.',
      date: day(8, 4),
      start: 14 * 60 + 30,
      end: 15 * 60 + 15,
      location: VIDEO,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'Open P1 escalations',
        owner: 'Marcus Chen',
        minutes: 20,
      },
      {
        id: 'ag-2',
        title: 'Customer updates to send',
        owner: 'Sofia Alvarez',
        minutes: 15,
      },
      {
        id: 'ag-3',
        title: 'Patterns & prevention',
        owner: 'Everyone',
        minutes: 10,
      },
    ],
    materials: [
      {
        id: 'mt-1',
        name: 'Escalation tracker',
        kind: 'sheet',
        addedBy: 'Marcus Chen',
      },
    ],
    guests: [
      guest('marcus', 'accepted', 'host'),
      guest('me'),
      guest('sofia'),
      guest('priya'),
      guest('daniel', 'tentative'),
    ],
    dates: repeat(day(8, 4), { frequency: 'weekly', days: [2], ends: NEVER }),
    recaps: [
      {
        summary:
          'Two P1s closed. Northwind export timeout traced to a missing index; fix ships Thursday.',
        decisions: ['Add export timeouts to the on-call runbook'],
        actionItems: [
          { title: 'Ship the export index fix', owner: 'Priya Menon' },
          { title: 'Email Northwind with the ETA', owner: 'Sofia Alvarez' },
        ],
      },
      {
        summary:
          'Quiet week. One P2 on calendar sync duplicates, reproduced and assigned.',
        decisions: [],
        actionItems: [
          { title: 'Fix duplicate calendar events', owner: 'Marcus Chen' },
        ],
      },
    ],
  }),
  defineMeeting({
    id: 'q1-planning-kickoff',
    lifecycle: { status: 'draft', lastEditedAt: new Date(2026, 8, 27, 18, 5) },
    role: 'host',
    host: ME,
    code: 'q1p-kick-drf',
    recurrence: null,
    details: {
      title: 'Q1 planning kickoff',
      description: 'Set themes for Q1 before teams write their plans.',
      date: day(10, 14),
      start: 10 * 60,
      end: 11 * 60 + 30,
      location: ATLAS,
    },
    agenda: [
      {
        id: 'ag-1',
        title: 'What we learned in Q4',
        owner: 'Rituraj Pathak',
        minutes: 30,
      },
      { id: 'ag-2', title: 'Candidate themes', owner: 'Everyone', minutes: 60 },
    ],
    materials: [],
    guests: [
      guest('me', 'accepted', 'host'),
      guest('daniel', 'pending'),
      guest('sofia', 'pending'),
      guest('ananya', 'pending'),
    ],
    dates: [day(10, 14)],
    recaps: [],
  }),
  defineMeeting({
    id: 'design-office-hours',
    lifecycle: { status: 'draft', lastEditedAt: new Date(2026, 8, 29, 9, 40) },
    role: 'host',
    host: ME,
    code: 'dsn-offc-hrs',
    recurrence: { label: 'Weekly on Thursday' },
    details: {
      title: 'Design office hours',
      description: '',
      date: day(10, 8),
      start: 13 * 60,
      end: 14 * 60,
      location: VIDEO,
    },
    agenda: [],
    materials: [],
    guests: [guest('me', 'accepted', 'host')],
    dates: repeat(
      day(10, 8),
      { frequency: 'weekly', days: [4], ends: NEVER },
      10,
    ),
    recaps: [],
  }),
  defineMeeting({
    id: 'vendor-security-review',
    lifecycle: {
      status: 'cancelled',
      cancelledAt: new Date(2026, 8, 25, 11, 20),
      cancelledBy: 'Rituraj Pathak',
      reason: 'Vendor withdrew from the RFP.',
    },
    role: 'host',
    host: ME,
    code: 'vnd-sec-rvw',
    recurrence: null,
    details: {
      title: 'Vendor security review · Contoso',
      description: 'Walk through Contoso’s SOC 2 report and data handling.',
      date: day(10, 2),
      start: 11 * 60,
      end: 12 * 60,
      location: VIDEO,
    },
    agenda: [],
    materials: [],
    guests: [guest('me', 'accepted', 'host'), guest('omar'), guest('daniel')],
    dates: [day(10, 2)],
    recaps: [],
  }),
  defineMeeting({
    id: 'design-systems-guild',
    lifecycle: {
      status: 'cancelled',
      cancelledAt: new Date(2026, 8, 18, 16, 0),
      cancelledBy: 'Ananya Rao',
      reason: 'Merged into the design critique series.',
    },
    role: 'attendee',
    host: PEOPLE.ananya,
    code: 'dsg-gld-mth',
    recurrence: { label: 'Monthly on the third Wednesday' },
    details: {
      title: 'Design systems guild',
      description: '',
      date: day(10, 21),
      start: 15 * 60,
      end: 16 * 60,
      location: VIDEO,
    },
    agenda: [],
    materials: [],
    guests: [guest('ananya', 'accepted', 'host'), guest('me'), guest('leah')],
    dates: [day(10, 21), day(11, 18)],
    recaps: [],
  }),
]

const MEETINGS_BY_ID = new Map(
  MEETING_LIST.map((meeting) => [meeting.id, meeting]),
)

// The meeting most recently created from the modal. Kept in memory so its
// session pages resolve during client-side navigation (not across reloads).
let createdMeeting: Meeting | undefined

export function getMeeting(id: string): Meeting | undefined {
  return id === 'new' ? createdMeeting : MEETINGS_BY_ID.get(id)
}

export function listMeetings(): readonly Meeting[] {
  return MEETING_LIST
}

// ---------------------------------------------------------------------------
// Meetings created in this session (from the Create meeting modal)

export type NewMeetingInput = {
  title: string
  date: Date
  start: number
  end: number
  recurrence: { label: string; rule: RecurrenceRule } | null
}

/** A freshly created meeting: only the basics are filled in. */
export function createNewMeeting(input: NewMeetingInput): Meeting {
  const dates = input.recurrence
    ? expandRecurrence(input.date, input.recurrence.rule, FUTURE_SESSIONS_KEPT)
    : [input.date]
  createdMeeting = defineMeeting({
    id: 'new',
    role: 'host',
    host: ME,
    code: 'new-mtng-zpl',
    recurrence: input.recurrence ? { label: input.recurrence.label } : null,
    details: {
      title: input.title,
      description: '',
      date: input.date,
      start: input.start,
      end: input.end,
      location: VIDEO,
    },
    agenda: [],
    materials: [],
    guests: [guest('me', 'accepted', 'host')],
    dates,
    recaps: [],
  })
  return createdMeeting
}
