import {
  ACTION_ITEMS,
  INSTANT_MEETING_LINK,
  UP_NEXT,
  YESTERDAY_RECAP,
} from '@/lib/demo-dashboard'
import type { ActionItem, Person, YesterdayRecap } from '@/lib/demo-dashboard'
import { NOW } from '@/lib/demo-meetings'
import { formatRelativeDay, formatSlot } from '@/lib/meeting-time'
import {
  TODAY,
  addDays,
  inferTitle,
  joinList,
  joinNames,
  parseIntent,
} from '@/lib/assistant/parse'
import type { ScheduleRequest } from '@/lib/assistant/parse'
import { getDaySchedule } from '@/lib/assistant/day'
import type { DayItem } from '@/lib/assistant/day'
import {
  CALENDAR,
  alignToRule,
  defaultOptions,
  describeRule,
  findConflicts,
  slotStartsAt,
  withOption,
  suggestAgenda,
  suggestSlots,
} from '@/lib/assistant/schedule'
import type {
  AgendaSuggestion,
  CalendarEntry,
  DraftField,
  MeetingDraft,
  MeetingOptions,
  Slot,
} from '@/lib/assistant/schedule'

export type SuggestionKind =
  'prep' | 'agenda' | 'schedule' | 'recap' | 'actions'

export type Suggestion = {
  kind: SuggestionKind
  label: string
  hint?: string
  prompt: string
}

export type PrepBrief = {
  startsIn: string
  context: readonly string[]
  sources: readonly string[]
  missing: readonly { label: string; prompt: string }[]
  agenda: readonly AgendaSuggestion[] | null
}

export type ScheduleResult = {
  kind: 'schedule'
  draft: MeetingDraft
  inferred: readonly DraftField[]
}

export type AssistantResult =
  | ScheduleResult
  | { kind: 'reschedule'; meeting: CalendarEntry; slot: Slot }
  | { kind: 'prep'; meeting: CalendarEntry; brief: PrepBrief }
  | { kind: 'day'; date: Date; items: readonly DayItem[] }
  | {
      kind: 'agenda'
      meeting: CalendarEntry
      agenda: readonly AgendaSuggestion[]
    }
  | { kind: 'recap'; recap: YesterdayRecap }
  | { kind: 'actions'; items: readonly ActionItem[] }
  | { kind: 'live' }
  | { kind: 'instant'; link: string }
  | { kind: 'join'; code: string }
  | { kind: 'help'; suggestions: readonly Suggestion[] }

export type AssistantReply = {
  text: string
  /** Shown one by one while the assistant "works". */
  steps: readonly string[]
  /** What it looked at, shown under the answer. */
  trace: readonly string[]
  result: AssistantResult
}

// What the assistant "remembers" from notes and past meetings.
const MEETING_CONTEXT: Record<
  string,
  { context: string[]; sources: string[] }
> = {
  'design-critique': {
    context: [
      'Yesterday’s Design sync decided to move onboarding to progressive profiling, so expect it to come up.',
      'Beta drop-off is concentrated on the workspace setup step.',
      'You own “Draft progressive profiling flow” (due Fri). Worth a mention.',
    ],
    sources: ['Design sync · Mon', 'Action items'],
  },
  'one-on-one-priya': {
    context: [
      'Priya sat on Monday’s hiring sync. The final designer panel still isn’t scheduled, and it’s overdue on your list.',
      'Confirm owners for the Q4 roadmap themes before Thursday.',
    ],
    sources: ['Hiring sync · Mon', 'Q4 roadmap review · today'],
  },
  'northwind-renewal': {
    context: [
      'No agenda or pre-read yet, and 2 of 3 guests haven’t replied.',
      'The pricing readout found that annual-first lifted conversion 11%. Useful framing for renewal terms.',
      'Sofia flagged that EU pricing copy still needs legal review.',
    ],
    sources: ['Pricing experiment readout · Mon'],
  },
  'mobile-beta-go-no-go': {
    context: [
      'The pre-read is missing. Marcus usually brings the crash-rate numbers.',
      'The recording export fix was in review at Monday’s standup.',
    ],
    sources: ['Daily standup · Mon'],
  },
}

