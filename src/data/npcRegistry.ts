import { publicAsset } from '../utils/publicAsset'
import {
  CLERK_IDLE_SPRITE,
  RESTOCKER_IDLE_SPRITE,
  TOWN_CRIER_IDLE_SPRITE,
} from './npcs'
import { buildDevSpar, isDevSparNpcId } from './devSpar'
import { isGhostCombatId, resolveGhostCombatEntry } from './ghostCombat'
import { chooseGhostMove } from './ghostMoveAi'
import type { BattleLocationId } from './battleBackgrounds'
import { computeNpcCombatStats, npcMoveUnlockSkills } from './npcCombatStats'
import type { LeanSkill } from './skillCounter'
import type { UpcomingMove } from './enemyMoves'
import type { PlayerMoveId } from './moveIds'
import { MOVES } from './moveDefinitions'
import {
  findGymWeekForCombatId,
  isGymGauntletCombatId,
  type GymFighterConfig,
} from './gymWeeks'
import { chooseMoveAI, type BattleContext } from './enemyAI'
import { getNpcMemory } from '../store/enemyMemoryStore'

export type EnemyMove = PlayerMoveId
export type { UpcomingMove }

export type CombatStats = {
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  lck: number
}

/** Per-NPC flavor fragment before the move name in telegraph (commit 2). */
export type NpcTelegraphFlavor = Partial<Record<PlayerMoveId, string>>

export type NpcGuardCounter = {
  /** Chance to riposte when player attacks into ANCHOR (0–1). */
  chance: number
  damageMult: number
}

export type NpcCombatEntry = {
  id: string
  displayName: string
  level: number
  stats: CombatStats
  moves: PlayerMoveId[]
  leanSkill: LeanSkill
  losingLine: string
  /** Line shown when the NPC wins (player loses). Empty = no narration. */
  winningLine?: string
  /** Optional per-move telegraph flavor (e.g. "winds up"). */
  telegraphFlavor?: NpcTelegraphFlavor
  /** Punishes attacking into ANCHOR, round-tuned on gym heads. */
  guardCounter?: NpcGuardCounter
  /** Fraction of mitigated damage that pierces player ANCHOR/SLIP (0–1). */
  enemyGuardPierce?: number
  spriteSrc?: string
  /** Location key for city battle backdrop when `battleBg` is unset. */
  battleLocation: BattleLocationId
  /** Optional per-NPC backdrop override (`public/Assets/battle-bg/...`). */
  battleBg?: string
  /** Scales enemy visible body height in battle (default 1). */
  battleSizeMult?: number
  /** Midnight variant sheet — battle draws down-facing frame (ghost / player-style sheets). */
  midnightVariantId?: string
}

const WALKER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')
const MARK_SPRITE = publicAsset('Assets/Characters/npcs/mark-idle.png')


function filterMovesForNpcLevel(moves: PlayerMoveId[], level: number, lean: LeanSkill): PlayerMoveId[] {
  const skills = npcMoveUnlockSkills(level, lean)
  const filtered = moves.filter((moveId) => {
    const def = MOVES[moveId]
    if (!def) return false
    const skillLevel = skills[def.skill]?.level ?? 1
    return skillLevel >= def.unlockAtSkillLevel
  })
  if (filtered.length > 0) return filtered
  return ['STRIKE']
}

function entry(
  base: Omit<NpcCombatEntry, 'stats'> & { hpScale?: number; fixedHp?: number },
): NpcCombatEntry {
  const { hpScale = 1, fixedHp, ...rest } = base
  const stats = computeNpcCombatStats(rest.level, rest.leanSkill, hpScale)
  if (fixedHp != null) {
    stats.hp = fixedHp
    stats.maxHp = fixedHp
  }
  const moves = filterMovesForNpcLevel(rest.moves, rest.level, rest.leanSkill)
  return { ...rest, stats, moves }
}

