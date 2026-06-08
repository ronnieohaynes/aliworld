import { createBattleMoveState, type BattleMoveState } from '../data/battleMoveState'
import { applyMoveCostAfterResolve, consumeTurnFlag } from '../data/combatTurnCosts'
import {
  applyDefensePassiveMitigation,
  BLACKOUT_INTERRUPTIBLE,
  BLEED_DAMAGE_MAX_HP_PCT,
  braceStatusIncomingMultiplier,
} from '../data/moveBalance'
import {
  createEmptyCombatStatus,
  enemyLosesTurn,
  getEnemyStatusLabels,
  playerActsFirstDespiteSpd,
  tickCombatStatus,
  type CombatStatusState,
} from '../data/combatStatus'
import {
  applyDoubleHit,
  deathClockHitLogLine,
  resolveDeathClocksAtTurnStart,
  resolveEnemyStrike,
  splitIncomingWithReflect,
  tickDeathClocks,
} from '../data/combatSystems'
import type { DeathClock } from '../data/combatTypes'
import {
  getEnemyMoveDef,
  type EnemyMoveId,
  type UpcomingMove,
} from '../data/enemyMoves'
import {
  applyPlayerMoveFromDef,
  applyStolenEnemyMove,
  getMoveDef,
  mergeResolveIntoCombatStatus,
  playerLogLineForMove,
  type PlayerMoveId,
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
export type BattleResult = 'win' | 'lose'
export type { UpcomingMove } from '../data/enemyMoves'
export type { SkillLevelUp }

export type LevelUpNotification = {
  skillLevelUps: SkillLevelUp[]
  newlyUnlockedMoves: PlayerMoveId[]
  playerLevelBefore: number
  playerLevelAfter: number
}

/** Pause between first and second actor resolution each round. */
export const BATTLE_MOVE_GAP_MS = 2800

/** Pause after both actors resolve before the next turn telegraph. */
export const BATTLE_ROUND_END_GAP_MS = 2300

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
  /** Staged turn resolution — player move is chosen before steps run. */
  pendingResolve: PendingResolve | null
  resolveStep: BattleResolveStep
  /** True for one turn after combat level increases (battle UI flash). */
  playerLevelFlash: boolean
  /** Pop-up combat callouts for the battle UI (blocked, dodged, status, etc.). */
  feedbackEvents: BattleFeedbackEvent[]
  feedbackSeq: number
  /** Which side resolved first this round — used to offset floater timing. */
  feedbackEnemyActedFirst: boolean
  /** Bleed damage dealt this turn — subtracted from the HP-delta floater so the
   *  attack number and bleed number are shown separately. */
  feedbackBleedDamage: number
  /** Non-null when a skill or combat level-up just occurred — shown as an overlay. */
  pendingLevelUpNotification: LevelUpNotification | null
}

