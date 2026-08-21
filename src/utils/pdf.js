import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Renders a DOM node (expected to be our QuotePdfTemplate, unscaled) into a multi-page A4 PDF blob.
// This rasterizes the HTML (like a high-res screenshot placed into PDF pages) rather than producing
// selectable vector text - a known tradeoff of client-side HTML-to-PDF, but it guarantees the PDF
// looks pixel-identical to the approved on-screen design.
export async function generateQuotePdfBlob(node) {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })

  const pageWidthMm = 210
  const pageHeightMm = 297
  const imgWidthMm = pageWidthMm
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width

  const pdf = new jsPDF('p', 'mm', 'a4')
  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  let heightLeft = imgHeightMm
  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm)
  heightLeft -= pageHeightMm

  while (heightLeft > 0) {
    position = heightLeft - imgHeightMm
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidthMm, imgHeightMm)
    heightLeft -= pageHeightMm
  }

  return pdf.output('blob')
}

export function pdfFileNameFor(customerName) {
  const safe = (customerName || 'Quote').trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '')
  return `Masterpiece_Quote_${safe}.pdf`
}

export function buildWhatsAppMessage(quote) {
  return `Hi ${quote.customerName}, please find attached your interior quote from Masterpiece Interiors. Total: ${formatRupeesPlain(
    quote.roundedTotal
  )}. Feel free to reach out for any queries.\n- N. Kalyan, Masterpiece Interiors`
}

function formatRupeesPlain(value) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// Assumes Indian 10-digit numbers when no country code is present - reasonable default for this
// business, but the raw stored number is trusted as-is if it's already longer than 10 digits.
export function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}