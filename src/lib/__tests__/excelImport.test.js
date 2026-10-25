import { describe, expect, it } from 'vitest'
import writeExcelFile from 'write-excel-file/node'
import readExcelFile from 'read-excel-file/node'
import { ImportError, parseCsv, parseDate, parseNumber, parseSize, parseWorkbook, splitDescriptionSize } from '../excelImport'
import { TEMPLATE_EXAMPLE, templateSheets } from '../excelTemplate'
import { itemAmount, subtotalOf } from '../money'

const BUSINESS = {
  ignorePhones: ['+91 99944 45388', '+91 73044 20600'],
  ignoreText: ['Masterpiece Interiors', '16/10, Gopalakrishnan Street, Guindy, Chennai – 600032'],
}

// write-excel-file cell objects -> plain values, as the reader returns them
const plain = (sheets) => sheets.map((s) => ({ sheet: s.sheet, data: s.data.map((r) => r.map((c) => (c && typeof c === 'object' && !(c instanceof Date) ? c.value : c))) }))

const only = (candidates) => {
  expect(candidates).toHaveLength(1)
  return candidates[0]
}

describe('reading values', () => {
  it('reads numbers the way they are typed in quotes', () => {
    expect(parseNumber(1250)).toBe(1250)
    expect(parseNumber('1,250')).toBe(1250)
    expect(parseNumber('₹ 1,250.00/-')).toBe(1250)
    expect(parseNumber('Rs. 950')).toBe(950)
    expect(parseNumber('28 sqft')).toBe(28)
    expect(parseNumber('2 nos')).toBe(2)
    expect(parseNumber('7\'6"')).toBe(7.5)
    expect(parseNumber("7'")).toBe(7)
    expect(parseNumber('7 ft 6 in')).toBe(7.5)
    expect(parseNumber('-')).toBeNull()
    expect(parseNumber('Kitchen')).toBeNull()
    expect(parseNumber('50% advance')).toBeNull()
    expect(parseNumber(null)).toBeNull()
  })

  it('reads sizes and sizes written into descriptions', () => {
    expect(parseSize('7 x 4')).toEqual({ length: 7, width: 4 })
    expect(parseSize('7X2.5')).toEqual({ length: 7, width: 2.5 })
    expect(parseSize('7\'6" x 4\'')).toEqual({ length: 7.5, width: 4 })
    expect(parseSize('2.5x7x3')).toBeNull()
    expect(splitDescriptionSize('Wardrobe Framed (7X4)')).toEqual({ description: 'Wardrobe Framed', size: { length: 7, width: 4 } })
    expect(splitDescriptionSize('Loft - 7 x 2')).toEqual({ description: 'Loft', size: { length: 7, width: 2 } })
    expect(splitDescriptionSize('TV unit 6x4 with backlight').size).toBeNull()
    expect(splitDescriptionSize('(7x4)').size).toBeNull() // nothing would be left
  })

  it('reads dates day-first, as written in India', () => {
    expect(parseDate('25/10/2026')).toBe('2026-10-25')
    expect(parseDate('5-3-26')).toBe('2026-03-05')
    expect(parseDate('2026-10-25')).toBe('2026-10-25')
    expect(parseDate('25 Oct 2026')).toBe('2026-10-25')
    expect(parseDate(new Date(Date.UTC(2026, 9, 25)))).toBe('2026-10-25')
    expect(parseDate(46320)).toBe('2026-10-25') // Excel day number
    expect(parseDate('31/02/2026')).toBeNull()
    expect(parseDate('Kitchen')).toBeNull()
  })

  it('reads CSV with quotes, commas inside quotes and semicolons', () => {
    expect(parseCsv('Item,Rate\n"Base, kitchen",1250\r\n"Say ""hi""",5\n')).toEqual([
      ['Item', 'Rate'],
      ['Base, kitchen', '1250'],
      ['Say "hi"', '5'],
    ])
    expect(parseCsv('Item;Rate\nLoft;950')).toEqual([['Item', 'Rate'], ['Loft', '950']])
  })
})

