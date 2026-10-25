import { formatNumber, formatRupees, hasDimensions, itemQuantity, roomTotal } from '../lib/money'
import { emptyItem } from '../lib/quoteForm'
import Icon from './Icon'
import ItemEditor from './ItemEditor'
import VoiceButton from './VoiceButton'
import css from './RoomEditor.module.css'

// One room of the quote. The coloured marker is one of the logo's four room colours, so each room
// keeps the same colour here and in the PDF's cost breakdown.
export default function RoomEditor({ room, index, color, expanded, errors, onToggle, onChange, onRemove, onRemoveItem }) {
  const total = roomTotal(room)
  const filled = room.items.filter((it) => it.description.trim())
  const prefix = `rooms.${index}`
  const err = (k) => errors[`${prefix}.${k}`]
  const nameId = `room-${room.key}-name`

  function itemErrors(ii) {
    const p = `${prefix}.items.${ii}.`
    const out = {}
    for (const [k, v] of Object.entries(errors)) if (k.startsWith(p)) out[k.slice(p.length)] = v
    return out
  }
  const hasErrors = Object.keys(errors).some((k) => k.startsWith(`${prefix}.`))

  return (
    <section className={`${css.room} ${hasErrors ? css.roomError : ''}`} style={{ '--room-color': color }}>
      <header className={css.header}>
        {expanded ? (
          <>
            <label htmlFor={nameId} className="visually-hidden">
              Room name
            </label>
            <input
              id={nameId}
              className={`input ${css.nameInput}`}
              placeholder="Room, e.g. Master bedroom"
              value={room.name}
              onChange={(e) => onChange({ ...room, name: e.target.value })}
              aria-invalid={Boolean(err('name'))}
              data-error-path={`${prefix}.name`}
              autoFocus={!room.name}
            />
            <VoiceButton label="Say the room name" onResult={(t) => onChange({ ...room, name: t.trim() })} />
          </>
        ) : (
          <button type="button" className={css.nameButton} onClick={onToggle} aria-expanded="false">
            <span className={css.name}>{room.name || 'Untitled room'}</span>
            <span className={css.count}>
              {filled.length} {filled.length === 1 ? 'item' : 'items'}
            </span>
          </button>
        )}
        <span className={`${css.total} num`}>{formatRupees(total)}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse room' : 'Expand room'}
        >
          <Icon name="chevronDown" className={expanded ? css.chevronOpen : css.chevron} />
        </button>
      </header>
      {err('name') && <p className="field__error">{err('name')}</p>}

      {expanded ? (
        <div className={css.body}>
          {room.items.map((item, ii) => (
            <ItemEditor
              key={item.key}
              item={item}
              idPrefix={`${prefix}.items.${ii}`}
              errors={itemErrors(ii)}
              onChange={(updated) => onChange({ ...room, items: room.items.map((it) => (it.key === item.key ? updated : it)) })}
              onRemove={() => onRemoveItem(item)}
            />
          ))}
          <div className={css.footer}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => onChange({ ...room, items: [...room.items, emptyItem()] })}
            >
              <Icon name="plus" size={18} />
              Add item
            </button>
            <button type="button" className="btn btn--danger" onClick={onRemove}>
              Remove room
            </button>
          </div>
        </div>
      ) : (
        filled.length > 0 && (
          <ul className={css.summary}>
            {filled.map((it) => (
              <li key={it.key}>
                <span className={css.summaryName}>
                  {it.description}
                  {hasDimensions(it) && !it.areaAdjusted ? (
                    <span className={css.summaryDims}>
                      {it.length} × {it.width} ft
                    </span>
                  ) : (
                    <span className={css.summaryDims}>
                      {formatNumber(itemQuantity(it))} {it.unit === 'SQFT' ? 'sqft' : 'nos'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}
