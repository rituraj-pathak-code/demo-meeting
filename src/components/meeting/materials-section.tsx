import { useState } from 'react'
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  PenTool,
  Plus,
  Presentation,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  EditableSection,
  SectionEditForm,
  SectionEmptyState,
} from '@/components/meeting/editable-section'
import type {
  EditScope,
  SectionProps,
} from '@/components/meeting/editable-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ME } from '@/lib/demo-meetings'
import type { Material, MaterialKind } from '@/lib/demo-meetings'
import type { SaveScope } from '@/lib/sessions'

const KINDS: Record<MaterialKind, { label: string; icon: LucideIcon }> = {
  doc: { label: 'Document', icon: FileText },
  design: { label: 'Design file', icon: PenTool },
  sheet: { label: 'Spreadsheet', icon: FileSpreadsheet },
  slides: { label: 'Slides', icon: Presentation },
}

function isMaterialKind(value: string): value is MaterialKind {
  return value in KINDS
}

let draftCounter = 0
function newDraftId() {
  draftCounter += 1
  return `file-${draftCounter}`
}

function MaterialRow({
  material,
  trailing,
}: {
  material: Material
  trailing: React.ReactNode
}) {
  const { icon: Icon, label } = KINDS[material.kind]
  return (
    <li className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{material.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {label} · added by {material.addedBy}
        </p>
      </div>
      {trailing}
    </li>
  )
}

export function MaterialsSection({
  value,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: SectionProps<readonly Material[]>) {
  return (
    <EditableSection
      id="materials"
      title="Pre-read & files"
      description={
        value.length > 0 ? 'Shared with everyone invited' : undefined
      }
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
    >
      {isEditing ? (
        <MaterialsForm
          initial={value}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : value.length === 0 ? (
        <SectionEmptyState
          title="Nothing to read yet"
          description={
            canEdit
              ? 'Attach docs, designs or decks so guests arrive with context.'
              : 'The host hasn’t attached any files.'
          }
          action={
            canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Plus />
                Add a file
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.map((material) => (
            <MaterialRow
              key={material.id}
              material={material}
              trailing={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Open ${material.name}`}
                >
                  <ExternalLink />
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </EditableSection>
  )
}

function MaterialsForm({
  initial,
  editScope,
  onCancel,
  onSave,
}: {
  initial: readonly Material[]
  editScope: EditScope
  onCancel: () => void
  onSave: (value: readonly Material[], scope: SaveScope) => void
}) {
  const [items, setItems] = useState(initial)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<MaterialKind>('doc')

  function addMaterial() {
    if (name.trim() === '') return
    setItems([
      ...items,
      { id: newDraftId(), name: name.trim(), kind, addedBy: ME.name },
    ])
    setName('')
  }

  return (
    <SectionEditForm
      editScope={editScope}
      allowFollowing
      onCancel={onCancel}
      onSave={(scope) => onSave(items, scope)}
    >
      {items.length > 0 && (
        <ul className="grid gap-2">
          {items.map((material) => (
            <MaterialRow
              key={material.id}
              material={material}
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${material.name}`}
                  onClick={() =>
                    setItems(items.filter((item) => item.id !== material.id))
                  }
                >
                  <Trash2 />
                </Button>
              }
            />
          ))}
        </ul>
      )}
      <div className="grid gap-2">
        <Label htmlFor="material-name">Add a file or link</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="material-name"
            autoFocus
            placeholder="Paste a link or type a file name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addMaterial()
              }
            }}
          />
          <Select
            value={kind}
            onValueChange={(value) => {
              if (isMaterialKind(value)) setKind(value)
            }}
          >
            <SelectTrigger aria-label="File type" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KINDS).map(([value, option]) => (
                <SelectItem key={value} value={value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={addMaterial}
            disabled={name.trim() === ''}
          >
            <Plus />
            Add
          </Button>
        </div>
      </div>
    </SectionEditForm>
  )
}
