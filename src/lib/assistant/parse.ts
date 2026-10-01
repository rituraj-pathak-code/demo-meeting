import { PEOPLE } from '@/lib/demo-dashboard'
import type { Person } from '@/lib/demo-dashboard'
import { DEMO_USER } from '@/lib/demo-data'
import { NOW } from '@/lib/demo-meetings'
import { parseInvitee } from '@/lib/guests'
import type { RecurrenceRule } from '@/lib/recurrence'
import type { MeetingOptions } from '@/lib/assistant/schedule'

// A rule-based stand-in for the language model: turns a typed request into
// a structured intent. Swap `parseIntent` for an LLM tool call later; the
// shapes below are the contract the UI renders from.

export type TimeWindow = { label: string; from: number; to: number }

export type ScheduleRequest = {
  title: string | null
  date: Date | null
  start: number | null
  duration: number | null
  window: TimeWindow | null
  add: readonly Person[]
  remove: readonly Person[]
  rule: RecurrenceRule | null
  /** "one-off", "don't repeat" — clears a rule on refinement. */
  clearsRule: boolean
  /** Only the options the request mentions, e.g. "no recording". */
  options: Partial<MeetingOptions>
}

export type Intent =
  | { kind: 'schedule'; request: ScheduleRequest }
  | { kind: 'refine'; request: ScheduleRequest }
  | { kind: 'move'; request: ScheduleRequest }
  | { kind: 'prep' }
  | { kind: 'day'; date: Date }
  | { kind: 'agenda' }
  | { kind: 'recap' }
  | { kind: 'actions' }
  | { kind: 'live' }
  | { kind: 'instant' }
  | { kind: 'join'; code: string }
  | { kind: 'unknown' }

export const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

const WEEKDAY_PATTERN =
  /\b(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)s?\b/gi
const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]
const MONTH_FIRST =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
const DAY_FIRST =
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i

function weekdayOf(token: string) {
  return WEEKDAY_INDEX[token.slice(0, 3).toLowerCase()]
}

function weekdaysIn(text: string) {
  const days = new Set<number>()
  for (const match of text.matchAll(WEEKDAY_PATTERN)) {
    const day = weekdayOf(match[1] ?? '')
    if (day !== undefined) days.add(day)
  }
  return [...days]
}

function monthDay(month: string, day: number) {
  const index = MONTHS.indexOf(month.slice(0, 3).toLowerCase())
  if (index < 0 || day < 1 || day > 31) return null
  const date = new Date(TODAY.getFullYear(), index, day)
  return date < TODAY ? new Date(TODAY.getFullYear() + 1, index, day) : date
}

function parseMonthDay(text: string) {
  const monthFirst = MONTH_FIRST.exec(text)
  if (monthFirst) return monthDay(monthFirst[1] ?? '', Number(monthFirst[2]))
  const dayFirst = DAY_FIRST.exec(text)
  if (dayFirst) return monthDay(dayFirst[2] ?? '', Number(dayFirst[1]))
  return null
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
}

function parseDate(text: string): Date | null {
  if (/\bday after tomorrow\b/.test(text)) return addDays(TODAY, 2)
  if (/\b(tomorrow|tmrw|tmr|tomorow)\b/.test(text)) return addDays(TODAY, 1)
  if (/\b(today|tonight|this (morning|afternoon|evening)|later)\b/.test(text)) {
    return TODAY
  }
  const relative =
    /\bin (\d+|a|an|one|two|three|four|five) (days?|weeks?)\b/.exec(text)
  if (relative) {
    const amount = NUMBER_WORDS[relative[1] ?? ''] ?? Number(relative[1])
    return addDays(TODAY, relative[2]?.startsWith('week') ? amount * 7 : amount)
  }
  const explicit = parseMonthDay(text)
  if (explicit) return explicit

  const weekday =
    /\b(next|this|on)?\s*(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)\b/.exec(
      text,
    )
  if (weekday) {
    const target = weekdayOf(weekday[2] ?? '')
    if (target !== undefined) {
      let offset = (target - TODAY.getDay() + 7) % 7 || 7
      // "next Thursday" said on a Tuesday means the Thursday after this one.
      const mondayIndex = (TODAY.getDay() + 6) % 7
      if (weekday[1] === 'next' && mondayIndex + offset < 7) offset += 7
      return addDays(TODAY, offset)
    }
  }
  if (/\bnext week\b/.test(text)) {
    return addDays(TODAY, (8 - TODAY.getDay()) % 7 || 7)
  }
  if (/\bthis week\b/.test(text)) return TODAY
  return null
}

