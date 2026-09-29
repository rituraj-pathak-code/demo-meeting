import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

import { MeetingHeader } from '@/components/meeting/meeting-header'
import { SessionActionButton } from '@/components/meetings/session-action-button'
import { MeetingSettings } from '@/components/meeting/meeting-settings'
import { MeetingNotFound } from '@/components/meeting/meeting-not-found'
import { OverviewTab } from '@/components/meeting/overview-tab'
import { SessionsList } from '@/components/meeting/sessions-list'
import { CompletedSessionTabs } from '@/components/session/completed-session-tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createNewMeeting, getMeeting, isSectionId } from '@/lib/demo-meetings'
import type { Meeting, SectionId } from '@/lib/demo-meetings'
import { fromDateParam } from '@/lib/meeting-time'
import { fromRuleParam, parseRuleParam } from '@/lib/rule-param'
import type { RuleParam } from '@/lib/rule-param'
import { getNextSession, getUpcomingSessions } from '@/lib/sessions'

const MEETING_TABS = ['overview', 'sessions', 'settings'] as const
type MeetingTab = (typeof MEETING_TABS)[number]

function isMeetingTab(value: unknown): value is MeetingTab {
  return MEETING_TABS.some((tab) => tab === value)
}

// A just-created meeting carries its basics in the URL until there's an API.
type MeetingSearch = {
  tab?: MeetingTab
  edit?: SectionId
  title?: string
  date?: string
  start?: number
  end?: number
  repeat?: string
  rule?: RuleParam
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalMinutes(value: unknown) {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < 24 * 60
    ? value
    : undefined
}

export const Route = createFileRoute('/_app/meetings/$meetingId/')({
  staticData: { title: 'Meeting details' },
  validateSearch: (search: Record<string, unknown>): MeetingSearch => ({
    tab: isMeetingTab(search.tab) ? search.tab : undefined,
    edit: isSectionId(search.edit) ? search.edit : undefined,
    title: optionalString(search.title),
    date: optionalString(search.date),
    start: optionalMinutes(search.start),
    end: optionalMinutes(search.end),
    repeat: optionalString(search.repeat),
    rule: parseRuleParam(search.rule),
  }),
  beforeLoad: ({ params }) => {
    if (params.meetingId !== 'new' && !getMeeting(params.meetingId)) {
      throw notFound()
    }
  },
  notFoundComponent: MeetingNotFound,
  component: MeetingRoute,
})

function MeetingRoute() {
  const { meetingId } = Route.useParams()
  const { tab, edit, ...basics } = Route.useSearch()

  const start = basics.start ?? 10 * 60
  const meeting =
    meetingId === 'new'
      ? createNewMeeting({
          title: basics.title ?? 'Untitled meeting',
          date: (basics.date && fromDateParam(basics.date)) || new Date(),
          start,
          end:
            basics.end !== undefined && basics.end > start
              ? basics.end
              : start + 30,
          recurrence:
            basics.repeat && basics.rule
              ? { label: basics.repeat, rule: fromRuleParam(basics.rule) }
              : null,
        })
      : getMeeting(meetingId)

  if (!meeting) return <MeetingNotFound />

  // Remount per meeting so local edits never leak between meetings.
  const key = meetingId === 'new' ? `new:${JSON.stringify(basics)}` : meetingId
  return (
    <MeetingPage
      key={key}
      initial={meeting}
      initialTab={edit ? 'settings' : (tab ?? 'overview')}
      initialEdit={edit ?? null}
    />
  )
}

function MeetingPage({
  initial,
  initialTab,
  initialEdit,
}: {
  initial: Meeting
  initialTab: MeetingTab
  initialEdit: SectionId | null
}) {
  const [meeting, setMeeting] = useState(initial)
  const [tab, setTab] = useState<MeetingTab>(initialTab)
  const isHost = meeting.role === 'host'
  const [editing, setEditing] = useState<SectionId | null>(
    isHost ? initialEdit : null,
  )
  const next = getNextSession(meeting)

  const primaryAction =
    meeting.lifecycle.status === 'draft' ? (
      <Button
        onClick={() => {
          setMeeting((current) => ({
            ...current,
            lifecycle: { status: 'active' },
          }))
          toast.success('Invites sent', { description: meeting.details.title })
        }}
      >
        <Send />
        Send invites
      </Button>
    ) : meeting.lifecycle.status === 'cancelled' ? null : next ? (
      <SessionActionButton meeting={meeting} session={next} showHint={false} />
    ) : null

  // One-off meeting: no series layer.
  if (!meeting.recurrence) {
    const only = meeting.sessions[0]
    const settings = (
      <MeetingSettings
        meeting={meeting}
        onChange={setMeeting}
        editing={editing}
        onEditingChange={setEditing}
        editScope="single"
        canEdit={isHost && only?.status !== 'completed'}
      />
    )
    return (
      <>
        <MeetingHeader meeting={meeting} primaryAction={primaryAction} />
        {only?.status === 'completed' ? (
          <CompletedSessionTabs
            meeting={meeting}
            session={only}
            onChange={setMeeting}
            details={settings}
          />
        ) : (
          settings
        )}
      </>
    )
  }

  return (
    <>
      <MeetingHeader meeting={meeting} primaryAction={primaryAction} />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isMeetingTab(value)) setTab(value)
        }}
        className="gap-4"
      >
        <div className="border-b pb-1">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">
              Sessions
              <Badge variant="secondary" className="px-1.5 tabular-nums">
                {getUpcomingSessions(meeting).length} upcoming
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="settings">
              {isHost ? 'Settings' : 'Details'}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <OverviewTab meeting={meeting} onChange={setMeeting} />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsList meeting={meeting} onChange={setMeeting} />
        </TabsContent>
        <TabsContent value="settings">
          <MeetingSettings
            meeting={meeting}
            onChange={setMeeting}
            editing={editing}
            onEditingChange={setEditing}
            editScope="series"
            canEdit={isHost}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}
