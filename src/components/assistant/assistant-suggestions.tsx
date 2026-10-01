import {
  CalendarPlus,
  ClipboardList,
  ListChecks,
  NotebookPen,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useAssistant } from '@/components/assistant/assistant-provider'
import { Button } from '@/components/ui/button'
import { getSuggestions } from '@/lib/assistant/respond'
import type { Suggestion, SuggestionKind } from '@/lib/assistant/respond'
import { cn } from '@/lib/utils'

const ICONS: Record<SuggestionKind, LucideIcon> = {
  prep: NotebookPen,
  agenda: ClipboardList,
  schedule: CalendarPlus,
  recap: Sparkles,
  actions: ListChecks,
}

const SUGGESTIONS = getSuggestions()

export function AssistantSuggestions({
  layout = 'chips',
  suggestions = SUGGESTIONS,
}: {
  layout?: 'chips' | 'list'
  suggestions?: readonly Suggestion[]
}) {
  const { ask, thinking } = useAssistant()

  return (
    <ul
      className={cn(layout === 'chips' ? 'flex flex-wrap gap-2' : 'grid gap-1')}
    >
      {suggestions.map((suggestion) => {
        const Icon = ICONS[suggestion.kind]
        const urgent = suggestion.hint === 'Overdue'
        return (
          <li key={suggestion.prompt}>
            <Button
              type="button"
              variant={layout === 'chips' ? 'outline' : 'ghost'}
              size="sm"
              disabled={thinking}
              onClick={() => ask(suggestion.prompt)}
              className={cn(
                'font-normal',
                layout === 'chips'
                  ? 'h-8 rounded-full bg-background'
                  : 'h-auto w-full justify-start py-2',
              )}
            >
              <Icon className="text-primary" />
              <span className="truncate">{suggestion.label}</span>
              {suggestion.hint && (
                <span
                  className={cn(
                    'text-xs',
                    layout === 'list' && 'ml-auto',
                    urgent ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {suggestion.hint}
                </span>
              )}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
