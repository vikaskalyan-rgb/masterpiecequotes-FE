import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'

// "Wardrobe Framed (7X4)" -> { base: "Wardrobe Framed", length: "7", width: "4" }
export function parseDescription(desc) {
  const m = /^(.*)\s\(([\d.]+)X([\d.]+)\)$/i.exec(desc || '')
  if (m) return { base: m[1], length: m[2], width: m[3] }
  return { base: desc || '', length: '', width: '' }
}

export function buildDescription(base, unit, length, width) {
  if (unit === 'SQFT' && length && width) {
    return `${base} (${length}X${width})`
  }
  return base
}

export function computeQuantity(unit, length, width, currentQuantity) {
  if (unit === 'SQFT') {
    const l = parseFloat(length)
    const w = parseFloat(width)
    if (!isNaN(l) && !isNaN(w)) return +(l * w).toFixed(2)
    return 0
  }
  return parseFloat(currentQuantity) || 0
}

export default function ItemRow({ item, onChange, onRemove }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)

  const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)

  function patch(fields) {
    onChange({ ...item, ...fields })
  }

  function handleBaseChange(value) {
    patch({ base: value })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.suggestItems(value.trim())
        // Strip old dimension suffixes and dedupe - we only want clean base names to suggest.
        const cleaned = [...new Set(results.map((r) => parseDescription(r).base))].filter(
          (b) => b.toLowerCase() !== value.trim().toLowerCase()
        )
        setSuggestions(cleaned.slice(0, 6))
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  function handleUnitChange(unit) {
    const quantity = computeQuantity(unit, item.length, item.width, item.quantity)
    patch({ unit, quantity })
  }

  function handleLengthChange(value) {
    const quantity = computeQuantity(item.unit, value, item.width, item.quantity)
    patch({ length: value, quantity })
  }

  function handleWidthChange(value) {
    const quantity = computeQuantity(item.unit, item.length, value, item.quantity)
    patch({ width: value, quantity })
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="item-row">
      <div className="item-row-top">
        <div className="item-desc-wrap">
          <input
            type="text"
            placeholder="Item description"
            value={item.base}
            onChange={(e) => handleBaseChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="item-input item-desc-input"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="item-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="item-suggestion"
                  onMouseDown={() => {
                    patch({ base: s })
                    setShowSuggestions(false)
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="item-remove" onClick={onRemove} aria-label="Remove item">
          ×
        </button>
      </div>

      {/* Row 2: unit toggle + dimensions (or manual qty for Nos) */}
      <div className="item-row-dims">
        <div className="item-unit-toggle">
          <button
            type="button"
            className={item.unit === 'SQFT' ? 'active' : ''}
            onClick={() => handleUnitChange('SQFT')}
          >
            Sqft
          </button>
          <button
            type="button"
            className={item.unit === 'NOS' ? 'active' : ''}
            onClick={() => handleUnitChange('NOS')}
          >
            Nos
          </button>
        </div>

        {item.unit === 'SQFT' ? (
          <div className="item-dims-inputs">
            <input
              type="number"
              inputMode="decimal"
              placeholder="L"
              value={item.length}
              onChange={(e) => handleLengthChange(e.target.value)}
              className="item-input item-dim-input no-spinner"
            />
            <span className="item-x">×</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="W"
              value={item.width}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="item-input item-dim-input no-spinner"
            />
            <span className="item-dims-label mono">
              = {item.quantity || 0} sqft
            </span>
          </div>
        ) : (
          <input
            type="number"
            inputMode="decimal"
            placeholder="Quantity"
            value={item.quantity}
            onChange={(e) => patch({ quantity: e.target.value })}
            className="item-input item-qty-input no-spinner"
          />
        )}
      </div>

      {/* Row 3: rate - given its own full-width row so the number is always fully legible */}
      <div className="item-row-rate">
        <label className="item-rate-label">Rate per {item.unit === 'SQFT' ? 'sqft' : 'unit'}</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={item.rate}
          onChange={(e) => patch({ rate: e.target.value })}
          className="item-input item-rate-input no-spinner"
        />
      </div>

      <div className="item-row-bottom">
        <span className="item-qty-label mono">
          {item.unit === 'SQFT' ? `${item.quantity || 0} sqft` : `${item.quantity || 0} nos`}
        </span>
        <span className="item-amount mono">
          {amount > 0 ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
        </span>
      </div>

      <style>{`
        .item-row {
          background: var(--bg);
          border: 1px solid var(--rule);
          border-radius: 11px;
          padding: 10px;
          margin-bottom: 8px;
        }
        .item-row-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .item-desc-wrap {
          flex: 1;
          position: relative;
        }
        .item-input {
          width: 100%;
          border: 1px solid var(--rule);
          border-radius: 8px;
          background: var(--paper);
          padding: 9px 10px;
          font-size: 13.5px;
        }
        .item-input:focus {
          outline: none;
          border-color: var(--slate);
        }
        /* Hide native number spinner arrows - they eat horizontal space on narrow rows
           and we don't need increment/decrement for measurements or money. */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
        .item-suggestions {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 10px;
          box-shadow: 0 6px 20px rgba(35, 33, 38, 0.14);
          z-index: 10;
          overflow: hidden;
        }
        .item-suggestion {
          display: block;
          width: 100%;
          text-align: left;
          padding: 9px 12px;
          font-size: 13px;
          background: var(--paper);
          border: none;
          border-bottom: 1px solid var(--rule);
        }
        .item-suggestion:last-child {
          border-bottom: none;
        }
        .item-suggestion:active {
          background: var(--bg);
        }
        .item-remove {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: var(--brick-light);
          color: var(--brick);
          font-size: 18px;
          line-height: 1;
        }

        .item-row-dims {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .item-unit-toggle {
          flex-shrink: 0;
          display: flex;
          border: 1px solid var(--rule);
          border-radius: 8px;
          overflow: hidden;
        }
        .item-unit-toggle button {
          border: none;
          background: var(--paper);
          color: var(--ink-soft);
          font-size: 11.5px;
          font-weight: 600;
          padding: 8px 10px;
        }
        .item-unit-toggle button.active {
          background: var(--slate);
          color: var(--bg);
        }
        .item-dims-inputs {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .item-dim-input {
          width: 48px;
          flex-shrink: 0;
          text-align: center;
        }
        .item-x {
          color: var(--ink-soft);
          font-size: 12px;
          flex-shrink: 0;
        }
        .item-dims-label {
          font-size: 11.5px;
          color: var(--ink-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-qty-input {
          flex: 1;
        }

        .item-row-rate {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
        }
        .item-rate-label {
          flex-shrink: 0;
          font-size: 12px;
          color: var(--ink-soft);
          font-weight: 500;
        }
        .item-rate-input {
          flex: 1;
          font-weight: 600;
        }

        .item-row-bottom {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--rule);
        }
        .item-qty-label {
          font-size: 11.5px;
          color: var(--ink-soft);
        }
        .item-amount {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
        }
      `}</style>
    </div>
  )
}