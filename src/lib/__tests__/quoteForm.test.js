import { describe, expect, it } from 'vitest'
import { draftCustomerName, draftStatus } from '../drafts'
import { buildPayload, fingerprint, formForDuplicate, formForImport, formForNewQuote, formFromQuote, validateForm } from '../quoteForm'
import { parseWorkbook } from '../excelImport'
import { parseDimensions } from '../voice'

const savedQuote = {
  id: 7,
  version: 3,
  quoteNumber: 7,
  customerName: 'Ravi',
  customerPhone: '919994445388',
  customerAddress: '12 Lake View',
  quoteDate: '2026-09-01',
  validUntil: '2026-10-01',
  totalOverridden: true,
  roundedTotal: 44000,
  accessoriesAmount: 0,
  rooms: [{ name: 'Kitchen', items: [{ description: 'Base', unit: 'SQFT', length: 7, width: 4, quantity: 28, rate: 1500 }] }],
  materialSpecItems: [{ itemLabel: 'Ply', detail: 'BWP', brand: 'GAMA' }],
  termItems: [{ text: '50% advance' }],
}

describe('duplicating a quote', () => {
  it('starts the total automatic again and clears the customer', () => {
    const f = formForDuplicate(savedQuote, { validityDays: 15 }, '2026-10-25')
    expect(f.totalOverridden).toBe(false)
    expect(f.roundedTotal).toBe('')
    expect(f.customerName).toBe('')
    expect(f.quoteDate).toBe('2026-10-25')
    expect(f.validUntil).toBe('2026-11-09')
    expect(f.rooms[0].items[0].rate).toBe('1500')
  })
})

describe('validation', () => {
  it('flags the fields that block a save', () => {
    const f = formForNewQuote({}, { validityDays: 30 }, '2026-10-25')
    f.rooms[0].items[0] = { ...f.rooms[0].items[0], description: 'Wardrobe', length: '7', width: '', rate: '' }
    const { errors, firstError } = validateForm(f)
    expect(firstError).toBe('customerName')
    expect(errors.customerPhone).toBeTruthy()
    expect(errors['rooms.0.name']).toBe('Name this room')
    expect(errors['rooms.0.items.0.dimensions']).toBe('Add length and width')
    expect(errors['rooms.0.items.0.rate']).toBe('Add a rate')
  })

  it('ignores completely empty item rows', () => {
    const f = formFromQuote(savedQuote)
    f.rooms[0].items.push({ key: 'x', description: '', unit: 'SQFT', length: '', width: '', quantity: '', rate: '' })
    expect(validateForm(f).firstError).toBeNull()
    expect(buildPayload(f).rooms[0].items).toHaveLength(1)
  })

  it('rejects negative rates and a phone number that cannot be dialled', () => {
    const f = formFromQuote(savedQuote)
    f.rooms[0].items[0].rate = '-5'
    f.customerPhone = '12345'
    const { errors } = validateForm(f)
    expect(errors['rooms.0.items.0.rate']).toMatch(/negative/)
    expect(errors.customerPhone).toBeTruthy()
  })
})

describe('save payload', () => {
  it('sends only what the server needs and no client arithmetic', () => {
    const p = buildPayload(formFromQuote(savedQuote), { version: 3 })
    expect(p.version).toBe(3)
    expect(p.totalOverridden).toBe(true)
    expect(p.roundedTotal).toBe(44000)
    expect(p.rooms[0].items[0]).toEqual({ description: 'Base', unit: 'SQFT', length: 7, width: 4, quantity: null, rate: 1500, areaAdjusted: false })
  })

  it('omits the total when it is automatic', () => {
    const f = { ...formFromQuote(savedQuote), totalOverridden: false }
    expect(buildPayload(f).roundedTotal).toBeNull()
  })

  it('fingerprints content, not generated keys', () => {
    expect(fingerprint(formFromQuote(savedQuote))).toBe(fingerprint(formFromQuote(savedQuote)))
  })
})

describe('drafts', () => {
  it('detects a draft that started before the quote was saved elsewhere', () => {
    expect(draftStatus(null, 3)).toBe('none')
    expect(draftStatus({ baseVersion: 3 }, 3)).toBe('clean')
    expect(draftStatus({ baseVersion: 2 }, 3)).toBe('conflict')
    expect(draftStatus({ baseVersion: null }, null)).toBe('clean')
  })

  it('reads the customer name from the saved form for the home screen', () => {
    expect(draftCustomerName({ data: { form: { customerName: '  Ravi ' } } })).toBe('Ravi')
    expect(draftCustomerName({ data: {} })).toBe('')
  })
})

describe('voice dimensions', () => {
  it('understands how people actually say sizes', () => {
    expect(parseDimensions('7 by 3')).toEqual({ length: '7', width: '3' })
    expect(parseDimensions('7 buy 2 point 8')).toEqual({ length: '7', width: '2.8' })
    expect(parseDimensions('7 cross 3')).toEqual({ length: '7', width: '3' })
    expect(parseDimensions('7 / 2.5')).toEqual({ length: '7', width: '2.5' })
    expect(parseDimensions('seven')).toBeNull()
  })
})

