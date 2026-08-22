import { formatRupees, formatDate } from '../utils/format'

const BREAKDOWN_COLORS = ['#BE504F', '#596073', '#DA9F7F', '#232126', '#AEB4C0', '#F1DAD3']

export default function QuotePdfTemplate({ quote }) {
  const roomTotals = quote.rooms.map((r) => ({
    name: r.name,
    total: r.items.reduce((s, it) => s + Number(it.amount || 0), 0),
  }))
  const itemsSum = roomTotals.reduce((s, r) => s + r.total, 0)
  const accessoriesAmount = Number(quote.accessoriesAmount || 0)
  const breakdownTotal = itemsSum + accessoriesAmount || 1

  const breakdownSegments = [
    ...roomTotals.map((r) => ({ label: r.name, value: r.total })),
    ...(accessoriesAmount > 0 ? [{ label: 'Fittings', value: accessoriesAmount }] : []),
  ].filter((s) => s.value > 0)

  // Donut chart geometry - each segment drawn as a stroke-dasharray slice of a circle,
  // rotated -90deg so the first slice starts at 12 o'clock like a normal chart.
  const donutRadius = 72
  const donutStrokeWidth = 30
  const donutCircumference = 2 * Math.PI * donutRadius
  let cumulativeLength = 0
  const donutSegments = breakdownSegments.map((seg, i) => {
    const pct = (seg.value / breakdownTotal) * 100
    const length = (pct / 100) * donutCircumference
    const dashArray = `${length.toFixed(2)} ${(donutCircumference - length).toFixed(2)}`
    const dashOffset = -cumulativeLength
    cumulativeLength += length
    return { ...seg, pct, color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length], dashArray, dashOffset }
  })

  return (
    <div className="pdf-page">
      <div className="pdf-letterhead">
        <div className="pdf-brand-group">
          <img src="/logo-mark.png" alt="" className="pdf-logo" />
          <div>
            <p className="pdf-brand-name">Masterpiece Interiors</p>
            <p className="pdf-brand-tagline">Inspired Interiors, Perfected</p>
          </div>
        </div>
        <div className="pdf-letterhead-right">
          <div className="pdf-quote-date mono">{formatDate(quote.quoteDate)}</div>
          16/10, Gopalakrishnan Street, Guindy,
          <br />
          Chennai – 600032
          <br />
          +91 99944 45388
        </div>
      </div>

      <div className="pdf-client-block">
        <div>
          <div className="pdf-client-label">Quotation Prepared For</div>
          <p className="pdf-client-name">{quote.customerName}</p>
          {quote.customerAddress && <p className="pdf-client-address">{quote.customerAddress}</p>}
        </div>
        <div className="pdf-total-chip">
          <div className="pdf-total-label">Total Investment</div>
          <div className="pdf-total-value mono">{formatRupees(quote.roundedTotal)}</div>
        </div>
      </div>

      {quote.rooms.map((room) => {
        const filledItems = room.items.filter((it) => it.description)
        if (filledItems.length === 0) return null
        return (
          <div className="pdf-room" data-pdf-block="true" key={room.id ?? room.name}>
            <div className="pdf-room-title">
              <h3>{room.name}</h3>
              <div className="pdf-room-line" />
            </div>
            <table className="pdf-items">
              <thead>
                <tr>
                  <th style={{ width: '44%' }}>Description</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filledItems.map((it) => (
                  <tr key={it.id ?? it.description}>
                    <td className="desc">{it.description}</td>
                    <td className="num mono">
                      {it.quantity} {it.unit === 'SQFT' ? 'sqft' : 'nos'}
                    </td>
                    <td className="num mono">{Number(it.rate).toLocaleString('en-IN')}</td>
                    <td className="num mono amount">{Number(it.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {accessoriesAmount > 0 && (
        <div className="pdf-accessories-row" data-pdf-block="true">
          <span>{quote.accessoriesDescription || 'Fittings & Accessories'}</span>
          <span className="mono">{accessoriesAmount.toLocaleString('en-IN')}</span>
        </div>
      )}

      <div className="pdf-totals" data-pdf-block="true">
        <div className="pdf-totals-row">
          <span>Subtotal</span>
          <span className="mono">{formatRupees(quote.subtotal)}</span>
        </div>
        <div className="pdf-totals-row pdf-totals-final">
          <span>Total (Rounded Off)</span>
          <span className="mono">{formatRupees(quote.roundedTotal)}</span>
        </div>
      </div>

      {breakdownSegments.length > 1 && (
        <div className="pdf-breakdown" data-pdf-block="true">
          <div className="pdf-breakdown-heading">
            <div className="pdf-breakdown-label">Where Your Investment Goes</div>
            <div className="pdf-breakdown-line" />
          </div>

          <div className="pdf-breakdown-main">
            <div className="pdf-donut-wrap">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r={donutRadius} fill="none" stroke="#F1EDE3" strokeWidth={donutStrokeWidth} />
                <g transform="rotate(-90 90 90)">
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="90"
                      cy="90"
                      r={donutRadius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={donutStrokeWidth}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                    />
                  ))}
                </g>
              </svg>
              <div className="pdf-donut-center">
                <div className="pdf-donut-center-label">Total</div>
                <div className="pdf-donut-center-value mono">{formatRupees(quote.roundedTotal)}</div>
              </div>
            </div>

            <div className="pdf-stat-grid">
              {donutSegments.map((seg) => (
                <div className="pdf-stat-card" key={seg.label}>
                  <div className="pdf-stat-top">
                    <span className="pdf-stat-swatch" style={{ background: seg.color }} />
                    <span className="pdf-stat-label">{seg.label}</span>
                  </div>
                  <div className="pdf-stat-pct mono">{seg.pct.toFixed(1)}%</div>
                  <div className="pdf-stat-amount mono">₹{seg.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {quote.materialSpecItems && quote.materialSpecItems.length > 0 && (
        <div data-pdf-block="true">
          <div className="pdf-section-heading">Material Specification</div>
          <table className="pdf-spec">
            <tbody>
              {quote.materialSpecItems.map((s) => (
                <tr key={s.id ?? s.itemLabel}>
                  <td className="pdf-spec-item">{s.itemLabel}</td>
                  <td className="pdf-spec-detail">{s.detail}</td>
                  <td className="pdf-spec-brand">{s.brand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {quote.termItems && quote.termItems.length > 0 && (
        <div data-pdf-block="true">
          <div className="pdf-section-heading">Terms &amp; Conditions</div>
          <ul className="pdf-terms">
            {quote.termItems.map((t, i) => (
              <li key={t.id ?? i}>{t.text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pdf-footer">
        <div className="pdf-signoff">
          Thank you for considering Masterpiece Interiors.
          <strong>N. Kalyan</strong>
        </div>
        <div className="pdf-footer-contact">
          <span className="pdf-brass-text">Masterpiece Interiors</span>
          <br />
          16/10, Gopalakrishnan Street, Guindy, Chennai – 600032
          <br />
          +91 99944 45388 · +91 73044 20600
        </div>
      </div>

      <style>{`
        .pdf-page {
          width: 780px;
          background: var(--paper);
          padding: 56px 56px 48px;
          color: var(--ink);
          font-family: var(--font-body);
        }
        .pdf-letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--rule);
        }
        .pdf-brand-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .pdf-logo {
          height: 82px;
          width: 82px;
          object-fit: contain;
        }
        .pdf-brand-name {
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 24px;
          color: var(--ink);
        }
        .pdf-brand-tagline {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brick);
          font-weight: 600;
          margin-top: 3px;
        }
        .pdf-letterhead-right {
          text-align: right;
          font-size: 12px;
          color: var(--ink-soft);
          line-height: 1.6;
        }
        .pdf-quote-date {
          color: var(--ink);
          font-size: 12px;
          margin-bottom: 6px;
        }
        .pdf-client-block {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 32px;
          margin-bottom: 36px;
        }
        .pdf-client-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brick);
          font-weight: 600;
          margin-bottom: 6px;
        }
        .pdf-client-name {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 500;
        }
        .pdf-client-address {
          font-size: 13px;
          color: var(--ink-soft);
          margin-top: 4px;
        }
        .pdf-total-chip {
          text-align: right;
        }
        .pdf-total-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 4px;
        }
        .pdf-total-value {
          font-size: 26px;
          font-weight: 600;
          color: var(--slate);
        }
        .pdf-room {
          margin-bottom: 26px;
        }
        .pdf-room-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .pdf-room-title h3 {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
        }
        .pdf-room-line {
          flex: 1;
          height: 1px;
          background: var(--rule);
        }
        table.pdf-items {
          width: 100%;
          border-collapse: collapse;
        }
        table.pdf-items th {
          text-align: left;
          font-size: 9.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          padding: 0 4px 6px;
          border-bottom: 1px solid var(--rule);
        }
        table.pdf-items th.num, table.pdf-items td.num { text-align: right; }
        table.pdf-items td {
          padding: 7px 4px;
          font-size: 13px;
          border-bottom: 1px solid #f1ede3;
        }
        table.pdf-items td.desc { color: var(--ink); }
        table.pdf-items td.num { font-size: 12.5px; }
        table.pdf-items td.amount { font-weight: 500; }
        .pdf-accessories-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 4px;
          font-size: 13px;
          border-top: 1px solid var(--rule);
          margin-top: 6px;
        }
        .pdf-totals {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 2px solid var(--ink);
        }
        .pdf-totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 4px;
          color: var(--ink-soft);
        }
        .pdf-totals-row.pdf-totals-final {
          color: var(--ink);
          font-weight: 600;
          font-size: 15px;
          margin-top: 6px;
        }
        .pdf-totals-row.pdf-totals-final .mono {
          color: var(--slate);
          font-size: 18px;
          font-weight: 600;
        }
        .pdf-breakdown {
          margin-top: 36px;
          padding: 32px 34px;
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 4px;
        }
        .pdf-breakdown-heading {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
        }
        .pdf-breakdown-label {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
        }
        .pdf-breakdown-line {
          flex: 1;
          height: 1px;
          background: var(--rule);
        }
        .pdf-breakdown-main {
          display: flex;
          align-items: center;
          gap: 36px;
        }
        .pdf-donut-wrap {
          position: relative;
          width: 180px;
          height: 180px;
          flex-shrink: 0;
        }
        .pdf-donut-center {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .pdf-donut-center-label {
          font-size: 9.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 5px;
        }
        .pdf-donut-center-value {
          font-size: 17px;
          font-weight: 600;
          color: var(--ink);
        }
        .pdf-stat-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px 18px;
        }
        .pdf-stat-card {
          border-left: 3px solid var(--rule);
          padding: 2px 0 2px 12px;
        }
        .pdf-stat-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 5px;
        }
        .pdf-stat-swatch {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pdf-stat-label {
          font-size: 11px;
          color: var(--ink-soft);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pdf-stat-pct {
          font-size: 19px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.2;
        }
        .pdf-stat-amount {
          font-size: 10.5px;
          color: var(--ink-soft);
          margin-top: 2px;
        }
        .pdf-section-heading {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          margin: 40px 0 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--rule);
        }
        table.pdf-spec {
          width: 100%;
          border-collapse: collapse;
        }
        table.pdf-spec td {
          font-size: 12.5px;
          padding: 7px 4px;
          border-bottom: 1px solid #f1ede3;
          vertical-align: top;
        }
        td.pdf-spec-item { color: var(--ink); font-weight: 500; width: 32%; }
        td.pdf-spec-detail { color: var(--ink-soft); }
        td.pdf-spec-brand { color: var(--brick); font-weight: 500; text-align: right; }
        .pdf-terms {
          list-style: none;
          counter-reset: term;
        }
        .pdf-terms li {
          counter-increment: term;
          font-size: 12px;
          color: var(--ink-soft);
          padding: 6px 0 6px 24px;
          position: relative;
          line-height: 1.5;
        }
        .pdf-terms li::before {
          content: counter(term);
          position: absolute;
          left: 0;
          top: 6px;
          font-size: 10px;
          color: var(--brick);
        }
        .pdf-footer {
          margin-top: 44px;
          padding-top: 24px;
          border-top: 1px solid var(--rule);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .pdf-signoff {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 14px;
          color: var(--ink-soft);
        }
        .pdf-signoff strong {
          display: block;
          font-family: var(--font-display);
          font-style: normal;
          font-weight: 600;
          font-size: 15px;
          color: var(--ink);
          margin-top: 4px;
        }
        .pdf-footer-contact {
          text-align: right;
          font-size: 11px;
          color: var(--ink-soft);
          line-height: 1.7;
        }
        .pdf-brass-text { color: var(--brick); font-weight: 600; }
      `}</style>
    </div>
  )
}