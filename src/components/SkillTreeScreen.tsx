import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  getMoveDef,
  getMoveUiMeta,
  isMoveUnlocked,
  MOVE_SKILL_LADDERS,
  type PlayerMoveId,
} from '../data/moves'
import type { MoveSkill } from '../data/moveTypes'
import {
  getEquippedMoves,
  getPlayerSkills,
  setEquippedMove,
  subscribePlayerStore,
} from '../store/playerStore'
import './SkillTreeScreen.css'

const FADE_MS = 300

const LADDER_ORDER: MoveSkill[] = ['attack', 'speed', 'defense', 'luck']

const SKILL_COLUMN_LABEL: Record<MoveSkill, string> = {
  attack: 'ATTACK',
  speed: 'SPEED',
  defense: 'DEFENSE',
  luck: 'LUCK',
}

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

type MoveTreeEntry = {
  moveId: PlayerMoveId
  rung: number
  unlocked: boolean
  equipped: boolean
  label: string
  description: string
  unlockRequirement: string
}

type SkillColumn = {
  skill: MoveSkill
  columnLabel: string
  moves: MoveTreeEntry[]
}

function usePlayerStore<T>(selector: () => T): T {
  return useSyncExternalStore(subscribePlayerStore, selector, selector)
}

function buildSkillColumns(
  skills: ReturnType<typeof getPlayerSkills>,
  equipped: ReturnType<typeof getEquippedMoves>,
): SkillColumn[] {
  return LADDER_ORDER.map((skill) => ({
    skill,
    columnLabel: SKILL_COLUMN_LABEL[skill],
    moves: MOVE_SKILL_LADDERS[skill].map((moveId, index) => {
      const { label, description } = getMoveUiMeta(moveId)
      const def = getMoveDef(moveId)
      return {
        moveId,
        rung: index + 1,
        unlocked: isMoveUnlocked(moveId, skills),
        equipped: equipped.includes(moveId),
        label,
        description,
        unlockRequirement: `${SKILL_SHORT[skill]} ${def.unlockAtSkillLevel}`,
      }
    }),
  }))
}

export function SkillTreeScreen({ onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>(0)
  const [alreadyEquippedNote, setAlreadyEquippedNote] = useState<string | null>(null)

  const skills = usePlayerStore(getPlayerSkills)
  const equipped = usePlayerStore(getEquippedMoves)

  const columns = useMemo(
    () => buildSkillColumns(skills, equipped),
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

  return (
    <div
      className={`skill-tree-screen${closing ? ' skill-tree-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Skill tree loadout"
      style={{ ['--skill-tree-fade-ms' as string]: `${FADE_MS}ms` }}
    >
      <div className="skill-tree-screen__backdrop" onClick={requestClose} aria-hidden />
      <div className="skill-tree-screen__panel">
        <header className="skill-tree-screen__header">
          <h1 className="skill-tree-screen__title">the ladder</h1>
          <button type="button" className="skill-tree-screen__close" onClick={requestClose}>
            close
          </button>
        </header>

        <section className="skill-tree-screen__equipped" aria-label="Equipped move slots">
          <h2 className="skill-tree-screen__section-label">equipped</h2>
          {alreadyEquippedNote && (
            <p className="skill-tree-screen__note" role="status">
              {alreadyEquippedNote}
            </p>
          )}
          <div className="skill-tree-screen__equipped-row">
            {equipped.map((moveId, index) => {
              const slot = index as EquipSlot
              const { label } = getMoveUiMeta(moveId)
              const def = getMoveDef(moveId)
              const selected = selectedSlot === slot
              return (
                <button
                  key={`equipped-${slot}`}
                  type="button"
                  className={`skill-tree-screen__slot skill-tree-screen__slot--${def.skill}${
                    selected ? ' skill-tree-screen__slot--selected' : ''
                  }${equipped.includes(moveId) ? ' skill-tree-screen__slot--filled' : ''}`}
                  aria-pressed={selected}
                  onClick={() => handleSlotClick(slot)}
                >
                  <span className="skill-tree-screen__slot-name">{label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="skill-tree-screen__columns">
          {columns.map((column) => (
            <section
              key={column.skill}
              className={`skill-tree-screen__column skill-tree-screen__column--${column.skill}`}
              aria-label={`${column.columnLabel} ladder`}
            >
              <h2 className="skill-tree-screen__column-title">{column.columnLabel}</h2>
              <div className="skill-tree-screen__ladder">
                {[...column.moves].reverse().map((move) => {
                  const stateClass = move.equipped
                    ? 'skill-tree-screen__move--equipped'
                    : move.unlocked
                      ? 'skill-tree-screen__move--unlocked'
                      : 'skill-tree-screen__move--locked'
                  return (
                    <button
                      key={move.moveId}
                      type="button"
                      className={`skill-tree-screen__move skill-tree-screen__move--${column.skill} ${stateClass}`}
                      disabled={!move.unlocked}
                      onClick={() => handleMoveClick(move.moveId, move.unlocked)}
                    >
                      <span className="skill-tree-screen__move-rung">rung {move.rung}</span>
                      <span className="skill-tree-screen__move-name">{move.label}</span>
                      <span className="skill-tree-screen__move-desc">{move.description}</span>
                      {!move.unlocked && (
                        <span className="skill-tree-screen__move-lock">
                          {move.unlockRequirement}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
