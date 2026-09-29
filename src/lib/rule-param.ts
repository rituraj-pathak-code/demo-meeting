import { fromDateParam, toDateParam } from '@/lib/meeting-time'
import type { RecurrenceFrequency, RecurrenceRule } from '@/lib/recurrence'

// A recurrence rule as it travels in the URL (dates as YYYY-MM-DD).
export type RuleParam = {
  frequency: RecurrenceFrequency
  days: number[]
  ends: 'never' | 'on' | 'after'
  until?: string
  count?: number
}

const FREQUENCIES: readonly RecurrenceFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
]

export function toRuleParam(rule: RecurrenceRule): RuleParam {
  return {
    frequency: rule.frequency,
    days: [...rule.days],
    ends: rule.ends.kind,
    until: rule.ends.kind === 'on' ? toDateParam(rule.ends.until) : undefined,
    count: rule.ends.kind === 'after' ? rule.ends.count : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validates an untrusted search value; returns undefined if it isn't a rule. */
export function parseRuleParam(value: unknown): RuleParam | undefined {
  if (!isRecord(value)) return undefined
  const { frequency, days, ends, until, count } = value
  if (!FREQUENCIES.some((option) => option === frequency)) return undefined
  if (
    !Array.isArray(days) ||
    !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  ) {
    return undefined
  }
  if (ends !== 'never' && ends !== 'on' && ends !== 'after') return undefined
  return {
    frequency: frequency as RecurrenceFrequency,
    days: days as number[],
    ends,
    until: typeof until === 'string' ? until : undefined,
    count:
      typeof count === 'number' && count > 0 ? Math.min(count, 500) : undefined,
  }
}

export function fromRuleParam(param: RuleParam): RecurrenceRule {
  const until = param.until ? fromDateParam(param.until) : undefined
  return {
    frequency: param.frequency,
    days: param.days,
    ends:
      param.ends === 'on' && until
        ? { kind: 'on', until }
        : param.ends === 'after' && param.count
          ? { kind: 'after', count: param.count }
          : { kind: 'never' },
  }
}