describe('the app template', () => {
  const filled = templateSheets({
    details: { name: 'Ravi Kumar', phone: '98400 12345', address: '12 Lake View, Adyar', date: '25/10/2026', fittings: 'Tandem boxes', fittingsAmount: 22000 },
    rows: TEMPLATE_EXAMPLE,
  })

  it('imports the customer, rooms, items and fittings exactly', () => {
    const c = only(parseWorkbook(plain(filled), BUSINESS))
    expect(c.patch).toMatchObject({
      customerName: 'Ravi Kumar',
      customerPhone: '+91 98400 12345',
      customerAddress: '12 Lake View, Adyar',
      quoteDate: '2026-10-25',
      accessoriesDescription: 'Tandem boxes',
      accessoriesAmount: '22000',
      sheetTotal: null,
    })
    expect(c.patch.rooms.map((r) => r.name)).toEqual(['Kitchen', 'Master bedroom'])
    const [kitchen, bedroom] = c.patch.rooms
    expect(kitchen.items[0]).toMatchObject({ description: 'Base cabinets', unit: 'SQFT', length: '7', width: '2.5', areaAdjusted: false })
    expect(kitchen.items[2]).toMatchObject({ description: 'Tall unit', areaAdjusted: true, quantity: '15' }) // billed area kept
    expect(bedroom.items[1]).toMatchObject({ description: 'Dresser mirror', unit: 'NOS', quantity: '1', rate: '3500' })
    expect(c.warnings).toEqual([])
    expect(subtotalOf(c.patch.rooms, c.patch.accessoriesAmount)).toBe(21875 + 13300 + 18750 + 52500 + 3500 + 22000)
  })

  it('skips the "How to fill" sheet and its example rows', () => {
    const empty = plain(templateSheets())
    expect(() => parseWorkbook(empty, BUSINESS)).toThrow(ImportError)
    expect(() => parseWorkbook(empty, BUSINESS)).toThrow(/no items/)
  })

  it('survives a real .xlsx round trip (dates, numbers, styles)', async () => {
    const sheets = templateSheets({ details: { name: 'Ravi', phone: 9840012345, date: new Date(Date.UTC(2026, 9, 25)) }, rows: TEMPLATE_EXAMPLE })
    const buffer = await writeExcelFile(sheets).toBuffer()
    const c = only(parseWorkbook(await readExcelFile(buffer), BUSINESS))
    expect(c.patch.customerPhone).toBe('+91 98400 12345')
    expect(c.patch.quoteDate).toBe('2026-10-25')
    expect(c.stats).toEqual({ rooms: 2, items: 5 })
  })
})