function toMinutes(hour: number, minute: number, meridiem: string | undefined) {
  let h = hour
  const suffix = meridiem?.replace(/\./g, '').toLowerCase()
  if (suffix === 'pm' && h < 12) h += 12
  if (suffix === 'am' && h === 12) h = 0
  // Bare "at 3" in a work context means the afternoon.
  if (!suffix && h >= 1 && h <= 7) h += 12
  if (h > 23 || minute > 59) return null
  return h * 60 + minute
}

const RANGE =
  /\b(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
const CLOCK = [
  /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/,
  /(?:\b(?:at|@|from|around|by)\s*)(\d{1,2})(?::(\d{2}))?\b/,
  /\b(\d{1,2}):(\d{2})\b/,
]

function parseTime(text: string): { start: number; end: number | null } | null {
  const range = RANGE.exec(text)
  if (range) {
    const end = toMinutes(Number(range[4]), Number(range[5] ?? 0), range[6])
    if (end !== null) {
      const startHour = Number(range[1])
      const startMinute = Number(range[2] ?? 0)
      let start = toMinutes(startHour, startMinute, range[3] ?? range[6])
      if (start !== null && start >= end && !range[3]) {
        start = toMinutes(startHour, startMinute, 'am')
      }
      if (start !== null && start < end) return { start, end }
    }
  }
  if (/\bnoon\b/.test(text)) return { start: 12 * 60, end: null }
  for (const pattern of CLOCK) {
    const match = pattern.exec(text)
    if (!match) continue
    const start = toMinutes(Number(match[1]), Number(match[2] ?? 0), match[3])
    if (start !== null) return { start, end: null }
  }
  return null
}

function parseDuration(text: string): number | null {
  if (/\bhour and a half\b/.test(text)) return 90
  if (/\bhalf(?: an|-)? ?hour\b/.test(text)) return 30
  const hours =
    /\b(\d+(?:\.\d+)?)\s*-?\s*(?:h|hr|hrs|hour|hours)\b(?:\s*(?:and\s*)?(\d+)\s*-?\s*(?:m|min|mins|minutes?)\b)?/.exec(
      text,
    )
  if (hours) return Math.round(Number(hours[1]) * 60 + Number(hours[2] ?? 0))
  const minutes = /\b(\d+)\s*-?\s*(?:m|min|mins|minutes?)\b/.exec(text)
  if (minutes) return Number(minutes[1])
  if (/\b(?:an|one) hour\b|\bhour-long\b/.test(text)) return 60
  if (/\bquick\b/.test(text)) return 15
  return null
}

const WINDOWS: readonly (TimeWindow & { pattern: RegExp })[] = [
  { label: 'morning', from: 9 * 60, to: 12 * 60, pattern: /\bmorning\b/ },
  { label: 'lunch', from: 12 * 60, to: 13 * 60 + 30, pattern: /\blunch\b/ },
  {
    label: 'afternoon',
    from: 13 * 60,
    to: 17 * 60,
    pattern: /\bafternoon|after lunch\b/,
  },
  {
    label: 'end of day',
    from: 16 * 60,
    to: 18 * 60,
    pattern: /\bevening|end of (?:the )?day|eod\b/,
  },
]

function parseWindow(text: string): TimeWindow | null {
  const match = WINDOWS.find((window) => window.pattern.test(text))
  return match ? { label: match.label, from: match.from, to: match.to } : null
}

export const DIRECTORY: readonly Person[] = Object.values(PEOPLE).filter(
  (person) => person.email !== DEMO_USER.email,
)

const INTERNAL = DIRECTORY.filter((person) =>
  person.email.endsWith('@leapcast.io'),
)

const TEAMS: readonly { pattern: RegExp; people: readonly Person[] }[] = [
  {
    pattern: /\bdesign(?:ers)? team\b|\bdesigners\b/,
    people: [PEOPLE.ananya, PEOPLE.marcus, PEOPLE.sofia, PEOPLE.leah],
  },
  {
    pattern: /\bhiring (?:panel|team)\b|\binterview panel\b/,
    people: [PEOPLE.priya, PEOPLE.sofia, PEOPLE.ananya],
  },
  { pattern: /\bnorthwind\b/, people: [PEOPLE.james, PEOPLE.elena] },
  {
    pattern: /\b(?:whole|entire|product) team\b|\beveryone\b/,
    people: INTERNAL,
  },
]

const EMAIL_PATTERN = /[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}/g

const REMOVAL =
  /\b(without|remove|drop|minus|exclude|except|uninvite|take off)\b/

function parsePeople(text: string) {
  const removalAt = REMOVAL.exec(text)?.index ?? Infinity
  const add = new Map<string, Person>()
  const remove = new Map<string, Person>()
  function place(person: Person, index: number) {
    const target = index > removalAt ? remove : add
    target.set(person.email, person)
  }

  // Blank out emails (keeping offsets) so "@northwind.com" isn't a team.
  const words = text.replace(EMAIL_PATTERN, (email) => ' '.repeat(email.length))
  for (const person of DIRECTORY) {
    const [first = '', last = ''] = person.name.toLowerCase().split(' ')
    const match = new RegExp(`\\b(${first}|${last})\\b`).exec(words)
    if (match) place(person, match.index)
  }
  for (const team of TEAMS) {
    const match = team.pattern.exec(words)
    if (match) team.people.forEach((person) => place(person, match.index))
  }
  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const email = match[0]
    const known = DIRECTORY.find((person) => person.email === email)
    const parsed = parseInvitee(email, [])
    if (known) place(known, match.index)
    else if (parsed.ok && email !== DEMO_USER.email) {
      place({ name: parsed.guest.name, email: parsed.guest.email }, match.index)
    }
  }
  return { add: [...add.values()], remove: [...remove.values()] }
}

