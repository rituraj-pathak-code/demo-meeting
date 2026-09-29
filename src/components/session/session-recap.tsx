import { Check, FileText, PlayCircle, Share2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { SessionRecap } from '@/lib/demo-meetings'
import { cn } from '@/lib/utils'

type SessionRecapViewProps = {
  recap: SessionRecap
  onToggleActionItem: (itemId: string, done: boolean) => void
}

export function SessionRecapView({
  recap,
  onToggleActionItem,
}: SessionRecapViewProps) {
  const open = recap.actionItems.filter((item) => !item.done).length

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 gap-4">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Summary
              <Sparkles className="size-4 text-primary" aria-hidden />
            </CardTitle>
            <CardDescription>Written by AI from the transcript</CardDescription>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.success('Recap sent to everyone invited')}
              >
                <Share2 />
                Share
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{recap.summary}</p>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {recap.decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No decisions were recorded.
              </p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {recap.decisions.map((decision) => (
                  <li key={decision} className="flex gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {decision}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Action items</CardTitle>
            <CardDescription>
              {open === 0
                ? 'All done'
                : `${open} open · carried into the next session until done`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="-mx-2 grid">
              {recap.actionItems.map((item) => {
                const id = `recap-${item.id}`
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                  >
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      checked={item.done}
                      onCheckedChange={(checked) =>
                        onToggleActionItem(item.id, checked === true)
                      }
                    />
                    <div className="grid min-w-0 gap-0.5">
                      <Label
                        htmlFor={id}
                        className={cn(
                          'leading-5 font-normal',
                          item.done && 'text-muted-foreground line-through',
                        )}
                      >
                        {item.title}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.owner}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Recording</CardTitle>
          <CardDescription>
            {recap.recordingLength
              ? `${recap.recordingLength} · transcript available`
              : 'Not recorded'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {recap.recordingLength ? (
            <>
              <Button
                variant="secondary"
                className="group relative aspect-video h-auto w-full overflow-hidden rounded-lg"
                aria-label="Play recording"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-background/90 shadow-sm transition-transform group-hover:scale-105">
                  <PlayCircle className="size-6 text-primary" />
                </span>
                <span className="absolute right-2 bottom-2 rounded bg-foreground/80 px-1.5 py-0.5 font-mono text-[0.7rem] text-background">
                  {recap.recordingLength}
                </span>
              </Button>
              <Button variant="outline" size="sm">
                <FileText />
                Open transcript
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Recording was off for this session. Notes were still taken.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
