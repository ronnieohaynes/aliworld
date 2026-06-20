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
  BATTLE_PLATE_VISIBLE_TOP_GAP,
  BATTLE_PLAYER_FIGHTER_NUDGE_Y,
  BATTLE_PLAYER_PLATE_OFFSET_X,
  SHOW_BATTLE_PLAYER_PLATE,
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
  BATTLE_LOG_MAX_ENTRIES,
  BATTLE_LOG_RESULT_SETTLE_MS,
  BATTLE_MOVE_GAP_MS,
  BATTLE_ROUND_END_GAP_MS,
  RIB_MOVE_GAP_MS,
  RIB_ROUND_END_GAP_MS,
  TURN_POST_DAMAGE_MOVE_DELAY_MS,
  battleReducer,
  combatStatusForDisplay,
  createInitialBattleState,
  getTelegraphDisplay,
  shouldPreviewEnemyTelegraph,
  type LevelUpNotification,
  type PendingResolve,
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
import { type SkillId, type SkillsState } from '../store/skillStore'
import { deriveBuildLoopType, deriveBuildName } from '../data/buildName'
import { recordEncounter } from '../store/enemyMemoryStore'
import {
  isBattleTutorialSeen,
  setBattleTutorialSeen,
  setWalkerHeavyTutorialBeatSeen,
  WALKER_NPC_ID,
} from '../store/quest1Store'
import { getMoveUiMeta, getMoveDef } from '../data/moves'
import { trackProgressEvent } from '../lib/analytics'
import type { BattleFeedbackEvent, BattleFeedbackTone } from '../data/battleFeedback'
import {
  getPlayerCounterRelation,
  leanSkillAccentColor,
} from '../data/skillCounter'
import { isWalkerHeavyTutorialActive } from '../data/walkerHeavyTutorial'
import type { PlayerMoveId } from '../data/moveIds'
import { MOVES } from '../data/moveDefinitions'
import { STATUS_EFFECT_HINTS } from '../data/statusEffectCopy'
import type { CombatStatusState } from '../data/combatTypes'
import { renderHighlightedLogLine } from '../game/battleLogHighlight'
import {
  getMoveLogDisplayName,
  moveHighlightColor,
  type BattleMoveId,
} from '../game/moveHighlightColors'
import { BattlePlacementGrid } from './BattlePlacementGrid'
import {
  BATTLE_TUTORIAL_STEPS,
  BattleTutorialOverlay,
} from './BattleTutorialOverlay'
import './BattleScreen.css'
import './PlayerLevelBadge.css'

function isHeavyPlayerMove(moveId: PlayerMoveId): boolean {
  const def = MOVES[moveId]
  if (!def) return false
  const b = def.behavior
  if (b.kind === 'cannon' || b.kind === 'blackout' || b.kind === 'sealed-fate') return true
  if ('profile' in b && b.profile && 'damageMult' in b.profile) return b.profile.damageMult >= 1.6
  return false
}

const MARK_SPRITE_SRC = publicAsset('Assets/Characters/npcs/mark-idle.png')

/** How long a damage-induced HP bar/number countdown takes, end to end. */
const HP_TICK_DURATION_MS = 400
/** Cap on how many discrete ticks a single hit's countdown is split into. */
const HP_TICK_MAX_STEPS = 20

/**
 * Steps a displayed HP value down from `from` to `to` in small ticks rather
 * than jumping straight to the final value. Never raises displayed HP during
 * a damage countdown — uses `getCurrent` so stale `from` values cannot bounce
 * the bar upward mid-animation.
 */
function animateHpTicks(
  schedule: (fn: () => void, delayMs: number) => void,
  setDisplayed: (value: number) => void,
  from: number,
  to: number,
  getCurrent?: () => number,
  durationMs: number = HP_TICK_DURATION_MS,
): void {
  const current = getCurrent?.() ?? from
  const start = Math.min(current, from)
  const delta = start - to
  if (delta <= 0) {
    setDisplayed(Math.max(current, to))
    return
  }
  const steps = Math.min(delta, HP_TICK_MAX_STEPS)
  const stepMs = Math.max(16, Math.floor(durationMs / steps))
  let i = 0
  const tick = () => {
    i += 1
    const raw = i < steps ? start - Math.round((delta * i) / steps) : to
    const value = Math.min(raw, getCurrent?.() ?? raw)
    setDisplayed(value)
    if (i < steps) schedule(tick, stepMs)
  }
  schedule(tick, stepMs)
}