const KNOWN_AGENDAS: Record<string, readonly AgendaSuggestion[]> = {
  'northwind-renewal': [
    {
      title: 'Year in review: usage, adoption and wins',
      owner: 'You',
      minutes: 10,
    },
    {
      title: 'Northwind’s priorities for next year',
      owner: 'James',
      minutes: 15,
    },
    {
      title: 'Renewal options: annual-first pricing and terms',
      owner: 'You',
      minutes: 15,
    },
    { title: 'Agree on next steps and owners', owner: 'Everyone', minutes: 5 },
  ],
  'mobile-beta-go-no-go': [
    {
      title: 'Beta metrics: crash rate and retention',
      owner: 'Marcus',
      minutes: 10,
    },
    {
      title: 'Open risks, including the recording export fix',
      owner: 'Daniel',
      minutes: 10,
    },
    { title: 'Go / no-go call', owner: 'You', minutes: 10 },
  ],
}

const OVERDUE_PANEL_PROMPT =
  'Schedule the final panel for the three designer candidates with the hiring panel tomorrow afternoon for an hour'

/** Prompts that let the assistant take an action item off your plate. */
export const ACTION_ITEM_PROMPTS: Record<string, string> = {
  'a-panel': OVERDUE_PANEL_PROMPT,
}

const MEETING_STOP_WORDS = new Set([
  'the',
  'for',
  'with',
  'and',
  'call',
  'meeting',
  'prep',
  'prepare',
  'agenda',
  'draft',
  'brief',
  'move',
  'reschedule',
  'push',
  'next',
  'our',
  'my',
])

function titleTokens(title: string) {
  return title
    .toLowerCase()
    .split(/[^a-z0-9:]+/)
    .filter((token) => token.length >= 3 && !MEETING_STOP_WORDS.has(token))
}

function upcoming() {
  return CALENDAR.filter((entry) => slotStartsAt(entry) > NOW)
}

