import { createBattleMoveState, type BattleMoveState } from '../data/battleMoveState'
import { applyMoveCostAfterResolve, consumeTurnFlag } from '../data/combatTurnCosts'
import {
  applyDefensePassiveMitigation,
  BLACKOUT_INTERRUPTIBLE,
  BLEED_DAMAGE_MAX_HP_PCT,
  braceStatusIncomingMultiplier,
  CROSS_SCALE,
  crossSecondaryMultiplier,
  ENEMY_WHISPER_PLAYER_WEAKEN_MULT,
  LOOP_DAMAGE_MULT,
} from '../data/moveBalance'
import { MOVES } from '../data/moveDefinitions'
import {
  createEmptyCombatStatus,
  enemyLosesTurn,
  getEnemyStatusLabels,
  playerActsFirstDespiteSpd,
  playerLosesTurn,
  playerOutgoingDamageMult,
  tickCombatStatus,
  type CombatStatusState,
} from '../data/combatStatus'
import {
  applyDoubleHit,
  capDamageToRemainingHp,
  deathClockHitLogLine,
  invalidateCritWhenNoDamage,
  resolveDeathClocksAtTurnStart,
  resolveEnemyStrike,
  splitIncomingWithReflect,
  splitOutgoingWithReflect,
  tickDeathClocks,
} from '../data/combatSystems'
import type { DeathClock } from '../data/combatTypes'
import type { UpcomingMove } from '../data/enemyMoves'
import type { PlayerMoveId } from '../data/moveIds'
import { getMoveLogDisplayName } from '../game/moveHighlightColors'
import {
  applyPlayerMoveFromDef,
  applyStolenEnemyMove,
  getMoveDef,
  mergeResolveIntoCombatStatus,
  mergeEnemyMoveIntoCombatStatus,
  previewEnemyStatusOnPlayer,
  playerLogLineForMove,
  playerDefendedAgainstIncoming,
  enemyDefendedAgainstOutgoing,
  combinedPlayerDefenseLogLine,
  combinedEnemyDefenseLogLine,
  combinedGuardCounterLogLine,
} from '../data/moves'
import {
  chooseMove,
  formatTelegraphDisplay,
  getNpcCombatEntry,
  type NpcCombatEntry,
  type TelegraphDisplay,
} from '../data/npcRegistry'
import { isWalkerHeavyTutorialActive } from '../data/walkerHeavyTutorial'
import { buildDevSpar, isDevSparNpcId } from '../data/devSpar'
import { isGhostCombatId, resolveGhostCombatEntry } from '../data/ghostCombat'
import { deriveBuildLoopType } from '../data/buildName'
import {
  appendBattleFeedback,
  type BattleFeedbackEvent,
} from '../data/battleFeedback'
import { computeTimingBonusGrants } from '../data/timingBonusXp'
import {
  applySkillCounterModifiers,
  getSkillCounterRelation,
} from '../data/skillCounter'
import {
  applyCombatSkillXp,
  getEquippedMoves,
  getPlayerSkills,
  getPlayerStoreState,
  type SkillLevelUp,
} from './playerStore'
import { computePlayerLevel, getSkillStatBonuses, type SkillsState } from './skillStore'

export type PlayerMove = PlayerMoveId
export type ArchetypeId = 'lck' | 'atk' | 'def' | 'spd'
export type BattlePhase = 'player' | 'busy' | 'ended'
export type BattleResult = 'win' | 'lose' | 'draw'
export type { UpcomingMove }
export type { SkillLevelUp }

export type LevelUpNotification = {
  skillLevelUps: SkillLevelUp[]
  newlyUnlockedMoves: PlayerMoveId[]
  playerLevelBefore: number
  playerLevelAfter: number
}

/** Pause between first and second actor resolution each round. */
export const BATTLE_MOVE_GAP_MS = 1400

/** Pause after both actors resolve before the next turn telegraph. */
export const BATTLE_ROUND_END_GAP_MS = 1150

/** Run-it-back mode: more dramatic inter-phase pauses (slower). */
export const RIB_MOVE_GAP_MS = 2100
export const RIB_ROUND_END_GAP_MS = 1800

/** Extra pause after turn damage feedback finishes before move selection unlocks. */
export const TURN_POST_DAMAGE_MOVE_DELAY_MS = 1000

/** Pause after action-log result text before the next resolve-phase animation. */
export const BATTLE_LOG_RESULT_SETTLE_MS = 500

export type BattleResolveStep = 'idle' | 'pause_after_first' | 'pause_after_second'

export type PendingResolve = {
  r: ResolveResult
  enemyFirst: boolean
}

export type PlayerCombatStats = {
  maxHp: number
  atk: number
  def: number
  spd: number
  lck: number
}

export type AccessoryBonuses = Partial<Record<'hp' | 'atk' | 'def' | 'spd' | 'lck', number>>

export const ARCHETYPE_STATS: Record<
  ArchetypeId,
  { hp: number; maxHp: number; atk: number; def: number; spd: number; lck: number }
> = {
  lck: { hp: 45, maxHp: 45, atk: 4, def: 4, spd: 4, lck: 9 },
  atk: { hp: 50, maxHp: 50, atk: 9, def: 3, spd: 4, lck: 4 },
  def: { hp: 65, maxHp: 65, atk: 4, def: 9, spd: 3, lck: 4 },
  spd: { hp: 50, maxHp: 50, atk: 5, def: 4, spd: 9, lck: 4 },
}

export const DEFAULT_ARCHETYPE: ArchetypeId = 'atk'

/** Scale all battle UI pacing delays (+65% duration ≈ ×2.85). */
export const BATTLE_PACE_SCALE = 2.85

export const BATTLE_RESOLVE_DELAY_MS = Math.round(650 * BATTLE_PACE_SCALE)
export const BATTLE_END_LOSE_DELAY_MS = Math.round(500 * BATTLE_PACE_SCALE)
export const BATTLE_END_WIN_DELAY_MS = Math.round(600 * BATTLE_PACE_SCALE)

/** Max action-log lines kept per turn (both resolution phases + bleed/reflect/chip). */
export const BATTLE_LOG_MAX_ENTRIES = 6

