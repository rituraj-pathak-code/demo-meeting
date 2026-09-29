import { Video } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { Meeting, Session } from '@/lib/demo-meetings'
import { getSessionAction } from '@/lib/sessions'
import { cn } from '@/lib/utils'

type SessionActionButtonProps = {
  meeting: Meeting
  session: Session
  className?: string
  /** Show the "opens when the host starts" hint under a waiting Join. */
  showHint?: boolean
}

/**
 * Start / Join for a session. Hosts can always start (early if needed);
 * attendees can only join once the host has started.
 */
export function SessionActionButton({
  meeting,
  session,
  className,
  showHint = true,
}: SessionActionButtonProps) {
  const action = getSessionAction(meeting, session)
  const label = meeting.recurrence ? `session ${session.number}` : 'the meeting'

  // TODO: route to the meeting room once it exists.
  function enterRoom(message: string) {
    toast.success(message, { description: meeting.details.title })
  }

  switch (action.kind) {
    case 'rejoin':
      return (
        <Button
          className={cn('relative z-10', className)}
          onClick={() => enterRoom('Rejoining')}
        >
          <Video />
          Rejoin
        </Button>
      )
    case 'start-now':
      return (
        <Button
          className={cn('relative z-10', className)}
          onClick={() => enterRoom(`Starting ${label}`)}
        >
          <Video />
          Start now
        </Button>
      )
    case 'start-early':
      return (
        <Button
          variant="outline"
          className={cn('relative z-10', className)}
          onClick={() => enterRoom(`Starting ${label} early`)}
        >
          <Video />
          {meeting.recurrence ? 'Start next session now' : 'Start early'}
        </Button>
      )
    case 'join-now':
      return (
        <Button
          className={cn('relative z-10', className)}
          onClick={() => enterRoom('Joining')}
        >
          <Video />
          Join now
        </Button>
      )
    case 'join-waiting':
      return (
        <div className={cn('relative z-10 grid gap-1', className)}>
          {/* Looks disabled but stays clickable so we can explain why. */}
          <Button
            variant="outline"
            aria-disabled
            className="cursor-not-allowed opacity-50 hover:bg-background hover:text-foreground dark:hover:bg-input/30"
            onClick={() =>
              toast.info('The host hasn’t started the meeting yet', {
                description: `${meeting.details.title} · you can join as soon as it starts.`,
              })
            }
          >
            <Video />
            Join
          </Button>
          {showHint && (
            <p className="text-center text-xs text-muted-foreground">
              Opens when the host starts
            </p>
          )}
        </div>
      )
    default: {
      const unhandled: never = action
      throw new Error(`Unhandled session action: ${JSON.stringify(unhandled)}`)
    }
  }
}
