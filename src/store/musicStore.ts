/**
 * Soundtrack UI state for the GameShell music bar (Better Luck Next Time).
 * Unlocks when the player receives the MP3 player from Adam.
 */

type MusicStoreState = {
  /** Album unlocked and transport shows "playing". */
  playing: boolean
}

let state: MusicStoreState = {
  playing: false,
}

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeMusicStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getMusicStoreSnapshot(): MusicStoreState {
  return state
}

export function isSoundtrackPlaying(): boolean {
  return state.playing
}

/** Begin the Better Luck Next Time album on the shell music bar (idempotent). */
export function startSoundtrack(): void {
  if (state.playing) return
  state = { playing: true }
  emit()
}

export function toggleSoundtrackPlaying(): void {
  state = { playing: !state.playing }
  emit()
}

/** Restore playing state after refresh when MP3 is already collected. */
export function resumeSoundtrackIfNeeded(alreadyHasMp3: boolean): void {
  if (!alreadyHasMp3 || state.playing) return
  startSoundtrack()
}

/** Stop soundtrack (New Game reset). */
export function stopSoundtrack(): void {
  if (!state.playing) return
  state = { playing: false }
  emit()
}
