import { useSyncExternalStore } from 'react'

// Whether the dashboard leads with the AI prompt or the manual controls.
const STORAGE_KEY = 'dashboard-ai-first'
const DEFAULT = true

const listeners = new Set<() => void>()
// Fallback when storage is unavailable (private mode).
let inMemory: boolean | null = null

function getAiFirst() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? (inMemory ?? DEFAULT) : stored === 'true'
  } catch {
    return inMemory ?? DEFAULT
  }
}

function getServerAiFirst() {
  return DEFAULT
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep other tabs in sync.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

function setAiFirst(value: boolean) {
  inMemory = value
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Storage unavailable; `inMemory` keeps the choice for this page.
  }
  listeners.forEach((listener) => listener())
}

export function useAiFirst() {
  const aiFirst = useSyncExternalStore(subscribe, getAiFirst, getServerAiFirst)
  return { aiFirst, setAiFirst }
}
