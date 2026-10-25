// Lazy entry point: the PDF renderer (~1 MB) only downloads when a quote is opened.
import { pdf } from '@react-pdf/renderer'
import QuoteDocument from './QuoteDocument'

export async function generateQuotePdf(quote, business) {
  return pdf(<QuoteDocument quote={quote} business={business} />).toBlob()
}