/** Tutorial — level 2, teaches brace/dodge vs heavy. */
const WALKER: NpcCombatEntry = entry({
  id: 'walker',
  displayName: 'walker',
  level: 2,
  moves: ['STRIKE', 'FURY_SWEEP', 'ANCHOR'],
  leanSkill: 'none',
  telegraphFlavor: {
    STRIKE: 'lines up',
    FURY_SWEEP: 'winds up —',
    ANCHOR: 'plants his feet —',
  },
  losingLine: 'i get it now. tell me where to go.',
  winningLine: "not yet. keep going.",
  spriteSrc: WALKER_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.02,
})

/** Status check — speed lean, slip + telegraphed heavy. */
const JACLYN: NpcCombatEntry = entry({
  id: 'jaclyn',
  displayName: 'jaclyn',
  level: 3,
  moves: ['SLIP', 'STRIKE', 'FURY_SWEEP', 'WHISPER'],
  leanSkill: 'speed',
  telegraphFlavor: {
    SLIP: 'feints —',
    STRIKE: 'cuts in —',
    FURY_SWEEP: 'commits —',
    WHISPER: 'murmurs —',
  },
  losingLine: "...oh. you're right. of course you're right.",
  winningLine: "you weren't ready. come back.",
  spriteSrc: JACLYN_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 0.92,
})

/** Boss wall — defense lean, full kit. */
const MARK: NpcCombatEntry = entry({
  id: 'mark',
  displayName: 'mark',
  level: 5,
  moves: ['ANCHOR', 'ANCHOR', 'DARK_BREAK', 'STRIKE', 'SLIP', 'WHISPER'],
  leanSkill: 'defense',
  telegraphFlavor: {
    ANCHOR: 'roots in —',
    DARK_BREAK: 'draws back —',
    STRIKE: 'swings —',
    SLIP: 'feints —',
    WHISPER: 'murmurs —',
  },
  losingLine: 'huh. ...where do you want me.',
  winningLine: "i told you. the wall doesn't move.",
  spriteSrc: MARK_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.04,
})

/** E2, town crier at the 5ive; luck-lean rhetorical fight. */
const TOWN_CRIER: NpcCombatEntry = entry({
  id: 'town-crier',
  displayName: 'town crier',
  level: 3,
  moves: ['WHISPER', 'STRIKE', 'SLIP', 'WHISPER'],
  leanSkill: 'luck',
  telegraphFlavor: {
    WHISPER: 'spreads the word',
    STRIKE: 'points',
    SLIP: 'sidesteps',
  },
  losingLine: "...no. no, you're right. you were always right.",
  winningLine: "the crowd's not buying it.",
  spriteSrc: TOWN_CRIER_IDLE_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 0.98,
})

/** E2 gate — blue store clerk; attack-lean scrapper. */
const CLERK: NpcCombatEntry = entry({
  id: 'clerk',
  displayName: 'clerk',
  level: 4,
  moves: ['STRIKE', 'STRIKE', 'WHISPER', 'FURY_SWEEP'],
  leanSkill: 'attack',
  telegraphFlavor: {
    STRIKE: 'swings',
    WHISPER: 'lowers his voice',
    FURY_SWEEP: 'commits —',
  },
  losingLine: "the gift... it's priceless.",
  winningLine: "you're not taking this from me.",
  spriteSrc: CLERK_IDLE_SPRITE,
  battleLocation: 'blue_store',
  battleSizeMult: 1,
})

/** E2 finale — restocker in the back room; defense wall + restock heals. */
const RESTOCKER: NpcCombatEntry = entry({
  id: 'restocker',
  displayName: 'restocker',
  level: 9,
  hpScale: 1.72,
  moves: ['ANCHOR', 'ANCHOR', 'ANCHOR', 'CANNON', 'STRIKE', 'SLIP', 'LOOP', 'WHISPER'],
  leanSkill: 'defense',
  telegraphFlavor: {
    ANCHOR: 'restocks',
    CANNON: 'heaves —',
    STRIKE: 'swings',
    SLIP: 'feints',
    LOOP: 'draws back',
    WHISPER: 'murmurs',
  },
  guardCounter: { chance: 0.5, damageMult: 2.4 },
  enemyGuardPierce: 0.14,
  losingLine: 'it CAN stop...',
  winningLine: 'this floor belongs to me.',
  spriteSrc: RESTOCKER_IDLE_SPRITE,
  battleLocation: 'blue_store',
  battleSizeMult: 1.12,
})

