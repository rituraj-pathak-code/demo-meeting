import { useState } from 'react'
import { Clock, Repeat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  DatePicker,
  TimeRangeSelects,
} from '@/components/meeting/date-time-fields'
import {
  EditableSection,
  SectionEditForm,
} from '@/components/meeting/editable-section'
import type {
  EditScope,
  SectionProps,
} from '@/components/meeting/editable-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MeetingDetails } from '@/lib/demo-meetings'
import { formatDuration, formatLongDate, formatSlot } from '@/lib/meeting-time'
import type { SaveScope } from '@/lib/sessions'

type DetailsSectionProps = SectionProps<MeetingDetails> & {
  recurrenceLabel: string | null
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="grid gap-0.5">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  )
}

export function DetailsSection({
  value,
  recurrenceLabel,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: DetailsSectionProps) {
  return (
    <EditableSection
      id="details"
      title="Details"
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
    >
      {isEditing ? (
        <DetailsForm
          initial={value}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <div className="grid gap-5">
          {value.description ? (
            <p className="text-sm leading-relaxed">{value.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? 'No description yet. Tell guests what this meeting is for.'
                : 'No description.'}
            </p>
          )}
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow icon={Clock} label="When">
              {recurrenceLabel === null && (
                <>
                  {formatLongDate(value.date)}
                  <br />
                </>
              )}
              {formatSlot(value.start)} – {formatSlot(value.end)} ·{' '}
              {formatDuration(value.end - value.start)}
            </DetailRow>
            <DetailRow icon={Repeat} label="Repeats">
              {recurrenceLabel ?? 'Does not repeat'}
            </DetailRow>
          </dl>
        </div>
      )}
    </EditableSection>
  )
}

function DetailsForm({
  initial,
  editScope,
  onCancel,
  onSave,
}: {
  initial: MeetingDetails
  editScope: EditScope
  onCancel: () => void
  onSave: (value: MeetingDetails, scope: SaveScope) => void
}) {
  const [draft, setDraft] = useState(initial)
  const titleMissing = draft.title.trim() === ''

  return (
    <SectionEditForm
      editScope={editScope}
      onCancel={onCancel}
      onSave={(scope) => onSave({ ...draft, title: draft.title.trim() }, scope)}
      saveDisabled={titleMissing}
    >
      <div className="grid gap-2">
        <Label htmlFor="details-title">Meeting name</Label>
        <Input
          id="details-title"
          autoFocus
          value={draft.title}
          aria-invalid={titleMissing}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="details-description">Description</Label>
        <Textarea
          id="details-description"
          rows={3}
          placeholder="What is this meeting for? What should guests prepare?"
          value={draft.description}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
        />
      </div>
      <div
        className={
          editScope === 'series'
            ? 'grid gap-4 sm:grid-cols-2'
            : 'grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]'
        }
      >
        {/* A series' dates come from its sessions; reschedule those one by one. */}
        {editScope !== 'series' && (
          <div className="grid gap-2">
            <Label htmlFor="details-date">Date</Label>
            <DatePicker
              id="details-date"
              value={draft.date}
              onChange={(date) => setDraft({ ...draft, date })}
            />
          </div>
        )}
        <TimeRangeSelects
          idPrefix="details"
          start={draft.start}
          end={draft.end}
          onChange={(range) => setDraft({ ...draft, ...range })}
        />
      </div>
    </SectionEditForm>
  )
}
