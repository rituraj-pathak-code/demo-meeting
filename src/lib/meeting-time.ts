// Meeting times are stored as minutes since midnight.

export function formatSlot(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function formatLongDate(date: Date) {
  return longDateFormatter.format(date)
}

/** Serializes a date as YYYY-MM-DD in local time, for URLs. */
export function toDateParam(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromDateParam(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? undefined : date
}

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

export function formatShortDate(date: Date) {
  return shortDateFormatter.format(date)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** "Today", "Tomorrow", "Yesterday", or a short date — relative to `now`. */
export function formatRelativeDay(date: Date, now: Date) {
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return formatShortDate(date)
}
