import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { NpcCombatEntry } from '../data/npcRegistry'
import { getMidnightVariantRenderTuning, getMidnightWalkSrc } from '../data/midnightVariants'
import {
  getBattleBgForLocation,
} from '../data/battleBackgrounds'
import {
  battleLocationToHometownId,
  getHometownDef,
} from '../data/hometowns'
import {
  getPlayerHometown,
  subscribeHometownStore,
} from '../store/hometownStore'
import { publicAsset } from '../utils/publicAsset'
import { drawSheetFrame, getIdleFrameIndex, loadSpriteSheetWithFallback } from '../game/characterLayers'
import type { SpriteSheet } from '../game/SpriteSheet'
import { isDevSparNpcId } from '../data/devSpar'
import {
  BATTLE_ENEMY_FEET,
  BATTLE_ENEMY_SOURCE_H,
  BATTLE_ENEMY_SOURCE_W,
  BATTLE_PLAYER_FEET,
  BATTLE_PLAYER_SOURCE_H,
  BATTLE_PLAYER_SOURCE_W,
  BATTLE_PLAYER_VISIBLE_MULT,
  BATTLE_TARGET_VISIBLE_H,
  DEFAULT_ENEMY_PLACEMENT,
  DEFAULT_PLAYER_PLACEMENT,
  layoutSpriteAtFeet,
  type BattleSpritePlacement,
} from '../game/battlePlacement'
import {
  ensureImageDecoded,
  measureCanvasVisibleBounds,
  measureNaturalImageFrame,
} from '../game/spriteBounds'
import {
  applyBattleEndHealing,
  BATTLE_MOVE_GAP_MS,
  BATTLE_ROUND_END_GAP_MS,
  battleReducer,
  createInitialBattleState,
  getTelegraphDisplay,
  type LevelUpNotification,
  type PlayerMove,
} from '../store/battleStore'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from '../store/characterStore'
import {
  getAuthState,
  subscribeAuthStore,
} from '../store/authStore'
import {
  getPlayerLevel,
  setOverworldPlayerHp,
  subscribePlayerStore,
  getEquippedMoves,
  getShowDebug,
  getPlayerSkills,
} from '../store/playerStore'
import { deriveBuildLoopType, deriveBuildName } from '../data/buildName'
import {
  isBattleTutorialSeen,
  setBattleTutorialSeen,
  setWalkerHeavyTutorialBeatSeen,
  WALKER_NPC_ID,
} from '../store/quest1Store'
import { getMoveUiMeta, getMoveDef } from '../data/moves'
import { track } from '../lib/analytics'
import type { BattleFeedbackTone } from '../data/battleFeedback'
import {
  getPlayerCounterRelation,
  leanSkillAccentColor,
} from '../data/skillCounter'
import { isWalkerHeavyTutorialActive } from '../data/walkerHeavyTutorial'
import { enemyMoveSkillColor, getEnemyMoveDef, type EnemyMoveId } from '../data/enemyMoves'
import {
  STATUS_EFFECT_HINTS,
  STATUS_EFFECT_LEGEND,
} from '../data/statusEffectCopy'
import type { CombatStatusState } from '../data/combatTypes'
import { BattlePlacementGrid } from './BattlePlacementGrid'
import {
  BATTLE_TUTORIAL_STEPS,
  BattleTutorialOverlay,
} from './BattleTutorialOverlay'
import './BattleScreen.css'
import './PlayerLevelBadge.css'

const MARK_SPRITE_SRC = publicAsset('Assets/Characters/npcs/mark-idle.png')

const WALKER_HEAVY_TEACH_STEPS = [
  {
    text: 'that wind-up means a HAYMAKER is coming. it hits hard.',
    target: 'telegraph' as const,
  },
  {
    text: 'HOLD braces the hit. SLIP sidesteps it. read the telegraph — then pick.',
    target: 'moves' as const,
  },
]

const WALKER_HEAVY_CONFIRM_STEPS = [
  {
    text: "that's reading. keep doing it.",
    target: 'telegraph' as const,
  },
]

/**
 * Derive a build-name-style label from NPC stats + leanSkill.
 * Uses stats to find the dominant stat; falls back to leanSkill.
 * Mirrors PURE_NAMES in buildName.ts so enemy labels match player labels.
 */
function deriveNpcArchetypeLabel(
  stats: { atk: number; def: number; spd: number },
  leanSkill: string,
): string {
  const PURE: Record<string, string> = {
    attack: 'heavy hands',
    defense: 'immovable wall',
    speed: 'speed demon',
    luck: 'wildcard',
    none: 'blank slate',
  }

  // Rank the stats we have
  const ranked = [
    { skill: 'attack', value: stats.atk },
    { skill: 'defense', value: stats.def },
    { skill: 'speed', value: stats.spd },
  ].sort((a, b) => b.value - a.value)

  const top = ranked[0]!
  const second = ranked[1]!

  // If a clear leader exists in stats, use it; otherwise trust leanSkill
  if (top.value - second.value >= 2) {
    return PURE[top.skill] ?? 'blank slate'
  }

  return PURE[leanSkill] ?? 'blank slate'
}

type BattleFloater = {
  id: number
  text: string
  target: 'enemy' | 'player'
  tone: BattleFeedbackTone | 'attack'
  kind?: string
}

const FLOATER_TONE_CLASS: Record<BattleFeedbackTone | 'attack', string> = {
  attack: 'attack',
  defense: 'defense',
  speed: 'speed',
  luck: 'luck',
  shake: 'shake',
  slow: 'slow',
  bleed: 'bleed',
  stun: 'stun',
}

type StatusTag = {
  label: string
  turns: number
}

