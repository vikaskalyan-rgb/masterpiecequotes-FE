import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import QuotePdfTemplate from '../components/QuotePdfTemplate'
import { generateQuotePdfBlob, pdfFileNameFor, buildWhatsAppMessage, normalizePhone } from '../utils/pdf'
import { STATUS_META } from '../utils/format'

export default function QuoteView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [pdfBlob, setPdfBlob] = useState(null)
  const [actionError, setActionError] = useState(null)

  const captureRef = useRef(null) // full-size, off-screen - used for actual PDF capture
  const previewContainerRef = useRef(null)
  const previewContentRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [previewHeight, setPreviewHeight] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .getQuote(id)
      .then((q) => {
        if (!cancelled) setQuote(q)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load this quote')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Scale the 780px-wide template down to fit the phone screen for on-screen preview.
  useLayoutEffect(() => {
    function recalc() {
      if (!previewContainerRef.current || !previewContentRef.current) return
      const containerWidth = previewContainerRef.current.offsetWidth
      const s = containerWidth / 780
      setScale(s)
      setPreviewHeight(previewContentRef.current.scrollHeight * s)
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [quote])

  async function handleGenerate() {
    setActionError(null)
    setGenerating(true)
    try {
      const blob = await generateQuotePdfBlob(captureRef.current)
      setPdfBlob(blob)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      setActionError(err.message || 'Could not generate the PDF')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload() {
    let blob = pdfBlob
    if (!blob) {
      setGenerating(true)
      try {
        blob = await generateQuotePdfBlob(captureRef.current)
        setPdfBlob(blob)
      } catch (err) {
        setActionError(err.message || 'Could not generate the PDF')
        setGenerating(false)
        return
      }
      setGenerating(false)
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFileNameFor(quote.customerName)
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleShareWhatsApp() {
    setActionError(null)
    setSharing(true)
    try {
      let blob = pdfBlob
      if (!blob) {
        blob = await generateQuotePdfBlob(captureRef.current)
        setPdfBlob(blob)
      }
      const fileName = pdfFileNameFor(quote.customerName)
      const message = buildWhatsAppMessage(quote)
      const phone = normalizePhone(quote.customerPhone)
      const file = new File([blob], fileName, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: message, title: fileName })
      } else {
        // Fallback for browsers without file-sharing support (mostly desktop):
        // download the PDF, then open a WhatsApp chat with the message so it can be attached manually.
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
      }

      // Reflect real-world workflow: sharing a quote generally means it's been sent.
      if (quote.status === 'DRAFT') {
        const updated = await api.updateQuoteStatus(id, 'SENT')
        setQuote(updated)
      }
    } catch (err) {
      // AbortError just means the user closed the native share sheet - not a real error.
      if (err.name !== 'AbortError') {
        setActionError(err.message || 'Could not share on WhatsApp')
      }
    } finally {
      setSharing(false)
    }
  }

  function handleOpenChat() {
    if (!quote) return
    const phone = normalizePhone(quote.customerPhone)
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  if (loading) {
    return (
      <div className="qv-state">
        <div className="qv-spinner" />
        <span>Loading…</span>
        <style>{`
          .qv-state { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; }
          .qv-spinner { width:24px; height:24px; border:2.5px solid var(--rule); border-top-color:var(--slate); border-radius:50%; animation: qv-spin 0.7s linear infinite; }
          @keyframes qv-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (loadError || !quote) {
    return (
      <div className="qv-state">
        <span>Couldn't load this quote. {loadError}</span>
        <button className="qv-back-link" onClick={() => navigate('/')}>
          Back to Quotes
        </button>
        <style>{`
          .qv-state { min-height: 100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--ink-soft); font-size:14px; padding:24px; text-align:center; }
          .qv-back-link { border:1px solid var(--ink); background:transparent; padding:10px 20px; border-radius:10px; font-weight:600; }
        `}</style>
      </div>
    )
  }

  const status = STATUS_META[quote.status] || STATUS_META.DRAFT

  return (
    <div className="qv-page">
      <header className="qv-header">
        <button className="qv-header-back" onClick={() => navigate('/')} aria-label="Back">
          ←
        </button>
        <div className="qv-header-mid">
          <h1 className="qv-header-title">{quote.customerName}</h1>
          <span className="qv-header-status" style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
        </div>
        <button className="qv-header-edit" onClick={() => navigate(`/quotes/${id}/edit`)}>
          Edit
        </button>
      </header>

      <main className="qv-body">
        <div className="qv-preview-wrap" ref={previewContainerRef} style={{ height: previewHeight }}>
          <div
            className="qv-preview-scale"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 780 }}
          >
            <div ref={previewContentRef}>
              <QuotePdfTemplate quote={quote} />
            </div>
          </div>
        </div>

        {actionError && <p className="qv-error-text">{actionError}</p>}

        <div className="qv-actions">
          <button className="qv-btn qv-btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate PDF'}
          </button>
          <button className="qv-btn qv-btn-secondary" onClick={handleDownload} disabled={generating}>
            Download PDF
          </button>
          <button
            className="qv-btn qv-btn-whatsapp"
            onClick={handleShareWhatsApp}
            disabled={sharing || generating}
          >
            {sharing ? 'Sharing…' : 'Share PDF on WhatsApp'}
          </button>
          <button className="qv-btn qv-btn-ghost" onClick={handleOpenChat}>
            Open WhatsApp Chat
          </button>
        </div>
      </main>

      {/* Hidden full-resolution copy used only for PDF capture - kept off-screen so the
          on-screen preview's CSS transform:scale never interferes with html2canvas. */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={captureRef}>
          <QuotePdfTemplate quote={quote} />
        </div>
      </div>

      <style>{`
        .qv-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          padding-bottom: 40px;
        }
        .qv-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 20px;
          background: linear-gradient(160deg, #2c2831 0%, #201d22 100%);
          border-radius: 0 0 22px 22px;
          box-shadow: 0 8px 24px rgba(35, 33, 38, 0.18);
        }
        .qv-header-back {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: var(--bg);
          font-size: 17px;
          flex-shrink: 0;
        }
        .qv-header-mid {
          flex: 1;
          min-width: 0;
        }
        .qv-header-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--bg);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .qv-header-status {
          display: inline-block;
          margin-top: 3px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 100px;
        }
        .qv-header-edit {
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.25);
          background: transparent;
          color: var(--bg);
          font-size: 13px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 9px;
        }
        .qv-body {
          padding: 18px 20px 0;
        }
        .qv-preview-wrap {
          overflow: hidden;
          border-radius: 14px;
          box-shadow: 0 6px 24px rgba(35, 33, 38, 0.14);
          border: 1px solid var(--rule);
          background: var(--paper);
        }
        .qv-error-text {
          color: var(--brick);
          font-size: 13px;
          text-align: center;
          padding: 14px 0 0;
        }
        .qv-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
        }
        .qv-btn {
          width: 100%;
          padding: 15px;
          border-radius: 13px;
          font-size: 14.5px;
          font-weight: 600;
          border: none;
        }
        .qv-btn:disabled {
          opacity: 0.6;
        }
        .qv-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .qv-btn-primary {
          background: var(--ink);
          color: var(--bg);
          box-shadow: 0 8px 20px rgba(35, 33, 38, 0.25);
        }
        .qv-btn-secondary {
          background: var(--paper);
          color: var(--ink);
          border: 1px solid var(--rule);
        }
        .qv-btn-whatsapp {
          background: var(--sage);
          color: var(--bg);
          box-shadow: 0 8px 20px rgba(107, 143, 113, 0.3);
        }
        .qv-btn-ghost {
          background: transparent;
          color: var(--slate);
          border: 1px solid var(--rule);
        }
      `}</style>
    </div>
  )
}