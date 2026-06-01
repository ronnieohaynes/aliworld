import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getMidnightVariantRenderTuning, getMidnightWalkSrc } from '../data/midnightVariants'
import { loadSpriteSheetWithFallback } from '../game/characterLayers'
import type { SpriteSheet } from '../game/SpriteSheet'
import {
  drawWorldPlayerSprite,
  getIdleFrameIndex,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from '../game/worldSpriteRender'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import { getAuthState, subscribeAuthStore } from '../store/authStore'
import { getPlayerLevel, getPlayerSkills, subscribePlayerStore } from '../store/playerStore'
import {
  MAX_SKILL_LEVEL,
  totalXpForLevel,
  type SkillId,
} from '../store/skillStore'
import './BattleScreen.css'
import './StatsScreen.css'

const FADE_MS = 300

const STAT_ROWS: { id: SkillId; label: string }[] = [
  { id: 'hp', label: 'HP' },
  { id: 'attack', label: 'ATK' },
  { id: 'defense', label: 'DEF' },
  { id: 'speed', label: 'SPD' },
  { id: 'luck', label: 'LCK' },
]

type Props = {
  onClose: () => void
}

function usePlayerStore<T>(selector: () => T): T {
  return useSyncExternalStore(subscribePlayerStore, selector, selector)
}

function drawPlayerPortraitSprite(
  canvas: HTMLCanvasElement,
  sheet: SpriteSheet,
  tuning: ReturnType<typeof getMidnightVariantRenderTuning>,
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = Math.floor(WORLD_PLAYER_DISPLAY_WIDTH)
  const dh = Math.floor(WORLD_PLAYER_DISPLAY_HEIGHT)
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)
  drawWorldPlayerSprite(ctx, sheet, 'down', getIdleFrameIndex(), 0, tuning.feetOffset, tuning)
}

export function StatsScreen({ onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const portraitRef = useRef<HTMLCanvasElement>(null)

  const skills = usePlayerStore(getPlayerSkills)
  const playerHandle = useSyncExternalStore(
    subscribeAuthStore,
    () => getAuthState().profile?.handle ?? '',
    () => getAuthState().profile?.handle ?? '',
  )
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )
  const playerLevel = useMemo(() => getPlayerLevel(), [skills])

  const statRows = useMemo(
    () =>
      STAT_ROWS.map(({ id, label }) => {
        const { level, xp } = skills[id]
        const atMax = level >= MAX_SKILL_LEVEL
        const floor = totalXpForLevel(level)
        const ceil = totalXpForLevel(level + 1)
        const pct = atMax ? 100 : Math.round(((xp - floor) / (ceil - floor)) * 100)
        return { id, label, level, xp, atMax, pct, floor, ceil }
      }),
    [skills],
  )

  const requestClose = useCallback(() => {
    setClosing(true)
  }, [])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => onClose(), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  useEffect(() => {
    let cancelled = false
    const walkSrc = getMidnightWalkSrc(selectedMidnightVariant)
    const tuning = getMidnightVariantRenderTuning(selectedMidnightVariant)

    void loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
      if (cancelled || !sheet?.loaded) return
      const canvas = portraitRef.current
      if (canvas) drawPlayerPortraitSprite(canvas, sheet, tuning)
    })
    return () => {
      cancelled = true
    }
  }, [selectedMidnightVariant])

  return (
    <div
      className={`stats-screen${closing ? ' stats-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={playerHandle ? `${playerHandle} stats` : 'Player stats'}
      style={{ ['--stats-fade-ms' as string]: `${FADE_MS}ms` }}
    >
      <div className="stats-screen__panel">
        <header className="stats-screen__header">
          <h1 className="stats-screen__title">{playerHandle || 'you'}</h1>
          <button type="button" className="stats-screen__close" onClick={requestClose}>
            close
          </button>
        </header>

        <div className="stats-screen__hero">
          <canvas
            ref={portraitRef}
            className="stats-screen__portrait"
            width={WORLD_PLAYER_DISPLAY_WIDTH}
            height={WORLD_PLAYER_DISPLAY_HEIGHT}
          />
          <p className="stats-screen__level">level {playerLevel}</p>
        </div>

        <div className="stats-screen__stats" aria-label="Skill stats">
          {statRows.map((row) => (
            <div key={row.id} className="stats-screen__stat-row">
              <div className="stats-screen__stat-head">
                <span className="stats-screen__stat-label">{row.label}</span>
                <span className="stats-screen__stat-level">lvl {row.level}</span>
              </div>
              <div className="battle-screen__hp-track stats-screen__bar">
                <div
                  className="battle-screen__hp-fill stats-screen__bar-fill"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="stats-screen__stat-xp">
                {row.atMax ? 'MAX' : `${row.xp - row.floor} / ${row.ceil - row.floor}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
