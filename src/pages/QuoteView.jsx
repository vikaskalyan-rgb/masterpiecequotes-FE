import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Icon from '../components/Icon'
import StatusBadge from '../components/StatusBadge'
import { STATUS } from '../lib/status'
import { useToast } from '../components/toastContext'
import { formatDate, formatDateTime, todayIso } from '../lib/dates'
import { formatNumber, formatRupees, quoteRef } from '../lib/money'
import { formatPhone } from '../lib/phone'
import { ROOM_COLORS } from '../lib/quoteForm'
import { downloadBlob, pdfFileName, shareFile, whatsappMessage } from '../lib/share'
import { reportError } from '../lib/errorReporting'
import css from './QuoteView.module.css'

const loadPdf = () => import('../pdf/generate')

// Everything printed on the PDF, so a status change doesn't trigger a needless re-render.
function printKey(q) {
  return q ? JSON.stringify([q.version, q.customerName, q.customerAddress, q.quoteDate, q.validUntil, q.roundedTotal, q.subtotal, q.rooms, q.materialSpecItems, q.termItems, q.accessoriesAmount, q.accessoriesDescription]) : ''
}

export default function QuoteView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [quote, setQuote] = useState(null)
  const [business, setBusiness] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [error, setError] = useState(null)
  const [pdf, setPdf] = useState({ blob: null, key: null, failed: false })
  const [busy, setBusy] = useState(null) // 'share' | 'download' | 'status' | 'delete'

  const refreshSnapshots = useCallback(() => api.listSnapshots(id).then(setSnapshots).catch(() => {}), [id])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getQuote(id), api.getBusiness()])
      .then(([q, b]) => {
        if (cancelled) return
        setQuote(q)
        setBusiness(b)
      })
      .catch((err) => !cancelled && setError(err))
    refreshSnapshots()
    return () => {
      cancelled = true
    }
  }, [id, refreshSnapshots])

  // Prepare the PDF in the background as soon as the quote is here.
  const key = printKey(quote)
  useEffect(() => {
    if (!quote || !business || pdf.key === key) return undefined
    let cancelled = false
    loadPdf()
      .then(({ generateQuotePdf }) => generateQuotePdf(quote, business))
      .then((blob) => !cancelled && setPdf({ blob, key, failed: false }))
      .catch((err) => {
        reportError(err, 'pdf generation')
        if (!cancelled) setPdf({ blob: null, key, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [quote, business, key, pdf.key])

  const pdfReady = pdf.blob && pdf.key === key

  async function ensureBlob() {
    if (pdfReady) return pdf.blob
    try {
      const { generateQuotePdf } = await loadPdf()
      const blob = await generateQuotePdf(quote, business)
      setPdf({ blob, key, failed: false })
      return blob
    } catch (err) {
      // The technical reason goes to the error log; the owner gets something to act on.
      reportError(err, 'pdf generation')
      throw new Error("Couldn't prepare the PDF. Check the internet connection and try again.", { cause: err })
    }
  }

  async function recordShared() {
    const result = await api.shareQuote(id)
    setQuote(result.quote)
    refreshSnapshots()
    return result
  }

  async function handleSend() {
    setBusy('share')
    try {
      const blob = await ensureBlob()
      const file = new File([blob], pdfFileName(quote), { type: 'application/pdf' })
      const outcome = await shareFile(file, whatsappMessage(quote, business))
      if (outcome === 'cancelled') return
      if (outcome === 'unsupported') {
        downloadBlob(blob, pdfFileName(quote))
        await recordShared()
        toast.show('PDF downloaded. Attach it in the WhatsApp chat.', { duration: 8000 })
        window.open(`https://wa.me/${quote.customerPhone}?text=${encodeURIComponent(whatsappMessage(quote, business))}`, '_blank', 'noopener')
        return
      }
      const result = await recordShared()
      toast.show(result.newVersion ? 'Sent and saved as a shared version' : 'Sent')
    } catch (err) {
      toast.show(err.message || "Couldn't prepare the PDF", { tone: 'danger' })
    } finally {
      setBusy(null)
    }
  }

  async function handleDownload() {
    setBusy('download')
    try {
      downloadBlob(await ensureBlob(), pdfFileName(quote))
      if (quote.status === 'DRAFT') {
        toast.show('PDF downloaded', {
          action: {
            label: 'Mark as sent',
            onClick: () => recordShared().then(() => toast.show('Marked as sent')).catch((e) => toast.show(e.message, { tone: 'danger' })),
          },
          duration: 8000,
        })
      }
    } catch (err) {
      toast.show(err.message || "Couldn't prepare the PDF", { tone: 'danger' })
    } finally {
      setBusy(null)
    }
  }

  async function setStatus(status) {
    if (status === quote.status) return
    setBusy('status')
    try {
      setQuote(await api.updateStatus(id, status))
    } catch (err) {
      toast.show(err.message, { tone: 'danger' })
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    setBusy('delete')
    try {
      await api.deleteQuote(id)
      const ref = quoteRef(quote.quoteNumber)
      navigate('/', { replace: true })
      toast.show(`${ref} deleted`, {
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: () => api.restoreQuote(id).then(() => navigate(`/quotes/${id}`)).catch((e) => toast.show(e.message, { tone: 'danger' })),
        },
      })
    } catch (err) {
      toast.show(err.message, { tone: 'danger' })
      setBusy(null)
    }
  }

  async function openSnapshot(snapshot) {
    try {
      const payload = await api.getSnapshot(id, snapshot.id)
      const { generateQuotePdf } = await loadPdf()
      const blob = await generateQuotePdf(payload.quote, payload.business)
      downloadBlob(blob, pdfFileName(payload.quote).replace('.pdf', `_sent_${snapshot.createdAt.slice(0, 10)}.pdf`))
    } catch (err) {
      toast.show(err.message || "Couldn't open that version", { tone: 'danger' })
    }
  }

  const expired = useMemo(
    () => quote?.validUntil && quote.validUntil < todayIso() && (quote.status === 'SENT' || quote.status === 'DRAFT'),
    [quote],
  )

  if (error) {
    return (
      <div className="center-state">
        <p>{error.status === 404 ? 'This quote was deleted or never existed.' : `Couldn't open this quote. ${error.message}`}</p>
        <Link className="btn btn--primary" to="/">
          Back to quotes
        </Link>
      </div>
    )
  }
  if (!quote || !business) {
    return (
      <div className="center-state" role="status">
        <div className="spinner" />
        <span className="visually-hidden">Loading quote</span>
      </div>
    )
  }

  const diff = Math.round((Number(quote.roundedTotal) - Number(quote.subtotal)) * 100) / 100
  const fittings = Number(quote.accessoriesAmount) || 0

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="icon-btn" aria-label="Back to quotes">
          <Icon name="back" />
        </Link>
        <h1 className="topbar__title">{quoteRef(quote.quoteNumber)}</h1>
        <Link to={`/quotes/${id}/edit`} className="btn btn--secondary">
          <Icon name="edit" size={18} />
          Edit
        </Link>
      </header>

      <section className={css.hero}>
        <div className={css.heroTop}>
          <StatusBadge status={quote.status} />
          <span className={css.heroDate}>{formatDate(quote.quoteDate)}</span>
        </div>
        <h2 className={css.customer}>{quote.customerName}</h2>
        <p className={`${css.total} num`}>{formatRupees(quote.roundedTotal)}</p>
        <p className={css.validity}>
          {quote.validUntil ? (expired ? `Expired on ${formatDate(quote.validUntil)}` : `Valid until ${formatDate(quote.validUntil)}`) : 'No validity date'}
        </p>
      </section>

      {quote.changedSinceShared && (
        <div className="banner banner--warning" role="status">
          <Icon name="alert" size={18} />
          <div className="banner__body">
            You changed this quote after sending it on {formatDateTime(quote.lastSharedAt)}. Send it again so{' '}
            {quote.customerName} has the latest.
          </div>
        </div>
      )}
      {expired && !quote.changedSinceShared && (
        <div className="banner banner--warning" role="status">
          <Icon name="alert" size={18} />
          <div className="banner__body">
            This quote's validity has passed. Edit the date and send it again if the prices still hold.
          </div>
        </div>
      )}

      <div className={css.actions}>
        <button type="button" className={`btn btn--primary ${css.send}`} onClick={handleSend} disabled={Boolean(busy)}>
          <Icon name="whatsapp" size={20} />
          {busy === 'share' ? 'Preparing…' : 'Send on WhatsApp'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleDownload} disabled={Boolean(busy)}>
          <Icon name="download" size={18} />
          {busy === 'download' ? 'Preparing…' : 'Download PDF'}
        </button>
        <Link to={`/quotes/new?from=${id}`} className="btn btn--secondary">
          <Icon name="copy" size={18} />
          Duplicate
        </Link>
      </div>
      {pdf.failed && <p className="field__error">The PDF couldn't be prepared. Try again, or reload the app.</p>}

      <section className="panel" aria-labelledby="status-heading">
        <h3 id="status-heading" className="panel__title">
          Where it stands
        </h3>
        <div className={css.statuses} role="radiogroup" aria-labelledby="status-heading">
          {Object.entries(STATUS).map(([value, meta]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={quote.status === value}
              className={`${css.status} ${quote.status === value ? css.statusOn : ''}`}
              onClick={() => setStatus(value)}
              disabled={busy === 'status'}
            >
              <span className={css.statusLabel}>{meta.label}</span>
              <span className={css.statusHint}>{meta.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="customer-details">
        <h3 id="customer-details" className="panel__title">
          Customer
        </h3>
        <dl className={css.facts}>
          <div>
            <dt>WhatsApp</dt>
            <dd>
              <a href={`https://wa.me/${quote.customerPhone}`} target="_blank" rel="noopener noreferrer">
                {formatPhone(quote.customerPhone)}
              </a>
            </dd>
          </div>
          {quote.customerAddress && (
            <div>
              <dt>Site</dt>
              <dd>{quote.customerAddress}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="panel" aria-labelledby="rooms-heading">
        <h3 id="rooms-heading" className="panel__title">
          Rooms
        </h3>
        {quote.rooms.map((room, ri) => (
          <div key={room.id} className={css.room} style={{ '--room-color': ROOM_COLORS[ri % ROOM_COLORS.length] }}>
            <div className={css.roomHead}>
              <span className={css.roomName}>{room.name}</span>
              <span className="num">{formatRupees(room.total)}</span>
            </div>
            <ul className={css.items}>
              {room.items.map((it) => (
                <li key={it.id}>
                  <span className={css.itemName}>
                    {it.description}
                    <span className={css.itemMeta}>
                      {it.unit === 'SQFT' && it.length != null && it.width != null ? `${formatNumber(it.length)} × ${formatNumber(it.width)} ft, ` : ''}
                      {formatNumber(it.quantity)} {it.unit === 'SQFT' ? 'sqft' : 'nos'} at {formatRupees(it.rate)}
                    </span>
                  </span>
                  <span className="num">{formatRupees(it.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {fittings > 0 && (
          <div className={css.fittings}>
            <span>
              Fittings and accessories
              {quote.accessoriesDescription && <span className={css.itemMeta}>{quote.accessoriesDescription}</span>}
            </span>
            <span className="num">{formatRupees(fittings)}</span>
          </div>
        )}
        <dl className={css.sums}>
          <div>
            <dt>Items and fittings</dt>
            <dd className="num">{formatRupees(quote.subtotal)}</dd>
          </div>
          {diff !== 0 && (
            <div>
              <dt>{quote.totalOverridden ? (diff < 0 ? 'Discount' : 'Adjustment') : 'Rounded off'}</dt>
              <dd className="num">{diff < 0 ? `− ${formatRupees(-diff)}` : `+ ${formatRupees(diff)}`}</dd>
            </div>
          )}
          <div className={css.sumFinal}>
            <dt>Total</dt>
            <dd className="num">{formatRupees(quote.roundedTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="versions-heading">
        <h3 id="versions-heading" className="panel__title">
          Sent versions
        </h3>
        {snapshots.length === 0 ? (
          <p className={css.empty}>Not sent yet. Each time you send it, the exact PDF the customer received is kept here.</p>
        ) : (
          <ul className={css.versions}>
            {snapshots.map((snap, i) => (
              <li key={snap.id}>
                <span>
                  <span className={css.versionDate}>{formatDateTime(snap.createdAt)}</span>
                  {i === 0 && <span className={css.latest}>Latest</span>}
                </span>
                <span className="num">{formatRupees(snap.roundedTotal)}</span>
                <button type="button" className="btn btn--ghost" onClick={() => openSnapshot(snap)}>
                  <Icon name="download" size={16} />
                  PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={css.danger}>
        <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={Boolean(busy)}>
          <Icon name="trash" size={18} />
          Delete quote
        </button>
      </div>
    </div>
  )
}