function getFighterStatusTags(
  side: 'player' | 'enemy',
  status: CombatStatusState,
): StatusTag[] {
  if (side === 'enemy') {
    const tags: StatusTag[] = []
    if (status.enemyBleed > 0) tags.push({ label: 'bleed', turns: status.enemyBleed })
    if (status.enemyShake > 0) tags.push({ label: 'shake', turns: status.enemyShake })
    if (status.enemyStun > 0) tags.push({ label: 'stun', turns: status.enemyStun })
    if (status.enemySlow > 0) tags.push({ label: 'slow', turns: status.enemySlow })
    if (status.enemyMiss > 0) tags.push({ label: 'miss', turns: status.enemyMiss })
    return tags
  }

  const tags: StatusTag[] = []
  if (status.playerBrace > 0) tags.push({ label: 'brace', turns: status.playerBrace })
  if (status.playerDouble > 0) tags.push({ label: 'double', turns: status.playerDouble })
  if (status.playerReflect && status.playerReflect.turns > 0) {
    tags.push({ label: 'reflect', turns: status.playerReflect.turns })
  }
  return tags
}

function FighterStatusTags({ tags }: { tags: StatusTag[] }) {
  if (tags.length === 0) return null
  return (
    <div className="battle-screen__status-tags" aria-label="Status effects">
      {tags.map(({ label, turns }) => (
        <span
          key={label}
          className="battle-screen__status-tag"
          title={STATUS_EFFECT_HINTS[label] ?? label}
        >
          {label} {turns}
        </span>
      ))}
    </div>
  )
}

const SKILL_DISPLAY: Record<string, string> = {
  attack: 'ATK',
  defense: 'DEF',
  speed: 'SPD',
  luck: 'LCK',
  hp: 'HP',
}

