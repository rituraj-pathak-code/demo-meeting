import type { SectionId } from '@/lib/demo-meetings'

// Static mock data for the dashboard UI. The page is frozen at a fixed
// "now" (Tue, Sep 29 · 2:48 PM) so the design reads the same every time.

export type Person = {
  name: string
  email: string
}

export type Rsvp = 'accepted' | 'tentative' | 'pending'

export type Attendee = Person & { rsvp: Rsvp }

export type MeetingRole = 'host' | 'attendee'

export type MeetingLocation = {
  kind: 'video' | 'room'
  label: string
}

export type ScheduledMeeting = {
  id: string
  title: string
  startTime: string
  endTime: string
  durationLabel: string
  location: MeetingLocation
  role: MeetingRole
  status: 'done' | 'upcoming'
  isExternal: boolean
  hasAgenda: boolean
}

export type UpNextMeeting = ScheduledMeeting & {
  detailId: string
  sessionId: string
  startsIn: string
  meetingLink: string
  attendees: readonly Attendee[]
  agenda: readonly { title: string; owner: string; minutes: number }[]
  resources: readonly { label: string; kind: 'design' | 'notes' }[]
}

export type DayGroup<T> = {
  label: string
  meetings: readonly T[]
}

export type UpcomingMeeting = {
  id: string
  title: string
  time: string
  durationLabel: string
  location: MeetingLocation
  role: MeetingRole
  isExternal: boolean
  attendees: readonly Person[]
  detailId: string | null
  // Only set on meetings you host.
  prep: HostPrep | null
}

export type PastMeeting = {
  id: string
  title: string
  time: string
  durationLabel: string
  role: MeetingRole
  attendeeCount: number
  recordingLength: string | null
  hasNotes: boolean
  actionItems: number
}

export type YesterdayMeeting = {
  id: string
  title: string
  time: string
  durationLabel: string
  role: MeetingRole
  summary: string
  decisions: readonly string[]
  actionItems: number
  recordingLength: string | null
}

export type YesterdayRecap = {
  dateLabel: string
  totals: {
    meetings: number
    timeLabel: string
    decisions: number
    actionItems: number
  }
  highlights: readonly string[]
  meetings: readonly YesterdayMeeting[]
}

export type ReadinessCheck = {
  label: string
  ok: boolean
  section: SectionId
}

export type HostPrep = {
  rsvp: { accepted: number; total: number }
  checks: readonly ReadinessCheck[]
}

export const DASHBOARD_NOW = {
  greeting: 'Good afternoon',
  dateLabel: 'Tuesday, September 29',
  time: '2:48 PM',
} as const

export const INSTANT_MEETING_LINK = 'https://leapcast.io/j/rtp-vxmn-qda'

export const PEOPLE = {
  ananya: { name: 'Ananya Rao', email: 'ananya@leapcast.io' },
  priya: { name: 'Priya Menon', email: 'priya@leapcast.io' },
  marcus: { name: 'Marcus Chen', email: 'marcus@leapcast.io' },
  sofia: { name: 'Sofia Alvarez', email: 'sofia@leapcast.io' },
  daniel: { name: 'Daniel Okafor', email: 'daniel@leapcast.io' },
  leah: { name: 'Leah Kim', email: 'leah@leapcast.io' },
  james: { name: 'James Whitaker', email: 'james@northwind.com' },
  elena: { name: 'Elena Novak', email: 'elena@northwind.com' },
  rituraj: { name: 'Rituraj Pathak', email: 'rituraj@trueleap.io' },
} as const satisfies Record<string, Person>

const VIDEO: MeetingLocation = { kind: 'video', label: 'Leapcast video' }
const ATLAS_ROOM: MeetingLocation = {
  kind: 'room',
  label: 'Atlas · 4th floor',
}

