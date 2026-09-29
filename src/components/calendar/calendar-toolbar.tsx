import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CalendarView } from '@/lib/calendar'
import { CALENDAR_VIEWS, formatRangeTitle } from '@/lib/calendar'
import { NOW } from '@/lib/demo-meetings'

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
}

type CalendarToolbarProps = {
  view: CalendarView
  anchor: Date
  onDateChange: (date: Date) => void
  onStep: (step: 1 | -1) => void
}

export function CalendarToolbar({
  view,
  anchor,
  onDateChange,
  onStep,
}: CalendarToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const unit = VIEW_LABELS[view].toLowerCase()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="outline" onClick={() => onDateChange(NOW)}>
          Today
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Previous ${unit}`}
            onClick={() => onStep(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Next ${unit}`}
            onClick={() => onStep(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="min-w-0 px-2 text-base font-semibold sm:text-lg"
            >
              <span aria-live="polite" className="truncate">
                {formatRangeTitle(view, anchor)}
              </span>
              <span className="sr-only">, pick a date</span>
              <ChevronDown className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={anchor}
              defaultMonth={anchor}
              today={NOW}
              onSelect={(date) => {
                if (!date) return
                onDateChange(date)
                setPickerOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Legend />
        {/* Rendered inside the page's <Tabs>, which owns the view panels. */}
        <TabsList aria-label="Calendar view">
          {CALENDAR_VIEWS.map((option) => (
            <TabsTrigger key={option} value={option}>
              {VIEW_LABELS[option]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <ul className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
      <li className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-primary" />
        Hosting
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-chart-2" />
        Attending
      </li>
    </ul>
  )
}
