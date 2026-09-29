import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { CalendarToolbar } from '@/components/calendar/calendar-toolbar'
import { MonthView } from '@/components/calendar/month-view'
import { TimeGridView } from '@/components/calendar/time-grid-view'
import { CreateMeetingDialog } from '@/components/dashboard/create-meeting-dialog'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  CALENDAR_VIEWS,
  buildEvents,
  getVisibleDays,
  isCalendarView,
  shiftAnchor,
} from '@/lib/calendar'
import type { CalendarEvent, CalendarView } from '@/lib/calendar'
import { NOW, listMeetings } from '@/lib/demo-meetings'
import { fromDateParam, toDateParam } from '@/lib/meeting-time'

// View and date live in the URL so a calendar position can be shared or
// bookmarked, and back/forward steps through it.
type CalendarSearch = {
  view?: CalendarView
  date?: string
}

const DEFAULT_VIEW: CalendarView = 'week'

export const Route = createFileRoute('/_app/calendar')({
  staticData: { title: 'Calendar' },
  validateSearch: (search: Record<string, unknown>): CalendarSearch => ({
    view: isCalendarView(search.view) ? search.view : undefined,
    date:
      typeof search.date === 'string' && fromDateParam(search.date)
        ? search.date
        : undefined,
  }),
  component: CalendarPage,
})

// Built once: the demo data is static.
const EVENTS = buildEvents(listMeetings())

function countSessions(events: readonly CalendarEvent[], days: readonly Date[]) {
  const first = days[0]
  const last = days.at(-1)
  if (!first || !last) return 0
  return events.filter(
    (event) =>
      event.status !== 'cancelled' &&
      event.date >= first &&
      event.date <= last,
  ).length
}

function CalendarPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  const view = search.view ?? DEFAULT_VIEW
  const anchor = (search.date ? fromDateParam(search.date) : undefined) ?? NOW
  const days = getVisibleDays(view, anchor)
  const sessionCount = countSessions(EVENTS, days)

  function goTo(next: { view?: CalendarView; date?: Date }) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...(next.view && { view: next.view }),
        ...(next.date && { date: toDateParam(next.date) }),
      }),
    })
  }

  const showDay = (day: Date) => goTo({ view: 'day', date: day })

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`Every session you host or attend · ${sessionCount} in view`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New meeting
          </Button>
        }
      />
      <CreateMeetingDialog open={createOpen} onOpenChange={setCreateOpen} />

      <Tabs
        value={view}
        onValueChange={(value) => {
          if (isCalendarView(value)) goTo({ view: value })
        }}
        className="gap-4"
      >
        <CalendarToolbar
          view={view}
          anchor={anchor}
          onDateChange={(date) => goTo({ date })}
          onStep={(step) => goTo({ date: shiftAnchor(view, anchor, step) })}
        />
        {CALENDAR_VIEWS.map((option) => (
          <TabsContent key={option} value={option}>
            {option === 'month' ? (
              <MonthView
                anchor={anchor}
                days={days}
                events={EVENTS}
                onSelectDay={showDay}
              />
            ) : (
              <TimeGridView days={days} events={EVENTS} onSelectDay={showDay} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
