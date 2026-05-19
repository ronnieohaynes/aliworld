import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function AuthPanel() {
  const { user, loading, configured, signInWithEmail, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return <div className="auth-chip">…</div>
  }

  if (!configured) {
    return (
      <div className="auth-pop">
        <button type="button" className="auth-chip auth-chip--warn" onClick={() => setOpen((o) => !o)}>
          offline
        </button>
        {open ? (
          <p className="auth-status auth-status--narrow">
            Copy .env.example to .env and add your Supabase URL and anon key from the project dashboard.
          </p>
        ) : null}
      </div>
    )
  }

  if (user) {
    return (
      <div className="auth-row">
        <span className="auth-chip auth-chip--ok" title={user.email ?? user.id}>
          {user.email?.split('@')[0] ?? 'player'}
        </span>
        <button type="button" className="auth-link" onClick={() => void signOut()}>
          out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-pop">
      <button type="button" className="auth-chip" onClick={() => setOpen((o) => !o)}>
        sign in
      </button>
      {open ? (
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setStatus(null)
            const { error } = await signInWithEmail(email.trim())
            setBusy(false)
            setStatus(error ? error.message : 'Check your email for the magic link.')
          }}
        >
          <input
            className="auth-input"
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            autoComplete="email"
          />
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? '…' : 'send link'}
          </button>
          {status ? <p className="auth-status">{status}</p> : null}
        </form>
      ) : null}
    </div>
  )
}
