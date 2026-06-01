import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
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
  getMoveDef,
  getMoveUiMeta,
  isMoveUnlocked,
  MOVE_SKILL_LADDERS,
  type PlayerMoveId,
} from '../data/moves'
import type { MoveSkill } from '../data/moveTypes'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import {
  getEquippedMoves,
  getPlayerLevel,
  getPlayerSkills,
  setEquippedMove,
  subscribePlayerStore,
} from '../store/playerStore'
import {
  MAX_SKILL_LEVEL,
  totalXpForLevel,
} from '../store/skillStore'
import './BattleScreen.css'
import './LoadoutScreen.css'

const FADE_MS = 300

const SKILL_ROWS: { id: MoveSkill; label: string }[] = [
  { id: 'attack', label: 'ATK' },
  { id: 'speed', label: 'SPD' },
  { id: 'defense', label: 'DEF' },
  { id: 'luck', label: 'LCK' },
]

const SKILL_SHORT: Record<MoveSkill, string> = {
  attack: 'atk',
  speed: 'spd',
  defense: 'def',
  luck: 'lck',
}

type Props = {
  onClose: () => void
}

type EquipSlot = 0 | 1 | 2 | 3

type MoveLadderEntry = {
  moveId: PlayerMoveId
  rung: number
  unlocked: boolean
  equipped: boolean
  label: string
  description: string
  unlockRequirement: string
}

