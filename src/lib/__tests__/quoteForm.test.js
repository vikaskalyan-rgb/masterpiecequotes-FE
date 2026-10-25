import { describe, expect, it } from 'vitest'
import { draftCustomerName, draftStatus } from '../drafts'
import { buildPayload, fingerprint, formForDuplicate, formForNewQuote, formFromQuote, validateForm } from '../quoteForm'
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
    expect(p.rooms[0].items[0]).toEqual({ description: 'Base', unit: 'SQFT', length: 7, width: 4, quantity: null, rate: 1500 })
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
