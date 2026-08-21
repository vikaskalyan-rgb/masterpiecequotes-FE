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

  return (
    <div className="pdf-page">
      <div className="pdf-letterhead">
        <div className="pdf-brand-group">
          <img src="/icon-512.png" alt="" className="pdf-logo" />
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
          <div className="pdf-room" key={room.id ?? room.name}>
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
        <div className="pdf-accessories-row">
          <span>{quote.accessoriesDescription || 'Fittings & Accessories'}</span>
          <span className="mono">{accessoriesAmount.toLocaleString('en-IN')}</span>
        </div>
      )}

      <div className="pdf-totals">
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
        <div className="pdf-breakdown">
          <div className="pdf-breakdown-label">Where Your Investment Goes</div>
          <div className="pdf-bar">
            {breakdownSegments.map((seg, i) => (
              <div
                key={seg.label}
                style={{
                  width: `${((seg.value / breakdownTotal) * 100).toFixed(1)}%`,
                  background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
                }}
              />
            ))}
          </div>
          <div className="pdf-legend">
            {breakdownSegments.map((seg, i) => (
              <div className="pdf-legend-item" key={seg.label}>
                <span
                  className="pdf-legend-swatch"
                  style={{ background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }}
                />
                {seg.label}{' '}
                <span className="pdf-legend-pct mono">
                  {((seg.value / breakdownTotal) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {quote.materialSpecItems && quote.materialSpecItems.length > 0 && (
        <>
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
        </>
      )}

      {quote.termItems && quote.termItems.length > 0 && (
        <>
          <div className="pdf-section-heading">Terms &amp; Conditions</div>
          <ul className="pdf-terms">
            {quote.termItems.map((t, i) => (
              <li key={t.id ?? i}>{t.text}</li>
            ))}
          </ul>
        </>
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
          height: 62px;
          width: 62px;
          border-radius: 10px;
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
          margin-top: 32px;
          padding: 20px 22px;
          background: var(--bg);
          border: 1px solid var(--rule);
        }
        .pdf-breakdown-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          margin-bottom: 12px;
        }
        .pdf-bar {
          display: flex;
          width: 100%;
          height: 10px;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .pdf-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
        }
        .pdf-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--ink-soft);
        }
        .pdf-legend-swatch {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pdf-legend-pct {
          color: var(--ink);
          font-weight: 500;
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