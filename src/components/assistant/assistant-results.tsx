import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Radio,
  Send,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAssistant } from '@/components/assistant/assistant-provider'
import type { Turn } from '@/components/assistant/assistant-provider'
import { AssistantSuggestions } from '@/components/assistant/assistant-suggestions'
import {
  AiMark,
  Availability,
  MeetingDraftCard,
  slotLabel,
} from '@/components/assistant/meeting-draft-card'
import { DayCard } from '@/components/assistant/day-card'
import { AttendeeStack } from '@/components/dashboard/attendee-stack'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { ACTION_ITEM_PROMPTS } from '@/lib/assistant/respond'
import type { AssistantResult, PrepBrief } from '@/lib/assistant/respond'
import { findConflicts, suggestSlots } from '@/lib/assistant/schedule'
import type {
  AgendaSuggestion,
  CalendarEntry,
  Slot,
} from '@/lib/assistant/schedule'
import type { ActionItem, YesterdayRecap } from '@/lib/demo-dashboard'
import { formatSlot } from '@/lib/meeting-time'
import { cn } from '@/lib/utils'

export function AssistantResultView({ turn }: { turn: Turn }) {
  const result: AssistantResult = turn.reply.result
  switch (result.kind) {
    case 'schedule':
      return <MeetingDraftCard turn={turn} result={result} />
    case 'reschedule':
      return (
        <RescheduleCard
          turn={turn}
          meeting={result.meeting}
          proposed={result.slot}
        />
      )
    case 'prep':
      return <PrepCard meeting={result.meeting} brief={result.brief} />
    case 'day':
      return <DayCard date={result.date} items={result.items} />
    case 'agenda':
      return (
        <AgendaCard
          turn={turn}
          meeting={result.meeting}
          agenda={result.agenda}
        />
      )
    case 'recap':
      return <RecapCard recap={result.recap} />
    case 'actions':
      return <ActionsCard items={result.items} />
    case 'live':
      return <LiveStreamCard turn={turn} />
    case 'instant':
      return <InstantCard link={result.link} />
    case 'join':
      return (
        <ResultCard>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
              {result.code}
            </code>
            {/* TODO: route to the meeting room once it exists. */}
            <Button size="sm" className="ml-auto">
              <Video />
              Join meeting
            </Button>
          </div>
        </ResultCard>
      )
    case 'help':
      return (
        <ResultCard>
          <div className="p-2">
            <AssistantSuggestions
              layout="list"
              suggestions={result.suggestions}
            />
          </div>
        </ResultCard>
      )
    default: {
      const unhandled: never = result
      throw new Error(`Unhandled result: ${JSON.stringify(unhandled)}`)
    }
  }
}

function ResultCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl bg-card shadow-[0_8px_32px_-16px_rgb(0_0_0/0.18)] ring-1 ring-foreground/5 dark:bg-muted/30',
        className,
      )}
    >
      {children}
    </article>
  )
}

function CardHead({
  title,
  meta,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b px-4 py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <h4 className="text-sm font-semibold">{title}</h4>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      {children}
    </header>
  )
}

function Sources({ sources }: { sources: readonly string[] }) {
  if (sources.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Sources</span>
      {sources.map((source) => (
        <Badge
          key={source}
          variant="outline"
          className="font-normal text-muted-foreground"
        >
          <FileText />
          {source}
        </Badge>
      ))}
    </div>
  )
}

