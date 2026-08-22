import { formatRupees, formatDate } from '../utils/format'

export default function QuoteCard({ quote, onClick, onDuplicate, onEdit, onDelete }) {
  return (
    <button className="quote-card" onClick={onClick}>
      <div className="quote-card-main">
        <div className="quote-card-top">
          <h3 className="quote-card-name">{quote.customerName}</h3>
          <div className="quote-card-icon-row">
            <button
              type="button"
              className="quote-card-icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate(quote)
              }}
              aria-label="Duplicate quote"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M10.5 5.5V3.8a1.3 1.3 0 00-1.3-1.3H3.8a1.3 1.3 0 00-1.3 1.3v5.4a1.3 1.3 0 001.3 1.3h1.7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
            </button>
            <button
              type="button"
              className="quote-card-icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(quote)
              }}
              aria-label="Edit quote"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.3 2.3a1.5 1.5 0 012.1 2.1L5.5 12.3l-2.8.7.7-2.8 7.9-7.9z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="quote-card-icon-btn quote-card-icon-btn-danger"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(quote)
              }}
              aria-label="Delete quote"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
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
          min-width: 0;
          flex-shrink: 1;
        }
        .quote-card-icon-row {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .quote-card-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: var(--bg);
          color: var(--ink-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .quote-card-icon-btn:active {
          background: var(--rule);
        }
        .quote-card-icon-btn-danger:active {
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