/** Weekly rules with no named day come back with `days: []`; the planner
 * fills in the meeting's own weekday once the date is known. */
function parseRule(text: string): RecurrenceRule | null {
  const named = weekdaysIn(text)
  let rule: RecurrenceRule | null = null

  if (
    /\b(every weekday|weekdays|each weekday|mon(?:day)?\s*(?:-|to|through|thru)\s*fri(?:day)?)\b/.test(
      text,
    )
  ) {
    rule = {
      frequency: 'weekly',
      days: [1, 2, 3, 4, 5],
      ends: { kind: 'never' },
    }
  } else if (/\b(every ?day|daily|each day)\b/.test(text)) {
    rule = { frequency: 'daily', days: [], ends: { kind: 'never' } }
  } else if (
    /\b(every other week|bi-?weekly|fortnightly|every (?:2|two) weeks)\b/.test(
      text,
    )
  ) {
    rule = {
      frequency: 'biweekly',
      days: named,
      ends: { kind: 'never' },
    }
  } else if (/\b(monthly|every month|once a month)\b/.test(text)) {
    rule = { frequency: 'monthly', days: [], ends: { kind: 'never' } }
  } else if (
    /\b(weekly|every week|each week|once a week|recurring)\b/.test(text) ||
    /\bevery (mon|tue|wed|thu|fri|sat|sun)/.test(text) ||
    /\b(mondays|tuesdays|wednesdays|thursdays|fridays)\b/.test(text)
  ) {
    rule = {
      frequency: 'weekly',
      days: named,
      ends: { kind: 'never' },
    }
  }
  if (!rule) return null

  const count =
    /\bfor (\d+) (weeks?|months?|sessions?|meetings?|times|occurrences)\b/.exec(
      text,
    )
  if (count) {
    const n = Number(count[1])
    const perWeek = Math.max(rule.days.length, 1)
    const total = count[2]?.startsWith('week')
      ? rule.frequency === 'daily'
        ? n * 7
        : rule.frequency === 'biweekly'
          ? Math.ceil(n / 2) * perWeek
          : n * perWeek
      : n
    return { ...rule, ends: { kind: 'after', count: Math.max(total, 1) } }
  }
  const until = /\buntil (.+)$/.exec(text)
  const untilDate = until ? parseMonthDay(until[1] ?? '') : null
  if (untilDate) return { ...rule, ends: { kind: 'on', until: untilDate } }
  return rule
}

