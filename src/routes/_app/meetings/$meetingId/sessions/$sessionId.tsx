import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { PlayCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { AccessSection } from '@/components/meeting/access-section'
import { AgendaSection } from '@/components/meeting/agenda-section'
import { LiveStreamSection } from '@/components/meeting/live-stream-section'
import { RecordingSection } from '@/components/meeting/recording-section'
import { SessionActionButton } from '@/components/meetings/session-action-button'
import { MaterialsSection } from '@/components/meeting/materials-section'
import { MeetingNotFound } from '@/components/meeting/meeting-not-found'
import {
  JoinInfoCard,
  RsvpCard,
  SetupChecklistCard,
  getChecklist,
} from '@/components/meeting/side-cards'
import {
  CompletedSessionTabs,
  isCompletedTab,
} from '@/components/session/completed-session-tabs'
import type { CompletedTab } from '@/components/session/completed-session-tabs'
import { SessionHeader } from '@/components/session/session-header'
import { SessionPeopleSection } from '@/components/session/session-people-section'
import type { SessionGuestsDraft } from '@/components/session/session-people-section'
import { FromLastTimeCard } from '@/components/session/session-prep-cards'
import {
  SessionTimeSection,
  isSameTime,
} from '@/components/session/session-time-section'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ME, getMeeting, isSectionId } from '@/lib/demo-meetings'
import type { Meeting, SectionId, Session } from '@/lib/demo-meetings'
import {
  getEffectiveSession,
  inviteGuest,
  resetSessionOverride,
  saveSessionField,
  saveSessionOverride,
  setSessionStatus,
} from '@/lib/sessions'
import type { SaveScope, SeriesField } from '@/lib/sessions'

type SessionSearch = {
  edit?: SectionId
  tab?: CompletedTab
}

export const Route = createFileRoute(
  '/_app/meetings/$meetingId/sessions/$sessionId',
)({
  staticData: { title: 'Session' },
  validateSearch: (search: Record<string, unknown>): SessionSearch => ({
    edit: isSectionId(search.edit) ? search.edit : undefined,
    tab: isCompletedTab(search.tab) ? search.tab : undefined,
  }),
  beforeLoad: ({ params }) => {
    const meeting = getMeeting(params.meetingId)
    if (!meeting?.sessions.some((session) => session.id === params.sessionId)) {
      throw notFound()
    }
  },
  notFoundComponent: MeetingNotFound,
  component: SessionRoute,
})

function SessionRoute() {
  const { meetingId, sessionId } = Route.useParams()
  const { edit, tab } = Route.useSearch()
  const meeting = getMeeting(meetingId)
  if (!meeting?.sessions.some((session) => session.id === sessionId)) {
    return <MeetingNotFound />
  }
  return (
    <SessionPage
      key={`${meetingId}/${sessionId}`}
      initialMeeting={meeting}
      sessionId={sessionId}
      initialEdit={edit ?? null}
      initialTab={tab}
    />
  )
}

function SessionPage({
  initialMeeting,
  sessionId,
  initialEdit,
  initialTab,
}: {
  initialMeeting: Meeting
  sessionId: string
  initialEdit: SectionId | null
  initialTab: CompletedTab | undefined
}) {
  const [meeting, setMeeting] = useState(initialMeeting)
  const isHost = meeting.role === 'host'
  const [editing, setEditing] = useState<SectionId | null>(
    isHost ? initialEdit : null,
  )

  const session = meeting.sessions.find((other) => other.id === sessionId)
  if (!session) return <MeetingNotFound />
  const effective = getEffectiveSession(meeting, session)

  const primaryAction =
    session.status === 'upcoming' ? (
      <SessionActionButton
        meeting={meeting}
        session={session}
        showHint={false}
      />
    ) : session.status === 'completed' && session.recap?.recordingLength ? (
      <Button variant="outline" className="tabular-nums">
        <PlayCircle />
        Watch · {session.recap.recordingLength}
      </Button>
    ) : null

  return (
    <>
      <SessionHeader
        meeting={meeting}
        session={session}
        time={effective.time}
        primaryAction={primaryAction}
      />
      {session.status === 'completed' ? (
        <CompletedSessionTabs
          meeting={meeting}
          session={session}
          onChange={setMeeting}
          initialTab={initialTab}
        />
      ) : session.status === 'cancelled' ? (
        <CancelledSession
          session={session}
          canRestore={isHost}
          onRestore={() => {
            setMeeting((current) =>
              setSessionStatus(current, session.id, 'upcoming'),
            )
            toast.success(`Session ${session.number} restored`)
          }}
        />
      ) : (
        <SessionPrep
          meeting={meeting}
          session={session}
          onChange={setMeeting}
          editing={editing}
          onEditingChange={setEditing}
        />
      )}
    </>
  )
}

