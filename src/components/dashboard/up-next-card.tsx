import { Link } from '@tanstack/react-router'
import {
  Check,
  Clock,
  Copy,
  Crown,
  FileText,
  MapPin,
  PenTool,
  Video,
} from 'lucide-react'

import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import type { Rsvp, UpNextMeeting } from '@/lib/demo-dashboard'

const RSVP_LABELS: Record<Rsvp, string> = {
  accepted: 'accepted',
  tentative: 'maybe',
  pending: 'awaiting reply',
}

function summarizeRsvps(meeting: UpNextMeeting) {
  return (Object.keys(RSVP_LABELS) as Rsvp[])
    .map((rsvp) => ({
      rsvp,
      count: meeting.attendees.filter((person) => person.rsvp === rsvp).length,
    }))
    .filter(({ count }) => count > 0)
    .map(({ rsvp, count }) => `${count} ${RSVP_LABELS[rsvp]}`)
    .join(' · ')
}

export function UpNextCard({ meeting }: { meeting: UpNextMeeting }) {
  const { copied, copy } = useCopyToClipboard()
  const agendaMinutes = meeting.agenda.reduce(
    (total, item) => total + item.minutes,
    0,
  )

  return (
    <Card className="relative gap-5 overflow-hidden bg-linear-to-br from-primary/[0.07] via-card to-card">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Up next · starts in {meeting.startsIn}
          </Badge>
          {meeting.role === 'host' && (
            <Badge variant="outline">
              <Crown />
              You’re hosting
            </Badge>
          )}
        </div>
        <CardTitle className="pt-1 text-xl leading-tight sm:text-2xl">
          <Link
            to="/meetings/$meetingId/sessions/$sessionId"
            params={{
              meetingId: meeting.detailId,
              sessionId: meeting.sessionId,
            }}
            className="underline-offset-4 hover:underline"
          >
            {meeting.title}
          </Link>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {meeting.startTime} – {meeting.endTime}
            <span aria-hidden>·</span>
            {meeting.durationLabel}
          </span>
          {meeting.location.kind === 'room' && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {meeting.location.label}
            </span>
          )}
        </CardDescription>
        <CardAction>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copied ? 'Link copied' : 'Copy meeting link'}
                onClick={() => void copy(meeting.meetingLink)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {copied ? 'Copied' : 'Copy meeting link'}
            </TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-5">
        <section className="md:col-span-3" aria-labelledby="up-next-agenda">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 id="up-next-agenda" className="text-sm font-medium">
              Agenda
            </h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {agendaMinutes} min planned
            </span>
          </div>
          <ol className="grid gap-2.5">
            {meeting.agenda.map((item, index) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border bg-background text-[0.7rem] font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.owner} · {item.minutes} min
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid content-start gap-5 md:col-span-2">
          <section aria-labelledby="up-next-people">
            <h3 id="up-next-people" className="mb-3 text-sm font-medium">
              {meeting.attendees.length} attendees
            </h3>
            <AttendeeStack people={meeting.attendees} max={5} />
            <p className="mt-2 text-xs text-muted-foreground">
              {summarizeRsvps(meeting)}
            </p>
          </section>
          <section aria-labelledby="up-next-prep">
            <h3 id="up-next-prep" className="mb-2 text-sm font-medium">
              Prep
            </h3>
            <ul className="-mx-2 grid gap-0.5">
              {meeting.resources.map((resource) => {
                const Icon = resource.kind === 'design' ? PenTool : FileText
                return (
                  <li key={resource.label}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start font-normal"
                    >
                      <Icon className="text-muted-foreground" />
                      <span className="truncate">{resource.label}</span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </CardContent>

      <CardFooter className="flex-wrap gap-2 border-t bg-card/60 pt-5 [.border-t]:pt-5">
        {/* TODO: route to the meeting room once it exists. */}
        <Button>
          <Video />
          {meeting.role === 'host' ? 'Start meeting' : 'Join meeting'}
        </Button>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          Recording and AI notes are on
        </p>
      </CardFooter>
    </Card>
  )
}
