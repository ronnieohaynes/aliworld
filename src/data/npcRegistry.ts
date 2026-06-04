import { publicAsset } from '../utils/publicAsset'
import { buildDevSpar, isDevSparNpcId } from './devSpar'
import type { BattleLocationId } from './battleBackgrounds'
import { computeNpcCombatStats } from './npcCombatStats'
import type { LeanSkill } from './skillCounter'
import {
  type EnemyMoveId,
  getEnemyMoveDef,
  isAttackingEnemyMove,
  telegraphLineForEnemyMove,
  type UpcomingMove,
} from './enemyMoves'

export type EnemyMove = EnemyMoveId
export type { UpcomingMove }

export type CombatStats = {
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
}

/** Per-NPC flavor fragment before the move name in telegraph (commit 2). */
export type NpcTelegraphFlavor = Partial<Record<EnemyMoveId, string>>

export type NpcCombatEntry = {
  id: string
  displayName: string
  level: number
  stats: CombatStats
  moves: EnemyMove[]
  leanSkill: LeanSkill
  losingLine: string
  /** Optional per-move telegraph flavor (e.g. "winds up —"). */
  telegraphFlavor?: NpcTelegraphFlavor
  spriteSrc?: string
  battleLocation: BattleLocationId
  /** Scales enemy visible body height in battle (default 1). */
  battleSizeMult?: number
}

const WALKER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')
const MARK_SPRITE = publicAsset('Assets/Characters/npcs/mark-idle.png')
const ADAM_SPRITE = publicAsset('Assets/Characters/npcs/Adam-idle.PNG')

function entry(
  base: Omit<NpcCombatEntry, 'stats'> & { hpScale?: number },
): NpcCombatEntry {
  const { hpScale = 1, ...rest } = base
  return {
    ...rest,
    stats: computeNpcCombatStats(rest.level, rest.leanSkill, hpScale),
  }
}

/** Tutorial — level 2, teaches brace/dodge vs HAYMAKER. */
const WALKER: NpcCombatEntry = entry({
  id: 'walker',
  displayName: 'walker',
  level: 2,
  moves: ['STRIKE', 'HAYMAKER', 'HOLD'],
  leanSkill: 'none',
  telegraphFlavor: {
    STRIKE: 'lines up',
    HAYMAKER: 'winds up —',
    HOLD: 'plants his feet —',
  },
  losingLine: 'i get it now. tell me where to go.',
  spriteSrc: WALKER_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.02,
})

/** Status check — speed lean, slip + telegraphed heavy. */
const JACLYN: NpcCombatEntry = entry({
  id: 'jaclyn',
  displayName: 'jaclyn',
  level: 3,
  moves: ['SLIP', 'STRIKE', 'HAYMAKER', 'WHISPER'],
  leanSkill: 'speed',
  telegraphFlavor: {
    SLIP: 'feints —',
    STRIKE: 'cuts in —',
    HAYMAKER: 'commits —',
    WHISPER: 'murmurs —',
  },
  losingLine: "...oh. you're right. of course you're right.",
  spriteSrc: JACLYN_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 0.92,
})

/** Boss wall — defense lean, full kit + telegraphed heavy. */
const MARK: NpcCombatEntry = entry({
  id: 'mark',
  displayName: 'mark',
  level: 5,
  moves: ['HOLD', 'HOLD', 'HAYMAKER', 'STRIKE', 'SLIP', 'WHISPER'],
  leanSkill: 'defense',
  telegraphFlavor: {
    HOLD: 'roots in —',
    HAYMAKER: 'draws back —',
    STRIKE: 'swings —',
    SLIP: 'feints —',
    WHISPER: 'murmurs —',
  },
  losingLine: 'huh. ...where do you want me.',
  spriteSrc: MARK_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.04,
})

/** E2 gate — blue store clerk; attack-lean scrapper. */
const CLERK: NpcCombatEntry = entry({
  id: 'clerk',
  displayName: 'clerk',
  level: 4,
  moves: ['STRIKE', 'STRIKE', 'WHISPER', 'HAYMAKER'],
  leanSkill: 'attack',
  losingLine: "the gift... it's priceless.",
  spriteSrc: ADAM_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1,
})

/** E2 boss — restocker in the back room; defense wall. */
const RESTOCKER: NpcCombatEntry = entry({
  id: 'restocker',
  displayName: 'restocker',
  level: 6,
  moves: ['HOLD', 'HOLD', 'HAYMAKER', 'STRIKE'],
  leanSkill: 'defense',
  losingLine: "it CAN stop...",
  spriteSrc: MARK_SPRITE,
  battleLocation: 'five',
  battleSizeMult: 1.08,
})

const NPC_REGISTRY: Record<string, NpcCombatEntry> = {
  walker: WALKER,
  jaclyn: JACLYN,
  mark: MARK,
  clerk: CLERK,
  restocker: RESTOCKER,
}

export function isAttackingMove(move: EnemyMove): boolean {
  return isAttackingEnemyMove(move)
}

export function getNpcCombatEntry(npcId: string): NpcCombatEntry | undefined {
  return NPC_REGISTRY[npcId]
}

export function getNpcCombatLevel(npcId: string): number | null {
  const entry = getNpcCombatEntry(npcId)
  return entry?.level ?? null
}

export function getAllNpcCombatIds(): string[] {
  return Object.keys(NPC_REGISTRY)
}

/** Scripted HAYMAKER on turn 2 for the walker tutorial fight. */
export function walkerTutorialForcedMove(
  npcId: string,
  turn: number,
  walkerHeavyTutorialActive: boolean,
): EnemyMoveId | null {
  if (!walkerHeavyTutorialActive || npcId !== 'walker') return null
  if (turn === 2) return 'HAYMAKER'
  return null
}

/** Picks from the NPC move pool (enemy move ids are data-driven in enemyMoves.ts). */
export function chooseMove(
  npcId: string,
  turn: number,
  forced?: EnemyMoveId | null,
  options?: { walkerHeavyTutorial?: boolean },
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
  const idx = Math.floor(Math.random() * npc.moves.length)
  return npc.moves[idx]!
}

export function telegraphFor(npcId: string, move: EnemyMove): string {
  const npc = isDevSparNpcId(npcId) ? buildDevSpar() : getNpcCombatEntry(npcId)
  const flavor = npc?.telegraphFlavor?.[move]
  if (flavor) return flavor
  return telegraphLineForEnemyMove(move)
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
  const moveId = upcomingMove as EnemyMoveId
  const moveDef = getEnemyMoveDef(moveId)
  const moveName = moveDef.displayName
  const heavy = moveDef.damageMult >= 1.6
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
  const generic = telegraphLineForEnemyMove(moveId)
  return {
    prefix: `${lower} ${generic.replace(/\.$/, '')} — `,
    moveName,
    suffix: '.',
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
  const line = telegraphFor('', upcomingMove)
  return line ? `${lower}: ${line}` : ''
}

/** Re-export for snag / steal mechanics — full enemy move vocabulary. */
export { ENEMY_MOVE_IDS, ENEMY_MOVES, getEnemyMoveDef } from './enemyMoves'
