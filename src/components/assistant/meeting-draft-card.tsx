import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  PenLine,
  Repeat,
  Send,
  Sparkles,
  Users,
  Video,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { useAssistant } from '@/components/assistant/assistant-provider'
import {
  AddGuestButton,
  AgendaEditor,
  DatePill,
  MeetingOptionsEditor,
  RepeatPill,
  TimePill,
} from '@/components/assistant/draft-editors'
import type { Turn } from '@/components/assistant/assistant-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import type { ScheduleResult } from '@/lib/assistant/respond'
import {
  describeRule,
  findConflicts,
  suggestSlots,
} from '@/lib/assistant/schedule'
import type {
  Conflict,
  DraftField,
  MeetingDraft,
  Slot,
} from '@/lib/assistant/schedule'
import { NOW, createNewMeeting, getMeeting } from '@/lib/demo-meetings'
import { formatRelativeDay, formatSlot, toDateParam } from '@/lib/meeting-time'
import { toRuleParam } from '@/lib/rule-param'
import { getInitials } from '@/lib/utils'

export function AiMark({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={label}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Sparkles className="size-2.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function slotLabel(slot: Slot) {
  const day = formatRelativeDay(slot.date, NOW)
  return `${day} · ${formatSlot(slot.start)}`
}

function DetailRow({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
        {children}
      </div>
    </div>
  )
}

const FIELD_LABELS: Record<DraftField, string> = {
  title: 'Title suggested by AI',
  time: 'AI picked the first time everyone’s free',
  duration: 'AI picked a default length',
  agenda: 'Agenda drafted by AI',
}

export function MeetingDraftCard({
  turn,
  result,
}: {
  turn: Turn
  result: ScheduleResult
}) {
  const { updateDraft, settle, setPaletteOpen } = useAssistant()
  const navigate = useNavigate()
  const { draft, inferred } = result
  const duration = draft.end - draft.start
  const conflicts = findConflicts(draft, draft.attendees)
  const alternatives =
    conflicts.length > 0
      ? suggestSlots({
          from: draft.date,
          duration,
          attendees: draft.attendees,
          exclude: draft,
        })
      : []

  if (turn.outcome !== null) {
    return <SettledDraft draft={draft} outcome={turn.outcome} />
  }

  function change(patch: Partial<MeetingDraft>, edited: DraftField[] = []) {
    updateDraft(turn.id, { ...draft, ...patch }, edited)
  }

  function create() {
    const title = draft.title.trim() || 'Untitled meeting'
    createNewMeeting({
      title,
      date: draft.date,
      start: draft.start,
      end: draft.end,
      recurrence: draft.rule
        ? { label: describeRule(draft.rule, draft.date), rule: draft.rule }
        : null,
      attendees: draft.attendees,
      agenda: draft.agenda,
      options: draft.options,
    })
    toast.success('Meeting created', {
      description: `${title} · ${slotLabel(draft)} · ${draft.attendees.length} guests`,
    })
    settle(turn.id, 'created')
  }

  function openFullEditor() {
    const title = draft.title.trim() || 'Untitled meeting'
    void navigate({
      to: '/meetings/$meetingId',
      params: { meetingId: 'new' },
      search: {
        title,
        date: toDateParam(draft.date),
        start: draft.start,
        end: draft.end,
        repeat: draft.rule ? describeRule(draft.rule, draft.date) : undefined,
        rule: draft.rule ? toRuleParam(draft.rule) : undefined,
        edit: 'details',
        draft: true,
      },
    })
    settle(turn.id, 'drafted')
    setPaletteOpen(false)
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-[0_8px_32px_-16px_rgb(0_0_0/0.18)] ring-1 ring-foreground/5 dark:bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-primary/[0.04] px-4 py-2">
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          <Sparkles />
          AI draft
        </Badge>
        <span className="text-xs text-muted-foreground">
          Nothing is sent until you confirm
        </span>
      </header>

      <div className="grid gap-4 p-4">
        <div className="flex items-center gap-2">
          <input
            aria-label="Meeting title"
            value={draft.title}
            onChange={(event) =>
              change({ title: event.target.value }, ['title'])
            }
            className="-mx-1.5 min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-0.5 text-base font-semibold outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {inferred.includes('title') && <AiMark label={FIELD_LABELS.title} />}
          <PenLine
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </div>

        <div className="grid gap-3">
          <DetailRow icon={<Clock />}>
            <DatePill
              value={draft.date}
              onChange={(date) => {
                // A weekly series follows the day it was moved to.
                const rule =
                  draft.rule && draft.rule.days.length === 1
                    ? { ...draft.rule, days: [date.getDay()] }
                    : draft.rule
                change({ date, rule }, ['time'])
              }}
            />
            <TimePill
              start={draft.start}
              end={draft.end}
              onChange={(range) => change(range, ['time', 'duration'])}
            />
            {(inferred.includes('time') || inferred.includes('duration')) && (
              <AiMark
                label={
                  inferred.includes('time')
                    ? FIELD_LABELS.time
                    : FIELD_LABELS.duration
                }
              />
            )}
          </DetailRow>
          <DetailRow icon={<Repeat />}>
            <RepeatPill
              rule={draft.rule}
              date={draft.date}
              onChange={(rule) => change({ rule })}
            />
          </DetailRow>
          <DetailRow icon={<Video />}>
            <span>Leapcast video</span>
          </DetailRow>
          <DetailRow icon={<Users />}>
            <GuestChip name="You" detail="host" />
            {draft.attendees.map((person) => (
              <GuestChip
                key={person.email}
                name={person.name}
                detail={
                  person.email.endsWith('@leapcast.io') ? undefined : 'external'
                }
                onRemove={() =>
                  change({
                    attendees: draft.attendees.filter(
                      (p) => p.email !== person.email,
                    ),
                  })
                }
              />
            ))}
            <AddGuestButton
              invited={draft.attendees}
              onAdd={(person) =>
                change({ attendees: [...draft.attendees, person] })
              }
            />
          </DetailRow>
        </div>

        <Availability
          conflicts={conflicts}
          alternatives={alternatives}
          hasGuests={draft.attendees.length > 0}
          onPick={(slot) => change(slot)}
        />

        <section
          aria-labelledby={`${turn.id}-agenda`}
          className="rounded-lg border"
        >
          <h4
            id={`${turn.id}-agenda`}
            className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium"
          >
            {inferred.includes('agenda') ? 'Suggested agenda' : 'Agenda'}
            {inferred.includes('agenda') && (
              <AiMark label={FIELD_LABELS.agenda} />
            )}
            <span className="ml-auto font-normal text-muted-foreground">
              Click to edit
            </span>
          </h4>
          <AgendaEditor
            agenda={draft.agenda}
            duration={duration}
            onChange={(agenda) => change({ agenda }, ['agenda'])}
          />
        </section>

        <section aria-labelledby={`${turn.id}-options`} className="grid gap-2">
          <h4 id={`${turn.id}-options`} className="text-xs font-medium">
            Meeting options
          </h4>
          <MeetingOptionsEditor
            options={draft.options}
            attendees={draft.attendees}
            onChange={(options) => change({ options })}
          />
        </section>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <Button size="sm" onClick={create}>
          <Send />
          {draft.attendees.length > 0
            ? 'Create & send invites'
            : 'Create meeting'}
        </Button>
        <Button size="sm" variant="outline" onClick={openFullEditor}>
          Edit details
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => settle(turn.id, 'discarded')}
        >
          Discard
        </Button>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          Or reply to change it
        </span>
      </footer>
    </article>
  )
}

