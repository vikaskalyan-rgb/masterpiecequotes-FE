import { useCallback, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import css from './Toast.module.css'
import { ToastContext } from './toastContext'

// One toast at a time, announced to screen readers. Destructive actions offer "Undo" here
// instead of a confirmation dialog, so the common path stays one tap.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((message, { action, tone = 'neutral', duration = 5000 } = {}) => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, action, tone })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), duration)
  }, [])

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={css.region} aria-live="polite" role="status">
        {toast && (
          <div key={toast.id} className={`${css.toast} ${css[toast.tone] || ''}`}>
            {toast.tone === 'danger' && <Icon name="alert" size={18} />}
            <span className={css.message}>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className={css.action}
                onClick={() => {
                  toast.action.onClick()
                  dismiss()
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className={css.close} onClick={dismiss} aria-label="Dismiss">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

