// Reads a quote out of a spreadsheet: the app's own template, or the owner's existing quote
// sheets. Pure (works on arrays of cell values, no file or browser APIs), so every layout rule
// below is unit tested.
//
// It understands:
//  - a heading row naming the columns (Item/Description, Length, Width, Qty/Area, Unit, Rate,
//    Amount, and optionally Room, Size "7 x 4", Quote, Customer), anywhere near the top
//  - rooms from a Room column (a blank cell continues the room above, like merged cells) or from
//    rows that hold only a name ("KITCHEN")
//  - customer details as label/value pairs above the table ("Customer name | Ravi", "Ph: 98...")
//  - dimensions in their own columns, in a Size column, or at the end of the description "(7x4)"
//  - feet and inches (7'6"), "₹1,250/-", "28 sqft", dates typed as 25/10/2026
//  - lump sums, fittings lines, room subtotals, GST, discount and grand-total rows
// Whatever it had to work out or skip is returned as a warning for the review screen: nothing is
// saved until the owner has looked at it.

import { itemAmount } from './money'
import { digitsOnly, formatPhone, normalizePhone } from './phone'

export class ImportError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ImportError'
  }
}

export const MAX_ITEMS = 400
const HEADER_SCAN_ROWS = 80

const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100
const str = (n) => String(round2(n))
const near = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005)

export function cellText(v) {
  if (v === null || v === undefined || v instanceof Date) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

const isEmptyCell = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim())

// ---------------------------------------------------------------- values

const NUM = String.raw`\d+(?:\.\d+)?`
const FEET_INCHES = new RegExp(
  String.raw`^(${NUM})\s*(?:'|’|′|ft\.?|feet|foot)\s*(?:(${NUM})\s*(?:"|”|″|''|in\.?|inch|inches)?)?$`,
)

// 1250, "1,250", "₹ 1,250.00/-", "28 sqft", "7'6\"" (7.5), "7 ft". Null if it isn't a number.
export function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let s = v.trim().toLowerCase()
  if (!s) return null
  const fi = FEET_INCHES.exec(s)
  if (fi) return round2(Number(fi[1]) + (fi[2] ? Number(fi[2]) / 12 : 0))
  s = s
    .replace(/₹|\brs\b\.?|\binr\b|\/-|,/g, '')
    .replace(/(sq\.?\s*ft\.?|sqft|sft|nos?\.?|pcs?\.?|ft\.?)$/, '')
    .trim()
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : null
}

// "7 x 4", "7X4", "7.5 * 2", "7'6\" x 4'", "7 by 4" -> { length, width }
export function parseSize(v) {
  const s = cellText(v).toLowerCase()
  if (!s) return null
  const parts = s.split(/\s*(?:x|×|\*|by)\s*/)
  if (parts.length !== 2) return null
  const length = parseNumber(parts[0])
  const width = parseNumber(parts[1])
  return length > 0 && width > 0 ? { length, width } : null
}

// "Wardrobe (7x4)", "Bottom Unit (2.5X5) Box Drawer" or "Wardrobe - 7 x 4" -> the description
// without the size, plus the size. Only when some description is left.
export function splitDescriptionSize(description) {
  for (const m of description.matchAll(/\s*[([]\s*([^()[\]]+?)\s*[)\]]/g)) {
    const size = parseSize(m[1])
    const rest = `${description.slice(0, m.index)} ${description.slice(m.index + m[0].length)}`.replace(/\s+/g, ' ').trim()
    if (size && rest) return { description: rest, size }
  }
  const trailing = /\s*[-–:,]?\s*(\d[\d.'"’”′″ ]*\s*(?:x|×|\*)\s*\d[\d.'"’”′″ ]*)$/i.exec(description)
  if (trailing) {
    const size = parseSize(trailing[1])
    const rest = description.slice(0, trailing.index).trim()
    if (size && rest) return { description: rest, size }
  }
  return { description, size: null }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function isoDate(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  if (y < 2000 || y > 2100) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Excel dates, Excel serial numbers, 25/10/2026 (day first, as written in India), 2026-10-25,
// 25 Oct 2026. Null if it isn't a date.
export function parseDate(v) {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : isoDate(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate())
  }
  if (typeof v === 'number') {
    if (v < 36500 || v > 73000) return null // roughly 1999..2099 as Excel day numbers
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)
    return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  const s = cellText(v).toLowerCase()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return isoDate(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})$/.exec(s)
  if (m) return isoDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1])
  m = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,9})[\s,-]+(\d{4})$/.exec(s)
  if (m && MONTHS.includes(m[2].slice(0, 3))) return isoDate(+m[3], MONTHS.indexOf(m[2].slice(0, 3)) + 1, +m[1])
  return null
}

