import { createContext, use, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

import { AssistantComposer } from '@/components/assistant/assistant-composer'
import { AssistantSuggestions } from '@/components/assistant/assistant-suggestions'
import { AssistantThread } from '@/components/assistant/assistant-thread'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { respond } from '@/lib/assistant/respond'
import type { ActiveDraft, AssistantReply } from '@/lib/assistant/respond'
import type { DraftField, MeetingDraft } from '@/lib/assistant/schedule'

export type TurnOutcome =
  'created' | 'drafted' | 'sent' | 'discarded' | 'superseded'

export type Turn = {
  id: string
  prompt: string
  reply: AssistantReply
  /** How many thinking steps are revealed; past the end means answered. */
  step: number
  outcome: TurnOutcome | null
}

type AssistantContextValue = {
  turns: readonly Turn[]
  thinking: boolean
  hasDraft: boolean
  ask: (prompt: string) => void
  /** `edited` fields lose their AI mark: a person has now chosen them. */
  updateDraft: (
    turnId: string,
    draft: MeetingDraft,
    edited?: readonly DraftField[],
  ) => void
  settle: (turnId: string, outcome: TurnOutcome) => void
  reset: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function useAssistant() {
  const value = use(AssistantContext)
  if (!value)
    throw new Error('useAssistant must be used inside AssistantProvider')
  return value
}

export function isAnswered(turn: Turn) {
  return turn.step >= turn.reply.steps.length
}

const STEP_MS = 420

function activeDraftOf(
  turns: readonly Turn[],
): (ActiveDraft & { turnId: string }) | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]
    if (turn?.reply.result.kind === 'schedule' && turn.outcome === null) {
      const { draft, inferred } = turn.reply.result
      return { draft, inferred, turnId: turn.id }
    }
  }
  return null
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<readonly Turn[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const timers = useRef<number[]>([])
  const nextId = useRef(0)

  const thinking = turns.some((turn) => !isAnswered(turn))
  const active = activeDraftOf(turns)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  function ask(prompt: string) {
    const text = prompt.trim()
    if (!text || thinking) return
    const reply = respond(text, active)
    nextId.current += 1
    const id = `turn-${nextId.current}`
    // A refined draft replaces the one it came from.
    const supersedes =
      reply.result.kind === 'schedule' && active ? active.turnId : null

    setTurns((current) => [
      ...current.map((turn) =>
        turn.id === supersedes
          ? { ...turn, outcome: 'superseded' as const }
          : turn,
      ),
      { id, prompt: text, reply, step: 0, outcome: null },
    ])
    reply.steps.forEach((_, index) => {
      timers.current.push(
        window.setTimeout(
          () => {
            setTurns((current) =>
              current.map((turn) =>
                turn.id === id ? { ...turn, step: index + 1 } : turn,
              ),
            )
          },
          STEP_MS * (index + 1),
        ),
      )
    })
  }

  function updateDraft(
    turnId: string,
    draft: MeetingDraft,
    edited: readonly DraftField[] = [],
  ) {
    setTurns((current) =>
      current.map((turn) => {
        const { result } = turn.reply
        if (turn.id !== turnId || result.kind !== 'schedule') return turn
        const inferred = result.inferred.filter(
          (field) => !edited.includes(field),
        )
        return {
          ...turn,
          reply: { ...turn.reply, result: { ...result, draft, inferred } },
        }
      }),
    )
  }

  function settle(turnId: string, outcome: TurnOutcome) {
    setTurns((current) =>
      current.map((turn) =>
        turn.id === turnId
          ? {
              ...turn,
              outcome,
              reply:
                outcome === 'created'
                  ? {
                      ...turn.reply,
                      text: 'Done — your meeting is created. You can start it now or manage it below.',
                    }
                  : turn.reply,
            }
          : turn,
      ),
    )
  }

  function reset() {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    setTurns([])
  }

  const value: AssistantContextValue = {
    turns,
    thinking,
    hasDraft: active !== null,
    ask,
    updateDraft,
    settle,
    reset,
    paletteOpen,
    setPaletteOpen,
  }

  return (
    <AssistantContext value={value}>
      {children}
      <AssistantPalette />
    </AssistantContext>
  )
}

function AssistantPalette() {
  const { turns, paletteOpen, setPaletteOpen } = useAssistant()

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent
        className="top-[12%] flex max-h-[80dvh] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Ask Leap AI</DialogTitle>
        <DialogDescription className="sr-only">
          Schedule meetings, prep for calls, draft agendas, or catch up.
        </DialogDescription>
        <div className="border-b p-3">
          <AssistantComposer autoFocus variant="palette" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="grid gap-3">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Suggested for you
              </p>
              <AssistantSuggestions layout="list" />
            </div>
          ) : (
            <AssistantThread />
          )}
        </div>
        <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-4 py-2 text-[0.7rem] text-muted-foreground">
          <span>
            Leap AI drafts and checks with you first. Nothing is sent until you
            confirm.
          </span>
          <span className="hidden shrink-0 sm:inline">
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-background px-1 font-sans text-[0.65rem] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}
