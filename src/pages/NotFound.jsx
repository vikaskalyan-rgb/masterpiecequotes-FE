import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="center-state">
      <h1 style={{ fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>Nothing here</h1>
      <p>This link doesn't match any screen.</p>
      <Link className="btn btn--primary" to="/">
        Back to quotes
      </Link>
    </div>
  )
}
