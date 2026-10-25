// A blank quote to fill in on a computer and import on the phone. Its layout is exactly what the
// importer reads best: customer details as label/value pairs, then one row per item.
import writeExcelFile from 'write-excel-file/browser'

export const TEMPLATE_HEADERS = ['Room', 'Item', 'Unit', 'Length (ft)', 'Width (ft)', 'Billed area / quantity', 'Rate (₹)']

export const TEMPLATE_EXAMPLE = [
  ['Kitchen', 'Base cabinets', 'SQFT', 7, 2.5, null, 1250],
  ['Kitchen', 'Loft', 'SQFT', 7, 2, null, 950],
  ['Kitchen', 'Tall unit', 'SQFT', 2, 7, 15, 1250],
  ['Master bedroom', 'Wardrobe', 'SQFT', 6, 7, null, 1250],
  ['Master bedroom', 'Dresser mirror', 'NOS', null, null, 1, 3500],
]

const ACCENT = '#95212E'
const MUTED = '#6B6670'
const LABEL_BG = '#F4F2EF'

const head = (value) => ({ value, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: ACCENT })
const label = (value) => ({ value, fontWeight: 'bold', backgroundColor: LABEL_BG })
const note = (value) => ({ value, textColor: MUTED, wrap: false })

// rows: optional item rows (used by tests and by the example sheet)
export function templateSheets({ details = {}, rows = [] } = {}) {
  const quote = [
    [{ value: 'Masterpiece Interiors · Quote', fontWeight: 'bold', fontSize: 14, textColor: ACCENT }],
    [note('Fill in the customer and one row per item, then use "Import from Excel" in the app. Every number is checked before the quote is saved.')],
    [],
    [label('Customer name'), details.name ?? null],
    [label('WhatsApp number'), details.phone ?? null],
    [label('Site address'), details.address ?? null],
    [label('Quote date'), details.date instanceof Date ? { value: details.date, format: 'dd/mm/yyyy' } : (details.date ?? null)],
    [label('Fittings and accessories'), details.fittings ?? null],
    [label('Fittings amount (₹)'), details.fittingsAmount ?? null],
    [label('Final total (₹, optional)'), details.total ?? null],
    [],
    TEMPLATE_HEADERS.map(head),
    ...rows.map((r) => [...r]),
  ]

  const help = [
    [{ value: 'How to fill the quote sheet', fontWeight: 'bold', fontSize: 14, textColor: ACCENT }],
    [],
    ['Room', 'Write the room on each row, or only on its first row: the rows below stay in that room.'],
    ['Unit', 'SQFT for work charged per square foot. NOS for things you count (mirrors, handles, lights).'],
    ['SQFT items', 'Fill Length and Width in feet (7.5 or 7\'6"). The area is length × width.'],
    ['Billed area', 'Leave empty unless you bill a different area than length × width (it is kept as typed).'],
    ['NOS items', 'Fill the quantity in "Billed area / quantity".'],
    ['Rate', 'Per square foot for SQFT, per piece for NOS. Amounts and the total are worked out by the app.'],
    ['Final total', 'Optional. Leave empty to use the usual rounding, or type the total you agreed.'],
    [],
    [{ value: 'Example', fontWeight: 'bold' }],
    TEMPLATE_HEADERS.map(head),
    ...TEMPLATE_EXAMPLE.map((r) => [...r]),
  ]

  const widths = [{ width: 26 }, { width: 34 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 22 }, { width: 12 }]
  return [
    { data: quote, sheet: 'Quote', columns: widths },
    { data: help, sheet: 'How to fill', columns: [{ width: 16 }, { width: 100 }] },
  ]
}

export async function downloadTemplate() {
  await writeExcelFile(templateSheets()).toFile('Masterpiece quote template.xlsx')
}
