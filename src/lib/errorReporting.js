import { api } from '../api/client'
import { currentAuthHeader } from './auth'

// Frontend crashes are sent to the backend log, so a broken screen gets noticed instead of
// silently failing on a phone. Throttled and de-duplicated so a crash loop can't flood it.
const sent = new Set()
let count = 0

export function reportError(error, context = '') {
  try {
    const message = `${context ? context + ': ' : ''}${error?.message || String(error)}`.slice(0, 2000)
    if (sent.has(message) || count >= 20 || !currentAuthHeader()) return
    sent.add(message)
    count++
    api
      .reportClientError({
        message,
        stack: (error?.stack || '').slice(0, 8000),
        url: window.location.pathname.slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 500),
        release: (import.meta.env.VITE_RELEASE || 'dev').slice(0, 64),
      })
      .catch(() => {})
  } catch {
    // Reporting must never throw.
  }
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (e) => reportError(e.error || e.message, 'window.onerror'))
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.name === 'AbortError' || e.reason?.name === 'ApiError') return
    reportError(e.reason, 'unhandledrejection')
  })
}
