import type { HometownId } from '../data/hometowns'

let playerHometown: HometownId = 'the_5ive'
const listeners = new Set<() => void>()

export function getPlayerHometown(): HometownId {
  return playerHometown
}

export function setPlayerHometown(id: HometownId): void {
  playerHometown = id
  listeners.forEach((l) => l())
}

export function subscribeHometownStore(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
