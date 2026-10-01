import { PEOPLE, UPCOMING_MEETINGS } from '@/lib/demo-dashboard'
import type {
  HostPrep,
  MeetingLocation,
  MeetingRole,
  Person,
} from '@/lib/demo-dashboard'
import { NOW } from '@/lib/demo-meetings'
import { TODAY, addDays } from '@/lib/assistant/parse'
import type { TimeWindow } from '@/lib/assistant/parse'
import type { RecurrenceRule } from '@/lib/recurrence'

export type CalendarEntry = {
  id: string
  detailId: string | null
  title: string
  date: Date
  start: number
  end: number
  attendees: readonly Person[]
  role: MeetingRole
  isExternal: boolean
  location: MeetingLocation
  prep: HostPrep | null
}

export type Slot = { date: Date; start: number; end: number }

export type AgendaSuggestion = { title: string; owner: string; minutes: number }

export type MeetingOptions = {
  record: boolean
  transcript: boolean
  /** Built from the transcript, so it needs one. */
  aiNotes: boolean
  /** Guests outside the workspace wait to be let in. */
  waitingRoom: boolean
}

export type MeetingDraft = Slot & {
  title: string
  attendees: readonly Person[]
  rule: RecurrenceRule | null
  agenda: readonly AgendaSuggestion[]
  options: MeetingOptions
}

export function isExternal(person: Person) {
  return !person.email.endsWith('@leapcast.io')
}

/** Everything on; a waiting room only when someone's from outside. */
export function defaultOptions(attendees: readonly Person[]): MeetingOptions {
  return {
    record: true,
    transcript: true,
    aiNotes: true,
    waitingRoom: attendees.some(isExternal),
  }
}

/** Applies a change while keeping AI notes and the transcript consistent. */
export function withOption(
  options: MeetingOptions,
  key: keyof MeetingOptions,
  value: boolean,
): MeetingOptions {
  const next = { ...options, [key]: value }
  if (key === 'transcript' && !value) next.aiNotes = false
  if (key === 'aiNotes' && value) next.transcript = true
  return next
}

export type DraftField = 'title' | 'time' | 'duration' | 'agenda'

export type Conflict =
  | {
      kind: 'busy'
      who: readonly string[]
      title: string
      start: number
      end: number
    }
  | { kind: 'past' }
  | { kind: 'weekend' }

function parseClock(label: string) {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(label)
  if (!match) throw new Error(`Unexpected clock label: ${label}`)
  const hour = (Number(match[1]) % 12) + (match[3] === 'PM' ? 12 : 0)
  return hour * 60 + Number(match[2])
}

function parseDurationLabel(label: string) {
  const hours = /(\d+)h/.exec(label)
  const minutes = /(\d+)\s*(?:m\b|min)/.exec(label)
  return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0)
}

// Dashboard groups are consecutive days starting today (Today, Tomorrow, Thu).
export const CALENDAR: readonly CalendarEntry[] = UPCOMING_MEETINGS.flatMap(
  (group, index) =>
    group.meetings.map((meeting) => {
      const start = parseClock(meeting.time)
      return {
        id: meeting.id,
        detailId: meeting.detailId,
        title: meeting.title,
        date: addDays(TODAY, index),
        start,
        end: start + parseDurationLabel(meeting.durationLabel),
        attendees: meeting.attendees,
        role: meeting.role,
        isExternal: meeting.isExternal,
        location: meeting.location,
        prep: meeting.prep,
      }
    }),
)

// Teammates' own calendars, which the dashboard never shows.
const OTHER_BUSY: readonly (Slot & { person: Person; title: string })[] = [
  {
    person: PEOPLE.priya,
    date: addDays(TODAY, 1),
    start: 13 * 60,
    end: 14 * 60,
    title: 'Focus time',
  },
  {
    person: PEOPLE.sofia,
    date: addDays(TODAY, 1),
    start: 15 * 60,
    end: 16 * 60,
    title: 'Customer call',
  },
  {
    person: PEOPLE.ananya,
    date: TODAY,
    start: 16 * 60 + 30,
    end: 17 * 60 + 30,
    title: 'Interview',
  },
  {
    person: PEOPLE.marcus,
    date: addDays(TODAY, 2),
    start: 9 * 60,
    end: 11 * 60,
    title: 'Out of office',
  },
]

