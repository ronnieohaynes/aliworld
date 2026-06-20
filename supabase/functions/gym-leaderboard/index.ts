import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'
import { getGymWeekWindow } from '../_shared/gymWeekSchedule.ts'
import {
  isRegisteredMidnightVariantId,
  type MidnightVariantId,
} from '../analytics-summary/variantRegistry.ts'

/** Shape-locked public entry, ONLY these fields may reach the client. */
export type PublicLeaderboardEntry = {
  handle: string
  winCount: number
  variantId: MidnightVariantId
}

export type PublicLeaderboardResponse = {
  trackingSince: string
  trackingUntil: string | null
  weekIndex: number
  weekPhase: 'active' | 'completed'
  deadlineMs: number
  frozen: boolean
  entries: PublicLeaderboardEntry[]
}

const LEADERBOARD_LIMIT = 10
const HANDLE_RE = /^[a-zA-Z0-9_]{3,16}$/

function jsonResponse(body: PublicLeaderboardResponse | { error: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sanitizeVariantId(raw: unknown): MidnightVariantId {
  if (typeof raw === 'string' && isRegisteredMidnightVariantId(raw)) return raw
  return 'default'
}

function toPublicEntry(handle: string, winCount: number, variantId: MidnightVariantId): PublicLeaderboardEntry {
  return { handle, winCount, variantId }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const window = getGymWeekWindow()

    const { data: ranked, error: rankError } = await supabase.rpc('internal_gym_leaderboard_ranked', {
      p_since: window.sinceIso,
      p_until: window.untilIso,
      p_limit: LEADERBOARD_LIMIT,
    })

    if (rankError) {
      console.error('internal_gym_leaderboard_ranked', rankError.message)
      return jsonResponse({ error: 'Leaderboard unavailable' }, 500)
    }

    const rows = ranked ?? []
    if (rows.length === 0) {
      return jsonResponse({
        trackingSince: window.sinceIso,
        trackingUntil: window.untilIso,
        weekIndex: window.weekIndex,
        weekPhase: window.phase,
        deadlineMs: window.deadlineMs,
        frozen: window.frozen,
        entries: [],
      })
    }

    const userIds = rows.map((r: { user_id: string }) => r.user_id)

    const [usersResult, profilesResult] = await Promise.all([
      supabase.from('aw_users').select('user_id, handle').in('user_id', userIds),
      supabase.from('aw_profiles').select('user_id, avatar_config').in('user_id', userIds),
    ])

    if (usersResult.error) {
      console.error('aw_users', usersResult.error.message)
      return jsonResponse({ error: 'Leaderboard unavailable' }, 500)
    }
    if (profilesResult.error) {
      console.error('aw_profiles', profilesResult.error.message)
      return jsonResponse({ error: 'Leaderboard unavailable' }, 500)
    }

    const handleByUserId = new Map<string, string>()
    for (const row of usersResult.data ?? []) {
      if (!row.user_id || typeof row.handle !== 'string') continue
      const handle = row.handle.trim()
      if (!HANDLE_RE.test(handle)) continue
      handleByUserId.set(row.user_id, handle)
    }

    const variantByUserId = new Map<string, MidnightVariantId>()
    for (const row of profilesResult.data ?? []) {
      if (!row.user_id) continue
      const avatarConfig = row.avatar_config as { midnightVariant?: unknown } | null
      variantByUserId.set(row.user_id, sanitizeVariantId(avatarConfig?.midnightVariant))
    }

    const entries: PublicLeaderboardEntry[] = []
    for (const row of rows) {
      const handle = handleByUserId.get(row.user_id)
      if (!handle) continue
      const winCount = Number(row.win_count) || 0
      if (winCount <= 0) continue
      entries.push(
        toPublicEntry(handle, winCount, variantByUserId.get(row.user_id) ?? 'default'),
      )
    }

    return jsonResponse({
      trackingSince: window.sinceIso,
      trackingUntil: window.untilIso,
      weekIndex: window.weekIndex,
      weekPhase: window.phase,
      deadlineMs: window.deadlineMs,
      frozen: window.frozen,
      entries,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    return jsonResponse({ error: 'Leaderboard unavailable' }, 500)
  }
})
