import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGymLeaderboard, type GymLeaderboardEntry } from '../lib/gymLeaderboardApi'
import {
  formatGymWeekCountdown,
  getGymWeekPhase,
  getGymWeekRemainingMs,
  type GymWeekPhase,
} from '../data/gymWeekSchedule'
import { LeaderboardVariantSprite } from './LeaderboardVariantSprite'
import { HandleWithEmblem } from './HandleWithEmblem'
import './GymLeaderboardScreen.css'

type Props = {
  viewerHandle?: string | null
  announcement?: string
  onClose: () => void
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty'; trackingSince: string; weekPhase: GymWeekPhase; frozen: boolean }
  | {
      kind: 'ready'
      trackingSince: string
      weekPhase: GymWeekPhase
      frozen: boolean
      entries: GymLeaderboardEntry[]
    }
  | { kind: 'error'; message: string }

function formatTrackingSince(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function GymLeaderboardScreen({ viewerHandle, announcement, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [remainingMs, setRemainingMs] = useState(() => getGymWeekRemainingMs())
  const [scoreKind, setScoreKind] = useState<'wins' | 'clears'>('wins')
  const weekPhase = getGymWeekPhase()

  const scoreLabel = scoreKind === 'clears' ? 'clears' : 'wins'

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchGymLeaderboard({ force })
      setScoreKind(data.scoreKind)
      if (data.entries.length === 0) {
        setState({
          kind: 'empty',
          trackingSince: data.trackingSince,
          weekPhase: data.weekPhase,
          frozen: data.frozen,
        })
      } else {
        setState({
          kind: 'ready',
          trackingSince: data.trackingSince,
          weekPhase: data.weekPhase,
          frozen: data.frozen,
          entries: data.entries,
        })
      }
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not load champions board.',
      })
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    const tick = () => setRemainingMs(getGymWeekRemainingMs())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const viewerRank = useMemo(() => {
    if (!viewerHandle || state.kind !== 'ready') return null
    const normalized = viewerHandle.toLowerCase()
    const idx = state.entries.findIndex((e) => e.handle.toLowerCase() === normalized)
    return idx >= 0 ? idx + 1 : null
  }, [state, viewerHandle])

  const podium = state.kind === 'ready' ? state.entries.slice(0, 3) : []
  const rest = state.kind === 'ready' ? state.entries.slice(3) : []

  const handleRefresh = async () => {
    if (state.kind === 'ready' && state.frozen) return
    if (state.kind === 'empty' && state.frozen) return
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  const trackingSince =
    state.kind === 'ready' || state.kind === 'empty' ? state.trackingSince : null

  const displayPhase: GymWeekPhase =
    state.kind === 'ready' || state.kind === 'empty' ? state.weekPhase : weekPhase

  const isFrozen =
    state.kind === 'ready' || state.kind === 'empty' ? state.frozen : displayPhase === 'completed'

  const countdownLabel =
    displayPhase === 'completed'
      ? 'GYM WEEK COMPLETED. CHECK BACK MONDAY FOR REWARDS.'
      : `gym week ends in ${formatGymWeekCountdown(remainingMs)}`

  return (
    <div className="gym-leaderboard" role="dialog" aria-label="Gym champions board">
      <div className="gym-leaderboard__backdrop" onClick={onClose} aria-hidden />
      <div className="gym-leaderboard__panel">
        <div
          className={`gym-leaderboard__countdown${
            displayPhase === 'completed' ? ' gym-leaderboard__countdown--completed' : ''
          }`}
          aria-live="polite"
        >
          {countdownLabel}
        </div>

        {announcement ? (
          <p className="gym-leaderboard__announcement" role="status">
            {announcement}
          </p>
        ) : null}

        <header className="gym-leaderboard__header">
          <div>
            <p className="gym-leaderboard__eyebrow">cult.18 · oceanview gym</p>
            <h1 className="gym-leaderboard__title">champions board</h1>
            {trackingSince ? (
              <p className="gym-leaderboard__sub">
                {isFrozen ? 'final standings · week ending ' : 'this week · since '}
                {formatTrackingSince(trackingSince)}
              </p>
            ) : null}
          </div>
          <div className="gym-leaderboard__header-actions">
            <button
              type="button"
              className="gym-leaderboard__btn"
              onClick={() => void handleRefresh()}
              disabled={refreshing || state.kind === 'loading' || isFrozen}
            >
              {refreshing ? 'refreshing…' : 'refresh'}
            </button>
            <button type="button" className="gym-leaderboard__btn" onClick={onClose}>
              close
            </button>
          </div>
        </header>

        {viewerRank != null ? (
          <p className="gym-leaderboard__you">you&apos;re #{viewerRank}</p>
        ) : null}

        {state.kind === 'loading' ? (
          <p className="gym-leaderboard__status">loading champions…</p>
        ) : null}

        {state.kind === 'error' ? (
          <div className="gym-leaderboard__status gym-leaderboard__status--error">
            <p>{state.message}</p>
            <button type="button" className="gym-leaderboard__btn" onClick={() => void load(true)}>
              try again
            </button>
          </div>
        ) : null}

        {state.kind === 'empty' ? (
          <p className="gym-leaderboard__status">no champions yet. be the first.</p>
        ) : null}

        {state.kind === 'ready' ? (
          <>
            <div className="gym-leaderboard__podium">
              {(
                [
                  { rank: 2, entry: podium[1] },
                  { rank: 1, entry: podium[0] },
                  { rank: 3, entry: podium[2] },
                ] as const
              ).map(({ rank, entry }) => {
                const placeClass =
                  rank === 1
                    ? 'gym-leaderboard__podium-slot--first'
                    : rank === 2
                      ? 'gym-leaderboard__podium-slot--second'
                      : 'gym-leaderboard__podium-slot--third'
                if (!entry) {
                  return (
                    <div
                      key={`empty-${rank}`}
                      className={`gym-leaderboard__podium-slot ${placeClass} gym-leaderboard__podium-slot--empty`}
                    />
                  )
                }
                const isViewer =
                  viewerHandle != null &&
                  entry.handle.toLowerCase() === viewerHandle.toLowerCase()
                return (
                  <div
                    key={entry.handle}
                    className={`gym-leaderboard__podium-slot ${placeClass}${
                      isViewer ? ' gym-leaderboard__podium-slot--you' : ''
                    }`}
                  >
                    <span className="gym-leaderboard__rank">#{rank}</span>
                    <LeaderboardVariantSprite
                      variantId={entry.variantId}
                      width={rank === 1 ? 72 : 60}
                      height={rank === 1 ? 72 : 60}
                      className="gym-leaderboard__sprite"
                    />
                    <span className="gym-leaderboard__handle">
                      {isViewer ? (
                        <HandleWithEmblem handle={entry.handle} />
                      ) : (
                        <>@{entry.handle}</>
                      )}
                    </span>
                    <span className="gym-leaderboard__wins">
                      {entry.winCount} {scoreLabel}
                    </span>
                  </div>
                )
              })}
            </div>

            {rest.length > 0 ? (
              <ol className="gym-leaderboard__list" start={4}>
                {rest.map((entry, i) => {
                  const rank = i + 4
                  const isViewer =
                    viewerHandle != null &&
                    entry.handle.toLowerCase() === viewerHandle.toLowerCase()
                  return (
                    <li
                      key={entry.handle}
                      className={`gym-leaderboard__list-row${
                        isViewer ? ' gym-leaderboard__list-row--you' : ''
                      }`}
                    >
                      <span className="gym-leaderboard__list-rank">#{rank}</span>
                      <span className="gym-leaderboard__list-handle">
                        {isViewer ? (
                          <HandleWithEmblem handle={entry.handle} />
                        ) : (
                          <>@{entry.handle}</>
                        )}
                      </span>
                      <span className="gym-leaderboard__list-wins">
                        {entry.winCount} {scoreLabel}
                      </span>
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
