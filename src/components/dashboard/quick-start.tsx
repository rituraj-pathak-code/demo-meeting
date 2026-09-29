import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarPlus, KeyRound, Plus, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { CreateMeetingDialog } from '@/components/dashboard/create-meeting-dialog'
import { InstantMeetingDialog } from '@/components/dashboard/instant-meeting-dialog'
import { JoinMeetingDialog } from '@/components/dashboard/join-meeting-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type OpenDialog = 'instant' | 'create' | 'join' | null

const TILE_CLASS =
  'h-auto justify-start gap-3 rounded-xl p-3 text-left whitespace-normal shadow-xs has-[>svg]:px-3'

function TileBody({
  icon: Icon,
  title,
  description,
  featured = false,
}: {
  icon: LucideIcon
  title: string
  description: string
  featured?: boolean
}) {
  return (
    <>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          featured ? 'bg-primary-foreground/15' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span
          className={cn(
            'truncate text-xs font-normal',
            featured ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {description}
        </span>
      </span>
    </>
  )
}

export function QuickStart() {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)

  function dialogProps(dialog: Exclude<OpenDialog, null>) {
    return {
      open: openDialog === dialog,
      onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
    }
  }

  return (
    <section aria-label="Quick start">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Button className={TILE_CLASS} onClick={() => setOpenDialog('instant')}>
          <TileBody
            featured
            icon={Zap}
            title="Instant meeting"
            description="Open a room now"
          />
        </Button>
        <Button
          variant="outline"
          className={TILE_CLASS}
          onClick={() => setOpenDialog('create')}
        >
          <TileBody
            icon={Plus}
            title="Create meeting"
            description="Name, time, repeat"
          />
        </Button>
        <Button asChild variant="outline" className={TILE_CLASS}>
          <Link to="/calendar">
            <TileBody
              icon={CalendarPlus}
              title="Schedule"
              description="Pick a time"
            />
          </Link>
        </Button>
        <Button
          variant="outline"
          className={TILE_CLASS}
          onClick={() => setOpenDialog('join')}
        >
          <TileBody
            icon={KeyRound}
            title="Join with code"
            description="Code or link"
          />
        </Button>
      </div>

      <InstantMeetingDialog {...dialogProps('instant')} />
      <CreateMeetingDialog {...dialogProps('create')} />
      <JoinMeetingDialog {...dialogProps('join')} />
    </section>
  )
}
