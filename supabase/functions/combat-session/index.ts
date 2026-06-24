import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { randomCombatSeed } from '../_shared/combatRng.ts'
import {
  normalizeArchetype,
  normalizeEquippedMoves,
  normalizeSkillsSnapshot,
  parseCombatFightRow,
} from '../_shared/combatProfile.ts'
import {
  normalizePlayerMoves,
  parseReplayClaim,
  replayCombatFight,
  replayMatchesClaim,
} from '../_shared/combatReplay.ts'
import { isGymGauntletCombatId } from '../_shared/gymWeeks.ts'

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function logIntegrityReject(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  reason: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await supabase.from('aw_integrity_rejects').insert({
    user_id: userId,
    reason,
    detail,
  })
}

async function loadProfileSnapshot(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('aw_profiles')
    .select('moves_equipped, avatar_config')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  const avatarConfig =
    data?.avatar_config && typeof data.avatar_config === 'object'
      ? (data.avatar_config as Record<string, unknown>)
      : {}

  return {
    skills: normalizeSkillsSnapshot(avatarConfig.skills),
    equippedMoves: normalizeEquippedMoves(data?.moves_equipped),
    archetype: normalizeArchetype(avatarConfig.archetype),
  }
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const action = body.action
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (action === 'start_fight') {
    const npcId = typeof body.npcId === 'string' ? body.npcId.trim() : ''
    if (!npcId) return jsonResponse({ error: 'Missing npcId' }, 400)

    const fightId = crypto.randomUUID()
    const seed = randomCombatSeed()
    const runItBack = body.runItBack === true
    const isolateNpcMemory =
      body.isolateNpcMemory === true ||
      (body.isolateNpcMemory !== false && isGymGauntletCombatId(npcId))

    try {
      const profile = await loadProfileSnapshot(supabase, user.id)
      const { error: insertError } = await supabase.from('aw_combat_fights').insert({
        fight_id: fightId,
        user_id: user.id,
        npc_id: npcId,
        seed,
        skills_snapshot: profile.skills,
        equipped_moves: profile.equippedMoves,
        archetype: profile.archetype,
        isolate_npc_memory: isolateNpcMemory,
        run_it_back: runItBack,
        status: 'pending',
      })
      if (insertError) throw insertError
    } catch (err) {
      console.error('combat-session start_fight', err)
      return jsonResponse({ error: 'Failed to start fight session' }, 500)
    }

    return jsonResponse({
      fightId,
      seed,
      npcId,
    })
  }

  if (action === 'validate_fight') {
    const fightId = typeof body.fightId === 'string' ? body.fightId.trim() : ''
    if (!fightId) return jsonResponse({ error: 'Missing fightId' }, 400)

    const playerMoves = normalizePlayerMoves(body.playerMoves)
    if (!playerMoves) return jsonResponse({ error: 'Invalid playerMoves' }, 400)

    const claim = parseReplayClaim(body.claimed)
    if (!claim) return jsonResponse({ error: 'Invalid claimed result' }, 400)

    const { data: row, error: loadError } = await supabase
      .from('aw_combat_fights')
      .select('*')
      .eq('fight_id', fightId)
      .maybeSingle()

    if (loadError) {
      console.error('combat-session load fight', loadError)
      return jsonResponse({ error: 'Failed to load fight session' }, 500)
    }

    const fight = row ? parseCombatFightRow(row as Record<string, unknown>) : null
    if (!fight || fight.user_id !== user.id) {
      return jsonResponse({ error: 'Unknown fight session' }, 404)
    }

    if (fight.status === 'validated') {
      return jsonResponse({ valid: true, replay: null, alreadyValidated: true })
    }
    if (fight.status === 'rejected') {
      return jsonResponse({ valid: false, reason: 'previously_rejected' })
    }

    let replay
    try {
      replay = await replayCombatFight({
        npcId: fight.npc_id,
        seed: fight.seed,
        skills: fight.skills_snapshot,
        equippedMoves: fight.equipped_moves,
        archetype: fight.archetype,
        playerMoves,
        isolateNpcMemory: fight.isolate_npc_memory,
        runItBack: fight.run_it_back,
      })
    } catch (err) {
      console.error('combat-session replay', err)
      return jsonResponse({ error: 'Replay failed' }, 500)
    }

    const valid = replayMatchesClaim(replay, claim)
    const status = valid ? 'validated' : 'rejected'
    const rejectReason = valid ? null : 'replay_mismatch'

    const { error: updateError } = await supabase
      .from('aw_combat_fights')
      .update({
        status,
        claimed_result: claim,
        replay_result: replay,
        reject_reason: rejectReason,
        validated_at: new Date().toISOString(),
      })
      .eq('fight_id', fightId)
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('combat-session update fight', updateError)
      return jsonResponse({ error: 'Failed to record validation' }, 500)
    }

    if (!valid) {
      await logIntegrityReject(supabase, user.id, 'combat_replay_mismatch', {
        fightId,
        npcId: fight.npc_id,
        seed: fight.seed,
        claim,
        replay,
      })
    }

    return jsonResponse({
      valid,
      reason: valid ? undefined : rejectReason,
      replay,
    })
  }

  return jsonResponse({ error: 'Unknown action' }, 400)
})
