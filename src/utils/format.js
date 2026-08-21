// Indian-style currency formatting: ₹3,55,000
export function formatRupees(value) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatDate(isoDateString) {
  if (!isoDateString) return ''
  const d = new Date(isoDateString)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const then = new Date(isoString).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(isoString)
}

export const STATUS_META = {
  DRAFT: { label: 'Draft', color: 'var(--ink-soft)', bg: '#EFEBE3' },
  SENT: { label: 'Sent', color: 'var(--slate)', bg: '#E7E9EE' },
  ACCEPTED: { label: 'Accepted', color: 'var(--sage)', bg: 'var(--sage-light)' },
  REJECTED: { label: 'Rejected', color: 'var(--brick)', bg: 'var(--brick-light)' },
}
