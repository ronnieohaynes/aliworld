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
  getUnequippedUnlockedMoves,
  setEquippedMove,
  subscribePlayerStore,
} from '../store/playerStore'
import './BattleScreen.css'
import './LoadoutScreen.css'

const FADE_MS = 300

const LADDER_ORDER: MoveSkill[] = ['attack', 'speed', 'defense', 'luck']

type Props = {
  onClose: () => void
}

type EquipSlot = 0 | 1 | 2 | 3

function usePlayerStore<T>(selector: () => T): T {
  return useSyncExternalStore(subscribePlayerStore, selector, selector)
}

function formatUnlockRequirement(skill: MoveSkill, level: number): string {
  return `${skill} lvl ${level}`
}

function lockedMovesInLadderOrder(
  skills: ReturnType<typeof getPlayerSkills>,
): PlayerMoveId[] {
  const ids: PlayerMoveId[] = []
  for (const skill of LADDER_ORDER) {
    for (const moveId of MOVE_SKILL_LADDERS[skill]) {
      if (!isMoveUnlocked(moveId, skills)) ids.push(moveId)
    }
  }
  return ids
}

export function LoadoutScreen({ onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>(0)
  const [alreadyEquippedNote, setAlreadyEquippedNote] = useState<string | null>(null)

  const skills = usePlayerStore(getPlayerSkills)
  const equipped = usePlayerStore(getEquippedMoves)
  const pool = useMemo(
    () => getUnequippedUnlockedMoves(),
    [skills, equipped],
  )
  const locked = useMemo(() => lockedMovesInLadderOrder(skills), [skills])

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

  const handlePoolClick = (moveId: PlayerMoveId) => {
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
      className={`loadout-screen${closing ? ' loadout-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Move loadout"
      style={{ ['--loadout-fade-ms' as string]: `${FADE_MS}ms` }}
    >
      <div className="loadout-screen__backdrop" onClick={requestClose} aria-hidden />
      <div className="loadout-screen__panel">
        <header className="loadout-screen__header">
          <h1 className="loadout-screen__title">your hands</h1>
          <button type="button" className="loadout-screen__close" onClick={requestClose}>
            close
          </button>
        </header>

        <div
          className="loadout-screen__slots battle-screen__moves"
          role="group"
          aria-label="Equipped move slots"
        >
          {equipped.map((moveId, index) => {
            const slot = index as EquipSlot
            const { label, description, className } = getMoveUiMeta(moveId)
            const selected = selectedSlot === slot
            return (
              <button
                key={`slot-${slot}`}
                type="button"
                className={`battle-screen__move ${className} loadout-screen__slot${
                  selected ? ' loadout-screen__slot--selected' : ''
                }`}
                aria-pressed={selected}
                onClick={() => handleSlotClick(slot)}
              >
                <span className="battle-screen__move-name">{label}</span>
                <span className="battle-screen__move-desc">{description}</span>
              </button>
            )
          })}
        </div>

        <div className="loadout-screen__scroll">
          <h2 className="loadout-screen__section-title">unlocked</h2>
          {alreadyEquippedNote && (
            <p className="loadout-screen__note" role="status">
              {alreadyEquippedNote}
            </p>
          )}
          <div className="loadout-screen__pool" role="group" aria-label="Unequipped unlocked moves">
            {pool.length === 0 ? (
              <p className="loadout-screen__empty-pool">
                nothing else unlocked. level skills to grow the pool.
              </p>
            ) : (
              pool.map((moveId) => {
                const { label, description } = getMoveUiMeta(moveId)
                const def = getMoveDef(moveId)
                return (
                  <button
                    key={moveId}
                    type="button"
                    className="loadout-screen__pool-item"
                    onClick={() => handlePoolClick(moveId)}
                  >
                    <span className="loadout-screen__pool-name">{label}</span>
                    <span className="loadout-screen__pool-desc">{description}</span>
                    <span className="loadout-screen__pool-meta">
                      {def.skill} · rung {def.ladderRung}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {locked.length > 0 && (
            <>
              <h2 className="loadout-screen__section-title">locked</h2>
              <div className="loadout-screen__locked" aria-label="Locked moves">
                {locked.map((moveId) => {
                  const { label, description } = getMoveUiMeta(moveId)
                  const def = getMoveDef(moveId)
                  return (
                    <div key={moveId} className="loadout-screen__locked-item">
                      <span className="loadout-screen__pool-name">{label}</span>
                      <span className="loadout-screen__pool-desc">{description}</span>
                      <span className="loadout-screen__pool-meta">
                        {formatUnlockRequirement(def.skill, def.unlockAtSkillLevel)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
