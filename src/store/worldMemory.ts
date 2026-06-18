/**
 * World memory, bosses cleared and cities visited.
 */
import { trackProgressEvent } from '../lib/analytics'

const STORAGE_KEY = 'aliworld:world-memory:v1'

export type WorldMemoryState = {
  bossesCleared: string[]
  citiesVisited: string[]
}

function emptyState(): WorldMemoryState {
  return { bossesCleared: [], citiesVisited: [] }
}

/** Legacy city ids from before the five / the 5ive rename. */
function normalizeCityId(cityId: string): string {
  if (cityId === 'daly-city' || cityId === '5ive') return 'five'
  if (cityId === 'blue-store') return 'southside'
  return cityId
}

function loadWorldMemoryFromStorage(): WorldMemoryState {
  const base = emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<WorldMemoryState>
    return {
      bossesCleared: Array.isArray(o.bossesCleared)
        ? o.bossesCleared.filter((id): id is string => typeof id === 'string')
        : [],
      citiesVisited: Array.isArray(o.citiesVisited)
        ? o.citiesVisited
            .filter((id): id is string => typeof id === 'string')
            .map(normalizeCityId)
        : [],
    }
  } catch {
    return base
  }
}

function saveWorldMemoryToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
}

let state: WorldMemoryState = loadWorldMemoryFromStorage()

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeWorldMemoryStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getWorldMemorySnapshot(): WorldMemoryState {
  return state
}

export function markBossCleared(bossId: string): void {
  if (state.bossesCleared.includes(bossId)) return
  state = { ...state, bossesCleared: [...state.bossesCleared, bossId] }
  saveWorldMemoryToStorage()
  emit()
  trackProgressEvent('world_memory_flag', {
    category: 'bossesCleared',
    value: bossId,
  })
}

export function markCityVisited(cityId: string): void {
  const id = normalizeCityId(cityId)
  if (state.citiesVisited.includes(id)) return
  state = { ...state, citiesVisited: [...state.citiesVisited, id] }
  saveWorldMemoryToStorage()
  emit()
  trackProgressEvent('world_memory_flag', {
    category: 'citiesVisited',
    value: id,
  })
}

export function serialize(): WorldMemoryState {
  return {
    bossesCleared: [...state.bossesCleared],
    citiesVisited: [...state.citiesVisited],
  }
}

export function applyState(data: Partial<WorldMemoryState>): void {
  state = {
    bossesCleared: Array.isArray(data.bossesCleared)
      ? data.bossesCleared.filter((id): id is string => typeof id === 'string')
      : [],
    citiesVisited: Array.isArray(data.citiesVisited)
      ? data.citiesVisited
          .filter((id): id is string => typeof id === 'string')
          .map(normalizeCityId)
      : [],
  }
  emit()
}

export function resetState(): void {
  state = emptyState()
  emit()
}
