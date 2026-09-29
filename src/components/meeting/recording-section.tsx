import { useState } from 'react'
import { Captions, CircleDot, Sparkles } from 'lucide-react'

import {
  EditableSection,
  SectionEditForm,
} from '@/components/meeting/editable-section'
import type {
  EditScope,
  SectionProps,
} from '@/components/meeting/editable-section'
import {
  SettingSummary,
  SettingSwitch,
} from '@/components/meeting/setting-rows'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RecordingSettings, SummaryAudience } from '@/lib/demo-meetings'
import type { SaveScope } from '@/lib/sessions'

const AUDIENCES: Record<SummaryAudience, string> = {
  everyone: 'Everyone invited',
  attendees: 'Only people who attended',
  host: 'Only the host',
}

const AUDIENCE_SUMMARIES: Record<SummaryAudience, string> = {
  everyone: 'Sent to everyone invited',
  attendees: 'Sent to people who attended',
  host: 'Sent to the host only',
}

function isAudience(value: string): value is SummaryAudience {
  return value in AUDIENCES
}

export function RecordingSection({
  value,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: SectionProps<RecordingSettings>) {
  return (
    <EditableSection
      id="recording"
      title="Recording & transcription"
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
    >
      {isEditing ? (
        <RecordingForm
          initial={value}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <ul className="-my-2.5 divide-y">
          <SettingSummary
            icon={CircleDot}
            label="Recording"
            value={value.record ? 'Starts automatically' : 'Off'}
            isOn={value.record}
          />
          <SettingSummary
            icon={Captions}
            label="Transcription"
            value={value.transcript ? 'Live captions + transcript' : 'Off'}
            isOn={value.transcript}
          />
          <SettingSummary
            icon={Sparkles}
            label="AI notes & summary"
            value={
              value.transcript && value.aiNotes
                ? AUDIENCE_SUMMARIES[value.summaryTo]
                : 'Off'
            }
            isOn={value.transcript && value.aiNotes}
          />
        </ul>
      )}
    </EditableSection>
  )
}

function RecordingForm({
  initial,
  editScope,
  onCancel,
  onSave,
}: {
  initial: RecordingSettings
  editScope: EditScope
  onCancel: () => void
  onSave: (value: RecordingSettings, scope: SaveScope) => void
}) {
  const [draft, setDraft] = useState(initial)

  return (
    <SectionEditForm
      editScope={editScope}
      allowFollowing
      onCancel={onCancel}
      onSave={(scope) => onSave(draft, scope)}
    >
      <div className="divide-y rounded-lg border">
        <SettingSwitch
          id="setting-record"
          label="Record meeting"
          description="Starts when the first guest joins. Everyone sees a recording indicator."
          checked={draft.record}
          onCheckedChange={(record) => setDraft({ ...draft, record })}
        />
        <SettingSwitch
          id="setting-transcript"
          label="Transcription"
          description="Live captions during the call and a searchable transcript after."
          checked={draft.transcript}
          onCheckedChange={(transcript) =>
            // The AI summary is written from the transcript.
            setDraft({
              ...draft,
              transcript,
              aiNotes: transcript && draft.aiNotes,
            })
          }
        />
        <SettingSwitch
          id="setting-ai-notes"
          label="AI notes & summary"
          description={
            draft.transcript
              ? 'Decisions and action items, written up when the meeting ends.'
              : 'Needs transcription on.'
          }
          checked={draft.transcript && draft.aiNotes}
          disabled={!draft.transcript}
          onCheckedChange={(aiNotes) => setDraft({ ...draft, aiNotes })}
        >
          {draft.transcript && draft.aiNotes && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label
                htmlFor="setting-summary-to"
                className="font-normal text-muted-foreground"
              >
                Send the summary to
              </Label>
              <Select
                value={draft.summaryTo}
                onValueChange={(summaryTo) => {
                  if (isAudience(summaryTo)) setDraft({ ...draft, summaryTo })
                }}
              >
                <SelectTrigger
                  id="setting-summary-to"
                  className="w-full sm:w-60"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCES).map(([audience, label]) => (
                    <SelectItem key={audience} value={audience}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </SettingSwitch>
      </div>
    </SectionEditForm>
  )
}
