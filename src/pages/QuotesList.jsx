import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/toastContext'
import { formatDate, formatMonth, formatRelative } from '../lib/dates'
import { clearDraft, draftCustomerName, listDrafts } from '../lib/drafts'
import { cachedQuoteList, prefetchQuote, rememberQuoteList } from '../lib/cache'
import Loader from '../components/Loader'
import { formatRupees, quoteRef } from '../lib/money'
import css from './QuotesList.module.css'

// The Excel reader and parser load only when the import panel is opened.
const ImportSheet = lazy(() => import('../components/ImportSheet'))

const DRAFT_LABEL = { new: 'New quote', duplicate: 'Copy of another quote', import: 'Imported from Excel' }

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Not taken' },
]

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function groupByMonth(quotes) {
  const groups = []
  const sorted = [...quotes].sort(
    (a, b) => b.quoteDate.localeCompare(a.quoteDate) || (b.quoteNumber || 0) - (a.quoteNumber || 0),
  )
  for (const q of sorted) {
    const label = formatMonth(q.quoteDate)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.quotes.push(q)
    else groups.push({ label, quotes: [q] })
  }
  return groups
}

export default function QuotesList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  // Coming back to this screen shows the last list at once; a fresh one replaces it.
  const [quotes, setQuotes] = useState(() => cachedQuoteList())
  const [error, setError] = useState(null)
  const [drafts, setDrafts] = useState(() => listDrafts())
  const [importing, setImporting] = useState(false)
  const debouncedSearch = useDebounced(search.trim(), 250)

  const load = useCallback(
    () =>
      api
        .listQuotes({ search: debouncedSearch })
        .then((list) => {
          if (!debouncedSearch) rememberQuoteList(list)
          setQuotes(list)
          setError(null)
        })
        .catch((err) => setError(err.message)),
    [debouncedSearch],
  )

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c = { '': 0, DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0 }
    for (const q of quotes || []) {
      c[''] += 1
      c[q.status] += 1
    }
    return c
  }, [quotes])

  const visible = useMemo(() => (quotes || []).filter((q) => !filter || q.status === filter), [quotes, filter])
  const groups = useMemo(() => groupByMonth(visible), [visible])

  const editDraftIds = useMemo(
    () => new Set(drafts.filter((d) => d.type === 'edit').map((d) => String(d.id))),
    [drafts],
  )
  const unsavedNew = drafts.filter((d) => d.type in DRAFT_LABEL)

  function discardDraft(draft) {
    clearDraft(draft.key)
    setDrafts(listDrafts())
    toast.show('Draft discarded')
  }

  function openDraft(draft) {
    if (draft.type === 'duplicate') navigate(`/quotes/new?from=${draft.fromId}`)
    else if (draft.type === 'import') navigate(`/quotes/new?import=${encodeURIComponent(draft.importId)}`)
    else navigate('/quotes/new')
  }

  return (
    <div className={`page ${css.page}`}>
      <header className="topbar">
        <Logo size={30} />
        <h1 className="topbar__title">Quotes</h1>
        <Link to="/insights" className="icon-btn" aria-label="Insights">
          <Icon name="chart" />
        </Link>
        <Link to="/settings" className="icon-btn" aria-label="Settings">
          <Icon name="settings" />
        </Link>
      </header>

      <div className={css.search}>
        <Icon name="search" size={18} className={css.searchIcon} />
        <input
          className="input"
          type="search"
          inputMode="search"
          placeholder="Name, phone or MP number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search quotes"
        />
      </div>

      <div className={css.filters} role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            className={`${css.filter} ${filter === f.value ? css.filterActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {quotes && <span className={css.count}>{counts[f.value]}</span>}
          </button>
        ))}
      </div>

      {unsavedNew.length > 0 && !filter && !search && (
        <section className={css.section} aria-labelledby="drafts-heading">
          <h2 id="drafts-heading" className={css.sectionTitle}>
            Unsaved on this phone
          </h2>
          <ul className={css.list}>
            {unsavedNew.map((d) => (
              <li key={d.key} className={`${css.row} ${css.draftRow}`}>
                <button type="button" className={css.rowLink} onClick={() => openDraft(d)}>
                  <span className={css.rowMain}>
                    <span className={css.name}>{draftCustomerName(d) || 'Untitled quote'}</span>
                    <span className={css.meta}>
                      {DRAFT_LABEL[d.type]}, edited {formatRelative(d.data.savedAt)}
                    </span>
                  </span>
                  <span className={css.resume}>Continue</span>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => discardDraft(d)}
                  aria-label={`Discard draft ${draftCustomerName(d)}`.trim()}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div className="banner banner--danger" role="alert">
          <div className="banner__body">
            {error}
            <div className="banner__actions">
              <button type="button" className="btn" onClick={load}>
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!quotes && !error && (
        <Loader label="Loading quotes" inline />
      )}

      {quotes && visible.length === 0 && (
        <div className={css.empty}>
          {search || filter ? (
            <p>No quotes match{search ? ` "${search}"` : ''}{filter ? ` in ${FILTERS.find((f) => f.value === filter).label.toLowerCase()}` : ''}.</p>
          ) : (
            <>
              <p className={css.emptyTitle}>No quotes yet</p>
              <p>Measure a room, add its items and send the quote on WhatsApp.</p>
              <div className={css.emptyActions}>
                <Link to="/quotes/new" className="btn btn--primary">
                  Start a quote
                </Link>
                <button type="button" className="btn btn--secondary" onClick={() => setImporting(true)}>
                  <Icon name="upload" size={18} />
                  Import from Excel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className={css.section} aria-label={group.label}>
          <h2 className={css.sectionTitle}>{group.label}</h2>
          <ul className={css.list}>
            {group.quotes.map((q) => (
              <li key={q.id} className={css.row}>
                <Link to={`/quotes/${q.id}`} className={css.rowLink} onPointerDown={() => prefetchQuote(q.id)}>
                  <span className={css.rowMain}>
                    <span className={css.name}>{q.customerName}</span>
                    <span className={css.meta}>
                      <span className={css.ref}>{quoteRef(q.quoteNumber)}</span>
                      <span>{formatDate(q.quoteDate)}</span>
                      {editDraftIds.has(String(q.id)) && <span className={css.unsaved}>Unsaved changes</span>}
                    </span>
                  </span>
                  <span className={css.rowEnd}>
                    <span className={`${css.total} num`}>{formatRupees(q.roundedTotal)}</span>
                    <StatusBadge status={q.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className={css.fabs}>
        <Link to="/quotes/new" className={`btn btn--primary ${css.fab}`}>
          <Icon name="plus" size={18} />
          New quote
        </Link>
        <button type="button" className={`btn ${css.fabSecondary}`} onClick={() => setImporting(true)}>
          <Icon name="upload" size={18} />
          Import from Excel
        </button>
      </div>

      {importing && (
        <Suspense fallback={null}>
          <ImportSheet open onClose={() => setImporting(false)} />
        </Suspense>
      )}
    </div>
  )
}
