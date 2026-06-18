import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'
import {
  PREMIERE_ATTEND_THRESHOLD_SEC,
  findLivePremiereSlot,
  getPremiereById,
} from '../_shared/theaterPremieres.ts'

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function grantIfMissing(
  supabase: SupabaseClient,
  userId: string,
  kind: 'skin' | 'prints',
  value: string,
  label: string,
  note: string,
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
    note,
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

  const action = typeof body.action === 'string' ? body.action : ''
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (action === 'sync') {
    const { data, error } = await supabase
      .from('aw_theater_attendance')
      .select('premiere_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('theater-attendance sync', error)
      return jsonResponse({ error: 'Failed to load attendance' }, 500)
    }

    return jsonResponse({
      attendedPremiereIds: (data ?? []).map((row) => row.premiere_id as string),
    })
  }

  if (action === 'attend') {
    const premiereId = typeof body.premiereId === 'string' ? body.premiereId.trim() : ''
    const watchedSeconds =
      typeof body.watchedSeconds === 'number' &&
      Number.isFinite(body.watchedSeconds) &&
      body.watchedSeconds >= 0
        ? Math.floor(body.watchedSeconds)
        : 0

    const premiere = getPremiereById(premiereId)
    if (!premiere) {
      return jsonResponse({ error: 'Unknown premiere' }, 400)
    }

    if (watchedSeconds < PREMIERE_ATTEND_THRESHOLD_SEC) {
      return jsonResponse({ error: 'Watch threshold not met' }, 400)
    }

    const live = findLivePremiereSlot()
    if (!live || live.premiere.id !== premiereId) {
      return jsonResponse({ error: 'Premiere is not live in this slot' }, 403)
    }

    const { data: existing } = await supabase
      .from('aw_theater_attendance')
      .select('id')
      .eq('user_id', user.id)
      .eq('premiere_id', premiereId)
      .maybeSingle()

    if (existing?.id) {
      return jsonResponse({
        granted: false,
        alreadyAttended: true,
        premiereId,
        rewardXp: premiere.rewardXp,
      })
    }

    const { error: insertError } = await supabase.from('aw_theater_attendance').insert({
      user_id: user.id,
      premiere_id: premiereId,
      slot_started_at: live.startsAt.toISOString(),
      watched_seconds: watchedSeconds,
      loyalty_seal_hook: premiere.loyaltySealHook ?? null,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return jsonResponse({
          granted: false,
          alreadyAttended: true,
          premiereId,
          rewardXp: premiere.rewardXp,
        })
      }
      console.error('theater-attendance insert', insertError)
      return jsonResponse({ error: 'Failed to record attendance' }, 500)
    }

    let skinGranted: string | null = null
    if (premiere.eventSkinVariantId) {
      const skinValue = `theater-skin:${premiere.eventSkinVariantId}`
      const skin = await grantIfMissing(
        supabase,
        user.id,
        'skin',
        skinValue,
        `${premiere.title} · i was there`,
        `theater premiere ${premiereId}`,
      )
      if (skin.inserted) skinGranted = premiere.eventSkinVariantId
    }

    if (premiere.rewardPrints > 0) {
      await grantIfMissing(
        supabase,
        user.id,
        'prints',
        `theater-premiere:${premiereId}`,
        `${premiere.rewardPrints} prints`,
        'theater premiere (dormant until economy ships)',
      )
    }

    return jsonResponse({
      granted: true,
      alreadyAttended: false,
      premiereId,
      rewardXp: premiere.rewardXp,
      skinGranted,
      loyaltySealHook: premiere.loyaltySealHook ?? null,
      printsQueued: premiere.rewardPrints,
    })
  }

  return jsonResponse({ error: 'Unknown action' }, 400)
})
