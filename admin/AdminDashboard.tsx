import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminDangerZone } from './AdminDangerZone'
import { AdminUsersTab } from './AdminUsersTab'
import { fetchAdminUsers, fetchAnalyticsSummary } from './analyticsApi'
import { isAnalyticsEmpty, type AdminUserRow, type AnalyticsSummary } from './types'

const CHART = {
  grid: '#2e2840',
  axis: '#7f77dd',
  line: '#afa9ec',
  line2: '#534ab7',
  bar: '#534ab7',
  bar2: '#7f77dd',
  text: '#f4e8c1',
  muted: '#9696b0',
}

function formatDay(day: string): string {
  return day.slice(5)
}

type TabId = 'stats' | 'users'

type Props = {
  adminSecret: string
}

export function AdminDashboard({ adminSecret }: Props) {
  const [tab, setTab] = useState<TabId>('stats')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAnalyticsSummary(adminSecret, 30)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [adminSecret])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const data = await fetchAdminUsers(adminSecret)
      setUsers(data)
      setUsersLoaded(true)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [adminSecret])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (tab === 'users' && !usersLoaded && !usersLoading) {
      void loadUsers()
    }
  }, [tab, usersLoaded, usersLoading, loadUsers])

  const dauSeries = useMemo(
    () => [...(summary?.dau ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
    [summary],
  )

  const signupSeries = useMemo(
    () => [...(summary?.signups ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
    [summary],
  )

  const empty = summary ? isAnalyticsEmpty(summary) : false

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div>
          <p className="admin-header__eyebrow">cult.18 · mothership</p>
          <h1>ALIWORLD analytics</h1>
          <p className="admin-header__sub">
            {tab === 'stats' ? 'aggregate telemetry · no raw player rows' : 'live account roster · service role via edge'}
          </p>
        </div>
        {tab === 'stats' ? (
          <button
            type="button"
            className="admin-refresh"
            onClick={() => void loadSummary()}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        ) : null}
      </header>

      <nav className="admin-tabs" aria-label="Dashboard sections">
        <button
          type="button"
          className={`admin-tabs__btn${tab === 'stats' ? ' admin-tabs__btn--active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Stats
        </button>
        <button
          type="button"
          className={`admin-tabs__btn${tab === 'users' ? ' admin-tabs__btn--active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </button>
      </nav>

      {tab === 'users' ? (
        <AdminUsersTab
          rows={users}
          loading={usersLoading}
          error={usersError}
          onRefresh={() => void loadUsers()}
        />
      ) : (
        <>
          {error ? <p className="admin-error">{error}</p> : null}

          {!loading && empty ? (
            <section className="admin-panel admin-panel--hero">
              <h2>Not enough data yet</h2>
              <p className="admin-empty">
                Events are flowing into <code>aw_events</code> — check back after more play sessions.
              </p>
            </section>
          ) : null}

          <div className="admin-stats">
            <div className="admin-stat admin-stat--hero">
              <span className="admin-stat__label">Avg session (est. min)</span>
              <span className="admin-stat__value">
                {summary ? summary.avgSessionMinutes.toFixed(1) : '—'}
              </span>
              <span className="admin-stat__hint">from heartbeat cadence</span>
            </div>
            <div className="admin-stat admin-stat--hero">
              <span className="admin-stat__label">Theater opens (30d)</span>
              <span className="admin-stat__value">
                {summary ? summary.theaterOpens.toLocaleString() : '—'}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Latest DAU</span>
              <span className="admin-stat__value">
                {dauSeries.length ? dauSeries[dauSeries.length - 1]!.count : '—'}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Quest steps tracked</span>
              <span className="admin-stat__value">
                {summary ? summary.questDropoff.length : '—'}
              </span>
            </div>
          </div>

          <div className="admin-grid admin-grid--charts">
            <section className="admin-panel">
              <h2>Daily active (app_open)</h2>
              {dauSeries.length === 0 ? (
                <p className="admin-empty">No DAU data yet</p>
              ) : (
                <div className="admin-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dauSeries}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickFormatter={formatDay} stroke={CHART.axis} fontSize={11} />
                      <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                        labelStyle={{ color: CHART.text }}
                      />
                      <Line type="monotone" dataKey="count" stroke={CHART.line} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <h2>Signups</h2>
              {signupSeries.length === 0 ? (
                <p className="admin-empty">No signup data yet</p>
              ) : (
                <div className="admin-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={signupSeries}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickFormatter={formatDay} stroke={CHART.axis} fontSize={11} />
                      <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                        labelStyle={{ color: CHART.text }}
                      />
                      <Line type="monotone" dataKey="count" stroke={CHART.line2} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-panel admin-panel--wide">
              <h2>Quest drop-off</h2>
              <p className="admin-panel__lede">distinct players per step — where the funnel thins</p>
              {!summary?.questDropoff.length ? (
                <p className="admin-empty">No quest steps yet</p>
              ) : (
                <div className="admin-chart admin-chart--tall">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={summary.questDropoff} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="step"
                        width={120}
                        stroke={CHART.axis}
                        fontSize={10}
                        tick={{ fill: CHART.muted }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                        labelStyle={{ color: CHART.text }}
                      />
                      <Bar dataKey="players" fill={CHART.bar} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <h2>Episode completion</h2>
              {!summary?.episodeCompletion.length ? (
                <p className="admin-empty">No episodes completed yet</p>
              ) : (
                <div className="admin-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={summary.episodeCompletion}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="episode" stroke={CHART.axis} fontSize={11} />
                      <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                        labelStyle={{ color: CHART.text }}
                      />
                      <Bar dataKey="players" fill={CHART.bar2} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <h2>Build popularity</h2>
              {!summary?.buildPopularity.length ? (
                <p className="admin-empty">No build names yet</p>
              ) : (
                <div className="admin-chart admin-chart--tall">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={summary.buildPopularity} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="build"
                        width={100}
                        stroke={CHART.axis}
                        fontSize={10}
                        tick={{ fill: CHART.muted }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                        labelStyle={{ color: CHART.text }}
                      />
                      <Bar dataKey="players" fill={CHART.bar} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="admin-panel admin-panel--wide">
              <h2>Funnel clicks</h2>
              <p className="admin-panel__lede">streams · merch · theater — the money signal</p>
              {!summary?.funnelClicks.length ? (
                <p className="admin-empty">No external clicks yet</p>
              ) : (
                <div className="admin-chart">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={summary.funnelClicks}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                      <XAxis dataKey="destination" stroke={CHART.axis} fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                        labelStyle={{ color: CHART.text }}
                      />
                      <Bar dataKey="clicks" fill="#c084fc" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {summary?.battleStats.length ? (
            <section className="admin-panel admin-panel--wide">
              <h2>Battle stats</h2>
              <div className="admin-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={summary.battleStats}>
                    <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="enemy" stroke={CHART.axis} fontSize={10} />
                    <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#151020', border: '1px solid #534ab7' }}
                      labelStyle={{ color: CHART.text }}
                    />
                    <Legend wrapperStyle={{ color: CHART.muted, fontSize: 11 }} />
                    <Bar dataKey="wins" fill="#3a9e58" stackId="a" />
                    <Bar dataKey="losses" fill="#b03838" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Enemy</th>
                      <th>Wins</th>
                      <th>Losses</th>
                      <th>Avg turns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.battleStats.map((row) => (
                      <tr key={row.enemy}>
                        <td>{row.enemy}</td>
                        <td>{row.wins}</td>
                        <td>{row.losses}</td>
                        <td>{row.avgTurns ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <AdminDangerZone adminSecret={adminSecret} onCleared={() => void loadSummary()} />
        </>
      )}

      <footer className="admin-footer">
        Edge function <code>analytics-summary</code> · RPC <code>db/003_analytics_summary_rpc.sql</code>
        · service role never in browser
      </footer>
    </div>
  )
}