const TODAY = {
  critique: {
    id: 'm-critique',
    title: 'Design critique: onboarding flow',
    startTime: '3:00 PM',
    endTime: '3:45 PM',
    durationLabel: '45 min',
    location: VIDEO,
    role: 'host',
    status: 'upcoming',
    isExternal: false,
    hasAgenda: true,
  },
  oneOnOne: {
    id: 'm-1on1',
    title: '1:1 with Priya',
    startTime: '4:00 PM',
    endTime: '4:30 PM',
    durationLabel: '30 min',
    location: VIDEO,
    role: 'host',
    status: 'upcoming',
    isExternal: false,
    hasAgenda: true,
  },
  northwind: {
    id: 'm-northwind',
    title: 'Northwind · renewal call',
    startTime: '5:30 PM',
    endTime: '6:15 PM',
    durationLabel: '45 min',
    location: VIDEO,
    role: 'host',
    status: 'upcoming',
    isExternal: true,
    hasAgenda: false,
  },
} as const satisfies Record<string, ScheduledMeeting>

export const UP_NEXT: UpNextMeeting = {
  ...TODAY.critique,
  detailId: 'design-critique',
  sessionId: '19',
  startsIn: '12 min',
  meetingLink: 'https://leapcast.io/j/dsn-kpqx-rta',
  attendees: [
    { ...PEOPLE.rituraj, rsvp: 'accepted' },
    { ...PEOPLE.ananya, rsvp: 'accepted' },
    { ...PEOPLE.marcus, rsvp: 'accepted' },
    { ...PEOPLE.sofia, rsvp: 'accepted' },
    { ...PEOPLE.leah, rsvp: 'tentative' },
    { ...PEOPLE.daniel, rsvp: 'pending' },
  ],
  agenda: [
    {
      title: 'Walkthrough of the new signup flow',
      owner: 'Ananya',
      minutes: 15,
    },
    { title: 'Drop-off data from the last beta', owner: 'Marcus', minutes: 10 },
    {
      title: 'Open questions & next iteration',
      owner: 'Everyone',
      minutes: 20,
    },
  ],
  resources: [
    { label: 'Onboarding v3 · Figma', kind: 'design' },
    { label: 'Notes from last critique', kind: 'notes' },
  ],
}

export const TODAY_SUMMARY = {
  remaining: 3,
} as const