export type BattleAction =
  | {
      type: 'INIT'
      npcId: string
      archetype?: ArchetypeId
      accessories?: AccessoryBonuses[]
      carryHp?: number
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
  enemyAttacks: boolean
  enemyStunned: boolean
  /** False during exposed / skip turns — no player move effects or XP move line. */
  playerActed: boolean
  phenomenaLine?: string
  rawIncoming: number
  damageBlocked: number
  damageAvoided: number
  /** Next strike boosted after a successful brace (perfect guard). */
  perfectGuardBonus: boolean
  /** Enemy riposte after player attacked into HOLD. */
  guardCountered: boolean
  /** Healing applied this turn (second wind, lifesteal, phenomena). */
  healApplied: number
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
    enemyAttacks,
    enemyStunned,
    playerActed: true,
    rawIncoming: 0,
    damageBlocked: 0,
    damageAvoided: 0,
    perfectGuardBonus: false,
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

function applyNpcGuardCounter(
  state: BattleState,
  out: ResolveResult,
  actualMove: EnemyMoveId,
): void {
  const counter = state.npc.guardCounter
  if (!counter || actualMove !== 'HOLD') return
  if (!out.playerActed || !isPlayerAggressiveMove(out.pMove)) return
  if (Math.random() >= counter.chance) return

  const riposte = Math.max(1, Math.floor(state.npc.stats.atk * counter.damageMult))
  out.guardCountered = true
  out.playerDmg = Math.max(0, Math.floor(out.playerDmg * 0.1))
  out.incoming = Math.max(out.incoming, riposte)
  out.enemyAttacks = true
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
    state.playerHp = Math.max(0, state.playerHp - post.selfDamage)
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
    spd: skills.speed.level,
    enemyAttacks: strike.enemyAttacks,
    lck: state.playerStats.lck,
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

function resolvePlayerMoveBody(
  state: BattleState,
  pMove: PlayerMove,
  eMove: UpcomingMove,
  slot?: number,
): { out: ResolveResult; post: import('../data/moves').PostResolveEffects } {
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
  if (next.length > 3) next.shift()
  return next
}

function showTelegraph(state: Pick<BattleState, 'npc' | 'turn' | 'combatStatus' | 'battleMove'>): UpcomingMove {
  if (enemyLosesTurn(state.combatStatus)) return 'STUNNED'
  const forced = state.battleMove.forceEnemyMove
  const pick = chooseMove(state.npc.id, state.turn, forced, {
    walkerHeavyTutorial: isWalkerHeavyTutorialActive(state.npc.id),
  })
  return pick
}

function enemyActsFirstInResolution(state: BattleState): boolean {
  return !playerActsFirstDespiteSpd(
    state.combatStatus,
    state.playerStats.spd,
    state.npc.stats.spd,
    getPlayerSkills().speed.level,
  )
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
      const selfDmg = Math.floor(state.playerHp * pct)
      playerHp = Math.max(0, playerHp - selfDmg)
      log = appendLog(log, 'sealed fate slips. it cost you.')
      continue
    }

    if (hit.target === 'enemy') {
      enemyHp = Math.max(0, enemyHp - hit.damage)
    } else {
      playerHp = Math.max(0, playerHp - hit.damage)
    }
    log = appendLog(log, deathClockHitLogLine(hit, state.npc.displayName))
  }

  return { ...state, deathClocks: clocks, enemyHp, playerHp, log }
}

function applyEnemyResolutionPhase(
  state: BattleState,
  r: ResolveResult,
  playerHp: number,
  enemyHp: number,
  log: string[],
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

  if (r.enemyStunned) {
    nextLog = appendLog(nextLog, `${lower} can't move.`)
  } else if (r.incoming > 0) {
    let incoming = r.incoming
    const battle = state.battleMove
    if (battle.counterweightReflectPct != null) {
      const reflected = Math.max(1, Math.floor(incoming * battle.counterweightReflectPct))
      nextEnemyHp = Math.max(0, nextEnemyHp - reflected)
      r.reflectedDmg = reflected
      battle.counterweightReflectPct = null
    }
    const split = splitIncomingWithReflect(incoming, state.combatStatus.playerReflect)
    nextHp = Math.max(0, nextHp - split.damageToPlayer)
    if (r.guardCountered && split.damageToPlayer > 0) {
      nextLog = appendLog(nextLog, `${lower} counters. ${split.damageToPlayer}.`)
    } else if (r.playerActed && split.damageToPlayer > 0 && r.eMove !== 'STUNNED') {
      const moveName = getEnemyMoveDef(r.eMove as EnemyMoveId).displayName
      nextLog = appendLog(
        nextLog,
        `${lower}'s ${moveName} — ${split.damageToPlayer}.`,
      )
    }
    if (split.damageToEnemy > 0) {
      nextEnemyHp = Math.max(0, nextEnemyHp - split.damageToEnemy)
      r.reflectedDmg = (r.reflectedDmg ?? 0) + split.damageToEnemy
    }
    if (!r.playerActed) {
      nextLog = appendLog(
        nextLog,
        split.damageToPlayer > 0
          ? `you're exposed. ${split.damageToPlayer} taken.`
          : `you're exposed. nothing comes.`,
      )
    }
  } else if (!r.playerActed) {
    nextLog = appendLog(nextLog, `you're exposed. nothing comes.`)
  }

  if (nextHp <= 0) {
    return { playerHp: nextHp, enemyHp: nextEnemyHp, log: nextLog, ended: true, result: 'lose' }
  }
  return { playerHp: nextHp, enemyHp: nextEnemyHp, log: nextLog, ended: false }
}

