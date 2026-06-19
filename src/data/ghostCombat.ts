import { deriveBuildName, deriveBuildLoopType, type BuildLoopSkill } from './buildName'
import { enemyMovesForBuild } from './ghostArchetypeMoves'
import { leanSkillFromSnapshot } from './ghostMoveAi'
import type { MidnightVariantId } from './midnightVariants'
import type { NpcCombatEntry } from './npcRegistry'
import {
  AUTHORED_CHAMPION,
  AUTHORED_CHAMPION_SEED_ID,
  buildSeedSkills,
  getSeededGhost,
  type SeededGhostDef,
} from './seededGhosts'
import type { ArchetypeId } from '../store/battleStore'
import { computePlayerStats, DEFAULT_ARCHETYPE } from '../store/battleStore'
import { computePlayerLevel, type SkillsState } from '../store/skillStore'
import type { LeanSkill } from './skillCounter'

export type GhostSource = 'real' | 'seed' | 'champion'

/** Serializable ghost snapshot (harvested or seeded). Phase B stores equipped moves; Phase A maps archetype. */
export type GhostSnapshot = {
  source: GhostSource
  id: string
  userId?: string
  handle: string
  displayName: string
  archetype: ArchetypeId
  skills: SkillsState
  movesEquipped: string[]
  level: number
  buildType: BuildLoopSkill | null
  leanSkill: LeanSkill
  buildName: string
  variantId: MidnightVariantId | string
  isFullCharacter?: boolean
  /** Champion fights scale harder. */
  champion?: boolean
}

const GHOST_PREFIX = 'ghost:'

export function ghostCombatId(source: GhostSource, id: string): string {
  return `${GHOST_PREFIX}${source}:${id}`
}

export function isGhostCombatId(npcId: string): boolean {
  return npcId.startsWith(GHOST_PREFIX)
}

export function parseGhostCombatId(npcId: string): { source: GhostSource; id: string } | null {
  if (!isGhostCombatId(npcId)) return null
  const rest = npcId.slice(GHOST_PREFIX.length)
  const colon = rest.indexOf(':')
  if (colon <= 0) return null
  const source = rest.slice(0, colon) as GhostSource
  if (source !== 'real' && source !== 'seed' && source !== 'champion') return null
  return { source, id: rest.slice(colon + 1) }
}

const snapshotCache = new Map<string, GhostSnapshot>()

export function cacheGhostSnapshot(snapshot: GhostSnapshot): void {
  snapshotCache.set(ghostCombatId(snapshot.source, snapshot.id), snapshot)
}

export function getCachedGhostSnapshot(combatId: string): GhostSnapshot | undefined {
  return snapshotCache.get(combatId)
}

export function clearGhostSnapshotCache(): void {
  snapshotCache.clear()
}

export function snapshotFromSeeded(def: SeededGhostDef, champion = false): GhostSnapshot {
  const skills = buildSeedSkills(def)
  const buildType = deriveBuildLoopType(skills)
  return {
    source: champion ? 'champion' : 'seed',
    id: def.id,
    handle: def.handle,
    displayName: def.displayName,
    archetype: def.archetype,
    skills,
    movesEquipped: ['strike', 'slip', 'whisper', 'hold'],
    level: def.level,
    buildType,
    leanSkill: leanSkillFromSnapshot(buildType, skills),
    buildName: deriveBuildName(skills).name,
    variantId: def.variantId,
    isFullCharacter: def.isFullCharacter,
    champion,
  }
}

