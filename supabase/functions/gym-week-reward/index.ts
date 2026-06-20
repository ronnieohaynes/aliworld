import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'
import { getAbsoluteWeekIndex } from '../_shared/gymWeekSchedule.ts'

/** Must stay in sync with src/data/gymWeeks.ts GYM_WEEKS ids. */
const LIVE_GYM_WEEK_IDS = ['1'] as const

const STREAK_MILESTONES = [
  { streak: 2, badgeValue: 'gym-streak-2', label: '2-WEEK STREAK' },
  { streak: 4, badgeValue: 'gym-streak-4', label: '4-WEEK STREAK' },
  { streak: 8, badgeValue: 'gym-streak-8', label: '8-WEEK STREAK' },
] as const

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function currentLiveWeekId(nowMs = Date.now()): string {
  const abs = getAbsoluteWeekIndex(nowMs)
  return LIVE_GYM_WEEK_IDS[abs % LIVE_GYM_WEEK_IDS.length]!
}

function weekBadgeLabel(weekId: string): string {
  const n = Number.parseInt(weekId, 10)
  return Number.isFinite(n) ? `WEEK ${n} CHAMPION` : `WEEK ${weekId.toUpperCase()} CHAMPION`
}

async function grantIfMissing(
  supabase: SupabaseClient,
  userId: string,
  kind: 'badge',
  value: string,
  label: string,
): Promise<{ inserted: boolean; value: string }> {
  const { data: existing } = await supabase
    .from('aw_grants')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('value', value)
    .maybeSingle()

  if (existing?.id) return { inserted: false, value }

  const { error } = await supabase.from('aw_grants').insert({
    user_id: userId,
    kind,
    value,
    label,
    note: 'weekly gym gauntlet',
  })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { inserted: false, value }
    }
    throw error
  }

  return { inserted: true, value }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user?.id) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const weekId = typeof body.weekId === 'string' ? body.weekId.trim() : ''
  if (!weekId || !LIVE_GYM_WEEK_IDS.includes(weekId as (typeof LIVE_GYM_WEEK_IDS)[number])) {
    return jsonResponse({ error: 'Invalid weekId' }, 400)
  }

  const liveWeekId = currentLiveWeekId()
  if (weekId !== liveWeekId) {
    return jsonResponse({ error: 'Rewards only available for the current live week' }, 403)
  }

  const streak =
    typeof body.streak === 'number' && Number.isFinite(body.streak) && body.streak >= 0
      ? Math.floor(body.streak)
      : 0

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const badgeValue = `gym-week-${weekId}`
    const weekGrant = await grantIfMissing(
      supabase,
      user.id,
      'badge',
      badgeValue,
      weekBadgeLabel(weekId),
    )

    const streakBadges: string[] = []
    for (const milestone of STREAK_MILESTONES) {
      if (streak < milestone.streak) continue
      const result = await grantIfMissing(
        supabase,
        user.id,
        'badge',
        milestone.badgeValue,
        milestone.label,
      )
      if (result.inserted) streakBadges.push(result.value)
    }

    await supabase.from('aw_events').insert({
      user_id: user.id,
      event_type: 'gym_reward_claimed',
      metadata: {
        weekId,
        streak,
        badgeValue,
        weekBadgeGranted: weekGrant.inserted,
        streakBadges,
      },
    })

    return jsonResponse({
      granted: weekGrant.inserted || streakBadges.length > 0,
      badgeValue,
      streakBadges,
      alreadyHad: !weekGrant.inserted,
    })
  } catch (err) {
    console.error('gym-week-reward', err)
    return jsonResponse({ error: 'Failed to grant reward' }, 500)
  }
})
