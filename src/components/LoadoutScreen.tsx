import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { getMidnightVariantRenderTuning } from '../data/midnightVariants'
import {
  getCosmeticsRevision,
  resolvePlayerWalkSrc,
  subscribeCosmeticsStore,
} from '../store/cosmeticsStore'
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
import { MoveScaleTag } from './MoveScaleTag'
import './MoveScaleTag.css'
import { deriveBuildName } from '../data/buildName'
import type { MoveSkill } from '../data/moveTypes'
import {
  getSelectedMidnightVariant,
  setMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import { listOwnedSkinVariants } from '../data/skinGrants'
import type { MidnightVariantId } from '../data/midnightVariants'
import { VariantThumbnailGallery } from './VariantThumbnailGallery'
import './VariantThumbnailGallery.css'
import {
  getBadgeGrantLabels,
  getGrantsRevision,
  subscribeGrantsStore,
} from '../store/grantsStore'
import {
  getRunSkinsRevision,
  subscribeRunSkinsStore,
} from '../store/runSkinsStore'
import {
  getEquippedMoves,
  getPlayerLevel,
  getPlayerSkills,
  getPlayerStoreState,
  setEquippedMove,
  subscribePlayerStore,
} from '../store/playerStore'
import { ARCHETYPE_STATS } from '../store/battleStore'
import {
  getSkillStatBonuses,
  MAX_SKILL_LEVEL,
  MAX_PLAYER_LEVEL,
  cumulativeXpForLevel,
  skillXpProgressPct,
  sumSkillLevels,
  computePlayerLevel,
} from '../store/skillStore'
import { HandleWithEmblem } from './HandleWithEmblem'
import { generateIdentityCard } from '../lib/identityCard'
import { IdentityCardPreview } from './IdentityCardPreview'
import { GuidedTutorialOverlay } from './GuidedTutorialOverlay'
import {
  LOADOUT_TUTORIAL_STEPS,
  type LoadoutTutorialTarget,
} from '../data/loadoutTutorial'
import './BattleScreen.css'
import './LoadoutScreen.css'
import { getAuthState } from '../store/authStore'

const FADE_MS = 150

const SKILL_ROWS: { id: MoveSkill; label: string; tagline: string }[] = [
  { id: 'attack', label: 'ATK', tagline: '(scales all damage)' },
  { id: 'speed', label: 'SPD', tagline: '(dodge chance · counter damage · initiative)' },
  { id: 'defense', label: 'DEF', tagline: '(passive damage reduction · parry counter)' },
  { id: 'luck', label: 'LCK', tagline: '(crit chance · parry dodge · stun chance)' },
]

const SKILL_SHORT: Record<MoveSkill, string> = {
  attack: 'atk',
  speed: 'spd',
  defense: 'def',
  luck: 'lck',
}

type Props = {
  onClose: () => void
  /** Loadout tutorial steps 3–9 (stat rows → counter card); steps 0–2 are on overworld / start menu. */
  loadoutTutorialStep?: number | null
  onLoadoutTutorialNext?: () => void
  onLoadoutTutorialSkip?: () => void
}

type EquipSlot = 0 | 1 | 2 | 3

type LoadoutTab = 'loadout' | 'skins'

type MoveLadderEntry = {
  moveId: PlayerMoveId
  rung: number
  unlocked: boolean
  equipped: boolean
  label: string
  description: string
  scaleParts: ReturnType<typeof getMoveUiMeta>['scaleParts']
  unlockRequirement: string
}

type SkillSection = {
  skill: MoveSkill
  label: string
  tagline: string
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
  return SKILL_ROWS.map(({ id, label, tagline }) => {
    const { level, xp } = skills[id]
    const atMax = level >= MAX_SKILL_LEVEL
    const floor = cumulativeXpForLevel(level)
    const ceil = cumulativeXpForLevel(level + 1)
    const pct = skillXpProgressPct(level, xp)
    const moves = MOVE_SKILL_LADDERS[id].map((moveId, index) => {
      const { label: moveLabel, description, scaleParts } = getMoveUiMeta(moveId)
      const def = getMoveDef(moveId)
      return {
        moveId,
        rung: index + 1,
        unlocked: isMoveUnlocked(moveId, skills),
        equipped: equipped.includes(moveId),
        label: moveLabel,
        description,
        scaleParts,
        unlockRequirement: `${SKILL_SHORT[id]} ${def.unlockAtSkillLevel}`,
      }
    })
    return { skill: id, label, tagline, level, xp, atMax, pct, floor, ceil, moves }
  })
}

export function LoadoutScreen({
  onClose,
  loadoutTutorialStep = null,
  onLoadoutTutorialNext,
  onLoadoutTutorialSkip,
}: Props) {
  const [closing, setClosing] = useState(false)
  const [activeTab, setActiveTab] = useState<LoadoutTab>('loadout')
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>(0)
  const [expandedSkill, setExpandedSkill] = useState<MoveSkill | null>(null)
  const [alreadyEquippedNote, setAlreadyEquippedNote] = useState<string | null>(null)
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null)
  const [cardBlob, setCardBlob] = useState<Blob | null>(null)
  const [cardGenerating, setCardGenerating] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)
  const portraitRef = useRef<HTMLCanvasElement>(null)
  const statAttackRef = useRef<HTMLDivElement>(null)
  const statSpeedRef = useRef<HTMLDivElement>(null)
  const statDefenseRef = useRef<HTMLDivElement>(null)
  const statLuckRef = useRef<HTMLDivElement>(null)
  const skillXpRef = useRef<HTMLSpanElement>(null)
  const buildNameRef = useRef<HTMLParagraphElement>(null)
  const shareCardRef = useRef<HTMLButtonElement>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)

  const showLoadoutTutorial =
    loadoutTutorialStep != null &&
    ((loadoutTutorialStep >= 2 && loadoutTutorialStep <= 8) ||
      loadoutTutorialStep === 11)

  const skills = usePlayerStore(getPlayerSkills)
  const equipped = usePlayerStore(getEquippedMoves)
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  const playerLevel = useMemo(() => getPlayerLevel(), [skills])
  const build = useMemo(() => deriveBuildName(skills), [skills])
  const grantsRevision = useSyncExternalStore(subscribeGrantsStore, getGrantsRevision, getGrantsRevision)
  const runSkinsRevision = useSyncExternalStore(
    subscribeRunSkinsStore,
    getRunSkinsRevision,
    getRunSkinsRevision,
  )
  const cosmeticsRevision = useSyncExternalStore(
    subscribeCosmeticsStore,
    getCosmeticsRevision,
    getCosmeticsRevision,
  )
  const badgeLabels = useMemo(() => {
    void grantsRevision
    return getBadgeGrantLabels()
  }, [grantsRevision])
  const ownedSkins = useMemo(() => {
    void grantsRevision
    void runSkinsRevision
    return listOwnedSkinVariants()
  }, [grantsRevision, runSkinsRevision])
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
    if (loadoutTutorialStep == null || loadoutTutorialStep < 2 || loadoutTutorialStep > 5) return
    const refs = [statAttackRef, statSpeedRef, statDefenseRef, statLuckRef]
    const index = loadoutTutorialStep - 2
    refs[index]?.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [loadoutTutorialStep])

  useEffect(() => {
    if (!alreadyEquippedNote) return
    const timer = window.setTimeout(() => setAlreadyEquippedNote(null), 1800)
    return () => window.clearTimeout(timer)
  }, [alreadyEquippedNote])

  useEffect(() => {
    let cancelled = false
    const walkSrc = resolvePlayerWalkSrc(selectedMidnightVariant)
    const tuning = getMidnightVariantRenderTuning(selectedMidnightVariant)

    void loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
      if (cancelled || !sheet?.loaded) return
      const canvas = portraitRef.current
      if (canvas) drawPlayerPortraitSprite(canvas, sheet, tuning)
    })
    return () => {
      cancelled = true
    }
  }, [selectedMidnightVariant, cosmeticsRevision])

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

  const closeCardPreview = useCallback(() => {
    if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl)
    setCardPreviewUrl(null)
    setCardBlob(null)
    setCardError(null)
  }, [cardPreviewUrl])

  const handleShareCard = useCallback(async () => {
    if (cardGenerating) return
    setCardError(null)
    setCardGenerating(true)
    try {
      const blob = await generateIdentityCard()
      const url = URL.createObjectURL(blob)
      setCardBlob(blob)
      setCardPreviewUrl(url)
    } catch (err) {
      console.error('[identity card]', err)
      setCardError('could not build your card. try again.')
    } finally {
      setCardGenerating(false)
    }
  }, [cardGenerating])

  const handleSkinSelect = useCallback(
    (id: MidnightVariantId) => {
      if (id === selectedMidnightVariant) return
      setMidnightVariant(id)
    },
    [selectedMidnightVariant],
  )

  const switchTab = useCallback((tab: LoadoutTab) => {
    setActiveTab(tab)
    scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const playerHandle = getAuthState().profile?.handle?.toLowerCase()

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

        <nav className="loadout-screen__tabs" aria-label="Loadout sections">
          <button
            type="button"
            className={`loadout-screen__tab${activeTab === 'loadout' ? ' loadout-screen__tab--active' : ''}`}
            aria-selected={activeTab === 'loadout'}
            onClick={() => switchTab('loadout')}
          >
            loadout
          </button>
          <button
            type="button"
            className={`loadout-screen__tab${activeTab === 'skins' ? ' loadout-screen__tab--active' : ''}`}
            aria-selected={activeTab === 'skins'}
            onClick={() => switchTab('skins')}
          >
            skins
          </button>
        </nav>

        <div ref={scrollRootRef} className="loadout-screen__scroll">
          <section className="loadout-screen__hero" aria-label="Player portrait">
            <canvas
              ref={portraitRef}
              className="loadout-screen__portrait"
              width={WORLD_PLAYER_DISPLAY_WIDTH}
              height={WORLD_PLAYER_DISPLAY_HEIGHT}
            />
            <p
              ref={buildNameRef}
              className="loadout-screen__build"
              style={{ color: build.color }}
            >
              {build.name}
            </p>
            {badgeLabels.length > 0 ? (
              <p className="loadout-screen__badges" aria-label="Prize badges">
                {badgeLabels.map((label) => (
                  <span key={label} className="loadout-screen__badge">
                    {label}
                  </span>
                ))}
              </p>
            ) : null}
            <p className="loadout-screen__level">
              {playerHandle ? (
                <>
                  <HandleWithEmblem handle={playerHandle} /> ·{' '}
                </>
              ) : null}
              lvl {playerLevel}
            </p>
            <button
              ref={shareCardRef}
              type="button"
              className="loadout-screen__share-card"
              disabled={cardGenerating}
              onClick={handleShareCard}
            >
              {cardGenerating ? 'building card…' : 'share card'}
            </button>
            {cardError ? (
              <p className="loadout-screen__card-error" role="alert">
                {cardError}
              </p>
            ) : null}
          </section>

          {activeTab === 'loadout' ? (
            <>
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

            {/* Overall level XP progress bar */}
            {(() => {
              const playerLevel = computePlayerLevel(skills)
              const pct = playerLevel >= MAX_PLAYER_LEVEL ? 100 : (() => {
                const totalSkillLevels = sumSkillLevels(skills)
                const raw = Math.max(0, (totalSkillLevels - 5) * 99 / 320)
                return Math.min(100, (raw % 1) * 100)
              })()
              return (
                <div className="loadout-screen__level-xp-wrap">
                  <div className="loadout-screen__level-xp-label">
                    <span>lvl {playerLevel}</span>
                    <span className="loadout-screen__level-xp-center">player level</span>
                    <span>lvl {Math.min(playerLevel + 1, MAX_PLAYER_LEVEL)}</span>
                  </div>
                  <div className="loadout-screen__level-xp-track">
                    <div className="loadout-screen__level-xp-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}

            {/* HP, first, stat-only, no move ladder */}
            {(() => {
              const { level, xp } = skills.hp
              const atMax = level >= MAX_SKILL_LEVEL
              const floor = cumulativeXpForLevel(level)
              const ceil = cumulativeXpForLevel(level + 1)
              const withinLevel = xp - floor
              const needed = ceil - floor
              const pct = skillXpProgressPct(level, xp)
              const archetype = getPlayerStoreState().archetype
              const baseHp = ARCHETYPE_STATS[archetype].maxHp
              const totalMaxHp = baseHp + getSkillStatBonuses(skills).maxHp
              return (
                <div className="loadout-screen__skill-block loadout-screen__skill-block--hp">
                  <div className="loadout-screen__skill-row loadout-screen__skill-row--hp">
                    <div className="loadout-screen__skill-head loadout-screen__skill-head--hp">
                      <div className="loadout-screen__hp-label-stack">
                        <span className="loadout-screen__skill-label loadout-screen__skill-label--hp">HP</span>
                        <span className="loadout-screen__hp-fraction">Max hp: {totalMaxHp}</span>
                      </div>
                      <span className="loadout-screen__skill-level">lvl {level}</span>
                    </div>
                    <div className="loadout-screen__bar-row">
                      <span className="loadout-screen__total-xp">Total xp: {xp}</span>
                      <div className="battle-screen__hp-track loadout-screen__bar loadout-screen__bar--flex">
                        <div
                          className="battle-screen__hp-fill loadout-screen__bar-fill loadout-screen__bar-fill--hp"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="loadout-screen__skill-xp">
                      {atMax ? 'MAX' : `${withinLevel} / ${needed} xp to next level`}
                    </span>
                  </div>
                </div>
              )
            })()}

            {skillSections.map((section) => {
              const expanded = expandedSkill === section.skill
              const statRef =
                section.skill === 'attack'
                  ? statAttackRef
                  : section.skill === 'speed'
                    ? statSpeedRef
                    : section.skill === 'defense'
                      ? statDefenseRef
                      : statLuckRef
              return (
                <div
                  key={section.skill}
                  ref={statRef}
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
                      <div className="loadout-screen__skill-label-stack">
                        <span className="loadout-screen__skill-label">{section.label}</span>
                        <span className="loadout-screen__skill-tagline">{section.tagline}</span>
                      </div>
                      <span className="loadout-screen__skill-level">lvl {section.level}</span>
                    </div>
                    <div className="loadout-screen__bar-row">
                      <span className="loadout-screen__total-xp">Total xp: {section.xp}</span>
                      <div className="battle-screen__hp-track loadout-screen__bar loadout-screen__bar--flex">
                        <div
                          className={`battle-screen__hp-fill loadout-screen__bar-fill loadout-screen__bar-fill--${section.skill}`}
                          style={{ width: `${section.pct}%` }}
                        />
                      </div>
                    </div>
                    <span
                      ref={section.skill === 'attack' ? skillXpRef : undefined}
                      className="loadout-screen__skill-xp"
                    >
                      {section.atMax
                        ? 'MAX'
                        : `${section.xp - section.floor} / ${section.ceil - section.floor} xp to next level`}
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
                            <MoveScaleTag parts={move.scaleParts} className="loadout-screen__move-scale" />
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
            </>
          ) : (
            <section className="loadout-screen__skins" aria-label="Skins">
              <h2 className="loadout-screen__section-label">skins</h2>
              <p className="loadout-screen__skins-hint">owned this run — tap to equip</p>
              <VariantThumbnailGallery
                variants={ownedSkins}
                selectedId={selectedMidnightVariant}
                onSelect={handleSkinSelect}
                ariaLabel="Owned skins — tap to equip"
                thumbnailSize={80}
                emptyMessage="no skins unlocked this run yet"
              />
            </section>
          )}
        </div>
      </div>

      {cardPreviewUrl && cardBlob ? (
        <IdentityCardPreview
          previewUrl={cardPreviewUrl}
          blob={cardBlob}
          onClose={closeCardPreview}
        />
      ) : null}

      {showLoadoutTutorial && onLoadoutTutorialNext && onLoadoutTutorialSkip ? (
        <GuidedTutorialOverlay<LoadoutTutorialTarget | 'none'>
          ariaLabel="Loadout tutorial"
          steps={LOADOUT_TUTORIAL_STEPS}
          stepIndex={loadoutTutorialStep}
          targetRefs={{
            stat_attack: statAttackRef,
            stat_speed: statSpeedRef,
            stat_defense: statDefenseRef,
            stat_luck: statLuckRef,
            skill_xp: skillXpRef,
            build: buildNameRef,
            share_card: shareCardRef,
          }}
          scrollRootRef={scrollRootRef}
          elevated
          onNext={onLoadoutTutorialNext}
          onSkip={onLoadoutTutorialSkip}
        />
      ) : null}
    </div>
  )
}
