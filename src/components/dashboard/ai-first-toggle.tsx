import { Sparkles } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAiFirst } from '@/hooks/use-ai-first'

export function AiFirstToggle() {
  const { aiFirst, setAiFirst } = useAiFirst()

  return (
    <div className="flex h-9 items-center gap-2.5 rounded-full bg-muted/60 pr-2 pl-3">
      <Sparkles aria-hidden className="size-3.5 text-primary" />
      <Label htmlFor="dashboard-ai-first" className="cursor-pointer">
        AI first
      </Label>
      <Switch
        id="dashboard-ai-first"
        checked={aiFirst}
        onCheckedChange={setAiFirst}
      />
    </div>
  )
}
