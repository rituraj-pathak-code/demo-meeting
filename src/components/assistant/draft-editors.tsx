import { useId, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import {
  ChevronDown,
  Circle,
  DoorOpen,
  FileText,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DIRECTORY, TODAY } from '@/lib/assistant/parse'
import { describeRule, isExternal, withOption } from '@/lib/assistant/schedule'
import type { AgendaSuggestion, MeetingOptions } from '@/lib/assistant/schedule'
import type { Person } from '@/lib/demo-dashboard'
import { parseInvitee } from '@/lib/guests'
import { formatDuration, formatLongDate, formatSlot } from '@/lib/meeting-time'
import type { RecurrenceRule } from '@/lib/recurrence'
import { cn, getInitials } from '@/lib/utils'

// Inline editors for the AI draft card: each value reads as text and
// opens a small editor in place when clicked.

const PILL =
  'inline-flex h-7 items-center gap-1 rounded-md px-1.5 -mx-1.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-muted'

function PillContent({
  children,
  muted = false,
}: {
  children: ReactNode
  muted?: boolean
}) {
  return (
    <>
      <span className={cn(muted && 'text-muted-foreground')}>{children}</span>
      <ChevronDown aria-hidden className="size-3 text-muted-foreground" />
    </>
  )
}

export function DatePill({
  value,
  onChange,
}: {
  value: Date
  onChange: (date: Date) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={PILL} aria-label="Change date">
        <PillContent>{formatLongDate(value)}</PillContent>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          selected={value}
          defaultMonth={value}
          disabled={{ before: TODAY }}
          onSelect={(next) => {
            onChange(next)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// Quarter-hour starts across the working day, 7:00 AM – 9:45 PM.
const START_OPTIONS = Array.from({ length: 60 }, (_, i) => 7 * 60 + i * 15)
const LENGTH_OPTIONS = [15, 30, 45, 60, 90, 120]

export function TimePill({
  start,
  end,
  onChange,
}: {
  start: number
  end: number
  onChange: (range: { start: number; end: number }) => void
}) {
  // The thread can render twice (dashboard + ⌘K), so ids must be unique.
  const id = useId()
  const length = end - start
  const lengths = LENGTH_OPTIONS.includes(length)
    ? LENGTH_OPTIONS
    : [...LENGTH_OPTIONS, length].sort((a, b) => a - b)
  const starts = START_OPTIONS.includes(start)
    ? START_OPTIONS
    : [...START_OPTIONS, start].sort((a, b) => a - b)

  return (
    <Popover>
      <PopoverTrigger className={PILL} aria-label="Change time">
        <PillContent muted>
          {formatSlot(start)} – {formatSlot(end)} · {formatDuration(length)}
        </PillContent>
      </PopoverTrigger>
      <PopoverContent className="grid w-72 gap-3" align="start">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-start`} className="text-xs">
              Start
            </Label>
            <Select
              value={String(start)}
              onValueChange={(value) =>
                onChange({ start: Number(value), end: Number(value) + length })
              }
            >
              <SelectTrigger id={`${id}-start`} size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {starts.map((slot) => (
                  <SelectItem key={slot} value={String(slot)}>
                    {formatSlot(slot)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-length`} className="text-xs">
              Length
            </Label>
            <Select
              value={String(length)}
              onValueChange={(value) =>
                onChange({ start, end: start + Number(value) })
              }
            >
              <SelectTrigger id={`${id}-length`} size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lengths.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {formatDuration(minutes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ends at {formatSlot(end)}. I’ll recheck everyone’s calendar.
        </p>
      </PopoverContent>
    </Popover>
  )
}

const REPEAT_OPTIONS = [
  'none',
  'daily',
  'weekdays',
  'weekly',
  'biweekly',
  'monthly',
] as const
type RepeatOption = (typeof REPEAT_OPTIONS)[number]

function isRepeatOption(value: string): value is RepeatOption {
  return REPEAT_OPTIONS.some((option) => option === value)
}

function repeatOptionOf(rule: RecurrenceRule | null): RepeatOption {
  if (!rule) return 'none'
  if (
    rule.frequency === 'weekly' &&
    rule.days.length === 5 &&
    [1, 2, 3, 4, 5].every((day) => rule.days.includes(day))
  ) {
    return 'weekdays'
  }
  return rule.frequency
}

function ruleFor(
  option: Exclude<RepeatOption, 'none'>,
  date: Date,
  ends: RecurrenceRule['ends'],
): RecurrenceRule {
  switch (option) {
    case 'daily':
    case 'monthly':
      return { frequency: option, days: [], ends }
    case 'weekdays':
      return { frequency: 'weekly', days: [1, 2, 3, 4, 5], ends }
    case 'weekly':
    case 'biweekly':
      return { frequency: option, days: [date.getDay()], ends }
    default: {
      const unhandled: never = option
      throw new Error(`Unhandled repeat option: ${String(unhandled)}`)
    }
  }
}

export function RepeatPill({
  rule,
  date,
  onChange,
}: {
  rule: RecurrenceRule | null
  date: Date
  onChange: (rule: RecurrenceRule | null) => void
}) {
  const ends = rule?.ends ?? { kind: 'never' }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={PILL} aria-label="Change repeat">
        <PillContent muted={!rule}>
          {rule ? describeRule(rule, date) : 'Does not repeat'}
        </PillContent>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuRadioGroup
          value={repeatOptionOf(rule)}
          onValueChange={(value) => {
            if (!isRepeatOption(value)) return
            onChange(value === 'none' ? null : ruleFor(value, date, ends))
          }}
        >
          {REPEAT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {option === 'none'
                ? 'Does not repeat'
                : describeRule(ruleFor(option, date, { kind: 'never' }), date)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AddGuestButton({
  invited,
  onAdd,
}: {
  invited: readonly Person[]
  onAdd: (person: Person) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const text = query.trim().toLowerCase()
  const matches = DIRECTORY.filter(
    (person) =>
      !invited.some((guest) => guest.email === person.email) &&
      (text === '' ||
        person.name.toLowerCase().includes(text) ||
        person.email.includes(text)),
  ).slice(0, 6)

  function add(person: Person) {
    onAdd(person)
    setQuery('')
    setError(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const [first] = matches
    if (first) return add(first)
    const result = parseInvitee(query, invited)
    if (result.ok) add({ name: result.guest.name, email: result.guest.email })
    else setError(result.error)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setQuery('')
        setError(null)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 rounded-full border border-dashed px-2.5 text-muted-foreground"
        >
          <Plus />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-72 gap-2 p-2" align="start">
        <Input
          autoFocus
          aria-label="Add a guest by name or email"
          placeholder="Name or email"
          value={query}
          aria-invalid={error !== null}
          onChange={(event) => {
            setQuery(event.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          className="h-8"
        />
        {error && (
          <p className="px-1 text-xs text-destructive-foreground">{error}</p>
        )}
        <ul className="grid">
          {matches.map((person) => (
            <li key={person.email}>
              <button
                type="button"
                onClick={() => add(person)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.6rem] font-medium">
                  {getInitials(person.name)}
                </span>
                <span className="grid min-w-0">
                  <span className="truncate">{person.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {person.email}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 && text !== '' && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              Press Enter to invite {query.trim()}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

const INLINE_INPUT =
  'min-w-0 rounded-md bg-transparent px-1.5 py-0.5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40'

export function AgendaEditor({
  agenda,
  duration,
  onChange,
}: {
  agenda: readonly AgendaSuggestion[]
  duration: number
  onChange: (agenda: AgendaSuggestion[]) => void
}) {
  const total = agenda.reduce((sum, item) => sum + item.minutes, 0)

  function update(index: number, patch: Partial<AgendaSuggestion>) {
    onChange(
      agenda.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }

  return (
    <>
      <ol className="grid gap-0.5 px-1.5 py-1.5">
        {agenda.map((item, index) => (
          // Items have no ids yet; order is the identity while editing.
          <li key={index} className="group flex items-center gap-1 text-sm">
            <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {index + 1}.
            </span>
            <input
              aria-label={`Agenda item ${index + 1}`}
              value={item.title}
              placeholder="New item"
              // A freshly added (empty, last) row takes focus when it mounts.
              autoFocus={index === agenda.length - 1 && item.title === ''}
              onChange={(event) => update(index, { title: event.target.value })}
              className={cn(INLINE_INPUT, 'flex-1')}
            />
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.owner} ·
            </span>
            <span className="flex shrink-0 items-center text-xs text-muted-foreground">
              <input
                aria-label={`Minutes for item ${index + 1}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={item.minutes}
                onChange={(event) =>
                  update(index, {
                    minutes: Math.max(0, Number(event.target.value) || 0),
                  })
                }
                className={cn(
                  INLINE_INPUT,
                  'w-9 px-1 text-right text-xs text-muted-foreground tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
                )}
              />
              m
            </span>
            <button
              type="button"
              aria-label={`Remove ${item.title || 'item'}`}
              onClick={() => onChange(agenda.filter((_, i) => i !== index))}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2 border-t px-3 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="-ml-1.5 text-muted-foreground"
          onClick={() =>
            onChange([
              ...agenda,
              {
                title: '',
                owner: 'You',
                minutes: Math.max(5, duration - total),
              },
            ])
          }
        >
          <Plus />
          Add item
        </Button>
        <span
          className={cn(
            'ml-auto text-xs tabular-nums',
            total > duration
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
        >
          {total} of {duration} min
          {total > duration && ' · runs over'}
        </span>
      </div>
    </>
  )
}

const OPTION_ROWS: readonly {
  key: keyof MeetingOptions
  icon: LucideIcon
  label: string
  description: string
}[] = [
  {
    key: 'record',
    icon: Circle,
    label: 'Record',
    description: 'Starts when the first guest joins',
  },
  {
    key: 'transcript',
    icon: FileText,
    label: 'Transcript',
    description: 'Live captions and a searchable transcript',
  },
  {
    key: 'aiNotes',
    icon: Sparkles,
    label: 'AI notes & summary',
    description: 'Shared with attendees when it ends',
  },
  {
    key: 'waitingRoom',
    icon: DoorOpen,
    label: 'Waiting room',
    description: 'People outside your workspace wait to be let in',
  },
]

export function MeetingOptionsEditor({
  options,
  attendees,
  onChange,
}: {
  options: MeetingOptions
  attendees: readonly Person[]
  onChange: (options: MeetingOptions) => void
}) {
  const idPrefix = useId()
  const external = attendees.filter(isExternal)

  function hint(key: keyof MeetingOptions) {
    if (key === 'aiNotes' && !options.transcript) {
      return 'Turns the transcript on too'
    }
    if (key === 'waitingRoom' && external.length > 0) {
      const [first] = external
      return `Recommended: ${first?.name.split(' ')[0]}${external.length > 1 ? ` and ${external.length - 1} more are` : ' is'} external`
    }
    return null
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {OPTION_ROWS.map(({ key, icon: Icon, label, description }) => {
        const id = `${idPrefix}-${key}`
        const on = options[key]
        const note = hint(key)
        return (
          <li
            key={key}
            className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                on
                  ? 'bg-primary/10 text-primary'
                  : 'bg-background text-muted-foreground',
              )}
            >
              <Icon
                className={cn(
                  'size-4',
                  key === 'record' && on && 'fill-current',
                )}
              />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <Label htmlFor={id} className="cursor-pointer">
                {label}
              </Label>
              <p
                className={cn(
                  'text-xs',
                  note && key === 'waitingRoom'
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {note ?? description}
              </p>
            </div>
            <Switch
              id={id}
              checked={on}
              onCheckedChange={(checked) =>
                onChange(withOption(options, key, checked))
              }
            />
          </li>
        )
      })}
    </ul>
  )
}
