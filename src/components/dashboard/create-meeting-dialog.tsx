import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Repeat } from 'lucide-react'
import { toast } from 'sonner'

import {
  DatePicker,
  TimeRangeSelects,
} from '@/components/meeting/date-time-fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatSlot, toDateParam } from '@/lib/meeting-time'
import type { RecurrenceRule } from '@/lib/recurrence'
import { toRuleParam } from '@/lib/rule-param'

// Mock "tomorrow" relative to the dashboard's frozen date (Tue, Sep 29).
const DEFAULT_DATE = new Date(2026, 8, 30)
const DEFAULT_UNTIL = new Date(2026, 11, 16)

const REPEAT_OPTIONS = [
  'none',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
] as const
type RepeatOption = (typeof REPEAT_OPTIONS)[number]

const END_OPTIONS = ['never', 'on', 'after'] as const
type EndOption = (typeof END_OPTIONS)[number]

const ORDINALS = ['first', 'second', 'third', 'fourth', 'last'] as const

// Monday-first, matching the rest of the app. `value` is Date#getDay().
const WEEKDAYS = [
  { value: 1, initial: 'M', short: 'Mon', long: 'Monday' },
  { value: 2, initial: 'T', short: 'Tue', long: 'Tuesday' },
  { value: 3, initial: 'W', short: 'Wed', long: 'Wednesday' },
  { value: 4, initial: 'T', short: 'Thu', long: 'Thursday' },
  { value: 5, initial: 'F', short: 'Fri', long: 'Friday' },
  { value: 6, initial: 'S', short: 'Sat', long: 'Saturday' },
  { value: 0, initial: 'S', short: 'Sun', long: 'Sunday' },
] as const

const WORKWEEK = [1, 2, 3, 4, 5]

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

function describeDays(days: ReadonlySet<number>) {
  if (days.size === 7) return 'every day'
  if (days.size === WORKWEEK.length && WORKWEEK.every((day) => days.has(day))) {
    return 'weekdays'
  }
  const selected = WEEKDAYS.filter((day) => days.has(day.value))
  if (selected.length === 1) return selected[0]?.long ?? ''
  return selected.map((day) => day.short).join(', ')
}

function repeatLabel(option: RepeatOption, date: Date) {
  const weekday = weekdayFormatter.format(date)
  switch (option) {
    case 'none':
      return 'Does not repeat'
    case 'daily':
      return 'Every day'
    case 'weekly':
      return 'Weekly'
    case 'biweekly':
      return 'Every 2 weeks'
    case 'monthly': {
      const ordinal = ORDINALS[Math.min(Math.ceil(date.getDate() / 7), 5) - 1]
      return `Monthly on the ${ordinal} ${weekday}`
    }
    default: {
      const unhandled: never = option
      throw new Error(`Unhandled repeat option: ${String(unhandled)}`)
    }
  }
}

function isRepeatOption(value: string): value is RepeatOption {
  return REPEAT_OPTIONS.some((option) => option === value)
}

function isEndOption(value: string): value is EndOption {
  return END_OPTIONS.some((option) => option === value)
}

type CreateMeetingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
}: CreateMeetingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* Content unmounts on close, so the form starts fresh every time. */}
        <CreateMeetingForm onCreated={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CreateMeetingForm({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [date, setDate] = useState(DEFAULT_DATE)
  const [start, setStart] = useState(10 * 60)
  const [end, setEnd] = useState(10 * 60 + 30)
  const [repeat, setRepeat] = useState<RepeatOption>('none')
  const [days, setDays] = useState<ReadonlySet<number>>(
    () => new Set([DEFAULT_DATE.getDay()]),
  )
  const [ends, setEnds] = useState<EndOption>('never')
  const [until, setUntil] = useState(DEFAULT_UNTIL)
  const [occurrences, setOccurrences] = useState('10')
  const [showErrors, setShowErrors] = useState(false)

  const nameMissing = name.trim() === ''
  function handleDateChange(next: Date) {
    setDate(next)
    if (until < next) setUntil(next)
    // If only the old date's weekday was picked, follow the new date.
    if (days.size === 1 && days.has(date.getDay())) {
      setDays(new Set([next.getDay()]))
    }
  }

  function toggleDay(day: number) {
    const next = new Set(days)
    if (next.has(day)) {
      // A weekly meeting needs at least one day.
      if (next.size === 1) return
      next.delete(day)
    } else {
      next.add(day)
    }
    setDays(next)
  }

  const repeatsOnDays = repeat === 'weekly' || repeat === 'biweekly'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nameMissing) {
      setShowErrors(true)
      return
    }
    // TODO: send the meeting to the scheduling API and use its id.
    void navigate({
      to: '/meetings/$meetingId',
      params: { meetingId: 'new' },
      search: {
        title: name.trim(),
        date: toDateParam(date),
        start,
        end,
        repeat: seriesLabel ?? undefined,
        rule: repeat === 'none' ? undefined : toRuleParam(buildRule(repeat)),
      },
    })
    toast.success('Meeting created', {
      description: 'Invite guests and add an agenda when you’re ready.',
    })
    onCreated()
  }

  function buildRule(frequency: Exclude<RepeatOption, 'none'>): RecurrenceRule {
    return {
      frequency,
      days: [...days],
      ends:
        ends === 'on'
          ? { kind: 'on', until }
          : ends === 'after'
            ? { kind: 'after', count: Math.max(Number(occurrences) || 1, 1) }
            : { kind: 'never' },
    }
  }

  const seriesLabel =
    repeat === 'none'
      ? null
      : `${repeatLabel(repeat, date)}${repeatsOnDays ? ` on ${describeDays(days)}` : ''}` +
        (ends === 'on'
          ? `, until ${shortDateFormatter.format(until)}`
          : ends === 'after'
            ? `, ${Math.max(Number(occurrences) || 1, 1)} meetings`
            : '')
  const recurrenceSummary =
    seriesLabel && `${seriesLabel} · ${formatSlot(start)} – ${formatSlot(end)}`

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
      <DialogHeader>
        <DialogTitle>Create a meeting</DialogTitle>
        <DialogDescription>
          Set a name and time. You can add guests after it’s created.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="meeting-name">Meeting name</Label>
          <Input
            id="meeting-name"
            autoFocus
            placeholder="e.g. Sprint planning"
            value={name}
            aria-invalid={showErrors && nameMissing}
            aria-describedby={
              showErrors && nameMissing ? 'meeting-name-error' : undefined
            }
            onChange={(event) => setName(event.target.value)}
          />
          {showErrors && nameMissing && (
            <p
              id="meeting-name-error"
              className="text-xs text-destructive-foreground"
            >
              Give your meeting a name so guests know what it’s about.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="meeting-date">Date</Label>
            <DatePicker
              id="meeting-date"
              value={date}
              onChange={handleDateChange}
            />
          </div>
          <TimeRangeSelects
            idPrefix="meeting"
            start={start}
            end={end}
            onChange={(range) => {
              setStart(range.start)
              setEnd(range.end)
            }}
          />
        </div>

        <div className="grid gap-4 rounded-lg border p-4">
          <div className="grid gap-2">
            <Label htmlFor="meeting-repeat" className="flex items-center gap-2">
              <Repeat className="size-3.5 text-muted-foreground" />
              Repeat
            </Label>
            <Select
              value={repeat}
              onValueChange={(value) => {
                if (isRepeatOption(value)) setRepeat(value)
              }}
            >
              <SelectTrigger id="meeting-repeat" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPEAT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {repeatLabel(option, date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {repeatsOnDays && (
            <div className="grid gap-2">
              <Label id="meeting-days-label">Repeat on</Label>
              <div
                role="group"
                aria-labelledby="meeting-days-label"
                className="flex flex-wrap gap-1.5"
              >
                {WEEKDAYS.map((day) => {
                  const selected = days.has(day.value)
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      size="icon-sm"
                      variant={selected ? 'default' : 'outline'}
                      className="rounded-full text-xs"
                      aria-label={day.long}
                      aria-pressed={selected}
                      title={day.long}
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.initial}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {repeat !== 'none' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="meeting-ends">Ends</Label>
                  <Select
                    value={ends}
                    onValueChange={(value) => {
                      if (isEndOption(value)) setEnds(value)
                    }}
                  >
                    <SelectTrigger id="meeting-ends" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="on">On a date</SelectItem>
                      <SelectItem value="after">
                        After a number of meetings
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ends === 'on' && (
                  <div className="grid gap-2">
                    <Label htmlFor="meeting-until">End date</Label>
                    <DatePicker
                      id="meeting-until"
                      value={until}
                      onChange={setUntil}
                      disabledBefore={date}
                    />
                  </div>
                )}
                {ends === 'after' && (
                  <div className="grid gap-2">
                    <Label htmlFor="meeting-occurrences">
                      Number of meetings
                    </Label>
                    <Input
                      id="meeting-occurrences"
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={100}
                      value={occurrences}
                      onChange={(event) => setOccurrences(event.target.value)}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {recurrenceSummary}
              </p>
            </>
          )}
        </div>

        <div className="divide-y rounded-lg border">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="grid gap-0.5">
              <Label htmlFor="meeting-record">Record meeting</Label>
              <p className="text-xs text-muted-foreground">
                Starts recording when the first guest joins
              </p>
            </div>
            <Switch id="meeting-record" defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="grid gap-0.5">
              <Label htmlFor="meeting-notes">AI notes & summary</Label>
              <p className="text-xs text-muted-foreground">
                Shared with attendees when the meeting ends
              </p>
            </div>
            <Switch id="meeting-notes" defaultChecked />
          </div>
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Create meeting</Button>
      </DialogFooter>
    </form>
  )
}
