import { Fragment, Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import UpdatePrompt from './components/UpdatePrompt'
import { currentAuthHeader, onAuthChange } from './lib/auth'
import Login from './pages/Login'
import QuotesList from './pages/QuotesList'
import QuoteBuilder from './pages/QuoteBuilder'
import NotFound from './pages/NotFound'

// PDF generation is heavy; it only loads when a quote is opened.
const QuoteView = lazy(() => import('./pages/QuoteView'))
const Insights = lazy(() => import('./pages/Insights'))
const Settings = lazy(() => import('./pages/Settings'))

// A fresh screen per URL: moving from one quote (or the new-quote form) to another never
// carries over state from the previous one.
function PerUrl({ children }) {
  const { pathname, search } = useLocation()
  return <Fragment key={pathname + search}>{children}</Fragment>
}

function Loading() {
  return (
    <div className="center-state" role="status">
      <div className="spinner" />
      <span className="visually-hidden">Loading</span>
    </div>
  )
}

export default function App() {
  const [signedIn, setSignedIn] = useState(() => Boolean(currentAuthHeader()))
  useEffect(() => onAuthChange(setSignedIn), [])

  return (
    <ToastProvider>
      <UpdatePrompt />
      <ErrorBoundary>
        {!signedIn ? (
          <Login />
        ) : (
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<QuotesList />} />
                <Route path="/quotes/new" element={<PerUrl><QuoteBuilder /></PerUrl>} />
                <Route path="/quotes/:id/edit" element={<PerUrl><QuoteBuilder /></PerUrl>} />
                <Route path="/quotes/:id" element={<PerUrl><QuoteView /></PerUrl>} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        )}
      </ErrorBoundary>
    </ToastProvider>
  )
}
