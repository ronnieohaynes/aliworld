/** Public shape, must match gym-leaderboard edge function output exactly. */
export type GymLeaderboardEntry = {
  handle: string
  winCount: number
  variantId: string
}

export type GymLeaderboardResponse = {
  trackingSince: string
  entries: GymLeaderboardEntry[]
}

const CACHE_MS = 60_000

let cached: { at: number; data: GymLeaderboardResponse } | null = null

function leaderboardEndpoint(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  if (!base) throw new Error('Missing VITE_SUPABASE_URL')
  return `${base.replace(/\/$/, '')}/functions/v1/gym-leaderboard`
}

/** Public read-only gym wins board. Returns shape-locked entries only. */
export async function fetchGymLeaderboard(options?: {
  force?: boolean
}): Promise<GymLeaderboardResponse> {
  const force = options?.force ?? false
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.data
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY')

  const res = await fetch(leaderboardEndpoint(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  })

  if (!res.ok) {
    let message = `Leaderboard request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const data = (await res.json()) as GymLeaderboardResponse
  if (!Array.isArray(data.entries)) {
    throw new Error('Invalid leaderboard response')
  }

  for (const entry of data.entries) {
    if (
      typeof entry.handle !== 'string' ||
      typeof entry.winCount !== 'number' ||
      typeof entry.variantId !== 'string'
    ) {
      throw new Error('Invalid leaderboard entry shape')
    }
    const keys = Object.keys(entry)
    if (keys.length !== 3 || !keys.includes('handle') || !keys.includes('winCount') || !keys.includes('variantId')) {
      throw new Error('Leaderboard entry leaked unexpected fields')
    }
  }

  cached = { at: Date.now(), data }
  return data
}

export function clearGymLeaderboardCache(): void {
  cached = null
}
