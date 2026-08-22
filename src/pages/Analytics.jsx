import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { formatRupees } from '../utils/format'

function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : '' // "2026-08"
}

function monthLabel(key) {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-IN', { month: 'short' })
}

export default function Analytics() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [exportDone, setExportDone] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .listQuotes({})
      .then((data) => {
        if (!cancelled) setQuotes(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const count = quotes.length
    const total = quotes.reduce((s, q) => s + Number(q.roundedTotal || 0), 0)
    const avg = count > 0 ? total / count : 0

    // Last 6 months, oldest to newest, including months with zero quotes.
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const monthTotals = Object.fromEntries(months.map((m) => [m, 0]))
    quotes.forEach((q) => {
      const key = monthKey(q.quoteDate)
      if (key in monthTotals) monthTotals[key] += Number(q.roundedTotal || 0)
    })
    const trend = months.map((key) => ({ key, label: monthLabel(key), value: monthTotals[key] }))
    const maxTrendValue = Math.max(...trend.map((t) => t.value), 1)

    const thisMonthKey = months[months.length - 1]
    const lastMonthKey = months[months.length - 2]
    const thisMonthValue = monthTotals[thisMonthKey] || 0
    const lastMonthValue = monthTotals[lastMonthKey] || 0

    // Top customers by total value.
    const byCustomer = {}
    quotes.forEach((q) => {
      const name = q.customerName || 'Unknown'
      byCustomer[name] = (byCustomer[name] || 0) + Number(q.roundedTotal || 0)
    })
    const topCustomers = Object.entries(byCustomer)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    const topCustomerMax = Math.max(...topCustomers.map((c) => c.value), 1)

    return { count, total, avg, trend, maxTrendValue, thisMonthValue, lastMonthValue, topCustomers, topCustomerMax }
  }, [quotes])

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    setExportDone(null)
    try {
      const { exportAllQuotesToExcel } = await import('../utils/exportExcel')
      const result = await exportAllQuotesToExcel()
      setExportDone(result)
    } catch (err) {
      setExportError(err.message || 'Could not export')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="an-state">
        <div className="an-spinner" />
        <span>Loading analytics…</span>
        <style>{`
          .an-state { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; }
          .an-spinner { width:24px; height:24px; border:2.5px solid var(--rule); border-top-color:var(--slate); border-radius:50%; animation: an-spin 0.7s linear infinite; }
          @keyframes an-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="an-state">
        <span>Couldn't load analytics. {error}</span>
        <button className="an-back-link" onClick={() => navigate('/')}>
          Back to Quotes
        </button>
        <style>{`
          .an-state { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; padding:24px; text-align:center; }
          .an-back-link { border:1px solid var(--ink); background:transparent; padding:10px 20px; border-radius:10px; font-weight:600; }
        `}</style>
      </div>
    )
  }

  const monthDelta = stats.lastMonthValue > 0 ? ((stats.thisMonthValue - stats.lastMonthValue) / stats.lastMonthValue) * 100 : null

  return (
    <div className="an-page">
      <header className="an-header">
        <button className="an-header-back" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <h1 className="an-header-title">Analytics</h1>
      </header>

      <main className="an-body">
        {quotes.length === 0 ? (
          <div className="an-empty">
            <p className="an-empty-title">No data yet</p>
            <p className="an-empty-sub">Once you've created a few quotes, your analytics will show up here.</p>
          </div>
        ) : (
          <>
            <div className="an-stat-grid">
              <div className="an-stat-card an-stat-card-primary">
                <div className="an-stat-label">Total Quoted</div>
                <div className="an-stat-value mono">{formatRupees(stats.total)}</div>
              </div>
              <div className="an-stat-card">
                <div className="an-stat-label">Quotes</div>
                <div className="an-stat-value-sm mono">{stats.count}</div>
              </div>
              <div className="an-stat-card">
                <div className="an-stat-label">Average</div>
                <div className="an-stat-value-sm mono">{formatRupees(stats.avg)}</div>
              </div>
            </div>

            <section className="an-section">
              <div className="an-section-heading">
                <h2>Last 6 Months</h2>
                {monthDelta !== null && (
                  <span className={`an-delta ${monthDelta >= 0 ? 'an-delta-up' : 'an-delta-down'}`}>
                    {monthDelta >= 0 ? '↑' : '↓'} {Math.abs(monthDelta).toFixed(0)}% vs last month
                  </span>
                )}
              </div>
              <div className="an-bars">
                {stats.trend.map((t) => (
                  <div className="an-bar-col" key={t.key}>
                    <div className="an-bar-track">
                      <div
                        className="an-bar-fill"
                        style={{ height: `${Math.max((t.value / stats.maxTrendValue) * 100, t.value > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <div className="an-bar-label">{t.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {stats.topCustomers.length > 0 && (
              <section className="an-section">
                <div className="an-section-heading">
                  <h2>Top Customers</h2>
                </div>
                <div className="an-customer-list">
                  {stats.topCustomers.map((c, i) => (
                    <div className="an-customer-row" key={c.name}>
                      <span className="an-customer-rank mono">{i + 1}</span>
                      <div className="an-customer-mid">
                        <div className="an-customer-name">{c.name}</div>
                        <div className="an-customer-track">
                          <div
                            className="an-customer-fill"
                            style={{ width: `${(c.value / stats.topCustomerMax) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="an-customer-value mono">{formatRupees(c.value)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section className="an-section an-export-section">
          <h2 className="an-export-title">Backup &amp; Export</h2>
          <p className="an-export-sub">
            Download every quote - customer details and every room and item - as an Excel file. A safety net
            independent of the app, always yours to keep.
          </p>
          {exportError && <p className="an-export-error">Couldn't export. {exportError}</p>}
          {exportDone && (
            <p className="an-export-success">
              Exported {exportDone.quoteCount} quote{exportDone.quoteCount !== 1 ? 's' : ''} and{' '}
              {exportDone.itemCount} line item{exportDone.itemCount !== 1 ? 's' : ''}.
            </p>
          )}
          <button className="an-export-btn" onClick={handleExport} disabled={exporting || quotes.length === 0}>
            {exporting ? 'Preparing file…' : 'Export All Quotes to Excel'}
          </button>
        </section>
      </main>

      <style>{`
        .an-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          padding-bottom: 40px;
        }
        .an-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 20px;
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          border-radius: 0 0 22px 22px;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.18);
        }
        .an-header-back {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: var(--bg);
          font-size: 17px;
        }
        .an-header-title {
          font-size: 18px;
          font-weight: 500;
          color: var(--bg);
        }
        .an-body {
          padding: 18px 20px 0;
        }
        .an-empty {
          text-align: center;
          padding: 60px 24px;
        }
        .an-empty-title {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .an-empty-sub {
          color: var(--ink-soft);
          font-size: 13.5px;
        }
        .an-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .an-stat-card {
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 15px;
          padding: 16px;
          box-shadow: 0 3px 12px rgba(35, 33, 38, 0.06);
        }
        .an-stat-card-primary {
          grid-column: 1 / -1;
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          border: none;
        }
        .an-stat-card-primary .an-stat-label {
          color: rgba(250,247,241,0.65);
        }
        .an-stat-card-primary .an-stat-value {
          color: var(--terracotta);
        }
        .an-stat-label {
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .an-stat-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--ink);
        }
        .an-stat-value-sm {
          font-size: 19px;
          font-weight: 600;
          color: var(--ink);
        }
        .an-section {
          background: var(--paper);
          border: 1px solid var(--rule);
          border-radius: 15px;
          padding: 18px;
          margin-bottom: 16px;
          box-shadow: 0 3px 12px rgba(35, 33, 38, 0.06);
        }
        .an-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .an-section-heading h2 {
          font-size: 15px;
          font-weight: 600;
        }
        .an-delta {
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 100px;
        }
        .an-delta-up {
          color: var(--sage);
          background: var(--sage-light);
        }
        .an-delta-down {
          color: var(--brick);
          background: var(--brick-light);
        }
        .an-bars {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          height: 120px;
        }
        .an-bar-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        .an-bar-track {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
        }
        .an-bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--terracotta), var(--brick));
          border-radius: 5px 5px 2px 2px;
          transition: height 0.4s ease;
        }
        .an-bar-label {
          font-size: 10.5px;
          color: var(--ink-soft);
          margin-top: 8px;
          font-weight: 500;
        }
        .an-customer-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .an-customer-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .an-customer-rank {
          flex-shrink: 0;
          width: 20px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .an-customer-mid {
          flex: 1;
          min-width: 0;
        }
        .an-customer-name {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .an-customer-track {
          width: 100%;
          height: 5px;
          background: var(--bg);
          border-radius: 3px;
          overflow: hidden;
        }
        .an-customer-fill {
          height: 100%;
          background: var(--slate);
          border-radius: 3px;
        }
        .an-customer-value {
          flex-shrink: 0;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
        }
        .an-export-section {
          background: var(--bg);
        }
        .an-export-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .an-export-sub {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .an-export-error {
          color: var(--brick);
          font-size: 12.5px;
          margin-bottom: 10px;
        }
        .an-export-success {
          color: var(--sage);
          font-size: 12.5px;
          margin-bottom: 10px;
        }
        .an-export-btn {
          width: 100%;
          background: var(--ink);
          color: var(--bg);
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 6px 18px rgba(35, 33, 38, 0.22);
        }
        .an-export-btn:disabled {
          opacity: 0.6;
        }
        .an-export-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}