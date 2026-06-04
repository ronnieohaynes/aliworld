import { useMemo, useState } from 'react'
import {
  deleteEmailSignup,
  downloadCombinedEmailsCsv,
  formatJoinedDate,
} from './analyticsApi'
import type { CombinedEmailRow, EmailSignupRow } from './types'

type Props = {
  adminSecret: string
  signups: EmailSignupRow[]
  combined: CombinedEmailRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  showToast: (message: string) => void
}

type EmailView = 'signups' | 'combined'

export function AdminEmailsTab({
  adminSecret,
  signups,
  combined,
  loading,
  error,
  onRefresh,
  showToast,
}: Props) {
  const [view, setView] = useState<EmailView>('signups')
  const [query, setQuery] = useState('')
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)

  const filteredSignups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return signups
    return signups.filter((row) => row.email.toLowerCase().includes(needle))
  }, [query, signups])

  const filteredCombined = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return combined
    return combined.filter((row) => row.email.toLowerCase().includes(needle))
  }, [query, combined])

  const handleDeleteSignup = async (email: string) => {
    setDeletingEmail(email)
    try {
      const { deleted } = await deleteEmailSignup(adminSecret, email)
      showToast(deleted ? `removed ${email}` : `no row for ${email}`)
      onRefresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingEmail(null)
    }
  }

  return (
    <div className="admin-emails">
      <div className="admin-users__toolbar">
        <div className="admin-tabs admin-tabs--inline">
          <button
            type="button"
            className={`admin-tabs__btn${view === 'signups' ? ' admin-tabs__btn--active' : ''}`}
            onClick={() => setView('signups')}
          >
            waitlist signups
          </button>
          <button
            type="button"
            className={`admin-tabs__btn${view === 'combined' ? ' admin-tabs__btn--active' : ''}`}
            onClick={() => setView('combined')}
          >
            combined list
          </button>
        </div>
        <div className="admin-users__actions">
          <input
            type="search"
            className="admin-users__search"
            placeholder="search email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search emails"
          />
          <button type="button" className="admin-refresh" onClick={onRefresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {view === 'combined' ? (
            <button
              type="button"
              className="admin-users__export"
              onClick={() => downloadCombinedEmailsCsv(filteredCombined)}
              disabled={loading || filteredCombined.length === 0}
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {view === 'signups' ? (
        <>
          <p className="admin-users__count">
            {loading ? 'loading…' : `${filteredSignups.length} waitlist signup${filteredSignups.length === 1 ? '' : 's'}`}
          </p>
          {!loading && filteredSignups.length === 0 ? (
            <p className="admin-empty">No waitlist signups yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Joined</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredSignups.map((row) => (
                    <tr key={row.email}>
                      <td>{row.email}</td>
                      <td>{formatJoinedDate(row.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-detail__btn admin-detail__btn--small"
                          disabled={deletingEmail === row.email}
                          onClick={() => void handleDeleteSignup(row.email)}
                        >
                          {deletingEmail === row.email ? '…' : 'delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="admin-users__count">
            {loading ? 'loading…' : `${filteredCombined.length} mailing-list row${filteredCombined.length === 1 ? '' : 's'}`}
          </p>
          {!loading && filteredCombined.length === 0 ? (
            <p className="admin-empty">No emails yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCombined.map((row, index) => (
                    <tr key={`${row.email}-${row.source}-${index}`}>
                      <td>{row.email}</td>
                      <td>{row.source}</td>
                      <td>{formatJoinedDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
