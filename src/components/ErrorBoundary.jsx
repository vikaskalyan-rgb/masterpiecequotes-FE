import { Component } from 'react'
import { reportError } from '../lib/errorReporting'

// Last line of defence: a crash shows a way out instead of a blank screen, and is reported.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportError(error, `render${info?.componentStack ? ' ' + info.componentStack.split('\n')[1]?.trim() : ''}`)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="center-state">
        <h1 style={{ fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>This screen hit a problem</h1>
        <p>Your saved quotes are safe. Unsaved changes are kept on this phone.</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.assign('/')}>
          Back to quotes
        </button>
      </div>
    )
  }
}
