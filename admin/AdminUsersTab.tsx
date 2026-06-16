import { useMemo, useState } from 'react'
import { downloadUsersCsv, formatJoinedDate } from './analyticsApi'
import { SortableAdminTable, type ColumnDef } from './SortableAdminTable'
import type { AdminUserRow } from './types'

type Props = {
  rows: AdminUserRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onSelectUser: (userId: string) => void
}

function gymWinTotal(wins: Record<string, number>): number {
  return Object.values(wins).reduce((sum, n) => sum + n, 0)
}

export function AdminUsersTab({ rows, loading, error, onRefresh, onSelectUser }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => {
      const email = row.email.toLowerCase()
      const handle = (row.handle ?? '').toLowerCase()
      const build = row.build_name.toLowerCase()
      return email.includes(needle) || handle.includes(needle) || build.includes(needle)
    })
  }, [query, rows])

  const columns = useMemo((): ColumnDef<AdminUserRow>[] => [
    { key: 'email', label: 'Email' },
    {
      key: 'handle',
      label: 'Handle',
      render: (row) => (row.handle ? `@${row.handle}` : '—'),
    },
    { key: 'build_name', label: 'Build' },
    { key: 'level', label: 'Level', align: 'right' },
    { key: 'hours_played', label: 'Hours', align: 'right' },
    {
      key: 'gym_wins',
      label: 'Gym wins',
      align: 'right',
      compare: (a, b) => gymWinTotal(a.gym_wins) - gymWinTotal(b.gym_wins),
      render: (row) => String(gymWinTotal(row.gym_wins)),
    },
    {
      key: 'joined',
      label: 'Joined',
      render: (row) => formatJoinedDate(row.joined),
    },
  ], [])

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
            placeholder="search email, handle, or build"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
          <button type="button" className="admin-refresh" onClick={onRefresh} disabled={loading}>
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

      <p className="admin-panel__lede admin-users__hint">
        Hours and gym wins count from ship date only (session heartbeats + battle_end wins).
      </p>

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

      {!loading && filtered.length > 0 ? (
        <SortableAdminTable
          label="Users"
          rows={filtered}
          columns={columns}
          defaultSortKey="joined"
          defaultSortDir="desc"
          getRowKey={(row) => row.user_id}
          onRowClick={(row) => onSelectUser(row.user_id)}
        />
      ) : null}
    </div>
  )
}
