import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { LeaderboardVariantSprite } from './LeaderboardVariantSprite'
import {
  acknowledgeGhostExplainer,
  beginGhostBattle,
  cacheChampionForBattle,
  dismissGhostTrainingNews,
  getGhostTrainingUiState,
  refreshGhostTraining,
  subscribeGhostTrainingStore,
} from '../store/ghostTrainingStore'
import type { GhostOpponentRef, GhostSnapshotPayload } from '../lib/ghostTrainingApi'
import './GhostTrainingScreen.css'

type Props = {
  onClose: () => void
  onFight: (combatId: string) => void
}

function snapshotForOpponent(
  snapshots: GhostSnapshotPayload[],
  ref: GhostOpponentRef,
): GhostSnapshotPayload | undefined {
  return snapshots.find((s) => s.source === ref.source && s.id === ref.id)
}

export function GhostTrainingScreen({ onClose, onFight }: Props) {
  const uiState = useSyncExternalStore(subscribeGhostTrainingStore, getGhostTrainingUiState)

  useEffect(() => {
    void refreshGhostTraining()
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

  const ready = uiState.kind === 'ready' ? uiState.data : null

  const dailyDone = useMemo(() => {
    if (!ready) return false
    return ready.dailyCompleted.length >= ready.opponents.length && ready.opponents.length > 0
  }, [ready])

  const handleFight = useCallback(
    (ref: GhostOpponentRef) => {
      const combatId = beginGhostBattle(ref)
      onFight(combatId)
    },
    [onFight],
  )

  const handleChampion = useCallback(() => {
    if (!ready) return
    const combatId = cacheChampionForBattle(ready.champion)
    beginGhostBattle({ combatId, isChampion: true })
    onFight(combatId)
  }, [onFight, ready])

  return (
    <div className="ghost-training" role="dialog" aria-label="Ghost training">
      <div className="ghost-training__backdrop" onClick={onClose} aria-hidden />
      <div className="ghost-training__panel">
        <div className="ghost-training__header">
          <h1 className="ghost-training__title">ghost training</h1>
          <button type="button" className="ghost-training__close" onClick={onClose}>
            close
          </button>
        </div>

        {uiState.kind === 'loading' && (
          <p className="ghost-training__status">loading daily ghosts…</p>
        )}

        {uiState.kind === 'error' && (
          <p className="ghost-training__status">{uiState.message}</p>
        )}

        {ready && (
          <>
            {ready.news && (
              <div className="ghost-training__news">
                your ghost won {ready.news.wins} of {ready.news.total} while you were away.
                <button
                  type="button"
                  className="ghost-training__fight-btn"
                  style={{ marginLeft: '0.75rem' }}
                  onClick={() => void dismissGhostTrainingNews()}
                >
                  ok
                </button>
              </div>
            )}

            {!ready.explainerSeen && (
              <div className="ghost-training__explainer">
                three build-flavored ghosts each day, band-matched to your level. each ghost has up to
                three xp-paying battles per day. your snapshot
                fights in other players&apos; sets. phase B (equipped-move piloting) ships later.
                <button
                  type="button"
                  className="ghost-training__fight-btn"
                  style={{ marginTop: '0.65rem' }}
                  onClick={() => void acknowledgeGhostExplainer()}
                >
                  got it
                </button>
              </div>
            )}

            {ready.usedSeedFallback && (
              <p className="ghost-training__notice">
                {ready.offline
                  ? 'offline mode — seeded ghosts only until ghost-training edge fn is deployed.'
                  : 'thin pool today — seeded ghosts filling the set.'}
              </p>
            )}

            {ready.dailyStreak > 0 && (
              <p className="ghost-training__streak">
                daily streak: {ready.dailyStreak} (best {ready.bestDailyStreak})
              </p>
            )}

            {dailyDone && (
              <p className="ghost-training__notice">daily clears complete. you can still rematch until each cap is used.</p>
            )}
            <ul className="ghost-training__list">
              {ready.opponents.map((ref) => {
                const snap = snapshotForOpponent(ready.snapshots, ref)
                const done = ready.dailyCompleted.includes(ref.slot)
                const attempts = Math.max(0, Number(ready.dailyGhostAttempts?.[ref.combatId] ?? 0))
                const cap = ready.perGhostDailyCap > 0 ? ready.perGhostDailyCap : 3
                const capped = attempts >= cap
                const attemptsLeft = Math.max(0, cap - attempts)
                return (
                  <li
                    key={ref.combatId}
                    className={`ghost-training__opponent${done ? ' ghost-training__opponent--done' : ''}`}
                  >
                    <div className="ghost-training__opponent-info">
                      {snap && (
                        <LeaderboardVariantSprite variantId={snap.variantId} width={40} height={48} />
                      )}
                      <span className="ghost-training__opponent-name">
                        {snap?.displayName ?? ref.id}
                      </span>
                      <span className="ghost-training__opponent-meta">
                        lv {snap?.level ?? '?'} · {snap?.buildName ?? 'unknown build'}
                        {snap?.source === 'seed' ? ' · seed' : ''}
                        {done ? ' · cleared' : ''}
                      </span>
                      <span className="ghost-training__opponent-meta">
                        xp fights: {attempts}/{cap}
                        {!capped ? ` · ${attemptsLeft} left` : ' · cap reached'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ghost-training__fight-btn"
                      disabled={capped}
                      onClick={() => handleFight(ref)}
                    >
                      {capped ? 'capped' : done ? 'rematch' : 'fight'}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="ghost-training__champion">
              <p className="ghost-training__champion-label">challenge the champion (opt-in)</p>
              <div className="ghost-training__opponent">
                <div className="ghost-training__opponent-info">
                  <LeaderboardVariantSprite variantId={ready.champion.variantId} width={40} height={48} />
                  <span className="ghost-training__opponent-name">
                    {ready.champion.displayName}
                  </span>
                  <span className="ghost-training__opponent-meta">
                    lv {ready.champion.level} · brutal · badge-worthy
                    {ready.championClearedToday ? ' · cleared today' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="ghost-training__fight-btn"
                  onClick={handleChampion}
                >
                  challenge
                </button>
              </div>
            </div>

            <p className="ghost-training__footer">
              your ghost record: {ready.stats.yourGhostWins}W / {ready.stats.yourGhostLosses}L · served{' '}
              {ready.stats.yourGhostServed}x
            </p>
          </>
        )}
      </div>
    </div>
  )
}
