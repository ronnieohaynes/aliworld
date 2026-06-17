import type { PlayerMoveId } from '../data/moveIds'
import type { EnemyMoveId } from '../data/enemyMoves'

const STORAGE_KEY = 'aliworld:enemy-memory:v1'
const MAX_HISTORY = 40

export type EncounterRecord = {
  playerMoves: PlayerMoveId[]
  enemyMoves: EnemyMoveId[]
  playerWon: boolean
}

export type NpcMemory = {
  encounters: EncounterRecord[]
  totalFights: number
}

type MemoryState = Record<string, NpcMemory>

function load(): MemoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(state: MemoryState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota */ }
}

export function getNpcMemory(npcId: string): NpcMemory {
  const state = load()
  return state[npcId] ?? { encounters: [], totalFights: 0 }
}

export function recordEncounter(
  npcId: string,
  playerMoves: PlayerMoveId[],
  enemyMoves: EnemyMoveId[],
  playerWon: boolean,
): void {
  const state = load()
  const mem = state[npcId] ?? { encounters: [], totalFights: 0 }
  mem.totalFights++
  mem.encounters.push({ playerMoves, enemyMoves, playerWon })
  if (mem.encounters.length > MAX_HISTORY) {
    mem.encounters = mem.encounters.slice(-MAX_HISTORY)
  }
  state[npcId] = mem
  save(state)
}

export function getPlayerMoveFrequencies(npcId: string): Record<string, number> {
  const mem = getNpcMemory(npcId)
  const counts: Record<string, number> = {}
  let total = 0
  for (const enc of mem.encounters) {
    for (const m of enc.playerMoves) {
      counts[m] = (counts[m] ?? 0) + 1
      total++
    }
  }
  if (total === 0) return {}
  const freqs: Record<string, number> = {}
  for (const [k, v] of Object.entries(counts)) {
    freqs[k] = v / total
  }
  return freqs
}
