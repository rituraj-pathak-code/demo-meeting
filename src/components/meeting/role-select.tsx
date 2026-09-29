import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES, isAssignableRole } from '@/lib/roles'
import type { AssignableRole } from '@/lib/roles'
import { cn } from '@/lib/utils'

type RoleSelectProps = {
  value: AssignableRole
  onChange: (role: AssignableRole) => void
  /** Accessible name, e.g. "Role for Priya Menon". */
  label: string
  id?: string
  size?: 'sm' | 'default'
  className?: string
}

/** Co-host / Participant / Viewer, each with a one-line explanation. */
export function RoleSelect({
  value,
  onChange,
  label,
  id,
  size = 'sm',
  className,
}: RoleSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isAssignableRole(next)) onChange(next)
      }}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={id ? undefined : label}
        className={cn('w-32 shrink-0', className)}
      >
        {/* Only the label shows in the trigger; the help text is in the list. */}
        <SelectValue>{ROLES[value].label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="w-72">
        {Object.entries(ROLES).map(([role, option]) => (
          <SelectItem key={role} value={role} className="py-2">
            <div className="grid gap-0.5">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