function MeetingLink({
  meeting,
  children,
}: {
  meeting: CalendarEntry
  children: ReactNode
}) {
  if (!meeting.detailId) return <>{children}</>
  return (
    <Link
      to="/meetings/$meetingId"
      params={{ meetingId: meeting.detailId }}
      className="underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  )
}

function AgendaList({ agenda }: { agenda: readonly AgendaSuggestion[] }) {
  return (
    <ol className="grid gap-2">
      {agenda.map((item, index) => (
        <li key={item.title} className="flex items-start gap-3">
          <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border bg-background text-[0.7rem] font-semibold tabular-nums">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 text-sm leading-5">{item.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {item.owner} · {item.minutes} min
          </span>
        </li>
      ))}
    </ol>
  )
}

function PrepCard({
  meeting,
  brief,
}: {
  meeting: CalendarEntry
  brief: PrepBrief
}) {
  const { ask, thinking } = useAssistant()
  return (
    <ResultCard>
      <CardHead
        title={<MeetingLink meeting={meeting}>{meeting.title}</MeetingLink>}
        meta={`${formatSlot(meeting.start)} – ${formatSlot(meeting.end)} · ${meeting.location.label}`}
      >
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          Starts {brief.startsIn}
        </Badge>
      </CardHead>
      <div className="grid gap-4 p-4">
        <div className="flex items-center gap-3">
          <AttendeeStack people={meeting.attendees} max={5} size="sm" />
          {meeting.prep && (
            <span className="text-xs text-muted-foreground">
              {meeting.prep.rsvp.accepted} of {meeting.prep.rsvp.total} accepted
            </span>
          )}
        </div>
        <section className="grid gap-2">
          <h5 className="flex items-center gap-2 text-xs font-medium">
            What to know
            <AiMark label="Pulled from notes of past meetings" />
          </h5>
          <ul className="grid gap-2 rounded-lg bg-muted/60 p-3 text-sm">
            {brief.context.map((line) => (
              <li key={line} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {line}
              </li>
            ))}
          </ul>
        </section>
        {brief.agenda && (
          <section className="grid gap-2">
            <h5 className="text-xs font-medium">Agenda</h5>
            <AgendaList agenda={brief.agenda} />
          </section>
        )}
        {meeting.prep && (
          <div className="flex flex-wrap gap-1.5">
            {meeting.prep.checks.map((check) => (
              <Badge
                key={check.label}
                variant="outline"
                className={cn(
                  'font-normal',
                  check.ok
                    ? 'text-muted-foreground'
                    : 'border-amber-500/40 text-amber-700 dark:text-amber-400',
                )}
              >
                {check.ok ? (
                  <Check />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
                {check.label}
              </Badge>
            ))}
          </div>
        )}
        <Sources sources={brief.sources} />
      </div>
      <footer className="flex flex-wrap gap-2 border-t bg-muted/30 px-4 py-3">
        {brief.missing.map((item) => (
          <Button
            key={item.label}
            size="sm"
            disabled={thinking}
            onClick={() => ask(item.prompt)}
          >
            <Sparkles />
            {item.label}
          </Button>
        ))}
        {meeting.detailId && (
          <Button asChild size="sm" variant="outline">
            <Link
              to="/meetings/$meetingId"
              params={{ meetingId: meeting.detailId }}
            >
              Open meeting
              <ArrowRight />
            </Link>
          </Button>
        )}
      </footer>
    </ResultCard>
  )
}

function AgendaCard({
  turn,
  meeting,
  agenda,
}: {
  turn: Turn
  meeting: CalendarEntry
  agenda: readonly AgendaSuggestion[]
}) {
  const { settle, setPaletteOpen } = useAssistant()
  const navigate = useNavigate()
  const total = agenda.reduce((sum, item) => sum + item.minutes, 0)

  function addToMeeting() {
    settle(turn.id, 'sent')
    setPaletteOpen(false)
    toast.success('Agenda added', { description: meeting.title })
    if (meeting.detailId) {
      void navigate({
        to: '/meetings/$meetingId',
        params: { meetingId: meeting.detailId },
        search: { edit: 'agenda' },
      })
    }
  }

  return (
    <ResultCard>
      <CardHead
        title={
          <span className="flex items-center gap-2">
            Agenda ·{' '}
            <MeetingLink meeting={meeting}>{meeting.title}</MeetingLink>
            <AiMark label="Drafted by AI from the meeting and past notes" />
          </span>
        }
        meta={`${agenda.length} items · ${total} of ${meeting.end - meeting.start} min`}
      />
      <div className="p-4">
        <AgendaList agenda={agenda} />
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        {turn.outcome === 'sent' ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-primary" />
            Added to the meeting
          </span>
        ) : (
          <>
            <Button size="sm" onClick={addToMeeting}>
              <Plus />
              Add to meeting
            </Button>
            <span className="text-xs text-muted-foreground sm:ml-auto">
              Or reply: “shorter”, “add a demo slot”
            </span>
          </>
        )}
      </footer>
    </ResultCard>
  )
}

function RescheduleCard({
  turn,
  meeting,
  proposed,
}: {
  turn: Turn
  meeting: CalendarEntry
  proposed: Slot
}) {
  const { settle } = useAssistant()
  const [slot, setSlot] = useState(proposed)
  const original: Slot = {
    date: meeting.date,
    start: meeting.start,
    end: meeting.end,
  }
  const conflicts = findConflicts(slot, meeting.attendees, meeting.id)
  const alternatives =
    conflicts.length > 0
      ? suggestSlots({
          from: slot.date,
          duration: slot.end - slot.start,
          attendees: meeting.attendees,
          exclude: slot,
          ignoreId: meeting.id,
        })
      : []
  const sent = turn.outcome === 'sent'

  return (
    <ResultCard>
      <CardHead
        title={<MeetingLink meeting={meeting}>{meeting.title}</MeetingLink>}
        meta={`${meeting.attendees.length} guests will get an update`}
      />
      <div className="grid gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground line-through">
            {slotLabel(original)}
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
          <span className="font-medium">
            {slotLabel(slot)} – {formatSlot(slot.end)}
          </span>
          <AiMark label="Proposed by AI" />
        </div>
        {!sent && (
          <Availability
            conflicts={conflicts}
            alternatives={alternatives}
            hasGuests
            onPick={setSlot}
          />
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
        {sent ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-primary" />
            Update sent to {meeting.attendees.length} guests
          </span>
        ) : (
          <>
            <Button
              size="sm"
              disabled={conflicts.length > 0}
              onClick={() => {
                settle(turn.id, 'sent')
                toast.success('Meeting moved', {
                  description: `${meeting.title} · ${slotLabel(slot)}`,
                })
              }}
            >
              <Send />
              Send update
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => settle(turn.id, 'discarded')}
            >
              Keep current time
            </Button>
          </>
        )}
      </footer>
    </ResultCard>
  )
}

function RecapCard({ recap }: { recap: YesterdayRecap }) {
  const { ask, thinking } = useAssistant()
  return (
    <ResultCard>
      <CardHead
        title={recap.dateLabel}
        meta={`${recap.totals.decisions} decisions · ${recap.totals.actionItems} action items`}
      />
      <div className="grid gap-4 p-4">
        <ul className="grid gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          {recap.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
              />
              {highlight}
            </li>
          ))}
        </ul>
        <section className="grid gap-2">
          <h5 className="text-xs font-medium">Decisions</h5>
          <ul className="grid gap-2.5">
            {recap.meetings.flatMap((meeting) =>
              meeting.decisions.map((decision) => (
                <li key={decision} className="grid gap-1 text-sm">
                  <span className="flex gap-2">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0 text-primary"
                    />
                    {decision}
                  </span>
                  <span className="pl-5.5">
                    <Badge
                      variant="outline"
                      className="font-normal text-muted-foreground"
                    >
                      <FileText />
                      {meeting.title} · {meeting.time}
                    </Badge>
                  </span>
                </li>
              )),
            )}
          </ul>
        </section>
      </div>
      <footer className="flex flex-wrap gap-2 border-t bg-muted/30 px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          disabled={thinking}
          onClick={() => ask('What are my action items?')}
        >
          See my action items
          <ArrowRight />
        </Button>
      </footer>
    </ResultCard>
  )
}

