import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createProfile } from '../store/authStore'
import './HandlePickScreen.css'

const HANDLE_RE = /^[a-zA-Z0-9_]{3,16}$/

function validateHandle(raw: string): string | null {
  const handle = raw.trim()
  if (handle.length < 3 || handle.length > 16) {
    return 'handle must be 3–16 characters.'
  }
  if (!HANDLE_RE.test(handle)) {
    return 'letters, numbers, and _ only.'
  }
  return null
}

export function HandlePickScreen() {
  const [handle, setHandle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError(null)

      const validationError = validateHandle(handle)
      if (validationError) {
        setError(validationError)
        return
      }

      setSubmitting(true)
      try {
        const result = await createProfile(handle.trim())
        if (result.error) {
          setError(result.error)
        }
      } finally {
        setSubmitting(false)
      }
    },
    [handle],
  )

  return (
    <div className="handle-pick-screen" role="dialog" aria-modal="true" aria-label="Choose handle">
      <div className="handle-pick-screen__panel">
        <h1 className="handle-pick-screen__title">this is your name</h1>
        <p className="handle-pick-screen__hint">
          pick a handle. others will see it. 3–16 chars, letters, numbers, _.
        </p>

        <form className="handle-pick-screen__form" onSubmit={handleSubmit}>
          <label className="handle-pick-screen__field">
            <span className="handle-pick-screen__label">handle</span>
            <input
              className="handle-pick-screen__input"
              type="text"
              name="handle"
              autoComplete="username"
              maxLength={16}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={submitting}
            />
          </label>

          {error && (
            <p className="handle-pick-screen__error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="handle-pick-screen__submit"
            disabled={submitting || !handle.trim()}
          >
            {submitting ? 'one sec…' : 'confirm'}
          </button>
        </form>
      </div>
    </div>
  )
}
