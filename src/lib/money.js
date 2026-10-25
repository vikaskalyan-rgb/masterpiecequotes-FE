// Live preview of quote arithmetic. These rules mirror the backend (Totals.java) exactly; the
// server recomputes everything on save, so what is saved and printed always comes from there.
// Work in integer paise to avoid floating-point drift (0.1 + 0.2).

const toPaise = (rupees) => Math.round((Number(rupees) || 0) * 100)
const fromPaise = (paise) => paise / 100

// Half-up rounding to 2 decimals, matching BigDecimal.setScale(2, HALF_UP) for positive values.
function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function itemQuantity(item) {
  if (item.unit === 'SQFT') {
    const l = parseFloat(item.length)
    const w = parseFloat(item.width)
    if (!Number.isFinite(l) || !Number.isFinite(w)) return 0
    return round2(l * w)
  }
  return round2(parseFloat(item.quantity) || 0)
}

export function itemAmount(item) {
  return fromPaise(Math.round(itemQuantity(item) * toPaise(item.rate) + 1e-7))
}

export function roomTotal(room) {
  return fromPaise(room.items.reduce((sum, it) => sum + toPaise(itemAmount(it)), 0))
}

export function subtotalOf(rooms, accessoriesAmount) {
  const itemsPaise = rooms.reduce((sum, r) => sum + toPaise(roomTotal(r)), 0)
  return fromPaise(itemsPaise + toPaise(accessoriesAmount))
}

// mode: NEAREST (can round down), UP (never below subtotal), NONE.
export function suggestedTotal(subtotal, mode = 'NEAREST', step = 1000) {
  const s = round2(subtotal)
  if (mode === 'NONE' || step <= 1) return s
  const units = s / step
  const rounded = mode === 'UP' ? Math.ceil(units - 1e-9) : Math.floor(units + 0.5)
  return rounded * step
}

const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const rupeeFormatterPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const plainFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

// ₹3,55,000 (whole rupees; amounts with paise show them, so line items never look rounded off)
export function formatRupees(value, { paise = 'auto' } = {}) {
  const n = Number(value) || 0
  const hasPaise = Math.round(n * 100) % 100 !== 0
  if (paise === 'always' || (paise === 'auto' && hasPaise)) return rupeeFormatterPaise.format(n)
  return rupeeFormatter.format(Math.round(n))
}

export function formatNumber(value) {
  return plainFormatter.format(Number(value) || 0)
}

export function quoteRef(quoteNumber) {
  return quoteNumber ? `MP-${String(quoteNumber).padStart(4, '0')}` : 'New quote'
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
}

function threeDigits(n) {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return [h ? ONES[h] + ' Hundred' : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ')
}

// Indian numbering: 475000 -> "Four Lakh Seventy Five Thousand Rupees Only".
export function amountInWords(value) {
  let n = Math.round(Number(value) || 0)
  if (n <= 0) return 'Zero Rupees Only'
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const parts = []
  if (crore) parts.push((crore > 99 ? threeDigits(crore) : twoDigits(crore)) + ' Crore')
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand')
  if (n) parts.push(threeDigits(n))
  return parts.join(' ') + ' Rupees Only'
}
