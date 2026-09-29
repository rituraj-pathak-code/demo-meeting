import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { formatSlot } from '@/lib/meeting-time'

// 30-minute slots from 7:00 AM to 9:30 PM, stored as minutes since midnight.
export const TIME_SLOTS = Array.from(
  { length: 30 },
  (_, index) => 7 * 60 + index * 30,
)

const LAST_SLOT = TIME_SLOTS[TIME_SLOTS.length - 1] ?? 0

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

type DatePickerProps = {
  id: string
  value: Date
  onChange: (date: Date) => void
  disabledBefore?: Date
}

export function DatePicker({
  id,
  value,
  onChange,
  disabledBefore,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-start font-normal"
        >
          <CalendarIcon className="text-muted-foreground" />
          {dateFormatter.format(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          selected={value}
          defaultMonth={value}
          disabled={disabledBefore ? { before: disabledBefore } : undefined}
          onSelect={(next) => {
            onChange(next)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

type TimeRange = { start: number; end: number }

type TimeRangeSelectsProps = TimeRange & {
  idPrefix: string
  onChange: (range: TimeRange) => void
}

/** Start and end selects; moving the start keeps the meeting's length. */
export function TimeRangeSelects({
  idPrefix,
  start,
  end,
  onChange,
}: TimeRangeSelectsProps) {
  function handleStartChange(value: string) {
    const nextStart = Number(value)
    onChange({
      start: nextStart,
      end: Math.min(nextStart + (end - start), LAST_SLOT),
    })
  }

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-start`}>Start</Label>
        <Select value={String(start)} onValueChange={handleStartChange}>
          <SelectTrigger id={`${idPrefix}-start`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {TIME_SLOTS.slice(0, -1).map((slot) => (
              <SelectItem key={slot} value={String(slot)}>
                {formatSlot(slot)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-end`}>End</Label>
        <Select
          value={String(end)}
          onValueChange={(value) => onChange({ start, end: Number(value) })}
        >
          <SelectTrigger id={`${idPrefix}-end`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {TIME_SLOTS.filter((slot) => slot > start).map((slot) => (
              <SelectItem key={slot} value={String(slot)}>
                {formatSlot(slot)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
