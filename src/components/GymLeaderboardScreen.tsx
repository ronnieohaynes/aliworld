import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGymLeaderboard, type GymLeaderboardEntry } from '../lib/gymLeaderboardApi'
import { LeaderboardVariantSprite } from './LeaderboardVariantSprite'
import { HandleWithEmblem } from './HandleWithEmblem'
import './GymLeaderboardScreen.css'

type Props = {
  viewerHandle?: string | null
  onClose: () => void
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty'; trackingSince: string }
  | { kind: 'ready'; trackingSince: string; entries: GymLeaderboardEntry[] }
  | { kind: 'error'; message: string }

function formatTrackingSince(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function GymLeaderboardScreen({ viewerHandle, onClose }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchGymLeaderboard({ force })
      if (data.entries.length === 0) {
        setState({ kind: 'empty', trackingSince: data.trackingSince })
      } else {
        setState({ kind: 'ready', trackingSince: data.trackingSince, entries: data.entries })
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
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  const trackingSince =
    state.kind === 'ready' || state.kind === 'empty' ? state.trackingSince : null

  return (
    <div className="gym-leaderboard" role="dialog" aria-label="Gym champions board">
      <div className="gym-leaderboard__backdrop" onClick={onClose} aria-hidden />
      <div className="gym-leaderboard__panel">
        <header className="gym-leaderboard__header">
          <div>
            <p className="gym-leaderboard__eyebrow">cult.18 · oceanview gym</p>
            <h1 className="gym-leaderboard__title">champions board</h1>
            {trackingSince ? (
              <p className="gym-leaderboard__sub">
                total gym wins · tracking since {formatTrackingSince(trackingSince)}
              </p>
            ) : null}
          </div>
          <div className="gym-leaderboard__header-actions">
            <button
              type="button"
              className="gym-leaderboard__btn"
              onClick={() => void handleRefresh()}
              disabled={refreshing || state.kind === 'loading'}
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
                    <span className="gym-leaderboard__wins">{entry.winCount} wins</span>
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
                      <span className="gym-leaderboard__list-wins">{entry.winCount}</span>
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
