import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import QuoteCard from '../components/QuoteCard'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatRupees } from '../utils/format'

function EmptyIllustration() {
  return (
    <svg width="120" height="94" viewBox="0 0 120 94" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 6L110 46H10L60 6Z" stroke="var(--rule)" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="24" y="46" width="34" height="42" stroke="var(--brick)" strokeOpacity="0.55" strokeWidth="2.5" />
      <rect x="62" y="46" width="34" height="42" stroke="var(--slate)" strokeOpacity="0.55" strokeWidth="2.5" />
      <line x1="24" y1="67" x2="58" y2="67" stroke="var(--rule)" strokeWidth="2" />
      <line x1="62" y1="67" x2="96" y2="67" stroke="var(--rule)" strokeWidth="2" />
      <circle cx="41" cy="57" r="3.5" stroke="var(--terracotta)" strokeWidth="2" />
    </svg>
  )
}

export default function QuotesList() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const debounceRef = useRef(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const fetchQuotes = useCallback((s) => {
    setLoading(true)
    setError(null)
    api
      .listQuotes({ search: s })
      .then(setQuotes)
      .catch((err) => setError(err.message || 'Could not load quotes'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchQuotes(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearchChange(value) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchQuotes(value), 350)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteQuote(deleteTarget.id)
      setQuotes((prev) => prev.filter((q) => q.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err.message || 'Could not delete this quote')
    } finally {
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const total = quotes.reduce((sum, q) => sum + Number(q.roundedTotal || 0), 0)
    return { count: quotes.length, total }
  }, [quotes])

  const isFiltering = search.trim().length > 0

  return (
    <div className="quotes-list-page">
      <header className="qlp-header">
        <div className="qlp-header-top">
          <img src="/icon-192.png" alt="" className="qlp-logo" />
          <div>
            <h1 className="qlp-title">Masterpiece </h1>
            {!loading && !error && quotes.length > 0 &Quotes& (
              <p className="qlp-stats mono">
                {stats.count} quote{stats.count !== 1 ? 's' : ''} · {formatRupees(stats.total)}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="qlp-controls">
        <div className="qlp-search-wrap">
          <svg className="qlp-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by customer name"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="qlp-search"
          />
        </div>
      </div>

      <main className="qlp-body">
        {loading && (
          <div className="qlp-state">
            <div className="qlp-spinner" />
            <span>Loading quotes…</span>
          </div>
        )}

        {!loading && error && (
          <div className="qlp-state qlp-error">
            Couldn't reach the server. {error}
            <button className="qlp-retry" onClick={() => fetchQuotes(search)}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && quotes.length === 0 && !isFiltering && (
          <div className="qlp-empty">
            <EmptyIllustration />
            <p className="qlp-empty-title">No quotes yet</p>
            <p className="qlp-empty-sub">Every quote you build for a customer will show up here.</p>
            <button className="qlp-empty-cta" onClick={() => navigate('/quotes/new')}>
              Create your first quote
            </button>
          </div>
        )}

        {!loading && !error && quotes.length === 0 && isFiltering && (
          <div className="qlp-empty">
            <p className="qlp-empty-title">No matches</p>
            <p className="qlp-empty-sub">Try a different name.</p>
          </div>
        )}

        {!loading &&
          !error &&
          quotes.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              onClick={() => navigate(`/quotes/${q.id}`)}
              onDelete={(quote) => {
                setDeleteError(null)
                setDeleteTarget(quote)
              }}
            />
          ))}
      </main>

      <button className="qlp-fab" onClick={() => navigate('/quotes/new')} aria-label="New quote">
        +
      </button>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this quote?"
        message={
          deleteTarget
            ? `This will permanently delete the quote for ${deleteTarget.customerName}. This can't be undone.${
                deleteError ? ` ${deleteError}` : ''
              }`
            : ''
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />

      <style>{`
        .quotes-list-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          padding-bottom: 100px;
        }
        .qlp-header {
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          padding: 22px 20px 28px;
          border-radius: 0 0 22px 22px;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.18);
        }
        .qlp-header-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .qlp-logo {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .qlp-title {
          font-size: 19px;
          font-weight: 500;
          color: var(--bg);
        }
        .qlp-stats {
          font-size: 11.5px;
          color: var(--terracotta);
          margin-top: 3px;
          letter-spacing: 0.01em;
        }
        .qlp-controls {
          padding: 0 20px;
          margin-top: -16px;
          position: relative;
          z-index: 2;
        }
        .qlp-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .qlp-search-icon {
          position: absolute;
          left: 15px;
          color: var(--ink-soft);
          pointer-events: none;
        }
        .qlp-search {
          width: 100%;
          padding: 13px 16px 13px 40px;
          border: 1px solid var(--rule);
          border-radius: 13px;
          background: var(--paper);
          font-size: 14px;
          box-shadow: 0 4px 16px rgba(35, 33, 38, 0.1);
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .qlp-search:focus {
          outline: none;
          border-color: var(--slate);
          box-shadow: 0 4px 16px rgba(89, 96, 115, 0.18), 0 0 0 3px rgba(89, 96, 115, 0.12);
        }
        .qlp-body {
          padding: 20px 20px 0;
        }
        .qlp-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 14px;
          padding: 70px 20px;
        }
        .qlp-spinner {
          width: 22px;
          height: 22px;
          border: 2.5px solid var(--rule);
          border-top-color: var(--slate);
          border-radius: 50%;
          animation: qlp-spin 0.7s linear infinite;
        }
        @keyframes qlp-spin {
          to { transform: rotate(360deg); }
        }
        .qlp-retry {
          border: 1px solid var(--ink);
          background: transparent;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
        }
        .qlp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 56px 24px 40px;
        }
        .qlp-empty-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 500;
          margin-top: 20px;
          margin-bottom: 6px;
        }
        .qlp-empty-sub {
          color: var(--ink-soft);
          font-size: 13.5px;
          max-width: 240px;
          line-height: 1.5;
        }
        .qlp-empty-cta {
          margin-top: 20px;
          background: var(--ink);
          color: var(--bg);
          border: none;
          padding: 12px 22px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(35, 33, 38, 0.25);
        }
        .qlp-empty-cta:active {
          transform: scale(0.97);
        }
        .qlp-fab {
          position: fixed;
          right: 22px;
          bottom: calc(24px + env(safe-area-inset-bottom));
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(160deg, #2c2831, #1c1a1e);
          color: var(--bg);
          font-size: 28px;
          font-weight: 400;
          border: none;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.4), 0 2px 6px rgba(35, 33, 38, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .qlp-fab:active {
          transform: scale(0.94);
        }
      `}</style>
    </div>
  )
}