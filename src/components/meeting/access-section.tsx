import { useState } from 'react'
import { Globe, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { AccessLevel, AccessSettings } from '@/lib/demo-meetings'
import type { SaveScope } from '@/lib/sessions'
import { cn } from '@/lib/utils'

export const ACCESS_LEVELS: Record<
  AccessLevel,
  { label: string; description: string; icon: LucideIcon }
> = {
  trusted: {
    label: 'Trusted',
    description:
      'Your workspace and invited guests join directly. Anyone else waits for a host to let them in.',
    icon: ShieldCheck,
  },
  open: {
    label: 'Open',
    description:
      'Anyone with the link joins straight away. Good for large or public sessions.',
    icon: Globe,
  },
  restricted: {
    label: 'Restricted',
    description:
      'Only people on the invite list can join. Everyone else is turned away.',
    icon: Lock,
  },
}

const LEVEL_ORDER: readonly AccessLevel[] = ['trusted', 'open', 'restricted']
const DEFAULT_PASSCODE = '482913'

function isAccessLevel(value: string): value is AccessLevel {
  return value in ACCESS_LEVELS
}

type AccessSectionProps = SectionProps<AccessSettings> & {
  hasExternalGuests: boolean
}

export function AccessSection({
  value,
  hasExternalGuests,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: AccessSectionProps) {
  const level = ACCESS_LEVELS[value.level]

  return (
    <EditableSection
      id="access"
      title="Meeting access"
      description={
        hasExternalGuests && value.level === 'open'
          ? 'External guests are invited — Trusted keeps strangers in the waiting room.'
          : 'Who can join, and how'
      }
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
    >
      {isEditing ? (
        <AccessForm
          initial={value}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <ul className="-my-2.5 divide-y">
          <SettingSummary
            icon={level.icon}
            label={level.label}
            value={level.description}
          />
          {canEdit && (
            <SettingSummary
              icon={KeyRound}
              label="Passcode"
              value={value.passcode ?? 'Not required'}
              isOn={value.passcode !== null}
            />
          )}
        </ul>
      )}
    </EditableSection>
  )
}

function AccessForm({
  initial,
  editScope,
  onCancel,
  onSave,
}: {
  initial: AccessSettings
  editScope: EditScope
  onCancel: () => void
  onSave: (value: AccessSettings, scope: SaveScope) => void
}) {
  const [draft, setDraft] = useState(initial)
  const passcodeInvalid =
    draft.passcode !== null && !/^\d{4,10}$/.test(draft.passcode)

  return (
    <SectionEditForm
      editScope={editScope}
      allowFollowing
      onCancel={onCancel}
      onSave={(scope) => onSave(draft, scope)}
      saveDisabled={passcodeInvalid}
    >
      <RadioGroup
        value={draft.level}
        onValueChange={(level) => {
          if (isAccessLevel(level)) setDraft({ ...draft, level })
        }}
        aria-label="Meeting access"
        className="gap-2"
      >
        {LEVEL_ORDER.map((level) => {
          const option = ACCESS_LEVELS[level]
          const id = `access-${level}`
          const selected = draft.level === level
          return (
            <Label
              key={level}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-muted/40',
                selected && 'border-primary/50 bg-primary/5 hover:bg-primary/5',
              )}
            >
              <RadioGroupItem id={id} value={level} className="mt-0.5" />
              <option.icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  selected ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </Label>
          )
        })}
      </RadioGroup>

      <div className="rounded-lg border">
        <SettingSwitch
          id="access-passcode"
          label="Require a passcode"
          description="Added to the invite. Anyone joining by code must enter it."
          checked={draft.passcode !== null}
          onCheckedChange={(checked) =>
            setDraft({ ...draft, passcode: checked ? DEFAULT_PASSCODE : null })
          }
        >
          {draft.passcode !== null && (
            <div className="grid gap-1.5 sm:max-w-60">
              <Label htmlFor="access-passcode-value" className="sr-only">
                Passcode
              </Label>
              <Input
                id="access-passcode-value"
                inputMode="numeric"
                className="font-mono tracking-widest"
                value={draft.passcode}
                aria-invalid={passcodeInvalid}
                onChange={(event) =>
                  setDraft({ ...draft, passcode: event.target.value.trim() })
                }
              />
              {passcodeInvalid && (
                <p className="text-xs text-destructive-foreground">
                  Use 4 to 10 digits.
                </p>
              )}
            </div>
          )}
        </SettingSwitch>
      </div>
    </SectionEditForm>
  )
}
