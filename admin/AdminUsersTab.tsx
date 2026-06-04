import { useMemo, useState } from 'react'
import { downloadUsersCsv, formatJoinedDate } from './analyticsApi'
import type { AdminUserRow } from './types'

type Props = {
  rows: AdminUserRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function AdminUsersTab({ rows, loading, error, onRefresh }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => {
      const email = row.email.toLowerCase()
      const handle = (row.handle ?? '').toLowerCase()
      return email.includes(needle) || handle.includes(needle)
    })
  }, [query, rows])

  return (
    <div className="admin-users">
      <div className="admin-users__toolbar">
        <p className="admin-users__count">
          {loading ? 'loading accounts…' : `${filtered.length} account${filtered.length === 1 ? '' : 's'}`}
          {query.trim() && filtered.length !== rows.length ? ` (of ${rows.length})` : null}
        </p>
        <div className="admin-users__actions">
          <input
            type="search"
            className="admin-users__search"
            placeholder="search email or handle"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
          <button
            type="button"
            className="admin-refresh"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="admin-users__export"
            onClick={() => downloadUsersCsv(filtered)}
            disabled={loading || filtered.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <section className="admin-panel admin-panel--hero">
          <h2>No accounts yet</h2>
          <p className="admin-empty">auth.users is empty — signups will appear here.</p>
        </section>
      ) : null}

      {!loading && !error && rows.length > 0 && filtered.length === 0 ? (
        <p className="admin-empty">No accounts match your search.</p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--users">
            <thead>
              <tr>
                <th>Email</th>
                <th>Handle</th>
                <th>Level</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.email}-${row.joined}`}>
                  <td>{row.email || '—'}</td>
                  <td>{row.handle ? `@${row.handle}` : '—'}</td>
                  <td>{row.level}</td>
                  <td>{formatJoinedDate(row.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
