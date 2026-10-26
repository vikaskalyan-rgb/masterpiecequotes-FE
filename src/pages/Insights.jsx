import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Icon from '../components/Icon'
import { formatRupees } from '../lib/money'
import { formatPhone } from '../lib/phone'
import Loader from '../components/Loader'
import css from './Insights.module.css'

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
}

export default function Insights() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getAnalytics().then(setData).catch((e) => setError(e.message))
  }, [])

  const header = (
    <header className="topbar">
      <Link to="/" className="icon-btn" aria-label="Back to quotes">
        <Icon name="back" />
      </Link>
      <h1 className="topbar__title">Insights</h1>
    </header>
  )

  if (error) {
    return (
      <div className="page">
        {header}
        <div className="banner banner--danger" role="alert">{error}</div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="page">
        {header}
        <Loader label="Loading insights" />
      </div>
    )
  }

  const max = Math.max(1, ...data.months.map((m) => Number(m.quoted)))
  const topMax = Math.max(1, ...data.topCustomers.map((c) => Number(c.value)))
  const decided = data.statusCounts.ACCEPTED + data.statusCounts.REJECTED

  return (
    <div className="page">
      {header}

      {data.quotedCount === 0 ? (
        <div className={css.empty}>
          <p className={css.emptyTitle}>Nothing sent yet</p>
          <p>Numbers appear here once quotes are sent. Drafts are never counted.</p>
        </div>
      ) : (
        <>
          <section className={css.lead}>
            <p className={css.leadLabel}>Quoted to customers</p>
            <p className={`${css.leadValue} num`}>{formatRupees(data.quotedValue)}</p>
            <p className={css.leadSub}>
              across {data.quotedCount} sent {data.quotedCount === 1 ? 'quote' : 'quotes'}, averaging {formatRupees(data.averageQuote)}
            </p>
          </section>

          <dl className={css.stats}>
            <div>
              <dt>Won</dt>
              <dd className="num">{formatRupees(data.wonValue)}</dd>
              <span>{data.wonCount} accepted</span>
            </div>
            <div>
              <dt>Win rate</dt>
              <dd className="num">{data.conversionRate == null ? '—' : `${Math.round(data.conversionRate * 100)}%`}</dd>
              <span>{decided ? `of ${decided} decided` : 'none decided yet'}</span>
            </div>
            <div>
              <dt>Waiting</dt>
              <dd className="num">{data.statusCounts.SENT}</dd>
              <span>sent, no answer yet</span>
            </div>
          </dl>

          <section className="panel" aria-labelledby="months-heading">
            <h2 id="months-heading" className="panel__title">Last six months</h2>
            <div className={css.chart} role="img" aria-label={`Quoted and won value for the last six months`}>
              {data.months.map((m) => (
                <div key={m.month} className={css.col}>
                  <div className={css.track}>
                    <div className={css.quoted} style={{ height: `${(Number(m.quoted) / max) * 100}%` }}>
                      <div className={css.won} style={{ height: `${Number(m.quoted) ? (Number(m.won) / Number(m.quoted)) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className={css.colLabel}>{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
            <div className={css.key}>
              <span><i className={css.keyQuoted} /> Quoted</span>
              <span><i className={css.keyWon} /> Won</span>
            </div>
            <table className="visually-hidden">
              <thead><tr><th>Month</th><th>Quoted</th><th>Won</th></tr></thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month}><td>{m.month}</td><td>{formatRupees(m.quoted)}</td><td>{formatRupees(m.won)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          {data.topCustomers.length > 0 && (
            <section className="panel" aria-labelledby="customers-heading">
              <h2 id="customers-heading" className="panel__title">Biggest customers</h2>
              <ol className={css.customers}>
                {data.topCustomers.map((c) => (
                  <li key={c.phone}>
                    <div className={css.customerTop}>
                      <span className={css.customerName}>{c.name}</span>
                      <span className="num">{formatRupees(c.value)}</span>
                    </div>
                    <div className={css.customerBar}><span style={{ width: `${(Number(c.value) / topMax) * 100}%` }} /></div>
                    <span className={css.customerMeta}>
                      {formatPhone(c.phone)}, {c.quotes} {c.quotes === 1 ? 'quote' : 'quotes'}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {data.staleDrafts > 0 && (
        <div className="banner banner--info" style={{ marginTop: 'var(--space-4)' }}>
          <Icon name="history" size={18} />
          <div className="banner__body">
            {data.staleDrafts} {data.staleDrafts === 1 ? 'draft has' : 'drafts have'} not been touched for a week.{' '}
            <Link to="/">Review drafts</Link>
          </div>
        </div>
      )}

      <p className={css.footnote}>
        Quoted value counts quotes that were sent, accepted or not taken. A revised quote saved as a new quote counts again.
      </p>
    </div>
  )
}
