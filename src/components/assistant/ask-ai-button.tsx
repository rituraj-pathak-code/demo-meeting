import { Sparkles } from 'lucide-react'

import { Kbd, useAssistant } from '@/components/assistant/assistant-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AskAiButton({ className }: { className?: string }) {
  const { setPaletteOpen } = useAssistant()

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-2 text-muted-foreground', className)}
      onClick={() => setPaletteOpen(true)}
    >
      <Sparkles className="text-primary" />
      <span className="hidden sm:inline">Ask Leap AI</span>
      <Kbd>⌘K</Kbd>
    </Button>
  )
}
