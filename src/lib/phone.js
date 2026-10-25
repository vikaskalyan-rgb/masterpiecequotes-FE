// Same rules as the backend (PhoneNumbers.java): stored as digits with country code.

export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

// Returns the normalized number, or null if it can't be dialled.
export function normalizePhone(raw) {
  let d = digitsOnly(raw)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  if (d.length === 10) return `91${d}`
  if (d.length >= 11 && d.length <= 15 && !d.startsWith('0')) return d
  return null
}

// 919994445388 -> "+91 99944 45388"
export function formatPhone(stored) {
  const d = digitsOnly(stored)
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`
  return d ? `+${d}` : ''
}
