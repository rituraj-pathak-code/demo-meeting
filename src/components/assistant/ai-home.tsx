import { useState } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  Radio,
  RotateCcw,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AssistantComposer } from '@/components/assistant/assistant-composer'
import { useAssistant } from '@/components/assistant/assistant-provider'
import { AssistantThread } from '@/components/assistant/assistant-thread'
import { AiFirstToggle } from '@/components/dashboard/ai-first-toggle'
import { Button } from '@/components/ui/button'
import { DASHBOARD_NOW } from '@/lib/demo-dashboard'
import { DEMO_USER } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

/**
 * The AI-first dashboard: one question, one place to answer it. Once you
 * ask, the page becomes a conversation with the composer pinned below.
 */
export function AiHome() {
  const { turns } = useAssistant()
  return turns.length === 0 ? <HomeView /> : <ChatView />
}

const REVEAL =
  'animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-fill-mode:both] motion-reduce:animate-none'

/** Either drops text into the composer to finish, or asks right away. */
type Starter = {
  icon: LucideIcon
  label: string
} & ({ prefill: string } | { send: string })

const CHIPS: readonly Starter[] = [
  {
    icon: Zap,
    label: 'Instant meeting',
    send: 'Start an instant meeting',
  },
  {
    icon: CalendarPlus,
    label: 'Schedule a meeting',
    prefill: 'Schedule a 30 min meeting with ',
  },
  {
    icon: CalendarDays,
    label: 'Today’s meetings',
    send: 'What meetings do I have today?',
  },
  { icon: Radio, label: 'Go live', send: 'Go live' },
]

function HomeView() {
  const { ask, thinking } = useAssistant()
  const [seed, setSeed] = useState({ id: 0, text: '' })
  const firstName = DEMO_USER.name.split(' ')[0]

  function start(starter: Starter) {
    if ('send' in starter) ask(starter.send)
    else setSeed({ id: seed.id + 1, text: starter.prefill })
  }

  return (
    <div className="relative isolate flex flex-1 flex-col justify-center py-12">
      <div className="absolute top-0 right-0">
        <AiFirstToggle />
      </div>

      <div className="grid w-full gap-12">
        <section
          aria-labelledby="home-greeting"
          className={cn('grid justify-items-center gap-6 text-center', REVEAL)}
        >
          <h1
            id="home-greeting"
            className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
          >
            {DASHBOARD_NOW.greeting}, {firstName}
            <br />
            How can I <span className="text-primary">help you today?</span>
          </h1>
        </section>

        <div
          className={cn(
            'mx-auto w-full max-w-4xl',
            REVEAL,
            '[animation-delay:120ms]',
          )}
        >
          {/* Remounting with a new seed drops the starter text in. */}
          <AssistantComposer
            key={seed.id}
            initialPrompt={seed.text}
            autoFocus={seed.id > 0}
            toolbar={CHIPS.map((chip) => (
              <Button
                key={chip.label}
                type="button"
                variant="outline"
                size="sm"
                disabled={thinking}
                className="h-9 rounded-full bg-background/70 px-3 font-normal text-muted-foreground shadow-none hover:text-foreground dark:bg-background/40"
                onClick={() => start(chip)}
              >
                <chip.icon className="text-primary" />
                {chip.label}
              </Button>
            ))}
          />
        </div>
      </div>
    </div>
  )
}

function ChatView() {
  const { reset, thinking } = useAssistant()

  return (
    // Fills the page so the composer rests at the bottom even on a short thread.
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-2 rounded-full bg-primary" />
          <span className="text-sm font-semibold">Leap AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            disabled={thinking}
            onClick={reset}
          >
            <RotateCcw />
            New chat
          </Button>
          <AiFirstToggle />
        </div>
      </div>
      <AssistantThread className="flex-1" />
      {/* Cancels the page's bottom padding so the gap is the same pinned or not. */}
      <div className="sticky bottom-0 -mb-4 bg-linear-to-t from-background from-60% to-transparent pt-8 pb-4 md:-mb-6">
        <AssistantComposer compact autoFocus />
      </div>
    </div>
  )
}