function LevelUpOverlay({
  notification,
  onDismiss,
}: {
  notification: LevelUpNotification
  onDismiss: () => void
}) {
  const combatLevelChanged = notification.playerLevelAfter !== notification.playerLevelBefore

  return (
    <div className="battle-levelup-overlay" onClick={onDismiss}>
      <div className="battle-levelup-card" onClick={(e) => e.stopPropagation()}>
        <div className="battle-levelup-header">
          {combatLevelChanged ? (
            <>
              <span className="battle-levelup-title">LEVEL UP</span>
              <span className="battle-levelup-level">
                {notification.playerLevelBefore} <span className="battle-levelup-arrow">→</span> {notification.playerLevelAfter}
              </span>
            </>
          ) : (
            <span className="battle-levelup-title">SKILL UP</span>
          )}
        </div>

        {notification.skillLevelUps.length > 0 && (
          <div className="battle-levelup-skills">
            {notification.skillLevelUps.map(({ skill, from, to }) => (
              <div key={skill} className="battle-levelup-skill-row">
                <span className="battle-levelup-skill-name">{SKILL_DISPLAY[skill] ?? skill.toUpperCase()}</span>
                <span className="battle-levelup-skill-change">
                  {from} <span className="battle-levelup-arrow">→</span> {to}
                </span>
              </div>
            ))}
          </div>
        )}

        {notification.newlyUnlockedMoves.length > 0 && (
          <div className="battle-levelup-moves">
            <div className="battle-levelup-moves-label">NEW MOVE UNLOCKED</div>
            {notification.newlyUnlockedMoves.map((moveId) => {
              const meta = getMoveUiMeta(moveId)
              return (
                <div key={moveId} className="battle-levelup-move-row">
                  <span className="battle-levelup-move-name">{meta.label}</span>
                  <span className="battle-levelup-move-desc">{meta.description}</span>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="button"
          className="battle-levelup-dismiss"
          onClick={onDismiss}
        >
          tap to continue ▸
        </button>
      </div>
    </div>
  )
}

type Props = {
  npcId: string
  onBattleEnd: (result: 'win' | 'lose', turns: number) => void
  /** Commits conversion flags the moment the player wins, before exit narration ends. */
  onWinPayoff?: (npcId: string) => void
  /** True once enter wipe has lifted and the battle is visible. */
  battleRevealed?: boolean
}

/**
 * Split stage background.
 * Top half = enemy's hometown background.
 * Bottom half = player's hometown background.
 */
function StageBackground({ enemySrc, playerSrc }: { enemySrc: string; playerSrc: string }) {
  useEffect(() => {
    console.log('[BattleScreen] stage bg — enemy:', enemySrc, 'player:', playerSrc)
  }, [enemySrc, playerSrc])

  return (
    <div className="battle-screen__stage-bg" aria-hidden>
      <div className="battle-screen__stage-bg-fallback" />
      {/* Enemy hometown — top half */}
      <img
        className="battle-screen__stage-bg-img battle-screen__stage-bg-img--top"
        src={enemySrc}
        alt=""
        draggable={false}
        onError={() => console.error('[BattleScreen] Failed to load enemy bg:', enemySrc)}
      />
      {/* Player hometown — bottom half */}
      <img
        className="battle-screen__stage-bg-img battle-screen__stage-bg-img--bottom"
        src={playerSrc}
        alt=""
        draggable={false}
        onError={() => console.error('[BattleScreen] Failed to load player bg:', playerSrc)}
      />
      {/* Center divider seam */}
      <div className="battle-screen__stage-bg-seam" />
    </div>
  )
}

function drawPlayerBattleSprite(
  canvas: HTMLCanvasElement,
  sheet: SpriteSheet,
  tuning: ReturnType<typeof getMidnightVariantRenderTuning>,
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = BATTLE_PLAYER_SOURCE_W
  const dh = BATTLE_PLAYER_SOURCE_H
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)
  // Player faces up (toward enemy at top) in battle
  drawSheetFrame(ctx, sheet, 'up', getIdleFrameIndex(), 0, tuning.feetOffset, dw, dh, 1, tuning)
}

function drawEnemyBattleSprite(
  canvas: HTMLCanvasElement,
  spriteImg: HTMLImageElement,
  spriteColumns: number,
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = BATTLE_ENEMY_SOURCE_W
  const dh = BATTLE_ENEMY_SOURCE_H
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)

  const cols = spriteColumns
  const frameW = Math.floor(spriteImg.naturalWidth / cols)
  const frameH = Math.floor(spriteImg.naturalHeight)
  const col = 0 // left-facing frame (enemy faces left, toward player at bottom)
  const nsx = Math.floor(col * frameW)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    spriteImg,
    nsx,
    0,
    frameW,
    frameH,
    0,
    0,
    dw,
    dh,
  )
}

export function BattleScreen({ npcId, onBattleEnd, onWinPayoff, battleRevealed = true }: Props) {
  const battleScreenRef = useRef<HTMLDivElement>(null)
  const playfieldRef = useRef<HTMLDivElement>(null)
  const telegraphRowRef = useRef<HTMLElement>(null)
  const movesRef = useRef<HTMLDivElement>(null)
  const playerStatusRef = useRef<HTMLDivElement>(null)
  const playerPlateRef = useRef<HTMLDivElement>(null)
  const xpBarRef = useRef<HTMLDivElement>(null)
  const statusLegendRef = useRef<HTMLParagraphElement>(null)
  const playerCanvasRef = useRef<HTMLCanvasElement>(null)
  const enemyWrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const [stageHeight, setStageHeight] = useState(0)
  const [enemyPlacement, setEnemyPlacement] = useState<BattleSpritePlacement>(DEFAULT_ENEMY_PLACEMENT)
  const [playerPlacement, setPlayerPlacement] = useState<BattleSpritePlacement>(DEFAULT_PLAYER_PLACEMENT)
  const [playerLayoutReady, setPlayerLayoutReady] = useState(false)
  const [enemyLayoutReady, setEnemyLayoutReady] = useState(false)
  const midnightSheetRef = useRef<SpriteSheet | null>(null)
  const endHandledRef = useRef(false)
  const winPayoffCommittedRef = useRef(false)
  const [winPayoffNpc, setWinPayoffNpc] = useState<NpcCombatEntry | null>(null)
  const showDebug = useSyncExternalStore(subscribePlayerStore, getShowDebug, getShowDebug)
  const playerSkills = useSyncExternalStore(subscribePlayerStore, getPlayerSkills, getPlayerSkills)
  const playerBuildLabel = useSyncExternalStore(
    subscribePlayerStore,
    () => deriveBuildName(getPlayerSkills()).name,
    () => deriveBuildName(getPlayerSkills()).name,
  )
  const playerLeanAccent = leanSkillAccentColor(
    deriveBuildLoopType(playerSkills) ?? 'none',
  )
  const authState = useSyncExternalStore(subscribeAuthStore, getAuthState, getAuthState)
  const playerHandle = authState.profile?.handle ?? 'YOU'
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  const [state, dispatch] = useReducer(
    battleReducer,
    npcId,
    (id) => createInitialBattleState(id),
  )

  // Measure stage height so sprite feet Y positions stay in the right half
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? el.clientHeight
      if (h > 0) setStageHeight(h)
    })
    ro.observe(el)
    const h = el.clientHeight
    if (h > 0) setStageHeight(h)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!isDevSparNpcId(npcId)) {
      track('battle_start', { enemyId: npcId })
    }
  }, [npcId])

  const shouldRunBattleTutorial =
    npcId === WALKER_NPC_ID && !isBattleTutorialSeen()
  const [battleTutorialBlocking, setBattleTutorialBlocking] = useState(shouldRunBattleTutorial)
  const [battleTutorialOverlayOpen, setBattleTutorialOverlayOpen] = useState(false)
  const [battleTutorialStep, setBattleTutorialStep] = useState(0)
  const walkerHeavyTutorial =
    npcId === WALKER_NPC_ID && isWalkerHeavyTutorialActive(npcId)
  const [walkerHeavyBeat, setWalkerHeavyBeat] = useState<
    null | 'teach' | 'acting' | 'confirm'
  >(null)
  const [walkerHeavyTeachStep, setWalkerHeavyTeachStep] = useState(0)

  useEffect(() => {
    if (!battleTutorialBlocking || battleTutorialOverlayOpen) return
    if (!battleRevealed || !playerLayoutReady || !enemyLayoutReady) return
    const t = window.setTimeout(() => setBattleTutorialOverlayOpen(true), 0)
    return () => window.clearTimeout(t)
  }, [
    battleTutorialBlocking,
    battleTutorialOverlayOpen,
    battleRevealed,
    playerLayoutReady,
    enemyLayoutReady,
  ])

  const closeBattleTutorial = useCallback(() => {
    setBattleTutorialBlocking(false)
    setBattleTutorialOverlayOpen(false)
    setBattleTutorialSeen()
  }, [])

  const advanceBattleTutorial = useCallback(() => {
    if (battleTutorialStep >= BATTLE_TUTORIAL_STEPS.length - 1) {
      closeBattleTutorial()
      return
    }
    setBattleTutorialStep((step) => step + 1)
  }, [battleTutorialStep, closeBattleTutorial])

  const prevEnemyHpRef = useRef(state.enemyHp)
  const prevPlayerHpRef = useRef(state.playerHp)
  const prevFeedbackSeqRef = useRef(state.feedbackSeq)
  const winMatchupCalloutRef = useRef(false)
  /** Skill of the last player move — used to pick the attack animation variant. */
  const lastPlayerMoveSkillRef = useRef<'attack' | 'speed' | 'defense' | 'luck'>('attack')
  // Displayed HP lags real HP — only updates after the lunge animation finishes
  const [displayedEnemyHp, setDisplayedEnemyHp] = useState(state.enemyHp)
  const [displayedPlayerHp, setDisplayedPlayerHp] = useState(state.playerHp)
  const [enemyHitFx, setEnemyHitFx] = useState(false)
  const [enemyAtkFx, setEnemyAtkFx] = useState(false)
  const [playerHitFx, setPlayerHitFx] = useState(false)
  /** Null = no animation. Otherwise the skill type that determines animation style. */
  const [playerAtkFx, setPlayerAtkFx] = useState<'attack' | 'speed' | 'defense' | 'luck' | null>(null)
  const [playerDodgeFx, setPlayerDodgeFx] = useState(false)
  const [enemyCritFx, setEnemyCritFx] = useState(false)
  const [floaters, setFloaters] = useState<BattleFloater[]>([])
  const [knockoutPopup, setKnockoutPopup] = useState<'win' | 'lose' | null>(null)
  const [narrationVisible, setNarrationVisible] = useState(false)
  const [loseNarrationVisible, setLoseNarrationVisible] = useState(false)

  const clampBattleScrollDrift = useCallback(() => {
    for (const el of [
      battleScreenRef.current,
      playfieldRef.current,
      stageRef.current,
    ]) {
      if (!el) continue
      if (el.scrollTop !== 0) el.scrollTop = 0
      if (el.scrollLeft !== 0) el.scrollLeft = 0
    }
  }, [])

  const busy = state.phase !== 'player'
  const playerHpPct = Math.max(0, (displayedPlayerHp / state.playerStats.maxHp) * 100)
  const enemyHpPct = Math.max(0, (displayedEnemyHp / state.enemyMaxHp) * 100)
  const enemyStatusTags = getFighterStatusTags('enemy', state.combatStatus)
  const playerStatusTags = getFighterStatusTags('player', state.combatStatus)
  const playerLevel = getPlayerLevel()
  const counterRelation = getPlayerCounterRelation(state.npc.leanSkill)
  // Split stage backgrounds — enemy uses their battleLocation, player uses chosen hometown
  const playerHometownId = useSyncExternalStore(
    subscribeHometownStore,
    getPlayerHometown,
    getPlayerHometown,
  )
  const playerHometownDef = getHometownDef(playerHometownId)
  const playerBattleBgSrc = getBattleBgForLocation(playerHometownDef.battleLocationId)

  const enemyHometownId = battleLocationToHometownId(state.npc.battleLocation)
  const enemyHometownDef = getHometownDef(enemyHometownId)
  const enemyBattleBgSrc = getBattleBgForLocation(enemyHometownDef.battleLocationId)
  const payoffNpc = winPayoffNpc ?? state.npc
  const showWinNarration =
    state.phase === 'ended' &&
    state.result === 'win' &&
    payoffNpc.losingLine.trim().length > 0 &&
    narrationVisible
  const battleSettled = battleRevealed && playerLayoutReady && enemyLayoutReady
  const [settleCoverGone, setSettleCoverGone] = useState(false)
  useEffect(() => {
    if (!battleSettled || settleCoverGone) return
    const timer = window.setTimeout(() => setSettleCoverGone(true), 500)
    return () => window.clearTimeout(timer)
  }, [battleSettled, settleCoverGone])

  useEffect(() => {
    setWinPayoffNpc(null)
    winPayoffCommittedRef.current = false
    endHandledRef.current = false
    setPlayerLayoutReady(false)
    setEnemyLayoutReady(false)
    setKnockoutPopup(null)
    setNarrationVisible(false)
    setLoseNarrationVisible(false)
  }, [npcId])

  useLayoutEffect(() => {
    if (state.phase === 'ended' && state.result === 'win') {
      setWinPayoffNpc((prev) => prev ?? { ...state.npc })
      return
    }
    setWinPayoffNpc(null)
  }, [state.phase, state.result, state.npc])

  useEffect(() => {
    if (state.phase !== 'ended' || state.result !== 'win') return
    if (winPayoffCommittedRef.current) return
    winPayoffCommittedRef.current = true
    onWinPayoff?.(npcId)
  }, [state.phase, state.result, npcId, onWinPayoff])
  const logLines = state.log.slice(-2)
  const telegraphDisplay = getTelegraphDisplay(state)
  const leanAccent = leanSkillAccentColor(state.npc.leanSkill)
  const telegraphMoveColor =
    state.upcomingMove !== 'STUNNED'
      ? enemyMoveSkillColor(state.upcomingMove as EnemyMoveId)
      : leanAccent
  const heavyTelegraph =
    state.upcomingMove !== 'STUNNED' &&
    state.phase !== 'ended' &&
    (telegraphDisplay?.heavy ??
      getEnemyMoveDef(state.upcomingMove as EnemyMoveId).damageMult >= 1.6)
  const walkerHeavyBlocking =
    walkerHeavyTutorial &&
    (walkerHeavyBeat === 'teach' || walkerHeavyBeat === 'confirm')
  const inputBlocked = battleTutorialBlocking || walkerHeavyBlocking || showWinNarration

  const finishBattle = useCallback(
    (result: 'win' | 'lose') => {
      if (endHandledRef.current) return
      endHandledRef.current = true
      const healed = applyBattleEndHealing(result, state.playerStats.maxHp, state.playerHp)
      setOverworldPlayerHp(healed)
      onBattleEnd(result, state.turn)
    },
    [onBattleEnd, state.playerHp, state.playerStats.maxHp, state.turn],
  )

  const equippedMoves = useSyncExternalStore(
    subscribePlayerStore,
    getEquippedMoves,
    getEquippedMoves,
  )

  const battleMoveButtons = equippedMoves.map((move) => getMoveUiMeta(move))

  useEffect(() => {
    if (!walkerHeavyTutorial || battleTutorialBlocking) return
    if (state.phase === 'ended' || walkerHeavyBeat != null) return
    if (state.upcomingMove !== 'HAYMAKER' || state.turn < 1) return
    setWalkerHeavyTeachStep(0)
    setWalkerHeavyBeat('teach')
  }, [
    walkerHeavyTutorial,
    battleTutorialBlocking,
    state.phase,
    state.upcomingMove,
    state.turn,
    walkerHeavyBeat,
  ])

  useEffect(() => {
    if (walkerHeavyBeat !== 'acting') return
    const readBeat = state.feedbackEvents.some((e) =>
      e.text.toLowerCase().includes('read the telegraph'),
    )
    if (!readBeat) return
    setWalkerHeavyBeat('confirm')
    setWalkerHeavyTutorialBeatSeen()
  }, [walkerHeavyBeat, state.feedbackEvents, state.feedbackSeq])

  const handleMove = useCallback(
    (move: PlayerMove, slot: number) => {
      if (inputBlocked && walkerHeavyBeat !== 'acting') return
      if (state.phase !== 'player') return
      const moveDef = getMoveDef(move)
      const skill = moveDef?.skill
      if (skill === 'attack' || skill === 'speed' || skill === 'defense' || skill === 'luck') {
        lastPlayerMoveSkillRef.current = skill
      }
      dispatch({ type: 'PLAYER_MOVE', move, slot })
    },
    [inputBlocked, walkerHeavyBeat, state.phase],
  )

  const handleNarrationContinue = useCallback(() => {
    if (!showWinNarration) return
    finishBattle('win')
  }, [finishBattle, showWinNarration])

  const handleLoseNarrationContinue = useCallback(() => {
    setLoseNarrationVisible(false)
    finishBattle('lose')
  }, [finishBattle])

  const handleKnockoutContinue = useCallback(() => {
    if (!knockoutPopup) return
    const result = knockoutPopup
    setKnockoutPopup(null)
    finishBattle(result)
  }, [finishBattle, knockoutPopup])

  // After the final blow animation completes, show the appropriate end screen.
  const KNOCKOUT_POPUP_DELAY_MS = 2400  // animation (1300ms) + 1s pause before popup
  useEffect(() => {
    if (state.phase !== 'ended') return
    const hasNarration = payoffNpc.losingLine.trim().length > 0
    if (state.result === 'lose') {
      const hasWinNarration = (payoffNpc.winningLine ?? '').trim().length > 0
      if (hasWinNarration) {
        const timer = window.setTimeout(() => setLoseNarrationVisible(true), KNOCKOUT_POPUP_DELAY_MS)
        return () => window.clearTimeout(timer)
      }
      const timer = window.setTimeout(() => setKnockoutPopup('lose'), KNOCKOUT_POPUP_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
    if (state.result === 'win' && hasNarration) {
      const timer = window.setTimeout(() => setNarrationVisible(true), KNOCKOUT_POPUP_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
    if (state.result === 'win' && !hasNarration) {
      const timer = window.setTimeout(() => setKnockoutPopup('win'), KNOCKOUT_POPUP_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.result])

  useEffect(() => {
    winMatchupCalloutRef.current = false
  }, [npcId])

  useEffect(() => {
    if (state.phase !== 'ended' || state.result !== 'win') return
    if (counterRelation !== 'advantage' || winMatchupCalloutRef.current) return
    winMatchupCalloutRef.current = true
    // Matchup "type win." callout hidden per design
  }, [state.phase, state.result, counterRelation])

  useEffect(() => {
    const enemyDelta = prevEnemyHpRef.current - state.enemyHp
    const playerDelta = prevPlayerHpRef.current - state.playerHp
    // When both sides take damage simultaneously (reflect, bleed, etc.),
    // stagger the second floater by 500ms so they never overlap.
    const STAGGER_MS = enemyDelta > 0 && playerDelta > 0 ? 500 : 0

    if (enemyDelta > 0) {
      const skill = lastPlayerMoveSkillRef.current
      const LUNGE_MS = skill === 'speed' ? 480 : skill === 'defense' ? 600 : 760
      const HIT_FLASH_MS = 40
      const DAMAGE_DELAY_MS = 540
      const HIT_MS = 840
      const id = Date.now() + Math.random()
      // Bleed damage has its own feedback floater — only show the direct attack portion here.
      const attackDelta = Math.max(0, enemyDelta - state.feedbackBleedDamage)
      setPlayerAtkFx(skill)
      window.setTimeout(() => setPlayerAtkFx(null), LUNGE_MS)
      window.setTimeout(() => {
        setEnemyHitFx(true)
        window.setTimeout(() => setEnemyHitFx(false), HIT_MS)
      }, LUNGE_MS + HIT_FLASH_MS)
      window.setTimeout(() => {
        setDisplayedEnemyHp(state.enemyHp)
        if (attackDelta > 0) {
          setFloaters((f) => [
            ...f,
            { id, text: `-${attackDelta}`, target: 'enemy', tone: 'attack' },
          ])
          window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
        }
      }, LUNGE_MS + DAMAGE_DELAY_MS)
      clampBattleScrollDrift()
    }
    if (playerDelta > 0) {
      const LUNGE_MS = 760
      const HIT_FLASH_MS = 40
      const DAMAGE_DELAY_MS = 540 + STAGGER_MS
      const HIT_MS = 840
      const id = Date.now() + Math.random()
      setEnemyAtkFx(true)
      window.setTimeout(() => setEnemyAtkFx(false), LUNGE_MS)
      window.setTimeout(() => {
        setPlayerHitFx(true)
        window.setTimeout(() => setPlayerHitFx(false), HIT_MS)
      }, LUNGE_MS + HIT_FLASH_MS + STAGGER_MS)
      window.setTimeout(() => {
        setDisplayedPlayerHp(state.playerHp)
        setFloaters((f) => [
          ...f,
          { id, text: `-${playerDelta}`, target: 'player', tone: 'attack' },
        ])
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
      }, LUNGE_MS + DAMAGE_DELAY_MS)
      clampBattleScrollDrift()
    }

    // Healing or no-damage change: sync displayed HP immediately
    if (enemyDelta <= 0) setDisplayedEnemyHp(state.enemyHp)
    if (playerDelta <= 0) setDisplayedPlayerHp(state.playerHp)

    prevEnemyHpRef.current = state.enemyHp
    prevPlayerHpRef.current = state.playerHp
  }, [state.enemyHp, state.playerHp, state.feedbackBleedDamage, clampBattleScrollDrift])

  useEffect(() => {
    if (state.feedbackSeq === prevFeedbackSeqRef.current) return
    prevFeedbackSeqRef.current = state.feedbackSeq

    const events = state.feedbackEvents
    if (events.length === 0) return

    const skill = lastPlayerMoveSkillRef.current
    const lunge = skill === 'speed' ? 480 : skill === 'defense' ? 600 : 760
    // When the enemy acts first, the player's attack lands in phase 2 (after BATTLE_MOVE_GAP_MS).
    // Enemy-targeting floaters must be offset by that gap so they align with the hit.
    const enemyActedFirst = state.feedbackEnemyActedFirst
    const playerPhaseDelay = enemyActedFirst ? BATTLE_MOVE_GAP_MS : 0
    const playerImpact = lunge + 540 + playerPhaseDelay  // when player's strike lands
    const enemyImpact = lunge + 540                       // when enemy's strike lands (phase 1)

    if (events.some((e) => e.kind === 'dodged')) {
      window.setTimeout(() => {
        setPlayerDodgeFx(true)
        window.setTimeout(() => setPlayerDodgeFx(false), 420)
      }, enemyImpact)
    }
    const CRIT_EXTRA_MS = 500
    if (events.some((e) => e.kind === 'crit')) {
      window.setTimeout(() => {
        setEnemyCritFx(true)
        window.setTimeout(() => setEnemyCritFx(false), 480)
      }, playerImpact + CRIT_EXTRA_MS)
    }

    events.forEach((event, index) => {
      const id = Date.now() + Math.random() + index
      const durationMs = event.kind === 'crit' ? 1200 : 900
      const critOffset = event.kind === 'crit' ? CRIT_EXTRA_MS : 0
      // Events targeting the enemy come from the player's attack — use playerImpact.
      // Events targeting the player come from the enemy's attack — use enemyImpact.
      const baseDelay = event.target === 'enemy' ? playerImpact : enemyImpact
      window.setTimeout(() => {
        setFloaters((f) => [
          ...f,
          { id, text: event.text, target: event.target, tone: event.tone, kind: event.kind },
        ])
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), durationMs)
      }, baseDelay + index * 500 + critOffset)
    })
    clampBattleScrollDrift()
  }, [state.feedbackSeq, state.feedbackEvents, clampBattleScrollDrift])

  useLayoutEffect(() => {
    clampBattleScrollDrift()
  }, [
    enemyHitFx,
    enemyAtkFx,
    playerHitFx,
    playerAtkFx,
    playerDodgeFx,
    enemyCritFx,
    clampBattleScrollDrift,
  ])

  useEffect(() => {
    if (state.phase !== 'busy') return
    // Hold resolution while the level-up notification is open — but only after the
    // full turn has resolved (idle) AND all floaters have finished, so the player
    // sees the battle animations before the overlay appears.
    if (state.pendingLevelUpNotification && state.resolveStep === 'idle' && floaters.length === 0) return

    if (state.resolveStep === 'pause_after_first') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_SECOND' })
      }, BATTLE_MOVE_GAP_MS)
      return () => window.clearTimeout(timer)
    }

    if (state.resolveStep === 'pause_after_second') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_FINISH' })
      }, BATTLE_ROUND_END_GAP_MS)
      return () => window.clearTimeout(timer)
    }
  }, [state.phase, state.resolveStep, state.pendingLevelUpNotification, floaters.length])

  useEffect(() => {
    let cancelled = false
    const walkSrc = getMidnightWalkSrc(selectedMidnightVariant)
    const tuning = getMidnightVariantRenderTuning(selectedMidnightVariant)

    void loadSpriteSheetWithFallback(walkSrc).then(async (sheet) => {
      if (cancelled || !sheet?.loaded) return
      midnightSheetRef.current = sheet
      const canvas = playerCanvasRef.current
      if (!canvas) return
      drawPlayerBattleSprite(canvas, sheet, tuning)
      const bounds = measureCanvasVisibleBounds(
        canvas,
        `player:${walkSrc}`,
        'player',
      )
      const scaledTargetH = stageHeight > 0 ? Math.floor(stageHeight * 0.33) : BATTLE_TARGET_VISIBLE_H
      const playerTarget = Math.floor(scaledTargetH * BATTLE_PLAYER_VISIBLE_MULT)
      const playerFeetY = stageHeight > 0 ? Math.floor(stageHeight * 0.95) : BATTLE_PLAYER_FEET.y
      const placement = layoutSpriteAtFeet(
        bounds,
        BATTLE_PLAYER_SOURCE_W,
        BATTLE_PLAYER_SOURCE_H,
        BATTLE_PLAYER_FEET.x,
        playerFeetY,
        playerTarget,
      )
      setPlayerPlacement(placement)
      setPlayerLayoutReady(true)
    })

    return () => {
      cancelled = true
      midnightSheetRef.current = null
    }
  }, [selectedMidnightVariant, stageHeight])

  useEffect(() => {
    let cancelled = false
    const canvas = enemyWrapRef.current?.querySelector('canvas')
    if (!canvas) return

    const spriteSrc = state.npc.spriteSrc ?? MARK_SPRITE_SRC
    const spriteColumns = 4
    const frameCol = 2
    const label = state.npc.displayName.toLowerCase()

    void (async () => {
      const img = new Image()
      img.src = spriteSrc
      try {
        await ensureImageDecoded(img)
      } catch {
        return
      }
      if (cancelled) return

      const frameW = Math.max(1, Math.floor(img.naturalWidth / spriteColumns))
      const frameH = Math.max(1, Math.floor(img.naturalHeight))
      const bounds = measureNaturalImageFrame(
        img,
        frameCol,
        spriteColumns,
        spriteSrc,
        label,
      )
      drawEnemyBattleSprite(canvas, img, spriteColumns)
      const scaledEnemyH = stageHeight > 0 ? Math.floor(stageHeight * 0.33) : BATTLE_TARGET_VISIBLE_H
      const enemyTarget = Math.floor(scaledEnemyH * (state.npc.battleSizeMult ?? 1))
      const enemyFeetY = stageHeight > 0 ? Math.floor(stageHeight * 0.37) : BATTLE_ENEMY_FEET.y
      const placement = layoutSpriteAtFeet(
        bounds,
        frameW,
        frameH,
        BATTLE_ENEMY_FEET.x,
        enemyFeetY,
        enemyTarget,
      )
      if (!cancelled) {
        setEnemyPlacement(placement)
        setEnemyLayoutReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [state.npc.spriteSrc, state.npc.displayName, state.npc.battleSizeMult, stageHeight])

  return (
    <div
      ref={battleScreenRef}
      className={`battle-screen${battleSettled ? '' : ' battle-screen--settling'}`}
      aria-label={`Battle vs ${state.npc.displayName}`}
    >
      {!settleCoverGone && (
        <div
          className={`battle-screen__settle-cover${battleSettled ? ' battle-screen__settle-cover--fade-out' : ''}`}
          aria-hidden
        />
      )}
      <div className="battle-screen__content">
        <div className="battle-screen__playfield" ref={playfieldRef}>

          {/* Stage fills the screen — fighters, plates, log all live inside */}
          <section className="battle-screen__stage" ref={stageRef} aria-hidden>
            <StageBackground enemySrc={enemyBattleBgSrc} playerSrc={playerBattleBgSrc} />
            <div className="battle-screen__arena">

              {/* ── Enemy at top of arena ── */}
              {/* Enemy plate — fixed anchor, never animates */}
              <div className="battle-screen__plate-anchor battle-screen__plate-anchor--enemy" style={{ top: enemyPlacement.visibleDrawY + 5 }}>
                <div className="battle-screen__sprite-plate">
                  <span className="battle-screen__plate-name">
                    {state.npc.displayName.toUpperCase()}
                    {state.npc.level > 0 ? (
                      <span className="battle-screen__plate-level"> · LVL {state.npc.level}</span>
                    ) : null}
                  </span>
                  <span className="battle-screen__plate-archetype" style={{ color: leanAccent }}>
                    {deriveNpcArchetypeLabel(state.npc.stats, state.npc.leanSkill)}
                  </span>
                  <div className="battle-screen__hp-track">
                    <div
                      className="battle-screen__hp-fill battle-screen__hp-fill--enemy"
                      style={{ width: `${enemyHpPct}%` }}
                    />
                  </div>
                  <span className="battle-screen__hp-label">{displayedEnemyHp} / {state.enemyMaxHp}</span>
                  {enemyStatusTags.length > 0 && (
                    <div className="battle-screen__plate-status-slot">
                      <FighterStatusTags tags={enemyStatusTags} />
                    </div>
                  )}
                </div>
              </div>

              {/* Enemy sprite — animates independently */}
              <div
                className={`battle-screen__fighter battle-screen__fighter--enemy${enemyHitFx ? ' battle-screen__fighter--hit' : ''}${enemyAtkFx ? ' battle-screen__fighter--enemy-attack' : ''}${enemyCritFx ? ' battle-screen__fighter--crit' : ''}`}
                style={{ top: enemyPlacement.drawY + 5 }}
              >
                <div ref={enemyWrapRef} className="battle-screen__enemy-sprite-wrap">
                  <canvas
                    className="battle-screen__enemy-sprite-canvas"
                    width={BATTLE_ENEMY_SOURCE_W}
                    height={BATTLE_ENEMY_SOURCE_H}
                    style={{
                      width: enemyPlacement.displayWidth,
                      height: enemyPlacement.displayHeight,
                    }}
                  />
                </div>
              </div>

              {/* ── Telegraph between fighters ── */}
              {!showWinNarration && (
                <section className="battle-screen__log" ref={telegraphRowRef} aria-live="polite">
                  {/* Line 1: telegraph */}
                  <div
                    className={`battle-screen__log-line battle-screen__log-line--telegraph${heavyTelegraph ? ' battle-screen__log-line--heavy' : ''}`}
                  >
                    {telegraphDisplay ? (
                      <>
                        {telegraphDisplay.prefix}
                        {telegraphDisplay.moveName ? (
                          <span
                            className="battle-screen__telegraph-move"
                            style={{ color: telegraphMoveColor }}
                          >
                            {telegraphDisplay.moveName}
                          </span>
                        ) : null}
                        {telegraphDisplay.suffix}
                      </>
                    ) : (
                      <>&nbsp;</>
                    )}
                  </div>
                  {/* Line 2: last action */}
                  <div className="battle-screen__log-line">
                    {logLines[logLines.length - 1] ?? <>&nbsp;</>}
                  </div>
                </section>
              )}



              {/* Player plate — fixed anchor, never animates */}
              <div className="battle-screen__plate-anchor battle-screen__plate-anchor--player" style={{ top: playerPlacement.visibleDrawY }}>
                <div ref={playerPlateRef} className="battle-screen__sprite-plate">
                  <span className="battle-screen__plate-name">
                    {playerHandle.toUpperCase()}
                    <span className={`battle-screen__plate-level${state.playerLevelFlash ? ' battle-screen__plate-level--flash' : ''}`}>
                      {' · LVL '}{playerLevel}
                    </span>
                  </span>
                  <span className="battle-screen__plate-archetype" style={{ color: playerLeanAccent }}>
                    {playerBuildLabel}
                  </span>
                  <div className="battle-screen__hp-track">
                    <div
                      className="battle-screen__hp-fill battle-screen__hp-fill--player"
                      style={{ width: `${playerHpPct}%` }}
                    />
                  </div>
                  <span className="battle-screen__hp-label">{displayedPlayerHp} / {state.playerStats.maxHp}</span>
                  {playerStatusTags.length > 0 && (
                    <div ref={playerStatusRef} className="battle-screen__plate-status-slot">
                      <FighterStatusTags tags={playerStatusTags} />
                    </div>
                  )}
                  {battleTutorialBlocking && (
                    <p ref={statusLegendRef} className="battle-screen__status-legend">{STATUS_EFFECT_LEGEND}</p>
                  )}
                </div>
              </div>

              {/* Player sprite — animates independently */}
              <div
                className={`battle-screen__fighter battle-screen__fighter--player${playerHitFx ? ' battle-screen__fighter--hit' : ''}${playerAtkFx ? ` battle-screen__fighter--atk-${playerAtkFx}` : ''}${playerDodgeFx ? ' battle-screen__fighter--dodge' : ''}`}
                style={{ top: playerPlacement.drawY }}
              >
                <canvas
                  ref={playerCanvasRef}
                  className="battle-screen__player-sprite-canvas"
                  width={BATTLE_PLAYER_SOURCE_W}
                  height={BATTLE_PLAYER_SOURCE_H}
                  style={{
                    width: playerPlacement.displayWidth,
                    height: playerPlacement.displayHeight,
                  }}
                />
              </div>

              {/* ── Damage / feedback floaters ── */}
              {floaters.map((f) => (
                <span
                  key={f.id}
                  className={`battle-screen__floater battle-screen__floater--${f.target} battle-screen__floater--${FLOATER_TONE_CLASS[f.tone]}${f.kind ? ` battle-screen__floater--kind-${f.kind}` : ' battle-screen__floater--kind-damage'}${f.kind === 'crit' ? ' battle-screen__floater--crit-pop' : ''}`}
                >
                  {f.text}
                </span>
              ))}
            </div>
            {showDebug && (
              <BattlePlacementGrid
                stageRef={stageRef}
                enemyRef={enemyWrapRef}
                playerRef={playerCanvasRef}
                enemyPlacement={enemyPlacement}
                playerPlacement={playerPlacement}
              />
            )}
          </section>

          {/* ── Bottom: move grid only (player HUD lives in sprite plate) ── */}
          <div className="battle-screen__bottom-stack">
            <section className="battle-screen__action">
              <div
                ref={movesRef}
                className="battle-screen__moves"
                role="group"
                aria-label="Battle moves"
              >
                  {battleMoveButtons.map(({ move, label, description, className }, slot) => {
                    const stolen = state.battleMove.snagStolen[slot]
                    const displayLabel = stolen
                      ? stolen.replace('_', ' ')
                      : label
                    const moveDef = getMoveDef(move)
                    const skillLevel = moveDef ? (playerSkills[moveDef.skill as keyof typeof playerSkills]?.level ?? null) : null
                    const skillTag = moveDef && skillLevel != null ? `${moveDef.skill} · lv ${skillLevel}` : null
                    return (
                      <button
                        key={`${slot}-${move}-${stolen ?? ''}`}
                        type="button"
                        className={`battle-screen__move ${className}${busy || (inputBlocked && walkerHeavyBeat !== 'acting') ? ' battle-screen__move--busy' : ''}`}
                        disabled={busy || (inputBlocked && walkerHeavyBeat !== 'acting')}
                        onPointerDown={(e) => {
                          if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
                            e.preventDefault()
                          }
                        }}
                        onFocus={(e) => {
                          try {
                            e.currentTarget.focus({ preventScroll: true })
                          } catch {
                            // ignore unsupported browsers
                          }
                        }}
                        onClick={() => handleMove(move, slot)}
                      >
                        <span className="battle-screen__move-name">
                          {displayLabel}
                          {skillTag && !stolen && (
                            <span className="battle-screen__move-skill-tag">({skillTag})</span>
                          )}
                        </span>
                        <span className="battle-screen__move-desc">{description}</span>
                      </button>
                    )
                  })}
                </div>
            </section>
            {/* NPC losing line — overlays moveset after player wins */}
            {showWinNarration && knockoutPopup === null && (
              <button
                type="button"
                className="battle-screen__narration battle-screen__narration--payoff"
                onClick={handleNarrationContinue}
              >
                <span className="battle-screen__narration-label">{payoffNpc.displayName}</span>
                <p className="battle-screen__narration-text">{payoffNpc.losingLine}</p>
                <span className="battle-screen__narration-continue">tap to continue ▸</span>
              </button>
            )}
            {/* NPC winning line — overlays moveset after player loses */}
            {loseNarrationVisible && (
              <button
                type="button"
                className="battle-screen__narration battle-screen__narration--payoff"
                onClick={handleLoseNarrationContinue}
              >
                <span className="battle-screen__narration-label">{state.npc.displayName}</span>
                <p className="battle-screen__narration-text">{state.npc.winningLine}</p>
                <span className="battle-screen__narration-continue">tap to continue ▸</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {battleTutorialOverlayOpen && (
        <BattleTutorialOverlay
          stepIndex={battleTutorialStep}
          targetRefs={{
            battle: battleScreenRef,
            stage: stageRef,
            telegraph: telegraphRowRef,
            moves: movesRef,
            status: playerStatusRef,
            plate: playerPlateRef,
            statuslegend: statusLegendRef,
            xpbar: xpBarRef,
          }}
          onNext={advanceBattleTutorial}
          onSkip={closeBattleTutorial}
        />
      )}
      {walkerHeavyBeat === 'teach' && (
        <BattleTutorialOverlay
          stepIndex={walkerHeavyTeachStep}
          targetRefs={{
            battle: battleScreenRef,
            stage: stageRef,
            telegraph: telegraphRowRef,
            moves: movesRef,
            status: playerStatusRef,
            plate: playerPlateRef,
            statuslegend: statusLegendRef,
            xpbar: xpBarRef,
          }}
          onNext={() => {
            if (walkerHeavyTeachStep < 1) {
              setWalkerHeavyTeachStep(1)
              return
            }
            setWalkerHeavyBeat('acting')
          }}
          onSkip={() => setWalkerHeavyBeat('acting')}
          stepsOverride={WALKER_HEAVY_TEACH_STEPS}
        />
      )}
      {walkerHeavyBeat === 'confirm' && (
        <BattleTutorialOverlay
          stepIndex={0}
          targetRefs={{
            battle: battleScreenRef,
            stage: stageRef,
            telegraph: telegraphRowRef,
            moves: movesRef,
            status: playerStatusRef,
            plate: playerPlateRef,
            statuslegend: statusLegendRef,
            xpbar: xpBarRef,
          }}
          onNext={() => setWalkerHeavyBeat(null)}
          onSkip={() => setWalkerHeavyBeat(null)}
          stepsOverride={WALKER_HEAVY_CONFIRM_STEPS}
        />
      )}
      {state.pendingLevelUpNotification && state.resolveStep === 'idle' && floaters.length === 0 && (
        <LevelUpOverlay
          notification={state.pendingLevelUpNotification}
          onDismiss={() => dispatch({ type: 'DISMISS_LEVEL_UP' })}
        />
      )}
      {knockoutPopup && (
        <div className="battle-knockout-overlay" onClick={handleKnockoutContinue}>
          <div className="battle-knockout-card">
            <p className="battle-knockout-name">
              {knockoutPopup === 'win' ? state.npc.displayName.toUpperCase() : playerHandle.toUpperCase()}
            </p>
            <p className="battle-knockout-label">has fallen.</p>
            <span className="battle-knockout-continue">tap to continue ▸</span>
          </div>
        </div>
      )}
    </div>
  )
}
