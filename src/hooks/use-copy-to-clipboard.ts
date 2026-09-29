import { useEffect, useRef, useState } from 'react'

const RESET_AFTER_MS = 2000

/** Copies text and reports `copied` for a moment so the UI can confirm it. */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard can be blocked (insecure context, denied permission).
      return
    }
    setCopied(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), RESET_AFTER_MS)
  }

  return { copied, copy }
}