function GuestChip({
  name,
  detail,
  onRemove,
}: {
  name: string
  detail?: string
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-background pr-1 pl-1 text-xs">
      <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[0.6rem] font-medium">
        {name === 'You' ? 'Y' : getInitials(name)}
      </span>
      <span className="font-medium">
        {name === 'You' ? name : name.split(' ')[0]}
      </span>
      {detail && <span className="text-muted-foreground">{detail}</span>}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  )
}

function conflictText(conflict: Conflict) {
  switch (conflict.kind) {
    case 'past':
      return 'That time has already passed'
    case 'weekend':
      return 'That’s on a weekend'
    case 'busy':
      return `${conflict.who.join(' & ')} · ${conflict.title} (${formatSlot(conflict.start)} – ${formatSlot(conflict.end)})`
    default: {
      const unhandled: never = conflict
      throw new Error(`Unhandled conflict: ${JSON.stringify(unhandled)}`)
    }
  }
}

export function Availability({
  conflicts,
  alternatives,
  hasGuests,
  onPick,
}: {
  conflicts: readonly Conflict[]
  alternatives: readonly Slot[]
  hasGuests: boolean
  onPick: (slot: Slot) => void
}) {
  if (conflicts.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CircleCheck className="size-4" />
        {hasGuests ? 'Everyone’s free' : 'You’re free'}. No conflicts.
      </p>
    )
  }
  return (
    <div className="grid gap-2.5 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm">
      <ul className="grid gap-1 text-amber-800 dark:text-amber-300">
        {conflicts.map((conflict) => (
          <li key={conflictText(conflict)} className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {conflictText(conflict)}
          </li>
        ))}
      </ul>
      {alternatives.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-xs text-muted-foreground">
            Times that work for everyone
          </p>
          <div className="flex flex-wrap gap-1.5">
            {alternatives.map((slot) => (
              <Button
                key={`${slot.date.getTime()}-${slot.start}`}
                type="button"
                size="xs"
                variant="outline"
                className="h-7 rounded-full bg-background px-2.5"
                onClick={() => onPick(slot)}
              >
                <Sparkles className="text-primary" />
                {slotLabel(slot)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SettledDraft({
  draft,
  outcome,
}: {
  draft: MeetingDraft
  outcome: NonNullable<Turn['outcome']>
}) {
  if (outcome === 'created') return <CreatedMeetingCard draft={draft} />

  const label =
    outcome === 'drafted'
      ? 'Saved as draft'
      : outcome === 'superseded'
        ? 'Updated below'
        : outcome === 'discarded'
          ? 'Discarded'
          : 'Done'
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
      {outcome === 'drafted' ? (
        <Check className="size-4 text-primary" />
      ) : (
        <X className="size-4" />
      )}
      <span className="font-medium text-foreground">{label}</span>
      <span className="truncate">
        {draft.title} · {slotLabel(draft)}
      </span>
    </p>
  )
}

function CreatedMeetingCard({ draft }: { draft: MeetingDraft }) {
  const { copied, copy } = useCopyToClipboard()
  const meetingLink =
    getMeeting('new')?.link ?? 'https://leapcast.io/j/new-mtng-zpl'
  const title = draft.title.trim() || 'Untitled meeting'

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-2 border-b bg-primary/[0.04] px-4 py-3">
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          <Check />
          Meeting created
        </Badge>
        <span className="text-xs text-muted-foreground">
          {draft.attendees.length > 0
            ? `Invites sent to ${draft.attendees.length} guests`
            : 'Ready to start'}
        </span>
      </header>

      <div className="grid gap-4 p-4">
        <div className="grid gap-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {slotLabel(draft)} – {formatSlot(draft.end)}
            {draft.rule ? ` · ${describeRule(draft.rule, draft.date)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            <Video />
            Leapcast video
          </Badge>
          <Badge variant="outline" className="font-normal">
            <Users />
            {draft.attendees.length}{' '}
            {draft.attendees.length === 1 ? 'guest' : 'guests'}
          </Badge>
          {draft.agenda.length > 0 && (
            <Badge variant="outline" className="font-normal">
              {draft.agenda.length}{' '}
              {draft.agenda.length === 1 ? 'agenda item' : 'agenda items'}
            </Badge>
          )}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        <Button
          size="sm"
          onClick={() =>
            toast.success('Starting meeting', { description: title })
          }
        >
          <Video />
          Start meeting
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: 'new' }}
            search={{ edit: 'details' }}
          >
            <PenLine />
            Edit
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: 'new' }}
            search={{}}
          >
            View details
            <ExternalLink />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground sm:ml-auto"
          onClick={() => void copy(meetingLink)}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </footer>
    </article>
  )
}