type SkillSection = {
  skill: MoveSkill
  label: string
  level: number
  xp: number
  atMax: boolean
  pct: number
  floor: number
  ceil: number
  moves: MoveLadderEntry[]
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

function buildSkillSections(
  skills: ReturnType<typeof getPlayerSkills>,
  equipped: ReturnType<typeof getEquippedMoves>,
): SkillSection[] {
  return SKILL_ROWS.map(({ id, label }) => {
    const { level, xp } = skills[id]
    const atMax = level >= MAX_SKILL_LEVEL
    const floor = totalXpForLevel(level)
    const ceil = totalXpForLevel(level + 1)
    const pct = atMax ? 100 : Math.round(((xp - floor) / (ceil - floor)) * 100)
    const moves = MOVE_SKILL_LADDERS[id].map((moveId, index) => {
      const { label: moveLabel, description } = getMoveUiMeta(moveId)
      const def = getMoveDef(moveId)
      return {
        moveId,
        rung: index + 1,
        unlocked: isMoveUnlocked(moveId, skills),
        equipped: equipped.includes(moveId),
        label: moveLabel,
        description,
        unlockRequirement: `${SKILL_SHORT[id]} ${def.unlockAtSkillLevel}`,
      }
    })
    return { skill: id, label, level, xp, atMax, pct, floor, ceil, moves }
  })
}

export function LoadoutScreen({ onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>(0)
  const [expandedSkill, setExpandedSkill] = useState<MoveSkill | null>(null)
  const [alreadyEquippedNote, setAlreadyEquippedNote] = useState<string | null>(null)
  const portraitRef = useRef<HTMLCanvasElement>(null)

  const skills = usePlayerStore(getPlayerSkills)
  const equipped = usePlayerStore(getEquippedMoves)
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  const playerLevel = useMemo(() => getPlayerLevel(), [skills])
  const skillSections = useMemo(
    () => buildSkillSections(skills, equipped),
    [skills, equipped],
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
    if (!alreadyEquippedNote) return
    const timer = window.setTimeout(() => setAlreadyEquippedNote(null), 1800)
    return () => window.clearTimeout(timer)
  }, [alreadyEquippedNote])

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

  const handleSlotClick = (slot: EquipSlot) => {
    setSelectedSlot(slot)
    setAlreadyEquippedNote(null)
  }

  const handleMoveClick = (moveId: PlayerMoveId, unlocked: boolean) => {
    if (!unlocked) return
    const otherSlot = equipped.findIndex((id) => id === moveId)
    if (otherSlot >= 0 && otherSlot !== selectedSlot) {
      setAlreadyEquippedNote('already equipped')
      return
    }
    setEquippedMove(selectedSlot, moveId)
    setAlreadyEquippedNote(null)
  }

  const toggleSkillExpand = (skill: MoveSkill) => {
    setExpandedSkill((current) => (current === skill ? null : skill))
  }

  return (
    <div
      className={`loadout-screen${closing ? ' loadout-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Loadout"
      style={{ ['--loadout-fade-ms' as string]: `${FADE_MS}ms` }}
    >
      <div className="loadout-screen__backdrop" onClick={requestClose} aria-hidden />
      <div className="loadout-screen__panel">
        <header className="loadout-screen__header">
          <h1 className="loadout-screen__title">loadout</h1>
          <button type="button" className="loadout-screen__close" onClick={requestClose}>
            close
          </button>
        </header>

        <div className="loadout-screen__scroll">
          <section className="loadout-screen__hero" aria-label="Player portrait">
            <canvas
              ref={portraitRef}
              className="loadout-screen__portrait"
              width={WORLD_PLAYER_DISPLAY_WIDTH}
              height={WORLD_PLAYER_DISPLAY_HEIGHT}
            />
            <p className="loadout-screen__level">level {playerLevel}</p>
          </section>

          <section className="loadout-screen__equipped" aria-label="Equipped move slots">
            <h2 className="loadout-screen__section-label">equipped</h2>
            {alreadyEquippedNote && (
              <p className="loadout-screen__note" role="status">
                {alreadyEquippedNote}
              </p>
            )}
            <div className="loadout-screen__equipped-row">
              {equipped.map((moveId, index) => {
                const slot = index as EquipSlot
                const { label } = getMoveUiMeta(moveId)
                const def = getMoveDef(moveId)
                const selected = selectedSlot === slot
                return (
                  <button
                    key={`equipped-${slot}`}
                    type="button"
                    className={`loadout-screen__slot loadout-screen__slot--${def.skill}${
                      selected ? ' loadout-screen__slot--selected' : ''
                    }`}
                    aria-pressed={selected}
                    onClick={() => handleSlotClick(slot)}
                  >
                    <span className="loadout-screen__slot-name">{label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="loadout-screen__skills" aria-label="Skill ladders">
            <h2 className="loadout-screen__section-label">skills</h2>
            {skillSections.map((section) => {
              const expanded = expandedSkill === section.skill
              return (
                <div
                  key={section.skill}
                  className={`loadout-screen__skill-block loadout-screen__skill-block--${section.skill}${
                    expanded ? ' loadout-screen__skill-block--expanded' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="loadout-screen__skill-row"
                    aria-expanded={expanded}
                    onClick={() => toggleSkillExpand(section.skill)}
                  >
                    <div className="loadout-screen__skill-head">
                      <span className="loadout-screen__skill-label">{section.label}</span>
                      <span className="loadout-screen__skill-level">lvl {section.level}</span>
                    </div>
                    <div className="battle-screen__hp-track loadout-screen__bar">
                      <div
                        className={`battle-screen__hp-fill loadout-screen__bar-fill loadout-screen__bar-fill--${section.skill}`}
                        style={{ width: `${section.pct}%` }}
                      />
                    </div>
                    <span className="loadout-screen__skill-xp">
                      {section.atMax
                        ? 'MAX'
                        : `${section.xp - section.floor} / ${section.ceil - section.floor}`}
                    </span>
                  </button>

                  {expanded && (
                    <div
                      className="loadout-screen__ladder"
                      aria-label={`${section.label} move ladder`}
                    >
                      {section.moves.map((move) => {
                        const stateClass = move.equipped
                          ? 'loadout-screen__move--equipped'
                          : move.unlocked
                            ? 'loadout-screen__move--unlocked'
                            : 'loadout-screen__move--locked'
                        return (
                          <button
                            key={move.moveId}
                            type="button"
                            className={`loadout-screen__move loadout-screen__move--${section.skill} ${stateClass}`}
                            disabled={!move.unlocked}
                            onClick={() => handleMoveClick(move.moveId, move.unlocked)}
                          >
                            <span className="loadout-screen__move-rung">rung {move.rung}</span>
                            <span className="loadout-screen__move-name">{move.label}</span>
                            <span className="loadout-screen__move-desc">{move.description}</span>
                            {!move.unlocked && (
                              <span className="loadout-screen__move-lock">
                                {move.unlockRequirement}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </div>
      </div>
    </div>
  )
}