export type BattleState = {
  npc: NpcCombatEntry
  playerStats: PlayerCombatStats
  playerHp: number
  enemyHp: number
  enemyMaxHp: number
  archetype: ArchetypeId
  accessories: AccessoryBonuses[]
  turn: number
  upcomingMove: UpcomingMove
  combatStatus: CombatStatusState
  /** Turns where the player does not act (enemy free swing). */
  playerExposedTurns: number
  /** Hyperdrive-style skipped player actions. */
  playerSkipTurns: number
  /** Pending guaranteed hits (sealed fate). */
  deathClocks: DeathClock[]
  battleMove: BattleMoveState
  battleEquipped: readonly [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  log: string[]
  phase: BattlePhase
  result: BattleResult | null
  /** Staged turn resolution, player move is chosen before steps run. */
  pendingResolve: PendingResolve | null
  resolveStep: BattleResolveStep
  /** Pop-up combat callouts for the battle UI (blocked, dodged, status, etc.). */
  feedbackEvents: BattleFeedbackEvent[]
  feedbackSeq: number
  /** Which side resolved first this round, used to offset floater timing. */
  feedbackEnemyActedFirst: boolean
  /** Bleed damage dealt this turn, subtracted from the HP-delta floater so the
   *  attack number and bleed number are shown separately. */
  feedbackBleedDamage: number
  /** Non-null when a skill or combat level-up just occurred, shown as an overlay. */
  pendingLevelUpNotification: LevelUpNotification | null
  /** True when this battle is a "Run it back!" rematch, doubled damage, dramatic pauses. */
  runItBackMode: boolean
  /** When `none`, combat skill XP is skipped entirely for this battle. */
  combatXpPolicy: 'normal' | 'none' | 'fixed-level'
  /** Override win healing, gauntlet uses full heal between chained fights. */
  battleEndHealing: 'default' | 'full-on-win'
  /** Move history for this fight — used by enemy AI pattern learning. */
  playerMoveHistory: PlayerMoveId[]
  enemyMoveHistory: PlayerMoveId[]
}

export type BattleAction =
  | {
      type: 'INIT'
      npcId: string
      archetype?: ArchetypeId
      accessories?: AccessoryBonuses[]
      carryHp?: number
      runItBack?: boolean
      combatXpPolicy?: 'normal' | 'none' | 'fixed-level'
      battleEndHealing?: 'default' | 'full-on-win'
    }
  | { type: 'PLAYER_MOVE'; move: PlayerMove; slot?: number }
  | { type: 'RESOLVE_SECOND' }
  | { type: 'RESOLVE_FINISH' }
  | { type: 'END_BATTLE'; result: BattleResult }
  | { type: 'DISMISS_LEVEL_UP' }

/** Port of CombatScene._computeStats (archetype + accessories only). */
function computeBaseStats(
  archetype: ArchetypeId,
  accessories: AccessoryBonuses[],
): PlayerCombatStats {
  const base = { ...ARCHETYPE_STATS[archetype] }
  for (const item of accessories) {
    for (const [k, v] of Object.entries(item)) {
      if (v == null) continue
      const key = k === 'hp' ? 'maxHp' : k
      if (key in base) {
        ;(base as Record<string, number>)[key] = ((base as Record<string, number>)[key] || 0) + v
      }
    }
  }
  for (const k of Object.keys(base)) {
    if ((base as Record<string, number>)[k]! < 1) {
      ;(base as Record<string, number>)[k] = 1
    }
  }
  return {
    maxHp: base.maxHp,
    atk: base.atk,
    def: base.def,
    spd: base.spd,
    lck: base.lck,
  }
}

/** Archetype + accessories + skill level bonuses. */
export function computePlayerStats(
  archetype: ArchetypeId,
  accessories: AccessoryBonuses[],
  skills: SkillsState,
): PlayerCombatStats {
  const base = computeBaseStats(archetype, accessories)
  const bonus = getSkillStatBonuses(skills)
  return {
    maxHp: base.maxHp + bonus.maxHp,
    atk: base.atk + bonus.atk,
    def: base.def + bonus.def,
    spd: base.spd + bonus.spd,
    lck: base.lck + bonus.lck,
  }
}

/** Port of CombatScene.resolveMoves */
export type ResolveResult = {
  playerDmg: number
  crit: boolean
  incoming: number
  reflectedDmg: number
  dodged: boolean
  braced: boolean
  stunApplied: boolean
  shakeApplied: boolean
  bleedApplied: boolean
  slowApplied: boolean
  missApplied: boolean
  doubleApplied: boolean
  reflectApplied: boolean
  /** Enemy move applied these debuffs to the player this turn (for feedback). */
  playerShakeApplied: boolean
  playerBleedApplied: boolean
  playerStunApplied: boolean
  playerSlowApplied: boolean
  playerMissApplied: boolean
  enemyAttacks: boolean
  enemyStunned: boolean
  /** False during exposed / skip turns, no player move effects or XP move line. */
  playerActed: boolean
  phenomenaLine?: string
  rawIncoming: number
  damageBlocked: number
  damageAvoided: number
  /** Damage absorbed when the enemy braces/blocks the player's hit. */
  enemyDamageBlocked: number
  /** Next strike boosted after a successful brace (perfect guard). */
  perfectGuardBonus: boolean
  /** Enemy dodged the player's attack (SLIP/PARRY). */
  enemyDodged: boolean
  /** Enemy braced against the player's attack (HOLD/ANCHOR). */
  enemyBraced: boolean
  /** Enemy riposte after player attacked into HOLD. */
  guardCountered: boolean
  /** Healing applied this turn (second wind, lifesteal, phenomena). */
  healApplied: number
  /** HOLD brace chip, small atk-scaled side damage on successful brace. */
  braceChipDmg?: number
  eMove: UpcomingMove
  pMove: PlayerMove
}

function emptyResolveResult(
  eMove: UpcomingMove,
  pMove: PlayerMove,
  enemyStunned: boolean,
  enemyAttacks: boolean,
): ResolveResult {
  return {
    playerDmg: 0,
    crit: false,
    incoming: 0,
    reflectedDmg: 0,
    dodged: false,
    braced: false,
    stunApplied: false,
    shakeApplied: false,
    bleedApplied: false,
    slowApplied: false,
    missApplied: false,
    doubleApplied: false,
    reflectApplied: false,
    playerShakeApplied: false,
    playerBleedApplied: false,
    playerStunApplied: false,
    playerSlowApplied: false,
    playerMissApplied: false,
    enemyAttacks,
    enemyStunned,
    playerActed: true,
    rawIncoming: 0,
    damageBlocked: 0,
    damageAvoided: 0,
    enemyDamageBlocked: 0,
    perfectGuardBonus: false,
    enemyDodged: false,
    enemyBraced: false,
    guardCountered: false,
    healApplied: 0,
    eMove,
    pMove,
  }
}

function isDefensiveExposedMove(pMove: PlayerMove): boolean {
  const kind = getMoveDef(pMove).behavior.kind
  return (
    kind === 'brace' ||
    kind === 'dodge' ||
    kind === 'brick-wall' ||
    kind === 'counterweight'
  )
}

const PLAYER_DEFENSIVE_MOVE_KINDS = new Set([
  'brace',
  'dodge',
  'brick-wall',
  'counterweight',
  'anchor',
  'second-wind',
  'invincible',
  'refract',
  'gravity-shift',
])

function isPlayerAggressiveMove(pMove: PlayerMove): boolean {
  return !PLAYER_DEFENSIVE_MOVE_KINDS.has(getMoveDef(pMove).behavior.kind)
}

function isNpcGuardRiposteMove(actualMove: PlayerMoveId): boolean {
  if (actualMove === 'ANCHOR' || actualMove === 'HOLD' || actualMove === 'PARRY') {
    return true
  }
  const def = MOVES[actualMove]
  return def?.behavior.kind === 'brace' && def.behavior.profile.blockStatus === true
}

function applyNpcGuardCounter(
  state: BattleState,
  out: ResolveResult,
  actualMove: PlayerMoveId,
): void {
  const counter = state.npc.guardCounter
  if (!counter || !isNpcGuardRiposteMove(actualMove)) return
  if (!out.playerActed || !isPlayerAggressiveMove(out.pMove)) return
  if (Math.random() >= counter.chance) return

  const riposte = Math.max(1, Math.floor(state.npc.stats.atk * counter.damageMult))
  out.guardCountered = true
  out.playerDmg = Math.max(0, Math.floor(out.playerDmg * 0.1))
  out.incoming = Math.max(out.incoming, riposte)
  out.enemyAttacks = true
}

function applyEnemyMoveBehavior(
  state: BattleState,
  out: ResolveResult,
  actualMove: PlayerMoveId,
): void {
  const moveDef = MOVES[actualMove]
  if (!moveDef) return
  const behavior = moveDef.behavior

  switch (behavior.kind) {
    case 'brace': {
      if (behavior.profile.blockStatus) {
        state.battleMove.anchorBlocksStatus = true
      }
      if (out.playerActed) {
        out.enemyBraced = true
        if (out.playerDmg > 0) {
          out.playerDmg = Math.max(1, Math.floor(out.playerDmg * behavior.profile.incomingMult))
        }
      }
      break
    }
    case 'dodge': {
      const d = behavior.profile
      const spdStat = state.npc.stats.spd
      const dodgeChance = 0.3 + (spdStat * 0.02)
      if (out.playerActed && out.playerDmg > 0 && Math.random() < Math.min(0.65, dodgeChance)) {
        const rawPlayerDmg = out.playerDmg
        out.playerDmg = 0
        out.enemyDodged = true
        const counterScale = 1 + (spdStat * 0.015)
        const counter = Math.max(1, Math.floor(state.npc.stats.atk * d.counterMult * counterScale))
        let totalCounter = counter
        if (d.onDodgeReflectPct && rawPlayerDmg > 0) {
          totalCounter += Math.max(1, Math.floor(rawPlayerDmg * d.onDodgeReflectPct))
        }
        out.incoming = totalCounter
        out.enemyAttacks = true
      } else if (out.playerActed && out.playerDmg > 0) {
        out.playerDmg = Math.max(1, Math.floor(out.playerDmg * (1 - d.weakMult)))
      }
      break
    }
    case 'loop': {
      const loopDmg = Math.max(1, Math.floor(state.npc.stats.atk * LOOP_DAMAGE_MULT))
      out.incoming += loopDmg
      out.enemyAttacks = true
      break
    }
    case 'damage': {
      if (behavior.profile.damageMult < 0.6) {
        state.combatStatus.playerWeaken = 2
      }
      break
    }
  }
}

function applyEnemyGuardPierce(
  state: BattleState,
  out: ResolveResult,
  rawEDmg: number,
): void {
  const pierce = state.npc.enemyGuardPierce
  if (!pierce || rawEDmg <= 0) return

  if (out.dodged) {
    const through = Math.max(1, Math.floor(rawEDmg * pierce))
    out.incoming = Math.max(out.incoming, through)
    out.dodged = false
    out.playerDmg = Math.max(0, Math.floor(out.playerDmg * 0.5))
    out.enemyAttacks = true
    return
  }

  if (out.incoming >= rawEDmg) return
  const mitigated = rawEDmg - out.incoming
  const restored = Math.floor(mitigated * pierce)
  if (restored > 0) {
    out.incoming += restored
    out.enemyAttacks = true
  }
}

function applyPostResolveEffects(
  state: BattleState,
  post: import('../data/moves').PostResolveEffects,
): void {
  if (post.selfDamage > 0) {
    const dealt = capDamageToRemainingHp(post.selfDamage, state.playerHp)
    state.playerHp = Math.max(0, state.playerHp - dealt)
  }
  if (post.healPlayer > 0) {
    state.playerHp = Math.min(state.playerStats.maxHp, state.playerHp + post.healPlayer)
  }
  if (post.deathClocks.length > 0) {
    state.deathClocks = [...state.deathClocks, ...post.deathClocks]
  }
}

function withResolveFeedback(state: BattleState, r: ResolveResult, enemyActedFirst: boolean): BattleState {
  const feedbackEvents = appendBattleFeedback([], r)
  if (feedbackEvents.length === 0) return state
  return { ...state, feedbackEvents, feedbackSeq: state.feedbackSeq + 1, feedbackEnemyActedFirst: enemyActedFirst }
}

function mitigateIncoming(
  incoming: number,
  status: CombatStatusState,
  playerDef: number,
  defSkillLevel: number,
  battle: BattleMoveState,
): number {
  let dmg = incoming

  if (dmg > 0 && battle.playerNextAttackImmune) {
    battle.playerNextAttackImmune = false
    const skills = getPlayerSkills()
    battle.nextHitAtkBonusMult = crossSecondaryMultiplier(
      skills.attack.level,
      CROSS_SCALE.BRICK_WALL_FOLLOWUP_ATK_PER_ATK_LVL,
      CROSS_SCALE.BRICK_WALL_FOLLOWUP_ATK_CAP,
    )
    return 0
  }
  if (dmg > 0 && battle.playerInvincibleBlocks > 0) {
    battle.playerInvincibleBlocks--
    return 0
  }
  if (dmg > 0 && battle.counterweightBlockPct != null) {
    dmg = Math.floor(dmg * (1 - battle.counterweightBlockPct))
    battle.counterweightBlockPct = null
    if (battle.counterweightReflectPct != null && dmg > 0) {
      // reflected via reflectedDmg in enemy phase
    }
  }

  if (status.playerBrace > 0 && dmg > 0) {
    dmg = Math.floor(dmg * braceStatusIncomingMultiplier(defSkillLevel))
  }
  if (dmg > 0) {
    const defMod = battle.enemyDefShattered ? Math.max(0, Math.floor(playerDef / 4)) : Math.floor(playerDef / 3)
    dmg = Math.max(1, dmg - defMod)
  }
  if (dmg > 0) {
    dmg = applyDefensePassiveMitigation(dmg, defSkillLevel)
  }
  return dmg
}

function resolveEnemyIncoming(
  state: BattleState,
  eMove: UpcomingMove,
): import('../data/combatSystems').EnemyStrikeResolution {
  return resolveEnemyStrike(eMove, {
    eAtk: state.npc.stats.atk,
    combatStatus: state.combatStatus,
    battleMove: state.battleMove,
  })
}

/** Player does not act; enemy gets a free swing (exposed / skip turn). */
function buildResolveContext(
  state: BattleState,
  strike: { eDmg: number; enemyAttacks: boolean },
  slot?: number,
): import('../data/moveResolver').ResolveMoveContext {
  const skills = getPlayerSkills()
  return {
    atk: state.playerStats.atk,
    attackSkillLevel: skills.attack.level,
    eDmg: strike.eDmg,
    def: skills.defense.level,
    defStat: state.playerStats.def,
    spd: skills.speed.level,
    enemyAttacks: strike.enemyAttacks,
    lck: state.playerStats.lck,
    luckSkillLevel: skills.luck.level,
    playerHp: state.playerHp,
    playerMaxHp: state.playerStats.maxHp,
    enemyDef: state.npc.stats.def,
    battle: state.battleMove,
    npcMovePool: state.npc.moves,
    moveSlot: slot,
  }
}

function finalizeIncomingXpMetrics(
  out: ResolveResult,
  rawIncoming: number,
): void {
  out.rawIncoming = rawIncoming
  if (out.dodged && rawIncoming > 0) {
    out.damageAvoided = rawIncoming
    out.damageBlocked = 0
    return
  }
  out.damageAvoided = 0
  out.damageBlocked =
    rawIncoming > 0 ? Math.max(0, rawIncoming - out.incoming) : 0
}

function finalizeEnemyDamageBlocked(out: ResolveResult, rawOutgoing: number): void {
  if (out.enemyDodged) {
    out.enemyDamageBlocked = 0
    return
  }
  out.enemyDamageBlocked =
    rawOutgoing > 0 ? Math.max(0, rawOutgoing - out.playerDmg) : 0
}

function capResolveResultToRemainingHp(
  r: ResolveResult,
  enemyHp: number,
  playerHp: number,
): void {
  if (r.playerDmg > 0) {
    r.playerDmg = capDamageToRemainingHp(r.playerDmg, enemyHp)
  }
  if (r.incoming > 0) {
    r.incoming = capDamageToRemainingHp(r.incoming, playerHp)
  }
}

function resolvePlayerMoveBody(
  state: BattleState,
  pMove: PlayerMove,
  eMove: UpcomingMove,
  slot?: number,
): { out: ResolveResult; post: import('../data/moves').PostResolveEffects } {
  const enemyDefShatteredBefore = state.battleMove.enemyDefShattered
  const strike = resolveEnemyIncoming(state, eMove)
  const { enemyStunned, enemyAttacks, eDmg, actualMove } = strike
  const out = emptyResolveResult(eMove, pMove, enemyStunned, enemyAttacks)
  out.enemyAttacks = enemyAttacks
  const ctx = buildResolveContext(state, { eDmg, enemyAttacks }, slot)

  const stolen = slot != null ? state.battleMove.snagStolen[slot] : undefined
  let post: import('../data/moves').PostResolveEffects = {
    deathClocks: [],
    selfDamage: 0,
    healPlayer: 0,
  }

  if (stolen) {
    applyStolenEnemyMove(stolen, ctx, out)
  } else {
    const def = getMoveDef(pMove)
    if (def.cost.kind === 'oncePerBattle' && state.battleMove.oncePerBattleUsed[pMove]) {
      out.playerActed = true
      out.playerDmg = 0
      out.incoming = 0
    } else {
      post = applyPlayerMoveFromDef(def, ctx, out)
    }
  }

  if (state.battleMove.hyperdriveArmed && out.playerActed && pMove !== 'HYPERDRIVE') {
    out.playerDmg = out.playerDmg * 2
    state.battleMove.hyperdriveArmed = false
    state.battleMove.hyperdriveSpent = true
  }

  applySkillCounterModifiers(
    out,
    getSkillCounterRelation(
      deriveBuildLoopType(getPlayerSkills()),
      state.npc.leanSkill,
    ),
  )

  if (state.combatStatus.playerWeaken > 0 && out.playerDmg > 0) {
    out.playerDmg = Math.max(1, Math.floor(out.playerDmg * ENEMY_WHISPER_PLAYER_WEAKEN_MULT))
  }

  const rawOutgoingVsEnemy = out.playerDmg

  applyEnemyMoveBehavior(state, out, actualMove)
  applyNpcGuardCounter(state, out, actualMove)

  out.incoming = mitigateIncoming(
    out.incoming,
    state.combatStatus,
    state.playerStats.def,
    getPlayerSkills().defense.level,
    state.battleMove,
  )

  applyEnemyGuardPierce(state, out, eDmg)

  out.enemyAttacks = eDmg > 0 || out.enemyAttacks

  finalizeIncomingXpMetrics(out, eDmg > 0 ? eDmg : out.guardCountered ? out.incoming : 0)

  if (
    BLACKOUT_INTERRUPTIBLE &&
    state.battleMove.blackoutPhase === 'loading' &&
    out.incoming > 0
  ) {
    state.battleMove.blackoutPhase = 'idle'
  }

  state.battleMove.lastEnemyMove = actualMove
  state.battleMove.lastEnemyDamage = eDmg
  if (post.phenomenaLine) out.phenomenaLine = post.phenomenaLine

  if (out.playerDmg > 0) {
    out.playerDmg = Math.max(
      0,
      Math.floor(out.playerDmg * playerOutgoingDamageMult(state.combatStatus)),
    )
  }

  capResolveResultToRemainingHp(out, state.enemyHp, state.playerHp)

  finalizeEnemyDamageBlocked(out, rawOutgoingVsEnemy)

  invalidateCritWhenNoDamage(out, state.battleMove, enemyDefShatteredBefore)

  return { out, post }
}

export function resolveExposedTurn(
  state: BattleState,
  pMove: PlayerMove,
  eMove: UpcomingMove,
): { out: ResolveResult; post: import('../data/moves').PostResolveEffects } {
  if (isDefensiveExposedMove(pMove)) {
    const { out, post } = resolvePlayerMoveBody(state, pMove, eMove)
    if (post.healPlayer > 0) out.healApplied = post.healPlayer
    return { out, post }
  }

  const strike = resolveEnemyIncoming(state, eMove)
  const { enemyStunned, enemyAttacks, eDmg } = strike
  const out = emptyResolveResult(eMove, pMove, enemyStunned, enemyAttacks)
  out.enemyAttacks = enemyAttacks
  out.playerActed = false
  applySkillCounterModifiers(
    out,
    getSkillCounterRelation(
      deriveBuildLoopType(getPlayerSkills()),
      state.npc.leanSkill,
    ),
  )
  out.incoming = mitigateIncoming(
    eDmg,
    state.combatStatus,
    state.playerStats.def,
    getPlayerSkills().defense.level,
    state.battleMove,
  )
  finalizeIncomingXpMetrics(out, eDmg > 0 ? eDmg : 0)
  capResolveResultToRemainingHp(out, state.enemyHp, state.playerHp)

  if (
    state.battleMove.blackoutPhase === 'loading' &&
    !BLACKOUT_INTERRUPTIBLE &&
    out.incoming === 0
  ) {
    state.battleMove.blackoutPhase = 'armed'
  } else if (state.battleMove.blackoutPhase === 'loading' && out.incoming > 0) {
    if (BLACKOUT_INTERRUPTIBLE) state.battleMove.blackoutPhase = 'idle'
  }

  return { out, post: { deathClocks: [], selfDamage: 0, healPlayer: 0 } }
}

export function resolveMoves(
  state: BattleState,
  pMove: PlayerMove,
  eMove: UpcomingMove,
  slot?: number,
): ResolveResult {
  const { out, post } = resolvePlayerMoveBody(state, pMove, eMove, slot)
  applyPostResolveEffects(state, post)
  if (post.healPlayer > 0) out.healApplied = post.healPlayer
  return out
}

function appendLog(log: string[], line: string): string[] {
  const next = [...log, line]
  if (next.length > BATTLE_LOG_MAX_ENTRIES) next.shift()
  return next
}

function showTelegraph(state: Pick<BattleState, 'npc' | 'turn' | 'combatStatus' | 'battleMove' | 'playerHp' | 'enemyHp' | 'enemyMaxHp' | 'playerStats' | 'playerMoveHistory' | 'enemyMoveHistory' | 'playerExposedTurns'>): UpcomingMove {
  if (enemyLosesTurn(state.combatStatus)) return 'STUNNED'
  const forced = state.battleMove.forceEnemyMove
  const pick = chooseMove(state.npc.id, state.turn, forced, {
    walkerHeavyTutorial: isWalkerHeavyTutorialActive(state.npc.id),
    npcLevel: state.npc.level,
    npcMoves: state.npc.moves,
    playerHpPct: state.playerHp / state.playerStats.maxHp,
    enemyHpPct: state.enemyHp / (state.npc.stats.maxHp || 1),
    playerIsExposed: state.playerExposedTurns > 0,
    playerIsBracing: state.combatStatus.playerBrace > 0,
    enemyIsSlowed: state.combatStatus.enemySlow > 0,
    enemyIsShaken: state.combatStatus.enemyShake > 0,
    enemyIsBleeding: state.combatStatus.enemyBleed > 0,
    lastPlayerMove: state.playerMoveHistory.length > 0 ? state.playerMoveHistory[state.playerMoveHistory.length - 1]! : null,
    lastEnemyMove: state.enemyMoveHistory.length > 0 ? state.enemyMoveHistory[state.enemyMoveHistory.length - 1]! : null,
  })
  return pick
}

/** True if the player's chosen move is a speed "counter" move (dodge-and-counter). */
function isPlayerCounterMove(pMove: PlayerMove): boolean {
  return getMoveDef(pMove).behavior.kind === 'dodge'
}

/** True if the enemy's chosen move is its speed "counter" move. */
function isEnemyCounterMove(eMove: UpcomingMove): boolean {
  if (eMove === 'STUNNED') return false
  const def = MOVES[eMove as PlayerMoveId]
  return def?.behavior.kind === 'dodge'
}

function enemyActsFirstInResolution(state: BattleState, r?: ResolveResult): boolean {
  const speedBased = !playerActsFirstDespiteSpd(
    state.combatStatus,
    state.playerStats.spd,
    state.npc.stats.spd,
    getPlayerSkills().speed.level,
  )

  if (!r) return speedBased

  // Speed "counter" moves (SLIP/PARRY for the player, SLIP for the enemy) are
  // reactive, they should resolve AFTER the other side's move, unless both
  // sides picked a counter move, in which case fall back to speed.
  const pCounter = isPlayerCounterMove(r.pMove)
  const eCounter = isEnemyCounterMove(r.eMove)
  if (pCounter && !eCounter) return true // enemy goes first, player's counter goes second
  if (eCounter && !pCounter) return false // player goes first, enemy's counter goes second
  return speedBased
}

function processTurnStart(state: BattleState): BattleState {
  const { clocks, hits } = resolveDeathClocksAtTurnStart(state.deathClocks)
  if (hits.length === 0) {
    return { ...state, deathClocks: clocks }
  }

  let enemyHp = state.enemyHp
  let playerHp = state.playerHp
  let log = state.log

  for (const hit of hits) {
    if (hit.missed) {
      const pct = hit.clock.missSelfDamagePct ?? 0.8
      const selfDmg = capDamageToRemainingHp(
        Math.floor(state.playerHp * pct),
        playerHp,
      )
      playerHp = Math.max(0, playerHp - selfDmg)
      log = appendLog(log, 'sealed fate slips. it cost you.')
      continue
    }

    if (hit.target === 'enemy') {
      const dealt = capDamageToRemainingHp(hit.damage, enemyHp)
      enemyHp = Math.max(0, enemyHp - dealt)
      log = appendLog(log, deathClockHitLogLine({ ...hit, damage: dealt }, state.npc.displayName))
    } else {
      const dealt = capDamageToRemainingHp(hit.damage, playerHp)
      playerHp = Math.max(0, playerHp - dealt)
      log = appendLog(log, deathClockHitLogLine({ ...hit, damage: dealt }, state.npc.displayName))
    }
  }

  return { ...state, deathClocks: clocks, enemyHp, playerHp, log }
}

function applyEnemyResolutionPhase(
  state: BattleState,
  r: ResolveResult,
  playerHp: number,
  enemyHp: number,
  log: string[],
  options?: { logPlayerDefenseExchange?: boolean },
): {
  playerHp: number
  enemyHp: number
  log: string[]
  ended: boolean
  result?: BattleResult
} {
  const lower = state.npc.displayName.toLowerCase()
  let nextLog = log
  let nextHp = playerHp
  let nextEnemyHp = enemyHp

  if (enemyHp <= 0) {
    return { playerHp, enemyHp, log, ended: false }
  }

  if (r.enemyStunned) {
    nextLog = appendLog(nextLog, `${lower} can't move.`)
  } else if (r.rawIncoming > 0 || r.incoming > 0) {
    let incoming = capDamageToRemainingHp(r.incoming, nextHp)
    const battle = state.battleMove
    if (battle.counterweightReflectPct != null) {
      const reflected = capDamageToRemainingHp(
        Math.max(1, Math.floor(incoming * battle.counterweightReflectPct)),
        nextEnemyHp,
      )
      nextEnemyHp = Math.max(0, nextEnemyHp - reflected)
      r.reflectedDmg = reflected
      battle.counterweightReflectPct = null
      nextLog = appendLog(nextLog, `counterweight. ${reflected}.`)
    }
    const split = splitIncomingWithReflect(incoming, state.combatStatus.playerReflect)
    const playerHit = capDamageToRemainingHp(split.damageToPlayer, nextHp)
    nextHp = Math.max(0, nextHp - playerHit)
    if (r.playerActed && r.eMove !== 'STUNNED') {
      if (r.guardCountered) {
        nextLog = appendLog(
          nextLog,
          combinedGuardCounterLogLine(r, state.npc.displayName, playerHit),
        )
      } else if (options?.logPlayerDefenseExchange && playerDefendedAgainstIncoming(r)) {
        nextLog = appendLog(
          nextLog,
          combinedPlayerDefenseLogLine(r, state.npc.displayName),
        )
      } else if (!playerDefendedAgainstIncoming(r)) {
        const moveName = getMoveLogDisplayName(r.eMove)
        nextLog = appendLog(
          nextLog,
          `${lower}'s ${moveName}, ${playerHit}.`,
        )
      }
    }
    if (split.damageToEnemy > 0) {
      const enemyHit = capDamageToRemainingHp(split.damageToEnemy, nextEnemyHp)
      nextEnemyHp = Math.max(0, nextEnemyHp - enemyHit)
      r.reflectedDmg = (r.reflectedDmg ?? 0) + enemyHit
      nextLog = appendLog(nextLog, `reflect. ${enemyHit}.`)
    }
    if (!r.playerActed) {
      nextLog = appendLog(
        nextLog,
        playerHit > 0
          ? `you're exposed. ${playerHit} taken.`
          : `you're exposed. nothing comes.`,
      )
    }
  } else if (!r.playerActed) {
    nextLog = appendLog(nextLog, `you're exposed. nothing comes.`)
  }

  if (nextHp <= 0) {
    return { playerHp: nextHp, enemyHp: nextEnemyHp, log: nextLog, ended: true, result: 'lose' }
  }

  if (state.combatStatus.playerBleed > 0) {
    const potency = state.combatStatus.playerBleedPotencyMult ?? 1
    const rawBleed = Math.max(
      1,
      Math.floor(state.playerStats.maxHp * BLEED_DAMAGE_MAX_HP_PCT * potency),
    )
    if (nextHp > 0) {
      const b = capDamageToRemainingHp(rawBleed, nextHp)
      nextHp = Math.max(0, nextHp - b)
      nextLog = appendLog(nextLog, `you bleed. ${b} damage.`)
    } else {
      nextLog = appendLog(nextLog, 'you bleed.')
    }
  }

  return { playerHp: nextHp, enemyHp: nextEnemyHp, log: nextLog, ended: false }
}

function applyPlayerResolutionPhase(
  state: BattleState,
  r: ResolveResult,
  enemyHp: number,
  playerHp: number,
  log: string[],
  options?: { logPlayerDefenseExchange?: boolean },
): {
  enemyHp: number
  playerHp: number
  log: string[]
  working: BattleState
  ended: boolean
  result?: BattleResult
  bleedDamage: number
  bleedActualHpChange: number
  xpBonusEvents: BattleFeedbackEvent[]
} {
  const lower = state.npc.displayName.toLowerCase()
  let nextEnemyHp = enemyHp
  let nextPlayerHp = playerHp
  let nextLog = log
  let working: BattleState = state

  let combatStatus = state.combatStatus
  let damageToEnemy = r.playerDmg
  let reflectToPlayer = 0

  if (r.playerActed && damageToEnemy > 0) {
    const split = splitOutgoingWithReflect(damageToEnemy, combatStatus.enemyReflect)
    damageToEnemy = split.damageToEnemy
    if (split.damageToPlayer > 0) {
      const reflectDealt = capDamageToRemainingHp(split.damageToPlayer, nextPlayerHp)
      nextPlayerHp = Math.max(0, nextPlayerHp - reflectDealt)
      r.reflectedDmg = (r.reflectedDmg ?? 0) + reflectDealt
      reflectToPlayer = reflectDealt
    }
    const doubled = applyDoubleHit(damageToEnemy, combatStatus.playerDouble)
    damageToEnemy = doubled.totalDamage
    if (doubled.consumedDouble) {
      combatStatus = { ...combatStatus, playerDouble: 0 }
    }
  }

  if (damageToEnemy > 0) {
    damageToEnemy = capDamageToRemainingHp(damageToEnemy, nextEnemyHp)
    r.playerDmg = damageToEnemy
    nextEnemyHp = Math.max(0, nextEnemyHp - damageToEnemy)
  }

  if (
    r.playerActed &&
    damageToEnemy > 0 &&
    working.battleMove.devilsCutTurns > 0 &&
    working.battleMove.devilsCutPct > 0
  ) {
    const steal = Math.max(
      1,
      Math.floor(damageToEnemy * working.battleMove.devilsCutPct),
    )
    nextPlayerHp = Math.min(
      working.playerStats.maxHp,
      nextPlayerHp + steal,
    )
    r.healApplied += steal
  }

  if (r.playerActed) {
    let logLine: string | null = null
    if (playerDefendedAgainstIncoming(r)) {
      if (options?.logPlayerDefenseExchange !== false) {
        logLine = combinedPlayerDefenseLogLine(r, state.npc.displayName)
      }
    } else if (enemyDefendedAgainstOutgoing(r)) {
      logLine = combinedEnemyDefenseLogLine(r, state.npc.displayName)
    } else {
      logLine = playerLogLineForMove({
        ...r,
        displayName: state.npc.displayName,
        phenomenaLine: r.phenomenaLine,
      })
    }
    if (logLine) nextLog = appendLog(nextLog, logLine)
    if (reflectToPlayer > 0) {
      nextLog = appendLog(nextLog, `reflect. ${reflectToPlayer}.`)
    }
  }

  working = { ...working, combatStatus }

  const winLocked = nextEnemyHp <= 0
  if (winLocked) {
    nextLog = appendLog(nextLog, `${lower} is finished.`)
  }

  let xpBonusEvents: BattleFeedbackEvent[] = []
  if (r.playerActed) {
    const afterXp = applySkillXpToState(
      { ...working, enemyHp: nextEnemyHp, playerHp: nextPlayerHp, log: nextLog },
      r,
      nextLog,
    )
    working = afterXp.state
    nextLog = afterXp.log
    nextPlayerHp = working.playerHp
    xpBonusEvents = afterXp.xpBonusEvents
  }

  if (winLocked) {
    return {
      enemyHp: nextEnemyHp,
      playerHp: nextPlayerHp,
      log: nextLog,
      working,
      ended: true,
      result: 'win',
      bleedDamage: 0,
      bleedActualHpChange: 0,
      xpBonusEvents,
    }
  }

  let bleedDamage = 0
  let bleedActualHpChange = 0
  if (working.combatStatus.enemyBleed > 0) {
    const potency = working.combatStatus.enemyBleedPotencyMult ?? 1
    let rawBleed = Math.max(1, Math.floor(state.enemyMaxHp * BLEED_DAMAGE_MAX_HP_PCT * potency))
    if (state.runItBackMode) rawBleed *= 2
    if (nextEnemyHp > 0) {
      const b = capDamageToRemainingHp(rawBleed, nextEnemyHp)
      nextEnemyHp = Math.max(0, nextEnemyHp - b)
      nextLog = appendLog(nextLog, `${lower} bleeds. ${b} damage.`)
      bleedActualHpChange = b
    } else {
      nextLog = appendLog(nextLog, `${lower} bleeds.`)
    }
    bleedDamage = bleedActualHpChange
  }

  const braceChip = r.braceChipDmg ?? 0
  if (r.playerActed && braceChip > 0 && nextEnemyHp > 0) {
    const chip = capDamageToRemainingHp(braceChip, nextEnemyHp)
    nextEnemyHp = Math.max(0, nextEnemyHp - chip)
    nextLog = appendLog(nextLog, `brace chip. ${chip}.`)
  }

  if (nextEnemyHp <= 0) {
    nextLog = appendLog(nextLog, `${lower} is finished.`)
    return {
      enemyHp: nextEnemyHp,
      playerHp: nextPlayerHp,
      log: nextLog,
      working,
      ended: true,
      result: 'win',
      bleedDamage,
      bleedActualHpChange,
      xpBonusEvents,
    }
  }

  return {
    enemyHp: nextEnemyHp,
    playerHp: nextPlayerHp,
    log: nextLog,
    working,
    ended: false,
    bleedDamage,
    bleedActualHpChange,
    xpBonusEvents,
  }
}

function finalizeTurn(state: BattleState, r: ResolveResult): BattleState {
  const battleMove = { ...state.battleMove }
  let combatStatus = tickCombatStatus(state.combatStatus)
  combatStatus = mergeResolveIntoCombatStatus(
    combatStatus,
    r,
    battleMove.anchorBlocksStatus,
  )
  combatStatus = mergeEnemyMoveIntoCombatStatus(
    combatStatus,
    r.eMove,
    battleMove.anchorBlocksStatus,
  )
  if (r.incoming > 0 && state.combatStatus.enemyDouble > 0) {
    combatStatus = { ...combatStatus, enemyDouble: 0 }
  }
  battleMove.anchorBlocksStatus = false

  if (battleMove.enemyAccuracyTurns > 0) {
    battleMove.enemyAccuracyTurns--
    if (battleMove.enemyAccuracyTurns <= 0) battleMove.enemyAccuracyMult = 1
  }

  battleMove.forceEnemyMove = null

  let turnFlags = {
    playerExposedTurns: state.playerExposedTurns,
    playerSkipTurns: state.playerSkipTurns,
  }

  const moveDef = getMoveDef(r.pMove)
  turnFlags = applyMoveCostAfterResolve(moveDef.cost, turnFlags)

  if (r.pMove === 'BLACKOUT' && battleMove.blackoutPhase === 'recharging') {
    turnFlags = applyMoveCostAfterResolve({ kind: 'rechargeTurn' }, turnFlags)
    turnFlags = applyMoveCostAfterResolve({ kind: 'exposedTurn' }, turnFlags)
  }

  if (battleMove.hyperdriveSpent) {
    turnFlags = applyMoveCostAfterResolve({ kind: 'rechargeTurn' }, turnFlags)
    turnFlags = applyMoveCostAfterResolve({ kind: 'exposedTurn' }, turnFlags)
    battleMove.hyperdriveSpent = false
  }

  if (battleMove.blackoutPhase === 'loading' && !r.playerActed) {
    battleMove.blackoutPhase = 'armed'
  }

  if (battleMove.blackoutPhase === 'recharging') {
    battleMove.blackoutPhase = 'idle'
  }

  if (battleMove.devilsCutTurns > 0) {
    battleMove.devilsCutTurns = Math.max(0, battleMove.devilsCutTurns - 1)
    if (battleMove.devilsCutTurns <= 0) battleMove.devilsCutPct = 0
  }

  const turn = state.turn + 1
  const upcomingMove = showTelegraph({
    npc: state.npc,
    turn,
    combatStatus,
    battleMove,
    playerHp: state.playerHp,
    enemyHp: state.enemyHp,
    enemyMaxHp: state.enemyMaxHp,
    playerStats: state.playerStats,
    playerMoveHistory: state.playerMoveHistory,
    enemyMoveHistory: state.enemyMoveHistory,
    playerExposedTurns: turnFlags.playerExposedTurns,
  })

  let enemyHp = state.enemyHp
  let log = state.log
  if (
    state.npc.id === 'restocker' &&
    r.eMove === 'HOLD' &&
    !r.enemyStunned &&
    enemyHp < state.npc.stats.maxHp
  ) {
    const heal = Math.max(1, Math.floor(state.npc.stats.maxHp * 0.14))
    enemyHp = Math.min(state.npc.stats.maxHp, enemyHp + heal)
    log = appendLog(log, `restocker restocks. +${heal}.`)
  }

  return {
    ...state,
    turn,
    upcomingMove,
    combatStatus,
    battleMove,
    enemyHp,
    log,
    playerExposedTurns: turnFlags.playerExposedTurns,
    playerSkipTurns: turnFlags.playerSkipTurns,
    deathClocks: tickDeathClocks(state.deathClocks),
    phase: 'player',
    result: null,
    feedbackEvents: [],
  }
}

function applySkillXpToState(
  state: BattleState,
  r: ResolveResult,
  log: string[],
): { state: BattleState; log: string[]; xpBonusEvents: BattleFeedbackEvent[] } {
  if (state.combatXpPolicy === 'none') {
    return { state, log, xpBonusEvents: [] }
  }
  const prevMaxHp = state.playerStats.maxHp
  const timingBonuses = computeTimingBonusGrants(r, state.npc.leanSkill)
  const xpResult = applyCombatSkillXp(r, timingBonuses, {
    enemyLevel: state.npc.level,
    playerLevel: computePlayerLevel(getPlayerSkills()),
    playerHpAfterHit: state.playerHp,
    forceLevelXpMult: state.combatXpPolicy === 'fixed-level' ? 1 : undefined,
  })
  const skills = getPlayerSkills()
  const playerStats = computePlayerStats(
    state.archetype ?? DEFAULT_ARCHETYPE,
    state.accessories ?? [],
    skills,
  )
  let playerHp = state.playerHp
  const maxHpGain = playerStats.maxHp - prevMaxHp
  if (maxHpGain > 0) {
    playerHp = Math.min(playerStats.maxHp, playerHp + maxHpGain)
  }

  const nextLog = log
  // XP skill lines and level-up lines are intentionally not shown in the battle log

  // Filter out xp-bonus floaters (outleveled bonus), not shown in battle
  // Returned separately so callers can fire these AFTER damage feedback resolves.
  const xpBonusEvents = xpResult.bonusCallouts.filter((e) => e.kind !== 'xp-bonus')

  const hasLevelUp = xpResult.skillLevelUps.length > 0 || xpResult.playerLevelLine != null
  const pendingLevelUpNotification: LevelUpNotification | null = hasLevelUp
    ? {
        skillLevelUps: xpResult.skillLevelUps,
        newlyUnlockedMoves: xpResult.newlyUnlockedMoves,
        playerLevelBefore: xpResult.playerLevelBefore,
        playerLevelAfter: xpResult.playerLevel,
      }
    : null

  return {
    state: {
      ...state,
      playerStats,
      playerHp,
      pendingLevelUpNotification,
    },
    log: nextLog,
    xpBonusEvents,
  }
}

function beginTurnResolve(state: BattleState, pMove: PlayerMove, slot?: number): BattleState {
  const priorLogLen = state.log.length
  let working = processTurnStart(state)
  // Each turn's log should only show this turn's outcomes (keep death-clock lines).
  working = { ...working, log: working.log.slice(priorLogLen) }
  const eMove = state.upcomingMove !== 'STUNNED' ? state.upcomingMove as PlayerMoveId : null
  working = {
    ...working,
    playerMoveHistory: [...working.playerMoveHistory, pMove as PlayerMoveId],
    enemyMoveHistory: eMove
      ? [...working.enemyMoveHistory, eMove]
      : [...working.enemyMoveHistory],
  }

  const consumed = consumeTurnFlag({
    playerExposedTurns: working.playerExposedTurns,
    playerSkipTurns: working.playerSkipTurns,
  })
  working = {
    ...working,
    playerExposedTurns: consumed.flags.playerExposedTurns,
    playerSkipTurns: consumed.flags.playerSkipTurns,
  }

  const statusStunned = playerLosesTurn(working.combatStatus)
  const resolved = consumed.wasExposed || statusStunned
    ? resolveExposedTurn(working, pMove, working.upcomingMove)
    : {
        out: resolveMoves(working, pMove, working.upcomingMove, slot),
        post: { deathClocks: [], selfDamage: 0, healPlayer: 0 },
      }
  if (consumed.wasExposed || statusStunned) {
    applyPostResolveEffects(working, resolved.post)
  }
  // Apply run-it-back damage doubling before any phase resolution.
  let r = {
    ...resolved.out,
    ...previewEnemyStatusOnPlayer(
      resolved.out.eMove,
      working.battleMove.anchorBlocksStatus,
    ),
  }
  if (statusStunned) {
    r = { ...r, playerActed: false }
  }
  if (working.runItBackMode) {
    r = {
      ...r,
      playerDmg: Math.round(r.playerDmg * 2),
      incoming: Math.round(r.incoming * 2),
      rawIncoming: Math.round(r.rawIncoming * 2),
    }
  }

  // LOOP: both sides attack twice — double both damage outputs.
  const playerUsedLoop = pMove === 'LOOP'
  const enemyUsedLoop = eMove === 'LOOP'
  if (playerUsedLoop || enemyUsedLoop) {
    r = {
      ...r,
      playerDmg: Math.round(r.playerDmg * 2),
      incoming: Math.round(r.incoming * 2),
      rawIncoming: Math.round(r.rawIncoming * 2),
    }
  }

  capResolveResultToRemainingHp(r, working.enemyHp, working.playerHp)

  const enemyFirst = enemyActsFirstInResolution(working, r)
  working = withResolveFeedback(working, r, enemyFirst)
  const pending: PendingResolve = { r, enemyFirst }

  if (enemyFirst) {
    const enemyPhase = applyEnemyResolutionPhase(
      working,
      r,
      working.playerHp,
      working.enemyHp,
      working.log,
      { logPlayerDefenseExchange: true },
    )
    if (enemyPhase.ended) {
      // Draw check: enemy killed the player, but would player's attack + bleed also kill enemy?
      const bleedB = working.combatStatus.enemyBleed > 0
        ? Math.max(1, Math.floor(state.enemyMaxHp * BLEED_DAMAGE_MAX_HP_PCT)) * (working.runItBackMode ? 2 : 1)
        : 0
      const effectiveDmg = r.playerActed ? r.playerDmg : 0
      if (effectiveDmg + bleedB >= working.enemyHp) {
        return {
          ...working,
          playerHp: 0,
          enemyHp: 0,
          log: [...enemyPhase.log, 'both fighters fall.'],
          pendingResolve: null,
          resolveStep: 'idle',
          phase: 'ended',
          result: 'draw',
        }
      }
      return {
        ...working,
        playerHp: enemyPhase.playerHp,
        enemyHp: enemyPhase.enemyHp,
        log: enemyPhase.log,
        pendingResolve: null,
        resolveStep: 'idle',
        phase: 'ended',
        result: enemyPhase.result ?? 'lose',
      }
    }
    return {
      ...working,
      playerHp: enemyPhase.playerHp,
      enemyHp: enemyPhase.enemyHp,
      log: enemyPhase.log,
      pendingResolve: pending,
      resolveStep: 'pause_after_first',
      phase: 'busy',
    }
  }

  const playerPhase = applyPlayerResolutionPhase(
    working,
    r,
    working.enemyHp,
    working.playerHp,
    working.log,
  )

  // Preserve the crit/status events already queued by withResolveFeedback (e.g. the
  // "CRIT" callout and "bleed!" status from a Fury Sweep) and append the bleed damage
  // text + xp bonus floaters after them, so a single seq bump carries the full,
  // correctly-ordered sequence, nothing from the original hit gets dropped.
  // XP bonus floaters intentionally fire AFTER damage/bleed feedback resolves.
  const followUpFeedback: BattleFeedbackEvent[] = [
    ...playerPhase.working.feedbackEvents,
    ...(playerPhase.bleedDamage > 0
      ? [
          { kind: 'damage' as const, text: `-${playerPhase.bleedDamage}`, target: 'enemy' as const, tone: 'bleed' as const },
        ]
      : []),
    ...playerPhase.xpBonusEvents,
  ]
  const playerPhaseWorking = followUpFeedback.length > 0
    ? {
        ...playerPhase.working,
        feedbackEvents: followUpFeedback,
        feedbackSeq: state.feedbackSeq + 1,
        feedbackBleedDamage: playerPhase.bleedActualHpChange,
      }
    : { ...playerPhase.working, feedbackBleedDamage: playerPhase.bleedActualHpChange }

  if (playerPhase.ended) {
    // Draw check: player killed enemy, but would enemy's unresolved attack also kill the player?
    if (r.incoming > 0 && playerPhase.playerHp - r.incoming <= 0) {
      return {
        ...playerPhaseWorking,
        enemyHp: 0,
        playerHp: 0,
        log: [...playerPhase.log, 'both fighters fall.'],
        pendingResolve: null,
        resolveStep: 'idle',
        phase: 'ended',
        result: 'draw',
      }
    }
    return {
      ...playerPhaseWorking,
      enemyHp: playerPhase.enemyHp,
      playerHp: playerPhase.playerHp,
      log: playerPhase.log,
      pendingResolve: null,
      resolveStep: 'idle',
      phase: 'ended',
      result: playerPhase.result ?? 'win',
    }
  }

  return {
    ...playerPhaseWorking,
    enemyHp: playerPhase.enemyHp,
    playerHp: playerPhase.playerHp,
    log: playerPhase.log,
    pendingResolve: pending,
    resolveStep: 'pause_after_first',
    phase: 'busy',
  }
}

function applySecondResolve(state: BattleState): BattleState {
  const pending = state.pendingResolve
  if (!pending || state.phase !== 'busy') return state

  const { r, enemyFirst } = pending

  if (enemyFirst) {
    const playerPhase = applyPlayerResolutionPhase(
      state,
      r,
      state.enemyHp,
      state.playerHp,
      state.log,
      { logPlayerDefenseExchange: false },
    )
    const playerPhaseWorking = playerPhase.bleedDamage > 0
      ? {
          ...playerPhase.working,
          // Preserve the crit/status events already queued for this turn (e.g. "CRIT"
          // and "bleed!" from withResolveFeedback) and append the bleed damage text
          // after them, so nothing from the original hit gets dropped.
          feedbackEvents: [
            ...playerPhase.working.feedbackEvents,
            { kind: 'damage' as const, text: `-${playerPhase.bleedDamage}`, target: 'enemy' as const, tone: 'bleed' as const },
          ],
          feedbackSeq: playerPhase.working.feedbackSeq + 1,
          feedbackBleedDamage: playerPhase.bleedActualHpChange,
        }
      : { ...playerPhase.working, feedbackBleedDamage: playerPhase.bleedActualHpChange }
    if (playerPhase.ended) {
      return {
        ...playerPhaseWorking,
        enemyHp: playerPhase.enemyHp,
        playerHp: playerPhase.playerHp,
        log: playerPhase.log,
        pendingResolve: null,
        resolveStep: 'idle',
        phase: 'ended',
        result: playerPhase.result ?? 'win',
      }
    }
    return {
      ...playerPhaseWorking,
      enemyHp: playerPhase.enemyHp,
      playerHp: playerPhase.playerHp,
      log: playerPhase.log,
      pendingResolve: pending,
      resolveStep: 'pause_after_second',
      phase: 'busy',
    }
  }

  if (state.enemyHp <= 0) {
    return {
      ...state,
      pendingResolve: pending,
      resolveStep: 'pause_after_second',
      phase: 'busy',
    }
  }

  const enemyPhase = applyEnemyResolutionPhase(
    state,
    r,
    state.playerHp,
    state.enemyHp,
    state.log,
  )
  if (enemyPhase.ended) {
    return {
      ...state,
      playerHp: enemyPhase.playerHp,
      enemyHp: enemyPhase.enemyHp,
      log: enemyPhase.log,
      pendingResolve: null,
      resolveStep: 'idle',
      phase: 'ended',
      result: enemyPhase.result ?? 'lose',
    }
  }
  return {
    ...state,
    playerHp: enemyPhase.playerHp,
    enemyHp: enemyPhase.enemyHp,
    log: enemyPhase.log,
    pendingResolve: pending,
    resolveStep: 'pause_after_second',
    phase: 'busy',
  }
}

function finishTurnResolve(state: BattleState): BattleState {
  const pending = state.pendingResolve
  if (!pending || state.phase !== 'busy') return state

  const finalized = finalizeTurn(state, pending.r)
  // If a level-up notification was produced, stay busy until the player dismisses it.
  const phase = finalized.pendingLevelUpNotification ? 'busy' : 'player'
  return {
    ...finalized,
    pendingResolve: null,
    resolveStep: 'idle',
    phase,
  }
}

/** Combat status merged with pending resolve for UI tags during busy resolution. */
export function combatStatusForDisplay(
  state: Pick<BattleState, 'phase' | 'combatStatus' | 'pendingResolve' | 'battleMove'>,
): CombatStatusState {
  if (state.phase !== 'busy' || !state.pendingResolve) {
    return state.combatStatus
  }
  const { r } = state.pendingResolve
  const anchorBlocksStatus = state.battleMove.anchorBlocksStatus
  let status = state.combatStatus
  status = mergeResolveIntoCombatStatus(status, r, anchorBlocksStatus)
  status = mergeEnemyMoveIntoCombatStatus(status, r.eMove, anchorBlocksStatus)
  return status
}

export function getEnemyStatusText(state: BattleState): string {
  return getEnemyStatusLabels(state.combatStatus).join('   ')
}

export function getTelegraphDisplay(state: BattleState): TelegraphDisplay | null {
  return formatTelegraphDisplay(
    state.npc,
    state.upcomingMove,
    enemyLosesTurn(state.combatStatus),
  )
}

export function getTelegraphText(state: BattleState): string {
  const display = getTelegraphDisplay(state)
  if (!display) return ''
  if (!display.moveName) return display.prefix + display.suffix
  return `${display.prefix}${display.moveName}${display.suffix}`
}

/** Preview upcoming enemy move only before their first committed attack (walker FURY_SWEEP tutorial excepted). */
export function shouldPreviewEnemyTelegraph(
  state: Pick<BattleState, 'enemyMoveHistory' | 'upcomingMove'>,
  options?: { walkerHeavyTutorial?: boolean },
): boolean {
  if (state.enemyMoveHistory.length === 0) return true
  if (options?.walkerHeavyTutorial && state.upcomingMove === 'FURY_SWEEP') return true
  return false
}

export function createInitialBattleState(
  npcId: string,
  options?: {
    archetype?: ArchetypeId
    accessories?: AccessoryBonuses[]
    carryHp?: number
    runItBack?: boolean
    combatXpPolicy?: 'normal' | 'none' | 'fixed-level'
    battleEndHealing?: 'default' | 'full-on-win'
  },
): BattleState {
  const npc = isDevSparNpcId(npcId)
    ? buildDevSpar()
    : isGhostCombatId(npcId)
      ? resolveGhostCombatEntry(npcId)
      : (() => {
        const resolvedId = getNpcCombatEntry(npcId) ? npcId : 'walker'
        const entry = getNpcCombatEntry(resolvedId)
        if (!entry) {
          throw new Error(`Unknown combat NPC: ${npcId}`)
        }
        return { ...entry }
      })()

  const player = getPlayerStoreState()
  const archetype = options?.archetype ?? player.archetype ?? DEFAULT_ARCHETYPE
  const accessories = options?.accessories ?? player.accessories ?? []
  const skills = getPlayerSkills()
  const playerStats = computePlayerStats(archetype, accessories, skills)
  const playerHp = playerStats.maxHp
  const combatStatus = createEmptyCombatStatus()
  const battleMove = createBattleMoveState()
  const playerMoveHistory: PlayerMoveId[] = []
  const enemyMoveHistory: PlayerMoveId[] = []
  const upcomingMove = showTelegraph({
    npc,
    turn: 0,
    combatStatus,
    battleMove,
    playerHp,
    enemyHp: npc.stats.hp,
    enemyMaxHp: npc.stats.maxHp,
    playerStats,
    playerMoveHistory,
    enemyMoveHistory,
    playerExposedTurns: 0,
  })

  return {
    npc,
    playerStats,
    playerHp,
    enemyHp: npc.stats.hp,
    enemyMaxHp: npc.stats.maxHp,
    archetype,
    accessories,
    turn: 0,
    upcomingMove,
    combatStatus,
    playerExposedTurns: 0,
    playerSkipTurns: 0,
    deathClocks: [],
    battleMove,
    battleEquipped: getEquippedMoves(),
    log: [],
    phase: 'player',
    result: null,
    pendingResolve: null,
    resolveStep: 'idle',
    feedbackEvents: [],
    feedbackSeq: 0,
    feedbackEnemyActedFirst: false,
    feedbackBleedDamage: 0,
    pendingLevelUpNotification: null,
    runItBackMode: options?.runItBack ?? false,
    combatXpPolicy: options?.combatXpPolicy ?? 'normal',
    battleEndHealing: options?.battleEndHealing ?? 'default',
    playerMoveHistory,
    enemyMoveHistory,
  }
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'INIT':
      return createInitialBattleState(action.npcId, {
        archetype: action.archetype,
        accessories: action.accessories,
        carryHp: action.carryHp,
        runItBack: action.runItBack,
        combatXpPolicy: action.combatXpPolicy,
        battleEndHealing: action.battleEndHealing,
      })

    case 'PLAYER_MOVE':
      if (state.phase !== 'player') return state
      return beginTurnResolve(state, action.move, action.slot)

    case 'RESOLVE_SECOND':
      return applySecondResolve(state)

    case 'RESOLVE_FINISH':
      return finishTurnResolve(state)

    case 'END_BATTLE':
      return { ...state, phase: 'ended', result: action.result }

    case 'DISMISS_LEVEL_UP':
      return {
        ...state,
        pendingLevelUpNotification: null,
        phase: state.phase === 'ended' ? 'ended' : 'player',
      }

    default:
      return state
  }
}

export { getOverworldPlayerHp, setOverworldPlayerHp } from './playerStore'

export {
  scheduleDeathClock,
  scheduleExposedTurn,
  schedulePlayerSkipTurn,
} from '../data/combatSystems'
export type { DeathClock, StatusEffectId, MoveCost } from '../data/combatTypes'
export { applyStatusToCombat, createEmptyCombatStatus } from '../data/combatStatus'
export { MOVES as ENEMY_MOVES } from '../data/moveDefinitions'

export function applyBattleEndHealing(
  result: BattleResult,
  maxHp: number,
  currentHp: number,
  mode: 'default' | 'full-on-win' = 'default',
): number {
  if (result === 'win') {
    if (mode === 'full-on-win') return maxHp
    return Math.min(maxHp, currentHp + Math.floor(maxHp * 0.25))
  }
  return maxHp
}
