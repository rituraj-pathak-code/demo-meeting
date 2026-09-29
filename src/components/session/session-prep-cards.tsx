import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
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
import { NOW } from '@/lib/demo-meetings'
import type { Meeting, Session } from '@/lib/demo-meetings'
import { formatRelativeDay } from '@/lib/meeting-time'
import {
  getOpenActionItems,
  getPreviousCompletedSession,
  setActionItemDone,
} from '@/lib/sessions'

type FromLastTimeCardProps = {
  meeting: Meeting
  session: Session
  onChange: (update: (meeting: Meeting) => Meeting) => void
}

/** What happened before this session: last summary and open follow-ups. */
export function FromLastTimeCard({
  meeting,
  session,
  onChange,
}: FromLastTimeCardProps) {
  const previous = getPreviousCompletedSession(meeting, session)
  const carried = getOpenActionItems(meeting, session.number)
  if (!previous?.recap && carried.length === 0) return null

  return (
    <Card className="gap-4 border-dashed bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          From last time
          <Sparkles className="size-4 text-primary" aria-hidden />
        </CardTitle>
        {previous && (
          <CardDescription>
            Session {previous.number} · {formatRelativeDay(previous.date, NOW)}
          </CardDescription>
        )}
        {previous && (
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/meetings/$meetingId/sessions/$sessionId"
                params={{ meetingId: meeting.id, sessionId: previous.id }}
                search={{ tab: 'recap' }}
              >
                Recap
                <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {previous?.recap && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {previous.recap.summary}
          </p>
        )}
        {carried.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Still open · {carried.length}
            </p>
            <ul className="-mx-2 grid">
              {carried.map((item) => {
                const id = `carried-${item.id}`
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60"
                  >
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      onCheckedChange={() => {
                        onChange((current) =>
                          setActionItemDone(
                            current,
                            item.session.id,
                            item.id,
                            true,
                          ),
                        )
                        toast.success('Marked as done', {
                          description: item.title,
                        })
                      }}
                    />
                    <div className="grid min-w-0 gap-0.5">
                      <Label htmlFor={id} className="leading-5 font-normal">
                        {item.title}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.owner} · from session {item.session.number}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
