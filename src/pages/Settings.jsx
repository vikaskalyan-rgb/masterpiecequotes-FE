import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Icon from '../components/Icon'
import Sheet from '../components/Sheet'
import { useToast } from '../components/toastContext'
import { signOut } from '../lib/auth'
import { formatDate, todayIso } from '../lib/dates'
import { emptySpec, emptyTerm } from '../lib/quoteForm'
import { newId } from '../lib/ids'
import { formatRupees, quoteRef } from '../lib/money'
import { downloadBlob } from '../lib/share'
import css from './Settings.module.css'

const STEPS = [1, 10, 100, 500, 1000]
const MODES = [
  { value: 'NEAREST', label: 'Nearest', hint: 'Can round down a little' },
  { value: 'UP', label: 'Always up', hint: 'Never below the items' },
  { value: 'NONE', label: 'No rounding', hint: 'Exact items total' },
]

function BusinessForm({ initial, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const saved = await api.updateBusiness({
        ...form,
        gstin: (form.gstin || '').toUpperCase().trim(),
        validityDays: Number(form.validityDays),
        roundingStep: Number(form.roundingStep),
      })
      setForm(saved)
      onSaved(saved)
      toast.show('Business details saved')
    } catch (err) {
      setErrors(err.fields || {})
      toast.show(err.message, { tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, props = {}) => (
    <div className="field">
      <label className="field__label" htmlFor={`b-${key}`}>{label}</label>
      <input id={`b-${key}`} className="input" value={form[key] || ''} onChange={set(key)} aria-invalid={Boolean(errors[key])} {...props} />
      {errors[key] && <p className="field__error">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={save} noValidate>
      <section className="panel" aria-labelledby="business-heading">
        <h2 id="business-heading" className="panel__title">Business details</h2>
        <p className={css.lead}>Printed on every quote. Changes apply to quotes sent from now on; versions already sent keep what they showed.</p>
        <div className="stack">
          {field('name', 'Business name', { required: true })}
          {field('tagline', 'Tagline')}
          <div className="field">
            <label className="field__label" htmlFor="b-address">Address</label>
            <textarea id="b-address" className="input" rows={2} value={form.address || ''} onChange={set('address')} aria-invalid={Boolean(errors.address)} />
            {errors.address && <p className="field__error">{errors.address}</p>}
          </div>
          <div className={css.twoCol}>
            {field('phonePrimary', 'Phone', { type: 'tel' })}
            {field('phoneSecondary', 'Second phone', { type: 'tel' })}
          </div>
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('gstin', 'GSTIN', { placeholder: 'Leave empty if not registered', autoCapitalize: 'characters', maxLength: 15 })}
          {field('signatory', 'Signed by')}
        </div>
      </section>

      <section className="panel" aria-labelledby="pricing-heading">
        <h2 id="pricing-heading" className="panel__title">Pricing</h2>
        <div className="stack">
          <fieldset className={css.fieldset}>
            <legend className="field__label">Round the final total</legend>
            <div className={css.choices}>
              {MODES.map((m) => (
                <label key={m.value} className={`${css.choice} ${form.roundingMode === m.value ? css.choiceOn : ''}`}>
                  <input type="radio" name="roundingMode" value={m.value} checked={form.roundingMode === m.value} onChange={set('roundingMode')} className="visually-hidden" />
                  <span className={css.choiceLabel}>{m.label}</span>
                  <span className={css.choiceHint}>{m.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={css.twoCol}>
            <div className="field">
              <label className="field__label" htmlFor="b-step">To the nearest</label>
              <select id="b-step" className="input" value={form.roundingStep} onChange={set('roundingStep')} disabled={form.roundingMode === 'NONE'}>
                {STEPS.map((s) => <option key={s} value={s}>{formatRupees(s)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="b-validity">Quotes valid for</label>
              <div className={css.suffixed}>
                <input id="b-validity" className="input num" type="number" inputMode="numeric" min="1" max="365" value={form.validityDays} onChange={set('validityDays')} aria-invalid={Boolean(errors.validityDays)} />
                <span>days</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={css.saveRow}>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save business details'}</button>
      </div>
    </form>
  )
}

function DefaultsForm({ initial }) {
  const toast = useToast()
  const withKeys = (d) => ({
    specs: (d.materialSpecItems || []).map((s) => ({ key: newId(), itemLabel: s.itemLabel, detail: s.detail || '', brand: s.brand || '' })),
    terms: (d.termItems || []).map((t) => ({ key: newId(), text: t.text })),
  })
  const [state, setState] = useState(() => withKeys(initial))
  const [saving, setSaving] = useState(false)
  const edit = (list, key, patch) => setState((s) => ({ ...s, [list]: s[list].map((x) => (x.key === key ? { ...x, ...patch } : x)) }))
  const remove = (list, key) => setState((s) => ({ ...s, [list]: s[list].filter((x) => x.key !== key) }))

  async function save() {
    setSaving(true)
    try {
      const saved = await api.updateDefaults({
        materialSpecItems: state.specs.filter((s) => s.itemLabel.trim()).map(({ itemLabel, detail, brand }) => ({ itemLabel, detail, brand })),
        termItems: state.terms.filter((t) => t.text.trim()).map(({ text }) => ({ text })),
      })
      setState(withKeys(saved))
      toast.show('Defaults saved. New quotes will start with these.')
    } catch (err) {
      toast.show(err.message, { tone: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="defaults-heading">
      <h2 id="defaults-heading" className="panel__title">Starting text for new quotes</h2>
      <p className={css.lead}>Every new quote starts with these. Existing quotes don't change.</p>

      <h3 className={css.subhead}>Material specification</h3>
      <div className={css.rows}>
        {state.specs.map((s) => (
          <div key={s.key} className={css.specRow}>
            <input className="input" aria-label="Item" placeholder="Item" value={s.itemLabel} onChange={(e) => edit('specs', s.key, { itemLabel: e.target.value })} />
            <input className="input" aria-label="Specification" placeholder="Specification" value={s.detail} onChange={(e) => edit('specs', s.key, { detail: e.target.value })} />
            <input className="input" aria-label="Brand" placeholder="Brand" value={s.brand} onChange={(e) => edit('specs', s.key, { brand: e.target.value })} />
            <button type="button" className="icon-btn" aria-label={`Remove ${s.itemLabel || 'row'}`} onClick={() => remove('specs', s.key)}><Icon name="close" size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => setState((s) => ({ ...s, specs: [...s.specs, emptySpec()] }))}><Icon name="plus" size={18} />Add row</button>
      </div>

      <h3 className={css.subhead}>Terms and conditions</h3>
      <ol className={css.terms}>
        {state.terms.map((t, i) => (
          <li key={t.key}>
            <span className={`${css.termNum} num`} aria-hidden="true">{i + 1}</span>
            <textarea className="input" rows={2} aria-label={`Term ${i + 1}`} value={t.text} onChange={(e) => edit('terms', t.key, { text: e.target.value })} />
            <button type="button" className="icon-btn" aria-label={`Remove term ${i + 1}`} onClick={() => remove('terms', t.key)}><Icon name="close" size={18} /></button>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn--ghost" onClick={() => setState((s) => ({ ...s, terms: [...s.terms, emptyTerm()] }))}><Icon name="plus" size={18} />Add term</button>

      <div className={css.saveRow}>
        <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save starting text'}</button>
      </div>
    </section>
  )
}

function BackupPanel({ onRestored }) {
  const toast = useToast()
  const fileInput = useRef(null)
  const [busy, setBusy] = useState(null)
  const [pending, setPending] = useState(null) // { backup, fileName }
  const [includeSettings, setIncludeSettings] = useState(false)

  async function download(kind) {
    setBusy(kind)
    try {
      const backup = await api.exportBackup()
      const stamp = todayIso()
      if (kind === 'json') {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `masterpiece-quotes-backup-${stamp}.json`)
        toast.show(`Backup saved: ${backup.quotes.length} quotes`)
      } else {
        const { downloadExcel } = await import('../lib/excel')
        await downloadExcel(backup, `masterpiece-quotes-${stamp}.xlsx`)
        toast.show(`Excel saved: ${backup.quotes.length} quotes`)
      }
    } catch (err) {
      toast.show(err.message || "Couldn't create the file", { tone: 'danger' })
    } finally {
      setBusy(null)
    }
  }

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = JSON.parse(await file.text())
      if (backup?.format !== 'masterpiece-quotes-backup' || !Array.isArray(backup.quotes)) throw new Error('bad format')
      setPending({ backup, fileName: file.name })
    } catch {
      toast.show("That file isn't a Masterpiece Quotes backup.", { tone: 'danger' })
    }
  }

  async function restore() {
    setBusy('restore')
    try {
      const r = await api.restoreBackup(pending.backup, includeSettings)
      setPending(null)
      toast.show(`Restored ${r.quotesRestored} quotes${r.quotesSkipped ? `, skipped ${r.quotesSkipped} already here` : ''}`, { duration: 8000 })
      onRestored()
    } catch (err) {
      toast.show(err.message, { tone: 'danger' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="panel" aria-labelledby="backup-heading">
      <h2 id="backup-heading" className="panel__title">Backup</h2>
      <p className={css.lead}>Keep a copy of every quote, every sent version and these settings outside the app. Do this every month.</p>
      <div className={css.buttons}>
        <button type="button" className="btn btn--secondary" onClick={() => download('json')} disabled={Boolean(busy)}>
          <Icon name="download" size={18} />{busy === 'json' ? 'Preparing…' : 'Download backup'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => download('excel')} disabled={Boolean(busy)}>
          <Icon name="file" size={18} />{busy === 'excel' ? 'Preparing…' : 'Export to Excel'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}>
          <Icon name="undo" size={18} />Restore from backup
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="visually-hidden" onChange={pickFile} tabIndex={-1} />
      </div>

      <Sheet open={Boolean(pending)} title="Restore from backup" onClose={() => setPending(null)}>
        {pending && (
          <>
            <p className={css.lead}>
              {pending.fileName} has {pending.backup.quotes.length} quotes, saved {formatDate(pending.backup.exportedAt?.slice(0, 10))}.
              Quotes already in the app are skipped, never overwritten.
            </p>
            <label className={css.check}>
              <input type="checkbox" checked={includeSettings} onChange={(e) => setIncludeSettings(e.target.checked)} />
              Also replace business details and starting text with the backup's
            </label>
            <div className={css.sheetActions}>
              <button type="button" className="btn btn--secondary" onClick={() => setPending(null)}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={restore} disabled={busy === 'restore'}>
                {busy === 'restore' ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </section>
  )
}

function DeletedPanel({ refreshKey }) {
  const toast = useToast()
  const [items, setItems] = useState(null)

  useEffect(() => {
    api.listDeletedQuotes().then(setItems).catch(() => setItems([]))
  }, [refreshKey])

  if (!items || items.length === 0) return null

  async function restore(q) {
    try {
      await api.restoreQuote(q.id)
      setItems((list) => list.filter((x) => x.id !== q.id))
      toast.show(`${quoteRef(q.quoteNumber)} is back in your quotes`)
    } catch (err) {
      toast.show(err.message, { tone: 'danger' })
    }
  }

  return (
    <section className="panel" aria-labelledby="deleted-heading">
      <h2 id="deleted-heading" className="panel__title">Recently deleted</h2>
      <ul className={css.deleted}>
        {items.map((q) => (
          <li key={q.id}>
            <span>
              <strong>{q.customerName}</strong>
              <span className={css.deletedMeta}>{quoteRef(q.quoteNumber)}, {formatRupees(q.roundedTotal)}</span>
            </span>
            <button type="button" className="btn btn--secondary" onClick={() => restore(q)}>Restore</button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Settings() {
  const [business, setBusiness] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([api.getBusiness(), api.getDefaults()])
      .then(([b, d]) => {
        setBusiness(b)
        setDefaults(d)
      })
      .catch((e) => setError(e.message))
  }, [refreshKey])

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="icon-btn" aria-label="Back to quotes"><Icon name="back" /></Link>
        <h1 className="topbar__title">Settings</h1>
      </header>
      {error && <div className="banner banner--danger" role="alert">{error}</div>}
      {!business && !error && <div className="center-state" role="status"><div className="spinner" /></div>}
      {business && (
        <>
          <BusinessForm key={`b-${refreshKey}`} initial={business} onSaved={setBusiness} />
          <DefaultsForm key={`d-${refreshKey}`} initial={defaults} />
          <BackupPanel onRestored={() => setRefreshKey((k) => k + 1)} />
          <DeletedPanel refreshKey={refreshKey} />
          <div className={css.signOut}>
            <button type="button" className="btn btn--ghost" onClick={signOut}>
              <Icon name="logout" size={18} />Sign out of this phone
            </button>
          </div>
        </>
      )}
    </div>
  )
}
