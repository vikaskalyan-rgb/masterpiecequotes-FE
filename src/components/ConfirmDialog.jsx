export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="cd-overlay" onClick={onCancel}>
      <div className="cd-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="cd-title">{title}</h3>
        <p className="cd-message">{message}</p>
        <div className="cd-actions">
          <button className="cd-btn cd-btn-cancel" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="cd-btn cd-btn-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        .cd-overlay {
          position: fixed;
          inset: 0;
          background: rgba(35, 33, 38, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 100;
          padding: 0;
        }
        .cd-card {
          width: 100%;
          max-width: 480px;
          background: var(--paper);
          border-radius: 20px 20px 0 0;
          padding: 24px 20px calc(20px + env(safe-area-inset-bottom));
          box-shadow: 0 -8px 30px rgba(35, 33, 38, 0.25);
        }
        .cd-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .cd-message {
          font-size: 14px;
          color: var(--ink-soft);
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .cd-actions {
          display: flex;
          gap: 10px;
        }
        .cd-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 600;
          border: none;
        }
        .cd-btn:disabled {
          opacity: 0.6;
        }
        .cd-btn-cancel {
          background: var(--bg);
          color: var(--ink);
          border: 1px solid var(--rule);
        }
        .cd-btn-confirm {
          background: var(--brick);
          color: var(--paper);
        }

        @media (min-width: 480px) {
          .cd-overlay {
            align-items: center;
          }
          .cd-card {
            border-radius: 16px;
          }
        }
      `}</style>
    </div>
  )
}
