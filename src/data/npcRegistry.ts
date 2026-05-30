import { publicAsset } from '../utils/publicAsset'
import type { BattleLocationId } from './battleBackgrounds'

export type EnemyMove = 'STRIKE' | 'LOOP' | 'SLIP' | 'WHISPER' | 'HOLD'

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

const MARK_SPRITE = publicAsset('Assets/Characters/npcs/npc3-idle-sheet.png')

const WALKER: NpcCombatEntry = {
  id: 'walker',
  displayName: 'Mark',
  stats: { hp: 30, maxHp: 30, atk: 6, def: 3, spd: 5 },
  moves: ['STRIKE', 'LOOP', 'SLIP', 'WHISPER'],
  losingLine:
    "You're kinda strong. Maybe Danny does have something to fear after all.",
  spriteSrc: MARK_SPRITE,
  battleLocation: 'daly_city',
}

const NPC_REGISTRY: Record<string, NpcCombatEntry> = {
  walker: WALKER,
  mark: { ...WALKER, id: 'mark' },
}

const TELEGRAPH_LINES: Record<EnemyMove, string> = {
  STRIKE: 'winds a strike.',
  LOOP: 'loops the rhythm.',
  SLIP: 'feints a slip.',
  WHISPER: 'murmurs something.',
  HOLD: 'holds ground.',
}

export const ATTACKING_MOVES: ReadonlySet<EnemyMove> = new Set(['STRIKE', 'LOOP', 'SLIP'])

export function isAttackingMove(move: EnemyMove): boolean {
  return ATTACKING_MOVES.has(move)
}

export function getNpcCombatEntry(npcId: string): NpcCombatEntry | undefined {
  return NPC_REGISTRY[npcId]
}

export function getAllNpcCombatIds(): string[] {
  return Object.keys(NPC_REGISTRY)
}

/** Mirrors NPCRegistry.chooseMove — picks from the NPC move pool. */
export function chooseMove(npcId: string, _turn: number): EnemyMove {
  const npc = getNpcCombatEntry(npcId)
  if (!npc || npc.moves.length === 0) return 'STRIKE'
  const idx = Math.floor(Math.random() * npc.moves.length)
  return npc.moves[idx]!
}

/** Mirrors NPCRegistry.telegraphFor — flavor line for a telegraphed move. */
export function telegraphFor(_npcId: string, move: EnemyMove): string {
  return TELEGRAPH_LINES[move] ?? ''
}

export function formatTelegraph(
  displayName: string,
  upcomingMove: EnemyMove | 'STUNNED',
  enemyStunned: boolean,
): string {
  const lower = displayName.toLowerCase()
  if (enemyStunned || upcomingMove === 'STUNNED') {
    return `${lower} is reeling.`
  }
  const line = telegraphFor('', upcomingMove)
  return line ? `${lower}: ${line}` : ''
}
