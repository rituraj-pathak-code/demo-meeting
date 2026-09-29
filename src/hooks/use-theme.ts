import { useSyncExternalStore } from 'react'

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Runs in <head> before first paint so the correct theme class is applied
 * before React hydrates, avoiding a flash of the wrong theme.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('${DARK_QUERY}').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'}catch(e){}})()`

const listeners = new Set<() => void>()

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme === value)
}

function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function getServerTheme(): Theme {
  return 'system'
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia(DARK_QUERY).matches)
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  const media = window.matchMedia(DARK_QUERY)
  const handleSystemChange = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  // Keep other tabs in sync.
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    applyTheme(getTheme())
    listener()
  }

  media.addEventListener('change', handleSystemChange)
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', handleSystemChange)
    window.removeEventListener('storage', handleStorage)
  }
}

function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage unavailable (private mode); still apply for this session.
  }
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme)
  return { theme, setTheme }
}
