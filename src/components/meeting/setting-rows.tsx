import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/** Read-only row: what the setting is, and its current state. */
export function SettingSummary({
  icon: Icon,
  label,
  value,
  isOn = true,
}: {
  icon: LucideIcon
  label: string
  value: string
  isOn?: boolean
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-md',
          isOn
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span
        className={cn(
          'shrink-0 text-right text-sm',
          isOn ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {value}
      </span>
    </li>
  )
}

/** Editable row: label, help text and a switch, with optional extra controls. */
export function SettingSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  children,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  children?: ReactNode
}) {
  return (
    <div className="grid gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className={cn('grid gap-0.5', disabled && 'opacity-50')}>
          <Label htmlFor={id}>{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {children}
    </div>
  )
}
