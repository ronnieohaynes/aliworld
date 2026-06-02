import { publicAsset } from '../utils/publicAsset'
import type { BattleLocationId } from './battleBackgrounds'
import type { LeanSkill } from './skillCounter'
import {
  type EnemyMoveId,
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

export type NpcCombatEntry = {
  id: string
  displayName: string
  stats: CombatStats
  moves: EnemyMove[]
  leanSkill: LeanSkill
  losingLine: string
  spriteSrc?: string
  battleLocation: BattleLocationId
}

const WALKER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')
const JACLYN_SPRITE = publicAsset('Assets/Characters/npcs/jaclyn-idle.png')
const MARK_SPRITE = publicAsset('Assets/Characters/npcs/mark-idle.png')

/** Tutorial — low threat, simple move pool, win even if sloppy. */
const WALKER: NpcCombatEntry = {
  id: 'walker',
  displayName: 'walker',
  stats: { hp: 30, maxHp: 30, atk: 5, def: 2, spd: 4 },
  moves: ['STRIKE', 'SLIP'],
  leanSkill: 'none',
  losingLine: 'i get it now. tell me where to go.',
  spriteSrc: WALKER_SPRITE,
  battleLocation: 'five',
}

/** TEMP: no-stakes grind target — huge HP, no damage. delete after testing. */
const DUMMY: NpcCombatEntry = {
  ...WALKER,
  id: 'dummy',
  displayName: 'Dummy',
  stats: { hp: 40, maxHp: 40, atk: 0, def: 0, spd: 1 },
}

/** Status check — fast and slippery; rewards debuffs and defense-lean builds. */
const JACLYN: NpcCombatEntry = {
  id: 'jaclyn',
  displayName: 'jaclyn',
  stats: { hp: 45, maxHp: 45, atk: 9, def: 3, spd: 8 },
  moves: ['STRIKE', 'SLIP', 'SLIP', 'LOOP', 'WHISPER'],
  leanSkill: 'speed',
  losingLine: "...oh. you're right. of course you're right.",
  spriteSrc: JACLYN_SPRITE,
  battleLocation: 'five',
}

/** Boss wall — braces heavy, telegraphs LOOP; attack builds grind, speed slips through. */
const MARK: NpcCombatEntry = {
  id: 'mark',
  displayName: 'mark',
  stats: { hp: 70, maxHp: 70, atk: 11, def: 7, spd: 4 },
  moves: ['HOLD', 'HOLD', 'LOOP', 'STRIKE', 'SLIP'],
  leanSkill: 'defense',
  losingLine: 'huh. ...where do you want me.',
  spriteSrc: MARK_SPRITE,
  battleLocation: 'five',
}

const NPC_REGISTRY: Record<string, NpcCombatEntry> = {
  walker: WALKER,
  jaclyn: JACLYN,
  mark: MARK,
  dummy: DUMMY,
}

export function isAttackingMove(move: EnemyMove): boolean {
  return isAttackingEnemyMove(move)
}

export function getNpcCombatEntry(npcId: string): NpcCombatEntry | undefined {
  return NPC_REGISTRY[npcId]
}

export function getAllNpcCombatIds(): string[] {
  return Object.keys(NPC_REGISTRY)
}

/** Picks from the NPC move pool (enemy move ids are data-driven in enemyMoves.ts). */
export function chooseMove(
  npcId: string,
  _turn: number,
  forced?: EnemyMoveId | null,
): EnemyMove {
  if (forced) return forced
  const npc = getNpcCombatEntry(npcId)
  if (!npc || npc.moves.length === 0) return 'STRIKE'
  const idx = Math.floor(Math.random() * npc.moves.length)
  return npc.moves[idx]!
}

export function telegraphFor(_npcId: string, move: EnemyMove): string {
  return telegraphLineForEnemyMove(move)
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
