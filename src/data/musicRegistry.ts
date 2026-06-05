export type TrackDef = {
  id: string
  title: string
  artist: string
  /** Public URL path, e.g. `/Assets/audio/theme.m4a` */
  file: string
  loop?: boolean
}

/** Danny drops tracks in `public/Assets/audio/` and lists them here. */
export const TRACKS: TrackDef[] = [
  {
    id: 'no-guarantees',
    title: 'NO GUARANTEES',
    artist: 'Danny Ali',
    file: '/Assets/audio/01-no-guarantees.m4a',
    loop: true,
  },
  {
    id: 'made4it',
    title: 'MADE4IT',
    artist: 'Danny Ali',
    file: '/Assets/audio/03-made4it.m4a',
    loop: true,
  },
  {
    id: 'the-let-go',
    title: 'THE LET GO',
    artist: 'Danny Ali',
    file: '/Assets/audio/05-the-let-go.m4a',
    loop: true,
  },
  {
    id: 'spill',
    title: 'SPILL',
    artist: 'Danny Ali',
    file: '/Assets/audio/06-spill.m4a',
    loop: true,
  },
  {
    id: 'vain',
    title: 'VAIN',
    artist: 'Danny Ali',
    file: '/Assets/audio/07-vain.m4a',
    loop: true,
  },
]

export const CONTEXT_TRACKS: Record<string, string> = {
  'city:five': 'no-guarantees',
  /** Hillcrest overworld (CityId is san-bruno in cityConfig). */
  'city:san-bruno': 'the-let-go',
  'city:southside': 'vain',
  gym: 'spill',
  battle: 'made4it',
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
