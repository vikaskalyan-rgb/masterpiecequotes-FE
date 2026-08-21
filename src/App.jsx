import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import QuotesList from './pages/QuotesList'
import QuoteBuilder from './pages/QuoteBuilder'

// QuoteView pulls in jsPDF + html2canvas (~900KB) - code-split so the home screen
// and builder stay light, and that weight only loads when a quote is actually opened.
const QuoteView = lazy(() => import('./pages/QuoteView'))

function RouteLoading() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)', fontSize: 14 }}>
      Loading…
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuotesList />} />
        <Route path="/quotes/new" element={<QuoteBuilder />} />
        <Route path="/quotes/:id/edit" element={<QuoteBuilder />} />
        <Route
          path="/quotes/:id"
          element={
            <Suspense fallback={<RouteLoading />}>
              <QuoteView />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App