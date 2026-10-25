import { useEffect, useLayoutEffect, useRef } from 'react'
import css from './Sheet.module.css'

// Accessible modal: bottom sheet on phones, centred dialog on wider screens. Escape and the
// backdrop close it; focus moves into it and returns to where it was on close.
export default function Sheet({ open, title, children, onClose, labelledBy }) {
  const panel = useRef(null)
  const lastFocus = useRef(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  // Depends on `open` only: re-running on every render would yank focus back to the first field.
  useEffect(() => {
    if (!open) return undefined
    lastFocus.current = document.activeElement
    const first = panel.current?.querySelector('button, [href], input, select, textarea')
    first?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab' && panel.current) {
        const focusable = panel.current.querySelectorAll('button:not(:disabled), [href], input, select, textarea')
        if (!focusable.length) return
        const firstEl = focusable[0]
        const lastEl = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      lastFocus.current?.focus?.()
    }
  }, [open])

  if (!open) return null
  const headingId = labelledBy || 'sheet-title'
  return (
    <div className={css.backdrop} onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div ref={panel} className={css.panel} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <span className={css.grabber} aria-hidden="true" />
        {title && (
          <h2 id={headingId} className={css.title}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}

export function ConfirmSheet({ open, title, message, confirmLabel, tone = 'danger', busy, onConfirm, onClose }) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <p className={css.message}>{message}</p>
      <div className={css.actions}>
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${tone === 'danger' ? css.danger : 'btn--primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
