import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Settings() {
  const navigate = useNavigate()
  const keyCounter = useRef(0)
  const nextKey = () => `k${keyCounter.current++}`

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const [materialSpecItems, setMaterialSpecItems] = useState([])
  const [termItems, setTermItems] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .getDefaults()
      .then((d) => {
        if (cancelled) return
        setMaterialSpecItems(
          (d.materialSpecItems || []).map((s) => ({
            _key: nextKey(),
            itemLabel: s.itemLabel,
            detail: s.detail || '',
            brand: s.brand || '',
          }))
        )
        setTermItems((d.termItems || []).map((t) => ({ _key: nextKey(), text: t.text })))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.message || 'Could not load settings')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addSpec() {
    setMaterialSpecItems([...materialSpecItems, { _key: nextKey(), itemLabel: '', detail: '', brand: '' }])
  }
  function changeSpec(key, field, value) {
    setMaterialSpecItems(materialSpecItems.map((s) => (s._key === key ? { ...s, [field]: value } : s)))
  }
  function removeSpec(key) {
    setMaterialSpecItems(materialSpecItems.filter((s) => s._key !== key))
  }

  function addTerm() {
    setTermItems([...termItems, { _key: nextKey(), text: '' }])
  }
  function changeTerm(key, value) {
    setTermItems(termItems.map((t) => (t._key === key ? { ...t, text: value } : t)))
  }
  function removeTerm(key) {
    setTermItems(termItems.filter((t) => t._key !== key))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    const payload = {
      materialSpecItems: materialSpecItems
        .filter((s) => s.itemLabel.trim())
        .map((s, i) => ({ itemLabel: s.itemLabel.trim(), detail: s.detail.trim(), brand: s.brand.trim(), sortOrder: i })),
      termItems: termItems
        .filter((t) => t.text.trim())
        .map((t, i) => ({ text: t.text.trim(), sortOrder: i })),
    }
    try {
      await api.updateDefaults(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err.message || 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="st-state">
        <div className="st-spinner" />
        <span>Loading settings…</span>
        <style>{`
          .st-state { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; }
          .st-spinner { width:24px; height:24px; border:2.5px solid var(--rule); border-top-color:var(--slate); border-radius:50%; animation: st-spin 0.7s linear infinite; }
          @keyframes st-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="st-state">
        <span>Couldn't load settings. {loadError}</span>
        <button className="st-back-link" onClick={() => navigate('/')}>
          Back to Quotes
        </button>
        <style>{`
          .st-state { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; padding:24px; text-align:center; }
          .st-back-link { border:1px solid var(--ink); background:transparent; padding:10px 20px; border-radius:10px; font-weight:600; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="st-page">
      <header className="st-header">
        <button className="st-header-back" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <h1 className="st-header-title">Settings</h1>
      </header>

      <main className="st-body">
        <p className="st-intro">
          These defaults automatically fill in every new quote's Material Specification and Terms &amp;
          Conditions - edit them here once, instead of retyping them for each customer. Changing these won't
          affect quotes you've already created.
        </p>

        <section className="st-section">
          <h2 className="st-section-title">Material Specification Defaults</h2>
          {materialSpecItems.map((s) => (
            <div key={s._key} className="st-spec-card">
              <div className="st-spec-top">
                <input
                  type="text"
                  placeholder="Item (e.g. Plywood)"
                  value={s.itemLabel}
                  onChange={(e) => changeSpec(s._key, 'itemLabel', e.target.value)}
                  className="st-input st-spec-label"
                />
                <button type="button" className="st-row-remove" onClick={() => removeSpec(s._key)}>
                  ×
                </button>
              </div>
              <div className="st-spec-bottom">
                <input
                  type="text"
                  placeholder="Detail"
                  value={s.detail}
                  onChange={(e) => changeSpec(s._key, 'detail', e.target.value)}
                  className="st-input st-spec-detail"
                />
                <input
                  type="text"
                  placeholder="Brand"
                  value={s.brand}
                  onChange={(e) => changeSpec(s._key, 'brand', e.target.value)}
                  className="st-input st-spec-brand"
                />
              </div>
            </div>
          ))}
          <button type="button" className="st-add-row" onClick={addSpec}>
            + Add row
          </button>
        </section>

        <section className="st-section">
          <h2 className="st-section-title">Terms &amp; Conditions Defaults</h2>
          {termItems.map((t, i) => (
            <div key={t._key} className="st-term-row">
              <span className="st-term-num mono">{i + 1}</span>
              <input
                type="text"
                placeholder="Term"
                value={t.text}
                onChange={(e) => changeTerm(t._key, e.target.value)}
                className="st-input st-term-input"
              />
              <button type="button" className="st-row-remove" onClick={() => removeTerm(t._key)}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="st-add-row" onClick={addTerm}>
            + Add term
          </button>
        </section>

        {saveError && <p className="st-error-text">Couldn't save. {saveError}</p>}
      </main>

      <div className="st-save-bar">
        <button className="st-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
        </button>
      </div>

      <style>{`
        .st-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          padding-bottom: 100px;
        }
        .st-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 20px;
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          border-radius: 0 0 22px 22px;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.18);
        }
        .st-header-back {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: var(--bg);
          font-size: 17px;
        }
        .st-header-title {
          font-size: 18px;
          font-weight: 500;
          color: var(--bg);
        }
        .st-body {
          padding: 18px 20px 0;
        }
        .st-intro {
          font-size: 13px;
          color: var(--ink-soft);
          line-height: 1.6;
          margin-bottom: 18px;
        }
        .st-section {
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 15px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 3px 12px rgba(35, 33, 38, 0.06);
        }
        .st-section-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .st-input {
          border: 1px solid var(--rule);
          border-radius: 10px;
          background: var(--bg);
          padding: 11px 12px;
          font-size: 14px;
        }
        .st-input:focus {
          outline: none;
          border-color: var(--slate);
        }
        .st-spec-card {
          border: 1px solid var(--rule);
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 8px;
          background: var(--bg);
        }
        .st-spec-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .st-spec-top .st-spec-label {
          flex: 1;
          font-weight: 600;
        }
        .st-spec-bottom {
          display: flex;
          gap: 8px;
        }
        .st-spec-bottom .st-spec-detail,
        .st-spec-bottom .st-spec-brand {
          flex: 1;
          min-width: 0;
        }
        .st-term-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 8px;
        }
        .st-term-num {
          flex-shrink: 0;
          width: 20px;
          font-size: 12px;
          color: var(--brick);
          text-align: center;
        }
        .st-term-input { flex: 1; }
        .st-row-remove {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: var(--brick-light);
          color: var(--brick);
          font-size: 16px;
        }
        .st-add-row {
          border: 1.5px dashed var(--rule);
          background: transparent;
          color: var(--ink-soft);
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 8px;
          margin-top: 2px;
        }
        .st-error-text {
          color: var(--brick);
          font-size: 13px;
          text-align: center;
          padding: 8px 0 16px;
        }
        .st-save-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, var(--bg) 70%, transparent);
        }
        .st-save-btn {
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
        .st-save-btn:disabled {
          opacity: 0.6;
        }
        .st-save-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}