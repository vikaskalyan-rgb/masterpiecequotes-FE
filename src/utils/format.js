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

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return TENS[tens] + (ones ? ' ' + ONES[ones] : '')
}

function threeDigitsToWords(n) {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  let words = ''
  if (hundreds) words += ONES[hundreds] + ' Hundred'
  if (rest) words += (words ? ' ' : '') + twoDigitsToWords(rest)
  return words
}

// Converts a rupee amount into words using the Indian numbering system (Lakh/Crore) - e.g.
// 475000 -> "Four Lakh Seventy Five Thousand Rupees Only". This is the standard convention
// printed under the total on Indian business quotations/invoices.
export function amountInWords(value) {
  let n = Math.round(Number(value || 0))
  if (n <= 0) return 'Zero Rupees Only'

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundred = n

  const parts = []
  if (crore) parts.push(threeDigitsToWords(crore) + ' Crore')
  if (lakh) parts.push(twoDigitsToWords(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigitsToWords(thousand) + ' Thousand')
  if (hundred) parts.push(threeDigitsToWords(hundred))

  return parts.join(' ') + ' Rupees Only'
}

export const STATUS_META = {
  DRAFT: { label: 'Draft', color: 'var(--ink-soft)', bg: '#EFEBE3' },
  SENT: { label: 'Sent', color: 'var(--slate)', bg: '#E7E9EE' },
  ACCEPTED: { label: 'Accepted', color: 'var(--sage)', bg: 'var(--sage-light)' },
  REJECTED: { label: 'Rejected', color: 'var(--brick)', bg: 'var(--brick-light)' },
}