export const UPCOMING_MEETINGS: readonly DayGroup<UpcomingMeeting>[] = [
  {
    label: 'Today',
    meetings: [
      {
        id: 'u-critique',
        title: TODAY.critique.title,
        time: '3:00 PM',
        durationLabel: '45 min',
        location: VIDEO,
        role: 'host',
        isExternal: false,
        attendees: [
          PEOPLE.ananya,
          PEOPLE.marcus,
          PEOPLE.sofia,
          PEOPLE.leah,
          PEOPLE.daniel,
        ],
        detailId: 'design-critique',
        prep: {
          rsvp: { accepted: 4, total: 6 },
          checks: [
            { label: 'Agenda', ok: true, section: 'agenda' },
            { label: 'Pre-read', ok: true, section: 'materials' },
            { label: 'Recording on', ok: true, section: 'recording' },
          ],
        },
      },
      {
        id: 'u-1on1',
        title: TODAY.oneOnOne.title,
        time: '4:00 PM',
        durationLabel: '30 min',
        location: VIDEO,
        role: 'host',
        isExternal: false,
        attendees: [PEOPLE.priya],
        detailId: 'one-on-one-priya',
        prep: {
          rsvp: { accepted: 1, total: 1 },
          checks: [
            { label: 'Agenda', ok: true, section: 'agenda' },
            { label: 'Talking points', ok: true, section: 'agenda' },
          ],
        },
      },
      {
        id: 'u-northwind',
        title: TODAY.northwind.title,
        time: '5:30 PM',
        durationLabel: '45 min',
        location: VIDEO,
        role: 'host',
        isExternal: true,
        attendees: [PEOPLE.james, PEOPLE.elena, PEOPLE.daniel],
        detailId: 'northwind-renewal',
        prep: {
          rsvp: { accepted: 1, total: 3 },
          checks: [
            { label: 'Agenda', ok: false, section: 'agenda' },
            { label: 'Pre-read', ok: false, section: 'materials' },
            { label: 'Recording on', ok: true, section: 'recording' },
          ],
        },
      },
    ],
  },
  {
    label: 'Tomorrow · Wed, Sep 30',
    meetings: [
      {
        id: 'u-standup-wed',
        title: 'Daily standup',
        time: '10:00 AM',
        durationLabel: '15 min',
        location: VIDEO,
        role: 'attendee',
        isExternal: false,
        attendees: [
          PEOPLE.daniel,
          PEOPLE.marcus,
          PEOPLE.priya,
          PEOPLE.sofia,
          PEOPLE.ananya,
          PEOPLE.leah,
        ],
        detailId: 'daily-standup',
        prep: null,
      },
      {
        id: 'u-beta',
        title: 'Mobile beta go / no-go',
        time: '2:30 PM',
        durationLabel: '30 min',
        location: ATLAS_ROOM,
        role: 'host',
        isExternal: false,
        attendees: [PEOPLE.marcus, PEOPLE.daniel, PEOPLE.priya],
        detailId: 'mobile-beta-go-no-go',
        prep: {
          rsvp: { accepted: 2, total: 3 },
          checks: [
            { label: 'Agenda', ok: true, section: 'agenda' },
            { label: 'Pre-read', ok: false, section: 'materials' },
            { label: 'Room booked', ok: true, section: 'details' },
          ],
        },
      },
    ],
  },
  {
    label: 'Thu, Oct 1',
    meetings: [
      {
        id: 'u-standup-thu',
        title: 'Daily standup',
        time: '10:00 AM',
        durationLabel: '15 min',
        location: VIDEO,
        role: 'attendee',
        isExternal: false,
        attendees: [
          PEOPLE.daniel,
          PEOPLE.marcus,
          PEOPLE.priya,
          PEOPLE.sofia,
          PEOPLE.ananya,
          PEOPLE.leah,
        ],
        detailId: 'daily-standup',
        prep: null,
      },
      {
        id: 'u-qbr',
        title: 'Quarterly business review',
        time: '2:00 PM',
        durationLabel: '1h 30m',
        location: ATLAS_ROOM,
        role: 'attendee',
        isExternal: false,
        attendees: [PEOPLE.daniel, PEOPLE.sofia, PEOPLE.ananya, PEOPLE.leah],
        detailId: 'quarterly-business-review',
        prep: null,
      },
      {
        id: 'u-cab',
        title: 'Customer advisory board',
        time: '4:00 PM',
        durationLabel: '1h 30m',
        location: VIDEO,
        role: 'host',
        isExternal: true,
        attendees: [PEOPLE.james, PEOPLE.elena, PEOPLE.sofia],
        detailId: 'customer-advisory-board',
        prep: {
          rsvp: { accepted: 2, total: 3 },
          checks: [
            { label: 'Agenda', ok: true, section: 'agenda' },
            { label: 'Pre-read', ok: true, section: 'materials' },
            { label: 'Recording on', ok: true, section: 'recording' },
            { label: 'Guest access', ok: true, section: 'access' },
          ],
        },
      },
    ],
  },
]

export const PAST_MEETINGS: readonly DayGroup<PastMeeting>[] = [
  {
    label: 'Today',
    meetings: [
      {
        id: 'p-roadmap',
        title: 'Q4 roadmap review',
        time: '11:30 AM',
        durationLabel: '1h',
        role: 'host',
        attendeeCount: 9,
        recordingLength: '58:12',
        hasNotes: true,
        actionItems: 4,
      },
      {
        id: 'p-standup',
        title: 'Daily standup',
        time: '10:00 AM',
        durationLabel: '15 min',
        role: 'attendee',
        attendeeCount: 8,
        recordingLength: '14:36',
        hasNotes: true,
        actionItems: 1,
      },
    ],
  },
  {
    label: 'Yesterday · Mon, Sep 28',
    meetings: [
      {
        id: 'p-pricing',
        title: 'Pricing experiment readout',
        time: '4:00 PM',
        durationLabel: '45 min',
        role: 'attendee',
        attendeeCount: 6,
        recordingLength: '43:05',
        hasNotes: true,
        actionItems: 2,
      },
      {
        id: 'p-hiring',
        title: 'Hiring sync · Senior product designer',
        time: '1:30 PM',
        durationLabel: '30 min',
        role: 'host',
        attendeeCount: 4,
        recordingLength: null,
        hasNotes: true,
        actionItems: 1,
      },
      {
        id: 'p-design',
        title: 'Design sync',
        time: '11:00 AM',
        durationLabel: '1h',
        role: 'attendee',
        attendeeCount: 7,
        recordingLength: '57:40',
        hasNotes: true,
        actionItems: 2,
      },
    ],
  },
  {
    label: 'Fri, Sep 25',
    meetings: [
      {
        id: 'p-sprint',
        title: 'Sprint 38 review',
        time: '3:00 PM',
        durationLabel: '1h',
        role: 'host',
        attendeeCount: 12,
        recordingLength: '1:02:18',
        hasNotes: true,
        actionItems: 5,
      },
    ],
  },
]

