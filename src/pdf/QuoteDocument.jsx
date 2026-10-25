import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import archivo400 from './fonts/Archivo-400.ttf'
import archivo500 from './fonts/Archivo-500.ttf'
import archivo600 from './fonts/Archivo-600.ttf'
import archivo700 from './fonts/Archivo-700.ttf'
import logo from './logo.png'
import { amountInWords, formatNumber, formatRupees, quoteRef } from '../lib/money'
import { formatDate } from '../lib/dates'

// The customer-facing quotation. Real text with embedded fonts (selectable, searchable, small),
// laid out like an interior drawing set: a title block, rooms in the logo's colours, and a
// clear path from items to the final total.

Font.register({
  family: 'Archivo',
  fonts: [
    { src: archivo400, fontWeight: 400 },
    { src: archivo500, fontWeight: 500 },
    { src: archivo600, fontWeight: 600 },
    { src: archivo700, fontWeight: 700 },
  ],
})
// Keep words whole (no automatic hyphenation of names or materials).
Font.registerHyphenationCallback((word) => [word])

const C = {
  ink: '#1D1B1F',
  ink2: '#5B5E68',
  ink3: '#8A8C94',
  line: '#E3E1DC',
  well: '#F4F3F0',
  rooms: ['#95212E', '#335D6D', '#F28763', '#1D1B1F'],
}

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 64, paddingHorizontal: 44, fontFamily: 'Archivo', fontSize: 9.5, color: C.ink },
  // react-pdf 4.x resolves a unitless lineHeight against its default 18pt font size unless the
  // same style sets fontSize, and an inherited lineHeight also hides the fixed footer. So no
  // lineHeight is inherited: each multi-line text style sets lineHeight together with fontSize.
  content: {},

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 41, marginRight: 12 },
  brandName: { fontSize: 15, fontWeight: 700, letterSpacing: 0.2 },
  tagline: { fontSize: 8.5, color: C.ink2, marginTop: 1 },
  docTitle: { alignItems: 'flex-end' },
  docTitleText: { fontSize: 20, fontWeight: 600, letterSpacing: 0.4, lineHeight: 1.1 },
  docRef: { fontSize: 9.5, color: C.ink2, marginTop: 4, lineHeight: 1.2 },

  parties: { flexDirection: 'row', marginTop: 26, gap: 20 },
  client: { flex: 1.15 },
  label: { fontSize: 7.5, color: C.ink3, marginBottom: 3 },
  clientName: { fontSize: 13, fontWeight: 600 },
  clientLine: { fontSize: 9, color: C.ink2, marginTop: 2, lineHeight: 1.35 },
  titleBlock: { flex: 1, borderWidth: 0.75, borderColor: C.ink, flexDirection: 'row', flexWrap: 'wrap' },
  tbCell: { width: '50%', paddingVertical: 6, paddingHorizontal: 8, borderColor: C.ink },
  tbValue: { fontSize: 9.5, fontWeight: 600 },

  totalBand: { marginTop: 20, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.well, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 9, color: C.ink2 },
  totalWords: { fontSize: 8.5, color: C.ink2, marginTop: 3, maxWidth: 280, lineHeight: 1.35 },
  totalValue: { fontSize: 24, fontWeight: 700 },

  sectionTitle: { fontSize: 11, fontWeight: 600, marginTop: 24, marginBottom: 8 },

  room: { marginTop: 16 },
  roomHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 5, borderBottomWidth: 1.25 },
  roomSwatch: { width: 8, height: 8, marginRight: 7 },
  roomName: { flex: 1, fontSize: 11, fontWeight: 600 },
  roomTotal: { fontSize: 10, fontWeight: 600 },

  th: { flexDirection: 'row', paddingTop: 6, paddingBottom: 4 },
  thText: { fontSize: 7.5, lineHeight: 1.2, color: C.ink3 },
  tr: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line },
  cItem: { flex: 1, paddingRight: 8, fontSize: 9.5, lineHeight: 1.3 },
  cSize: { width: 70, textAlign: 'right' },
  cQty: { width: 62, textAlign: 'right' },
  cRate: { width: 62, textAlign: 'right' },
  cAmount: { width: 78, textAlign: 'right' },
  muted: { color: C.ink2 },

  fittings: { flexDirection: 'row', marginTop: 16, paddingVertical: 8, borderTopWidth: 1.25, borderBottomWidth: 0.5, borderBottomColor: C.line },
  fittingsLabel: { flex: 1 },

  summary: { marginTop: 14, marginLeft: 'auto', width: 240 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  sumFinal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 7, borderTopWidth: 1, borderTopColor: C.ink },
  sumFinalText: { fontSize: 12, fontWeight: 700 },

  bar: { flexDirection: 'row', height: 12, marginTop: 4 },
  legend: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingRight: 12 },
  legendSwatch: { width: 7, height: 7, marginRight: 6 },
  legendName: { flex: 1 },
  legendPct: { width: 40, textAlign: 'right', color: C.ink2 },
  legendAmt: { width: 70, textAlign: 'right' },

  specRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line },
  specItem: { width: '30%', fontWeight: 600, paddingRight: 8 },
  specDetail: { flex: 1, paddingRight: 8, color: C.ink2, fontSize: 9.5, lineHeight: 1.3 },
  specBrand: { width: '28%' },

  term: { flexDirection: 'row', marginBottom: 4 },
  termNum: { width: 16, color: C.ink3 },
  termText: { flex: 1, fontSize: 9.5, lineHeight: 1.35 },

  signRow: { flexDirection: 'row', marginTop: 34, gap: 28 },
  signBox: { flex: 1 },
  signLine: { borderBottomWidth: 0.75, borderBottomColor: C.ink, height: 28, marginBottom: 4 },
  signName: { fontWeight: 600 },

  footer: { position: 'absolute', left: 44, right: 44, bottom: 24, flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 7, fontSize: 7.5, color: C.ink2 },
  footerText: { flex: 1, paddingRight: 12 },
  footerPage: { width: 40, textAlign: 'right' },
})