function buildGymFighterCombatEntry(fighter: GymFighterConfig): NpcCombatEntry {
  return entry({
    id: fighter.combatId,
    displayName: fighter.displayName,
    level: fighter.level,
    fixedHp: fighter.fixedHp,
    moves: [...fighter.moves],
    leanSkill: fighter.leanSkill,
    telegraphFlavor: fighter.telegraphFlavor,
    guardCounter: fighter.guardCounter,
    enemyGuardPierce: fighter.enemyGuardPierce,
    losingLine: fighter.losingLine ?? '',
    winningLine: fighter.winningLine,
    spriteSrc: fighter.spriteSrc,
    battleLocation: 'five',
    battleBg: fighter.battleBg,
    battleSizeMult: fighter.battleSizeMult,
  })
}

function buildGymGauntletCombatEntry(combatId: string): NpcCombatEntry | undefined {
  const week = findGymWeekForCombatId(combatId)
  if (!week) return undefined
  if (week.leader.combatId === combatId) {
    return buildGymFighterCombatEntry(week.leader)
  }
  const henchman = week.henchmen.find((h) => h.combatId === combatId)
  if (henchman) return buildGymFighterCombatEntry(henchman)
  return undefined
}

const NPC_REGISTRY: Record<string, NpcCombatEntry> = {
  walker: WALKER,
  jaclyn: JACLYN,
  mark: MARK,
  'town-crier': TOWN_CRIER,
  clerk: CLERK,
  restocker: RESTOCKER,
}

const ATTACKING_BEHAVIOR_KINDS = new Set([
  'damage', 'fury-sweep', 'dark-break', 'cannon', 'blackout', 'loop',
  'gravity-shift', 'refract', 'hyperdrive', 'devils-cut', 'phenomena',
  'sealed-fate', 'snag',
])

export function isAttackingMove(move: EnemyMove): boolean {
  const def = MOVES[move]
  if (!def) return false
  return ATTACKING_BEHAVIOR_KINDS.has(def.behavior.kind)
}

export function getNpcCombatEntry(npcId: string): NpcCombatEntry | undefined {
  if (isGhostCombatId(npcId)) {
    return resolveGhostCombatEntry(npcId)
  }
  if (isGymGauntletCombatId(npcId)) {
    return buildGymGauntletCombatEntry(npcId)
  }
  return NPC_REGISTRY[npcId]
}

export function getNpcCombatLevel(npcId: string): number | null {
  const entry = getNpcCombatEntry(npcId)
  return entry?.level ?? null
}

export function getAllNpcCombatIds(): string[] {
  return Object.keys(NPC_REGISTRY)
}

/** Scripted FURY_SWEEP on turn 2 for the walker tutorial fight. */
export function walkerTutorialForcedMove(
  npcId: string,
  turn: number,
  walkerHeavyTutorialActive: boolean,
): PlayerMoveId | null {
  if (!walkerHeavyTutorialActive || npcId !== 'walker') return null
  if (turn === 2) return 'FURY_SWEEP'
  return null
}

export type ChooseMoveOptions = {
  walkerHeavyTutorial?: boolean
  npcLevel?: number
  npcMoves?: PlayerMoveId[]
  playerHpPct?: number
  enemyHpPct?: number
  playerIsExposed?: boolean
  playerIsBracing?: boolean
  enemyIsSlowed?: boolean
  enemyIsShaken?: boolean
  enemyIsBleeding?: boolean
  lastPlayerMove?: string | null
  lastEnemyMove?: PlayerMoveId | null
}

