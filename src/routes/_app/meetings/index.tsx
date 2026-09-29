import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { CreateMeetingDialog } from '@/components/dashboard/create-meeting-dialog'
import { MEETING_TABS, MeetingList } from '@/components/meetings/meeting-list'
import type {
  MeetingListActions,
  MeetingTab,
} from '@/components/meetings/meeting-list'
import { NowAndNext } from '@/components/meetings/now-and-next'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NOW, listMeetings } from '@/lib/demo-meetings'
import type { Meeting } from '@/lib/demo-meetings'
import {
  getAllSessions,
  getEffectiveSession,
  getLastCompletedSession,
  getNextSession,
  getSessionWindow,
  isLiveSession,
} from '@/lib/sessions'
import type { SessionEntry } from '@/lib/sessions'

export const Route = createFileRoute('/_app/meetings/')({
  staticData: { title: 'My meetings' },
  component: MeetingsPage,
})

const ROLE_FILTERS = {
  all: 'All meetings',
  host: 'Hosting',
  attendee: 'Attending',
} as const
type RoleFilter = keyof typeof ROLE_FILTERS

function isRoleFilter(value: string): value is RoleFilter {
  return value in ROLE_FILTERS
}

/** Live first, then by next session; meetings with nothing coming up last. */
function sortByNextSession(meetings: readonly Meeting[]) {
  const rank = (meeting: Meeting) => {
    const next = getNextSession(meeting)
    if (!next) return Infinity
    if (isLiveSession(meeting, next)) return -Infinity
    return getSessionWindow(meeting, next).startsAt
  }
  return [...meetings].sort((a, b) => rank(a) - rank(b))
}

/** Most recently held first. */
function sortByLastSession(meetings: readonly Meeting[]) {
  const rank = (meeting: Meeting) => {
    const last = getLastCompletedSession(meeting)
    return last ? getSessionWindow(meeting, last).startsAt : -Infinity
  }
  return [...meetings].sort((a, b) => rank(b) - rank(a))
}

function isToday(entry: SessionEntry) {
  const { date } = getEffectiveSession(entry.meeting, entry.session).time
  return date.toDateString() === NOW.toDateString()
}

type LifecycleChange = 'active' | 'deleted'

/** Apply this page's sends, restores and deletes on top of the static data. */
function applyChanges(
  meetings: readonly Meeting[],
  changes: Readonly<Record<string, LifecycleChange>>,
) {
  return meetings.flatMap((meeting): Meeting[] => {
    const change = changes[meeting.id]
    if (change === 'deleted') return []
    if (change === 'active')
      return [{ ...meeting, lifecycle: { status: 'active' } }]
    return [meeting]
  })
}

function isMeetingTab(value: string): value is MeetingTab {
  return MEETING_TABS.some((tab) => tab === value)
}

const TAB_LABELS: Record<MeetingTab, string> = {
  upcoming: 'Upcoming',
  past: 'Past',
  drafts: 'Drafts',
  cancelled: 'Cancelled',
}

function MeetingsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState<MeetingTab>('upcoming')
  const [role, setRole] = useState<RoleFilter>('all')
  const [query, setQuery] = useState('')
  const [changes, setChanges] = useState<
    Readonly<Record<string, LifecycleChange>>
  >({})

  const meetings = applyChanges(listMeetings(), changes)
  const activeMeetings = meetings.filter(
    (meeting) => meeting.lifecycle.status === 'active',
  )
  const active = getAllSessions(activeMeetings).upcoming.filter(
    (entry) => entry.session.status !== 'cancelled',
  )
  const live = active.filter((entry) =>
    isLiveSession(entry.meeting, entry.session),
  )
  const [next] = active.filter(
    (entry) => !isLiveSession(entry.meeting, entry.session),
  )
  const todayCount = active.filter(isToday).length

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = meetings.filter(
    (meeting) =>
      (role === 'all' || meeting.role === role) &&
      (normalizedQuery === '' ||
        meeting.details.title.toLowerCase().includes(normalizedQuery) ||
        meeting.guests.some((guest) =>
          guest.name.toLowerCase().includes(normalizedQuery),
        )),
  )
  const filteredActive = filtered.filter(
    (meeting) => meeting.lifecycle.status === 'active',
  )
  const lists: Record<MeetingTab, Meeting[]> = {
    upcoming: sortByNextSession(
      filteredActive.filter((meeting) => getNextSession(meeting)),
    ),
    past: sortByLastSession(
      filteredActive.filter((meeting) => getLastCompletedSession(meeting)),
    ),
    drafts: filtered.filter((meeting) => meeting.lifecycle.status === 'draft'),
    cancelled: filtered.filter(
      (meeting) => meeting.lifecycle.status === 'cancelled',
    ),
  }

  const actions: MeetingListActions = {
    onDeleteDraft: (meeting) => {
      setChanges((current) => ({ ...current, [meeting.id]: 'deleted' }))
      toast.success('Draft deleted', {
        description: meeting.details.title,
        action: {
          label: 'Undo',
          onClick: () =>
            setChanges((current) => {
              const { [meeting.id]: _removed, ...rest } = current
              return rest
            }),
        },
      })
    },
    onRestore: (meeting) => {
      setChanges((current) => ({ ...current, [meeting.id]: 'active' }))
      toast.success('Meeting restored', {
        description: 'Guests will get an updated invite.',
      })
    },
  }

  return (
    <>
      <PageHeader
        title="My meetings"
        description={`${todayCount} sessions left today${live.length > 0 ? ` · ${live.length} live now` : ''}`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New meeting
          </Button>
        }
      />
      <CreateMeetingDialog open={createOpen} onOpenChange={setCreateOpen} />

      <NowAndNext live={live} next={next} />

      <section
        aria-labelledby="all-meetings"
        className="grid grid-cols-1 gap-4 pt-2"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="all-meetings"
            className="text-lg font-semibold tracking-tight"
          >
            Meetings
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={role}
              onValueChange={(value) => {
                if (isRoleFilter(value)) setRole(value)
              }}
            >
              <SelectTrigger
                aria-label="Filter by role"
                className="w-full sm:w-36"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {Object.entries(ROLE_FILTERS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative sm:w-60">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search meetings or people"
                aria-label="Search meetings or people"
                className="pl-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isMeetingTab(value)) setTab(value)
          }}
          className="gap-4"
        >
          <TabsList className="max-w-full justify-start overflow-x-auto">
            {MEETING_TABS.map((option) => (
              <TabsTrigger key={option} value={option} className="flex-none">
                {TAB_LABELS[option]}
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {lists[option].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {MEETING_TABS.map((option) => (
            <TabsContent key={option} value={option}>
              <MeetingList meetings={lists[option]} tab={option} {...actions} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  )
}
