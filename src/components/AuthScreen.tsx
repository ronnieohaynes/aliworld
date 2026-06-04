import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  getAuthState,
  requestPasswordReset,
  signIn,
  signUp,
} from '../store/authStore'
import './AuthScreen.css'

type Mode = 'login' | 'signup' | 'forgot'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const switchMode = useCallback((next: Mode) => {
    setMode(next)
    setError(null)
    setMessage(null)
    setTermsAccepted(false)
    if (next !== 'login') setPassword('')
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError(null)
      setMessage(null)

      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        setError('email required.')
        return
      }

      if (mode === 'forgot') {
        setSubmitting(true)
        try {
          const result = await requestPasswordReset(trimmedEmail)
          if (result.error) {
            setError(result.error)
            return
          }
          setMessage('reset link sent — check your email.')
        } finally {
          setSubmitting(false)
        }
        return
      }

      if (!password) {
        setError('email and password required.')
        return
      }

      if (mode === 'signup' && !termsAccepted) {
        setError('accept the terms to create an account.')
        return
      }

      setSubmitting(true)
      try {
        if (mode === 'login') {
          const result = await signIn(trimmedEmail, password)
          if (result.error) {
            setError(result.error)
          }
          return
        }

        const result = await signUp(trimmedEmail, password)
        if (result.error) {
          setError(result.error)
          return
        }

        if (result.needsEmailConfirmation || getAuthState().status !== 'signed-in') {
          setMessage('check your email to confirm your account, then log in.')
          setPassword('')
          setMode('login')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [email, mode, password, termsAccepted],
  )

  const submitDisabled =
    submitting ||
    !email.trim() ||
    (mode !== 'forgot' && !password) ||
    (mode === 'signup' && !termsAccepted)

  const title =
    mode === 'login' ? 'log in' : mode === 'signup' ? 'sign up' : 'reset password'

  const submitLabel =
    submitting
      ? 'one sec…'
      : mode === 'login'
        ? 'log in'
        : mode === 'signup'
          ? 'create account'
          : 'send reset link'

  return (
    <div className="auth-screen" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="auth-screen__panel">
        <h1 className="auth-screen__title">{title}</h1>

        {mode === 'forgot' && (
          <p className="auth-screen__hint">
            enter your email — we&apos;ll send a link to set a new password.
          </p>
        )}

        <form className="auth-screen__form" onSubmit={handleSubmit}>
          <label className="auth-screen__field">
            <span className="auth-screen__label">email</span>
            <input
              className="auth-screen__input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </label>

          {mode !== 'forgot' && (
            <label className="auth-screen__field">
              <span className="auth-screen__label">password</span>
              <input
                className="auth-screen__input"
                type="password"
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </label>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="auth-screen__link"
              onClick={() => switchMode('forgot')}
              disabled={submitting}
            >
              forgot password?
            </button>
          )}

          {mode === 'signup' && (
            <label className="auth-screen__terms">
              <input
                className="auth-screen__checkbox"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={submitting}
              />
              <span>i accept the terms of service</span>
            </label>
          )}

          {error && (
            <p className="auth-screen__error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-screen__message" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="auth-screen__submit"
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
        </form>

        {mode === 'forgot' ? (
          <button
            type="button"
            className="auth-screen__toggle"
            onClick={() => switchMode('login')}
            disabled={submitting}
          >
            back to log in
          </button>
        ) : (
          <button
            type="button"
            className="auth-screen__toggle"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            disabled={submitting}
          >
            {mode === 'login' ? 'new here? sign up' : 'already have an account? log in'}
          </button>
        )}
      </div>
    </div>
  )
}