function applyPlayerResolutionPhase(
  state: BattleState,
  r: ResolveResult,
  enemyHp: number,
  playerHp: number,
  log: string[],
): {
  enemyHp: number
  playerHp: number
  log: string[]
  working: BattleState
  ended: boolean
  result?: BattleResult
  bleedDamage: number
} {
  const lower = state.npc.displayName.toLowerCase()
  let nextEnemyHp = enemyHp
  let nextPlayerHp = playerHp
  let nextLog = log
  let working: BattleState = state

  let combatStatus = state.combatStatus
  let damageToEnemy = r.playerDmg

  if (r.playerActed && damageToEnemy > 0) {
    const doubled = applyDoubleHit(damageToEnemy, combatStatus.playerDouble)
    damageToEnemy = doubled.totalDamage
    if (doubled.consumedDouble) {
      combatStatus = { ...combatStatus, playerDouble: 0 }
    }
  }

  if (damageToEnemy > 0) {
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
    nextLog = appendLog(
      nextLog,
      playerLogLineForMove({
        ...r,
        displayName: state.npc.displayName,
        phenomenaLine: r.phenomenaLine,
      }),
    )
  }

  working = { ...working, combatStatus }

  if (r.playerActed) {
    const afterXp = applySkillXpToState(
      { ...working, enemyHp: nextEnemyHp, playerHp: nextPlayerHp, log: nextLog },
      r,
      nextLog,
    )
    working = afterXp.state
    nextLog = afterXp.log
    nextPlayerHp = working.playerHp
  }

  let bleedDamage = 0
  if (working.combatStatus.enemyBleed > 0 && nextEnemyHp > 0) {
    const b = Math.max(1, Math.floor(state.enemyMaxHp * BLEED_DAMAGE_MAX_HP_PCT))
    nextEnemyHp = Math.max(0, nextEnemyHp - b)
    nextLog = appendLog(nextLog, `${lower} bleeds. ${b} damage.`)
    bleedDamage = b
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
    }
  }

  return {
    enemyHp: nextEnemyHp,
    playerHp: nextPlayerHp,
    log: nextLog,
    working,
    ended: false,
    bleedDamage,
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
  })

  return {
    ...state,
    turn,
    upcomingMove,
    combatStatus,
    battleMove,
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
): { state: BattleState; log: string[] } {
  const prevMaxHp = state.playerStats.maxHp
  const timingBonuses = computeTimingBonusGrants(r, state.npc.leanSkill)
  const xpResult = applyCombatSkillXp(r, timingBonuses, {
    enemyLevel: state.npc.level,
    playerLevel: computePlayerLevel(getPlayerSkills()),
    playerHpAfterHit: state.playerHp,
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

  // Filter out xp-bonus floaters (outleveled bonus) — not shown in battle
  const bonusFeedback = xpResult.bonusCallouts.filter((e) => e.kind !== 'xp-bonus')
  const feedbackEvents =
    bonusFeedback.length > 0
      ? [...state.feedbackEvents, ...bonusFeedback]
      : state.feedbackEvents
  const feedbackSeq =
    bonusFeedback.length > 0 ? state.feedbackSeq + 1 : state.feedbackSeq

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
      playerLevelFlash: xpResult.playerLevelLine != null,
      feedbackEvents,
      feedbackSeq,
      pendingLevelUpNotification,
    },
    log: nextLog,
  }
}