const WORKDAY = { from: 9 * 60, to: 18 * 60 }
const LEAD_MINUTES = 30

function sameDay(a: Date, b: Date) {
  return a.getTime() === b.getTime()
}

function overlaps(a: Slot, b: Slot) {
  return sameDay(a.date, b.date) && a.start < b.end && b.start < a.end
}

function firstName(person: Person) {
  return person.name.split(' ')[0] ?? person.name
}

export function slotStartsAt(slot: Slot) {
  const at = new Date(slot.date)
  at.setHours(Math.floor(slot.start / 60), slot.start % 60)
  return at
}

/** Who's busy during `slot` — you first, then the guests. */
export function findConflicts(
  slot: Slot,
  attendees: readonly Person[],
  ignoreId?: string,
): Conflict[] {
  const conflicts: Conflict[] = []
  if (slotStartsAt(slot) < NOW) conflicts.push({ kind: 'past' })
  if (slot.date.getDay() === 0 || slot.date.getDay() === 6) {
    conflicts.push({ kind: 'weekend' })
  }
  const emails = new Set(attendees.map((person) => person.email))

  for (const entry of CALENDAR) {
    if (entry.id === ignoreId || !overlaps(slot, entry)) continue
    const who = [
      'You',
      ...entry.attendees.filter((p) => emails.has(p.email)).map(firstName),
    ]
    conflicts.push({
      kind: 'busy',
      who,
      title: entry.title,
      start: entry.start,
      end: entry.end,
    })
  }
  for (const block of OTHER_BUSY) {
    if (emails.has(block.person.email) && overlaps(slot, block)) {
      conflicts.push({
        kind: 'busy',
        who: [firstName(block.person)],
        title: block.title,
        start: block.start,
        end: block.end,
      })
    }
  }
  return conflicts
}

/** Open slots for everyone, earliest first, spread at least an hour apart. */
export function suggestSlots({
  from,
  duration,
  attendees,
  window,
  exclude,
  ignoreId,
  count = 3,
}: {
  from: Date
  duration: number
  attendees: readonly Person[]
  window?: TimeWindow | null
  exclude?: Slot
  ignoreId?: string
  count?: number
}): Slot[] {
  const range = window ?? WORKDAY
  const slots: Slot[] = []
  for (let offset = 0; offset < 14 && slots.length < count; offset += 1) {
    const date = addDays(from, offset)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    let lastPicked = -Infinity
    for (let start = range.from; start + duration <= range.to; start += 30) {
      const slot = { date, start, end: start + duration }
      if (slotStartsAt(slot).getTime() < NOW.getTime() + LEAD_MINUTES * 60_000)
        continue
      if (exclude && sameDay(exclude.date, date) && exclude.start === start)
        continue
      if (start - lastPicked < 60) continue
      if (findConflicts(slot, attendees, ignoreId).length > 0) continue
      slots.push(slot)
      lastPicked = start
      if (slots.length >= count) break
    }
  }
  return slots
}

type AgendaTemplate = {
  pattern: RegExp
  items: readonly (readonly [title: string, owner: string, weight: number])[]
}