const money = (v) => formatRupees(v, { paise: 'auto' })

function sizeText(item) {
  if (item.unit === 'SQFT' && item.length != null && item.width != null) return `${formatNumber(item.length)} × ${formatNumber(item.width)} ft`
  return ''
}

function qtyText(item) {
  return `${formatNumber(item.quantity)} ${item.unit === 'SQFT' ? 'sqft' : 'nos'}`
}

function ItemRow({ it }) {
  return (
    <View style={s.tr} wrap={false}>
      <Text style={s.cItem}>{it.description}</Text>
      <Text style={[s.cSize, s.muted]}>{sizeText(it)}</Text>
      <Text style={[s.cQty, s.muted]}>{qtyText(it)}</Text>
      <Text style={[s.cRate, s.muted]}>{formatNumber(it.rate)}</Text>
      <Text style={s.cAmount}>{money(it.amount)}</Text>
    </View>
  )
}

export default function QuoteDocument({ quote, business }) {
  const rooms = (quote.rooms || []).filter((r) => r.items?.length)
  const fittings = Number(quote.accessoriesAmount) || 0
  const subtotal = Number(quote.subtotal) || 0
  const total = Number(quote.roundedTotal) || 0
  const diff = Math.round((total - subtotal) * 100) / 100
  const adjustmentLabel = !quote.totalOverridden ? 'Rounded off' : diff < 0 ? 'Discount' : 'Adjustment'

  const segments = [
    ...rooms.map((r, i) => ({ label: r.name, value: Number(r.total) || 0, color: C.rooms[i % C.rooms.length], tint: i >= C.rooms.length })),
    ...(fittings > 0 ? [{ label: quote.accessoriesDescription ? 'Fittings and accessories' : 'Fittings', value: fittings, color: C.ink3 }] : []),
  ].filter((seg) => seg.value > 0)
  const segmentTotal = segments.reduce((a, b) => a + b.value, 0) || 1
  const phones = [business.phonePrimary, business.phoneSecondary].filter(Boolean).join('   ')

  return (
    <Document
      title={`${quoteRef(quote.quoteNumber)} ${quote.customerName}`}
      author={business.name}
      subject="Quotation"
      creator={business.name}
      producer={business.name}
    >
      <Page size="A4" style={s.page}>
        <View style={s.content}>
          <View style={s.header}>
            <View style={s.brand}>
              <Image src={logo} style={s.logo} />
              <View>
                <Text style={s.brandName}>{business.name}</Text>
                {business.tagline ? <Text style={s.tagline}>{business.tagline}</Text> : null}
              </View>
            </View>
            <View style={s.docTitle}>
              <Text style={s.docTitleText}>Quotation</Text>
              <Text style={s.docRef}>{quoteRef(quote.quoteNumber)}</Text>
            </View>
          </View>

          <View style={s.parties}>
            <View style={s.client}>
              <Text style={s.label}>Prepared for</Text>
              <Text style={s.clientName}>{quote.customerName}</Text>
              {quote.customerAddress ? <Text style={s.clientLine}>{quote.customerAddress}</Text> : null}
            </View>
            <View style={s.titleBlock}>
              <View style={[s.tbCell, { borderRightWidth: 0.75, borderBottomWidth: 0.75 }]}>
                <Text style={s.label}>Quote no.</Text>
                <Text style={s.tbValue}>{quoteRef(quote.quoteNumber)}</Text>
              </View>
              <View style={[s.tbCell, { borderBottomWidth: 0.75 }]}>
                <Text style={s.label}>Date</Text>
                <Text style={s.tbValue}>{formatDate(quote.quoteDate)}</Text>
              </View>
              <View style={[s.tbCell, { borderRightWidth: 0.75 }]}>
                <Text style={s.label}>Valid until</Text>
                <Text style={s.tbValue}>{quote.validUntil ? formatDate(quote.validUntil) : '—'}</Text>
              </View>
              <View style={s.tbCell}>
                <Text style={s.label}>Prepared by</Text>
                <Text style={s.tbValue}>{business.signatory}</Text>
              </View>
            </View>
          </View>

          <View style={s.totalBand} wrap={false}>
            <View>
              <Text style={s.totalLabel}>Total investment</Text>
              <Text style={s.totalWords}>{amountInWords(total)}</Text>
            </View>
            <Text style={s.totalValue}>{formatRupees(total)}</Text>
          </View>

          {rooms.map((room, ri) => {
            const color = C.rooms[ri % C.rooms.length]
            return (
              <View key={room.id ?? ri} style={s.room}>
                {/* Heading, column labels and first row stay together: a room title is never left alone at the foot of a page. */}
              <View wrap={false}>
                <View style={[s.roomHead, { borderBottomColor: color }]}>
                  <View style={[s.roomSwatch, { backgroundColor: color }]} />
                  <Text style={s.roomName}>{room.name}</Text>
                  <Text style={s.roomTotal}>{money(room.total)}</Text>
                </View>
                <View style={s.th}>
                  <Text style={[s.cItem, s.thText]}>Item</Text>
                  <Text style={[s.thText, s.cSize]}>Size</Text>
                  <Text style={[s.thText, s.cQty]}>Qty</Text>
                  <Text style={[s.thText, s.cRate]}>Rate</Text>
                  <Text style={[s.thText, s.cAmount]}>Amount</Text>
                </View>
                {room.items.slice(0, 1).map((it, ii) => <ItemRow key={it.id ?? ii} it={it} />)}
              </View>
              {room.items.slice(1).map((it, ii) => <ItemRow key={it.id ?? `r${ii}`} it={it} />)}
              </View>
            )
          })}

          {fittings > 0 && (
            <View style={s.fittings} wrap={false}>
              <Text style={s.fittingsLabel}>
                <Text style={{ fontWeight: 600 }}>Fittings and accessories</Text>
                {quote.accessoriesDescription ? <Text style={s.muted}>{`  ${quote.accessoriesDescription}`}</Text> : null}
              </Text>
              <Text style={s.cAmount}>{money(fittings)}</Text>
            </View>
          )}

          <View style={s.summary} wrap={false}>
            <View style={s.sumRow}>
              <Text style={s.muted}>Items and fittings</Text>
              <Text>{money(subtotal)}</Text>
            </View>
            {diff !== 0 && (
              <View style={s.sumRow}>
                <Text style={s.muted}>{adjustmentLabel}</Text>
                <Text>{diff < 0 ? `− ${money(-diff)}` : `+ ${money(diff)}`}</Text>
              </View>
            )}
            <View style={s.sumFinal}>
              <Text style={s.sumFinalText}>Total</Text>
              <Text style={s.sumFinalText}>{formatRupees(total)}</Text>
            </View>
          </View>

          {segments.length > 1 && (
            <View wrap={false}>
              <Text style={s.sectionTitle}>Where your investment goes</Text>
              <View style={s.bar}>
                {segments.map((seg, i) => (
                  <View
                    key={i}
                    style={{ width: `${(seg.value / segmentTotal) * 100}%`, backgroundColor: seg.color, opacity: seg.tint ? 0.55 : 1, borderRightWidth: i < segments.length - 1 ? 1.5 : 0, borderRightColor: '#FFFFFF' }}
                  />
                ))}
              </View>
              <View style={s.legend}>
                {segments.map((seg, i) => (
                  <View key={i} style={s.legendItem}>
                    <View style={[s.legendSwatch, { backgroundColor: seg.color, opacity: seg.tint ? 0.55 : 1 }]} />
                    <Text style={s.legendName}>{seg.label}</Text>
                    <Text style={s.legendPct}>{`${((seg.value / segmentTotal) * 100).toFixed(0)}%`}</Text>
                    <Text style={s.legendAmt}>{formatRupees(seg.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {quote.materialSpecItems?.length > 0 && (
            <View>
              <Text style={s.sectionTitle} minPresenceAhead={40}>Material specification</Text>
              {quote.materialSpecItems.map((m, i) => (
                <View key={i} style={s.specRow} wrap={false}>
                  <Text style={s.specItem}>{m.itemLabel}</Text>
                  <Text style={s.specDetail}>{m.detail || ''}</Text>
                  <Text style={s.specBrand}>{m.brand || ''}</Text>
                </View>
              ))}
            </View>
          )}

          {quote.termItems?.length > 0 && (
            <View>
              <Text style={s.sectionTitle} minPresenceAhead={50}>Terms and conditions</Text>
              {quote.termItems.map((t, i) => (
                <View key={i} style={s.term} wrap={false}>
                  <Text style={s.termNum}>{i + 1}.</Text>
                  <Text style={s.termText}>{t.text}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.signRow} wrap={false}>
            <View style={s.signBox}>
              <View style={s.signLine} />
              <Text style={s.signName}>{business.signatory}</Text>
              <Text style={s.muted}>For {business.name}</Text>
            </View>
            <View style={s.signBox}>
              <View style={s.signLine} />
              <Text style={s.signName}>Accepted by</Text>
              <Text style={s.muted}>Customer signature and date</Text>
            </View>
          </View>

        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {[business.name, business.address, phones, business.gstin ? `GSTIN ${business.gstin}` : null].filter(Boolean).join('   ')}
          </Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
