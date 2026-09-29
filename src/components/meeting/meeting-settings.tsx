import { AccessSection } from '@/components/meeting/access-section'
import { AgendaSection } from '@/components/meeting/agenda-section'
import { DetailsSection } from '@/components/meeting/details-section'
import type { EditScope } from '@/components/meeting/editable-section'
import { LiveStreamSection } from '@/components/meeting/live-stream-section'
import { MaterialsSection } from '@/components/meeting/materials-section'
import { PeopleSection } from '@/components/meeting/people-section'
import { RecordingSection } from '@/components/meeting/recording-section'
import {
  JoinInfoCard,
  RsvpCard,
  SetupChecklistCard,
  getMeetingChecklist,
} from '@/components/meeting/side-cards'
import { ME } from '@/lib/demo-meetings'
import type { Meeting, SectionId } from '@/lib/demo-meetings'

type MeetingSettingsProps = {
  meeting: Meeting
  onChange: (update: (meeting: Meeting) => Meeting) => void
  editing: SectionId | null
  onEditingChange: (section: SectionId | null) => void
  editScope: Extract<EditScope, 'single' | 'series'>
  canEdit: boolean
}

/** Every setting of a meeting, with setup and join info beside it. */
export function MeetingSettings({
  meeting,
  onChange,
  editing,
  onEditingChange,
  editScope,
  canEdit,
}: MeetingSettingsProps) {
  const isHost = meeting.role === 'host'
  const hasExternalGuests = meeting.guests.some((guest) => guest.isExternal)
  const myRsvp = meeting.guests.find((guest) => guest.email === ME.email)?.rsvp

  function sectionProps<K extends keyof Meeting>(section: SectionId, key: K) {
    return {
      value: meeting[key],
      canEdit,
      isEditing: editing === section,
      editScope,
      onEdit: () => onEditingChange(section),
      onCancel: () => onEditingChange(null),
      onSave: (value: Meeting[K]) => {
        onChange((current) => ({ ...current, [key]: value }))
        onEditingChange(null)
      },
    }
  }

  function openSection(section: SectionId) {
    onEditingChange(section)
    document
      .getElementById(`section-${section}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {/* First in the DOM so it leads on small screens. */}
      <aside className="grid gap-4 xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1">
        {isHost && canEdit ? (
          <SetupChecklistCard
            title={
              editScope === 'series'
                ? 'Set up the series'
                : 'Get this meeting ready'
            }
            items={getMeetingChecklist(meeting)}
            onOpenSection={openSection}
          />
        ) : !isHost ? (
          <RsvpCard
            initial={
              myRsvp === 'accepted' ||
              myRsvp === 'tentative' ||
              myRsvp === 'declined'
                ? myRsvp
                : null
            }
          />
        ) : null}
        <JoinInfoCard meeting={meeting} />
      </aside>

      <div className="grid min-w-0 gap-4 xl:col-start-1 xl:row-start-1">
        <DetailsSection
          {...sectionProps('details', 'details')}
          recurrenceLabel={meeting.recurrence?.label ?? null}
        />
        <PeopleSection {...sectionProps('people', 'guests')} />
        <AccessSection
          {...sectionProps('access', 'access')}
          hasExternalGuests={hasExternalGuests}
        />
        <RecordingSection {...sectionProps('recording', 'recording')} />
        <AgendaSection
          {...sectionProps('agenda', 'agenda')}
          meetingMinutes={meeting.details.end - meeting.details.start}
        />
        <MaterialsSection {...sectionProps('materials', 'materials')} />
        {(isHost || meeting.liveStream.enabled) && (
          <LiveStreamSection {...sectionProps('live-stream', 'liveStream')} />
        )}
      </div>
    </div>
  )
}
