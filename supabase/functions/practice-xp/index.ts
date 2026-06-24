import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import {
  currentPracticeDayKey,
  practiceXpRemainingRoom,
  PRACTICE_COMBAT_XP_DAILY_CAP,
  PRACTICE_COMBAT_XP_DIMINISHED_MULT,
  PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
} from '../_shared/practiceDailyReset.ts'

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function ensureProgressRow(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('aw_progress')
    .select('practice_combat_xp_today, practice_combat_xp_day_key')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { error: insertError } = await supabase.from('aw_progress').insert({ user_id: userId })
  if (insertError) throw insertError

  return { practice_combat_xp_today: 0, practice_combat_xp_day_key: null as string | null }
}

function normalizedXpToday(row: {
  practice_combat_xp_today: number | null
  practice_combat_xp_day_key: string | null
}): number {
  const dayKey = currentPracticeDayKey()
  if (row.practice_combat_xp_day_key !== dayKey) return 0
  return Math.max(0, Math.floor(row.practice_combat_xp_today ?? 0))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const action = typeof body.action === 'string' ? body.action : 'status'

  try {
    const dayKey = currentPracticeDayKey()
    const row = await ensureProgressRow(supabase, user.id)
    const xpToday = normalizedXpToday(row)

    if (action === 'status') {
      return jsonResponse({
        dayKey,
        xpToday,
        dailyCap: PRACTICE_COMBAT_XP_DAILY_CAP,
        diminishedMult: PRACTICE_COMBAT_XP_DIMINISHED_MULT,
        softOverflow: PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
        atCap: xpToday >= PRACTICE_COMBAT_XP_DAILY_CAP + PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
      })
    }

    if (action === 'record_battle') {
      const xpEarned = Number(body.xpEarned)
      if (!Number.isFinite(xpEarned) || xpEarned < 0 || xpEarned > 2000) {
        return jsonResponse({ error: 'Invalid xpEarned' }, 400)
      }

      const room = practiceXpRemainingRoom(xpToday)
      const granted = Math.min(Math.floor(xpEarned), room)
      const xpAfter = xpToday + granted

      const { error: updateError } = await supabase
        .from('aw_progress')
        .update({
          practice_combat_xp_today: xpAfter,
          practice_combat_xp_day_key: dayKey,
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      await supabase.from('aw_events').insert({
        user_id: user.id,
        event_type: 'practice_xp_recorded',
        payload: {
          xpEarned: Math.floor(xpEarned),
          granted,
          xpToday: xpAfter,
          dayKey,
        },
      })

      return jsonResponse({
        dayKey,
        xpEarned: Math.floor(xpEarned),
        granted,
        xpToday: xpAfter,
        dailyCap: PRACTICE_COMBAT_XP_DAILY_CAP,
        diminishedMult: PRACTICE_COMBAT_XP_DIMINISHED_MULT,
        softOverflow: PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
        atCap: xpAfter >= PRACTICE_COMBAT_XP_DAILY_CAP + PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
      })
    }

    return jsonResponse({ error: 'Unknown action' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('practice-xp', message)
    return jsonResponse({ error: 'Practice XP unavailable' }, 500)
  }
})
