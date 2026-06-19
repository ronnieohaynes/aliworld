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
  resolveBattleBackgroundSrc,
} from '../data/battleBackgrounds'
import {
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
import { isGymGauntletCombatId } from '../data/gymWeeks'
import { isGhostCombatId } from '../data/ghostCombat'
import {
  BATTLE_ENEMY_FEET,
  BATTLE_ENEMY_PLATE_OFFSET_X,
  BATTLE_FIGHTER_NUDGE_X,
  BATTLE_ENEMY_SOURCE_H,
  BATTLE_ENEMY_SOURCE_W,
  BATTLE_PLAYER_FEET,
  BATTLE_PLAYER_PLATE_OFFSET_X,
  BATTLE_PLAYER_PLATE_OFFSET_Y,
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
  RIB_MOVE_GAP_MS,
  RIB_ROUND_END_GAP_MS,
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
import { MoveScaleTag } from './MoveScaleTag'
import './MoveScaleTag.css'
import { trackProgressEvent } from '../lib/analytics'
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

/** How long a damage-induced HP bar/number countdown takes, end to end. */
const HP_TICK_DURATION_MS = 400
/** Cap on how many discrete ticks a single hit's countdown is split into. */
const HP_TICK_MAX_STEPS = 20

/**
 * Steps a displayed HP value down from `from` to `to` in small ticks rather
 * than jumping straight to the final value.
 */
function animateHpTicks(
  setDisplayed: (value: number) => void,
  from: number,
  to: number,
  durationMs: number = HP_TICK_DURATION_MS,
): void {
  const delta = from - to
  if (delta <= 0) {
    setDisplayed(to)
    return
  }
  const steps = Math.min(delta, HP_TICK_MAX_STEPS)
  const stepMs = Math.max(16, Math.floor(durationMs / steps))
  let i = 0
  const tick = () => {
    i += 1
    const value = i < steps ? from - Math.round((delta * i) / steps) : to
    setDisplayed(value)
    if (i < steps) window.setTimeout(tick, stepMs)
  }
  window.setTimeout(tick, stepMs)
}

const WALKER_HEAVY_TEACH_STEPS = [
  {
    text: 'that wind-up means a HAYMAKER is coming. it hits hard.',
    target: 'telegraph' as const,
  },
  {
    text: 'HOLD braces the hit. SLIP sidesteps it. read the telegraph, then pick.',
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
  if (status.playerBleed > 0) tags.push({ label: 'bleed', turns: status.playerBleed })
  if (status.playerShake > 0) tags.push({ label: 'shake', turns: status.playerShake })
  if (status.playerStun > 0) tags.push({ label: 'stun', turns: status.playerStun })
  if (status.playerSlow > 0) tags.push({ label: 'slow', turns: status.playerSlow })
  if (status.playerMiss > 0) tags.push({ label: 'miss', turns: status.playerMiss })
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
  onBattleEnd: (
    result: 'win' | 'lose' | 'draw',
    turns: number,
    playerHpRatio?: number,
    telemetry?: BattleEndTelemetry,
  ) => void
  /** Commits conversion flags the moment the player wins, before exit narration ends. */
  onWinPayoff?: (npcId: string) => void
  /** True once enter wipe has lifted and the battle is visible. */
  battleRevealed?: boolean
  /** True when this is a "Run it back!" rematch, doubled damage, dramatic pauses. */
  runItBack?: boolean
  combatXpPolicy?: 'normal' | 'none' | 'fixed-level'
  battleEndHealing?: 'default' | 'full-on-win'
}

export type BattleEndTelemetry = {
  maxHp: number
  hpRemaining: number
  damageTaken: number
  countersLanded: number
  movesUsed: PlayerMove[]
}

/**
 * Split stage background.
 * Top half = enemy's hometown background.
 * Bottom half = player's hometown background.
 */
function StageBackground({ enemySrc, playerSrc }: { enemySrc: string; playerSrc: string }) {
  useEffect(() => {
    console.log('[BattleScreen] stage bg, enemy:', enemySrc, 'player:', playerSrc)
  }, [enemySrc, playerSrc])

  return (
    <div className="battle-screen__stage-bg" aria-hidden>
      <div className="battle-screen__stage-bg-fallback" />
      {/* Enemy hometown, top half */}
      <img
        className="battle-screen__stage-bg-img battle-screen__stage-bg-img--top"
        src={enemySrc}
        alt=""
        draggable={false}
        onError={() => console.error('[BattleScreen] Failed to load enemy bg:', enemySrc)}
      />
      {/* Player hometown, bottom half */}
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

function battlePlayerTargetVisibleH(stageHeight: number): number {
  const scaledTargetH = stageHeight > 0 ? Math.floor(stageHeight * 0.33) : BATTLE_TARGET_VISIBLE_H
  return Math.floor(scaledTargetH * BATTLE_PLAYER_VISIBLE_MULT)
}

function drawMidnightVariantBattleSprite(
  canvas: HTMLCanvasElement,
  sheet: SpriteSheet,
  tuning: ReturnType<typeof getMidnightVariantRenderTuning>,
  direction: 'up' | 'down',
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = BATTLE_PLAYER_SOURCE_W
  const dh = BATTLE_PLAYER_SOURCE_H
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)
  drawSheetFrame(ctx, sheet, direction, getIdleFrameIndex(), 0, tuning.feetOffset, dw, dh, 1, tuning)
}

function drawPlayerBattleSprite(
  canvas: HTMLCanvasElement,
  sheet: SpriteSheet,
  tuning: ReturnType<typeof getMidnightVariantRenderTuning>,
): void {
  drawMidnightVariantBattleSprite(canvas, sheet, tuning, 'up')
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

export function BattleScreen({
  npcId,
  onBattleEnd,
  onWinPayoff,
  battleRevealed = true,
  runItBack = false,
  combatXpPolicy = 'normal',
  battleEndHealing = 'default',
}: Props) {
  const battleScreenRef = useRef<HTMLDivElement>(null)
  const playfieldRef = useRef<HTMLDivElement>(null)
  const telegraphRowRef = useRef<HTMLElement>(null)
  const movesRef = useRef<HTMLDivElement>(null)
  const playerStatusRef = useRef<HTMLDivElement>(null)
  const enemyPlateAnchorRef = useRef<HTMLDivElement>(null)
  const enemyPlateRef = useRef<HTMLDivElement>(null)
  const playerPlateAnchorRef = useRef<HTMLDivElement>(null)
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
    { npcId, runItBack, combatXpPolicy, battleEndHealing },
    (init) =>
      createInitialBattleState(init.npcId, {
        runItBack: init.runItBack,
        combatXpPolicy: init.combatXpPolicy,
        battleEndHealing: init.battleEndHealing,
      }),
  )

  // Snapshot player skills at battle start for XP summary
  const battleStartSkillsRef = useRef<ReturnType<typeof getPlayerSkills> | null>(null)
  useEffect(() => {
    battleStartSkillsRef.current = { ...getPlayerSkills() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      const isGhost = isGhostCombatId(npcId)
      const isGym = isGymGauntletCombatId(npcId)
      trackProgressEvent('battle_start', {
        enemyId: npcId,
        opponentType: isGhost ? 'ghost' : isGym ? 'gym' : 'world',
        ghost: isGhost,
        gym: isGym,
      })
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
  /** Skill of the last player move, used to pick the attack animation variant. */
  const lastPlayerMoveSkillRef = useRef<'attack' | 'speed' | 'defense' | 'luck'>('attack')
  // Displayed HP lags real HP, only updates after the lunge animation finishes
  const [displayedEnemyHp, setDisplayedEnemyHp] = useState(state.enemyHp)
  const [displayedPlayerHp, setDisplayedPlayerHp] = useState(state.playerHp)
  // Displayed log lags state.log for moves that produced crit/status feedback
  // (e.g. a Fury Sweep crit applying bleed), the log line is held back until
  // those callouts have actually appeared, so the text doesn't spoil the
  // attack animation by reporting the result before it plays.
  // appendLog caps state.log at 3 entries (shifting the oldest off), so its
  // .length stops changing once full, track the array reference instead,
  // since appendLog always returns a new array when a line is added.
  const prevLogRef = useRef(state.log)
  const [displayedLog, setDisplayedLog] = useState<string[]>(state.log)
  // While a turn resolves, the telegraph line is replaced with the name of
  // whichever move goes first. Reverts to the enemy telegraph once the turn
  // fully settles (same moment the result log line updates).
  const [turnAnnounce, setTurnAnnounce] = useState<string | null>(null)
  const prevPendingResolveRef = useRef(state.pendingResolve)
  // Single battle-log line cycles through these, telegraph and the last
  // action result are never shown at the same time.
  const [logLineMode, setLogLineMode] = useState<'telegraph' | 'announce' | 'result'>('telegraph')
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
  // Split stage backgrounds, enemy uses their battleLocation, player uses chosen hometown
  const playerHometownId = useSyncExternalStore(
    subscribeHometownStore,
    getPlayerHometown,
    getPlayerHometown,
  )
  const playerHometownDef = getHometownDef(playerHometownId)
  const playerBattleBgSrc = getBattleBgForLocation(playerHometownDef.battleLocationId)

  const enemyBattleBgSrc = resolveBattleBackgroundSrc(state.npc)
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
  const logLines = displayedLog.slice(-2)
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

  const [drawPopup, setDrawPopup] = useState(false)
  const lastHpRef = useRef(state.playerStats.maxHp)
  const damageTakenRef = useRef(0)
  const countersLandedRef = useRef(0)
  const movesUsedRef = useRef<PlayerMove[]>([])
  const feedbackSeenRef = useRef(0)

  const finishBattle = useCallback(
    (result: 'win' | 'lose' | 'draw') => {
      if (endHandledRef.current) return
      endHandledRef.current = true
      // Draw heals same as a loss (full HP); run-it-back flag is set by GameScreen
      const healResult = result === 'draw' ? 'lose' : result
      const healed = applyBattleEndHealing(
        healResult,
        state.playerStats.maxHp,
        state.playerHp,
        state.battleEndHealing,
      )
      setOverworldPlayerHp(healed)
      onBattleEnd(
        result,
        state.turn,
        state.playerHp / Math.max(1, state.playerStats.maxHp),
        {
          maxHp: state.playerStats.maxHp,
          hpRemaining: state.playerHp,
          damageTaken: damageTakenRef.current,
          countersLanded: countersLandedRef.current,
          movesUsed: [...movesUsedRef.current],
        },
      )
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
    damageTakenRef.current = 0
    countersLandedRef.current = 0
    movesUsedRef.current = []
    feedbackSeenRef.current = 0
    lastHpRef.current = state.playerStats.maxHp
  }, [npcId, state.playerStats.maxHp])

  useEffect(() => {
    if (state.playerHp < lastHpRef.current) {
      damageTakenRef.current += lastHpRef.current - state.playerHp
    }
    lastHpRef.current = state.playerHp
  }, [state.playerHp])

  useEffect(() => {
    if (state.feedbackEvents.length <= feedbackSeenRef.current) return
    const newEvents = state.feedbackEvents.slice(feedbackSeenRef.current)
    countersLandedRef.current += newEvents.filter(
      (event) => event.kind === 'counter' && event.target === 'enemy',
    ).length
    feedbackSeenRef.current = state.feedbackEvents.length
  }, [state.feedbackEvents, state.feedbackSeq])

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
      movesUsedRef.current.push(move)
      dispatch({ type: 'PLAYER_MOVE', move, slot })
    },
    [inputBlocked, walkerHeavyBeat, state.phase],
  )

  const handleNarrationContinue = useCallback(() => {
    setNarrationVisible(false)
    setKnockoutPopup('win')
  }, [])

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
    if (state.phase !== 'ended' || state.result !== 'draw') return
    const timer = window.setTimeout(() => setDrawPopup(true), KNOCKOUT_POPUP_DELAY_MS)
    return () => window.clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.result])

  useEffect(() => {
    if (state.phase !== 'ended') return
    if (state.result === 'draw') return  // handled by draw effect above
    if (state.pendingLevelUpNotification) return
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
  }, [state.phase, state.result, state.pendingLevelUpNotification, payoffNpc.losingLine, payoffNpc.winningLine])

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
    // Capture pre-update HP now, the refs get overwritten to the new values
    // before these animations run (they're scheduled via setTimeout).
    const fromEnemyHp = prevEnemyHpRef.current
    const fromPlayerHp = prevPlayerHpRef.current
    // When both sides take damage simultaneously (reflect, bleed, etc.),
    // stagger the second floater by 500ms so they never overlap.
    const STAGGER_MS = enemyDelta > 0 && playerDelta > 0 ? 500 : 0

    if (enemyDelta > 0) {
      const skill = lastPlayerMoveSkillRef.current
      const LUNGE_MS = skill === 'speed' ? 480 : skill === 'defense' ? 600 : 760
      const HIT_FLASH_MS = 40
      const DAMAGE_DELAY_MS = 540
      const HIT_MS = 840
      const BLEED_DAMAGE_DELAY_MS = 2000
      const id = Date.now() + Math.random()
      // Bleed damage has its own feedback floater, only show the direct attack portion here.
      const bleedDelta = Math.min(state.feedbackBleedDamage, enemyDelta)
      const attackDelta = Math.max(0, enemyDelta - bleedDelta)
      const afterAttackHp = fromEnemyHp - attackDelta
      setPlayerAtkFx(skill)
      window.setTimeout(() => setPlayerAtkFx(null), LUNGE_MS)
      window.setTimeout(() => {
        setEnemyHitFx(true)
        window.setTimeout(() => setEnemyHitFx(false), HIT_MS)
      }, LUNGE_MS + HIT_FLASH_MS)
      window.setTimeout(() => {
        animateHpTicks(setDisplayedEnemyHp, fromEnemyHp, afterAttackHp)
        if (attackDelta > 0) {
          setFloaters((f) => [
            ...f,
            { id, text: `-${attackDelta}`, target: 'enemy', tone: 'attack' },
          ])
          window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
        }
      }, LUNGE_MS + DAMAGE_DELAY_MS)
      // Bleed's HP tick lands alongside its floater, after both attacks land
      // this turn, plus the bleed delay.
      if (bleedDelta > 0) {
        const enemyActedFirst = state.feedbackEnemyActedFirst
        const playerPhaseDelay = enemyActedFirst ? BATTLE_MOVE_GAP_MS : 0
        const playerImpact = LUNGE_MS + DAMAGE_DELAY_MS + playerPhaseDelay
        const enemyImpact = LUNGE_MS + DAMAGE_DELAY_MS
        const bleedHpDelay = Math.max(playerImpact, enemyImpact) + BLEED_DAMAGE_DELAY_MS
        window.setTimeout(() => {
          animateHpTicks(setDisplayedEnemyHp, afterAttackHp, state.enemyHp)
        }, bleedHpDelay)
      }
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
        animateHpTicks(setDisplayedPlayerHp, fromPlayerHp, state.playerHp)
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
    // Status effects wait for the hit-flash animation to fully finish before appearing.
    // Hit flash starts at +40ms (HIT_FLASH_MS) and runs for 840ms (HIT_MS), ending at
    // +880ms relative to lunge start, i.e. +340ms relative to baseDelay (lunge+540).
    // Add a small buffer so the status floater never overlaps the tail of the flash.
    const STATUS_SETTLE_MS = 380
    // Bleed damage always trails the attack's own damage floater by a fixed 500ms,
    // independent of any crit/status stagger ahead of it.
    const BLEED_DAMAGE_DELAY_MS = 2000
    if (events.some((e) => e.kind === 'crit')) {
      window.setTimeout(() => {
        setEnemyCritFx(true)
        window.setTimeout(() => setEnemyCritFx(false), 480)
      }, playerImpact + CRIT_EXTRA_MS)
    }

    // Use separate stagger indices per target so enemy-side and player-side
    // floaters don't delay each other's timing.
    let enemyEvtIdx = 0
    let playerEvtIdx = 0
    events.forEach((event) => {
      const isEnemyTarget = event.target === 'enemy'
      const evtIdx = isEnemyTarget ? enemyEvtIdx++ : playerEvtIdx++
      const id = Date.now() + Math.random() + evtIdx
      const durationMs = event.kind === 'crit' ? 1200 : 900
      const critOffset = event.kind === 'crit' ? CRIT_EXTRA_MS : 0
      const statusOffset = event.kind === 'status' ? STATUS_SETTLE_MS : 0
      // Events targeting the enemy come from the player's attack, use playerImpact.
      // Events targeting the player come from the enemy's attack, use enemyImpact.
      const baseDelay = isEnemyTarget ? playerImpact : enemyImpact
      const isBleedDamage = event.kind === 'damage' && event.tone === 'bleed'
      // Bleed renders last, after BOTH attacks have landed this turn, even if the
      // bleed status was applied on this same turn's hit.
      const delay = isBleedDamage
        ? Math.max(playerImpact, enemyImpact) + BLEED_DAMAGE_DELAY_MS
        : baseDelay + evtIdx * 500 + critOffset + statusOffset
      window.setTimeout(() => {
        setFloaters((f) => [
          ...f,
          { id, text: event.text, target: event.target, tone: event.tone, kind: event.kind },
        ])
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), durationMs)
      }, delay)
    })
    clampBattleScrollDrift()
  }, [state.feedbackSeq, state.feedbackEvents, clampBattleScrollDrift])

  // Mirror the floater timing for the battle log line. Plain log lines (no
  // crit/status feedback) sync immediately; lines describing a crit and/or a
  // status application (e.g. "fury sweep. 24! crit bleed.") wait until the
  // last of those callouts would have appeared, using the same delay formula
  // as the floaters above.
  useEffect(() => {
    if (state.log === prevLogRef.current) return
    prevLogRef.current = state.log

    const events = state.feedbackEvents
    if (events.length === 0) {
      setDisplayedLog(state.log)
      setTurnAnnounce(null)
      setLogLineMode('result')
      return
    }

    const skill = lastPlayerMoveSkillRef.current
    const lunge = skill === 'speed' ? 480 : skill === 'defense' ? 600 : 760
    const enemyActedFirst = state.feedbackEnemyActedFirst
    const playerPhaseDelay = enemyActedFirst ? BATTLE_MOVE_GAP_MS : 0
    const playerImpact = lunge + 540 + playerPhaseDelay
    const enemyImpact = lunge + 540
    const CRIT_EXTRA_MS = 500
    const STATUS_SETTLE_MS = 380
    const BLEED_DAMAGE_DELAY_MS = 2000

    let enemyEvtIdx = 0
    let playerEvtIdx = 0
    let maxDelay = 0
    events.forEach((event) => {
      const isEnemyTarget = event.target === 'enemy'
      const evtIdx = isEnemyTarget ? enemyEvtIdx++ : playerEvtIdx++
      const critOffset = event.kind === 'crit' ? CRIT_EXTRA_MS : 0
      const statusOffset = event.kind === 'status' ? STATUS_SETTLE_MS : 0
      const baseDelay = isEnemyTarget ? playerImpact : enemyImpact
      const isBleedDamage = event.kind === 'damage' && event.tone === 'bleed'
      const total = isBleedDamage
        ? Math.max(playerImpact, enemyImpact) + BLEED_DAMAGE_DELAY_MS
        : baseDelay + evtIdx * 500 + critOffset + statusOffset
      if (total > maxDelay) maxDelay = total
    })

    const nextLog = state.log
    const timer = window.setTimeout(() => {
      setDisplayedLog(nextLog)
      setTurnAnnounce(null)
      setLogLineMode('result')
    }, maxDelay)
    return () => window.clearTimeout(timer)
  }, [state.log, state.feedbackEvents, state.feedbackEnemyActedFirst])

  // When a move is selected, the telegraph line is replaced by the name of
  // whichever side's move resolves first this turn.
  useEffect(() => {
    const prev = prevPendingResolveRef.current
    prevPendingResolveRef.current = state.pendingResolve
    if (state.pendingResolve && state.pendingResolve !== prev) {
      const { r, enemyFirst } = state.pendingResolve
      const moveName = enemyFirst
        ? r.eMove !== 'STUNNED'
          ? getEnemyMoveDef(r.eMove as EnemyMoveId).displayName
          : null
        : getMoveDef(r.pMove).displayName
      setTurnAnnounce(moveName)
      if (moveName) setLogLineMode('announce')
    }
  }, [state.pendingResolve])

  // Once the player is free to act again, the line reverts to showing the
  // upcoming enemy telegraph.
  useEffect(() => {
    if (state.phase === 'player') {
      setLogLineMode('telegraph')
    }
  }, [state.phase])

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
    // Hold resolution while the level-up notification is open, but only after the
    // full turn has resolved (idle) AND all floaters have finished, so the player
    // sees the battle animations before the overlay appears.
    if (state.pendingLevelUpNotification && state.resolveStep === 'idle' && floaters.length === 0) return

    const moveGapMs = state.runItBackMode ? RIB_MOVE_GAP_MS : BATTLE_MOVE_GAP_MS
    const roundEndGapMs = state.runItBackMode ? RIB_ROUND_END_GAP_MS : BATTLE_ROUND_END_GAP_MS

    if (state.resolveStep === 'pause_after_first') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_SECOND' })
      }, moveGapMs)
      return () => window.clearTimeout(timer)
    }

    if (state.resolveStep === 'pause_after_second') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_FINISH' })
      }, roundEndGapMs)
      return () => window.clearTimeout(timer)
    }
  }, [state.phase, state.resolveStep, state.pendingLevelUpNotification, state.runItBackMode, floaters.length])

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
      const playerTarget = battlePlayerTargetVisibleH(stageHeight)
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

    const variantId = state.npc.midnightVariantId
    const label = state.npc.displayName.toLowerCase()

    if (variantId) {
      const walkSrc = getMidnightWalkSrc(variantId)
      const tuning = getMidnightVariantRenderTuning(variantId)

      void loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
        if (cancelled || !sheet?.loaded) return

        drawMidnightVariantBattleSprite(canvas, sheet, tuning, 'down')
        const bounds = measureCanvasVisibleBounds(
          canvas,
          `enemy:${walkSrc}`,
          label,
        )
        const ghostTarget = battlePlayerTargetVisibleH(stageHeight)
        const enemyFeetY = stageHeight > 0 ? Math.floor(stageHeight * 0.37) : BATTLE_ENEMY_FEET.y
        const placement = layoutSpriteAtFeet(
          bounds,
          BATTLE_PLAYER_SOURCE_W,
          BATTLE_PLAYER_SOURCE_H,
          BATTLE_ENEMY_FEET.x,
          enemyFeetY,
          ghostTarget,
        )
        setEnemyPlacement(placement)
        setEnemyLayoutReady(true)
      })

      return () => {
        cancelled = true
      }
    }

    const spriteSrc = state.npc.spriteSrc ?? MARK_SPRITE_SRC
    const spriteColumns = 4
    const frameCol = 2

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
  }, [state.npc.midnightVariantId, state.npc.spriteSrc, state.npc.displayName, state.npc.battleSizeMult, stageHeight])

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

          {/* Stage fills the screen, fighters, plates, log all live inside */}
          <section className="battle-screen__stage" ref={stageRef} aria-hidden>
            <StageBackground enemySrc={enemyBattleBgSrc} playerSrc={playerBattleBgSrc} />
            <div className="battle-screen__arena">

              {/* ── Enemy at top of arena ── */}
              {/* Enemy plate, fixed anchor, never animates */}
              <div
                ref={enemyPlateAnchorRef}
                className="battle-screen__plate-anchor battle-screen__plate-anchor--enemy"
                style={{
                  top: enemyPlacement.visibleDrawY + 5,
                  transform: `translateX(${BATTLE_ENEMY_PLATE_OFFSET_X + BATTLE_FIGHTER_NUDGE_X}px)`,
                }}
              >
                <div ref={enemyPlateRef} className="battle-screen__sprite-plate">
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

              {/* Enemy sprite, animates independently */}
              <div
                className={`battle-screen__fighter battle-screen__fighter--enemy${enemyHitFx ? ' battle-screen__fighter--hit' : ''}${enemyAtkFx ? ' battle-screen__fighter--enemy-attack' : ''}${enemyCritFx ? ' battle-screen__fighter--crit' : ''}`}
                style={{
                  top: enemyPlacement.drawY + 5,
                  transform: `translateX(${BATTLE_FIGHTER_NUDGE_X}px)`,
                }}
              >
                <div ref={enemyWrapRef} className="battle-screen__enemy-sprite-wrap">
                  <canvas
                    className="battle-screen__enemy-sprite-canvas"
                    width={state.npc.midnightVariantId ? BATTLE_PLAYER_SOURCE_W : BATTLE_ENEMY_SOURCE_W}
                    height={state.npc.midnightVariantId ? BATTLE_PLAYER_SOURCE_H : BATTLE_ENEMY_SOURCE_H}
                    style={{
                      width: enemyPlacement.displayWidth,
                      height: enemyPlacement.displayHeight,
                    }}
                  />
                </div>
              </div>

              {/* ── Telegraph / announce / last-action, only one shown at a time ── */}
              {!showWinNarration && (
                <section className="battle-screen__log" ref={telegraphRowRef} aria-live="polite">
                  {logLineMode === 'announce' && turnAnnounce ? (
                    <div
                      className={`battle-screen__log-line battle-screen__log-line--telegraph${heavyTelegraph ? ' battle-screen__log-line--heavy' : ''}`}
                    >
                      <span
                        className="battle-screen__telegraph-move"
                        style={{ color: telegraphMoveColor }}
                      >
                        {turnAnnounce}
                      </span>
                    </div>
                  ) : logLineMode === 'result' ? (
                    logLines.length > 0 ? (
                      logLines.map((line, i) => (
                        <div className="battle-screen__log-line" key={i}>
                          {line}
                        </div>
                      ))
                    ) : (
                      <div className="battle-screen__log-line">&nbsp;</div>
                    )
                  ) : (
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
                  )}
                </section>
              )}



              {/* Player plate, fixed anchor, never animates */}
              <div
                ref={playerPlateAnchorRef}
                className="battle-screen__plate-anchor battle-screen__plate-anchor--player battle-screen__plate-anchor--anchored"
                style={{
                  top: playerPlacement.visibleDrawY + BATTLE_PLAYER_PLATE_OFFSET_Y,
                  left: playerPlacement.feetX + BATTLE_PLAYER_PLATE_OFFSET_X,
                }}
              >
                <div ref={playerPlateRef} className="battle-screen__sprite-plate">
                  <span className="battle-screen__plate-name">
                    {playerHandle.toUpperCase()}
                    <span className="battle-screen__plate-level">
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

              {/* Player sprite, animates independently */}
              <div
                className={`battle-screen__fighter battle-screen__fighter--player battle-screen__fighter--anchored${playerHitFx ? ' battle-screen__fighter--hit' : ''}${playerAtkFx ? ` battle-screen__fighter--atk-${playerAtkFx}` : ''}${playerDodgeFx ? ' battle-screen__fighter--dodge' : ''}`}
                style={{ top: playerPlacement.drawY, left: playerPlacement.x }}
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
                enemyPlateAnchorRef={enemyPlateAnchorRef}
                enemyPlateRef={enemyPlateRef}
                playerPlateAnchorRef={playerPlateAnchorRef}
                playerPlateRef={playerPlateRef}
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
                  {battleMoveButtons.map(({ move, label, description, className, scaleParts }, slot) => {
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
                        {!stolen && <MoveScaleTag parts={scaleParts} />}
                      </button>
                    )
                  })}
                </div>
            </section>
            {/* NPC losing line, overlays moveset after player wins */}
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
            {/* NPC winning line, overlays moveset after player loses */}
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
      {knockoutPopup && (() => {
        const startSkills = battleStartSkillsRef.current
        const endSkills = playerSkills
        const xpGains = startSkills
          ? (Object.keys(endSkills) as Array<keyof typeof endSkills>).flatMap((k) => {
              const sv = startSkills[k]
              const ev = endSkills[k]
              if (!sv || !ev) return []
              const xpGained = (ev.xp ?? 0) - (sv.xp ?? 0)
              const leveled = (ev.level ?? 1) > (sv.level ?? 1)
              if (xpGained <= 0 && !leveled) return []
              return [{ skill: k as string, xpGained, leveled, startLv: sv.level ?? 1, endLv: ev.level ?? 1 }]
            })
          : []
        return (
          <div className="battle-knockout-overlay" onClick={handleKnockoutContinue}>
            <div className="battle-knockout-card">
              <p className="battle-knockout-name">
                {knockoutPopup === 'win' ? state.npc.displayName.toUpperCase() : playerHandle.toUpperCase()}
              </p>
              <p className="battle-knockout-label">has fallen.</p>
              {xpGains.length > 0 && (
                <div className="battle-knockout-xp-summary">
                  {xpGains.map(({ skill, xpGained, leveled, startLv, endLv }) => (
                    <div key={skill} className="battle-knockout-xp-row">
                      <span className="battle-knockout-xp-skill">{SKILL_DISPLAY[skill] ?? skill}</span>
                      {xpGained > 0 && (
                        <span className="battle-knockout-xp-gained">+{xpGained} xp</span>
                      )}
                      {leveled && (
                        <span className="battle-knockout-xp-level">lv {startLv}→{endLv}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <span className="battle-knockout-continue">tap to continue ▸</span>
            </div>
          </div>
        )
      })()}
      {drawPopup && (
        <div className="battle-draw-overlay">
          <div className="battle-draw-card">
            <p className="battle-draw-title">DRAW.</p>
            <p className="battle-draw-subtitle">both fighters fell.</p>
            <div className="battle-draw-actions">
              <button
                type="button"
                className="battle-draw-btn battle-draw-btn--rib"
                onClick={() => finishBattle('draw')}
              >
                run it back!
                <span className="battle-draw-btn-hint">2× damage · dramatic pacing</span>
              </button>
              <button
                type="button"
                className="battle-draw-btn battle-draw-btn--leave"
                onClick={() => finishBattle('lose')}
              >
                leave it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
