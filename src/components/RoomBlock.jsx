import ItemRow from './ItemRow'

export default function RoomBlock({ room, onChange, onRemove, onAddItem, onChangeItem, onRemoveItem }) {
  const roomTotal = room.items.reduce(
    (sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0),
    0
  )

  return (
    <div className="room-block">
      <div className="room-block-header">
        <input
          type="text"
          placeholder="Room name (e.g. Living Room)"
          value={room.name}
          onChange={(e) => onChange({ ...room, name: e.target.value })}
          className="room-name-input"
        />
        <button type="button" className="room-remove" onClick={onRemove} aria-label="Remove room">
          Remove
        </button>
      </div>

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
          margin-bottom: 10px;
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
        }
        .room-name-input:focus {
          outline: none;
          border-bottom-color: var(--slate);
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