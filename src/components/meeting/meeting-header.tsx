import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Crown, MoreHorizontal, Repeat, XCircle } from 'lucide-react'

import { ShareMeetingButton } from '@/components/meetings/share-meeting-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Meeting } from '@/lib/demo-meetings'
import { formatLongDate, formatSlot } from '@/lib/meeting-time'

type MeetingHeaderProps = {
  meeting: Meeting
  /** Primary action, e.g. Start / Join for the next session. */
  primaryAction: ReactNode
}

export function MeetingHeader({ meeting, primaryAction }: MeetingHeaderProps) {
  const { details } = meeting
  const isHost = meeting.role === 'host'
  const when = meeting.recurrence
    ? `${meeting.recurrence.label} · ${formatSlot(details.start)} – ${formatSlot(details.end)}`
    : `${formatLongDate(details.date)} · ${formatSlot(details.start)} – ${formatSlot(details.end)}`

  return (
    <div className="grid gap-4">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2.5 justify-self-start text-muted-foreground"
      >
        <Link to="/meetings">
          <ArrowLeft />
          My meetings
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isHost ? (
              <Badge variant="outline">
                <Crown />
                You’re hosting
              </Badge>
            ) : (
              <Badge variant="outline">Hosted by {meeting.host.name}</Badge>
            )}
            {meeting.recurrence && (
              <Badge variant="secondary">
                <Repeat />
                Recurring series
              </Badge>
            )}
            {meeting.lifecycle.status === 'draft' && (
              <Badge variant="secondary">Draft · invites not sent</Badge>
            )}
            {meeting.lifecycle.status === 'cancelled' && (
              <Badge variant="destructive">Cancelled</Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {details.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {when} · {details.location.label}
          </p>
          {meeting.lifecycle.status === 'cancelled' && (
            <p className="text-sm text-muted-foreground">
              Cancelled by {meeting.lifecycle.cancelledBy}
              {meeting.lifecycle.reason && ` — ${meeting.lifecycle.reason}`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {meeting.lifecycle.status === 'active' && (
            <ShareMeetingButton meeting={meeting} size="default" />
          )}
          {primaryAction}
          {isHost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem>Duplicate meeting</DropdownMenuItem>
                <DropdownMenuItem>Save as template</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <XCircle />
                  {meeting.recurrence ? 'End the series' : 'Cancel meeting'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}
