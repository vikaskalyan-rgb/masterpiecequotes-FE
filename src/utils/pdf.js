import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Renders a DOM node (expected to be our QuotePdfTemplate, unscaled) into a multi-page A4 PDF blob.
// This rasterizes the HTML (like a high-res screenshot placed into PDF pages) rather than producing
// selectable vector text - a known tradeoff of client-side HTML-to-PDF, but it guarantees the PDF
// looks pixel-identical to the approved on-screen design.
//
// Naive fixed-height slicing would cut straight through a room's item table wherever the page
// boundary happened to fall, splitting a row's qty/rate/amount across two pages. To avoid that,
// every element marked data-pdf-block="true" in the template (each room, totals, the investment
// breakdown, material spec, terms) is treated as atomic: if a page break would land inside one,
// the break is pulled back to start of that block instead, pushing it whole onto the next page.
export async function generateQuotePdfBlob(node) {
  const containerRect = node.getBoundingClientRect()
  const blockEls = Array.from(node.querySelectorAll('[data-pdf-block]'))
  const blocksCss = blockEls.map((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top - containerRect.top, bottom: r.bottom - containerRect.top }
  })

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })

  const pageWidthMm = 210
  const pageHeightMm = 297
  const imgWidthMm = pageWidthMm
  const pxPerMm = canvas.width / imgWidthMm
  const pageHeightPx = pageHeightMm * pxPerMm

  // html2canvas's actual scale factor (canvas px per CSS px) - normally equals the `scale` option,
  // computed directly in case of any rounding so block boundaries line up exactly.
  const scaleFactor = canvas.width / node.offsetWidth
  const blocksPx = blocksCss.map((b) => ({ top: b.top * scaleFactor, bottom: b.bottom * scaleFactor }))

  // Compute where each page should start (in canvas px), pulling breaks back to avoid splitting
  // any protected block - unless that block is itself taller than a full page, which can't be
  // avoided either way.
  const pageStarts = [0]
  let current = 0
  while (current < canvas.height) {
    let next = current + pageHeightPx
    if (next >= canvas.height) break

    for (const b of blocksPx) {
      if (b.top > current && b.top < next && b.bottom > next) {
        const blockHeight = b.bottom - b.top
        if (blockHeight <= pageHeightPx) next = b.top
        break
      }
    }

    // Guard against an infinite loop in a pathological case (block starts exactly at `current`).
    if (next <= current) next = current + pageHeightPx

    pageStarts.push(next)
    current = next
  }

  // Build each page from its own cropped canvas slice (rather than shifting one shared image
  // with a Y-offset) - this guarantees pages never overlap, which the shift approach couldn't
  // do once a break got pulled back to avoid splitting a block: the previous page would still
  // render its full natural height and duplicate whatever the next page pulled back to include.
  const pdf = new jsPDF('p', 'mm', 'a4')

  pageStarts.forEach((startPx, i) => {
    const endPx = i + 1 < pageStarts.length ? pageStarts[i + 1] : canvas.height
    const sliceHeightPx = endPx - startPx

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeightPx
    const ctx = pageCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(canvas, 0, startPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

    const sliceDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95)
    const sliceHeightMm = sliceHeightPx / pxPerMm

    if (i > 0) pdf.addPage()
    pdf.addImage(sliceDataUrl, 'JPEG', 0, 0, imgWidthMm, sliceHeightMm)
  })

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