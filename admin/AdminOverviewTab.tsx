import { useMemo } from 'react'
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
import { formatDateTime, formatJoinedDate } from './analyticsApi'
import { SortableMetricTableHead, useMetricTableSort } from './SortableAdminTable'
import { isAnalyticsEmpty, type AnalyticsSummary, type MilestonesResponse } from './types'

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

type Props = {
  loading: boolean
  error: string | null
  summary: AnalyticsSummary | null
  milestones: MilestonesResponse | null
}

function formatMilestoneLabel(key: string): string {
  if (key.startsWith('level:')) return `Level ${key.slice(6)}`
  if (key.startsWith('episode:')) return `Episode ${key.slice(8).toUpperCase()}`
  return key
}

export function AdminOverviewTab({ loading, error, summary, milestones }: Props) {
  const dauSeries = useMemo(
    () => [...(summary?.dau ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
    [summary],
  )

  const signupSeries = useMemo(
    () => [...(summary?.signups ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
    [summary],
  )

  const empty = summary ? isAnalyticsEmpty(summary) : false

  const battleRows = useMemo(
    () =>
      (summary?.battleStats ?? []).map((row) => ({
        enemy: row.enemy,
        wins: row.wins,
        losses: row.losses,
        avgTurns: row.avgTurns ?? 0,
      })),
    [summary],
  )

  const {
    sorted: sortedBattleRows,
    toggleSort: toggleBattleSort,
    sortIndicator: battleSortIndicator,
  } = useMetricTableSort(battleRows, 'wins')

  const milestoneRows = useMemo(
    () =>
      (milestones?.rows ?? []).map((row) => ({
        milestone: formatMilestoneLabel(row.milestone_key),
        milestone_key: row.milestone_key,
        handle: row.handle ? `@${row.handle}` : row.user_id.slice(0, 8),
        achieved_at: row.achieved_at,
      })),
    [milestones],
  )

  const {
    sorted: sortedMilestones,
    toggleSort: toggleMilestoneSort,
    sortIndicator: milestoneSortIndicator,
  } = useMetricTableSort(milestoneRows, 'achieved_at')

  return (
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
              <SortableMetricTableHead
                columns={[
                  { key: 'enemy', label: 'Enemy' },
                  { key: 'wins', label: 'Wins', align: 'right' },
                  { key: 'losses', label: 'Losses', align: 'right' },
                  { key: 'avgTurns', label: 'Avg turns', align: 'right' },
                ]}
                toggleSort={toggleBattleSort}
                sortIndicator={battleSortIndicator}
              />
              <tbody>
                {sortedBattleRows.map((row) => (
                  <tr key={row.enemy}>
                    <td>{row.enemy}</td>
                    <td className="admin-table__num">{row.wins}</td>
                    <td className="admin-table__num">{row.losses}</td>
                    <td className="admin-table__num">{row.avgTurns || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="admin-panel admin-panel--wide">
        <h2>First to milestone</h2>
        <p className="admin-panel__lede">
          Write-once race board — only milestones hit after ship counts.
          {milestones?.tracking_since
            ? ` Tracking since ${formatJoinedDate(milestones.tracking_since)}.`
            : null}
        </p>
        {milestones?.table_missing ? (
          <p className="admin-error">
            Run <code>db/006_mothership_analytics.sql</code> in Supabase to enable first-to tracking.
          </p>
        ) : null}
        {milestoneRows.length === 0 ? (
          <p className="admin-empty">No first-to milestones recorded yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <SortableMetricTableHead
                columns={[
                  { key: 'milestone', label: 'Milestone' },
                  { key: 'handle', label: 'Player' },
                  { key: 'achieved_at', label: 'When' },
                ]}
                toggleSort={toggleMilestoneSort}
                sortIndicator={milestoneSortIndicator}
              />
              <tbody>
                {sortedMilestones.map((row) => (
                  <tr key={row.milestone_key}>
                    <td>{row.milestone}</td>
                    <td>{row.handle}</td>
                    <td>{formatDateTime(row.achieved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
