import { useEffect } from 'react'
import { useToast } from './toastContext'

// When a new version is deployed, offer to update instead of reloading in the middle of a quote.
export default function UpdatePrompt() {
  const toast = useToast()
  useEffect(() => {
    let cancelled = false
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return
        const update = registerSW({
          onNeedRefresh() {
            toast.show('A new version of the app is ready', {
              duration: 120000,
              action: { label: 'Update', onClick: () => update(true) },
            })
          },
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [toast])
  return null
}
