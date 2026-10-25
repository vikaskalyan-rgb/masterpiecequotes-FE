import { useState } from 'react'
import { api } from '../api/client'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { encodeCredentials, setAuthHeader } from '../lib/auth'
import css from './Login.module.css'

export default function Login() {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    setError(null)
    const header = encodeCredentials(password)
    try {
      await api.checkPassword(header)
      setAuthHeader(header)
    } catch (err) {
      setError(err.status === 401 ? 'That password is not right.' : err.message)
      setBusy(false)
    }
  }

  return (
    <main className={css.page}>
      <div className={css.card}>
        <Logo size={56} />
        <h1 className={css.title}>Masterpiece Quotations</h1>
        <p className={css.sub}>Sign in to build and send quotes.</p>
        <form onSubmit={submit} className={css.form} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="password">
              Password
            </label>
            <div className={css.passwordRow}>
              <input
                id="password"
                className="input"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                autoFocus
              />
              <button
                type="button"
                className={css.reveal}
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
              >
                <Icon name="eye" size={18} />
              </button>
            </div>
            {error && (
              <p id="login-error" className="field__error" role="alert">
                {error}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
