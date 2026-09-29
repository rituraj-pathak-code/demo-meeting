export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export type RecurrenceRule = {
  frequency: RecurrenceFrequency
  /** Weekdays (Date#getDay) for weekly and biweekly series. */
  days: readonly number[]
  ends:
    | { kind: 'never' }
    | { kind: 'on'; until: Date }
    | { kind: 'after'; count: number }
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  // Monday-based weeks, matching the day picker.
  const offset = (date.getDay() + 6) % 7
  return addDays(date, -offset)
}

/** Same weekday, same week-of-month (the "last" week stays last). */
function nextMonthly(first: Date, monthsAhead: number) {
  const weekday = first.getDay()
  const weekIndex = Math.min(Math.ceil(first.getDate() / 7), 5)
  const target = new Date(
    first.getFullYear(),
    first.getMonth() + monthsAhead,
    1,
  )
  const offset = (weekday - target.getDay() + 7) % 7
  let day = 1 + offset + (weekIndex - 1) * 7
  const daysInMonth = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate()
  while (day > daysInMonth) day -= 7
  return new Date(target.getFullYear(), target.getMonth(), day)
}

/** Expands a rule into concrete dates, starting at `first`, at most `limit` of them. */
export function expandRecurrence(
  first: Date,
  rule: RecurrenceRule,
  limit: number,
): Date[] {
  const max =
    rule.ends.kind === 'after' ? Math.min(rule.ends.count, limit) : limit
  const until =
    rule.ends.kind === 'on' ? rule.ends.until.getTime() + DAY_MS - 1 : Infinity
  const dates: Date[] = []

  function push(date: Date) {
    if (
      date.getTime() >= first.getTime() - DAY_MS + 1 &&
      date.getTime() <= until
    ) {
      dates.push(date)
    }
  }

  // Guard against rules that never produce a date (e.g. an empty day list).
  for (let step = 0; dates.length < max && step < 520; step += 1) {
    switch (rule.frequency) {
      case 'daily':
        push(addDays(first, step))
        break
      case 'monthly':
        push(step === 0 ? first : nextMonthly(first, step))
        break
      case 'weekly':
      case 'biweekly': {
        const weekStart = addDays(
          startOfWeek(first),
          step * (rule.frequency === 'weekly' ? 7 : 14),
        )
        const days = rule.days.length > 0 ? rule.days : [first.getDay()]
        ;[...days]
          .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
          .forEach((day) => push(addDays(weekStart, (day + 6) % 7)))
        break
      }
      default: {
        const unhandled: never = rule.frequency
        throw new Error(`Unhandled frequency: ${String(unhandled)}`)
      }
    }
    if (dates.length > 0 && dates[dates.length - 1]!.getTime() > until) break
  }

  return dates.slice(0, max)
}