export function snapshotFromDbRow(row: {
  user_id: string
  handle: string
  archetype: string
  skills: unknown
  moves_equipped: unknown
  level: number
  build_type: string | null
  lean_skill: string
  build_name: string | null
  variant_id: string
}): GhostSnapshot {
  const skills = row.skills as SkillsState
  const buildType = (row.build_type as BuildLoopSkill | null) ?? deriveBuildLoopType(skills)
  const leanRaw = row.lean_skill
  const leanSkill: LeanSkill =
    leanRaw === 'attack' || leanRaw === 'speed' || leanRaw === 'defense' || leanRaw === 'luck'
      ? leanRaw
      : leanSkillFromSnapshot(buildType, skills)
  const archetype = (['lck', 'atk', 'def', 'spd'].includes(row.archetype)
    ? row.archetype
    : DEFAULT_ARCHETYPE) as ArchetypeId

  return {
    source: 'real',
    id: row.user_id,
    userId: row.user_id,
    handle: row.handle,
    displayName: row.handle.toLowerCase(),
    archetype,
    skills,
    movesEquipped: Array.isArray(row.moves_equipped) ? (row.moves_equipped as string[]) : [],
    level: row.level,
    buildType,
    leanSkill,
    buildName: row.build_name ?? deriveBuildName(skills).name,
    variantId: row.variant_id,
  }
}

/** Build a dynamic NpcCombatEntry frozen from snapshot (buildDevSpar pattern). */
export function buildGhostCombatEntry(snapshot: GhostSnapshot): NpcCombatEntry {
  const championMult = snapshot.champion ? { hp: 1.55, atk: 1.35, def: 1.28, spd: 1.2 } : { hp: 1, atk: 1, def: 1, spd: 1 }
  const statsBase = computePlayerStats(snapshot.archetype, [], snapshot.skills)
  const maxHp = Math.max(1, Math.round(statsBase.maxHp * championMult.hp))
  const atk = Math.max(1, Math.round(statsBase.atk * championMult.atk))
  const def = Math.max(1, Math.round(statsBase.def * championMult.def))
  const spd = Math.max(1, Math.round(statsBase.spd * championMult.spd))

  const moves = enemyMovesForBuild(snapshot.buildType)
  const combatId = ghostCombatId(snapshot.source, snapshot.id)

  return {
    id: combatId,
    displayName: snapshot.displayName,
    level: snapshot.level,
    stats: { hp: maxHp, maxHp, atk, def, spd, lck: Math.max(1, Math.round(statsBase.lck * (championMult.atk > 1 ? 1.1 : 1))) },
    moves,
    leanSkill: snapshot.leanSkill,
    losingLine: snapshot.champion ? '...impossible.' : 'good run.',
    winningLine: snapshot.champion ? 'the ceiling holds.' : 'ghost wins.',
    midnightVariantId: snapshot.variantId,
    battleLocation: 'five_gym',
    battleSizeMult: snapshot.champion ? 1.08 : 1,
    ...(snapshot.champion
      ? { guardCounter: { chance: 0.42, damageMult: 2.1 }, enemyGuardPierce: 0.1 }
      : {}),
  }
}

export function resolveGhostCombatEntry(npcId: string): NpcCombatEntry {
  const cached = getCachedGhostSnapshot(npcId)
  if (cached) return buildGhostCombatEntry(cached)

  const parsed = parseGhostCombatId(npcId)
  if (!parsed) throw new Error(`Invalid ghost combat id: ${npcId}`)

  if (parsed.source === 'champion') {
    const snap = snapshotFromSeeded(AUTHORED_CHAMPION, true)
    cacheGhostSnapshot(snap)
    return buildGhostCombatEntry(snap)
  }

  if (parsed.source === 'seed') {
    const def = getSeededGhost(parsed.id)
    if (!def) throw new Error(`Unknown seeded ghost: ${parsed.id}`)
    const snap = snapshotFromSeeded(def)
    cacheGhostSnapshot(snap)
    return buildGhostCombatEntry(snap)
  }

  throw new Error(`Ghost snapshot not loaded: ${npcId}`)
}

export function computeSnapshotLevel(skills: SkillsState): number {
  return computePlayerLevel(skills)
}

export { AUTHORED_CHAMPION_SEED_ID }
