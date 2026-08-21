import { formatRupees, formatDate } from '../utils/format'

export default function QuoteCard({ quote, onClick, onDelete }) {
  return (
    <button className="quote-card" onClick={onClick}>
      <div className="quote-card-main">
        <div className="quote-card-top">
          <h3 className="quote-card-name">{quote.customerName}</h3>
          <button
            type="button"
            className="quote-card-delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(quote)
            }}
            aria-label="Delete quote"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 4.5H13M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M6 7.5v4M10 7.5v4M4 4.5l.6 8.1a1 1 0 001 .9h4.8a1 1 0 001-.9l.6-8.1"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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
          border-left: 4px solid var(--slate);
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
        .quote-card-delete {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--ink-soft);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .quote-card-delete:active {
          background: var(--brick-light);
          color: var(--brick);
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