import { useState } from 'react'
import { CalendarClock } from 'lucide-react'

import {
  DatePicker,
  TimeRangeSelects,
} from '@/components/meeting/date-time-fields'
import {
  EditableSection,
  SectionEditForm,
} from '@/components/meeting/editable-section'
import { Label } from '@/components/ui/label'
import type { SessionTime } from '@/lib/demo-meetings'
import {
  formatDuration,
  formatLongDate,
  formatShortDate,
  formatSlot,
} from '@/lib/meeting-time'

type SessionTimeSectionProps = {
  value: SessionTime
  original: SessionTime
  canEdit: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (value: SessionTime) => void
  onReset: () => void
}

function isSameTime(a: SessionTime, b: SessionTime) {
  return (
    a.date.toDateString() === b.date.toDateString() &&
    a.start === b.start &&
    a.end === b.end
  )
}

export function SessionTimeSection({
  value,
  original,
  canEdit,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onReset,
}: SessionTimeSectionProps) {
  const isRescheduled = !isSameTime(value, original)

  return (
    <EditableSection
      id="time"
      title="When"
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={isRescheduled ? { onReset } : undefined}
    >
      {isEditing ? (
        <TimeForm initial={value} onCancel={onCancel} onSave={onSave} />
      ) : (
        <div className="flex items-start gap-3">
          <CalendarClock
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="grid gap-0.5 text-sm">
            <p>{formatLongDate(value.date)}</p>
            <p>
              {formatSlot(value.start)} – {formatSlot(value.end)} ·{' '}
              {formatDuration(value.end - value.start)}
            </p>
            {isRescheduled && (
              <p className="text-xs text-muted-foreground">
                Originally {formatShortDate(original.date)},{' '}
                {formatSlot(original.start)} – {formatSlot(original.end)}
              </p>
            )}
          </div>
        </div>
      )}
    </EditableSection>
  )
}

function TimeForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: SessionTime
  onCancel: () => void
  onSave: (value: SessionTime) => void
}) {
  const [draft, setDraft] = useState(initial)

  return (
    <SectionEditForm
      editScope="session"
      onCancel={onCancel}
      onSave={() => onSave(draft)}
    >
      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="session-date">Date</Label>
          <DatePicker
            id="session-date"
            value={draft.date}
            onChange={(date) => setDraft({ ...draft, date })}
          />
        </div>
        <TimeRangeSelects
          idPrefix="session"
          start={draft.start}
          end={draft.end}
          onChange={(range) => setDraft({ ...draft, ...range })}
        />
      </div>
    </SectionEditForm>
  )
}

export { isSameTime }
