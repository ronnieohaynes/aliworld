export type TrackDef = {
  id: string
  title: string
  artist: string
  /** Public URL path, e.g. `/Assets/audio/theme.mp3` */
  file: string
  loop?: boolean
}

/** Danny drops mp3s in `public/Assets/audio/` and lists them here. */
export const TRACKS: TrackDef[] = [
  // PLACEHOLDER — example after adding files:
  // { id: 'theme', title: 'better luck next time', artist: 'danny ali', file: '/Assets/audio/theme.mp3', loop: true },
]

export const CONTEXT_TRACKS: Record<string, string> = {
  // context → track id. resolution: exact → base segment → silence
  // map each city/interior (danny fills track ids after dropping mp3s):
  // 'city:five': 'five-theme',
  // 'city:san-bruno': 'san-bruno-theme',
  // 'city:southside': 'southside-theme',
  // 'city:blue-store-interior': 'blue-store-theme',
  // 'battle': 'battle-theme',
  // 'battle:walker': 'battle-theme',
  // 'battle:jaclyn': 'battle-theme',
  // 'battle:mark': 'mark-battle-theme',
  // 'battle:clerk': 'battle-theme',
  // 'battle:restocker': 'battle-theme',
}

const tracksById = new Map(TRACKS.map((track) => [track.id, track]))

export function getTrackById(id: string): TrackDef | undefined {
  return tracksById.get(id)
}

/** Exact context, then progressively shorter prefixes at `:` boundaries. */
export function resolveTrackIdForContext(context: string): string | null {
  const keysToTry: string[] = [context]
  let rest = context
  while (rest.includes(':')) {
    rest = rest.slice(0, rest.lastIndexOf(':'))
    keysToTry.push(rest)
  }
  for (const key of keysToTry) {
    const trackId = CONTEXT_TRACKS[key]
    if (trackId) return trackId
  }
  return null
}