/** Picks from the NPC move pool — level-scaled AI with cross-fight pattern learning. */
export function chooseMove(
  npcId: string,
  turn: number,
  forced?: PlayerMoveId | null,
  options?: ChooseMoveOptions,
): EnemyMove {
  const tutorialForced = walkerTutorialForcedMove(
    npcId,
    turn,
    options?.walkerHeavyTutorial ?? false,
  )
  if (tutorialForced) return tutorialForced
  if (forced) return forced
  const npc = isDevSparNpcId(npcId)
    ? buildDevSpar()
    : isGhostCombatId(npcId)
      ? resolveGhostCombatEntry(npcId)
      : getNpcCombatEntry(npcId)
  if (!npc || npc.moves.length === 0) return 'STRIKE'

  if (isGhostCombatId(npcId)) {
    return chooseGhostMove(npc.moves, {
      enemyHpRatio: options?.enemyHpPct ?? 1,
      lastMove: options?.lastEnemyMove ?? null,
      leanSkill: npc.leanSkill,
    })
  }

  const ctx: BattleContext = {
    turn,
    playerHpPct: options?.playerHpPct ?? 1,
    enemyHpPct: options?.enemyHpPct ?? 1,
    playerIsExposed: options?.playerIsExposed ?? false,
    playerIsBracing: options?.playerIsBracing ?? false,
    enemyIsSlowed: options?.enemyIsSlowed ?? false,
    enemyIsShaken: options?.enemyIsShaken ?? false,
    enemyIsBleeding: options?.enemyIsBleeding ?? false,
    lastPlayerMove: options?.lastPlayerMove ?? null,
    lastEnemyMove: options?.lastEnemyMove ?? null,
  }

  const memory = getNpcMemory(npcId)
  return chooseMoveAI(npcId, npc.level, npc.moves, ctx, memory)
}

const HEAVY_BEHAVIOR_KINDS = new Set(['cannon', 'blackout', 'sealed-fate'])

function isHeavyMove(moveId: PlayerMoveId): boolean {
  const def = MOVES[moveId]
  if (!def) return false
  if (HEAVY_BEHAVIOR_KINDS.has(def.behavior.kind)) return true
  if (def.behavior.kind === 'damage' && def.behavior.profile.damageMult >= 1.6) return true
  return false
}

export function telegraphFor(npcId: string, move: EnemyMove): string {
  const npc = isDevSparNpcId(npcId)
    ? buildDevSpar()
    : isGhostCombatId(npcId)
      ? resolveGhostCombatEntry(npcId)
      : getNpcCombatEntry(npcId)
  const flavor = npc?.telegraphFlavor?.[move]
  if (flavor) return flavor
  const def = MOVES[move]
  return def ? `prepares ${def.displayName}.` : 'readies.'
}

export type TelegraphDisplay = {
  prefix: string
  moveName: string
  suffix: string
  heavy: boolean
}

export function formatTelegraphDisplay(
  npc: NpcCombatEntry,
  upcomingMove: UpcomingMove,
  enemyStunned: boolean,
): TelegraphDisplay | null {
  const lower = npc.displayName.toLowerCase()
  if (enemyStunned || upcomingMove === 'STUNNED') {
    return { prefix: `${lower} is reeling.`, moveName: '', suffix: '', heavy: false }
  }
  const moveId = upcomingMove as PlayerMoveId
  const moveDef = MOVES[moveId]
  if (!moveDef) return null
  const moveName = moveDef.displayName
  const heavy = isHeavyMove(moveId)
  const flavor = npc.telegraphFlavor?.[moveId]
  if (flavor) {
    const trimmed = flavor.trim()
    return {
      prefix: `${lower} ${trimmed} `,
      moveName,
      suffix: heavy ? ' incoming.' : '.',
      heavy,
    }
  }
  return {
    prefix: `${lower} prepares — `,
    moveName,
    suffix: heavy ? ' incoming.' : '.',
    heavy,
  }
}

export function formatTelegraph(
  displayName: string,
  upcomingMove: UpcomingMove,
  enemyStunned: boolean,
): string {
  const lower = displayName.toLowerCase()
  if (enemyStunned || upcomingMove === 'STUNNED') {
    return `${lower} is reeling.`
  }
  const line = telegraphFor('', upcomingMove as PlayerMoveId)
  return line ? `${lower}: ${line}` : ''
}

/** Re-export for snag / steal mechanics, full enemy move vocabulary. */
export { ENEMY_MOVE_IDS, ENEMY_MOVES, getEnemyMoveDef } from './enemyMoves'
