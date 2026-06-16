import { formatDateTime } from './analyticsApi'
import type { RecentEventRow } from './types'

type Props = {
  rows: RecentEventRow[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function AdminEventsTab({ rows, loading, error, onRefresh }: Props) {
  return (
    <div className="admin-events">
      <div className="admin-users__toolbar">
        <p className="admin-users__count">
          {loading ? 'loading events…' : `latest ${rows.length} events`}
        </p>
        <button type="button" className="admin-refresh" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="admin-empty">No events yet, play the game and refresh.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="admin-events__list">
          {rows.map((row) => (
            <article key={row.id} className="admin-events__item">
              <header className="admin-events__head">
                <span className="admin-events__time">{formatDateTime(row.ts)}</span>
                <span className="admin-events__type">{row.type}</span>
                <span className="admin-events__who">
                  {row.handle ? `@${row.handle}` : row.user_id ? row.user_id.slice(0, 8) : 'anon'}
                </span>
              </header>
              <pre className="admin-detail__json admin-events__meta">
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
