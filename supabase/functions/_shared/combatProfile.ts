/** Profile snapshot helpers for combat replay — keep in sync with client playerStore. */

import { DEFAULT_EQUIPPED_MOVES, type PlayerMoveId } from '../../../src/data/moveIds.ts'

export type SkillProgress = { level: number; xp: number }
export type SkillsSnapshot = Record<'attack' | 'speed' | 'defense' | 'luck' | 'hp', SkillProgress>

const SKILL_IDS = ['attack', 'speed', 'defense', 'luck', 'hp'] as const
const ARCHETYPES = new Set(['lck', 'atk', 'def', 'spd'])

/** Minimal move-id allowlist — avoid importing moveDefinitions (heavy graph). */
const VALID_PLAYER_MOVE_IDS = new Set<string>([
  'STRIKE',
  'FURY_SWEEP',
  'CANNON',
  'DARK_BREAK',
  'BLACKOUT',
  'SLIP',
  'PARRY',
  'GRAVITY_SHIFT',
  'REFRACT',
  'HYPERDRIVE',
  'COUNTERWEIGHT',
  'HOLD',
  'ANCHOR',
  'BRICK_WALL',
  'INVINCIBLE',
  'LOOP',
  'SNAG',
  'PHENOMENA',
  'SEALED_FATE',
  'SECOND_WIND',
  'DEVILS_CUT',
  'WHISPER',
])

function clampLevel(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.min(65, Math.max(1, Math.floor(n)))
}

function clampXp(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

export function normalizeSkillsSnapshot(raw: unknown): SkillsSnapshot {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const out = {} as SkillsSnapshot
  for (const id of SKILL_IDS) {
    const block = src[id]
    const obj = block && typeof block === 'object' ? (block as Record<string, unknown>) : {}
    out[id] = { level: clampLevel(obj.level), xp: clampXp(obj.xp) }
  }
  return out
}

function normalizeMoveId(raw: unknown): PlayerMoveId | null {
  if (typeof raw !== 'string') return null
  const upper = raw.toUpperCase() as PlayerMoveId
  return VALID_PLAYER_MOVE_IDS.has(upper) ? upper : null
}

export function normalizeEquippedMoves(raw: unknown): readonly [
  PlayerMoveId,
  PlayerMoveId,
  PlayerMoveId,
  PlayerMoveId,
] {
  const arr = Array.isArray(raw) ? raw : []
  const normalized = arr.map(normalizeMoveId)
  return [
    normalized[0] ?? DEFAULT_EQUIPPED_MOVES[0],
    normalized[1] ?? DEFAULT_EQUIPPED_MOVES[1],
    normalized[2] ?? DEFAULT_EQUIPPED_MOVES[2],
    normalized[3] ?? DEFAULT_EQUIPPED_MOVES[3],
  ]
}

export function normalizeArchetype(raw: unknown): 'lck' | 'atk' | 'def' | 'spd' {
  return typeof raw === 'string' && ARCHETYPES.has(raw) ? (raw as 'lck' | 'atk' | 'def' | 'spd') : 'atk'
}

export type CombatFightRow = {
  fight_id: string
  user_id: string
  npc_id: string
  seed: number
  skills_snapshot: SkillsSnapshot
  equipped_moves: readonly [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  archetype: 'lck' | 'atk' | 'def' | 'spd'
  isolate_npc_memory: boolean
  run_it_back: boolean
  status: 'pending' | 'validated' | 'rejected'
}

export function parseCombatFightRow(row: Record<string, unknown>): CombatFightRow | null {
  const fightId = typeof row.fight_id === 'string' ? row.fight_id : null
  const userId = typeof row.user_id === 'string' ? row.user_id : null
  const npcId = typeof row.npc_id === 'string' ? row.npc_id : null
  const seed = Number(row.seed)
  if (!fightId || !userId || !npcId || !Number.isFinite(seed)) return null

  const status = row.status
  if (status !== 'pending' && status !== 'validated' && status !== 'rejected') return null

  return {
    fight_id: fightId,
    user_id: userId,
    npc_id: npcId,
    seed: seed >>> 0,
    skills_snapshot: normalizeSkillsSnapshot(row.skills_snapshot),
    equipped_moves: normalizeEquippedMoves(row.equipped_moves),
    archetype: normalizeArchetype(row.archetype),
    isolate_npc_memory: row.isolate_npc_memory === true,
    run_it_back: row.run_it_back === true,
    status,
  }
}