const STOP_WORDS =
  'with|on|at|tomorrow|today|tonight|next|this|every|in|from|between|by|around|before|after|starting|and invite|inviting'
const VERBS =
  'schedule|set ?up|book|create|plan|arrange|organi[sz]e|put|add|make|start|set|find|get|need|want'
const GENERIC =
  /^(meeting|call|time|slot|chat|session|meet|something|a time|some time|video call|invite)$/
const PAIR_PHRASES =
  /^(sync|1:1|one[- ]on[- ]one|catch[- ]?up|chat|call|coffee|check[- ]?in|meeting)$/

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function stripNoise(phrase: string) {
  return phrase
    .replace(
      /\b\d+(?:\.\d+)?\s*-?\s*(?:h|hr|hrs|hours?|m|min|mins|minutes?)(?:-long)?\b/gi,
      '',
    )
    .replace(/\b(?:half[- ]hour|hour-long|quick|new|recurring)\b/gi, '')
    .replace(/\b(?:for|to|about|and|the|a|an|me|us)\s*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function joinList(names: readonly string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`
}

export function joinNames(people: readonly Person[]) {
  return joinList(
    people.map((person) => person.name.split(' ')[0] ?? person.name),
  )
}

/** Returns the title the request implies, and whether it was guessed. */
export function inferTitle(
  raw: string,
  attendees: readonly Person[],
): { title: string; inferred: boolean } {
  const explicit = parseExplicitTitle(raw)
  if (explicit) return { title: explicit, inferred: false }

  // Match on the raw text so proper nouns ("Northwind") keep their case.
  const phrase = new RegExp(
    `^\\s*(?:please\\s+)?(?:(?:can|could) you\\s+)?(?:(?:i|we)(?:'d| would)?\\s+(?:like to\\s+)?)?(?:(?:${VERBS})\\s+)?(?:(?:me|us)\\s+)?(?:a|an|the|my|our|some)?\\s*(.+?)(?=\\s+\\b(?:${STOP_WORDS})\\b|[.,;!?]|$)`,
    'i',
  ).exec(raw)
  const noun = stripNoise(phrase?.[1] ?? '')
  const lower = noun.toLowerCase()

  if (noun && !GENERIC.test(lower)) {
    const wordCount = noun.split(' ').length
    if (
      PAIR_PHRASES.test(lower) &&
      attendees.length > 0 &&
      attendees.length <= 2
    ) {
      return {
        title: `${capitalize(noun)} with ${joinNames(attendees)}`,
        inferred: false,
      }
    }
    if (wordCount <= 8) return { title: capitalize(noun), inferred: false }
  }
  if (attendees.length > 0 && attendees.length <= 3) {
    return { title: `Sync with ${joinNames(attendees)}`, inferred: true }
  }
  return {
    title: attendees.length > 3 ? 'Team sync' : 'New meeting',
    inferred: true,
  }
}

function parseExplicitTitle(raw: string): string | null {
  const quoted = /["“]([^"”]{2,80})["”]/.exec(raw)
  if (quoted?.[1]) return quoted[1].trim()
  const rename =
    /\b(?:call it|name it|rename (?:it )?to|title it)\s+(.+?)[.!]?$/i.exec(raw)
  if (rename?.[1]) return capitalize(rename[1].trim())
  const called =
    /\b(?:called|titled|named)\s+(.+?)(?=\s+\b(?:with|on|at|tomorrow|today|next|every|from)\b|[.,;]|$)/i.exec(
      raw,
    )
  if (called?.[1]) return capitalize(called[1].trim())
  const topic =
    /\b(?:to discuss|discuss|about|regarding|to talk about|to go over)\s+(?:the\s+)?(.+?)(?=\s+\b(?:with|tomorrow|today|next|every|at|on (?:mon|tue|wed|thu|fri))\b|[.,;]|$)/i.exec(
      raw,
    )
  if (topic?.[1] && topic[1].split(' ').length <= 8) {
    return capitalize(topic[1].trim())
  }
  return null
}

/** The scheduling details in a request, whatever its intent. */
export function parseScheduleRequest(raw: string): ScheduleRequest {
  const text = raw.toLowerCase()
  const people = parsePeople(text)
  const time = parseTime(text)
  const rangeDuration = time?.end != null ? time.end - time.start : null
  const ruleText =
    /\bevery|weekly|daily|monthly|weekdays|bi-?weekly|fortnightly|recurring|mondays|tuesdays|wednesdays|thursdays|fridays\b/.test(
      text,
    )
  // In "every Tuesday", the weekday sets the rule, not a one-off date.
  const date = ruleText
    ? (parseDate(text.replace(WEEKDAY_PATTERN, '')) ?? null)
    : parseDate(text)
  const explicitTitle = parseExplicitTitle(raw)
  const duration = rangeDuration ?? parseDuration(text)

  return {
    title: explicitTitle,
    date,
    start: time?.start ?? null,
    duration: duration === null ? null : Math.min(Math.max(duration, 10), 240),
    window: time ? null : parseWindow(text),
    add: people.add,
    remove: people.remove,
    rule: parseRule(text),
    clearsRule:
      /\b(one-?off|don'?t repeat|no repeat|not recurring|just once)\b/.test(
        text,
      ),
    options: parseOptions(text),
  }
}

const OFF =
  /\b(?:no|without|don'?t|do not|turn off|switch off|disable|skip|stop)\s+(?:the\s+|a\s+)?/
    .source
const ON = /\b(?:with|turn on|switch on|enable|add|use|keep)\s+(?:the\s+|a\s+)?/
  .source

const OPTION_PATTERNS: Record<keyof MeetingOptions, string> = {
  record: /record(?:ing|ed)?/.source,
  transcript: /transcri(?:pt|ption)s?|captions?/.source,
  aiNotes: /(?:ai\s+)?notes|summary|summaries/.source,
  waitingRoom: /waiting\s+room|lobby/.source,
}

const OPTION_KEYS = Object.keys(OPTION_PATTERNS) as (keyof MeetingOptions)[]

function parseOptions(text: string): Partial<MeetingOptions> {
  const options: Partial<MeetingOptions> = {}
  for (const key of OPTION_KEYS) {
    const pattern = OPTION_PATTERNS[key]
    if (new RegExp(`${OFF}(?:${pattern})\\b`).test(text)) options[key] = false
    else if (new RegExp(`${ON}(?:${pattern})\\b`).test(text)) {
      options[key] = true
    }
  }
  if (
    options.record === undefined &&
    /\brecord (?:it|this|the meeting)\b/.test(text)
  ) {
    options.record = true
  }
  return options
}

function hasScheduleDetails(request: ScheduleRequest) {
  return (
    Object.keys(request.options).length > 0 ||
    request.title !== null ||
    request.date !== null ||
    request.start !== null ||
    request.duration !== null ||
    request.window !== null ||
    request.add.length > 0 ||
    request.remove.length > 0 ||
    request.rule !== null ||
    request.clearsRule
  )
}

const JOIN_CODE = /\b([a-z]{3}-[a-z]{4}-[a-z]{3})\b/

export function parseIntent(
  raw: string,
  context: { hasDraft: boolean },
): Intent {
  const text = raw.toLowerCase().trim()
  const request = parseScheduleRequest(raw)
  const hasWhen = request.date !== null || request.start !== null

  const code = JOIN_CODE.exec(text)
  if (code?.[1] && /\bjoin\b|leapcast\.io\/j\//.test(text)) {
    return { kind: 'join', code: code[1] }
  }
  if (
    /\b(go live|start (?:a |the )?(?:live ?stream|broadcast)|live ?stream now)\b/.test(
      text,
    )
  ) {
    return { kind: 'live' }
  }
  if (
    /\b(instant meeting|meet now|right now|start (?:a |an )?(?:meeting|call|room)|open a room|quick room)\b/.test(
      text,
    ) &&
    !hasWhen
  ) {
    return { kind: 'instant' }
  }
  if (/\bagenda\b/.test(text) && !/\bschedule\b/.test(text)) {
    return { kind: 'agenda' }
  }
  if (
    /\b(prep|prepare|brief me|briefing|get me ready|ready for|context (?:for|on)|what should i know)\b/.test(
      text,
    )
  ) {
    return { kind: 'prep' }
  }
  // "What meetings do I have today?", "What's on tomorrow?", "My schedule".
  const asksAboutDay =
    /\b(how busy|am i free|my day)\b/.test(text) ||
    (/\b(what|which|show|list|any|how many|how busy|do i have|what's|whats|my)\b/.test(
      text,
    ) &&
      /\b(meetings?|calls?|schedule|calendar|on (?:today|tomorrow)|what's next|whats next|my day|agenda for (?:today|tomorrow))\b/.test(
        text,
      ) &&
      !/\b(schedule|book|set up|create) (?:a|an|the|my|some)\b/.test(text))
  if (asksAboutDay) {
    return { kind: 'day', date: parseDate(text) ?? TODAY }
  }
  if (/\b(move|reschedule|push|postpone|shift|bump)\b/.test(text)) {
    return { kind: 'move', request }
  }
  if (
    new RegExp(
      `\\b(schedule|set ?up|book|create|plan|arrange|organi[sz]e|find (?:a |some )?(?:time|slot|\\d+)|put (?:a|an|some)|add (?:a|an) (?:meeting|call|sync)|new meeting|meet with|sync with|catch up with|call with|set a)\\b`,
    ).test(text)
  ) {
    return { kind: 'schedule', request }
  }
  if (
    /\b(recap|summari[sz]e|summary|what did i miss|catch me up|yesterday|decisions?|what happened|highlights)\b/.test(
      text,
    )
  ) {
    return { kind: 'recap' }
  }
  if (
    /\b(action items?|to-?dos?|tasks?|follow[- ]?ups?|what do i owe|on my plate|overdue|pending)\b/.test(
      text,
    )
  ) {
    return { kind: 'actions' }
  }
  const namesMeeting =
    /\b(1:1|one[- ]on[- ]one|meeting|call|sync|standup|kick-?off|review|interview|chat)\b/.test(
      text,
    )
  const soundsLikeEdit =
    /\b(it|make|add|also|too|instead|change|switch|remove|without|drop|only|rather|actually|shorter|longer|invite)\b/.test(
      text,
    )
  if (
    context.hasDraft &&
    hasScheduleDetails(request) &&
    (soundsLikeEdit || !namesMeeting)
  ) {
    return { kind: 'refine', request }
  }
  if (
    (request.add.length > 0 || request.rule !== null) &&
    (hasWhen || namesMeeting)
  ) {
    return { kind: 'schedule', request }
  }
  return { kind: 'unknown' }
}