describe('sqft items entered as a total area (real production data)', () => {
  const quote = {
    ...savedQuote,
    rooms: [{ name: 'Balcony', items: [{ description: 'Utility box (2X2)(1X7)', unit: 'SQFT', length: null, width: null, quantity: 11, rate: 1000 }] }],
  }

  it('opens in area mode and keeps the area', () => {
    const item = formFromQuote(quote).rooms[0].items[0]
    expect(item.areaAdjusted).toBe(true)
    expect(item.quantity).toBe('11')
  })

  it('validates and saves the typed area instead of demanding dimensions', () => {
    const f = formFromQuote(quote)
    expect(validateForm(f).firstError).toBeNull()
    expect(buildPayload(f).rooms[0].items[0]).toEqual({ description: 'Utility box (2X2)(1X7)', unit: 'SQFT', length: null, width: null, quantity: 11, rate: 1000, areaAdjusted: true })
  })

  it('asks for the area when area mode is empty', () => {
    const f = formFromQuote(quote)
    f.rooms[0].items[0].quantity = ''
    expect(validateForm(f).errors['rooms.0.items.0.quantity']).toBe('Add the billed area')
  })
})

describe('billed area differing from length x width (real production data)', () => {
  const quote = {
    ...savedQuote,
    rooms: [{ name: 'Foyer', items: [
      { description: 'Foyer Box', unit: 'SQFT', length: 2.5, width: 5.5, quantity: 14, rate: 1250 },
      { description: 'Bathroom Storage Box (1.5X1.5) 2 Nos', unit: 'SQFT', length: 1.5, width: 1.5, quantity: 4.5, rate: 1250 },
      { description: 'Side Panel', unit: 'SQFT', length: 1.5, width: 7, quantity: 10.5, rate: 800 },
    ] }],
  }

  it('detects hand-set areas and leaves exact ones automatic', () => {
    const items = formFromQuote(quote).rooms[0].items
    expect(items.map((i) => i.areaAdjusted)).toEqual([true, true, false])
  })

  it('saves every line with exactly the area and amount it had', () => {
    const items = buildPayload(formFromQuote(quote)).rooms[0].items
    expect(items[0]).toMatchObject({ length: 2.5, width: 5.5, quantity: 14, areaAdjusted: true })
    expect(items[1]).toMatchObject({ length: 1.5, width: 1.5, quantity: 4.5, areaAdjusted: true })
    expect(items[2]).toMatchObject({ length: 1.5, width: 7, quantity: null, areaAdjusted: false })
  })
})

describe('an imported sheet as a new quote', () => {
  const business = { validityDays: 30, roundingMode: 'NEAREST', roundingStep: 1000 }
  const defaults = { materialSpecItems: [{ itemLabel: 'Plywood', detail: 'BWP', brand: 'GAMA' }], termItems: [{ text: '50% advance' }] }
  const sheet = (total) => [
    ['Customer name', 'Ravi Kumar'],
    ['WhatsApp number', '98400 12345'],
    ['Quote date', '25/10/2026'],
    ...(total ? [['Final total', total]] : []),
    [],
    ['Room', 'Item', 'Unit', 'Length', 'Width', 'Billed area / quantity', 'Rate'],
    ['Kitchen', 'Base cabinets', 'SQFT', 7, 2.5, null, 1250],
    [null, 'Tall unit', 'SQFT', 2, 7, 15, 1250],
    ['Bedroom', 'Mirror', 'NOS', null, null, 1, 3500],
  ]
  const formFor = (total) => formForImport(parseWorkbook([{ sheet: 'Quote', data: sheet(total) }])[0].patch, defaults, business, '2026-10-26')

  it('fills the customer, rooms and items, with the usual spec and terms', () => {
    const form = formFor()
    expect(form).toMatchObject({ customerName: 'Ravi Kumar', customerPhone: '+91 98400 12345', quoteDate: '2026-10-25', validUntil: '2026-11-24' })
    expect(form.rooms.map((r) => [r.name, r.items.length])).toEqual([['Kitchen', 2], ['Bedroom', 1]])
    expect(form.rooms.every((r) => r.key && r.items.every((it) => it.key))).toBe(true)
    expect(form.materialSpecItems[0].itemLabel).toBe('Plywood')
    expect(form.termItems[0].text).toBe('50% advance')
    expect(validateForm(form).firstError).toBeNull()
  })

  it('saves exactly what the sheet said', () => {
    const payload = buildPayload(formFor(), {})
    expect(payload.rooms[0].items).toEqual([
      { description: 'Base cabinets', unit: 'SQFT', length: 7, width: 2.5, quantity: null, rate: 1250, areaAdjusted: false },
      { description: 'Tall unit', unit: 'SQFT', length: 2, width: 7, quantity: 15, rate: 1250, areaAdjusted: true },
    ])
    expect(payload.rooms[1].items[0]).toMatchObject({ unit: 'NOS', quantity: 1, rate: 3500 })
  })

  it('keeps an agreed total, but not one the usual rounding gives anyway', () => {
    // items: 21,875 + 18,750 + 3,500 = 44,125 -> usual total 44,000
    expect(formFor(40000)).toMatchObject({ totalOverridden: true, roundedTotal: '40000' })
    expect(formFor(44000)).toMatchObject({ totalOverridden: false, roundedTotal: '' })
    expect(formFor()).toMatchObject({ totalOverridden: false })
  })
})
