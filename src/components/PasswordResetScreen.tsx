import { useCallback, useState, type FormEvent } from 'react'
import { updatePassword } from '../store/authStore'
import { clearAuthParamsFromUrl } from '../utils/authRoutes'
import './AuthScreen.css'

const MIN_PASSWORD_LENGTH = 6

export function PasswordResetScreen() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError(null)
      setMessage(null)

      if (password.length < MIN_PASSWORD_LENGTH) {
        setError('password is too short.')
        return
      }
      if (password !== confirm) {
        setError('passwords do not match.')
        return
      }

      setSubmitting(true)
      try {
        const result = await updatePassword(password)
        if (result.error) {
          setError(result.error)
          return
        }
        clearAuthParamsFromUrl()
        setMessage('password updated — you are signed in.')
      } finally {
        setSubmitting(false)
      }
    },
    [confirm, password],
  )

  return (
    <div className="auth-screen" role="dialog" aria-modal="true" aria-label="Reset password">
      <div className="auth-screen__panel">
        <h1 className="auth-screen__title">new password</h1>
        <p className="auth-screen__hint">pick a new password for your account.</p>

        <form className="auth-screen__form" onSubmit={handleSubmit}>
          <label className="auth-screen__field">
            <span className="auth-screen__label">new password</span>
            <input
              className="auth-screen__input"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || message != null}
            />
          </label>

          <label className="auth-screen__field">
            <span className="auth-screen__label">confirm password</span>
            <input
              className="auth-screen__input"
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting || message != null}
            />
          </label>

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

          {!message && (
            <button
              type="submit"
              className="auth-screen__submit"
              disabled={submitting || !password || !confirm}
            >
              {submitting ? 'one sec…' : 'update password'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
