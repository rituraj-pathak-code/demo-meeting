import { useState } from 'react'
import { CircleAlert, Plus, Trash2 } from 'lucide-react'

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
import { Progress } from '@/components/ui/progress'
import type { AgendaItem } from '@/lib/demo-meetings'
import { formatDuration } from '@/lib/meeting-time'
import type { SaveScope } from '@/lib/sessions'
import { cn } from '@/lib/utils'

type AgendaSectionProps = SectionProps<readonly AgendaItem[]> & {
  meetingMinutes: number
}

let draftCounter = 0
function newDraftId() {
  draftCounter += 1
  return `draft-${draftCounter}`
}

function totalMinutes(items: readonly AgendaItem[]) {
  return items.reduce((sum, item) => sum + item.minutes, 0)
}

function TimeBudget({
  planned,
  available,
}: {
  planned: number
  available: number
}) {
  const isOver = planned > available
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            'flex items-center gap-1',
            isOver
              ? 'font-medium text-amber-700 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
        >
          {isOver && <CircleAlert className="size-3.5" />}
          {isOver
            ? `${formatDuration(planned - available)} over the meeting length`
            : `${formatDuration(available - planned)} unplanned`}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {planned} of {available} min
        </span>
      </div>
      <Progress
        value={Math.min((planned / available) * 100, 100)}
        aria-label="Agenda time planned"
        className={cn('h-1.5', isOver && '[&>*]:bg-amber-500')}
      />
    </div>
  )
}

export function AgendaSection({
  value,
  meetingMinutes,
  canEdit,
  isEditing,
  editScope,
  override,
  onEdit,
  onCancel,
  onSave,
}: AgendaSectionProps) {
  return (
    <EditableSection
      id="agenda"
      title="Agenda"
      description={
        value.length > 0
          ? `${value.length} topics · ${totalMinutes(value)} min planned`
          : undefined
      }
      canEdit={canEdit}
      isEditing={isEditing}
      onEdit={onEdit}
      override={override}
    >
      {isEditing ? (
        <AgendaForm
          initial={value}
          meetingMinutes={meetingMinutes}
          editScope={editScope}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : value.length === 0 ? (
        <SectionEmptyState
          title="No agenda yet"
          description={
            canEdit
              ? 'Meetings with an agenda end on time more often. Add the topics you want to cover.'
              : 'The host hasn’t shared an agenda.'
          }
          action={
            canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Plus />
                Add agenda
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-5">
          <ol className="grid gap-3">
            {value.map((item, index) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.owner}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.minutes} min
                </span>
              </li>
            ))}
          </ol>
          <TimeBudget
            planned={totalMinutes(value)}
            available={meetingMinutes}
          />
        </div>
      )}
    </EditableSection>
  )
}

function AgendaForm({
  initial,
  meetingMinutes,
  editScope,
  onCancel,
  onSave,
}: {
  initial: readonly AgendaItem[]
  meetingMinutes: number
  editScope: EditScope
  onCancel: () => void
  onSave: (value: readonly AgendaItem[], scope: SaveScope) => void
}) {
  const [items, setItems] = useState<readonly AgendaItem[]>(() =>
    initial.length > 0
      ? initial
      : [{ id: newDraftId(), title: '', owner: '', minutes: 10 }],
  )

  function updateItem(id: string, patch: Partial<AgendaItem>) {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  function addItem() {
    setItems([
      ...items,
      { id: newDraftId(), title: '', owner: '', minutes: 10 },
    ])
  }

  function handleSave(scope: SaveScope) {
    onSave(
      items
        .filter((item) => item.title.trim() !== '')
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          owner: item.owner.trim() || 'Everyone',
        })),
      scope,
    )
  }

  return (
    <SectionEditForm
      editScope={editScope}
      allowFollowing
      onCancel={onCancel}
      onSave={handleSave}
    >
      <div className="grid gap-2">
        <div className="hidden grid-cols-[1.5rem_1fr_10rem_5rem_2.25rem] gap-2 px-0.5 text-xs text-muted-foreground sm:grid">
          <span />
          <span>Topic</span>
          <span>Owner</span>
          <span>Minutes</span>
          <span />
        </div>
        <ol className="grid gap-3 sm:gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="grid grid-cols-[1.5rem_1fr_2.25rem] items-center gap-2 sm:grid-cols-[1.5rem_1fr_10rem_5rem_2.25rem]"
            >
              <span className="text-center text-xs font-semibold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <Input
                autoFocus={index === 0}
                placeholder="What will you discuss?"
                aria-label={`Topic ${index + 1}`}
                value={item.title}
                onChange={(event) =>
                  updateItem(item.id, { title: event.target.value })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:order-last"
                aria-label={`Remove topic ${index + 1}`}
                onClick={() =>
                  setItems(items.filter((other) => other.id !== item.id))
                }
              >
                <Trash2 />
              </Button>
              <div className="col-start-2 grid grid-cols-[1fr_5rem] gap-2 sm:contents">
                <Input
                  placeholder="Owner"
                  aria-label={`Owner of topic ${index + 1}`}
                  value={item.owner}
                  onChange={(event) =>
                    updateItem(item.id, { owner: event.target.value })
                  }
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={240}
                  aria-label={`Minutes for topic ${index + 1}`}
                  value={item.minutes}
                  onChange={(event) =>
                    updateItem(item.id, {
                      minutes: Math.max(Number(event.target.value) || 0, 0),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 justify-self-start"
          onClick={addItem}
        >
          <Plus />
          Add topic
        </Button>
      </div>
      <TimeBudget planned={totalMinutes(items)} available={meetingMinutes} />
    </SectionEditForm>
  )
}
