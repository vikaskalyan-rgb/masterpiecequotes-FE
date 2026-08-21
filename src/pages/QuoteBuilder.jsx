import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import RoomBlock from '../components/RoomBlock'
import { parseDescription, buildDescription } from '../components/ItemRow'
import { formatRupees } from '../utils/format'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function QuoteBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const keyCounter = useRef(0)
  const nextKey = () => `k${keyCounter.current++}`

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [validationError, setValidationError] = useState(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [quoteDate, setQuoteDate] = useState(todayISO())
  const [status, setStatus] = useState('DRAFT')

  const [rooms, setRooms] = useState([])
  const [accessoriesDescription, setAccessoriesDescription] = useState('')
  const [accessoriesAmount, setAccessoriesAmount] = useState('')

  const [materialSpecItems, setMaterialSpecItems] = useState([])
  const [termItems, setTermItems] = useState([])

  const [roundedTotal, setRoundedTotal] = useState('')
  const [roundedTotalTouched, setRoundedTotalTouched] = useState(false)

  // ---- mapping helpers ----
  function emptyItem() {
    return { _key: nextKey(), id: null, base: '', length: '', width: '', unit: 'SQFT', quantity: 0, rate: '' }
  }
  function emptyRoom() {
    return { _key: nextKey(), id: null, name: '', items: [emptyItem()] }
  }
  function emptySpec() {
    return { _key: nextKey(), id: null, itemLabel: '', detail: '', brand: '' }
  }
  function emptyTerm() {
    return { _key: nextKey(), id: null, text: '' }
  }

  function mapItemFromApi(dto) {
    const parsed = parseDescription(dto.description)
    return {
      _key: nextKey(),
      id: dto.id,
      base: parsed.base,
      length: dto.length != null ? String(dto.length) : '',
      width: dto.width != null ? String(dto.width) : '',
      unit: dto.unit,
      quantity: dto.quantity != null ? String(dto.quantity) : '0',
      rate: dto.rate != null ? String(dto.rate) : '',
    }
  }
  function mapRoomFromApi(dto) {
    return { _key: nextKey(), id: dto.id, name: dto.name, items: dto.items.map(mapItemFromApi) }
  }
  function mapSpecFromApi(dto) {
    return { _key: nextKey(), id: dto.id, itemLabel: dto.itemLabel, detail: dto.detail || '', brand: dto.brand || '' }
  }
  function mapTermFromApi(dto) {
    return { _key: nextKey(), id: dto.id, text: dto.text }
  }
  // Defaults come from a different table (DefaultMaterialSpecItem/DefaultTermItem) - their ids
  // must NOT be reused as this quote's own row ids, so always force id: null here.
  function mapSpecFromDefaults(dto) {
    return { _key: nextKey(), id: null, itemLabel: dto.itemLabel, detail: dto.detail || '', brand: dto.brand || '' }
  }
  function mapTermFromDefaults(dto) {
    return { _key: nextKey(), id: null, text: dto.text }
  }

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false

    if (isEdit) {
      api
        .getQuote(id)
        .then((q) => {
          if (cancelled) return
          setCustomerName(q.customerName || '')
          setCustomerPhone(q.customerPhone || '')
          setCustomerAddress(q.customerAddress || '')
          setQuoteDate(q.quoteDate || todayISO())
          setStatus(q.status || 'DRAFT')
          setRooms(q.rooms && q.rooms.length ? q.rooms.map(mapRoomFromApi) : [emptyRoom()])
          setAccessoriesDescription(q.accessoriesDescription || '')
          setAccessoriesAmount(q.accessoriesAmount != null ? String(q.accessoriesAmount) : '')
          setMaterialSpecItems(
            q.materialSpecItems && q.materialSpecItems.length ? q.materialSpecItems.map(mapSpecFromApi) : []
          )
          setTermItems(q.termItems && q.termItems.length ? q.termItems.map(mapTermFromApi) : [])
          setRoundedTotal(q.roundedTotal != null ? String(q.roundedTotal) : '')
          setRoundedTotalTouched(true) // it's a real saved value - never silently overwrite it
          setLoading(false)
        })
        .catch((err) => {
          if (cancelled) return
          setLoadError(err.message || 'Could not load this quote')
          setLoading(false)
        })
    } else {
      setRooms([emptyRoom()])
      api
        .getDefaults()
        .then((d) => {
          if (cancelled) return
          setMaterialSpecItems((d.materialSpecItems || []).map(mapSpecFromDefaults))
          setTermItems((d.termItems || []).map(mapTermFromDefaults))
          setLoading(false)
        })
        .catch(() => {
          // Defaults are a convenience, not critical - proceed with an empty quote if they fail.
          if (!cancelled) setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ---- live totals ----
  const subtotal = useMemo(() => {
    const itemsSum = rooms.reduce(
      (sum, r) =>
        sum + r.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0),
      0
    )
    return itemsSum + (parseFloat(accessoriesAmount) || 0)
  }, [rooms, accessoriesAmount])

  useEffect(() => {
    if (!roundedTotalTouched) {
      const suggested = Math.round(subtotal / 1000) * 1000
      setRoundedTotal(suggested > 0 ? String(suggested) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal])

  // ---- room/item handlers ----
  function addRoom() {
    setRooms([...rooms, emptyRoom()])
  }
  function removeRoom(key) {
    setRooms(rooms.filter((r) => r._key !== key))
  }
  function changeRoom(key, updated) {
    setRooms(rooms.map((r) => (r._key === key ? updated : r)))
  }
  function addItem(roomKey) {
    setRooms(rooms.map((r) => (r._key === roomKey ? { ...r, items: [...r.items, emptyItem()] } : r)))
  }
  function changeItem(roomKey, itemKey, updated) {
    setRooms(
      rooms.map((r) =>
        r._key === roomKey ? { ...r, items: r.items.map((it) => (it._key === itemKey ? updated : it)) } : r
      )
    )
  }
  function removeItem(roomKey, itemKey) {
    setRooms(
      rooms.map((r) => (r._key === roomKey ? { ...r, items: r.items.filter((it) => it._key !== itemKey) } : r))
    )
  }

  // ---- material spec handlers ----
  function addSpec() {
    setMaterialSpecItems([...materialSpecItems, emptySpec()])
  }
  function changeSpec(key, field, value) {
    setMaterialSpecItems(materialSpecItems.map((s) => (s._key === key ? { ...s, [field]: value } : s)))
  }
  function removeSpec(key) {
    setMaterialSpecItems(materialSpecItems.filter((s) => s._key !== key))
  }

  // ---- terms handlers ----
  function addTerm() {
    setTermItems([...termItems, emptyTerm()])
  }
  function changeTerm(key, value) {
    setTermItems(termItems.map((t) => (t._key === key ? { ...t, text: value } : t)))
  }
  function removeTerm(key) {
    setTermItems(termItems.filter((t) => t._key !== key))
  }

  // ---- save ----
  async function handleSave() {
    setValidationError(null)
    setSaveError(null)

    if (!customerName.trim()) {
      setValidationError('Customer name is required.')
      return
    }
    if (!customerPhone.trim()) {
      setValidationError('Customer phone is required.')
      return
    }

    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      quoteDate,
      status,
      roundedTotal: parseFloat(roundedTotal) || 0,
      accessoriesDescription: accessoriesDescription.trim(),
      accessoriesAmount: parseFloat(accessoriesAmount) || 0,
      rooms: rooms
        .filter((r) => r.name.trim() || r.items.some((it) => it.base.trim()))
        .map((r, ri) => ({
          name: r.name.trim(),
          sortOrder: ri,
          items: r.items
            .filter((it) => it.base.trim())
            .map((it, ii) => ({
              description: buildDescription(it.base.trim(), it.unit, it.length, it.width),
              length: it.unit === 'SQFT' && it.length ? parseFloat(it.length) : null,
              width: it.unit === 'SQFT' && it.width ? parseFloat(it.width) : null,
              quantity: parseFloat(it.quantity) || 0,
              unit: it.unit,
              rate: parseFloat(it.rate) || 0,
              amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0),
              sortOrder: ii,
            })),
        })),
      materialSpecItems: materialSpecItems
        .filter((s) => s.itemLabel.trim())
        .map((s, si) => ({ itemLabel: s.itemLabel.trim(), detail: s.detail.trim(), brand: s.brand.trim(), sortOrder: si })),
      termItems: termItems
        .filter((t) => t.text.trim())
        .map((t, ti) => ({ text: t.text.trim(), sortOrder: ti })),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.updateQuote(id, payload)
      } else {
        await api.createQuote(payload)
      }
      navigate('/')
    } catch (err) {
      setSaveError(err.message || 'Could not save the quote')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="qb-loading">
        <div className="qb-spinner" />
        <span>Loading…</span>
        <style>{`
          .qb-loading { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; }
          .qb-spinner { width:24px; height:24px; border:2.5px solid var(--rule); border-top-color:var(--slate); border-radius:50%; animation: qb-spin 0.7s linear infinite; }
          @keyframes qb-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="qb-loading">
        <span>Couldn't load this quote. {loadError}</span>
        <button className="qb-back-link" onClick={() => navigate('/')}>
          Back to Quotes
        </button>
        <style>{`
          .qb-loading { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; padding: 24px; text-align:center; }
          .qb-back-link { border:1px solid var(--ink); background:transparent; padding:10px 20px; border-radius:10px; font-weight:600; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="qb-page">
      <header className="qb-header">
        <button className="qb-header-back" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <h1 className="qb-header-title">{isEdit ? 'Edit Quote' : 'New Quote'}</h1>
      </header>

      <main className="qb-body">
        {/* ---- Customer details ---- */}
        <section className="qb-section">
          <h2 className="qb-section-title">Customer Details</h2>
          <input
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="qb-input"
          />
          <input
            type="tel"
            placeholder="Phone number (with country code, e.g. 91XXXXXXXXXX)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="qb-input"
          />
          <textarea
            placeholder="Address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className="qb-input qb-textarea"
            rows={2}
          />
          <div className="qb-row-2">
            <div>
              <label className="qb-label">Quote date</label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="qb-input"
              />
            </div>
            <div>
              <label className="qb-label">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="qb-input">
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </section>

        {/* ---- Rooms & Items ---- */}
        <section className="qb-section">
          <h2 className="qb-section-title">Rooms &amp; Items</h2>
          {rooms.map((room) => (
            <RoomBlock
              key={room._key}
              room={room}
              onChange={(updated) => changeRoom(room._key, updated)}
              onRemove={() => removeRoom(room._key)}
              onAddItem={() => addItem(room._key)}
              onChangeItem={(itemKey, updated) => changeItem(room._key, itemKey, updated)}
              onRemoveItem={(itemKey) => removeItem(room._key, itemKey)}
            />
          ))}
          <button type="button" className="qb-add-room" onClick={addRoom}>
            + Add Room
          </button>
        </section>

        {/* ---- Accessories ---- */}
        <section className="qb-section">
          <h2 className="qb-section-title">Fittings &amp; Accessories</h2>
          <input
            type="text"
            placeholder="e.g. Cutlery Basket, Oil Pull-Out, Tandem Box"
            value={accessoriesDescription}
            onChange={(e) => setAccessoriesDescription(e.target.value)}
            className="qb-input"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            value={accessoriesAmount}
            onChange={(e) => setAccessoriesAmount(e.target.value)}
            className="qb-input"
          />
        </section>

        {/* ---- Totals ---- */}
        <section className="qb-section qb-totals-section">
          <div className="qb-totals-row">
            <span>Subtotal</span>
            <span className="mono">{formatRupees(subtotal)}</span>
          </div>
          <div className="qb-totals-row qb-totals-final">
            <span>Final Total</span>
            <input
              type="number"
              inputMode="decimal"
              value={roundedTotal}
              onChange={(e) => {
                setRoundedTotalTouched(true)
                setRoundedTotal(e.target.value)
              }}
              className="qb-total-input mono"
            />
          </div>
          <p className="qb-totals-hint">Auto-suggested to the nearest ₹1,000 - edit freely for discounts.</p>
        </section>

        {/* ---- Material Spec ---- */}
        <section className="qb-section">
          <h2 className="qb-section-title">Material Specification</h2>
          {materialSpecItems.map((s) => (
            <div key={s._key} className="qb-spec-row">
              <input
                type="text"
                placeholder="Item (e.g. Plywood)"
                value={s.itemLabel}
                onChange={(e) => changeSpec(s._key, 'itemLabel', e.target.value)}
                className="qb-input qb-spec-label"
              />
              <input
                type="text"
                placeholder="Detail"
                value={s.detail}
                onChange={(e) => changeSpec(s._key, 'detail', e.target.value)}
                className="qb-input qb-spec-detail"
              />
              <input
                type="text"
                placeholder="Brand"
                value={s.brand}
                onChange={(e) => changeSpec(s._key, 'brand', e.target.value)}
                className="qb-input qb-spec-brand"
              />
              <button type="button" className="qb-row-remove" onClick={() => removeSpec(s._key)}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="qb-add-row" onClick={addSpec}>
            + Add row
          </button>
        </section>

        {/* ---- Terms ---- */}
        <section className="qb-section">
          <h2 className="qb-section-title">Terms &amp; Conditions</h2>
          {termItems.map((t, i) => (
            <div key={t._key} className="qb-term-row">
              <span className="qb-term-num mono">{i + 1}</span>
              <input
                type="text"
                placeholder="Term"
                value={t.text}
                onChange={(e) => changeTerm(t._key, e.target.value)}
                className="qb-input qb-term-input"
              />
              <button type="button" className="qb-row-remove" onClick={() => removeTerm(t._key)}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="qb-add-row" onClick={addTerm}>
            + Add term
          </button>
        </section>

        {validationError && <p className="qb-error-text">{validationError}</p>}
        {saveError && <p className="qb-error-text">Couldn't save. {saveError}</p>}
      </main>

      <div className="qb-save-bar">
        <button className="qb-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : `Save Quote · ${formatRupees(roundedTotal || subtotal)}`}
        </button>
      </div>

      <style>{`
        .qb-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          padding-bottom: 100px;
        }
        .qb-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 20px;
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          border-radius: 0 0 22px 22px;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.18);
        }
        .qb-header-back {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: var(--bg);
          font-size: 17px;
        }
        .qb-header-title {
          font-size: 18px;
          font-weight: 500;
          color: var(--bg);
        }
        .qb-body {
          padding: 18px 20px 0;
        }
        .qb-section {
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 15px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 3px 12px rgba(35, 33, 38, 0.06);
        }
        .qb-section-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .qb-input {
          width: 100%;
          border: 1px solid var(--rule);
          border-radius: 10px;
          background: var(--bg);
          padding: 11px 12px;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .qb-input:focus {
          outline: none;
          border-color: var(--slate);
        }
        .qb-input:last-child { margin-bottom: 0; }
        .qb-textarea {
          resize: vertical;
          font-family: inherit;
        }
        .qb-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .qb-label {
          display: block;
          font-size: 11px;
          color: var(--ink-soft);
          margin-bottom: 4px;
          font-weight: 600;
        }
        .qb-add-room {
          width: 100%;
          border: 1.5px dashed var(--slate);
          background: transparent;
          color: var(--slate);
          font-weight: 600;
          font-size: 14px;
          padding: 12px;
          border-radius: 11px;
        }
        .qb-totals-section {
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          border: none;
        }
        .qb-totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: rgba(250,247,241,0.7);
          font-size: 13.5px;
          padding: 4px 0;
        }
        .qb-totals-final {
          margin-top: 6px;
          padding-top: 12px;
          border-top: 1px solid rgba(250,247,241,0.15);
          color: var(--bg);
          font-size: 15px;
          font-weight: 600;
        }
        .qb-total-input {
          width: 140px;
          text-align: right;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 7px 10px;
          color: var(--terracotta);
          font-size: 16px;
          font-weight: 600;
        }
        .qb-total-input:focus {
          outline: none;
          border-color: var(--terracotta);
        }
        .qb-totals-hint {
          font-size: 11px;
          color: rgba(250,247,241,0.5);
          margin-top: 10px;
        }
        .qb-spec-row, .qb-term-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 8px;
        }
        .qb-spec-label { flex: 1.2; margin-bottom: 0; }
        .qb-spec-detail { flex: 1.4; margin-bottom: 0; }
        .qb-spec-brand { flex: 1; margin-bottom: 0; }
        .qb-term-num {
          flex-shrink: 0;
          width: 20px;
          font-size: 12px;
          color: var(--brick);
          text-align: center;
        }
        .qb-term-input { flex: 1; margin-bottom: 0; }
        .qb-row-remove {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: var(--brick-light);
          color: var(--brick);
          font-size: 16px;
        }
        .qb-add-row {
          border: 1.5px dashed var(--rule);
          background: transparent;
          color: var(--ink-soft);
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 8px;
          margin-top: 2px;
        }
        .qb-error-text {
          color: var(--brick);
          font-size: 13px;
          text-align: center;
          padding: 8px 0 16px;
        }
        .qb-save-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, var(--bg) 70%, transparent);
        }
        .qb-save-btn {
          width: 100%;
          background: var(--ink);
          color: var(--bg);
          border: none;
          padding: 15px;
          border-radius: 13px;
          font-size: 15px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.3);
        }
        .qb-save-btn:disabled {
          opacity: 0.6;
        }
        .qb-save-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}