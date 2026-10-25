// Dates are calendar days in the user's own timezone (IST for this business). Never derive them
// from toISOString(), which is UTC and gives yesterday's date before 5:30 AM in India.

const pad = (n) => String(n).padStart(2, '0')

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayIso(now = new Date()) {
  return toIsoDate(now)
}

// "2026-10-25" parsed as a local calendar date (new Date("2026-10-25") would be UTC midnight).
export function parseIsoDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, days) {
  const d = parseIsoDate(iso)
  if (!d) return ''
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function daysBetween(fromIso, toIso) {
  const a = parseIsoDate(fromIso)
  const b = parseIsoDate(toIso)
  if (!a || !b) return 0
  return Math.round((b - a) / 86400000)
}

export function formatDate(iso) {
  const d = parseIsoDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatMonth(iso) {
  const d = parseIsoDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function formatDateTime(instant) {
  if (!instant) return ''
  return new Date(instant).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function formatRelative(instant, now = Date.now()) {
  if (!instant) return ''
  const minutes = Math.round((now - new Date(instant).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return new Date(instant).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