const AGENDA_TEMPLATES: readonly AgendaTemplate[] = [
  {
    pattern: /1:1|one[- ]on[- ]one|check-?in|catch[- ]?up/i,
    items: [
      ['Wins and updates since last time', '{guest}', 3],
      ['Blockers and where you need help', '{guest}', 3],
      ['Feedback and growth', 'You', 2.5],
      ['Next steps', 'Everyone', 1.5],
    ],
  },
  {
    pattern: /panel|interview|candidate|hiring/i,
    items: [
      ['Candidate overview and rubric', 'You', 1.5],
      ['Portfolio deep-dives', 'Panel', 4],
      ['Calibrate scores', 'Everyone', 2.5],
      ['Decision and next steps', 'You', 2],
    ],
  },
  {
    pattern: /review|critique|readout|demo|walkthrough/i,
    items: [
      ['Context and goals', 'You', 1.5],
      ['Walkthrough', '{guest}', 4],
      ['Feedback and open questions', 'Everyone', 3],
      ['Decisions and owners', 'Everyone', 1.5],
    ],
  },
  {
    pattern: /plan|planning|kick-?off|roadmap|strategy/i,
    items: [
      ['Goals and success metrics', 'You', 2],
      ['Scope and milestones', 'Everyone', 3],
      ['Risks and dependencies', 'Everyone', 2.5],
      ['Owners and next steps', 'Everyone', 2.5],
    ],
  },
  {
    pattern: /renewal|customer|client|account|northwind|advisory/i,
    items: [
      ['Where things stand: usage and results', 'You', 2],
      ['Their priorities for next year', '{guest}', 3],
      ['Options, pricing and terms', 'You', 3],
      ['Agree on next steps', 'Everyone', 2],
    ],
  },
]

const DEFAULT_AGENDA: AgendaTemplate['items'] = [
  ['Quick updates', 'Everyone', 2],
  ['Discussion', 'You', 5],
  ['Decisions and next steps', 'Everyone', 3],
]

/** A time-boxed agenda that fills `duration`, picked from the title. */
export function suggestAgenda(
  title: string,
  duration: number,
  attendees: readonly Person[],
): AgendaSuggestion[] {
  const items =
    AGENDA_TEMPLATES.find((template) => template.pattern.test(title))?.items ??
    DEFAULT_AGENDA
  const guest = attendees[0] ? firstName(attendees[0]) : 'Guest'
  const totalWeight = items.reduce((sum, [, , weight]) => sum + weight, 0)
  const agenda = items.map(([itemTitle, owner, weight]) => ({
    title: itemTitle,
    owner: owner.replace('{guest}', guest),
    minutes: Math.max(5, Math.round((duration * weight) / totalWeight / 5) * 5),
  }))
  // Rounding drifts; the last item absorbs the difference.
  const drift = duration - agenda.reduce((sum, item) => sum + item.minutes, 0)
  const last = agenda.at(-1)
  if (last) last.minutes = Math.max(5, last.minutes + drift)
  return agenda
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ORDINALS = ['first', 'second', 'third', 'fourth', 'last']
const untilFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function dayList(days: readonly number[]) {
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((day) => SHORT_DAYS[day])
    .join(', ')
}

export function describeRule(rule: RecurrenceRule, date: Date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  let label: string
  switch (rule.frequency) {
    case 'daily':
      label = 'Every day'
      break
    case 'weekly':
      label =
        rule.days.length === 5 &&
        [1, 2, 3, 4, 5].every((d) => rule.days.includes(d))
          ? 'Every weekday'
          : `Weekly on ${dayList(rule.days)}`
      break
    case 'biweekly':
      label = `Every 2 weeks on ${dayList(rule.days)}`
      break
    case 'monthly':
      label = `Monthly on the ${ORDINALS[Math.min(Math.ceil(date.getDate() / 7), 5) - 1]} ${weekday}`
      break
    default: {
      const unhandled: never = rule.frequency
      throw new Error(`Unhandled frequency: ${String(unhandled)}`)
    }
  }
  switch (rule.ends.kind) {
    case 'never':
      return label
    case 'on':
      return `${label}, until ${untilFormatter.format(rule.ends.until)}`
    case 'after':
      return `${label}, ${rule.ends.count} meetings`
    default: {
      const unhandled: never = rule.ends
      throw new Error(`Unhandled end: ${JSON.stringify(unhandled)}`)
    }
  }
}

/** Moves `date` forward to the first day a weekly rule actually meets. */
export function alignToRule(date: Date, rule: RecurrenceRule | null) {
  if (!rule || rule.days.length === 0 || rule.frequency === 'daily') return date
  if (rule.frequency === 'monthly') return date
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDays(date, offset)
    if (rule.days.includes(candidate.getDay())) return candidate
  }
  return date
}
