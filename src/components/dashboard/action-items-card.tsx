import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import type { ActionItem } from '@/lib/demo-dashboard'
import { cn } from '@/lib/utils'

export function ActionItemsCard({
  className,
  items,
}: {
  className?: string
  items: readonly ActionItem[]
}) {
  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(
    () => new Set(items.filter((item) => item.done).map((item) => item.id)),
  )

  // Open items first, overdue at the very top; finished ones sink.
  const sorted = [...items].sort(
    (a, b) =>
      Number(doneIds.has(a.id)) - Number(doneIds.has(b.id)) ||
      Number(b.due.overdue) - Number(a.due.overdue),
  )
  const open = items.filter((item) => !doneIds.has(item.id))
  const overdue = open.filter((item) => item.due.overdue).length

  function toggle(id: string, checked: boolean) {
    setDoneIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle>Action items</CardTitle>
        <CardDescription>
          Based on your previous meetings · {open.length} open
          {overdue > 0 && (
            <span className="text-destructive"> · {overdue} overdue</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 grid">
          {sorted.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              done={doneIds.has(item.id)}
              onToggle={(checked) => toggle(item.id, checked)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ActionItemRow({
  item,
  done,
  onToggle,
}: {
  item: ActionItem
  done: boolean
  onToggle: (checked: boolean) => void
}) {
  const checkboxId = `action-${item.id}`

  return (
    <li className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      <Checkbox
        id={checkboxId}
        checked={done}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="mt-0.5"
      />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <label
          htmlFor={checkboxId}
          className={cn(
            'cursor-pointer text-sm font-medium',
            done && 'text-muted-foreground line-through',
          )}
        >
          {item.title}
        </label>
        <p className="truncate text-xs text-muted-foreground">{item.meeting}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!done && (
          <Badge
            variant="outline"
            className={cn(
              'tabular-nums',
              item.due.overdue
                ? 'border-destructive/40 text-destructive'
                : 'text-muted-foreground',
            )}
          >
            {item.due.overdue ? 'Overdue' : item.due.label}
          </Badge>
        )}
      </div>
    </li>
  )
}
