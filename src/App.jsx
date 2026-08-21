import { BrowserRouter, Routes, Route } from 'react-router-dom'
import QuotesList from './pages/QuotesList'
import ComingSoon from './pages/ComingSoon'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuotesList />} />
        <Route path="/quotes/new" element={<ComingSoon label="New Quote" />} />
        <Route path="/quotes/:id" element={<ComingSoon label="Quote Detail" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
