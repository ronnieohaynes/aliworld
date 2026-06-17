import { publicAsset } from '../utils/publicAsset'
import { buildDevSpar, isDevSparNpcId } from './devSpar'
import type { BattleLocationId } from './battleBackgrounds'
import { computeNpcCombatStats, npcMoveUnlockSkills } from './npcCombatStats'
import type { LeanSkill } from './skillCounter'
import type { UpcomingMove } from './enemyMoves'
import type { PlayerMoveId } from './moveIds'
import { MOVES } from './moveDefinitions'
import { FIVE_GYM1_ID, getGymHeadWins } from '../store/gymStore'
import {
  fiveGym1RoundIndexForWins,
  FIVE_GYM1_ROUNDS,
} from './fiveGym1Gauntlet'
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
  /** Chance to riposte when player attacks into HOLD (0–1). */
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
  /** Optional per-move telegraph flavor (e.g. "winds up —"). */
  telegraphFlavor?: NpcTelegraphFlavor
  /** Punishes attacking into HOLD — round-tuned on gym heads. */
  guardCounter?: NpcGuardCounter
  /** Fraction of mitigated damage that pierces player HOLD/SLIP (0–1). */
  enemyGuardPierce?: number
  spriteSrc?: string
  /** Location key for city battle backdrop when `battleBg` is unset. */
  battleLocation: BattleLocationId
  /** Optional per-NPC backdrop override (`public/Assets/battle-bg/...`). */
  battleBg?: string
  /** Scales enemy visible body height in battle (default 1). */
  battleSizeMult?: number
}

const WALKER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')
const MARK_SPRITE = publicAsset('Assets/Characters/npcs/mark-idle.png')
const ADAM_SPRITE = publicAsset('Assets/Characters/npcs/Adam-idle.PNG')


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

/** Tutorial — level 2, teaches brace/dodge vs heavy. atk=10 → FURY_SWEEP. */
const WALKER: NpcCombatEntry = entry({
  id: 'walker',
  displayName: 'walker',
  level: 2,
  moves: ['STRIKE', 'FURY_SWEEP', 'HOLD'],
  leanSkill: 'none',
  telegraphFlavor: {
    STRIKE: 'lines up',
    FURY_SWEEP: 'winds up —',
    HOLD: 'plants his feet —',
  },
  losingLine: 'i get it now. tell me where to go.',
  winningLine: "not yet. keep going.",
  spriteSrc: WALKER_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.02,
})

/** Status check — speed lean, slip + telegraphed heavy. spd=15 → PARRY. */
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

/** Boss wall — defense lean, full kit. def=25 → SECOND_WIND, ANCHOR. */
const MARK: NpcCombatEntry = entry({
  id: 'mark',
  displayName: 'mark',
  level: 5,
  moves: ['HOLD', 'ANCHOR', 'DARK_BREAK', 'STRIKE', 'SLIP', 'WHISPER'],
  leanSkill: 'defense',
  telegraphFlavor: {
    HOLD: 'roots in —',
    ANCHOR: 'digs in —',
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

/** E2 gate — blue store clerk; attack-lean scrapper. atk=20 → FURY_SWEEP. */
const CLERK: NpcCombatEntry = entry({
  id: 'clerk',
  displayName: 'clerk',
  level: 4,
  moves: ['STRIKE', 'STRIKE', 'WHISPER', 'FURY_SWEEP'],
  leanSkill: 'attack',
  losingLine: "the gift... it's priceless.",
  winningLine: "you're not taking this from me.",
  spriteSrc: ADAM_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1,
})

/** E2 boss — restocker in the back room; defense wall. def=30 → SECOND_WIND, ANCHOR. */
const RESTOCKER: NpcCombatEntry = entry({
  id: 'restocker',
  displayName: 'restocker',
  level: 6,
  moves: ['HOLD', 'ANCHOR', 'DARK_BREAK', 'STRIKE'],
  leanSkill: 'defense',
  losingLine: "it CAN stop...",
  winningLine: "this floor belongs to me.",
  spriteSrc: MARK_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.08,
})

/** Oceanview Gym week 1 head — gauntlet rounds built from fiveGym1Gauntlet.ts. */
function buildFiveGym1CombatEntry(): NpcCombatEntry {
  const wins = getGymHeadWins(FIVE_GYM1_ID)
  const round = FIVE_GYM1_ROUNDS[fiveGym1RoundIndexForWins(wins)]!
  return entry({
    id: FIVE_GYM1_ID,
    displayName: 'Jerome',
    level: round.level,
    fixedHp: round.fixedHp,
    moves: [...round.moves],
    leanSkill: round.leanSkill,
    telegraphFlavor: round.telegraphFlavor,
    guardCounter: round.guardCounter,
    enemyGuardPierce: round.enemyGuardPierce,
    losingLine: '',
    spriteSrc: publicAsset('Assets/Characters/npcs/5ive-gym1.png'),
    battleLocation: 'five',
    battleBg: publicAsset('Assets/battle-bg/5ive-gym.png'),
    battleSizeMult: 1.02,
  })
}

const NPC_REGISTRY: Record<string, NpcCombatEntry> = {
  walker: WALKER,
  jaclyn: JACLYN,
  mark: MARK,
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
  if (npcId === FIVE_GYM1_ID) return buildFiveGym1CombatEntry()
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
  const npc = isDevSparNpcId(npcId) ? buildDevSpar() : getNpcCombatEntry(npcId)
  if (!npc || npc.moves.length === 0) return 'STRIKE'

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
  const npc = isDevSparNpcId(npcId) ? buildDevSpar() : getNpcCombatEntry(npcId)
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
    if (trimmed.endsWith('—')) {
      return {
        prefix: `${lower} ${trimmed} `,
        moveName,
        suffix: heavy ? ' incoming.' : '.',
        heavy,
      }
    }
    return {
      prefix: `${lower} ${trimmed} — `,
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
