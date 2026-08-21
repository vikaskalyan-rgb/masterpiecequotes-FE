import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import QuoteCard from '../components/QuoteCard'

const FILTERS = [
  { key: null, label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENT', label: 'Sent' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
]

export default function QuotesList() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const debounceRef = useRef(null)

  const fetchQuotes = useCallback((s, status) => {
    setLoading(true)
    setError(null)
    api
      .listQuotes({ search: s, status })
      .then(setQuotes)
      .catch((err) => setError(err.message || 'Could not load quotes'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchQuotes(search, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  function handleSearchChange(value) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchQuotes(value, statusFilter), 350)
  }

  return (
    <div className="quotes-list-page">
      <header className="qlp-header">
        <img src="/icon-192.png" alt="" className="qlp-logo" />
        <h1 className="qlp-title">Masterpiece Quotes</h1>
      </header>

      <div className="qlp-search-wrap">
        <input
          type="text"
          placeholder="Search by customer name"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="qlp-search"
        />
      </div>

      <div className="qlp-filters">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            className={`qlp-filter-chip${statusFilter === f.key ? ' active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <main className="qlp-body">
        {loading && <div className="qlp-state">Loading quotes…</div>}

        {!loading && error && (
          <div className="qlp-state qlp-error">
            Couldn't reach the server. {error}
            <button className="qlp-retry" onClick={() => fetchQuotes(search, statusFilter)}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && quotes.length === 0 && (
          <div className="qlp-empty">
            <p className="qlp-empty-title">No quotes yet</p>
            <p className="qlp-empty-sub">Tap the + button to create your first quote.</p>
          </div>
        )}

        {!loading &&
          !error &&
          quotes.map((q) => (
            <QuoteCard key={q.id} quote={q} onClick={() => navigate(`/quotes/${q.id}`)} />
          ))}
      </main>

      <button className="qlp-fab" onClick={() => navigate('/quotes/new')} aria-label="New quote">
        +
      </button>

      <style>{`
        .quotes-list-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          padding-bottom: 100px;
        }
        .qlp-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 20px 10px;
        }
        .qlp-logo {
          width: 34px;
          height: 34px;
          border-radius: 8px;
        }
        .qlp-title {
          font-size: 19px;
          font-weight: 500;
        }
        .qlp-search-wrap {
          padding: 8px 20px;
        }
        .qlp-search {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid var(--rule);
          border-radius: var(--radius-sm);
          background: var(--paper);
          font-size: 14px;
        }
        .qlp-search:focus {
          outline: none;
          border-color: var(--slate);
        }
        .qlp-filters {
          display: flex;
          gap: 8px;
          padding: 8px 20px 4px;
          overflow-x: auto;
        }
        .qlp-filter-chip {
          flex-shrink: 0;
          border: 1px solid var(--rule);
          background: var(--paper);
          color: var(--ink-soft);
          font-size: 13px;
          font-weight: 500;
          padding: 7px 14px;
          border-radius: 100px;
        }
        .qlp-filter-chip.active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--bg);
        }
        .qlp-body {
          padding: 14px 20px 0;
        }
        .qlp-state {
          text-align: center;
          color: var(--ink-soft);
          font-size: 14px;
          padding: 60px 20px;
        }
        .qlp-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .qlp-retry {
          border: 1px solid var(--ink);
          background: transparent;
          padding: 8px 18px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
        }
        .qlp-empty {
          text-align: center;
          padding: 80px 20px;
        }
        .qlp-empty-title {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .qlp-empty-sub {
          color: var(--ink-soft);
          font-size: 13.5px;
        }
        .qlp-fab {
          position: fixed;
          right: 22px;
          bottom: calc(24px + env(safe-area-inset-bottom));
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: var(--ink);
          color: var(--bg);
          font-size: 28px;
          font-weight: 400;
          border: none;
          box-shadow: 0 6px 20px rgba(35, 33, 38, 0.35);
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