describe("the owner's own quote sheets", () => {
  const sheet = [
    ['MASTERPIECE INTERIORS'],
    ['16/10, Gopalakrishnan Street, Guindy, Chennai – 600032'],
    ['Ph: +91 99944 45388 / +91 73044 20600'],
    ['Address:', '16/10, Gopalakrishnan Street, Guindy'],
    [null, null, null, null, 'Date:', '12/10/2026'],
    ['Name: Mr. Suresh'],
    ['Mob: 98400 12345'],
    ['Site: Flat 4B, Sea Breeze Apartments, Besant Nagar'],
    [],
    ['S.No', 'Description', 'Size', 'Qty (sqft)', 'Rate', 'Amount'],
    [null, 'KITCHEN', null, null, null, null],
    [1, 'Base unit (7x2.5)', null, 17.5, 1250, 21875],
    [2, 'Loft', '7 x 6', 42, 950, 39900],
    [3, 'Shutters', '2 x 7', 2, 1250, 35000], // 2 pieces
    [4, 'Corner unit', null, 11, 1250, 13750], // area only
    [null, 'Kitchen Total', null, null, null, 110525],
    [null, 'MASTER BEDROOM:', null, null, null, null],
    [5, 'Wardrobe', "7' x 6'6\"", 46, 1250, 57500], // area rounded up from 45.5
    [6, 'Mirror', null, '1 no', 3500, 3500],
    [7, 'Painting', null, null, null, 15000], // lump sum
    [null, 'Accessories (Hettich)', null, null, null, 22000],
    [null, 'Sub Total', null, null, null, 208025],
    [null, 'Discount', null, null, null, 3025],
    [null, 'Grand Total', null, null, null, 205000],
    [null, 'GST 18%', null, null, null, 36900],
    [null, 'Total with GST', null, null, null, 241900],
    [],
    ['Terms & Conditions'],
    [1, '50% advance with order'],
    [2, 'Delivery in 21 days'],
  ]
  const c = only(parseWorkbook([{ sheet: 'Suresh', data: sheet }], BUSINESS))

  it('finds the customer but never the business letterhead', () => {
    expect(c.patch.customerName).toBe('Mr. Suresh')
    expect(c.patch.customerPhone).toBe('+91 98400 12345')
    expect(c.patch.customerAddress).toBe('Flat 4B, Sea Breeze Apartments, Besant Nagar')
    expect(c.patch.quoteDate).toBe('2026-10-12')
  })

  it('splits rooms on heading rows and tidies their names', () => {
    expect(c.patch.rooms.map((r) => r.name)).toEqual(['Kitchen', 'Master Bedroom'])
    expect(c.stats).toEqual({ rooms: 2, items: 7 })
  })

  it('reads sizes from the description, the Size column and feet-inches', () => {
    const [kitchen, bedroom] = c.patch.rooms
    expect(kitchen.items[0]).toMatchObject({ description: 'Base unit', length: '7', width: '2.5', areaAdjusted: false })
    expect(kitchen.items[1]).toMatchObject({ length: '7', width: '6', areaAdjusted: false })
    expect(bedroom.items[0]).toMatchObject({ length: '7', width: '6.5', areaAdjusted: true, quantity: '46' })
  })

  it('keeps every amount the sheet had', () => {
    const amounts = c.patch.rooms.flatMap((r) => r.items.map(itemAmount))
    expect(amounts).toEqual([21875, 39900, 35000, 13750, 57500, 3500, 15000])
    expect(c.patch.accessoriesAmount).toBe('22000')
    expect(c.patch.accessoriesDescription).toBe('Accessories (Hettich)')
  })

  it('turns pieces into billed area and lump sums into 1 × amount, and says so', () => {
    const [kitchen, bedroom] = c.patch.rooms
    expect(kitchen.items[2]).toMatchObject({ description: 'Shutters', areaAdjusted: true, quantity: '28' })
    expect(kitchen.items[3]).toMatchObject({ unit: 'SQFT', areaAdjusted: true, quantity: '11', length: '' })
    expect(bedroom.items[2]).toMatchObject({ unit: 'NOS', quantity: '1', rate: '15000' })
    expect(c.warnings).toContain('Kitchen · Shutters: 2 pieces of 2 × 7 ft, billed as 28 sqft')
    expect(c.warnings).toContain('Master Bedroom · Painting: Lump sum, imported as 1 × the amount')
  })

  it('takes the grand total before GST and ignores subtotals and terms', () => {
    expect(c.patch.sheetTotal).toBe(205000)
    expect(c.warnings).toContain('Skipped "GST 18%": quotes are written without GST')
    expect(c.warnings.some((w) => /advance|Delivery/.test(w))).toBe(false)
  })
})

describe('other layouts', () => {
  it('reads a sheet with Room, L, W, Unit columns and carries the room down', () => {
    const data = [
      ['Room', 'Particulars', 'L', 'W', 'Unit', 'Rate', 'Amount'],
      ['Living', 'TV unit', 6, 4, 'Sft', 1100, 26400],
      [null, 'Shoe rack', 3, 3, 'sft', 900, 8100],
      ['Pooja', 'Pooja unit', 3, 5, 'sqft', 1500, 22500],
      [null, 'Bells', null, null, 'Nos', 250, 1000],
      [null, 'Skirting', 40, null, 'Rft', 60, 2400],
    ]
    const c = only(parseWorkbook([{ sheet: 'Sheet1', data }], BUSINESS))
    expect(c.patch.rooms.map((r) => [r.name, r.items.length])).toEqual([['Living', 2], ['Pooja', 3]])
    const bells = c.patch.rooms[1].items[1]
    expect(bells).toMatchObject({ unit: 'NOS', quantity: '4', rate: '250' }) // quantity from amount ÷ rate
    expect(c.warnings).toContain('No customer name found: add it')
    expect(c.warnings.some((w) => w.includes('Skirting') && w.includes('Rft'))).toBe(true)
  })

  it('offers each quote when a file holds several (the app’s own Excel export)', () => {
    const data = [
      ['Quote', 'Customer', 'Room', 'Item', 'Unit', 'Length (ft)', 'Width (ft)', 'Quantity', 'Rate', 'Amount'],
      ['MP-0001', 'Ravi', 'Kitchen', 'Base', 'SQFT', 7, 2.5, 17.5, 1250, 21875],
      ['MP-0001', 'Ravi', 'Fittings and accessories', 'Tandem boxes', '', null, null, null, null, 22000],
      ['MP-0002', 'Kumar', 'Hall', 'TV unit', 'SQFT', 6, 4, 24, 1100, 26400],
    ]
    const list = parseWorkbook([{ sheet: 'Line items', data }], BUSINESS)
    expect(list.map((c) => c.label)).toEqual(['MP-0001 · Ravi', 'MP-0002 · Kumar'])
    expect(list[0].patch.accessoriesAmount).toBe('22000')
    expect(list[0].patch.rooms).toHaveLength(1)
  })

  it('explains what it needs when there is no item table', () => {
    expect(() => parseWorkbook([{ sheet: 'Sheet1', data: [['Hello'], ['World']] }])).toThrow(/heading row/)
  })

  it('refuses huge sheets instead of freezing the phone', () => {
    const data = [['Item', 'Qty', 'Rate'], ...Array.from({ length: 401 }, (_, i) => [`Item ${i}`, 1, 10])]
    expect(() => parseWorkbook([{ sheet: 'S', data }])).toThrow(/more than 400/)
  })
})

