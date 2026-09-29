import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SectionId } from '@/lib/demo-meetings'
import type { SaveScope } from '@/lib/sessions'
import { cn } from '@/lib/utils'

/**
 * Where an edit lands:
 * - `single`: a one-off meeting.
 * - `series`: series defaults, used by every session that hasn't changed it.
 * - `session`: one session of a series.
 */
export type EditScope = 'single' | 'series' | 'session'

/** Shared contract for every editable section. */
export type SectionProps<T> = {
  value: T
  canEdit: boolean
  isEditing: boolean
  editScope: EditScope
  /** Session only: this section differs from the series. */
  override?: { onReset: () => void }
  onEdit: () => void
  onCancel: () => void
  onSave: (value: T, scope: SaveScope) => void
}

type EditableSectionProps = {
  id: SectionId
  title: string
  description?: string
  canEdit: boolean
  isEditing: boolean
  onEdit: () => void
  override?: { onReset: () => void }
  /** Extra header control shown while viewing, next to Edit. */
  action?: ReactNode
  children: ReactNode
}

export function EditableSection({
  id,
  title,
  description,
  canEdit,
  isEditing,
  onEdit,
  override,
  action,
  children,
}: EditableSectionProps) {
  return (
    <Card
      id={`section-${id}`}
      aria-labelledby={`section-${id}-title`}
      className={cn(
        'scroll-mt-20 gap-5 transition-shadow',
        isEditing && 'border-primary/40 ring-4 ring-primary/10',
      )}
    >
      <CardHeader>
        <CardTitle
          id={`section-${id}-title`}
          className="flex flex-wrap items-center gap-2"
        >
          {title}
          {override && (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 font-normal text-primary"
            >
              Changed for this session
            </Badge>
          )}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {!isEditing && (canEdit || action) && (
          <CardAction className="flex items-center gap-1">
            {action}
            {canEdit && override && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  override.onReset()
                  toast.success(`${title} reset to the series`)
                }}
              >
                <RotateCcw />
                <span className="hidden sm:inline">Reset to series</span>
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                aria-label={`Edit ${title.toLowerCase()}`}
              >
                <Pencil />
                Edit
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const SESSION_SCOPES: Record<SaveScope, string> = {
  this: 'Only this session',
  following: 'This and following sessions',
}

function isSaveScope(value: string): value is SaveScope {
  return value in SESSION_SCOPES
}

const SCOPE_NOTES: Record<EditScope, string | null> = {
  single: null,
  series:
    'Applies to every upcoming session that hasn’t been changed on its own.',
  session: null,
}

type SectionEditFormProps = {
  editScope: EditScope
  /** Session scope: offer "this and following" as well as "only this". */
  allowFollowing?: boolean
  onSave: (scope: SaveScope) => void
  onCancel: () => void
  saveDisabled?: boolean
  children: ReactNode
}

/** Edit-mode body: fields, then where the change applies, then Cancel / Save. */
export function SectionEditForm({
  editScope,
  allowFollowing = false,
  onSave,
  onCancel,
  saveDisabled = false,
  children,
}: SectionEditFormProps) {
  const [scope, setScope] = useState<SaveScope>('this')
  const showScopePicker = editScope === 'session' && allowFollowing

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(scope)
    toast.success('Changes saved', {
      description:
        editScope === 'session'
          ? `Applied to ${SESSION_SCOPES[scope].toLowerCase()}`
          : editScope === 'series'
            ? 'Upcoming sessions will use this'
            : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      {children}
      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        {showScopePicker ? (
          <div className="flex items-center gap-2">
            <Label
              htmlFor="save-scope"
              className="shrink-0 font-normal text-muted-foreground"
            >
              Apply to
            </Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                if (isSaveScope(value)) setScope(value)
              }}
            >
              <SelectTrigger
                id="save-scope"
                size="sm"
                className="w-full sm:w-auto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SESSION_SCOPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : editScope === 'session' ? (
          <p className="text-xs text-muted-foreground">
            Only this session changes. The series stays the same.
          </p>
        ) : SCOPE_NOTES[editScope] ? (
          <p className="text-xs text-muted-foreground">
            {SCOPE_NOTES[editScope]}
          </p>
        ) : (
          <span />
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveDisabled}>
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function SectionEmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