const WALKER_HEAVY_TEACH_STEPS = [
  {
    text: 'that wind-up means a FURY SWEEP is coming. it hits hard.',
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

/** Block/dodge outcomes live in the action log only — no floating callouts. */
const FLOATER_SKIP_KINDS = new Set<BattleFeedbackEvent['kind']>([
  'blocked',
  'dodged',
  'perfect-guard',
])

function feedbackTargetsPlayer(events: BattleFeedbackEvent[]): boolean {
  return events.some((e) => e.target === 'player' && e.kind !== 'xp-bonus')
}

function feedbackTargetsEnemy(events: BattleFeedbackEvent[]): boolean {
  return events.some((e) => e.target === 'enemy')
}

const PLAYER_ATTACK_ANIM_KINDS = new Set([
  'damage',
  'fury-sweep',
  'dark-break',
  'cannon',
  'blackout',
  'loop',
  'gravity-shift',
  'refract',
  'hyperdrive',
  'devils-cut',
  'phenomena',
  'sealed-fate',
  'snag',
])

function isPlayerAttackAnimMove(pMove: PlayerMove | undefined): boolean {
  if (!pMove) return false
  const def = MOVES[pMove]
  return def ? PLAYER_ATTACK_ANIM_KINDS.has(def.behavior.kind) : false
}

function isEnemyAttackAnimMove(eMove: PendingResolve['r']['eMove']): boolean {
  if (eMove === 'STUNNED') return false
  const def = MOVES[eMove as PlayerMoveId]
  return def ? PLAYER_ATTACK_ANIM_KINDS.has(def.behavior.kind) : false
}

function resolveIndicatesPlayerAttackMove(pending: PendingResolve | null): boolean {
  if (!pending?.r.playerActed) return false
  return isPlayerAttackAnimMove(pending.r.pMove)
}

function resolveIndicatesEnemyAttack(pending: PendingResolve | null): boolean {
  const r = pending?.r
  if (!r || r.enemyStunned) return false
  return r.enemyAttacks || r.rawIncoming > 0 || isEnemyAttackAnimMove(r.eMove)
}

/** WHISPER uses luck skill but should lunge like other hit moves. */
function playerAtkFxForMove(
  pMove: PlayerMove | undefined,
  skill: string,
): 'attack' | 'speed' | 'defense' | 'luck' {
  if (pMove === 'WHISPER') return 'attack'
  if (skill === 'speed' || skill === 'defense' || skill === 'luck') return skill
  return 'attack'
}

/** True when the player side should play an attack/defense lunge this turn (even at 0 damage). */
function playerPhaseAnimates(opts: {
  attackDelta: number
  wasEnemyDodge: boolean
  feedbackEvents: BattleFeedbackEvent[]
  pendingResolve: PendingResolve | null
}): boolean {
  if (opts.wasEnemyDodge) {
    return (
      resolveIndicatesPlayerAttackMove(opts.pendingResolve) ||
      feedbackTargetsEnemy(opts.feedbackEvents)
    )
  }
  return (
    opts.attackDelta > 0 ||
    feedbackTargetsEnemy(opts.feedbackEvents) ||
    resolveIndicatesPlayerAttackMove(opts.pendingResolve)
  )
}

/** True when the enemy side should play an attack lunge this turn (even at 0 damage). */
function enemyPhaseAnimates(opts: {
  playerDelta: number
  wasEnemyDodge: boolean
  feedbackEvents: BattleFeedbackEvent[]
  pendingResolve: PendingResolve | null
}): boolean {
  if (opts.wasEnemyDodge) return false
  return (
    opts.playerDelta > 0 ||
    feedbackTargetsPlayer(opts.feedbackEvents) ||
    resolveIndicatesEnemyAttack(opts.pendingResolve)
  )
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

const BATTLE_LUNGE_ATTACK_MS = 760
const BATTLE_LUNGE_SPEED_MS = 480
const BATTLE_LUNGE_DEFENSE_MS = 600
const BATTLE_HIT_FLASH_MS = 40
const BATTLE_HIT_MS = 840
const BATTLE_DODGE_MS = 420
const BLEED_DAMAGE_DELAY_MS = 2000
const FEEDBACK_STATUS_SETTLE_MS = 120
const FEEDBACK_CRIT_EXTRA_MS = 500

function battleRoundEndGapMs(runItBack: boolean): number {
  return runItBack ? RIB_ROUND_END_GAP_MS : BATTLE_ROUND_END_GAP_MS
}

/** When to reveal a single-phase log batch (turn ended before the second resolve pause). */
function computeInstantPhaseLogRevealDelay(opts: {
  enemyActedFirst: boolean
  phase2Only: boolean
  playerLungeMs: number
  enemyLungeMs: number
  runItBack: boolean
  attackDelta: number
  playerDelta: number
  bleedDelta: number
  wasEnemyDodge: boolean
  playerPhaseAnimates: boolean
  enemyPhaseAnimates: boolean
}): number {
  const schedule = computeDamageRevealSchedule({
    playerLungeMs: opts.playerLungeMs,
    enemyLungeMs: opts.enemyLungeMs,
    enemyActedFirst: opts.enemyActedFirst,
    attackDelta: opts.attackDelta,
    playerDelta: opts.playerDelta,
    bleedDelta: opts.phase2Only ? opts.bleedDelta : 0,
    wasEnemyDodge: opts.wasEnemyDodge,
    playerPhaseAnimates: opts.playerPhaseAnimates,
    enemyPhaseAnimates: opts.enemyPhaseAnimates,
  })
  const impacts = computeImpactTimings({
    playerLungeMs: opts.playerLungeMs,
    enemyLungeMs: opts.enemyLungeMs,
    enemyActedFirst: opts.enemyActedFirst,
    runItBack: opts.runItBack,
    hasEnemyTargetEvents: opts.playerPhaseAnimates,
    hasPlayerTargetEvents: opts.enemyPhaseAnimates,
    playerDealsDirectDamage: opts.playerPhaseAnimates,
    enemyDealsDamage: opts.enemyPhaseAnimates,
  })

  if (opts.phase2Only) {
    if (opts.enemyActedFirst) {
      return Math.max(
        schedule.enemyDirectAt ?? 0,
        schedule.bleedAt ?? 0,
        impacts.playerImpact,
      )
    }
    return Math.max(schedule.playerDirectAt ?? 0, impacts.enemyImpact)
  }

  if (opts.enemyActedFirst) {
    return Math.max(schedule.playerDirectAt ?? 0, impacts.enemyImpact)
  }
  return Math.max(schedule.enemyDirectAt ?? 0, impacts.playerImpact)
}

function battleMoveGapMs(runItBack: boolean): number {
  return runItBack ? RIB_MOVE_GAP_MS : BATTLE_MOVE_GAP_MS
}

/** When the dodge flash animation starts (aligned with HP / pause_after_first FX). */
function computeDodgeAnimationStart(opts: {
  target: 'enemy' | 'player'
  playerLungeMs: number
  enemyLungeMs: number
  enemyActedFirst: boolean
  runItBack: boolean
}): number {
  if (opts.target === 'enemy') {
    const playerPhaseStart = opts.enemyActedFirst ? battleMoveGapMs(opts.runItBack) : 0
    return playerPhaseStart + opts.playerLungeMs
  }
  if (opts.enemyActedFirst) {
    return opts.enemyLungeMs + BATTLE_HIT_FLASH_MS
  }
  return battleMoveGapMs(opts.runItBack) + opts.enemyLungeMs + BATTLE_HIT_FLASH_MS
}

/** When dodge callout text should appear — after the dodge flash begins. */
function computeDodgeRevealDelay(opts: {
  target: 'enemy' | 'player'
  playerLungeMs: number
  enemyLungeMs: number
  enemyActedFirst: boolean
  runItBack: boolean
}): number {
  return computeDodgeAnimationStart(opts) + FEEDBACK_STATUS_SETTLE_MS
}

/** When the enemy lunge begins on player-first turns (after move gap + optional player phase). */
function computePlayerFirstEnemyAttackStart(opts: {
  playerLungeMs: number
  runItBack: boolean
  playerDealsDirectDamage: boolean
}): number {
  const playerPhaseLen = opts.playerDealsDirectDamage
    ? floaterDelayAfterLungeStart(opts.playerLungeMs)
    : 0
  return battleMoveGapMs(opts.runItBack) + playerPhaseLen
}

/** When the player lunge begins on enemy-first turns (after move gap + optional enemy phase). */
function computeEnemyFirstPlayerAttackStart(opts: {
  enemyLungeMs: number
  runItBack: boolean
  playerDealsDirectDamage: boolean
}): number {
  const enemyPhaseLen = opts.playerDealsDirectDamage
    ? floaterDelayAfterLungeStart(opts.enemyLungeMs)
    : 0
  return battleMoveGapMs(opts.runItBack) + enemyPhaseLen
}

/** Block flash moment — attack contact, aligned with dodge timing and resolve-step gaps. */
function computeBlockAnimationStart(opts: {
  target: 'enemy' | 'player'
  playerLungeMs: number
  enemyLungeMs: number
  enemyActedFirst: boolean
  runItBack: boolean
  playerDealsDirectDamage: boolean
}): number {
  if (opts.target === 'player') {
    if (opts.enemyActedFirst) {
      return opts.enemyLungeMs + BATTLE_HIT_FLASH_MS
    }
    return (
      computePlayerFirstEnemyAttackStart({
        playerLungeMs: opts.playerLungeMs,
        runItBack: opts.runItBack,
        playerDealsDirectDamage: opts.playerDealsDirectDamage,
      })
      + opts.enemyLungeMs
      + BATTLE_HIT_FLASH_MS
    )
  }
  if (opts.enemyActedFirst) {
    return (
      computeEnemyFirstPlayerAttackStart({
        enemyLungeMs: opts.enemyLungeMs,
        runItBack: opts.runItBack,
        playerDealsDirectDamage: opts.playerDealsDirectDamage,
      })
      + opts.playerLungeMs
      + BATTLE_HIT_FLASH_MS
    )
  }
  return opts.playerLungeMs + BATTLE_HIT_FLASH_MS
}

/** When block / perfect-guard callout text should appear — after the block moment. */
function computeBlockRevealDelay(opts: {
  target: 'enemy' | 'player'
  playerLungeMs: number
  enemyLungeMs: number
  enemyActedFirst: boolean
  runItBack: boolean
  playerDealsDirectDamage: boolean
}): number {
  return computeBlockAnimationStart(opts) + FEEDBACK_STATUS_SETTLE_MS
}

function computeFeedbackEventDelay(
  event: BattleFeedbackEvent,
  opts: {
    evtIdx: number
    playerImpact: number
    enemyImpact: number
    playerLungeMs: number
    enemyLungeMs: number
    enemyActedFirst: boolean
    runItBack: boolean
    bleedAt: number | null
    playerDealsDirectDamage: boolean
  },
): number {
  if (event.kind === 'damage' && event.tone === 'bleed') {
    return opts.bleedAt ?? 0
  }
  if (event.kind === 'dodged') {
    return computeDodgeRevealDelay({
      target: event.target,
      playerLungeMs: opts.playerLungeMs,
      enemyLungeMs: opts.enemyLungeMs,
      enemyActedFirst: opts.enemyActedFirst,
      runItBack: opts.runItBack,
    })
  }
  if (event.kind === 'blocked' || event.kind === 'perfect-guard') {
    return (
      computeBlockRevealDelay({
        target: event.target,
        playerLungeMs: opts.playerLungeMs,
        enemyLungeMs: opts.enemyLungeMs,
        enemyActedFirst: opts.enemyActedFirst,
        runItBack: opts.runItBack,
        playerDealsDirectDamage: opts.playerDealsDirectDamage,
      })
      + opts.evtIdx * 500
    )
  }
  const isEnemyTarget = event.target === 'enemy'
  const baseDelay = isEnemyTarget ? opts.playerImpact : opts.enemyImpact
  const critOffset = event.kind === 'crit' ? FEEDBACK_CRIT_EXTRA_MS : 0
  const statusOffset = event.kind === 'status' ? FEEDBACK_STATUS_SETTLE_MS : 0
  return baseDelay + opts.evtIdx * 500 + critOffset + statusOffset
}

function playerLungeMsForSkill(skill: string): number {
  if (skill === 'speed') return BATTLE_LUNGE_SPEED_MS
  if (skill === 'defense') return BATTLE_LUNGE_DEFENSE_MS
  return BATTLE_LUNGE_ATTACK_MS
}

/** Floaters and HP ticks appear only after lunge + hit reaction finish. */
function floaterDelayAfterLungeStart(lungeMs: number): number {
  return lungeMs + BATTLE_HIT_FLASH_MS + BATTLE_HIT_MS
}

type DamageRevealSchedule = {
  playerPhaseStart: number
  enemyPhaseStart: number
  enemyDirectAt: number | null
  playerDirectAt: number | null
  bleedAt: number | null
  lastDamageAt: number
}

function computeDamageRevealSchedule(opts: {
  playerLungeMs: number
  enemyLungeMs: number
  enemyActedFirst: boolean
  attackDelta: number
  playerDelta: number
  bleedDelta: number
  wasEnemyDodge: boolean
  playerPhaseAnimates?: boolean
  enemyPhaseAnimates?: boolean
}): DamageRevealSchedule {
  const playerAnimates =
    opts.playerPhaseAnimates ?? (opts.attackDelta > 0 && !opts.wasEnemyDodge)
  const enemyAnimates =
    opts.enemyPhaseAnimates ?? (opts.playerDelta > 0 && !opts.wasEnemyDodge)
  const playerRevealOffset = floaterDelayAfterLungeStart(opts.playerLungeMs)
  const enemyRevealOffset = floaterDelayAfterLungeStart(opts.enemyLungeMs)

  let playerPhaseStart = 0
  let enemyPhaseStart = 0
  if (playerAnimates && enemyAnimates) {
    if (opts.enemyActedFirst) {
      enemyPhaseStart = 0
      playerPhaseStart = enemyRevealOffset
    } else {
      playerPhaseStart = 0
      enemyPhaseStart = playerRevealOffset
    }
  } else if (playerAnimates) {
    playerPhaseStart = 0
  } else if (enemyAnimates) {
    enemyPhaseStart = opts.enemyActedFirst ? 0 : 0
  }

  const playerPhaseLen = playerPhaseStart + (playerAnimates ? playerRevealOffset : 0)
  const enemyPhaseLen = enemyPhaseStart + (enemyAnimates ? enemyRevealOffset : 0)

  const enemyDirectAt =
    playerAnimates && !opts.wasEnemyDodge ? playerPhaseStart + playerRevealOffset : null

  let playerDirectAt: number | null = null
  if (opts.wasEnemyDodge && opts.playerDelta > 0) {
    const counterStart = opts.playerLungeMs + BATTLE_DODGE_MS
    playerDirectAt = counterStart + floaterDelayAfterLungeStart(opts.enemyLungeMs)
  } else if (enemyAnimates) {
    playerDirectAt = enemyPhaseStart + enemyRevealOffset
  }

  let bleedAt: number | null = null
  if (opts.bleedDelta > 0) {
    const lastPhaseEnd = Math.max(
      playerAnimates ? playerPhaseLen : 0,
      enemyAnimates ? enemyPhaseLen : 0,
      opts.wasEnemyDodge && opts.playerDelta > 0
        ? opts.playerLungeMs + BATTLE_DODGE_MS + floaterDelayAfterLungeStart(opts.enemyLungeMs)
        : 0,
    )
    const bleedHitStart = lastPhaseEnd + BLEED_DAMAGE_DELAY_MS
    bleedAt = bleedHitStart + BATTLE_HIT_FLASH_MS + BATTLE_HIT_MS
  }

  const lastDamageAt = Math.max(
    enemyDirectAt ?? 0,
    playerDirectAt ?? 0,
    bleedAt ?? 0,
  )

  return {
    playerPhaseStart,
    enemyPhaseStart,
    enemyDirectAt,
    playerDirectAt,
    bleedAt,
    lastDamageAt,
  }
}

/** True when damage floaters, HP tick animations, and log holds have all finished. */
function isTurnDamagePresentationComplete(opts: {
  floaterCount: number
  pendingFloaterSchedules: number
  hpAnimTimeoutCount: number
  logRevealPending: boolean
}): boolean {
  return (
    opts.floaterCount === 0 &&
    opts.pendingFloaterSchedules === 0 &&
    opts.hpAnimTimeoutCount === 0 &&
    !opts.logRevealPending
  )
}

function computePhaseGaps(
  enemyActedFirst: boolean,
  runItBack: boolean,
  hasEnemyTargetEvents: boolean,
  hasPlayerTargetEvents: boolean,
): { playerPhaseGap: number; enemyPhaseGap: number } {
  const moveGapMs = runItBack ? RIB_MOVE_GAP_MS : BATTLE_MOVE_GAP_MS
  let playerPhaseGap = 0
  let enemyPhaseGap = 0
  if (enemyActedFirst && hasEnemyTargetEvents) {
    playerPhaseGap = moveGapMs
  }
  if (!enemyActedFirst && hasPlayerTargetEvents && hasEnemyTargetEvents) {
    enemyPhaseGap = moveGapMs
  }
  return { playerPhaseGap, enemyPhaseGap }
}

function computeImpactTimings(opts: {
  playerLungeMs: number
  enemyLungeMs: number
  enemyActedFirst: boolean
  runItBack: boolean
  hasEnemyTargetEvents: boolean
  hasPlayerTargetEvents: boolean
  playerDealsDirectDamage: boolean
  enemyDealsDamage: boolean
}): {
  playerPhaseStart: number
  enemyPhaseStart: number
  playerImpact: number
  enemyImpact: number
  playerPhaseLen: number
  enemyPhaseLen: number
} {
  const { playerPhaseGap, enemyPhaseGap } = computePhaseGaps(
    opts.enemyActedFirst,
    opts.runItBack,
    opts.hasEnemyTargetEvents,
    opts.hasPlayerTargetEvents,
  )
  const playerFloaterAt = floaterDelayAfterLungeStart(opts.playerLungeMs)
  const enemyFloaterAt = floaterDelayAfterLungeStart(opts.enemyLungeMs)

  let playerPhaseStart = 0
  let enemyPhaseStart = 0
  if (opts.playerDealsDirectDamage && opts.enemyDealsDamage) {
    if (opts.enemyActedFirst) {
      enemyPhaseStart = 0
      playerPhaseStart = enemyFloaterAt
    } else {
      playerPhaseStart = 0
      enemyPhaseStart = playerFloaterAt
    }
  }

  const playerImpact = playerPhaseStart + playerPhaseGap + playerFloaterAt
  const enemyImpact = enemyPhaseStart + enemyPhaseGap + enemyFloaterAt
  return {
    playerPhaseStart,
    enemyPhaseStart,
    playerImpact,
    enemyImpact,
    playerPhaseLen: playerPhaseStart + playerFloaterAt,
    enemyPhaseLen: enemyPhaseStart + enemyFloaterAt,
  }
}

type BattleXpGain = {
  skill: string
  xpGained: number
  leveled: boolean
  startLv: number
  endLv: number
}

function snapshotBattleSkills(skills: SkillsState): SkillsState {
  return (Object.keys(skills) as SkillId[]).reduce<SkillsState>((acc, id) => {
    acc[id] = { ...skills[id] }
    return acc
  }, {} as SkillsState)
}

function computeBattleXpGains(
  startSkills: SkillsState | null,
  endSkills: SkillsState,
): BattleXpGain[] {
  if (!startSkills) return []
  return (Object.keys(endSkills) as SkillId[]).flatMap((k) => {
    const sv = startSkills[k]
    const ev = endSkills[k]
    if (!sv || !ev) return []
    const xpGained = (ev.xp ?? 0) - (sv.xp ?? 0)
    const leveled = (ev.level ?? 1) > (sv.level ?? 1)
    if (xpGained <= 0 && !leveled) return []
    return [{ skill: k, xpGained, leveled, startLv: sv.level ?? 1, endLv: ev.level ?? 1 }]
  })
}

function BattleXpSummary({ xpGains }: { xpGains: BattleXpGain[] }) {
  if (xpGains.length === 0) return null
  return (
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
  )
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

  // Deep snapshot at battle start so per-turn XP grants don't mutate the baseline.
  const battleStartSkillsRef = useRef<SkillsState | null>(null)
  useEffect(() => {
    battleStartSkillsRef.current = snapshotBattleSkills(getPlayerSkills())
  }, [npcId])

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
  const lastHpDeltasRef = useRef({ enemyDelta: 0, playerDelta: 0 })
  const prevFeedbackSeqRef = useRef(state.feedbackSeq)
  const winMatchupCalloutRef = useRef(false)
  /** Skill of the last player move, used to pick the attack animation variant. */
  const lastPlayerMoveSkillRef = useRef<'attack' | 'speed' | 'defense' | 'luck'>('attack')
  // Displayed HP lags real HP, only updates after the lunge animation finishes
  const [displayedEnemyHp, setDisplayedEnemyHp] = useState(state.enemyHp)
  const [displayedPlayerHp, setDisplayedPlayerHp] = useState(state.playerHp)
  const displayedEnemyHpRef = useRef(state.enemyHp)
  const displayedPlayerHpRef = useRef(state.playerHp)
  const enemyHpAnimTimeoutsRef = useRef<number[]>([])
  const playerHpAnimTimeoutsRef = useRef<number[]>([])
  displayedEnemyHpRef.current = displayedEnemyHp
  displayedPlayerHpRef.current = displayedPlayerHp
  const stateEnemyHpRef = useRef(state.enemyHp)
  stateEnemyHpRef.current = state.enemyHp
  const [hpAnimRevision, setHpAnimRevision] = useState(0)
  const bumpHpAnimRevision = useCallback(() => setHpAnimRevision((v) => v + 1), [])

  const scheduleEnemyAttackLunge = useCallback((delayMs: number, lungeMs: number) => {
    if (stateEnemyHpRef.current <= 0) return
    window.setTimeout(() => {
      if (stateEnemyHpRef.current <= 0) return
      setEnemyAtkFx(true)
      window.setTimeout(() => setEnemyAtkFx(false), lungeMs)
    }, delayMs)
  }, [])

  useEffect(() => {
    if (state.enemyHp <= 0) setEnemyAtkFx(false)
  }, [state.enemyHp])

  const clearHpAnimTimeouts = useCallback((side?: 'enemy' | 'player') => {
    const clearSide = (ids: number[]) => {
      if (ids.length === 0) return
      for (const id of ids) window.clearTimeout(id)
      ids.length = 0
      bumpHpAnimRevision()
    }
    if (!side || side === 'enemy') clearSide(enemyHpAnimTimeoutsRef.current)
    if (!side || side === 'player') clearSide(playerHpAnimTimeoutsRef.current)
  }, [bumpHpAnimRevision])

  const scheduleHpTimeout = useCallback((side: 'enemy' | 'player', fn: () => void, delayMs: number) => {
    const ids = side === 'enemy' ? enemyHpAnimTimeoutsRef : playerHpAnimTimeoutsRef
    bumpHpAnimRevision()
    const id = window.setTimeout(() => {
      const list = ids.current
      const idx = list.indexOf(id)
      if (idx >= 0) list.splice(idx, 1)
      bumpHpAnimRevision()
      fn()
    }, delayMs)
    ids.current.push(id)
  }, [bumpHpAnimRevision])

  useEffect(() => () => clearHpAnimTimeouts(), [clearHpAnimTimeouts])
  // Displayed log lags state.log for moves that produced crit/status feedback
  // (e.g. a Fury Sweep crit applying bleed), the log line is held back until
  // those callouts have actually appeared, so the text doesn't spoil the
  // attack animation by reporting the result before it plays.
  // appendLog caps state.log at BATTLE_LOG_MAX_ENTRIES (shifting the oldest off), so its
  // .length stops changing once full, track the array reference instead,
  // since appendLog always returns a new array when a line is added.
  const prevLogRef = useRef(state.log)
  const [displayedLog, setDisplayedLog] = useState<string[]>(state.log)
  // While a turn resolves, the telegraph line is replaced with the name of
  // whichever move goes first. Reverts to the enemy telegraph once the turn
  // fully settles (same moment the result log line updates).
  const [turnAnnounce, setTurnAnnounce] = useState<{ name: string; color: string } | null>(null)
  const prevPendingResolveRef = useRef(state.pendingResolve)
  const prevResolveStepRef = useRef(state.resolveStep)
  const firstPhaseLogLenRef = useRef(0)
  // Single battle-log line cycles through these, telegraph and the last
  // action result are never shown at the same time.
  const [logLineMode, setLogLineMode] = useState<'telegraph' | 'announce' | 'result'>('telegraph')
  const [enemyHitFx, setEnemyHitFx] = useState(false)
  const [enemyAtkFx, setEnemyAtkFx] = useState(false)
  const [playerHitFx, setPlayerHitFx] = useState(false)
  /** Null = no animation. Otherwise the skill type that determines animation style. */
  const [playerAtkFx, setPlayerAtkFx] = useState<'attack' | 'speed' | 'defense' | 'luck' | null>(null)
  const [playerDodgeFx, setPlayerDodgeFx] = useState(false)
  const [enemyDodgeFx, setEnemyDodgeFx] = useState(false)
  const [enemyCritFx, setEnemyCritFx] = useState(false)
  const [floaters, setFloaters] = useState<BattleFloater[]>([])
  const [pendingFloaterSchedules, setPendingFloaterSchedules] = useState(0)
  const [logRevealPending, setLogRevealPending] = useState(false)
  const turnHadDamageRef = useRef(false)
  const turnDamagePresentationCompleteRef = useRef(true)
  const [postDamageMoveDelayActive, setPostDamageMoveDelayActive] = useState(false)
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

  const playerHpPct = Math.max(0, (displayedPlayerHp / state.playerStats.maxHp) * 100)
  const enemyHpPct = Math.max(0, (displayedEnemyHp / state.enemyMaxHp) * 100)
  const displayCombatStatus = combatStatusForDisplay(state)
  const enemyStatusTags = getFighterStatusTags('enemy', displayCombatStatus)
  const playerStatusTags = getFighterStatusTags('player', displayCombatStatus)
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
  const playerPlateTop =
    playerPlacement.visibleDrawY +
    BATTLE_PLATE_VISIBLE_TOP_GAP +
    BATTLE_PLAYER_FIGHTER_NUDGE_Y
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
    setPendingFloaterSchedules(0)
    setLogRevealPending(false)
    turnHadDamageRef.current = false
    firstPhaseLogLenRef.current = 0
    setPostDamageMoveDelayActive(false)
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

  const encounterRecordedRef = useRef(false)
  useEffect(() => {
    if (state.phase !== 'ended' || !state.result) return
    if (encounterRecordedRef.current) return
    if (state.result === 'win' || state.result === 'lose') {
      encounterRecordedRef.current = true
      recordEncounter(
        npcId,
        state.playerMoveHistory,
        state.enemyMoveHistory,
        state.result === 'win',
      )
    }
  }, [state.phase, state.result, npcId, state.playerMoveHistory, state.enemyMoveHistory])

  useEffect(() => {
    encounterRecordedRef.current = false
  }, [npcId])
  const logLines = displayedLog.slice(-BATTLE_LOG_MAX_ENTRIES)
  const logBoxHeightPx = Math.max(56, 12 + logLines.length * 22)
  const telegraphDisplay = getTelegraphDisplay(state)
  const leanAccent = leanSkillAccentColor(state.npc.leanSkill)
  const telegraphMoveColor =
    state.upcomingMove !== 'STUNNED'
      ? moveHighlightColor(state.upcomingMove as BattleMoveId)
      : leanAccent
  const heavyTelegraph =
    state.upcomingMove !== 'STUNNED' &&
    state.phase !== 'ended' &&
    (telegraphDisplay?.heavy ?? isHeavyPlayerMove(state.upcomingMove as PlayerMoveId))
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
    if (state.upcomingMove !== 'FURY_SWEEP' || state.turn < 1) return
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
      if (postDamageMoveDelayActive) return
      if (turnHadDamageRef.current && !turnDamagePresentationCompleteRef.current) return
      const moveDef = getMoveDef(move)
      const skill = moveDef?.skill
      if (skill === 'attack' || skill === 'speed' || skill === 'defense' || skill === 'luck') {
        lastPlayerMoveSkillRef.current = skill
      }
      movesUsedRef.current.push(move)
      dispatch({ type: 'PLAYER_MOVE', move, slot })
    },
    [inputBlocked, walkerHeavyBeat, state.phase, postDamageMoveDelayActive],
  )

  const handleNarrationContinue = useCallback(() => {
    setNarrationVisible(false)
    setKnockoutPopup('win')
  }, [])

  const handleLoseNarrationContinue = useCallback(() => {
    setLoseNarrationVisible(false)
    setKnockoutPopup('lose')
  }, [])

  const handleKnockoutContinue = useCallback(() => {
    if (!knockoutPopup) return
    const result = knockoutPopup
    setKnockoutPopup(null)
    finishBattle(result)
  }, [finishBattle, knockoutPopup])

  // After the final blow animation completes, show the appropriate end screen.
  const KNOCKOUT_POPUP_DELAY_MS = 2400  // draw popup only (fixed beat)
  const POST_ZERO_HP_DIALOGUE_DELAY_MS = 1000
  useEffect(() => {
    if (state.phase !== 'ended' || state.result !== 'draw') return
    if (state.pendingLevelUpNotification) return
    const timer = window.setTimeout(() => setDrawPopup(true), KNOCKOUT_POPUP_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [state.phase, state.result, state.pendingLevelUpNotification])

  useEffect(() => {
    if (state.phase !== 'ended') return
    if (state.result === 'draw') return  // handled by draw effect above
    if (state.pendingLevelUpNotification) return

    const hasWinNarration = payoffNpc.losingLine.trim().length > 0
    const hasLoseNarration = (payoffNpc.winningLine ?? '').trim().length > 0

    if (state.result === 'win' && displayedEnemyHp !== 0) return
    if (state.result === 'lose' && displayedPlayerHp !== 0) return

    const timer = window.setTimeout(() => {
      if (state.result === 'lose') {
        if (hasLoseNarration) setLoseNarrationVisible(true)
        else setKnockoutPopup('lose')
        return
      }
      if (hasWinNarration) setNarrationVisible(true)
      else setKnockoutPopup('win')
    }, POST_ZERO_HP_DIALOGUE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [
    state.phase,
    state.result,
    state.pendingLevelUpNotification,
    displayedEnemyHp,
    displayedPlayerHp,
    payoffNpc.losingLine,
    payoffNpc.winningLine,
  ])

  useEffect(() => {
    winMatchupCalloutRef.current = false
  }, [npcId])

  useEffect(() => {
    if (state.phase !== 'ended' || state.result !== 'win') return
    if (counterRelation !== 'advantage' || winMatchupCalloutRef.current) return
    winMatchupCalloutRef.current = true
    // Matchup "type win." callout hidden per design
  }, [state.phase, state.result, counterRelation])

  // Enemy-first turns (e.g. SLIP): enemy swings, then dodge/counter in phase 2.
  useEffect(() => {
    const prevStep = prevResolveStepRef.current
    prevResolveStepRef.current = state.resolveStep
    if (state.resolveStep !== 'pause_after_first' || prevStep === 'pause_after_first') return

    const pending = state.pendingResolve
    if (!pending?.enemyFirst) return

    const { r } = pending
    if (!r.enemyAttacks && r.rawIncoming <= 0) return
    if (state.enemyHp <= 0) return

    const ENEMY_LUNGE_MS = BATTLE_LUNGE_ATTACK_MS
    const HIT_FLASH_MS = BATTLE_HIT_FLASH_MS
    const DODGE_MS = BATTLE_DODGE_MS

    setEnemyAtkFx(true)
    const enemyAtkOff = window.setTimeout(() => setEnemyAtkFx(false), ENEMY_LUNGE_MS)

    let dodgeOff = 0
    if (r.dodged) {
      dodgeOff = window.setTimeout(() => {
        setPlayerDodgeFx(true)
        window.setTimeout(() => setPlayerDodgeFx(false), DODGE_MS)
      }, ENEMY_LUNGE_MS + HIT_FLASH_MS)
    }

    return () => {
      window.clearTimeout(enemyAtkOff)
      if (dodgeOff) window.clearTimeout(dodgeOff)
    }
  }, [state.resolveStep, state.pendingResolve, state.enemyHp])

  useEffect(() => {
    const hpUnchanged =
      prevEnemyHpRef.current === state.enemyHp &&
      prevPlayerHpRef.current === state.playerHp
    const wasEnemyDodgeEarly = state.feedbackEvents.some(
      (e) => e.kind === 'dodged' && e.target === 'enemy',
    )
    const wouldAnimateWithoutHpChange =
      playerPhaseAnimates({
        attackDelta: 0,
        wasEnemyDodge: wasEnemyDodgeEarly,
        feedbackEvents: state.feedbackEvents,
        pendingResolve: state.pendingResolve,
      }) ||
      enemyPhaseAnimates({
        playerDelta: 0,
        wasEnemyDodge: wasEnemyDodgeEarly,
        feedbackEvents: state.feedbackEvents,
        pendingResolve: state.pendingResolve,
      })
    if (hpUnchanged && state.feedbackEvents.length === 0 && !wouldAnimateWithoutHpChange) {
      return
    }

    const enemyDelta = prevEnemyHpRef.current - state.enemyHp
    const playerDelta = prevPlayerHpRef.current - state.playerHp
    const wasEnemyDodge = state.feedbackEvents.some((e) => e.kind === 'dodged' && e.target === 'enemy')
    const playerAnimates = playerPhaseAnimates({
      attackDelta: Math.max(0, enemyDelta - Math.min(state.feedbackBleedDamage, Math.max(0, enemyDelta))),
      wasEnemyDodge,
      feedbackEvents: state.feedbackEvents,
      pendingResolve: state.pendingResolve,
    })
    const enemyAnimates = enemyPhaseAnimates({
      playerDelta,
      wasEnemyDodge,
      feedbackEvents: state.feedbackEvents,
      pendingResolve: state.pendingResolve,
    })
    if (enemyDelta > 0 || playerDelta > 0 || playerAnimates || enemyAnimates) {
      turnHadDamageRef.current = true
    }
    if (enemyDelta !== 0) clearHpAnimTimeouts('enemy')
    if (playerDelta !== 0) clearHpAnimTimeouts('player')

    // Capture pre-update HP now; refs get overwritten before scheduled animations run.
    const fromEnemyHp = prevEnemyHpRef.current
    const fromPlayerHp = prevPlayerHpRef.current

    const scheduleEnemyHp = (fn: () => void, delayMs: number) => scheduleHpTimeout('enemy', fn, delayMs)
    const schedulePlayerHp = (fn: () => void, delayMs: number) => scheduleHpTimeout('player', fn, delayMs)

    const enemyActedFirst = state.feedbackEnemyActedFirst

    const skill = lastPlayerMoveSkillRef.current
    const atkFx = playerAtkFxForMove(state.pendingResolve?.r.pMove, skill)
    const PLAYER_LUNGE_MS = playerLungeMsForSkill(atkFx === 'attack' ? 'attack' : skill)
    const ENEMY_LUNGE_MS = BATTLE_LUNGE_ATTACK_MS
    const HIT_FLASH_MS = BATTLE_HIT_FLASH_MS
    const HIT_MS = BATTLE_HIT_MS

    const bleedDelta = Math.min(state.feedbackBleedDamage, Math.max(0, enemyDelta))
    const attackDelta = Math.max(0, enemyDelta - bleedDelta)
    const afterAttackHp = fromEnemyHp - attackDelta

    const schedule = computeDamageRevealSchedule({
      playerLungeMs: PLAYER_LUNGE_MS,
      enemyLungeMs: ENEMY_LUNGE_MS,
      enemyActedFirst,
      attackDelta,
      playerDelta,
      bleedDelta,
      wasEnemyDodge,
      playerPhaseAnimates: playerAnimates,
      enemyPhaseAnimates: enemyAnimates,
    })
    const { playerPhaseStart, enemyPhaseStart } = schedule

    // --- Player attacks enemy (including 0-damage hits and blocks) ---
    if (playerAnimates && !wasEnemyDodge && schedule.enemyDirectAt != null) {
      const t = playerPhaseStart
      const revealAt = schedule.enemyDirectAt
      const id = Date.now() + Math.random()
      window.setTimeout(() => {
        setPlayerAtkFx(atkFx)
        window.setTimeout(() => setPlayerAtkFx(null), PLAYER_LUNGE_MS)
      }, t)
      window.setTimeout(() => {
        setEnemyHitFx(true)
        window.setTimeout(() => setEnemyHitFx(false), HIT_MS)
      }, t + PLAYER_LUNGE_MS + HIT_FLASH_MS)
      scheduleEnemyHp(() => {
        if (attackDelta > 0) {
          animateHpTicks(
            scheduleEnemyHp,
            setDisplayedEnemyHp,
            fromEnemyHp,
            afterAttackHp,
            () => displayedEnemyHpRef.current,
          )
        }
        if (attackDelta > 0) {
          setFloaters((f) => [
            ...f,
            { id, text: `-${attackDelta}`, target: 'enemy', tone: 'attack' },
          ])
          window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
        }
      }, revealAt)
      clampBattleScrollDrift()
    }

    // --- Enemy dodged → optional counter sequence ---
    if (wasEnemyDodge && playerAnimates && fromEnemyHp > 0 && state.enemyHp > 0) {
      const DODGE_DURATION = BATTLE_DODGE_MS
      const COUNTER_LUNGE_MS = BATTLE_LUNGE_ATTACK_MS
      const t = playerPhaseStart
      const id = Date.now() + Math.random()

      window.setTimeout(() => {
        setPlayerAtkFx(atkFx)
        window.setTimeout(() => setPlayerAtkFx(null), PLAYER_LUNGE_MS)
      }, t)
      window.setTimeout(() => {
        setEnemyDodgeFx(true)
        window.setTimeout(() => setEnemyDodgeFx(false), DODGE_DURATION)
      }, t + PLAYER_LUNGE_MS)

      if (playerDelta > 0 && schedule.playerDirectAt != null) {
        const revealAt = schedule.playerDirectAt
        const counterStart = t + PLAYER_LUNGE_MS + DODGE_DURATION
        scheduleEnemyAttackLunge(counterStart, COUNTER_LUNGE_MS)
        window.setTimeout(() => {
          setPlayerHitFx(true)
          window.setTimeout(() => setPlayerHitFx(false), HIT_MS)
        }, counterStart + COUNTER_LUNGE_MS + HIT_FLASH_MS)
        schedulePlayerHp(() => {
          animateHpTicks(
            schedulePlayerHp,
            setDisplayedPlayerHp,
            fromPlayerHp,
            state.playerHp,
            () => displayedPlayerHpRef.current,
          )
          setFloaters((f) => [
            ...f,
            { id, text: `-${playerDelta}`, target: 'player', tone: 'attack' },
          ])
          window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
        }, revealAt)
      }
      clampBattleScrollDrift()
    } else if (
      enemyAnimates &&
      schedule.playerDirectAt != null &&
      fromEnemyHp > 0 &&
      state.enemyHp > 0
    ) {
      // --- Enemy attacks player (normal) ---
      const t = enemyPhaseStart
      const revealAt = schedule.playerDirectAt
      const id = Date.now() + Math.random()
      scheduleEnemyAttackLunge(t, ENEMY_LUNGE_MS)
      window.setTimeout(() => {
        setPlayerHitFx(true)
        window.setTimeout(() => setPlayerHitFx(false), HIT_MS)
      }, t + ENEMY_LUNGE_MS + HIT_FLASH_MS)
      schedulePlayerHp(() => {
        if (playerDelta > 0) {
          animateHpTicks(
            schedulePlayerHp,
            setDisplayedPlayerHp,
            fromPlayerHp,
            state.playerHp,
            () => displayedPlayerHpRef.current,
          )
          setFloaters((f) => [
            ...f,
            { id, text: `-${playerDelta}`, target: 'player', tone: 'attack' },
          ])
          window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
        }
      }, revealAt)
      clampBattleScrollDrift()
    }

    // --- Bleed ticks: only the bleeding character animates ---
    if (bleedDelta > 0 && schedule.bleedAt != null) {
      const bleedHitStart = schedule.bleedAt - HIT_FLASH_MS - HIT_MS
      window.setTimeout(() => {
        setEnemyHitFx(true)
        window.setTimeout(() => setEnemyHitFx(false), HIT_MS)
      }, bleedHitStart)
      scheduleEnemyHp(() => {
        animateHpTicks(
          scheduleEnemyHp,
          setDisplayedEnemyHp,
          afterAttackHp,
          state.enemyHp,
          () => displayedEnemyHpRef.current,
        )
      }, schedule.bleedAt)
    }

    // Healing only: sync displayed HP immediately; skip zero-delta re-runs.
    if (enemyDelta < 0) setDisplayedEnemyHp(state.enemyHp)
    if (playerDelta < 0) setDisplayedPlayerHp(state.playerHp)

    lastHpDeltasRef.current = { enemyDelta, playerDelta }
    prevEnemyHpRef.current = state.enemyHp
    prevPlayerHpRef.current = state.playerHp
  }, [
    state.enemyHp,
    state.playerHp,
    state.feedbackBleedDamage,
    state.feedbackEvents,
    state.feedbackSeq,
    state.pendingResolve,
    clampBattleScrollDrift,
    clearHpAnimTimeouts,
    scheduleHpTimeout,
    scheduleEnemyAttackLunge,
  ])

  useEffect(() => {
    if (state.feedbackSeq === prevFeedbackSeqRef.current) return
    prevFeedbackSeqRef.current = state.feedbackSeq

    setPostDamageMoveDelayActive(false)

    const events = state.feedbackEvents
    if (events.length === 0) return

    const skill = lastPlayerMoveSkillRef.current
    const playerLunge = playerLungeMsForSkill(skill)
    const enemyLunge = BATTLE_LUNGE_ATTACK_MS
    const enemyActedFirst = state.feedbackEnemyActedFirst

    const { enemyDelta, playerDelta } = lastHpDeltasRef.current
    const bleedDelta = Math.min(state.feedbackBleedDamage, Math.max(0, enemyDelta))
    const attackDelta = Math.max(0, enemyDelta - bleedDelta)
    const wasEnemyDodge = events.some((e) => e.kind === 'dodged' && e.target === 'enemy')
    const playerAnimates = playerPhaseAnimates({
      attackDelta,
      wasEnemyDodge,
      feedbackEvents: events,
      pendingResolve: state.pendingResolve,
    })
    const enemyAnimates = enemyPhaseAnimates({
      playerDelta,
      wasEnemyDodge,
      feedbackEvents: events,
      pendingResolve: state.pendingResolve,
    })

    const damageSchedule = computeDamageRevealSchedule({
      playerLungeMs: playerLunge,
      enemyLungeMs: enemyLunge,
      enemyActedFirst,
      attackDelta,
      playerDelta,
      bleedDelta,
      wasEnemyDodge,
      playerPhaseAnimates: playerAnimates,
      enemyPhaseAnimates: enemyAnimates,
    })

    const { playerImpact, enemyImpact } = computeImpactTimings({
      playerLungeMs: playerLunge,
      enemyLungeMs: enemyLunge,
      enemyActedFirst,
      runItBack: state.runItBackMode,
      hasEnemyTargetEvents: playerAnimates,
      hasPlayerTargetEvents: enemyAnimates,
      playerDealsDirectDamage: playerAnimates,
      enemyDealsDamage: enemyAnimates,
    })

    if (events.some((e) => e.kind === 'dodged' && e.target === 'player') && !enemyActedFirst) {
      const dodgeStart = computeDodgeAnimationStart({
        target: 'player',
        playerLungeMs: playerLunge,
        enemyLungeMs: enemyLunge,
        enemyActedFirst,
        runItBack: state.runItBackMode,
      })
      window.setTimeout(() => {
        setPlayerDodgeFx(true)
        window.setTimeout(() => setPlayerDodgeFx(false), BATTLE_DODGE_MS)
      }, dodgeStart)
    }
    const playerBlocked = events.some(
      (e) => (e.kind === 'blocked' || e.kind === 'perfect-guard') && e.target === 'player',
    )
    if (playerBlocked && !enemyActedFirst && !enemyAnimates && state.enemyHp > 0) {
      const attackStart = computePlayerFirstEnemyAttackStart({
        playerLungeMs: playerLunge,
        runItBack: state.runItBackMode,
        playerDealsDirectDamage: playerAnimates,
      })
      scheduleEnemyAttackLunge(attackStart, enemyLunge)
      window.setTimeout(() => {
        setPlayerHitFx(true)
        window.setTimeout(() => setPlayerHitFx(false), BATTLE_HIT_MS)
      }, attackStart + enemyLunge + BATTLE_HIT_FLASH_MS)
    }
    // Enemy dodge flash is handled in the HP-change useEffect's dodge sequence
    if (events.some((e) => e.kind === 'crit')) {
      window.setTimeout(() => {
        setEnemyCritFx(true)
        window.setTimeout(() => setEnemyCritFx(false), 480)
      }, playerImpact + FEEDBACK_CRIT_EXTRA_MS)
    }

    // Use separate stagger indices per target so enemy-side and player-side
    // floaters don't delay each other's timing.
    let enemyEvtIdx = 0
    let playerEvtIdx = 0
    events.forEach((event) => {
      if (!event.text) return
      const isEnemyTarget = event.target === 'enemy'
      const evtIdx = isEnemyTarget ? enemyEvtIdx++ : playerEvtIdx++
      if (FLOATER_SKIP_KINDS.has(event.kind)) return
      const id = Date.now() + Math.random() + evtIdx
      const durationMs = event.kind === 'crit' ? 1200 : 900
      const delay = computeFeedbackEventDelay(event, {
        evtIdx,
        playerImpact,
        enemyImpact,
        playerLungeMs: playerLunge,
        enemyLungeMs: enemyLunge,
        enemyActedFirst,
        runItBack: state.runItBackMode,
        bleedAt: damageSchedule.bleedAt,
        playerDealsDirectDamage: playerAnimates,
      })
      setPendingFloaterSchedules((n) => n + 1)
      window.setTimeout(() => {
        setPendingFloaterSchedules((n) => Math.max(0, n - 1))
        setFloaters((f) => [
          ...f,
          { id, text: event.text, target: event.target, tone: event.tone, kind: event.kind },
        ])
        window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), durationMs)
      }, delay)
    })
    clampBattleScrollDrift()
  }, [state.feedbackSeq, state.feedbackEvents, state.feedbackEnemyActedFirst, state.runItBackMode, state.enemyHp, scheduleEnemyAttackLunge, clampBattleScrollDrift])

  // Reveal one side's log lines at the end of each resolve gap (not the full turn at once).
  useEffect(() => {
    if (state.log === prevLogRef.current) return
    prevLogRef.current = state.log

    // Turn resolve clears last turn's log before new lines arrive, keep showing
    // the prior results until this turn's outcomes are ready to reveal.
    if (state.phase === 'busy' && state.log.length === 0) {
      firstPhaseLogLenRef.current = 0
      return
    }

    const moveGapMs = battleMoveGapMs(state.runItBackMode)
    const roundEndGapMs = battleRoundEndGapMs(state.runItBackMode)

    const reveal = (lines: string[], delayMs: number) => {
      if (delayMs <= 0) {
        setLogRevealPending(false)
        setDisplayedLog(lines)
        setTurnAnnounce(null)
        setLogLineMode('result')
        return () => {}
      }
      setLogRevealPending(true)
      const timer = window.setTimeout(() => {
        setLogRevealPending(false)
        setDisplayedLog(lines)
        setTurnAnnounce(null)
        setLogLineMode('result')
      }, delayMs)
      return () => {
        window.clearTimeout(timer)
        setLogRevealPending(false)
      }
    }

    if (state.resolveStep === 'pause_after_first') {
      firstPhaseLogLenRef.current = state.log.length
      return reveal(state.log, moveGapMs)
    }

    if (state.resolveStep === 'pause_after_second') {
      const split = firstPhaseLogLenRef.current
      const phase2Log = split > 0 ? state.log.slice(split) : state.log
      return reveal(phase2Log, roundEndGapMs)
    }

    const split = firstPhaseLogLenRef.current
    const phase2Only = split > 0 && state.log.length > split
    const linesToShow = phase2Only ? state.log.slice(split) : state.log

    const skill = lastPlayerMoveSkillRef.current
    const pLunge = playerLungeMsForSkill(skill)
    const eLunge = BATTLE_LUNGE_ATTACK_MS
    const enemyActedFirst = state.feedbackEnemyActedFirst
    const { enemyDelta: eDelta, playerDelta: pDelta } = lastHpDeltasRef.current
    const bDelta = Math.min(state.feedbackBleedDamage, Math.max(0, eDelta))
    const aDelta = Math.max(0, eDelta - bDelta)
    const eDodge = state.feedbackEvents.some((e) => e.kind === 'dodged' && e.target === 'enemy')
    const playerAnimates = playerPhaseAnimates({
      attackDelta: aDelta,
      wasEnemyDodge: eDodge,
      feedbackEvents: state.feedbackEvents,
      pendingResolve: state.pendingResolve,
    })
    const enemyAnimates = enemyPhaseAnimates({
      playerDelta: pDelta,
      wasEnemyDodge: eDodge,
      feedbackEvents: state.feedbackEvents,
      pendingResolve: state.pendingResolve,
    })

    const delayMs = computeInstantPhaseLogRevealDelay({
      enemyActedFirst,
      phase2Only,
      playerLungeMs: pLunge,
      enemyLungeMs: eLunge,
      runItBack: state.runItBackMode,
      attackDelta: aDelta,
      playerDelta: pDelta,
      bleedDelta: bDelta,
      wasEnemyDodge: eDodge,
      playerPhaseAnimates: playerAnimates,
      enemyPhaseAnimates: enemyAnimates,
    })

    return reveal(linesToShow, delayMs)
  // Do not depend on feedbackEvents: finalizeTurn clears them without changing log,
  // which would cancel the reveal timer and leave turn 2+ damage stuck off-screen.
  }, [state.log, state.phase, state.resolveStep, state.feedbackBleedDamage, state.feedbackEnemyActedFirst, state.feedbackEvents, state.pendingResolve, state.runItBackMode])

  // When a move is selected, the telegraph line is replaced by the name of
  // whichever side's move resolves first this turn.
  useEffect(() => {
    const prev = prevPendingResolveRef.current
    prevPendingResolveRef.current = state.pendingResolve
    if (state.pendingResolve && state.pendingResolve !== prev) {
      const { r, enemyFirst } = state.pendingResolve
      let announce: { name: string; color: string } | null = null
      if (enemyFirst) {
        if (r.eMove !== 'STUNNED') {
          announce = {
            name: getMoveLogDisplayName(r.eMove),
            color: moveHighlightColor(r.eMove as BattleMoveId),
          }
        }
      } else {
        announce = {
          name: getMoveDef(r.pMove).displayName,
          color: moveHighlightColor(r.pMove),
        }
      }
      setTurnAnnounce(announce)
      if (announce) setLogLineMode('announce')
    }
  }, [state.pendingResolve])

  // Once the player is free to act again, show the enemy telegraph only before
  // their first committed attack; afterward keep the last action log visible.
  useEffect(() => {
    if (state.phase !== 'player') return
    const previewTelegraph = shouldPreviewEnemyTelegraph(state, { walkerHeavyTutorial })
    setLogLineMode(previewTelegraph ? 'telegraph' : 'result')
  }, [state.phase, state.enemyMoveHistory, state.upcomingMove, walkerHeavyTutorial])

  useLayoutEffect(() => {
    clampBattleScrollDrift()
  }, [
    enemyHitFx,
    enemyAtkFx,
    playerHitFx,
    playerAtkFx,
    playerDodgeFx,
    enemyDodgeFx,
    enemyCritFx,
    clampBattleScrollDrift,
  ])

  void hpAnimRevision
  const hpAnimTimeoutCount =
    enemyHpAnimTimeoutsRef.current.length + playerHpAnimTimeoutsRef.current.length
  const turnDamagePresentationComplete = isTurnDamagePresentationComplete({
    floaterCount: floaters.length,
    pendingFloaterSchedules,
    hpAnimTimeoutCount,
    logRevealPending,
  })
  turnDamagePresentationCompleteRef.current = turnDamagePresentationComplete

  const awaitingTurnDamagePresentation =
    turnHadDamageRef.current && !turnDamagePresentationComplete
  const busy =
    state.phase !== 'player' ||
    awaitingTurnDamagePresentation ||
    postDamageMoveDelayActive

  useEffect(() => {
    if (state.phase !== 'player') {
      setPostDamageMoveDelayActive(false)
      return
    }
    if (!turnHadDamageRef.current || !turnDamagePresentationComplete) {
      setPostDamageMoveDelayActive(false)
      return
    }

    setPostDamageMoveDelayActive(true)
    const timer = window.setTimeout(() => {
      setPostDamageMoveDelayActive(false)
    }, TURN_POST_DAMAGE_MOVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [state.phase, turnDamagePresentationComplete, state.feedbackSeq])

  useEffect(() => {
    if (state.phase !== 'busy') return
    // Hold resolution while the level-up notification is open, but only after the
    // full turn has resolved (idle) AND all turn damage feedback has finished.
    if (
      state.pendingLevelUpNotification &&
      state.resolveStep === 'idle' &&
      turnDamagePresentationComplete
    ) {
      return
    }

    const moveGapMs = state.runItBackMode ? RIB_MOVE_GAP_MS : BATTLE_MOVE_GAP_MS
    const roundEndGapMs = state.runItBackMode ? RIB_ROUND_END_GAP_MS : BATTLE_ROUND_END_GAP_MS

    if (state.resolveStep === 'pause_after_first') {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_SECOND' })
      }, moveGapMs + BATTLE_LOG_RESULT_SETTLE_MS)
      return () => window.clearTimeout(timer)
    }

    if (state.resolveStep === 'pause_after_second') {
      if (!turnDamagePresentationComplete) return
      const timer = window.setTimeout(() => {
        dispatch({ type: 'RESOLVE_FINISH' })
      }, roundEndGapMs + BATTLE_LOG_RESULT_SETTLE_MS)
      return () => window.clearTimeout(timer)
    }
  }, [
    state.phase,
    state.resolveStep,
    state.pendingLevelUpNotification,
    state.runItBackMode,
    turnDamagePresentationComplete,
  ])

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
                  top: enemyPlacement.visibleDrawY + BATTLE_PLATE_VISIBLE_TOP_GAP,
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
                className={`battle-screen__fighter battle-screen__fighter--enemy${enemyHitFx ? ' battle-screen__fighter--hit' : ''}${enemyAtkFx ? ' battle-screen__fighter--enemy-attack' : ''}${enemyCritFx ? ' battle-screen__fighter--crit' : ''}${enemyDodgeFx ? ' battle-screen__fighter--dodge' : ''}`}
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
                <section
                  className="battle-screen__log"
                  ref={telegraphRowRef}
                  aria-live="polite"
                  style={{ height: logBoxHeightPx }}
                >
                  {logLineMode === 'announce' && turnAnnounce ? (
                    <div
                      className={`battle-screen__log-line battle-screen__log-line--telegraph${heavyTelegraph ? ' battle-screen__log-line--heavy' : ''}`}
                    >
                      <span
                        className="battle-screen__telegraph-move"
                        style={{ color: turnAnnounce.color }}
                      >
                        {turnAnnounce.name}
                      </span>
                    </div>
                  ) : logLineMode === 'result' ? (
                    logLines.length > 0 ? (
                      logLines.map((line, i) => (
                        <div className="battle-screen__log-line" key={i}>
                          {renderHighlightedLogLine(line)}
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



              {SHOW_BATTLE_PLAYER_PLATE ? (
                <div
                  ref={playerPlateAnchorRef}
                  className="battle-screen__plate-anchor battle-screen__plate-anchor--player battle-screen__plate-anchor--anchored"
                  style={{
                    top: playerPlateTop,
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
                    {playerStatusTags.length > 0 && !battleTutorialBlocking && (
                      <div ref={playerStatusRef} className="battle-screen__plate-status-slot">
                        <FighterStatusTags tags={playerStatusTags} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="battle-screen__tutorial-ref-stubs" aria-hidden>
                  <div ref={playerPlateAnchorRef} />
                  <div ref={playerPlateRef} />
                  <div ref={playerStatusRef} />
                  <div ref={xpBarRef} />
                </div>
              )}

              {/* Player sprite, animates independently */}
              <div
                className={`battle-screen__fighter battle-screen__fighter--player battle-screen__fighter--anchored${playerHitFx ? ' battle-screen__fighter--hit' : ''}${playerAtkFx ? ` battle-screen__fighter--atk-${playerAtkFx}` : ''}${playerDodgeFx ? ' battle-screen__fighter--dodge' : ''}`}
                style={{
                  top: playerPlacement.drawY + BATTLE_PLAYER_FIGHTER_NUDGE_Y,
                  left: playerPlacement.x,
                }}
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
            {/* NPC losing line, overlays moveset after player wins */}
            {showWinNarration && knockoutPopup === null && (
              <button
                type="button"
                className="battle-screen__narration battle-screen__narration--payoff battle-screen__narration--payoff-win"
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
            xpbar: xpBarRef,
          }}
          onNext={() => setWalkerHeavyBeat(null)}
          onSkip={() => setWalkerHeavyBeat(null)}
          stepsOverride={WALKER_HEAVY_CONFIRM_STEPS}
        />
      )}
      {state.pendingLevelUpNotification &&
        state.resolveStep === 'idle' &&
        turnDamagePresentationComplete && (
        <LevelUpOverlay
          notification={state.pendingLevelUpNotification}
          onDismiss={() => dispatch({ type: 'DISMISS_LEVEL_UP' })}
        />
      )}
      {knockoutPopup && (() => {
        const xpGains = computeBattleXpGains(battleStartSkillsRef.current, playerSkills)
        return (
          <div className="battle-knockout-overlay" onClick={handleKnockoutContinue}>
            <div
              className={`battle-knockout-card${
                knockoutPopup === 'win'
                  ? ' battle-knockout-card--win'
                  : ' battle-knockout-card--lose'
              }`}
            >
              <p
                className={`battle-knockout-outcome${
                  knockoutPopup === 'win'
                    ? ' battle-knockout-outcome--win'
                    : ' battle-knockout-outcome--lose'
                }`}
              >
                {knockoutPopup === 'win' ? 'Victory' : 'Defeat'}
              </p>
              <p className="battle-knockout-name">
                {knockoutPopup === 'win' ? state.npc.displayName.toUpperCase() : playerHandle.toUpperCase()}
              </p>
              <p className="battle-knockout-label">has fallen.</p>
              <BattleXpSummary xpGains={xpGains} />
              {knockoutPopup === 'lose' && (
                <p className="battle-knockout-encouragement">Better luck next time.</p>
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
            <BattleXpSummary xpGains={computeBattleXpGains(battleStartSkillsRef.current, playerSkills)} />
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
