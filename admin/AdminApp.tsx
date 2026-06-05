import { useCallback, useState } from 'react'
import { AdminDashboard } from './AdminDashboard'
import { hasAnalyticsClientConfig, verifyAdminSecret } from './analyticsApi'

const UNLOCK_KEY = 'aliworld_admin_secret'

function readStoredSecret(): string {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) ?? ''
  } catch {
    return ''
  }
}

export function AdminApp() {
  const [adminSecret, setAdminSecret] = useState(readStoredSecret)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const handleUnlock = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = password.trim()
      if (!trimmed) return
      setVerifying(true)
      setError(null)
      try {
        const ok = await verifyAdminSecret(trimmed)
        if (!ok) {
          sessionStorage.removeItem(UNLOCK_KEY)
          setAdminSecret('')
          setError('wrong password — locked.')
          return
        }
        sessionStorage.setItem(UNLOCK_KEY, trimmed)
        setAdminSecret(trimmed)
        setPassword('')
      } finally {
        setVerifying(false)
      }
    },
    [password],
  )

  if (!hasAnalyticsClientConfig()) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__sigil" aria-hidden>
          ◆
        </div>
        <h1>ALIWORLD mothership</h1>
        <p className="admin-gate__warn">
          Missing public Supabase config. Add to <code>.env.local</code>:
        </p>
        <pre className="admin-gate__code">
          {`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p>
          Deploy the <code>analytics-summary</code> edge function, run{' '}
          <code>db/003_analytics_summary_rpc.sql</code>, then{' '}
          <code>npm run admin:dev</code>.
        </p>
      </div>
    )
  }

  if (!adminSecret) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__sigil" aria-hidden>
          ◆
        </div>
        <h1>ALIWORLD mothership</h1>
        <p className="admin-gate__lede">analytics · aggregates only · cult.18 eyes only</p>
        <form className="admin-gate__form" onSubmit={handleUnlock}>
          <label htmlFor="admin-password">Access key</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={verifying}
          />
          <button type="submit" disabled={verifying || !password.trim()}>
            {verifying ? 'checking…' : 'Enter'}
          </button>
        </form>
        {error ? <p className="admin-gate__error">{error}</p> : null}
      </div>
    )
  }

  return <AdminDashboard adminSecret={adminSecret} />
}
