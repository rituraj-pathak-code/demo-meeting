import { useState } from 'react'
import type { FocusEvent, FormEvent, KeyboardEvent, ReactNode } from 'react'
import { ArrowUp, Mic, Sparkles } from 'lucide-react'

import { useAssistant } from '@/components/assistant/assistant-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AssistantComposerProps = {
  /** `hero` is the large borderless home composer; `palette` sits in ⌘K. */
  variant?: 'hero' | 'palette'
  /** A single-row hero, for pinning under a conversation. */
  compact?: boolean
  autoFocus?: boolean
  /** Starting text, e.g. from a prompt starter. Remount (key) to change it. */
  initialPrompt?: string
  /** Extra controls on the hero's bottom row, e.g. starter chips. */
  toolbar?: ReactNode
}

export function AssistantComposer({
  variant = 'hero',
  compact = false,
  autoFocus = false,
  initialPrompt = '',
  toolbar,
}: AssistantComposerProps) {
  const { ask, thinking, hasDraft } = useAssistant()
  const [prompt, setPrompt] = useState(initialPrompt)
  const hasText = prompt.trim() !== ''

  const placeholder = hasDraft
    ? 'Refine it: “make it 45 min”, “add Marcus”, “Thursday instead”'
    : variant === 'hero'
      ? 'Ask Leap AI to schedule, prep, or catch you up…'
      : 'Schedule a meeting, prep for a call, or catch up. Just ask.'

  function submit() {
    if (!hasText || thinking) return
    ask(prompt)
    setPrompt('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submit()
    }
  }

  // Prefilled starters continue where the text ends.
  function handleFocus(event: FocusEvent<HTMLTextAreaElement>) {
    const end = event.target.value.length
    event.target.setSelectionRange(end, end)
  }

  const textarea = (
    <>
      <label htmlFor={`assistant-${variant}`} className="sr-only">
        Ask Leap AI
      </label>
      <textarea
        id={`assistant-${variant}`}
        rows={1}
        autoFocus={autoFocus}
        value={prompt}
        placeholder={placeholder}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className={cn(
          'field-sizing-content max-h-48 flex-1 resize-none bg-transparent outline-none placeholder:text-muted-foreground',
          variant === 'hero'
            ? cn('text-base', compact ? 'min-h-10 py-2' : 'min-h-24 pt-0.5')
            : 'min-h-9 py-2 text-sm',
        )}
      />
    </>
  )

  if (variant === 'palette') {
    return (
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Sparkles
          aria-hidden
          className={cn(
            'mb-2.5 ml-1.5 size-4 shrink-0 text-primary',
            thinking && 'animate-pulse',
          )}
        />
        {textarea}
        <Button
          type="submit"
          size="icon-sm"
          aria-label="Send"
          disabled={!hasText || thinking}
          className="rounded-lg"
        >
          <ArrowUp />
        </Button>
      </form>
    )
  }

  const buttonClass = cn(
    'shrink-0 rounded-xl shadow-sm',
    compact ? 'size-10' : 'size-11',
  )
  // Voice until there's something to send. TODO: wire up voice input.
  const sendOrSpeak = hasText ? (
    <Button
      type="submit"
      aria-label="Send"
      disabled={thinking}
      className={buttonClass}
    >
      <ArrowUp className="size-5" />
    </Button>
  ) : (
    <Button type="button" aria-label="Speak instead" className={buttonClass}>
      <Mic className="size-5" />
    </Button>
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'grid gap-3 rounded-2xl border border-input bg-background/80 transition-colors focus-within:border-ring dark:bg-background/60',
        compact ? 'p-2.5 pl-4' : 'p-5 sm:p-6',
      )}
    >
      <div
        className={cn('flex gap-3', compact ? 'items-center' : 'items-start')}
      >
        <Sparkles
          aria-hidden
          className={cn(
            'size-5 shrink-0 text-primary',
            !compact && 'mt-1.5',
            thinking && 'animate-pulse motion-reduce:animate-none',
          )}
        />
        {textarea}
        {compact && sendOrSpeak}
      </div>
      {!compact && (
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">{toolbar}</div>
          {sendOrSpeak}
        </div>
      )}
    </form>
  )
}
