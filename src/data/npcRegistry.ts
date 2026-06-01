import { publicAsset } from '../utils/publicAsset'
import type { BattleLocationId } from './battleBackgrounds'
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
  losingLine: string
  spriteSrc?: string
  battleLocation: BattleLocationId
}

const WALKER_SPRITE = publicAsset('Assets/Characters/npcs/Walker-idle.png')
const MARK_SPRITE = publicAsset('Assets/Characters/npcs/mark-idle.png')

const WALKER: NpcCombatEntry = {
  id: 'walker',
  displayName: 'walker',
  stats: { hp: 30, maxHp: 30, atk: 6, def: 3, spd: 5 },
  moves: ['STRIKE', 'LOOP', 'SLIP', 'WHISPER'],
  losingLine:
    "You're kinda strong. Maybe Danny does have something to fear after all.",
  spriteSrc: WALKER_SPRITE,
  battleLocation: 'daly_city',
}

/** TEMP: no-stakes grind target — huge HP, no damage. delete after testing. */
const DUMMY: NpcCombatEntry = {
  ...WALKER,
  id: 'dummy',
  displayName: 'Dummy',
  stats: { hp: 40, maxHp: 40, atk: 0, def: 0, spd: 1 },
}

const JACLYN: NpcCombatEntry = {
  ...WALKER,
  id: 'jaclyn',
  displayName: 'jaclyn',
  losingLine: "...oh. you're right. of course you're right.",
}

const NPC_REGISTRY: Record<string, NpcCombatEntry> = {
  walker: WALKER,
  jaclyn: JACLYN,
  mark: { ...WALKER, id: 'mark', displayName: 'mark', spriteSrc: MARK_SPRITE },
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
