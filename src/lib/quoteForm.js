// Pure helpers for the quote builder: converting between API data and form state, validation and
// building the save payload. Kept free of React so they can be unit tested.
import { addDays, todayIso } from './dates'
import { newId } from './ids'
import { subtotalOf, suggestedTotal } from './money'
import { formatPhone, normalizePhone } from './phone'

export const ROOM_COLORS = ['var(--room-1)', 'var(--room-2)', 'var(--room-3)', 'var(--room-4)']

export const emptyItem = () => ({ key: newId(), description: '', unit: 'SQFT', areaAdjusted: false, length: '', width: '', quantity: '', rate: '' })
export const emptyRoom = () => ({ key: newId(), name: '', items: [emptyItem()] })
export const emptySpec = () => ({ key: newId(), itemLabel: '', detail: '', brand: '' })
export const emptyTerm = () => ({ key: newId(), text: '' })

const str = (v) => (v === null || v === undefined ? '' : String(v))

function roomsFromApi(rooms) {
  return (rooms || []).map((r) => ({
    key: newId(),
    name: r.name || '',
    items: (r.items || []).map((i) => {
      const unit = i.unit || 'SQFT'
      const dims = i.length != null && i.width != null
      // A billed area that isn't exactly length x width (or has no dimensions) was set by hand.
      const areaAdjusted =
        unit === 'SQFT' && (!dims || Math.abs(Number(i.quantity) - Math.round(Number(i.length) * Number(i.width) * 100) / 100) > 0.001)
      return {
        key: newId(),
        description: i.description || '',
        unit,
        areaAdjusted,
        length: dims ? str(i.length) : '',
        width: dims ? str(i.width) : '',
        quantity: unit === 'NOS' || areaAdjusted ? str(i.quantity) : '',
        rate: str(i.rate),
      }
    }),
  }))
}

const specsFrom = (list) => (list || []).map((s) => ({ key: newId(), itemLabel: s.itemLabel || '', detail: s.detail || '', brand: s.brand || '' }))
const termsFrom = (list) => (list || []).map((t) => ({ key: newId(), text: t.text || '' }))

export function formForNewQuote(defaults, business, today = todayIso()) {
  return {
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    quoteDate: today,
    validUntil: addDays(today, business?.validityDays ?? 30),
    validUntilTouched: false,
    rooms: [emptyRoom()],
    accessoriesDescription: '',
    accessoriesAmount: '',
    materialSpecItems: specsFrom(defaults?.materialSpecItems),
    termItems: termsFrom(defaults?.termItems),
    totalOverridden: false,
    roundedTotal: '',
  }
}

export function formFromQuote(q) {
  return {
    customerName: q.customerName || '',
    customerPhone: formatPhone(q.customerPhone),
    customerAddress: q.customerAddress || '',
    quoteDate: q.quoteDate,
    validUntil: q.validUntil || '',
    validUntilTouched: true,
    rooms: q.rooms?.length ? roomsFromApi(q.rooms) : [emptyRoom()],
    accessoriesDescription: q.accessoriesDescription || '',
    accessoriesAmount: q.accessoriesAmount ? str(q.accessoriesAmount) : '',
    materialSpecItems: specsFrom(q.materialSpecItems),
    termItems: termsFrom(q.termItems),
    totalOverridden: Boolean(q.totalOverridden),
    roundedTotal: str(q.roundedTotal),
  }
}

// A duplicate reuses rooms, items and rates for a new customer. The total starts automatic
// again: a typed total belonged to the original customer's negotiation.
export function formForDuplicate(q, business, today = todayIso()) {
  return {
    ...formFromQuote(q),
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    quoteDate: today,
    validUntil: addDays(today, business?.validityDays ?? 30),
    validUntilTouched: false,
    totalOverridden: false,
    roundedTotal: '',
  }
}

// A quote read from a spreadsheet (lib/excelImport) becomes a new quote with the usual material
// spec and terms. The sheet's final total is kept as a typed total only when it isn't what the
// usual rounding would give anyway, so an agreed price survives the import.
export function formForImport(patch, defaults, business, today = todayIso()) {
  const base = formForNewQuote(defaults, business, today)
  const quoteDate = patch.quoteDate || today
  const rooms = (patch.rooms || [])
    .filter((r) => r.items?.length)
    .map((r) => ({ key: newId(), name: r.name || '', items: r.items.map((it) => ({ ...emptyItem(), ...it, key: newId() })) }))
  const form = {
    ...base,
    customerName: patch.customerName || '',
    customerPhone: patch.customerPhone || '',
    customerAddress: patch.customerAddress || '',
    quoteDate,
    validUntil: addDays(quoteDate, business?.validityDays ?? 30),
    rooms: rooms.length ? rooms : [emptyRoom()],
    accessoriesDescription: patch.accessoriesDescription || '',
    accessoriesAmount: patch.accessoriesAmount || '',
  }
  const sheetTotal = Number(patch.sheetTotal)
  if (patch.sheetTotal != null && Number.isFinite(sheetTotal) && sheetTotal > 0) {
    const usual = suggestedTotal(subtotalOf(form.rooms, form.accessoriesAmount), business?.roundingMode, business?.roundingStep)
    if (Math.abs(usual - sheetTotal) > 0.005) {
      form.totalOverridden = true
      form.roundedTotal = String(sheetTotal)
    }
  }
  return form
}

