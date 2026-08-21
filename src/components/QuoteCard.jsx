import { STATUS_META, formatRupees, formatDate } from '../utils/format'

export default function QuoteCard({ quote, onClick }) {
  const status = STATUS_META[quote.status] || STATUS_META.DRAFT

  return (
    <button className="quote-card" onClick={onClick} style={{ '--status-color': status.color }}>
      <div className="quote-card-main">
        <div className="quote-card-top">
          <h3 className="quote-card-name">{quote.customerName}</h3>
          <span className="quote-card-status" style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
        </div>
        {quote.customerAddress && <p className="quote-card-address">{quote.customerAddress}</p>}
        <div className="quote-card-bottom">
          <span className="quote-card-date">{formatDate(quote.quoteDate)}</span>
          <span className="quote-card-total mono">{formatRupees(quote.roundedTotal)}</span>
        </div>
      </div>

      <style>{`
        .quote-card {
          display: flex;
          width: 100%;
          text-align: left;
          background: var(--paper);
          border: 1px solid var(--rule);
          border-left: 4px solid var(--status-color);
          border-radius: 13px;
          padding: 15px 16px;
          margin-bottom: 12px;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(35, 33, 38, 0.07);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .quote-card:active {
          transform: scale(0.98);
          box-shadow: 0 1px 4px rgba(35, 33, 38, 0.08);
        }
        .quote-card-main {
          flex: 1;
          min-width: 0;
        }
        .quote-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .quote-card-name {
          font-size: 17px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .quote-card-status {
          flex-shrink: 0;
          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 100px;
        }
        .quote-card-address {
          font-size: 12.5px;
          color: var(--ink-soft);
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .quote-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px dashed var(--rule);
        }
        .quote-card-date {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .quote-card-total {
          font-size: 15.5px;
          font-weight: 600;
          color: var(--ink);
        }
      `}</style>
    </button>
  )
}