function beginTurnResolve(state: BattleState, pMove: PlayerMove, slot?: number): BattleState {
  let working = processTurnStart(state)

  const consumed = consumeTurnFlag({
    playerExposedTurns: working.playerExposedTurns,
    playerSkipTurns: working.playerSkipTurns,
  })
  working = {
    ...working,
    playerExposedTurns: consumed.flags.playerExposedTurns,
    playerSkipTurns: consumed.flags.playerSkipTurns,
  }

  const resolved = consumed.wasExposed
    ? resolveExposedTurn(working, pMove, working.upcomingMove)
    : {
        out: resolveMoves(working, pMove, working.upcomingMove, slot),
        post: { deathClocks: [], selfDamage: 0, healPlayer: 0 },
      }
  if (consumed.wasExposed) {
    applyPostResolveEffects(working, resolved.post)
  }
  const r = resolved.out

  const enemyFirst = enemyActsFirstInResolution(working)
  working = withResolveFeedback(working, r, enemyFirst)
  const pending: PendingResolve = { r, enemyFirst }

  if (enemyFirst) {
    const enemyPhase = applyEnemyResolutionPhase(
      working,
      r,
      working.playerHp,
      working.enemyHp,
      working.log,
    )
    if (enemyPhase.ended) {
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

  const playerPhaseWorking = playerPhase.bleedDamage > 0
    ? {
        ...playerPhase.working,
        // Fresh array so the seq bump only re-fires bleed events, not the full prior set.
        feedbackEvents: [
          { kind: 'status' as const, text: 'bleed!', target: 'enemy' as const, tone: 'bleed' as const },
          { kind: 'damage' as const, text: `-${playerPhase.bleedDamage}`, target: 'enemy' as const, tone: 'bleed' as const },
        ],
        feedbackSeq: playerPhase.working.feedbackSeq + 1,
        feedbackBleedDamage: playerPhase.bleedDamage,
      }
    : playerPhase.working

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
    )
    const playerPhaseWorking = playerPhase.bleedDamage > 0
      ? {
          ...playerPhase.working,
          // Fresh array so the seq bump only re-fires bleed events, not the full prior set.
          feedbackEvents: [
            { kind: 'status' as const, text: 'bleed!', target: 'enemy' as const, tone: 'bleed' as const },
            { kind: 'damage' as const, text: `-${playerPhase.bleedDamage}`, target: 'enemy' as const, tone: 'bleed' as const },
          ],
          feedbackSeq: playerPhase.working.feedbackSeq + 1,
          feedbackBleedDamage: playerPhase.bleedDamage,
        }
      : playerPhase.working
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

export function createInitialBattleState(
  npcId: string,
  options?: {
    archetype?: ArchetypeId
    accessories?: AccessoryBonuses[]
    carryHp?: number
  },
): BattleState {
  const npc = isDevSparNpcId(npcId)
    ? buildDevSpar()
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
  const upcomingMove = showTelegraph({ npc, turn: 0, combatStatus, battleMove })

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
    playerLevelFlash: false,
    feedbackEvents: [],
    feedbackSeq: 0,
    feedbackEnemyActedFirst: false,
    feedbackBleedDamage: 0,
    pendingLevelUpNotification: null,
  }
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'INIT':
      return createInitialBattleState(action.npcId, {
        archetype: action.archetype,
        accessories: action.accessories,
        carryHp: action.carryHp,
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
      return { ...state, pendingLevelUpNotification: null, phase: 'player' }

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
export { ENEMY_MOVES, getEnemyMoveDef } from '../data/enemyMoves'

export function applyBattleEndHealing(
  result: BattleResult,
  maxHp: number,
  currentHp: number,
): number {
  if (result === 'win') {
    return Math.min(maxHp, currentHp + Math.floor(maxHp * 0.25))
  }
  return maxHp
}