const isBlankItem = (it) => !it.description.trim() && !it.length && !it.width && !it.quantity && !it.rate

// Returns { errors: { [path]: message }, firstError: path|null }.
export function validateForm(form) {
  const errors = {}
  if (!form.customerName.trim()) errors.customerName = 'Add the customer name'
  if (!form.customerPhone.trim()) errors.customerPhone = 'Add a phone number for WhatsApp'
  else if (!normalizePhone(form.customerPhone)) errors.customerPhone = 'Enter a 10-digit mobile number'
  if (!form.quoteDate) errors.quoteDate = 'Pick a date'
  if (form.validUntil && form.quoteDate && form.validUntil < form.quoteDate) errors.validUntil = "Can't be before the quote date"

  let hasItem = false
  form.rooms.forEach((room, ri) => {
    const items = room.items.filter((it) => !isBlankItem(it))
    if (items.length) hasItem = true
    if (!room.name.trim() && items.length) errors[`rooms.${ri}.name`] = 'Name this room'
    room.items.forEach((it, ii) => {
      if (isBlankItem(it)) return
      const p = `rooms.${ri}.items.${ii}`
      if (!it.description.trim()) errors[`${p}.description`] = 'Add a description'
      if (it.unit === 'SQFT' && !it.areaAdjusted && (!(parseFloat(it.length) > 0) || !(parseFloat(it.width) > 0)))
        errors[`${p}.dimensions`] = 'Add length and width'
      if (it.unit === 'SQFT' && it.areaAdjusted && !(parseFloat(it.quantity) > 0)) errors[`${p}.quantity`] = 'Add the billed area'
      if (it.unit === 'NOS' && !(parseFloat(it.quantity) > 0)) errors[`${p}.quantity`] = 'Add a quantity'
      if (it.rate === '' || Number.isNaN(parseFloat(it.rate))) errors[`${p}.rate`] = 'Add a rate'
      else if (parseFloat(it.rate) < 0) errors[`${p}.rate`] = "Rate can't be negative"
    })
  })
  if (!hasItem && !(parseFloat(form.accessoriesAmount) > 0)) errors.rooms = 'Add at least one item'
  if (parseFloat(form.accessoriesAmount) < 0) errors.accessoriesAmount = "Can't be negative"
  if (form.totalOverridden && !(parseFloat(form.roundedTotal) >= 0)) errors.roundedTotal = 'Enter the final total'

  const firstError = Object.keys(errors)[0] || null
  return { errors, firstError }
}

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export function buildPayload(form, { version, clientRequestId } = {}) {
  return {
    customerName: form.customerName.trim(),
    customerPhone: form.customerPhone.trim(),
    customerAddress: form.customerAddress.trim(),
    quoteDate: form.quoteDate,
    validUntil: form.validUntil || null,
    totalOverridden: form.totalOverridden,
    roundedTotal: form.totalOverridden ? num(form.roundedTotal) : null,
    accessoriesDescription: form.accessoriesDescription.trim(),
    accessoriesAmount: num(form.accessoriesAmount) ?? 0,
    rooms: form.rooms
      .map((r) => ({ ...r, items: r.items.filter((it) => !isBlankItem(it)) }))
      .filter((r) => r.name.trim() || r.items.length)
      .map((r) => ({
        name: r.name.trim(),
        items: r.items.map((it) => {
          const sqft = it.unit === 'SQFT'
          const dims = sqft && num(it.length) != null && num(it.width) != null
          const adjusted = sqft && Boolean(it.areaAdjusted)
          return {
            description: it.description.trim(),
            unit: it.unit,
            length: dims ? num(it.length) : null,
            width: dims ? num(it.width) : null,
            quantity: sqft && !adjusted ? null : num(it.quantity),
            rate: num(it.rate),
            areaAdjusted: adjusted,
          }
        }),
      })),
    materialSpecItems: form.materialSpecItems
      .filter((s) => s.itemLabel.trim())
      .map((s) => ({ itemLabel: s.itemLabel.trim(), detail: s.detail.trim(), brand: s.brand.trim() })),
    termItems: form.termItems.filter((t) => t.text.trim()).map((t) => ({ text: t.text.trim() })),
    version: version ?? null,
    clientRequestId: clientRequestId ?? null,
  }
}

// Content-only fingerprint (ignores generated keys) to tell whether the form differs from what
// was loaded - so simply opening a quote never leaves an "unsaved changes" draft behind.
export function fingerprint(form) {
  return JSON.stringify(buildPayload(form))
}
