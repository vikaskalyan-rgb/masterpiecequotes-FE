import { BrowserRouter, Routes, Route } from 'react-router-dom'
import QuotesList from './pages/QuotesList'
import QuoteBuilder from './pages/QuoteBuilder'
import ComingSoon from './pages/ComingSoon'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuotesList />} />
        <Route path="/quotes/new" element={<QuoteBuilder />} />
        <Route path="/quotes/:id/edit" element={<QuoteBuilder />} />
        <Route path="/quotes/:id" element={<ComingSoon label="Quote View" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App