export const YESTERDAY_RECAP: YesterdayRecap = {
  dateLabel: 'Monday, September 28',
  totals: {
    meetings: 4,
    timeLabel: '2h 30m',
    decisions: 4,
    actionItems: 6,
  },
  highlights: [
    'Annual-first pricing rolls out to all regions next sprint after an 11% conversion lift.',
    'Onboarding moves to progressive profiling — fewer fields up front.',
    'Three designer candidates advance to the final panel.',
  ],
  meetings: [
    {
      id: 'y-pricing',
      title: 'Pricing experiment readout',
      time: '4:00 PM',
      durationLabel: '45 min',
      role: 'attendee',
      summary:
        'Annual-first layout lifted conversion 11% with no change in refund rate. Sofia flagged that EU pricing copy needs legal review before launch.',
      decisions: [
        'Roll out annual-first layout to all regions next sprint',
        'Keep monthly plan visible as a secondary option',
      ],
      actionItems: 2,
      recordingLength: '43:05',
    },
    {
      id: 'y-hiring',
      title: 'Hiring sync · Senior product designer',
      time: '1:30 PM',
      durationLabel: '30 min',
      role: 'host',
      summary:
        'Reviewed five portfolios against the updated rubric. Strong signal on systems thinking from two candidates; one needs a follow-up on research depth.',
      decisions: ['Advance three candidates to the final panel'],
      actionItems: 1,
      recordingLength: null,
    },
    {
      id: 'y-design',
      title: 'Design sync',
      time: '11:00 AM',
      durationLabel: '1h',
      role: 'attendee',
      summary:
        'Beta drop-off concentrates on the workspace setup step. The team compared a single long form against progressive profiling and a guided checklist.',
      decisions: ['Move onboarding to progressive profiling'],
      actionItems: 2,
      recordingLength: '57:40',
    },
    {
      id: 'y-standup',
      title: 'Daily standup',
      time: '10:00 AM',
      durationLabel: '15 min',
      role: 'attendee',
      summary:
        'Recording export fix is in review. Staging is down for maintenance until noon; no other blockers.',
      decisions: [],
      actionItems: 1,
      recordingLength: '14:52',
    },
  ],
}

export type ActionItem = {
  id: string
  title: string
  meeting: string
  due: { label: string; overdue: boolean }
  done: boolean
}

// Your action items, pulled from previous meetings.
export const ACTION_ITEMS: readonly ActionItem[] = [
  {
    id: 'a-eu-copy',
    title: 'Send EU pricing copy to legal for review',
    meeting: 'Pricing experiment readout',
    due: { label: 'Today', overdue: false },
    done: false,
  },
  {
    id: 'a-panel',
    title: 'Schedule final panel for three designer candidates',
    meeting: 'Hiring sync',
    due: { label: 'Yesterday', overdue: true },
    done: false,
  },
  {
    id: 'a-profiling',
    title: 'Draft progressive profiling flow for onboarding',
    meeting: 'Design sync',
    due: { label: 'Fri, Oct 2', overdue: false },
    done: false,
  },
  {
    id: 'a-roadmap-owners',
    title: 'Confirm owners for each Q4 roadmap theme',
    meeting: 'Q4 roadmap review',
    due: { label: 'Thu, Oct 1', overdue: false },
    done: false,
  },
  {
    id: 'a-sprint-retro',
    title: 'Share sprint 38 retro notes with the team',
    meeting: 'Sprint 38 review',
    due: { label: 'Mon, Sep 28', overdue: true },
    done: false,
  },
  {
    id: 'a-roadmap-deck',
    title: 'Post the final roadmap deck in #product',
    meeting: 'Q4 roadmap review',
    due: { label: 'Today', overdue: false },
    done: true,
  },
]
