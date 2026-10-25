// Turns a full backup into a readable Excel workbook (one sheet each for quotes, line items,
// material specs and terms). The JSON backup is the restorable copy; this is for reading.
import writeExcelFile from 'write-excel-file/browser'
import { quoteRef } from './money'

const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

export function workbookSheets(backup) {
  const quotes = backup.quotes || []
  const head = (cols) => cols.map((c) => ({ value: c, fontWeight: 'bold' }))

  const quoteRows = [
    head(['Quote', 'Customer', 'Phone', 'Address', 'Date', 'Valid until', 'Status', 'Items and fittings', 'Final total', 'Total typed by hand', 'Deleted']),
    ...quotes.map((q) => [
      quoteRef(q.quoteNumber), q.customerName, q.customerPhone, q.customerAddress || '', q.quoteDate, q.validUntil || '',
      q.status, n(q.subtotal), n(q.roundedTotal), q.totalOverridden ? 'Yes' : 'No', q.deletedAt ? 'Yes' : 'No',
    ]),
  ]

  const itemRows = [head(['Quote', 'Customer', 'Room', 'Item', 'Unit', 'Length (ft)', 'Width (ft)', 'Quantity', 'Rate', 'Amount'])]
  quotes.forEach((q) => {
    ;(q.rooms || []).forEach((room) => {
      ;(room.items || []).forEach((it) => {
        itemRows.push([quoteRef(q.quoteNumber), q.customerName, room.name, it.description, it.unit, n(it.length), n(it.width), n(it.quantity), n(it.rate), n(it.amount)])
      })
    })
    if (Number(q.accessoriesAmount) > 0) {
      itemRows.push([quoteRef(q.quoteNumber), q.customerName, 'Fittings and accessories', q.accessoriesDescription || '', '', null, null, null, null, n(q.accessoriesAmount)])
    }
  })

  const specRows = [head(['Quote', 'Item', 'Specification', 'Brand'])]
  const termRows = [head(['Quote', 'No.', 'Term'])]
  quotes.forEach((q) => {
    ;(q.materialSpecItems || []).forEach((s) => specRows.push([quoteRef(q.quoteNumber), s.itemLabel, s.detail || '', s.brand || '']))
    ;(q.termItems || []).forEach((t, i) => termRows.push([quoteRef(q.quoteNumber), i + 1, t.text]))
  })

  return [
    { data: quoteRows, sheet: 'Quotes', stickyRowsCount: 1 },
    { data: itemRows, sheet: 'Line items', stickyRowsCount: 1 },
    { data: specRows, sheet: 'Material specs', stickyRowsCount: 1 },
    { data: termRows, sheet: 'Terms', stickyRowsCount: 1 },
  ]
}

export async function downloadExcel(backup, fileName) {
  await writeExcelFile(workbookSheets(backup)).toFile(fileName)
}
