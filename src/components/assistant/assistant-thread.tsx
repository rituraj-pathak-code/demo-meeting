import { useEffect, useRef } from 'react'

import {
  isAnswered,
  useAssistant,
} from '@/components/assistant/assistant-provider'
import type { Turn } from '@/components/assistant/assistant-provider'
import { AssistantResultView } from '@/components/assistant/assistant-results'
import { cn } from '@/lib/utils'

export function AssistantThread({ className }: { className?: string }) {
  const { turns } = useAssistant()
  const endRef = useRef<HTMLDivElement>(null)
  const progress = turns.reduce((sum, turn) => sum + turn.step, 0)

  // Keep the newest answer in view as it streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [turns.length, progress])

  return (
    <div className={className}>
      <ol className="grid gap-10" aria-live="polite">
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} />
        ))}
      </ol>
      {/* Leaves room for a composer pinned below the thread. */}
      <div ref={endRef} className="scroll-mb-40" />
    </div>
  )
}

function TurnView({ turn }: { turn: Turn }) {
  const answered = isAnswered(turn)
  const { reply } = turn

  return (
    <li className="grid gap-4">
      <p className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-muted px-4 py-2.5 text-[0.9375rem] leading-relaxed wrap-break-word whitespace-pre-wrap">
        {turn.prompt}
      </p>

      {/* No avatar gutter: answers and their cards use the full width. */}
      <div className="grid min-w-0 gap-3">
        <AssistantLabel live={!answered} />
        {answered ? (
          <div className="grid gap-4 animate-in fade-in-0 duration-300 motion-reduce:animate-none">
            <p className="text-[0.9375rem] leading-relaxed text-pretty">
              {reply.text}
            </p>
            <AssistantResultView turn={turn} />
            {reply.trace.length > 0 && turn.outcome === null && (
              <Trace items={reply.trace} />
            )}
          </div>
        ) : (
          <ThinkingSteps steps={reply.steps} step={turn.step} />
        )}
      </div>
    </li>
  )
}

function AssistantLabel({ live }: { live: boolean }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span aria-hidden className="relative flex size-2">
        {live && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
        )}
        <span className="relative size-2 rounded-full bg-primary" />
      </span>
      Leap AI
    </p>
  )
}

function ThinkingSteps({
  steps,
  step,
}: {
  steps: readonly string[]
  step: number
}) {
  return (
    <ol
      className="grid gap-1.5 border-l border-border pl-3.5 text-sm"
      aria-label="Working"
    >
      {steps.slice(0, step + 1).map((label, index) => {
        const done = index < step
        return (
          <li
            key={label}
            className={cn(
              'animate-in fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none',
              done
                ? 'text-muted-foreground/70'
                : 'animate-pulse text-foreground motion-reduce:animate-none',
            )}
          >
            {label}
            {!done && '…'}
          </li>
        )
      })}
    </ol>
  )
}

/** What the answer was based on, kept quiet under the result. */
function Trace({ items }: { items: readonly string[] }) {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      {items.join(' · ')}
    </p>
  )
}