// ---------------------------------------------------------------- header row

function normHeader(v) {
  return cellText(v)
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[₹:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// First match wins, so the order matters ("Unit price" is a rate, "Total area" a quantity).
const HEADER_RULES = [
  ['serial', /^(s\.? ?no\.?|sl\.? ?no\.?|sr\.? ?no\.?|no\.?|#|serial( no\.?)?)$/],
  ['room', /^(room|rooms|room name|space|location|area name|section|zone)$/],
  ['quote', /^(quote|quote no\.?|quote number|quotation no\.?|ref\.?|reference)$/],
  ['customer', /^(customer|client|customer name|client name)$/],
  ['unit', /^(unit|units|uom)$/],
  ['size', /^(size|sizes|dimension|dimensions|measurement|measurements|dims|l ?x ?[wbh])$/],
  ['dim', /^(length|len|l|width|breadth|depth|height|w|b|h|d|ht)( \w+)?$/],
  ['rate', /(rate|price|per sq|\/ ?sq|per unit|unit cost|cost per)/],
  ['quantity', /(qty|quantity|sq\.? ?ft|sqft|sft|area|^nos\.?$|no\.? of|count|pieces|pcs)/],
  ['amount', /(amount|total|value|cost)/],
  ['description', /(item|description|particular|work|details|product|scope|material|name)/],
]

function classifyHeader(row) {
  const cols = {}
  const dims = []
  let recognised = 0
  // Headings are words; a row holding numbers is data, even if a cell says "sqft".
  if ((row || []).some((c) => parseNumber(c) !== null || c instanceof Date)) return null
  ;(row || []).forEach((cell, i) => {
    if (typeof cell !== 'string') return
    const h = normHeader(cell)
    if (!h || h.length > 40) return
    // Typed headings have stray spaces (" Ra te"): try the words, then the letters run together.
    const rule = HEADER_RULES.find(([, re]) => re.test(h)) || HEADER_RULES.find(([, re]) => re.test(h.replace(/\s+/g, '')))
    if (!rule) return
    const kind = rule[0]
    if (kind === 'dim') {
      if (dims.length < 2) dims.push(i)
      recognised += 1
      return
    }
    if (cols[kind] === undefined) {
      cols[kind] = i
      if (kind === 'quantity') cols.quantityHeader = cellText(cell).toLowerCase()
      recognised += 1
    }
  })
  if (dims[0] !== undefined) cols.length = dims[0]
  if (dims[1] !== undefined) cols.width = dims[1]
  const measures = ['length', 'size', 'quantity', 'rate', 'amount', 'unit'].filter((k) => cols[k] !== undefined).length
  const ok = cols.description !== undefined && measures >= 2 && (cols.rate !== undefined || cols.amount !== undefined)
  return ok ? { cols, score: recognised } : null
}

function findHeader(rows) {
  let best = null
  for (let r = 0; r < Math.min(rows.length, HEADER_SCAN_ROWS); r++) {
    const found = classifyHeader(rows[r])
    if (found && (!best || found.score > best.score)) best = { ...found, index: r }
  }
  return best
}

// ---------------------------------------------------------------- details above the table

const DETAIL_RULES = [
  ['phone', /(phone|mobile|whats ?app|contact|cell|^ph\b|^mob\b|^tel\b)/],
  ['date', /^((quote|quotation) )?date[d]?$/],
  ['total', /^((final|grand|net) total|total amount|quote total|total)$/],
  ['fittings', /(fitting|accessor)/],
  ['address', /(address|^site$|^location$)/],
  ['name', /^((customer|client|party)( name)?|name|to|(quotation|quote|bill|billed) to)$/],
]

const HONORIFIC = /^(mr|mrs|ms|miss|dr|shri|sri|smt|thiru|tmt|selvi)\b\.?/i

// "Mr. Samuel, Flat No:911, Kendriya Vihar, Avadi" -> name + address. Without a title such as
// Mr./Mrs./Dr. in front, the whole text is taken as the address.
export function splitNameAddress(text) {
  const parts = cellText(text).split(/\s*,\s*/).filter(Boolean)
  if (parts.length && HONORIFIC.test(parts[0])) return { name: parts[0], address: parts.slice(1).join(', ') }
  return { name: '', address: parts.join(', ') }
}

const squash = (t) => cellText(t).toLowerCase().replace(/[^a-z0-9]/g, '')

const labelOf = (t) => t.toLowerCase().replace(/[.:\-–]+$/, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim()

function phoneCandidate(raw, ignore) {
  const digits = digitsOnly(cellText(raw))
  const normalized = normalizePhone(digits)
  if (!normalized || !/^91[6-9]\d{9}$/.test(normalized) || ignore.has(normalized)) return null
  return normalized
}

// ignoreText: the business's own name and address (letterheads), never the customer's.
function readDetails(rows, endRow, ignorePhones, ignoreText) {
  const isOwn = (v) => {
    const s = squash(v)
    return s.length >= 6 && ignoreText.some((own) => own.includes(s) || s.includes(own))
  }
  const out = {}
  for (let r = 0; r < endRow; r++) {
    const row = rows[r] || []
    for (let i = 0; i < row.length; i++) {
      const t = cellText(row[i])
      if (!t) continue
      let label = t
      let value
      const colon = /^([^:]{2,30}):\s*(.+)$/.exec(t)
      if (colon) {
        label = colon[1]
        value = colon[2]
      } else {
        if (t.length > 30) continue
        const j = row.findIndex((c, k) => k > i && !isEmptyCell(c))
        if (j !== -1) value = row[j]
        else if (/:\s*$/.test(t) && r + 1 < endRow && !isEmptyCell(rows[r + 1]?.[i])) value = rows[r + 1][i] // label above its value
        else continue
      }
      const rule = DETAIL_RULES.find(([, re]) => re.test(labelOf(label)))
      if (!rule) continue
      const kind = rule[0]
      if (kind === 'phone') {
        const p = phoneCandidate(value, ignorePhones)
        if (p && !out.phone) out.phone = p
      } else if (kind === 'date') {
        const d = parseDate(value)
        if (d && !out.date) out.date = d
      } else if (kind === 'total') {
        const n = parseNumber(value)
        if (n > 0 && out.total === undefined) out.total = n
      } else if (kind === 'fittings') {
        const n = parseNumber(value)
        if (n !== null) {
          if (out.fittingsAmount === undefined) out.fittingsAmount = n
        } else if (!out.fittingsDescription && cellText(value)) out.fittingsDescription = cellText(value)
      } else if (kind === 'name' && /(to)$/.test(labelOf(label)) && cellText(value).includes(',')) {
        // "Quotation to": usually the name and the address together.
        if (isOwn(value)) continue
        const { name, address } = splitNameAddress(value)
        if (name && !out.name) out.name = name
        if (address && !out.address) out.address = address
      } else if (!out[kind] && cellText(value) && parseNumber(value) === null && !isOwn(value)) {
        out[kind] = cellText(value)
      }
    }
  }
  // No labelled number: take the one mobile number in the header area (never the business's own).
  if (!out.phone) {
    for (let r = 0; r < endRow && !out.phone; r++) {
      for (const cell of rows[r] || []) {
        const p = phoneCandidate(cell, ignorePhones)
        if (p) {
          out.phone = p
          break
        }
      }
    }
  }
  return out
}

// ---------------------------------------------------------------- rows of the table

const TOTAL_ROW = /(\btotal\b|sub ?-?total|grand|net amount|amount payable|final (amount|price|quote)|round(ed)? ?off|amount (paid|received)|^balance)/i
const GRAND_TOTAL = /(grand|\bnet\b|final|overall|payable|^total( amount| cost| value| \(.*\))?$|quote total)/i
const TAX_ROW = /\b(gst|cgst|sgst|igst|tax)\b/i
const DISCOUNT_ROW = /(discount|\bless\b|rebate)/i
const FITTINGS_ROW = /(accessor|fitting|hardware)/i
const ROOM_WORDS =
  /(kitchen|bed ?room|living|hall|dining|pooja|puja|bath|toilet|foyer|study|kid|master|guest|room|balcony|utility|lobby|office|cabin|reception|entrance|passage|staircase|terrace|store|lounge)/i

function cleanRoomName(name) {
  let n = name
    .replace(/^(\d{1,2}|[ivxIVX]{1,4})[.)]\s+/, '')
    .replace(/^[A-Za-z][.)]\s*(?=[A-Za-z]{2})/, '') // "A. Living Room", "F.Accessories"
    .replace(/[:\-–]+$/, '')
    .trim()
  if (n.length > 3 && n === n.toUpperCase() && /[A-Z]/.test(n)) {
    n = n
      .toLowerCase()
      .replace(/(^|[\s(/-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
      .replace(/\b(i{1,3}|iv|vi{1,3}|ix)\b/gi, (m) => m.toUpperCase()) // Bedroom II, not Bedroom Ii
  }
  return n.slice(0, 100)
}

function unitFrom(text) {
  const s = text.toLowerCase().replace(/[.\s]/g, '')
  if (!s) return null
  if (/^(sqft|sft|sqfeet|squarefeet|sqf|ft2|sqrft|sq)$/.test(s)) return { unit: 'SQFT' }
  if (/^(nos?|numbers?|pcs?|pieces?|each|ea|sets?|units?|lot|lumpsum|ls|job|qty)$/.test(s)) return { unit: 'NOS' }
  return { unit: 'NOS', other: text }
}

const fmt = (n) => String(round2(n))

function buildItem(raw, qtyHeader, warn) {
  let { length: L, width: W } = raw
  let description = raw.description
  if ((L == null || W == null) && raw.size) {
    L = raw.size.length
    W = raw.size.width
  }
  const split = splitDescriptionSize(description)
  if (split.size) {
    if (L == null && W == null) {
      L = split.size.length
      W = split.size.width
      description = split.description
    } else if (split.size.length === L && split.size.width === W) {
      description = split.description // the same size written twice
    }
  }
  const dims = L > 0 && W > 0
  const unitInfo = unitFrom(raw.unitText)
  const areaHeader = /(sq|sft|area)/.test(qtyHeader || '')
  const unit = unitInfo?.unit ?? (dims || (areaHeader && raw.quantity != null) ? 'SQFT' : 'NOS')
  if (unitInfo?.other) warn(`Measured in "${unitInfo.other}", imported as a quantity`)

  const item = { description, unit, areaAdjusted: false, length: '', width: '', quantity: '', rate: '' }
  const { quantity, amount } = raw
  let { rate } = raw

  if (unit === 'SQFT') {
    if (dims) {
      item.length = fmt(L)
      item.width = fmt(W)
      const area = round2(L * W)
      if (quantity != null && Math.abs(quantity - area) > 0.01) {
        item.areaAdjusted = true
        const pieces = Number.isInteger(quantity) && quantity > 1 && quantity <= 50
        if (pieces && rate != null && amount != null && near(amount, quantity * area * rate) && !near(amount, quantity * rate)) {
          item.quantity = str(quantity * area)
          warn(`${quantity} pieces of ${fmt(L)} × ${fmt(W)} ft, billed as ${item.quantity} sqft`)
        } else {
          item.quantity = str(quantity)
        }
      }
    } else {
      item.areaAdjusted = true
      if (quantity != null) item.quantity = str(quantity)
      else if (amount != null && rate > 0) {
        item.quantity = str(amount / rate)
        warn('Area worked out from amount ÷ rate')
      } else warn('No size or area')
    }
  } else {
    if (dims) item.description = `${description} (${fmt(L)} x ${fmt(W)})`.trim()
    if (quantity != null) item.quantity = str(quantity)
    else if (amount != null && rate > 0) item.quantity = str(amount / rate)
    else item.quantity = '1'
  }

  const q = Number(item.areaAdjusted || unit === 'NOS' ? item.quantity : round2(L * W)) || 0
  if (rate == null) {
    if (amount != null && q > 0) {
      rate = round2(amount / q)
      warn(raw.lumpSum ? 'Lump sum, imported as 1 × the amount' : 'Rate worked out from the amount')
    } else warn('No rate')
  }
  if (rate != null) item.rate = str(rate)
  if (rate != null && amount != null && !raw.lumpSum) {
    const computed = itemAmount(item)
    if (!near(computed, amount)) warn(`Sheet says ₹${fmt(amount)}, works out to ₹${fmt(computed)}`)
  }
  if (!description) warn('No description')
  return item
}

function newGroup(key) {
  return {
    key,
    customer: '',
    rooms: [],
    roomsByName: new Map(),
    current: null,
    pendingHeading: null,
    fittings: { descriptions: [], amount: 0 },
    grandTotal: null,
    taxSeen: false,
    discount: 0,
    notes: [],
    skipped: [],
    itemCount: 0,
  }
}

function parseTable(rows, header, opts) {
  const { cols } = header
  const groups = new Map()
  let lastQuote = ''
  let lastRoom = ''
  const numericCols = new Set(['length', 'width', 'quantity', 'rate', 'amount'].map((k) => cols[k]).filter((i) => i !== undefined))
  const nonLabelCols = new Set(['serial', 'unit', 'room', 'quote', 'customer'].map((k) => cols[k]).filter((i) => i !== undefined))
  const at = (row, kind) => (cols[kind] === undefined ? undefined : row[cols[kind]])
  const num = (row, kind) => parseNumber(at(row, kind))

  for (let r = header.index + 1; r < rows.length; r++) {
    const row = rows[r] || []
    if (row.every(isEmptyCell)) continue
    if (classifyHeader(row)) continue // header repeated on a second page

    const quoteKey = cols.quote !== undefined ? cellText(at(row, 'quote')) || lastQuote : ''
    lastQuote = quoteKey
    if (!groups.has(quoteKey)) groups.set(quoteKey, newGroup(quoteKey))
    const g = groups.get(quoteKey)
    if (!g.customer && cols.customer !== undefined) g.customer = cellText(at(row, 'customer'))

    const values = {
      length: num(row, 'length'),
      width: num(row, 'width'),
      quantity: num(row, 'quantity'),
      rate: num(row, 'rate'),
      amount: num(row, 'amount'),
      size: cols.size !== undefined ? parseSize(at(row, 'size')) : null,
    }
    const description = cellText(at(row, 'description'))
    const roomCell = cols.room !== undefined ? cellText(at(row, 'room')) : ''
    // A label anywhere in the row: totals and headings are often written in the first column.
    const texts = row
      .map((c, i) => (numericCols.has(i) || nonLabelCols.has(i) ? '' : cellText(c)))
      .filter((t) => t && parseNumber(t) === null)
    const label = description || texts[0] || ''
    // Totals and discounts are often typed in whichever column is free, the Unit column included.
    const rowLabel =
      label ||
      row
        .map((c, i) => (numericCols.has(i) ? '' : cellText(c)))
        .find((t) => t && parseNumber(t) === null && (TOTAL_ROW.test(t) || TAX_ROW.test(t) || DISCOUNT_ROW.test(t))) ||
      ''
    const anyNumber = ['length', 'width', 'quantity', 'rate', 'amount'].some((k) => values[k] !== null) || values.size
    const lastNumber = [...row].reverse().map(parseNumber).find((n) => n !== null)

    // A GST row carries an amount; "This quote is exclusive of GST" in the terms is just text.
    if (rowLabel && TAX_ROW.test(rowLabel) && !values.rate && values.amount != null) {
      if (!g.taxSeen) g.notes.push(`Skipped "${rowLabel}": quotes are written without GST`)
      g.taxSeen = true
      continue
    }
    if (rowLabel && DISCOUNT_ROW.test(rowLabel) && !values.rate && lastNumber != null) {
      g.discount += Math.abs(lastNumber)
      continue
    }
    if (rowLabel && TOTAL_ROW.test(rowLabel) && !values.rate) {
      const value = values.amount ?? lastNumber
      if (value != null && GRAND_TOTAL.test(rowLabel) && !g.taxSeen) g.grandTotal = value
      continue
    }

    if (!anyNumber) {
      // A name on its own line starts a room, unless the sheet has a Room column.
      const serial = cols.serial !== undefined && !isEmptyCell(at(row, 'serial'))
      const lettered = /^[A-Za-z][.)]\s*[A-Za-z]{2}/.test(label) // "F.Accessories", "G. Additional Work"
      const looksLikeRoom =
        label.length <= 60 && (ROOM_WORDS.test(label) || label === label.toUpperCase() || /:$/.test(label) || lettered || !serial)
      if (cols.room === undefined && label && looksLikeRoom) g.pendingHeading = cleanRoomName(label)
      else if (roomCell && !label) lastRoom = roomCell
      // Reported only if more items follow: text after the table (terms, notes) is not an item.
      else if (description) g.skipped.push(`Skipped "${description.slice(0, 40)}": no size, quantity, rate or amount`)
      continue
    }

    const heading = g.pendingHeading ?? (cols.room === undefined ? g.current?.name : '') ?? ''
    if ((FITTINGS_ROW.test(label) || FITTINGS_ROW.test(roomCell) || FITTINGS_ROW.test(heading)) && values.rate == null && values.quantity == null && values.length == null && !values.size && values.amount != null) {
      if (label) g.fittings.descriptions.push(label)
      g.fittings.amount += values.amount
      continue
    }

    // ---- an item ----
    let room
    if (cols.room !== undefined) {
      const name = cleanRoomName(roomCell || lastRoom)
      lastRoom = roomCell || lastRoom
      room = g.roomsByName.get(name)
      if (!room) {
        room = { name, items: [], warnings: [] }
        g.roomsByName.set(name, room)
        g.rooms.push(room)
      }
    } else {
      if (g.pendingHeading !== null) {
        if (g.current && g.current.items.length === 0) g.current.name = g.pendingHeading
        else {
          g.current = { name: g.pendingHeading, items: [], warnings: [] }
          g.rooms.push(g.current)
        }
        g.pendingHeading = null
      }
      if (!g.current) {
        g.current = { name: '', items: [], warnings: [] }
        g.rooms.push(g.current)
      }
      room = g.current
    }

    const lumpSum = values.amount != null && values.rate == null && values.quantity == null && values.length == null && values.width == null && !values.size
    // "1 no" or "28 sqft" in the quantity cell says the unit when there's no Unit column.
    const qtyCell = cellText(at(row, 'quantity'))
    const unitText = cellText(at(row, 'unit')) || (/[a-z]/i.test(qtyCell) ? qtyCell.replace(/[\d.,\s]/g, '') : '')
    const raw = { ...values, description, unitText, lumpSum }
    const warnings = []
    const item = buildItem(raw, cols.quantityHeader, (m) => warnings.push(m))
    room.items.push(item)
    g.notes.push(...g.skipped)
    g.skipped = []
    warnings.forEach((m) => room.warnings.push({ item, message: m }))
    g.itemCount += 1
    if (g.itemCount > (opts.maxItems ?? MAX_ITEMS)) {
      throw new ImportError(`This sheet has more than ${opts.maxItems ?? MAX_ITEMS} items. Split it into smaller quotes and import each one.`)
    }
  }
  return [...groups.values()].filter((g) => g.itemCount > 0 || g.fittings.amount > 0)
}

// ---------------------------------------------------------------- workbook

const SKIP_SHEETS = /(how to|instruction|example|read ?me|help|guide|material spec|terms)/i

function toCandidate(g, sheetName, details, multi) {
  const rooms = g.rooms.filter((r) => r.items.length)
  const warnings = []
  rooms.forEach((room) => {
    const where = room.name || 'Unnamed room'
    if (!room.name) warnings.push(`${rooms.length > 1 ? 'A room' : 'The room'} has no name: add one`)
    room.warnings.forEach(({ item, message }) => warnings.push(`${where} · ${item.description || 'item'}: ${message}`))
  })
  warnings.push(...g.notes)

  const fittingsAmount = g.fittings.amount || (multi ? 0 : details.fittingsAmount || 0)
  const fittingsDescription = g.fittings.descriptions.length
    ? g.fittings.descriptions.join(', ')
    : multi
      ? ''
      : details.fittingsDescription || ''

  let sheetTotal = multi ? g.grandTotal : (details.total ?? g.grandTotal ?? null)
  if (sheetTotal == null && g.discount > 0) {
    const items = rooms.reduce((s, r) => s + r.items.reduce((t, it) => t + itemAmount(it), 0), 0)
    sheetTotal = round2(items + fittingsAmount - g.discount)
    warnings.push(`Discount of ₹${fmt(g.discount)} taken off the final total`)
  }

  const customerName = (multi ? g.customer : details.name || g.customer) || ''
  const phone = multi ? null : details.phone
  if (!customerName) warnings.unshift('No customer name found: add it')
  if (!phone) warnings.unshift('No customer phone found: add it')

  const itemCount = rooms.reduce((n, r) => n + r.items.length, 0)
  return {
    id: `${sheetName}::${g.key}`,
    label: [g.key, customerName || (multi ? '' : sheetName)].filter(Boolean).join(' · ') || sheetName,
    sheetName,
    warnings,
    stats: { rooms: rooms.length, items: itemCount },
    patch: {
      customerName,
      customerPhone: phone ? formatPhone(phone) : '',
      customerAddress: multi ? '' : details.address || '',
      quoteDate: multi ? null : details.date || null,
      rooms: rooms.map((r) => ({ name: r.name, items: r.items })),
      accessoriesDescription: fittingsDescription,
      accessoriesAmount: fittingsAmount ? str(fittingsAmount) : '',
      sheetTotal,
    },
  }
}

// sheets: [{ sheet: name, data: rows }]. Returns every quote found (usually one).
export function parseWorkbook(sheets, opts = {}) {
  const ignorePhones = new Set((opts.ignorePhones || []).map((p) => normalizePhone(p)).filter(Boolean))
  const ignoreText = (opts.ignoreText || []).map(squash).filter((t) => t.length >= 6)
  const candidates = []
  let sawHeader = false
  for (const { sheet, data } of sheets || []) {
    if (!Array.isArray(data) || SKIP_SHEETS.test(sheet || '')) continue
    const header = findHeader(data)
    if (!header) continue
    sawHeader = true
    const groups = parseTable(data, header, opts)
    const multi = groups.length > 1 || header.cols.quote !== undefined
    const details = readDetails(data, header.index, ignorePhones, ignoreText)
    groups.forEach((g) => candidates.push(toCandidate(g, sheet || 'Sheet', details, multi)))
  }
  if (!candidates.length) {
    throw new ImportError(
      sawHeader
        ? 'Found the item columns, but no items under them.'
        : "Couldn't find the items. The sheet needs a heading row with columns like Item, Length, Width and Rate.",
    )
  }
  return candidates
}

// ---------------------------------------------------------------- CSV

// RFC 4180 CSV (quoted fields, "" escapes, newlines in quotes). Comma, semicolon or tab.
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] || ''
  const delimiter = [',', ';', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.map((r) => r.map((v) => (v.trim() === '' ? null : v.trim())))
}
