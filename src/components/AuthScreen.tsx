import { useCallback, useState, type FormEvent } from 'react'
import { getAuthState, signIn, signUp } from '../store/authStore'
import './AuthScreen.css'

type Mode = 'login' | 'signup'

function toFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'wrong email or password.'
  if (lower.includes('user already registered')) return 'that email is already taken.'
  if (lower.includes('email not confirmed')) return 'confirm your email first, then log in.'
  if (lower.includes('password') && lower.includes('least')) return 'password is too short.'
  if (lower.includes('valid email')) return 'that email does not look right.'
  return message.toLowerCase()
}

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
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError(null)
      setMessage(null)

      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
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
            setError(toFriendlyAuthError(result.error))
          }
          return
        }

        const result = await signUp(trimmedEmail, password)
        if (result.error) {
          setError(toFriendlyAuthError(result.error))
          return
        }

        if (getAuthState().status !== 'signed-in') {
          setMessage('check your email to confirm your account, then log in.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [email, mode, password, termsAccepted],
  )

  const submitDisabled =
    submitting || !email.trim() || !password || (mode === 'signup' && !termsAccepted)

  return (
    <div className="auth-screen" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="auth-screen__panel">
        <h1 className="auth-screen__title">{mode === 'login' ? 'log in' : 'sign up'}</h1>

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
            {submitting
              ? 'one sec…'
              : mode === 'login'
                ? 'log in'
                : 'create account'}
          </button>
        </form>

        <button
          type="button"
          className="auth-screen__toggle"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          disabled={submitting}
        >
          {mode === 'login' ? 'new here? sign up' : 'already have an account? log in'}
        </button>
      </div>
    </div>
  )
}
