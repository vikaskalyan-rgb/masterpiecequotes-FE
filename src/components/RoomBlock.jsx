import ItemRow from './ItemRow'

function itemAmount(it) {
  return (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0)
}

function itemDisplayLabel(it) {
  if (it.unit === 'SQFT' && it.length && it.width) {
    return `${it.base} (${it.length}X${it.width})`
  }
  return it.base
}

export default function RoomBlock({
  room,
  expanded,
  onToggleExpand,
  onChange,
  onRemove,
  onAddItem,
  onChangeItem,
  onRemoveItem,
}) {
  const filledItems = room.items.filter((it) => it.base.trim())
  const roomTotal = room.items.reduce((sum, it) => sum + itemAmount(it), 0)

  return (
    <div className="room-block">
      <div className="room-block-header">
        <button
          type="button"
          className="room-chevron-btn"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Collapse room' : 'Expand room'}
        >
          <svg
            className={`room-chevron ${expanded ? 'open' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path d="M4 2L10 7L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded ? (
          <input
            type="text"
            placeholder="Room name (e.g. Living Room)"
            value={room.name}
            onChange={(e) => onChange({ ...room, name: e.target.value })}
            className="room-name-input"
            autoFocus={!room.name}
          />
        ) : (
          <button type="button" className="room-name-display" onClick={onToggleExpand}>
            {room.name || 'Untitled Room'}
          </button>
        )}

        <button type="button" className="room-remove" onClick={onRemove} aria-label="Remove room">
          Remove
        </button>
      </div>

      {expanded ? (
        <>
          {room.items.map((item) => (
            <ItemRow
              key={item._key}
              item={item}
              onChange={(updated) => onChangeItem(item._key, updated)}
              onRemove={() => onRemoveItem(item._key)}
            />
          ))}
          <button type="button" className="room-add-item" onClick={onAddItem}>
            + Add item
          </button>
        </>
      ) : (
        <div className="room-summary">
          {filledItems.length === 0 ? (
            <p className="room-summary-empty">No items yet - tap to add</p>
          ) : (
            filledItems.map((it) => (
              <div key={it._key} className="room-summary-row">
                <span className="room-summary-label">{itemDisplayLabel(it)}</span>
                <span className="mono">
                  ₹{itemAmount(it).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {room.items.length > 0 && (
        <div className="room-total">
          <span>Room total</span>
          <span className="mono">
            ₹{roomTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      <style>{`
        .room-block {
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: 0 3px 12px rgba(35, 33, 38, 0.06);
        }
        .room-block-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .room-chevron-btn {
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--ink-soft);
        }
        .room-chevron {
          transition: transform 0.18s ease;
        }
        .room-chevron.open {
          transform: rotate(90deg);
        }
        .room-name-input {
          flex: 1;
          border: none;
          border-bottom: 2px solid var(--rule);
          background: transparent;
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 500;
          padding: 4px 2px 8px;
          min-width: 0;
        }
        .room-name-input:focus {
          outline: none;
          border-bottom-color: var(--slate);
        }
        .room-name-display {
          flex: 1;
          text-align: left;
          border: none;
          background: transparent;
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 500;
          padding: 4px 2px 8px;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .room-remove {
          flex-shrink: 0;
          border: none;
          background: transparent;
          color: var(--brick);
          font-size: 12px;
          font-weight: 600;
          padding: 4px 6px;
        }
        .room-add-item {
          width: 100%;
          border: 1.5px dashed var(--rule);
          background: transparent;
          color: var(--ink-soft);
          font-size: 13px;
          font-weight: 600;
          padding: 10px;
          border-radius: 9px;
          margin-top: 2px;
        }
        .room-summary {
          padding: 6px 4px 4px 34px;
        }
        .room-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 12.5px;
          color: var(--ink-soft);
          padding: 5px 0;
        }
        .room-summary-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .room-summary-row .mono {
          flex-shrink: 0;
          color: var(--ink);
          font-weight: 500;
        }
        .room-summary-empty {
          font-size: 12.5px;
          color: var(--ink-soft);
          font-style: italic;
          padding: 6px 0;
        }
        .room-total {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--rule);
          font-size: 13px;
          color: var(--ink-soft);
        }
        .room-total .mono {
          font-weight: 600;
          color: var(--ink);
        }
      `}</style>
    </div>
  )
}