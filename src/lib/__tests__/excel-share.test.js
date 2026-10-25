import { describe, expect, it } from 'vitest'
import { workbookSheets } from '../excel'
import { pdfFileName, whatsappMessage } from '../share'

const backup = {
  quotes: [
    {
      quoteNumber: 3, customerName: 'Ravi K', customerPhone: '919994445388', quoteDate: '2026-10-01', status: 'SENT',
      subtotal: 46200, roundedTotal: 46000, accessoriesAmount: 2500, accessoriesDescription: 'Tandem box',
      rooms: [{ name: 'Kitchen', items: [{ description: 'Base', unit: 'SQFT', length: 7, width: 4, quantity: 28, rate: 1500, amount: 42000 }] }],
      materialSpecItems: [{ itemLabel: 'Ply', detail: 'BWP', brand: 'GAMA' }],
      termItems: [{ text: '50% advance' }],
    },
  ],
}

describe('excel export', () => {
  it('includes quotes, line items, specs and terms', () => {
    const sheets = workbookSheets(backup)
    expect(sheets.map((s) => s.sheet)).toEqual(['Quotes', 'Line items', 'Material specs', 'Terms'])
    expect(sheets[0].data[1][0]).toBe('MP-0003')
    expect(sheets[1].data).toHaveLength(3) // header + item + fittings
    expect(sheets[2].data[1]).toEqual(['MP-0003', 'Ply', 'BWP', 'GAMA'])
  })
})

describe('sharing', () => {
  it('names files by quote and customer', () => {
    expect(pdfFileName({ quoteNumber: 3, customerName: 'Ravi K.' })).toBe('MP-0003_Ravi_K.pdf')
  })

  it('writes the WhatsApp caption from the business profile', () => {
    const text = whatsappMessage({ quoteNumber: 3, customerName: 'Ravi', roundedTotal: 46000 }, { name: 'Masterpiece Interiors', signatory: 'N. Kalyan' })
    expect(text).toContain('MP-0003')
    expect(text).toContain('₹46,000')
    expect(text).toContain('N. Kalyan, Masterpiece Interiors')
  })
})