/** The upcoming meeting a prompt refers to, if any. */
export function findMeeting(prompt: string): CalendarEntry | null {
  const text = prompt.toLowerCase()
  let best: CalendarEntry | null = null
  let bestScore = 0
  for (const entry of upcoming()) {
    const score =
      titleTokens(entry.title).filter((token) => text.includes(token)).length *
        2 +
      entry.attendees.filter((person) =>
        text.includes((person.name.split(' ')[0] ?? '').toLowerCase()),
      ).length
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return best
}

function startsIn(entry: CalendarEntry) {
  const minutes = Math.round(
    (slotStartsAt(entry).getTime() - NOW.getTime()) / 60_000,
  )
  if (minutes < 60) return `in ${minutes} min`
  if (entry.date.getTime() === TODAY.getTime()) {
    const hours = Math.floor(minutes / 60)
    return `in ${hours}h ${minutes % 60}m`
  }
  return `${formatRelativeDay(entry.date, NOW).toLowerCase()} at ${formatSlot(entry.start)}`
}

function shortTitle(title: string) {
  return title.split(/[·:]/)[0]?.trim() ?? title
}

export function getSuggestions(): Suggestion[] {
  const next = upcoming()[0]
  const needsAgenda = upcoming().find(
    (entry) =>
      entry.role === 'host' &&
      entry.prep?.checks.some(
        (check) => check.section === 'agenda' && !check.ok,
      ),
  )
  const yesterdayDecisions = YESTERDAY_RECAP.totals.decisions
  return [
    ...(next
      ? [
          {
            kind: 'prep' as const,
            label: `Prep me for ${shortTitle(next.title)}`,
            hint: startsIn(next),
            prompt: `Prep me for the ${next.title}`,
          },
        ]
      : []),
    ...(needsAgenda
      ? [
          {
            kind: 'agenda' as const,
            label: `Draft an agenda for ${needsAgenda.title.split(' · ')[0]}`,
            hint: 'No agenda yet',
            prompt: `Draft an agenda for the ${needsAgenda.title}`,
          },
        ]
      : []),
    {
      kind: 'schedule',
      label: 'Schedule the final designer panel',
      hint: 'Overdue',
      prompt: OVERDUE_PANEL_PROMPT,
    },
    {
      kind: 'recap',
      label: 'What did I miss yesterday?',
      hint: `${yesterdayDecisions} decisions`,
      prompt: 'What did I miss yesterday?',
    },
  ]
}

function prepBrief(entry: CalendarEntry): PrepBrief {
  const known = entry.detailId ? MEETING_CONTEXT[entry.detailId] : undefined
  // The agenda is the one gap the assistant can fill on its own.
  const missing = (entry.prep?.checks ?? [])
    .filter((check) => check.section === 'agenda' && !check.ok)
    .map(() => ({
      label: 'Draft the agenda',
      prompt: `Draft an agenda for the ${entry.title}`,
    }))
  return {
    startsIn: startsIn(entry),
    context: known?.context ?? [
      'No earlier notes mention this meeting.',
      `${entry.attendees.length} guests are invited.`,
    ],
    sources: known?.sources ?? [],
    missing,
    // Only agendas that already exist; drafting one is a separate action.
    agenda: entry.detailId === UP_NEXT.detailId ? UP_NEXT.agenda : null,
  }
}

function meetingAgenda(entry: CalendarEntry) {
  return (
    (entry.detailId && KNOWN_AGENDAS[entry.detailId]) ||
    suggestAgenda(entry.title, entry.end - entry.start, entry.attendees)
  )
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function when(slot: Slot) {
  return `${formatRelativeDay(slot.date, NOW).replace(/^(Today|Tomorrow)$/, (day) => day.toLowerCase())} at ${formatSlot(slot.start)}`
}

function draftSlotText(slot: Slot) {
  return /^\w{3},/.test(formatRelativeDay(slot.date, NOW))
    ? `on ${when(slot)}`
    : when(slot)
}

function planDraft(
  prompt: string,
  request: ScheduleRequest,
  base: { draft: MeetingDraft; inferred: readonly DraftField[] } | null,
): ScheduleResult {
  const people = new Map<string, Person>(
    (base?.draft.attendees ?? []).map((person) => [person.email, person]),
  )
  request.add.forEach((person) => people.set(person.email, person))
  request.remove.forEach((person) => people.delete(person.email))
  const attendees = [...people.values()]

  const baseDuration = base ? base.draft.end - base.draft.start : null
  const duration = request.duration ?? baseDuration ?? 30

  const titleWasGuessed = base?.inferred.includes('title') ?? true
  const { title, inferred: titleInferred } = request.title
    ? { title: request.title, inferred: false }
    : base && !titleWasGuessed
      ? { title: base.draft.title, inferred: false }
      : inferTitle(base ? '' : prompt, attendees)

  const rule = request.clearsRule
    ? null
    : (request.rule ?? base?.draft.rule ?? null)

  let date = request.date ?? (base && !request.window ? base.draft.date : null)
  let start =
    request.start ?? (base && !request.window ? base.draft.start : null)
  if (start !== null && date === null) {
    date =
      slotStartsAt({ date: TODAY, start, end: start }) > NOW
        ? TODAY
        : addDays(TODAY, 1)
  }
  if (date) date = alignToRule(date, rule)

  let picked = false
  if (start === null || date === null) {
    const from = alignToRule(
      date ?? request.date ?? base?.draft.date ?? TODAY,
      rule,
    )
    const [slot] = suggestSlots({
      from,
      duration,
      attendees,
      window: request.window,
      count: 1,
    })
    date = slot?.date ?? from
    start = slot?.start ?? 10 * 60
    picked = slot !== undefined
  }

  const finalRule =
    rule &&
    rule.days.length === 0 &&
    (rule.frequency === 'weekly' || rule.frequency === 'biweekly')
      ? { ...rule, days: [date.getDay()] }
      : rule

  const inferred: DraftField[] = ['agenda']
  if (titleInferred) inferred.push('title')
  if (
    picked ||
    (base?.inferred.includes('time') &&
      request.start === null &&
      request.date === null)
  ) {
    inferred.push('time')
  }
  if (request.duration === null && baseDuration === null)
    inferred.push('duration')
  else if (request.duration === null && base?.inferred.includes('duration')) {
    inferred.push('duration')
  }

  return {
    kind: 'schedule',
    inferred,
    draft: {
      title,
      date,
      start,
      end: start + duration,
      attendees,
      rule: finalRule,
      agenda: suggestAgenda(title, duration, attendees),
      options: (
        Object.entries(request.options) as [keyof MeetingOptions, boolean][]
      ).reduce(
        (options, [key, value]) => withOption(options, key, value),
        base?.draft.options ?? defaultOptions(attendees),
      ),
    },
  }
}

function scheduleReply(
  prompt: string,
  request: ScheduleRequest,
  base: { draft: MeetingDraft; inferred: readonly DraftField[] } | null,
): AssistantReply {
  const result = planDraft(prompt, request, base)
  const { draft } = result
  const conflicts = findConflicts(draft, draft.attendees)
  const busy = conflicts.filter((conflict) => conflict.kind === 'busy')
  const everyone = draft.attendees.length > 0 ? 'everyone' : 'you'
  const lead = base ? 'Updated. ' : ''

  let text: string
  if (conflicts.some((conflict) => conflict.kind === 'past')) {
    text = `${lead}That time has already passed. Pick one of the open times below.`
  } else if (busy.length > 0) {
    const who = [...new Set(busy.flatMap((conflict) => conflict.who))]
    text = `${lead}Heads up: ${joinList(who)} ${who.length === 1 && who[0] !== 'You' ? 'is' : 'are'} busy then. Here are times that work for ${everyone}.`
  } else if (result.inferred.includes('time') && !base) {
    text = `${draft.attendees.length > 0 ? 'Everyone’s' : 'You’re'} free ${draftSlotText(draft)}, so I drafted it for then. Check it over and send.`
  } else {
    text = `${lead}${capitalizeFirst(when(draft))} works for ${everyone}. Check it over and send.`
  }

  const trace = [
    `Checked ${plural(draft.attendees.length + 1, 'calendar')}`,
    ...(result.inferred.includes('time')
      ? ['Picked the earliest slot that suits everyone']
      : []),
    ...(draft.rule ? [describeRule(draft.rule, draft.date)] : []),
    'Suggested an agenda from the title',
  ]
  return {
    text,
    steps: [
      'Reading your request',
      draft.attendees.length > 0
        ? `Checking calendars for ${joinNames(draft.attendees)}`
        : 'Checking your calendar',
      base ? 'Updating the draft' : 'Drafting the invite',
    ],
    trace,
    result,
  }
}

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function rescheduleReply(
  meeting: CalendarEntry,
  request: ScheduleRequest,
): AssistantReply {
  const duration = meeting.end - meeting.start
  const original: Slot = {
    date: meeting.date,
    start: meeting.start,
    end: meeting.end,
  }
  let slot: Slot | undefined
  if (request.start !== null || request.date !== null) {
    const start = request.start ?? meeting.start
    slot = { date: request.date ?? meeting.date, start, end: start + duration }
  } else {
    slot = suggestSlots({
      from: meeting.date,
      duration,
      attendees: meeting.attendees,
      window: request.window,
      exclude: original,
      ignoreId: meeting.id,
      count: 12,
    }).find((candidate) => slotStartsAt(candidate) > slotStartsAt(original))
  }
  const target = slot ?? { ...original, date: addDays(original.date, 1) }
  const conflicts = findConflicts(target, meeting.attendees, meeting.id)
  return {
    text:
      conflicts.length === 0
        ? `${capitalizeFirst(when(target))} works for all ${plural(meeting.attendees.length, 'guest')}. I’ll send the update once you confirm.`
        : 'That time clashes for some guests. Pick another one below.',
    steps: [
      `Finding ${shortTitle(meeting.title)}`,
      `Checking ${plural(meeting.attendees.length + 1, 'calendar')}`,
      'Proposing a new time',
    ],
    trace: [`Checked ${plural(meeting.attendees.length + 1, 'calendar')}`],
    result: { kind: 'reschedule', meeting, slot: target },
  }
}

function helpReply(text: string): AssistantReply {
  return {
    text,
    steps: ['Thinking'],
    trace: [],
    result: { kind: 'help', suggestions: getSuggestions() },
  }
}

function dayReply(date: Date): AssistantReply {
  const items = getDaySchedule(date)
  const isToday = date.getTime() === TODAY.getTime()
  const dayName = isToday
    ? 'today'
    : formatRelativeDay(date, NOW).replace(/^Tomorrow$/, 'tomorrow')
  const live = items.find((item) => item.status === 'live')
  const upcoming = items.filter((item) => item.status === 'upcoming')
  const [next] = upcoming

  let text: string
  if (items.length === 0) {
    text = `Nothing on your calendar ${dayName === 'today' || dayName === 'tomorrow' ? dayName : `on ${dayName}`}. It’s all yours.`
  } else if (isToday && live) {
    text = `${live.title} is happening now, and you have ${plural(upcoming.length, 'more meeting')} after it.`
  } else if (isToday && next) {
    text = `You have ${plural(upcoming.length, 'meeting')} left today. ${next.title} is next, at ${formatSlot(next.start)}.`
  } else if (isToday) {
    text = 'You’re done for today. All your meetings have ended.'
  } else {
    const [first] = items
    text = `You have ${plural(items.length, 'meeting')} ${/^\w{3},/.test(dayName) ? `on ${dayName}` : dayName}${first ? `, starting with ${first.title} at ${formatSlot(first.start)}` : ''}.`
  }

  return {
    text,
    steps: ['Reading your calendar'],
    trace: [`${plural(items.length, 'meeting')} on your calendar`],
    result: { kind: 'day', date, items },
  }
}

export type ActiveDraft = {
  draft: MeetingDraft
  inferred: readonly DraftField[]
}

export function respond(
  prompt: string,
  active: ActiveDraft | null,
): AssistantReply {
  const intent = parseIntent(prompt, { hasDraft: active !== null })
  switch (intent.kind) {
    case 'schedule':
      return scheduleReply(prompt, intent.request, null)
    case 'refine':
      return scheduleReply(prompt, intent.request, active)
    case 'move': {
      const refersToDraft = /\bit\b/i.test(prompt) && active !== null
      const meeting = refersToDraft ? null : findMeeting(prompt)
      if (meeting) return rescheduleReply(meeting, intent.request)
      if (active) return scheduleReply(prompt, intent.request, active)
      return helpReply(
        'Which meeting should I move? Try “Move the Northwind call to Thursday at 11”.',
      )
    }
    case 'prep': {
      const meeting = findMeeting(prompt) ?? upcoming()[0]
      if (!meeting)
        return helpReply('You have nothing else coming up this week.')
      const brief = prepBrief(meeting)
      const accepted = meeting.prep?.rsvp
      return {
        text: `${meeting.title} starts ${brief.startsIn}.${accepted ? ` ${accepted.accepted} of ${accepted.total} guests have accepted.` : ''}${brief.missing.length > 0 ? ' The agenda is still missing.' : ' You’re ready.'}`,
        steps: [
          `Finding ${shortTitle(meeting.title)}`,
          'Reading the agenda, guests and past notes',
          'Writing your brief',
        ],
        trace:
          brief.sources.length > 0
            ? [`From ${brief.sources.join(', ')}`]
            : ['From the meeting details'],
        result: { kind: 'prep', meeting, brief },
      }
    }
    case 'day':
      return dayReply(intent.date)
    case 'agenda': {
      const meeting = findMeeting(prompt)
      if (!meeting) {
        return helpReply(
          'Which meeting is the agenda for? Try “Draft an agenda for the Northwind renewal call”.',
        )
      }
      const agenda = meetingAgenda(meeting)
      const minutes = meeting.end - meeting.start
      return {
        text: `Here’s a ${minutes}-minute agenda for ${meeting.title}. Edit it in the meeting or add it as is.`,
        steps: [
          `Reading ${shortTitle(meeting.title)}`,
          'Looking at related notes',
          `Fitting it into ${minutes} minutes`,
        ],
        trace: [
          `Time-boxed to ${minutes} min`,
          ...(meeting.detailId && MEETING_CONTEXT[meeting.detailId]
            ? [`From ${MEETING_CONTEXT[meeting.detailId]?.sources.join(', ')}`]
            : []),
        ],
        result: { kind: 'agenda', meeting, agenda },
      }
    }
    case 'recap':
      return {
        text: `Yesterday you had ${plural(YESTERDAY_RECAP.totals.meetings, 'meeting')} (${YESTERDAY_RECAP.totals.timeLabel}). Here’s what matters:`,
        steps: [
          `Reading notes from ${plural(YESTERDAY_RECAP.totals.meetings, 'meeting')}`,
          'Pulling out decisions',
        ],
        trace: [
          `From AI notes on ${plural(YESTERDAY_RECAP.totals.meetings, 'meeting')}`,
        ],
        result: { kind: 'recap', recap: YESTERDAY_RECAP },
      }
    case 'actions': {
      const open = ACTION_ITEMS.filter((item) => !item.done)
      const overdue = open.filter((item) => item.due.overdue).length
      return {
        text: `You have ${plural(open.length, 'open item')}${overdue > 0 ? `, ${overdue} overdue` : ''}. I can take the scheduling one off your plate.`,
        steps: ['Collecting action items from your meetings'],
        trace: ['From AI notes on your last 5 meetings'],
        result: {
          kind: 'actions',
          items: [...open].sort(
            (a, b) => Number(b.due.overdue) - Number(a.due.overdue),
          ),
        },
      }
    }
    case 'instant':
      return {
        text: 'Your room is ready. Recording and AI notes are on.',
        steps: ['Opening a room'],
        trace: [],
        result: { kind: 'instant', link: INSTANT_MEETING_LINK },
      }
    case 'live':
      return {
        text: 'I found four connected destinations. Review the saved stream details, add another destination if needed, then go live.',
        steps: ['Loading connected streaming destinations'],
        trace: [],
        result: { kind: 'live' },
      }
    case 'join':
      return {
        text: `Found meeting code ${intent.code}.`,
        steps: ['Looking up the code'],
        trace: [],
        result: { kind: 'join', code: intent.code },
      }
    case 'unknown':
      return helpReply(
        'I can schedule meetings and find times that work, prep you for calls, draft agendas, and recap what you missed. Try one of these:',
      )
    default: {
      const unhandled: never = intent
      throw new Error(`Unhandled intent: ${JSON.stringify(unhandled)}`)
    }
  }
}
