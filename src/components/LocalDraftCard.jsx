import { formatRelativeTime } from '../utils/format'

// Represents an unsaved quote sitting only in localStorage - either a brand new quote or a
// "Duplicate Quote" in progress that was never saved to the server. Visually distinct (dashed
// border, terracotta accent) from real QuoteCards so it never reads as an actual saved quote.
export default function LocalDraftCard({ draft, onClick, onDiscard }) {
  const name = draft.data.customerName?.trim() || 'Untitled quote'

  return (
    <button className="local-draft-card" onClick={onClick}>
      <div className="ldc-main">
        <div className="ldc-top">
          <div className="ldc-name-wrap">
            <span className="ldc-badge">Draft</span>
            <h3 className="ldc-name">{name}</h3>
          </div>
          <button
            type="button"
            className="ldc-discard-btn"
            onClick={(e) => {
              e.stopPropagation()
              onDiscard(draft)
            }}
            aria-label="Discard draft"
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
        <p className="ldc-sub">Not saved yet · last edited {formatRelativeTime(draft.data.savedAt)}</p>
      </div>

      <style>{`
        .local-draft-card {
          display: flex;
          width: 100%;
          text-align: left;
          background: var(--brick-light);
          border: 1.5px dashed var(--brick);
          border-radius: 13px;
          padding: 15px 16px;
          margin-bottom: 12px;
          cursor: pointer;
        }
        .local-draft-card:active {
          transform: scale(0.98);
        }
        .ldc-main {
          flex: 1;
          min-width: 0;
        }
        .ldc-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .ldc-name-wrap {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }
        .ldc-name {
          font-size: 17px;
          font-weight: 500;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .ldc-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--paper);
          background: var(--brick);
          border-radius: 6px;
          padding: 3px 7px;
        }
        .ldc-discard-btn {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.5);
          color: var(--brick);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ldc-discard-btn:active {
          background: var(--paper);
        }
        .ldc-sub {
          font-size: 12px;
          color: var(--brick);
          margin-top: 6px;
        }
      `}</style>
    </button>
  )
}