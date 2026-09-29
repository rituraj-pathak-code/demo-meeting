import { Copy, Link2, Mail, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Meeting, Session } from '@/lib/demo-meetings'
import { formatLongDate, formatSlot } from '@/lib/meeting-time'
import { getEffectiveSession } from '@/lib/sessions'
import { cn } from '@/lib/utils'

type ShareMeetingButtonProps = {
  meeting: Meeting
  /** Share a specific session; otherwise the meeting (and its next session). */
  session?: Session
  /** `icon` for dense rows, `default` for page headers. */
  size?: 'icon' | 'default'
  className?: string
}

function inviteText(
  meeting: Meeting,
  session: Session | undefined,
  link: string,
) {
  const when = session
    ? (() => {
        const { time } = getEffectiveSession(meeting, session)
        return `${formatLongDate(time.date)}, ${formatSlot(time.start)} – ${formatSlot(time.end)}`
      })()
    : meeting.recurrence
      ? `${meeting.recurrence.label}, ${formatSlot(meeting.details.start)} – ${formatSlot(meeting.details.end)}`
      : `${formatLongDate(meeting.details.date)}, ${formatSlot(meeting.details.start)} – ${formatSlot(meeting.details.end)}`

  return [
    meeting.details.title,
    when,
    '',
    `Join: ${link}`,
    `Meeting code: ${meeting.code}`,
    meeting.access.passcode ? `Passcode: ${meeting.access.passcode}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  } catch {
    toast.error('Couldn’t copy to the clipboard')
  }
}

/** Copy link, copy a full invite, or open an email draft. */
export function ShareMeetingButton({
  meeting,
  session,
  size = 'icon',
  className,
}: ShareMeetingButtonProps) {
  const link =
    session && meeting.recurrence
      ? `${meeting.link}?s=${session.id}`
      : meeting.link
  const invite = inviteText(meeting, session, link)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {size === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative z-10 shrink-0', className)}
            aria-label={`Share ${meeting.details.title}`}
          >
            <Share2 />
          </Button>
        ) : (
          <Button variant="outline" className={cn('relative z-10', className)}>
            <Share2 />
            Share
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {session && meeting.recurrence
            ? `Share session ${session.number}`
            : 'Share meeting'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void copy(link, 'Meeting link copied')}
        >
          <Link2 />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy(invite, 'Invite copied')}>
          <Copy />
          Copy invite
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(meeting.details.title)}&body=${encodeURIComponent(invite)}`}
          >
            <Mail />
            Email invite
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
