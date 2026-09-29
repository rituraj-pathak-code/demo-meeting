import { Check, PlayCircle, Sparkles } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { YesterdayRecap } from '@/lib/demo-dashboard'

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function YesterdayRecapCard({ recap }: { recap: YesterdayRecap }) {
  const { totals } = recap

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Yesterday at a glance
          <Sparkles className="size-4 text-primary" aria-hidden />
        </CardTitle>
        <CardDescription>
          {plural(totals.meetings, 'meeting')} · {totals.timeLabel} ·{' '}
          {plural(totals.decisions, 'decision')} ·{' '}
          {plural(totals.actionItems, 'action item')}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <ul className="grid gap-2 rounded-lg bg-muted/60 p-3.5 text-sm">
          {recap.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <Accordion type="single" collapsible>
          {recap.meetings.map((meeting) => (
            <AccordionItem key={meeting.id} value={meeting.id}>
              <AccordionTrigger className="items-center py-3 hover:no-underline">
                <span className="flex min-w-0 flex-1 items-baseline gap-3">
                  <span className="w-14 shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                    {meeting.time}
                  </span>
                  <span className="truncate">{meeting.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 pl-17">
                <p className="text-muted-foreground">{meeting.summary}</p>
                {meeting.decisions.length > 0 && (
                  <ul className="grid gap-1">
                    {meeting.decisions.map((decision) => (
                      <li key={decision} className="flex gap-2">
                        <Check
                          aria-hidden
                          className="mt-0.5 size-3.5 shrink-0 text-primary"
                        />
                        {decision}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="-ml-2 flex flex-wrap gap-1">
                  <Button variant="ghost" size="xs">
                    <Sparkles />
                    Full notes
                  </Button>
                  {meeting.recordingLength && (
                    <Button variant="ghost" size="xs" className="tabular-nums">
                      <PlayCircle />
                      {meeting.recordingLength}
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
