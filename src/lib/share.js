import { formatRupees, quoteRef } from './money'

export function pdfFileName(quote) {
  const name = (quote.customerName || 'Customer').trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '')
  return `${quoteRef(quote.quoteNumber)}_${name}.pdf`
}

export function whatsappMessage(quote, business) {
  return [
    `Hello ${quote.customerName},`,
    `Please find attached your quotation ${quoteRef(quote.quoteNumber)} from ${business.name}.`,
    `Total: ${formatRupees(quote.roundedTotal)}.`,
    'Happy to answer any questions.',
    `${business.signatory}, ${business.name}`,
  ].join('\n')
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function canShareFiles(file) {
  return typeof navigator !== 'undefined' && Boolean(navigator.canShare?.({ files: [file] }))
}

// Opens the phone's share sheet (pick WhatsApp, pick the customer). No web app can open a
// specific WhatsApp chat with a file attached; the share sheet is the only route.
// Returns 'shared' | 'cancelled' | 'unsupported'.
export async function shareFile(file, text) {
  if (!canShareFiles(file)) return 'unsupported'
  try {
    // WhatsApp shows `title` as the caption next to the file; other apps read `text`.
    await navigator.share({ files: [file], title: text, text })
    return 'shared'
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
    throw err
  }
}
