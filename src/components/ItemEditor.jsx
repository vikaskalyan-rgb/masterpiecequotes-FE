import { useCallback, useState } from 'react'
import { api } from '../api/client'
import { itemAmount, itemQuantity, formatNumber, formatRupees } from '../lib/money'
import { parseDimensions, parseNumber } from '../lib/voice'
import Icon from './Icon'
import SuggestInput from './SuggestInput'
import VoiceButton from './VoiceButton'
import css from './ItemEditor.module.css'

export default function ItemEditor({ item, errors, idPrefix, onChange, onRemove }) {
  const [dimHint, setDimHint] = useState(null)
  const patch = (fields) => onChange({ ...item, ...fields })
  const fetchItems = useCallback((q, signal) => api.suggestItems(q, signal), [])
  const quantity = itemQuantity(item)
  const amount = itemAmount(item)

  // Switching to "Nos" starts the count at 1, instead of silently reusing the area as a count.
  function setUnit(unit) {
    if (unit === item.unit) return
    patch(unit === 'NOS' ? { unit, quantity: item.quantity || '1' } : { unit })
  }

  function voiceDimensions(transcript) {
    const parsed = parseDimensions(transcript)
    if (!parsed) {
      setDimHint('Try saying "7 by 3"')
      setTimeout(() => setDimHint(null), 2500)
      return
    }
    patch({ length: parsed.length, width: parsed.width })
  }

  const err = (k) => errors?.[k]
  const descId = `${idPrefix}-desc`

  return (
    <div className={css.item}>
      <div className={css.top}>
        <label htmlFor={descId} className="visually-hidden">
          Item description
        </label>
        <SuggestInput
          id={descId}
          className={`input ${css.desc}`}
          placeholder="Item, e.g. Wardrobe with loft"
          value={item.description}
          onChange={(description) => patch({ description })}
          fetchSuggestions={fetchItems}
          itemKey={(s) => s.description}
          renderItem={(s) => (
            <span className={css.suggestion}>
              {s.description}
              <span className={css.suggestionUnit}>{s.unit === 'SQFT' ? 'sqft' : 'nos'}</span>
            </span>
          )}
          onPick={(s) => patch({ description: s.description, unit: s.unit, quantity: s.unit === 'NOS' ? item.quantity || '1' : item.quantity })}
          aria-invalid={Boolean(err('description'))}
          data-error-path={`${idPrefix}.description`}
        />
        <VoiceButton label="Say the item" onResult={(t) => patch({ description: t.trim() })} />
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remove item">
          <Icon name="close" size={18} />
        </button>
      </div>
      {err('description') && <p className="field__error">{err('description')}</p>}

      <div className={css.measure}>
        <div className={css.units} role="radiogroup" aria-label="Measured in">
          {[
            ['SQFT', 'Sqft'],
            ['NOS', 'Nos'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={item.unit === value}
              className={`${css.unit} ${item.unit === value ? css.unitOn : ''}`}
              onClick={() => setUnit(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {item.unit === 'SQFT' ? (
          <div className={css.dims}>
            <div className={css.dimInputs}>
              <label className={css.dimBox}>
                <span className="visually-hidden">Length in feet</span>
                <input
                  className={`input ${css.dimInput} num`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="L"
                  value={item.length}
                  onChange={(e) => patch({ length: e.target.value })}
                  aria-invalid={Boolean(err('dimensions'))}
                  data-error-path={`${idPrefix}.dimensions`}
                />
                <span className={css.suffix}>ft</span>
              </label>
              <span className={css.times} aria-hidden="true">×</span>
              <label className={css.dimBox}>
                <span className="visually-hidden">Width in feet</span>
                <input
                  className={`input ${css.dimInput} num`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="W"
                  value={item.width}
                  onChange={(e) => patch({ width: e.target.value })}
                  aria-invalid={Boolean(err('dimensions'))}
                />
                <span className={css.suffix}>ft</span>
              </label>
              <VoiceButton label="Say the size, e.g. 7 by 3" onResult={voiceDimensions} />
            </div>
            {/* Dimension line, as on a drawing: the measured area between end ticks. */}
            <div className={css.dimLine} aria-live="polite">
              <span className={css.tick} aria-hidden="true" />
              <span className={css.rule} aria-hidden="true" />
              <span className={css.dimValue}>{quantity > 0 ? `${formatNumber(quantity)} sqft` : 'area'}</span>
              <span className={css.rule} aria-hidden="true" />
              <span className={css.tick} aria-hidden="true" />
            </div>
            {dimHint && <p className="field__hint">{dimHint}</p>}
          </div>
        ) : (
          <div className={css.dimInputs}>
            <label className={css.dimBox}>
              <span className="visually-hidden">Quantity</span>
              <input
                className={`input ${css.dimInput} num`}
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => patch({ quantity: e.target.value })}
                aria-invalid={Boolean(err('quantity'))}
                data-error-path={`${idPrefix}.quantity`}
              />
              <span className={css.suffix}>nos</span>
            </label>
            <VoiceButton label="Say the quantity" onResult={(t) => {
              const n = parseNumber(t)
              if (n) patch({ quantity: n })
            }} />
          </div>
        )}
      </div>
      {(err('dimensions') || err('quantity')) && <p className="field__error">{err('dimensions') || err('quantity')}</p>}

      <div className={css.rateRow}>
        <label className={css.rateBox}>
          <span className={css.rateLabel}>Rate {item.unit === 'SQFT' ? 'per sqft' : 'each'}</span>
          <span className={css.rateField}>
            <span className={css.prefix}>₹</span>
            <input
              className={`input ${css.rateInput} num`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={item.rate}
              onChange={(e) => patch({ rate: e.target.value })}
              aria-invalid={Boolean(err('rate'))}
              data-error-path={`${idPrefix}.rate`}
            />
          </span>
        </label>
        <VoiceButton label="Say the rate" onResult={(t) => {
          const n = parseNumber(t)
          if (n) patch({ rate: n })
        }} />
        <span className={`${css.amount} num`}>{amount > 0 ? formatRupees(amount) : '₹0'}</span>
      </div>
      {err('rate') && <p className="field__error">{err('rate')}</p>}
    </div>
  )
}
