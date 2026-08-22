import { api } from '../api/client'

// Pulls every quote's full detail (rooms/items included) and builds a two-sheet backup
// workbook: one row per quote, and one row per line item across all quotes. This is a genuine
// offline backup - not dependent on the app or database being up.
export async function exportAllQuotesToExcel() {
  const XLSX = await import('xlsx')

  const summaries = await api.listQuotes({})
  const fullQuotes = await Promise.all(summaries.map((s) => api.getQuote(s.id)))

  const quotesRows = fullQuotes.map((q) => ({
    'Customer Name': q.customerName,
    Phone: q.customerPhone,
    Address: q.customerAddress || '',
    'Quote Date': q.quoteDate,
    Subtotal: Number(q.subtotal || 0),
    'Rounded Total': Number(q.roundedTotal || 0),
    'Accessories Description': q.accessoriesDescription || '',
    'Accessories Amount': Number(q.accessoriesAmount || 0),
  }))

  const itemRows = []
  fullQuotes.forEach((q) => {
    ;(q.rooms || []).forEach((room) => {
      ;(room.items || []).forEach((item) => {
        itemRows.push({
          'Customer Name': q.customerName,
          'Quote Date': q.quoteDate,
          Room: room.name,
          Description: item.description,
          Length: item.length ?? '',
          Width: item.width ?? '',
          Quantity: Number(item.quantity || 0),
          Unit: item.unit,
          Rate: Number(item.rate || 0),
          Amount: Number(item.amount || 0),
        })
      })
    })
  })

  const wb = XLSX.utils.book_new()
  const quotesSheet = XLSX.utils.json_to_sheet(quotesRows)
  const itemsSheet = XLSX.utils.json_to_sheet(itemRows)
  XLSX.utils.book_append_sheet(wb, quotesSheet, 'Quotes')
  XLSX.utils.book_append_sheet(wb, itemsSheet, 'Line Items')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Masterpiece_Quotes_Backup_${today}.xlsx`)

  return { quoteCount: fullQuotes.length, itemCount: itemRows.length }
}