function CancelledSession({
  session,
  canRestore,
  onRestore,
}: {
  session: Session
  canRestore: boolean
  onRestore: () => void
}) {
  return (
    <Card className="items-center py-12 text-center">
      <CardHeader className="w-full max-w-md justify-items-center">
        <CardTitle>Session {session.number} was cancelled</CardTitle>
        <CardDescription>
          The rest of the series is unchanged. Guests were sent a cancellation.
        </CardDescription>
      </CardHeader>
      {canRestore && (
        <Button variant="outline" onClick={onRestore}>
          <RotateCcw />
          Restore session
        </Button>
      )}
    </Card>
  )
}

type SessionPrepProps = {
  meeting: Meeting
  session: Session
  onChange: (update: (meeting: Meeting) => Meeting) => void
  editing: SectionId | null
  onEditingChange: (section: SectionId | null) => void
}

/** Before a session: everything here changes this session only by default. */
function SessionPrep({
  meeting,
  session,
  onChange,
  editing,
  onEditingChange,
}: SessionPrepProps) {
  const isHost = meeting.role === 'host'
  const effective = getEffectiveSession(meeting, session)
  const original = {
    date: session.date,
    start: session.start,
    end: session.end,
  }
  const myRsvp = effective.guests.find(
    (guest) => guest.email === ME.email,
  )?.rsvp
  const isOneOff = meeting.recurrence === null

  function editProps(section: SectionId) {
    return {
      canEdit: isHost,
      isEditing: editing === section,
      onEdit: () => onEditingChange(section),
      onCancel: () => onEditingChange(null),
    }
  }

  function openSection(section: SectionId) {
    onEditingChange(section)
    document
      .getElementById(`section-${section}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** Props for a section that overrides one series setting for this session. */
  function fieldProps<K extends SeriesField>(section: SectionId, key: K) {
    const changed = effective.changed.has(key)
    return {
      ...editProps(section),
      value: effective[key] as Meeting[K],
      editScope: isOneOff ? ('single' as const) : ('session' as const),
      override: changed
        ? {
            onReset: () =>
              onChange((current) =>
                resetSessionOverride(current, session.id, key),
              ),
          }
        : undefined,
      onSave: (value: Meeting[K], scope: SaveScope) => {
        onChange((current) =>
          saveSessionField(current, session.id, key, value, scope),
        )
        onEditingChange(null)
      },
    }
  }

  function saveGuests(draft: SessionGuestsDraft) {
    onChange((current) => {
      const withSeriesInvites = draft.seriesInvites.reduce(
        (acc, guest) => inviteGuest(acc, session.id, guest, 'series'),
        current,
      )
      return {
        ...withSeriesInvites,
        sessions: withSeriesInvites.sessions.map((other) =>
          other.id === session.id
            ? {
                ...other,
                addedGuests: draft.added,
                removedGuests: draft.removed,
                overrides: {
                  ...other.overrides,
                  roles:
                    Object.keys(draft.roles).length > 0
                      ? draft.roles
                      : undefined,
                },
              }
            : other,
        ),
      }
    })
    onEditingChange(null)
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <aside className="grid gap-4 xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1">
        {isHost ? (
          <SetupChecklistCard
            title="Get this session ready"
            items={getChecklist({
              guestCount: effective.guests.length,
              agendaCount: effective.agenda.length,
              materialCount: effective.materials.length,
              description: null,
            })}
            onOpenSection={openSection}
          />
        ) : (
          <RsvpCard
            initial={
              myRsvp === 'accepted' ||
              myRsvp === 'tentative' ||
              myRsvp === 'declined'
                ? myRsvp
                : null
            }
          />
        )}
        <JoinInfoCard meeting={meeting} />
      </aside>

      <div className="grid min-w-0 gap-4 xl:col-start-1 xl:row-start-1">
        <FromLastTimeCard
          meeting={meeting}
          session={session}
          onChange={onChange}
        />
        <SessionTimeSection
          {...editProps('time')}
          value={effective.time}
          original={original}
          onSave={(time) => {
            onChange((current) =>
              isSameTime(time, original)
                ? resetSessionOverride(current, session.id, 'time')
                : saveSessionOverride(current, session.id, 'time', time),
            )
            onEditingChange(null)
          }}
          onReset={() =>
            onChange((current) =>
              resetSessionOverride(current, session.id, 'time'),
            )
          }
        />
        <SessionPeopleSection
          {...editProps('people')}
          seriesGuests={meeting.guests}
          value={{
            added: session.addedGuests,
            removed: session.removedGuests,
            seriesInvites: [],
            roles: session.overrides.roles ?? {},
          }}
          onSave={saveGuests}
          onReset={() =>
            onChange((current) =>
              resetSessionOverride(current, session.id, 'guests'),
            )
          }
        />
        <AccessSection
          {...fieldProps('access', 'access')}
          hasExternalGuests={effective.guests.some((guest) => guest.isExternal)}
        />
        <RecordingSection {...fieldProps('recording', 'recording')} />
        <AgendaSection
          {...fieldProps('agenda', 'agenda')}
          meetingMinutes={effective.time.end - effective.time.start}
        />
        <MaterialsSection {...fieldProps('materials', 'materials')} />
        {(isHost || effective.liveStream.enabled) && (
          <LiveStreamSection {...fieldProps('live-stream', 'liveStream')} />
        )}
      </div>
    </div>
  )
}
