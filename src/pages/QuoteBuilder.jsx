import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Icon from '../components/Icon'
import RoomEditor from '../components/RoomEditor'
import Sheet from '../components/Sheet'
import SuggestInput from '../components/SuggestInput'
import VoiceButton from '../components/VoiceButton'
import { useToast } from '../components/toastContext'
import { addDays, daysBetween, formatRelative } from '../lib/dates'
import { clearDraft, draftKeyFor, draftStatus, loadDraft, saveDraft } from '../lib/drafts'
import { newId } from '../lib/ids'
import { formatRupees, quoteRef, subtotalOf, suggestedTotal } from '../lib/money'
import { formatPhone } from '../lib/phone'
import {
  ROOM_COLORS,
  buildPayload,
  emptyRoom,
  emptySpec,
  emptyTerm,
  fingerprint,
  formForDuplicate,
  formForImport,
  formForNewQuote,
  formFromQuote,
  validateForm,
} from '../lib/quoteForm'
import css from './QuoteBuilder.module.css'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const ROUNDING_LABEL = {
  NEAREST: (step) => `Rounded to the nearest ${formatRupees(step)}`,
  UP: (step) => `Rounded up to the next ${formatRupees(step)}`,
  NONE: () => 'Same as the items total',
}

export default function QuoteBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const duplicateFromId = id ? null : searchParams.get('from')
  // An Excel import opens here to be checked: it lives only as a draft on this phone until saved.
  const importId = id || duplicateFromId ? null : searchParams.get('import')
  const navigate = useNavigate()
  const toast = useToast()
  const draftKey = draftKeyFor({ id, duplicateFromId, importId })

  const [form, setForm] = useState(null)
  const [business, setBusiness] = useState(null)
  const [meta, setMeta] = useState({ baseVersion: null, quoteNumber: null, clientRequestId: newId() })
  const [loadError, setLoadError] = useState(null)
  const [banner, setBanner] = useState(null) // { kind: 'restored'|'draftConflict'|'saveConflict', ... }
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [importInfo, setImportInfo] = useState(null) // { fileName, label, warnings, stats } for an import
  const [confirming, setConfirming] = useState(false)
  const cleanPrint = useRef(null)
  const totalInput = useRef(null)
  const serverForm = useRef(null)

  // ---------- load ----------
  useEffect(() => {
    let cancelled = false
    async function load() {
      const businessP = api.getBusiness()
      if (importId) {
        const [defaults, b] = await Promise.all([api.getDefaults().catch(() => null), businessP])
        if (cancelled) return
        setBusiness(b)
        const blank = formForNewQuote(defaults, b)
        serverForm.current = blank
        cleanPrint.current = fingerprint(blank)
        const draft = loadDraft(draftKey)
        if (!draft || !(draft.form || draft.importPatch)) {
          throw new Error('This imported sheet is no longer on this phone. Import the file again.')
        }
        // First open: what was read from the file becomes an ordinary draft of the form.
        const imported = draft.form || formForImport(draft.importPatch, defaults, b)
        const clientRequestId = draft.clientRequestId || newId()
        const open = draft.form ? (draft.expanded ?? null) : imported.rooms[0]?.key
        if (!draft.form) saveDraft(draftKey, { form: imported, importInfo: draft.importInfo, clientRequestId, expanded: open })
        setForm(imported)
        setImportInfo(draft.importInfo || {})
        setMeta({ baseVersion: null, quoteNumber: null, clientRequestId })
        setExpanded(open)
        return
      }
      let base
      let version = null
      let number = null
      if (id) {
        const [q, b] = await Promise.all([api.getQuote(id), businessP])
        if (cancelled) return
        setBusiness(b)
        base = formFromQuote(q)
        version = q.version
        number = q.quoteNumber
      } else if (duplicateFromId) {
        const [q, b] = await Promise.all([api.getQuote(duplicateFromId), businessP])
        if (cancelled) return
        setBusiness(b)
        base = formForDuplicate(q, b)
      } else {
        const [defaults, b] = await Promise.all([api.getDefaults().catch(() => null), businessP])
        if (cancelled) return
        setBusiness(b)
        base = formForNewQuote(defaults, b)
      }
      serverForm.current = base
      cleanPrint.current = fingerprint(base)

      const draft = loadDraft(draftKey)
      const status = draftStatus(draft, version)
      if (status === 'clean' && draft.form) {
        setForm(draft.form)
        setMeta({ baseVersion: version, quoteNumber: number, clientRequestId: draft.clientRequestId || newId() })
        setBanner({ kind: 'restored', savedAt: draft.savedAt })
        setExpanded(draft.expanded ?? null)
      } else {
        setForm(base)
        setMeta({ baseVersion: version, quoteNumber: number, clientRequestId: newId() })
        setExpanded(id || duplicateFromId ? null : base.rooms[0]?.key)
        if (status === 'conflict' && draft.form) setBanner({ kind: 'draftConflict', draft })
      }
    }
    load().catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [id, duplicateFromId, importId, draftKey])

  // ---------- autosave to this device (only when something actually changed) ----------
  useEffect(() => {
    if (!form || banner?.kind === 'draftConflict') return undefined
    const t = setTimeout(() => {
      if (fingerprint(form) === cleanPrint.current) clearDraft(draftKey)
      else saveDraft(draftKey, { form, baseVersion: meta.baseVersion, clientRequestId: meta.clientRequestId, expanded, importInfo })
    }, 400)
    return () => clearTimeout(t)
  }, [form, meta, expanded, draftKey, banner, importInfo])

  const update = useCallback((patch) => setForm((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) })), [])

  // ---------- totals (live preview; the server recomputes on save) ----------
  const subtotal = useMemo(() => (form ? subtotalOf(form.rooms, form.accessoriesAmount) : 0), [form])
  const suggested = useMemo(
    () => suggestedTotal(subtotal, business?.roundingMode, business?.roundingStep),
    [subtotal, business],
  )
  const finalTotal = form?.totalOverridden ? Number(form.roundedTotal) || 0 : suggested

  const fetchCustomers = useCallback((q, signal) => api.suggestCustomers(q, signal), [])

  if (loadError) {
    return (
      <div className="center-state">
        <p>Couldn't open this quote. {loadError}</p>
        <Link className="btn btn--primary" to="/">
          Back to quotes
        </Link>
      </div>
    )
  }
  if (!form) {
    return (
      <div className="center-state" role="status">
        <div className="spinner" />
        <span className="visually-hidden">Loading</span>
      </div>
    )
  }

  // ---------- rooms ----------
  function setRoom(updated) {
    update((f) => ({ rooms: f.rooms.map((r) => (r.key === updated.key ? updated : r)) }))
  }

  function addRoom() {
    const room = emptyRoom()
    update((f) => ({ rooms: [...f.rooms, room] }))
    setExpanded(room.key)
  }

  function removeRoom(room) {
    const index = form.rooms.findIndex((r) => r.key === room.key)
    update((f) => ({ rooms: f.rooms.filter((r) => r.key !== room.key) }))
    toast.show(`${room.name || 'Room'} removed`, {
      action: {
        label: 'Undo',
        onClick: () =>
          update((f) => {
            const rooms = [...f.rooms]
            rooms.splice(index, 0, room)
            return { rooms }
          }),
      },
    })
  }

  function removeItem(room, item) {
    const index = room.items.findIndex((it) => it.key === item.key)
    update((f) => ({
      rooms: f.rooms.map((r) => (r.key === room.key ? { ...r, items: r.items.filter((it) => it.key !== item.key) } : r)),
    }))
    toast.show(`${item.description || 'Item'} removed`, {
      action: {
        label: 'Undo',
        onClick: () =>
          update((f) => ({
            rooms: f.rooms.map((r) => {
              if (r.key !== room.key) return r
              const items = [...r.items]
              items.splice(index, 0, item)
              return { ...r, items }
            }),
          })),
      },
    })
  }

  // ---------- list editors for spec + terms ----------
  const setListItem = (list, key, patch) => update((f) => ({ [list]: f[list].map((x) => (x.key === key ? { ...x, ...patch } : x)) }))
  const removeListItem = (list, key) => update((f) => ({ [list]: f[list].filter((x) => x.key !== key) }))

  // ---------- dates ----------
  function setQuoteDate(quoteDate) {
    update((f) => ({
      quoteDate,
      validUntil: f.validUntilTouched ? f.validUntil : addDays(quoteDate, business?.validityDays ?? 30),
    }))
  }

  // ---------- draft banners ----------
  function discardRestored() {
    clearDraft(draftKey)
    setForm(serverForm.current)
    setBanner(null)
  }

  function useDraftAnyway() {
    setForm(banner.draft.form)
    setBanner(null)
  }

  function discardImport() {
    clearDraft(draftKey)
    toast.show('Import discarded')
    navigate('/', { replace: true })
  }

  function keepLatest() {
    clearDraft(draftKey)
    setBanner(null)
  }

  // ---------- save ----------
  function showErrors(next, first) {
    setErrors(next)
    if (!first) return
    const roomMatch = /^rooms\.(\d+)\./.exec(first)
    if (roomMatch) setExpanded(form.rooms[Number(roomMatch[1])]?.key)
    setTimeout(() => {
      const el = document.querySelector(`[data-error-path="${first}"]`) || document.querySelector('[aria-invalid="true"]')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus?.({ preventScroll: true })
    }, 50)
  }

  async function save({ overwrite = false } = {}) {
    setSaveError(null)
    const { errors: next, firstError } = validateForm(form)
    showErrors(next, firstError)
    if (firstError) return

    setSaving(true)
    try {
      let version = meta.baseVersion
      if (overwrite && id) version = (await api.getQuote(id)).version
      const payload = buildPayload(form, { version, clientRequestId: id ? null : meta.clientRequestId })
      const saved = id ? await api.updateQuote(id, payload) : await api.createQuote(payload)
      clearDraft(draftKey)
      cleanPrint.current = fingerprint(form)
      toast.show(`${quoteRef(saved.quoteNumber)} saved`)
      navigate(`/quotes/${saved.id}`, { replace: true })
    } catch (err) {
      if (err.isConflict && id) {
        setBanner({ kind: 'saveConflict' })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (err.fields) {
        const mapped = {}
        for (const [k, v] of Object.entries(err.fields)) mapped[k] = v
        showErrors(mapped, Object.keys(mapped)[0])
        setSaveError(err.message)
      } else {
        setSaveError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  // An import is confirmed in a summary before it's saved; a typed quote saves straight away.
  function requestSave() {
    if (!importInfo) return save()
    setSaveError(null)
    const { errors: next, firstError } = validateForm(form)
    showErrors(next, firstError)
    if (!firstError) setConfirming(true)
  }

  async function confirmImport() {
    setConfirming(false)
    await save()
  }

  async function loadLatest() {
    clearDraft(draftKey)
    const q = await api.getQuote(id)
    const base = formFromQuote(q)
    serverForm.current = base
    cleanPrint.current = fingerprint(base)
    setForm(base)
    setMeta((m) => ({ ...m, baseVersion: q.version }))
    setBanner(null)
    toast.show('Loaded the latest version')
  }

  const title = id ? `Edit ${quoteRef(meta.quoteNumber)}` : duplicateFromId ? 'Copy of quote' : importInfo ? 'Check imported quote' : 'New quote'
  const filledRooms = form.rooms.filter((r) => r.items.some((it) => it.description.trim() || it.rate))
  const itemCount = filledRooms.reduce((n, r) => n + r.items.filter((it) => it.description.trim() || it.rate).length, 0)
  const importWarnings = importInfo?.warnings || []
  const diff = Math.round((finalTotal - subtotal) * 100) / 100
  const roundingText = (ROUNDING_LABEL[business?.roundingMode] || ROUNDING_LABEL.NEAREST)(business?.roundingStep ?? 1000)
  const validDays = form.validUntil ? daysBetween(form.quoteDate, form.validUntil) : null
  const fromSheet =
    form.totalOverridden && importInfo?.sheetTotal != null && Number(form.roundedTotal) === Number(importInfo.sheetTotal)
  const totalSource = !form.totalOverridden ? roundingText : fromSheet ? 'Final total from the sheet' : 'Set by you'

  return (
    <div className={`page ${css.page}`}>
      <header className="topbar">
        <Link to={id ? `/quotes/${id}` : '/'} className="icon-btn" aria-label="Back">
          <Icon name="back" />
        </Link>
        <h1 className="topbar__title">{title}</h1>
      </header>

      {banner?.kind === 'restored' && (
        <div className="banner banner--info" role="status">
          <Icon name="history" size={18} />
          <div className="banner__body">
            Brought back your unsaved changes from {formatRelative(banner.savedAt)}.
            <div className="banner__actions">
              <button type="button" className="btn" onClick={() => setBanner(null)}>
                Keep them
              </button>
              <button type="button" className="btn" onClick={discardRestored}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
      {banner?.kind === 'draftConflict' && (
        <div className="banner banner--warning" role="alert">
          <Icon name="alert" size={18} />
          <div className="banner__body">
            You have unsaved changes from {formatRelative(banner.draft.savedAt)}, but this quote was saved on another
            device after that. You're seeing the latest saved version.
            <div className="banner__actions">
              <button type="button" className="btn" onClick={keepLatest}>
                Keep the latest
              </button>
              <button type="button" className="btn" onClick={useDraftAnyway}>
                Use my unsaved changes
              </button>
            </div>
          </div>
        </div>
      )}
      {banner?.kind === 'saveConflict' && (
        <div className="banner banner--warning" role="alert">
          <Icon name="alert" size={18} />
          <div className="banner__body">
            This quote was changed on another device while you were editing. Your changes are not saved yet.
            <div className="banner__actions">
              <button type="button" className="btn" onClick={loadLatest}>
                Load the latest
              </button>
              <button type="button" className="btn" onClick={() => save({ overwrite: true })}>
                Save mine instead
              </button>
            </div>
          </div>
        </div>
      )}
      {importInfo && (
        <section className={css.imported} aria-labelledby="import-heading">
          <div className={css.importedHead}>
            <span className={css.importedIcon} aria-hidden="true">
              <Icon name="file" size={20} />
            </span>
            <div className={css.importedText}>
              <h2 id="import-heading" className={css.importedTitle}>
                {importInfo.fileName || 'Imported from Excel'}
              </h2>
              {importInfo.stats && (
                <p className={css.importedMeta}>
                  Read {plural(importInfo.stats.rooms, 'room')} and {plural(importInfo.stats.items, 'item')}
                  {importInfo.label && importInfo.label !== importInfo.fileName ? ` · ${importInfo.label}` : ''}
                </p>
              )}
            </div>
          </div>
          <p className={css.importedLead}>
            Check the customer, each room's sizes and rates, and the total. Change anything that's wrong, then confirm.
            Nothing is saved until you do.
          </p>
          {importWarnings.length > 0 && (
            <details className={css.checks} open={importWarnings.length <= 6}>
              <summary>
                <Icon name="alert" size={16} />
                {importWarnings.length === 1 ? '1 thing to check' : `${importWarnings.length} things to check`}
                <Icon name="chevronDown" size={16} className={css.checksIcon} />
              </summary>
              <ul>
                {importWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
          <button type="button" className={`btn btn--ghost ${css.discardImport}`} onClick={discardImport}>
            Discard import
          </button>
        </section>
      )}
      {duplicateFromId && (
        <p className={css.note}>Rooms, items and rates are copied. Add the new customer below.</p>
      )}

      {/* ---------- Customer ---------- */}
      <section className="panel" aria-labelledby="customer-heading">
        <h2 id="customer-heading" className="panel__title">
          Customer
        </h2>
        <div className="stack">
          <div className="field">
            <label className="field__label" htmlFor="customerName">
              Name
            </label>
            <div className={css.inline}>
              <SuggestInput
                id="customerName"
                value={form.customerName}
                onChange={(customerName) => update({ customerName })}
                fetchSuggestions={fetchCustomers}
                itemKey={(c) => c.phone}
                renderItem={(c) => (
                  <span className={css.customerOption}>
                    <strong>{c.name}</strong>
                    <span>{formatPhone(c.phone)}</span>
                  </span>
                )}
                onPick={(c) => update({ customerName: c.name, customerPhone: formatPhone(c.phone), customerAddress: c.address || '' })}
                autoCapitalize="words"
                aria-invalid={Boolean(errors.customerName)}
                data-error-path="customerName"
              />
              <VoiceButton label="Say the customer's name" onResult={(t) => update({ customerName: t.trim() })} />
            </div>
            {errors.customerName && <p className="field__error">{errors.customerName}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="customerPhone">
              WhatsApp number
            </label>
            <SuggestInput
              id="customerPhone"
              type="tel"
              inputMode="tel"
              placeholder="10-digit mobile number"
              value={form.customerPhone}
              onChange={(customerPhone) => update({ customerPhone })}
              fetchSuggestions={fetchCustomers}
              minChars={4}
              itemKey={(c) => c.phone}
              renderItem={(c) => (
                <span className={css.customerOption}>
                  <strong>{c.name}</strong>
                  <span>{formatPhone(c.phone)}</span>
                </span>
              )}
              onPick={(c) => update({ customerName: c.name, customerPhone: formatPhone(c.phone), customerAddress: c.address || '' })}
              aria-invalid={Boolean(errors.customerPhone)}
              data-error-path="customerPhone"
            />
            {errors.customerPhone && <p className="field__error">{errors.customerPhone}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="customerAddress">
              Site address
            </label>
            <div className={css.inline}>
              <textarea
                id="customerAddress"
                className="input"
                rows={2}
                value={form.customerAddress}
                onChange={(e) => update({ customerAddress: e.target.value })}
              />
              <VoiceButton label="Say the address" onResult={(t) => update({ customerAddress: t.trim() })} />
            </div>
          </div>

          <div className={css.twoCol}>
            <div className="field">
              <label className="field__label" htmlFor="quoteDate">
                Quote date
              </label>
              <input
                id="quoteDate"
                className="input"
                type="date"
                value={form.quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                aria-invalid={Boolean(errors.quoteDate)}
                data-error-path="quoteDate"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="validUntil">
                Valid until
              </label>
              <input
                id="validUntil"
                className="input"
                type="date"
                min={form.quoteDate}
                value={form.validUntil}
                onChange={(e) => update({ validUntil: e.target.value, validUntilTouched: true })}
                aria-invalid={Boolean(errors.validUntil)}
                aria-describedby="validity-hint"
                data-error-path="validUntil"
              />
              <span id="validity-hint" className="field__hint">
                {errors.validUntil ? '' : validDays != null && validDays >= 0 ? `${validDays} days` : ''}
              </span>
              {errors.validUntil && <p className="field__error">{errors.validUntil}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Rooms ---------- */}
      <section className={css.rooms} aria-labelledby="rooms-heading">
        <div className={css.sectionHead}>
          <h2 id="rooms-heading" className={css.sectionTitle}>
            Rooms
          </h2>
          <span className={`${css.sectionMeta} num`}>{formatRupees(subtotal - (Number(form.accessoriesAmount) || 0))}</span>
        </div>
        {errors.rooms && <p className="field__error">{errors.rooms}</p>}
        {form.rooms.map((room, index) => (
          <RoomEditor
            key={room.key}
            room={room}
            index={index}
            color={ROOM_COLORS[index % ROOM_COLORS.length]}
            expanded={expanded === room.key}
            errors={errors}
            onToggle={() => setExpanded((k) => (k === room.key ? null : room.key))}
            onChange={setRoom}
            onRemove={() => removeRoom(room)}
            onRemoveItem={(item) => removeItem(room, item)}
          />
        ))}
        <button type="button" className={`btn btn--secondary btn--block ${css.addRoom}`} onClick={addRoom}>
          <Icon name="plus" size={18} />
          Add room
        </button>
      </section>

      {/* ---------- Fittings ---------- */}
      <section className="panel" aria-labelledby="fittings-heading">
        <h2 id="fittings-heading" className="panel__title">
          Fittings and accessories
        </h2>
        <div className="stack">
          <div className={css.inline}>
            <label htmlFor="accessoriesDescription" className="visually-hidden">
              Fittings description
            </label>
            <input
              id="accessoriesDescription"
              className="input"
              placeholder="e.g. Cutlery basket, tandem boxes, oil pull-out"
              value={form.accessoriesDescription}
              onChange={(e) => update({ accessoriesDescription: e.target.value })}
            />
            <VoiceButton label="Say the fittings" onResult={(t) => update({ accessoriesDescription: t.trim() })} />
          </div>
          <div className={css.moneyField}>
            <label htmlFor="accessoriesAmount" className="field__label">
              Amount
            </label>
            <span className={css.prefixed}>
              <span>₹</span>
              <input
                id="accessoriesAmount"
                className="input num"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={form.accessoriesAmount}
                onChange={(e) => update({ accessoriesAmount: e.target.value })}
                aria-invalid={Boolean(errors.accessoriesAmount)}
                data-error-path="accessoriesAmount"
              />
            </span>
            {errors.accessoriesAmount && <p className="field__error">{errors.accessoriesAmount}</p>}
          </div>
        </div>
      </section>

      {/* ---------- Total ---------- */}
      <section className={`panel ${css.totalPanel}`} aria-labelledby="total-heading">
        <h2 id="total-heading" className="panel__title">
          Total
        </h2>
        <dl className={css.totals}>
          <div>
            <dt>Items and fittings</dt>
            <dd className="num">{formatRupees(subtotal, { paise: 'auto' })}</dd>
          </div>
          <div className={css.finalRow}>
            <dt>Final total</dt>
            <dd className="num">
              {form.totalOverridden ? (
                <span className={css.prefixed}>
                  <span>₹</span>
                  <input
                    className={`input num ${css.totalInput}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    aria-label="Final total"
                    value={form.roundedTotal}
                    onChange={(e) => update({ roundedTotal: e.target.value })}
                    aria-invalid={Boolean(errors.roundedTotal)}
                    data-error-path="roundedTotal"
                    ref={totalInput}
                  />
                </span>
              ) : (
                formatRupees(suggested)
              )}
            </dd>
          </div>
        </dl>
        <p className={css.totalNote}>
          {totalSource}
          {diff !== 0 && (
            <span className={diff < 0 ? css.below : css.above}>
              {diff < 0 ? `${formatRupees(-diff)} less than the items` : `${formatRupees(diff)} more than the items`}
            </span>
          )}
        </p>
        {errors.roundedTotal && <p className="field__error">{errors.roundedTotal}</p>}
        <div className={css.totalActions}>
          {form.totalOverridden ? (
            <button type="button" className="btn btn--ghost" onClick={() => update({ totalOverridden: false, roundedTotal: '' })}>
              Use {formatRupees(suggested)} instead
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                update({ totalOverridden: true, roundedTotal: String(suggested) })
                // Focus only when asked for: a quote opened with a typed total must not jump to it.
                setTimeout(() => totalInput.current?.focus(), 0)
              }}
            >
              Set a different total
            </button>
          )}
        </div>
      </section>

      {/* ---------- Material spec ---------- */}
      <details className={`panel ${css.details}`}>
        <summary>
          <span className={css.summaryTitle}>Material specification</span>
          <span className={css.summaryMeta}>{form.materialSpecItems.length} rows</span>
          <Icon name="chevronDown" size={18} className={css.summaryIcon} />
        </summary>
        <div className={css.rows}>
          {form.materialSpecItems.map((s) => (
            <div key={s.key} className={css.specRow}>
              <input className="input" aria-label="Item" placeholder="Item, e.g. Plywood" value={s.itemLabel}
                onChange={(e) => setListItem('materialSpecItems', s.key, { itemLabel: e.target.value })} />
              <input className="input" aria-label="Specification" placeholder="Specification" value={s.detail}
                onChange={(e) => setListItem('materialSpecItems', s.key, { detail: e.target.value })} />
              <input className="input" aria-label="Brand" placeholder="Brand" value={s.brand}
                onChange={(e) => setListItem('materialSpecItems', s.key, { brand: e.target.value })} />
              <button type="button" className="icon-btn" aria-label={`Remove ${s.itemLabel || 'row'}`}
                onClick={() => removeListItem('materialSpecItems', s.key)}>
                <Icon name="close" size={18} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn--ghost" onClick={() => update((f) => ({ materialSpecItems: [...f.materialSpecItems, emptySpec()] }))}>
            <Icon name="plus" size={18} />
            Add row
          </button>
        </div>
      </details>

      {/* ---------- Terms ---------- */}
      <details className={`panel ${css.details}`}>
        <summary>
          <span className={css.summaryTitle}>Terms and conditions</span>
          <span className={css.summaryMeta}>{form.termItems.length} terms</span>
          <Icon name="chevronDown" size={18} className={css.summaryIcon} />
        </summary>
        <ol className={css.terms}>
          {form.termItems.map((t, i) => (
            <li key={t.key} className={css.termRow}>
              <span className={`${css.termNum} num`} aria-hidden="true">{i + 1}</span>
              <textarea className="input" rows={2} aria-label={`Term ${i + 1}`} value={t.text}
                onChange={(e) => setListItem('termItems', t.key, { text: e.target.value })} />
              <button type="button" className="icon-btn" aria-label={`Remove term ${i + 1}`} onClick={() => removeListItem('termItems', t.key)}>
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--ghost" onClick={() => update((f) => ({ termItems: [...f.termItems, emptyTerm()] }))}>
          <Icon name="plus" size={18} />
          Add term
        </button>
      </details>

      {saveError && (
        <div className="banner banner--danger" role="alert" style={{ marginTop: 'var(--space-4)' }}>
          <Icon name="alert" size={18} />
          <div className="banner__body">{saveError}</div>
        </div>
      )}

      {/* ---------- Sticky save bar ---------- */}
      <div className={css.bar}>
        <div className={css.barInner}>
          <div className={css.barTotal}>
            <span className={css.barLabel}>Final total</span>
            <span className={`${css.barValue} num`}>{formatRupees(finalTotal)}</span>
          </div>
          <button type="button" className="btn btn--primary" onClick={requestSave} disabled={saving}>
            {saving ? 'Saving…' : importInfo ? 'Confirm and save' : 'Save quote'}
          </button>
        </div>
      </div>

      <Sheet open={confirming} title="Save this quote?" onClose={() => setConfirming(false)} labelledBy="confirm-title">
        <p className={css.confirmLead}>Make sure it matches the sheet. You can still edit it after saving.</p>
        <dl className={css.confirmList}>
          <div>
            <dt>Customer</dt>
            <dd>
              {form.customerName.trim()}
              <span>{formatPhone(form.customerPhone)}</span>
            </dd>
          </div>
          <div>
            <dt>Rooms</dt>
            <dd>
              {plural(filledRooms.length, 'room')}, {plural(itemCount, 'item')}
              <span>{filledRooms.map((r) => r.name.trim()).filter(Boolean).join(', ')}</span>
            </dd>
          </div>
          <div>
            <dt>Items and fittings</dt>
            <dd className="num">{formatRupees(subtotal, { paise: 'auto' })}</dd>
          </div>
          <div className={css.confirmTotal}>
            <dt>Final total</dt>
            <dd className="num">
              {formatRupees(finalTotal)}
              <span>{totalSource}</span>
            </dd>
          </div>
        </dl>
        <div className={css.confirmActions}>
          <button type="button" className="btn btn--secondary" onClick={() => setConfirming(false)}>
            Keep checking
          </button>
          <button type="button" className="btn btn--primary" onClick={confirmImport}>
            Save quote
          </button>
        </div>
      </Sheet>
    </div>
  )
}