describe('real production quote replayed through the importer', () => {
  // MP-0001's 34 lines (no customer details), as [unit, length, width, billed qty, rate, amount].
  const rooms = [
    [['SQFT', 7, 2.5, 17.5, 1250, 21875], ['SQFT', 7, 6, 42, 950, 39900], ['SQFT', 2.5, 5.5, 14, 1250, 17500], ['SQFT', 4.5, 5.5, 25, 800, 20000], ['SQFT', null, null, 11, 1250, 13750], ['SQFT', 1.5, 1.5, 4.5, 1250, 5625], ['SQFT', 25, 1, 25, 550, 13750], ['SQFT', 3, 2.75, 8, 1250, 10000], ['SQFT', 6, 2.75, 16.5, 800, 13200]],
    [['SQFT', 2.5, 5, 12.5, 1350, 16875], ['SQFT', 2.5, 7, 17.5, 700, 12250], ['SQFT', 3.25, 13.25, 43, 650, 27950], ['SQFT', null, null, 18, 350, 6300], ['SQFT', null, null, 32, 1250, 40000], ['SQFT', 7, 4.25, 30, 650, 19500], ['SQFT', 4, 2, 8, 700, 5600], ['SQFT', 2.5, 2, 5, 1250, 6250]],
    [['SQFT', 3.25, 10.5, 34, 650, 22100], ['SQFT', 7, 4.25, 30, 650, 19500], ['SQFT', 1.5, 7, 10.5, 500, 5250], ['SQFT', 6.5, 2, 13, 1250, 16250], ['SQFT', null, null, 16, 350, 5600]],
    [['SQFT', 3.25, 11, 36, 650, 23400], ['SQFT', 7, 4, 28, 650, 18200], ['NOS', null, null, 10.5, 500, 5250]],
    [['NOS', null, null, 30, 650, 19500], ['SQFT', 3.25, 10.5, 34, 650, 22100], ['SQFT', 1.5, 7, 10.5, 500, 5250], ['SQFT', 3.5, 1.5, 5, 350, 1750]],
  ]
  const data = [['Room', 'Item', 'Unit', 'Length', 'Width', 'Quantity', 'Rate', 'Amount']]
  rooms.forEach((items, r) => items.forEach((it, i) => data.push([`Room ${r + 1}`, `Item ${r + 1}.${i + 1}`, ...it])))
  data.push([null, 'Accessories', null, null, null, null, null, 22000])
  data.push([null, 'Total', null, null, null, null, null, 475000])

  it('reproduces every line amount and keeps the agreed total', () => {
    const c = only(parseWorkbook([{ sheet: 'MP-0001', data }]))
    const expected = rooms.flat().map((it) => it[5])
    expect(c.patch.rooms.flatMap((r) => r.items.map(itemAmount))).toEqual(expected)
    expect(subtotalOf(c.patch.rooms, c.patch.accessoriesAmount)).toBe(476475)
    expect(c.patch.sheetTotal).toBe(475000)
    expect(c.warnings.filter((w) => w.includes('works out'))).toEqual([])
  })
})