function ActionsCard({ items }: { items: readonly ActionItem[] }) {
  const { ask, thinking } = useAssistant()
  return (
    <ResultCard>
      <ul className="divide-y">
        {items.map((item) => {
          const prompt = ACTION_ITEM_PROMPTS[item.id]
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.meeting}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'tabular-nums',
                  item.due.overdue
                    ? 'border-destructive/40 text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {item.due.overdue ? 'Overdue' : item.due.label}
              </Badge>
              {prompt && (
                <Button
                  size="xs"
                  disabled={thinking}
                  onClick={() => ask(prompt)}
                >
                  <Sparkles />
                  Do it for me
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </ResultCard>
  )
}

type StreamDestination = {
  id: number
  platform: string
  enabled: boolean
  rtmpUrl: string
  streamKey: string
}

type StreamDestinationField = 'rtmpUrl' | 'streamKey'

const RTMP_URL = /^rtmps?:\/\/\S+$/i

const STREAM_PRESETS: readonly StreamDestination[] = [
  {
    id: 0,
    platform: 'Facebook',
    enabled: true,
    rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    streamKey: 'leapcast-demo-facebook-key',
  },
  {
    id: 1,
    platform: 'YouTube',
    enabled: true,
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: 'leapcast-demo-youtube-key',
  },
  {
    id: 2,
    platform: 'LinkedIn',
    enabled: true,
    rtmpUrl: 'rtmps://live-api.linkedin.com:443/rtmp/',
    streamKey: 'leapcast-demo-linkedin-key',
  },
  {
    id: 3,
    platform: 'Twitch',
    enabled: true,
    rtmpUrl: 'rtmp://live.twitch.tv/app',
    streamKey: 'leapcast-demo-twitch-key',
  },
]

function LiveStreamCard({ turn }: { turn: Turn }) {
  const { settle } = useAssistant()
  const [destinations, setDestinations] = useState<
    readonly StreamDestination[]
  >(STREAM_PRESETS)
  const [showErrors, setShowErrors] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<ReadonlySet<number>>(
    () => new Set(),
  )
  const started = turn.outcome === 'sent'
  const enabledDestinations = destinations.filter(
    (destination) => destination.enabled,
  )

  function updateDestination(
    id: number,
    field: StreamDestinationField,
    value: string,
  ) {
    setDestinations((current) =>
      current.map((destination) =>
        destination.id === id
          ? { ...destination, [field]: value }
          : destination,
      ),
    )
  }

  function addDestination() {
    setDestinations((current) => [
      ...current,
      {
        id: Math.max(-1, ...current.map((destination) => destination.id)) + 1,
        platform: 'Custom RTMP',
        enabled: true,
        rtmpUrl: '',
        streamKey: '',
      },
    ])
  }

  function setDestinationEnabled(id: number, enabled: boolean) {
    setDestinations((current) =>
      current.map((destination) =>
        destination.id === id ? { ...destination, enabled } : destination,
      ),
    )
    if (!enabled) {
      setVisibleKeys((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  function toggleStreamKey(id: number) {
    setVisibleKeys((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeDestination(id: number) {
    setDestinations((current) =>
      current.length === 1
        ? current
        : current.filter((destination) => destination.id !== id),
    )
    setVisibleKeys((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  function startStream(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)

    const valid =
      enabledDestinations.length > 0 &&
      enabledDestinations.every(
        (destination) =>
          RTMP_URL.test(destination.rtmpUrl.trim()) &&
          destination.streamKey.trim() !== '',
      )
    if (!valid) return

    setVisibleKeys(new Set())
    settle(turn.id, 'sent')
    toast.success('You’re live', {
      description: `${enabledDestinations.length} ${enabledDestinations.length === 1 ? 'destination' : 'destinations'} connected`,
    })
  }

  return (
    <ResultCard>
      <CardHead
        title={
          <span className="flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            Live stream setup
          </span>
        }
        meta="Saved RTMP destinations are prefilled and ready to review"
      >
        {started && (
          <Badge className="border-primary/20 bg-primary/10 text-primary">
            <span className="size-1.5 rounded-full bg-current" />
            Live
          </Badge>
        )}
      </CardHead>

      <form noValidate onSubmit={startStream}>
        <div className="divide-y">
          {destinations.map((destination, index) => {
            const rtmpInvalid =
              showErrors &&
              destination.enabled &&
              !RTMP_URL.test(destination.rtmpUrl.trim())
            const keyInvalid =
              showErrors &&
              destination.enabled &&
              destination.streamKey.trim() === ''
            const connected =
              RTMP_URL.test(destination.rtmpUrl.trim()) &&
              destination.streamKey.trim() !== ''
            const keyVisible = visibleKeys.has(destination.id)
            const rtmpId = `${turn.id}-rtmp-${destination.id}`
            const keyId = `${turn.id}-stream-key-${destination.id}`
            const switchId = `${turn.id}-stream-enabled-${destination.id}`

            return (
              <fieldset
                key={destination.id}
                disabled={started}
                className="grid gap-3 p-4"
              >
                <legend className="sr-only">{destination.platform}</legend>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
                    >
                      {destination.platform.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="grid min-w-0 gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {destination.platform}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Destination {index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {connected && (
                      <Badge
                        variant="outline"
                        className="border-primary/25 text-primary"
                      >
                        <Check />
                        Connected
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={switchId}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        Stream
                      </Label>
                      <Switch
                        id={switchId}
                        checked={destination.enabled}
                        aria-label={`Stream to ${destination.platform}`}
                        onCheckedChange={(enabled) =>
                          setDestinationEnabled(destination.id, enabled)
                        }
                      />
                    </div>
                    {!started && destinations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${destination.platform}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeDestination(destination.id)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={rtmpId}>RTMP URL</Label>
                    <Input
                      id={rtmpId}
                      type="url"
                      value={destination.rtmpUrl}
                      disabled={!destination.enabled}
                      placeholder="rtmps://live.example.com/app"
                      aria-invalid={rtmpInvalid}
                      aria-describedby={
                        rtmpInvalid ? `${rtmpId}-error` : undefined
                      }
                      onChange={(event) =>
                        updateDestination(
                          destination.id,
                          'rtmpUrl',
                          event.target.value,
                        )
                      }
                    />
                    {rtmpInvalid && (
                      <p
                        id={`${rtmpId}-error`}
                        className="text-xs text-destructive"
                      >
                        Enter a valid RTMP or RTMPS URL.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={keyId}>Stream key</Label>
                    <div className="relative">
                      <Input
                        id={keyId}
                        type={keyVisible ? 'text' : 'password'}
                        value={destination.streamKey}
                        disabled={!destination.enabled}
                        placeholder="Paste stream key"
                        autoComplete="off"
                        className="pr-10"
                        aria-invalid={keyInvalid}
                        aria-describedby={
                          keyInvalid ? `${keyId}-error` : undefined
                        }
                        onChange={(event) =>
                          updateDestination(
                            destination.id,
                            'streamKey',
                            event.target.value,
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={!destination.enabled}
                        aria-label={`${keyVisible ? 'Hide' : 'Show'} ${destination.platform} stream key`}
                        aria-pressed={keyVisible}
                        className="absolute top-0.5 right-0.5 text-muted-foreground"
                        onClick={() => toggleStreamKey(destination.id)}
                      >
                        {keyVisible ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                    {keyInvalid && (
                      <p
                        id={`${keyId}-error`}
                        className="text-xs text-destructive"
                      >
                        Enter the stream key for this destination.
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>
            )
          })}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
          {started ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-primary" />
              Streaming to {enabledDestinations.length}{' '}
              {enabledDestinations.length === 1
                ? 'destination'
                : 'destinations'}
            </span>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addDestination}
              >
                <Plus />
                Add destination
              </Button>
              {showErrors && enabledDestinations.length === 0 && (
                <p className="text-xs text-destructive" role="alert">
                  Select at least one destination.
                </p>
              )}
              <Button type="submit" size="sm" className="sm:ml-auto">
                <Radio />
                Go live
              </Button>
            </>
          )}
        </footer>
      </form>
    </ResultCard>
  )
}

function InstantCard({ link }: { link: string }) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <ResultCard>
      <div className="grid gap-3 p-4">
        <div className="flex gap-2">
          <Input
            readOnly
            aria-label="Meeting link"
            value={link}
            className="font-mono text-xs"
            onFocus={(event) => event.target.select()}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label={copied ? 'Link copied' : 'Copy link'}
            onClick={() => void copy(link)}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        {/* TODO: route to the meeting room once it exists. */}
        <Button size="sm" className="justify-self-start">
          <Video />
          Join now
        </Button>
      </div>
    </ResultCard>
  )
}
