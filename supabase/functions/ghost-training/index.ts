import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'
import { ANALYTICS_V2_TRACKING_SINCE } from '../_shared/analyticsConstants.ts'
import {
  currentGhostDayKey,
  ghostLevelBand,
  PASSIVE_XP_DAILY_CAP,
  PASSIVE_XP_PER_GHOST_WIN,
  DAILY_SET_SIZE,
  GHOST_DAILY_XP_BATTLE_CAP,
} from '../_shared/ghostDailyReset.ts'
import {
  buildNameFromSkills,
  computePlayerLevel,
  deriveBuildLoopType,
  dominantCombatSkill,
  normalizeSkills,
  skillsForSeed,
  type EdgeSkillsState,
} from '../_shared/ghostHarvestUtils.ts'
import {
  AUTHORED_CHAMPION,
  AUTHORED_CHAMPION_SEED_ID,
  getSeededById,
  seededInBand,
  type EdgeSeededGhost,
} from '../_shared/seededGhostsData.ts'
import { isRegisteredMidnightVariantId } from '../analytics-summary/variantRegistry.ts'

type GhostSource = 'real' | 'seed' | 'champion'

type OpponentRef = {
  source: GhostSource
  id: string
  combatId: string
  slot: number
}

type PublicGhostSnapshot = {
  source: GhostSource
  id: string
  userId?: string
  handle: string
  displayName: string
  archetype: string
  skills: EdgeSkillsState
  movesEquipped: string[]
  level: number
  buildType: string | null
  leanSkill: string
  buildName: string
  variantId: string
  isFullCharacter?: boolean
  champion?: boolean
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function ghostCombatId(source: GhostSource, id: string): string {
  return `ghost:${source}:${id}`
}

function sanitizeVariant(raw: unknown): string {
  if (typeof raw === 'string' && isRegisteredMidnightVariantId(raw)) return raw
  return 'default'
}

function sanitizeArchetype(raw: unknown): string {
  if (raw === 'lck' || raw === 'atk' || raw === 'def' || raw === 'spd') return raw
  return 'atk'
}

function snapshotFromSeed(def: EdgeSeededGhost, champion = false): PublicGhostSnapshot {
  const skills = skillsForSeed(def.primarySkill, def.level)
  const buildType = deriveBuildLoopType(skills)
  return {
    source: champion ? 'champion' : 'seed',
    id: def.id,
    handle: def.handle,
    displayName: def.displayName,
    archetype: def.archetype,
    skills,
    movesEquipped: ['strike', 'slip', 'whisper', 'hold'],
    level: def.level,
    buildType,
    leanSkill: buildType ?? dominantCombatSkill(skills),
    buildName: buildNameFromSkills(skills),
    variantId: def.variantId,
    isFullCharacter: def.isFullCharacter,
    champion,
  }
}

function snapshotFromGhostRow(row: Record<string, unknown>): PublicGhostSnapshot {
  const skills = normalizeSkills(row.skills)
  const buildType =
    typeof row.build_type === 'string' ? row.build_type : deriveBuildLoopType(skills)
  return {
    source: 'real',
    id: String(row.user_id),
    userId: String(row.user_id),
    handle: String(row.handle),
    displayName: String(row.handle).toLowerCase(),
    archetype: sanitizeArchetype(row.archetype),
    skills,
    movesEquipped: Array.isArray(row.moves_equipped) ? (row.moves_equipped as string[]) : [],
    level: Number(row.level) || computePlayerLevel(skills),
    buildType,
    leanSkill: typeof row.lean_skill === 'string' ? row.lean_skill : dominantCombatSkill(skills),
    buildName: typeof row.build_name === 'string' ? row.build_name : buildNameFromSkills(skills),
    variantId: sanitizeVariant(row.variant_id),
  }
}

async function harvestGhost(supabase: SupabaseClient, userId: string): Promise<void> {
  const [{ data: profile }, { data: userRow }] = await Promise.all([
    supabase.from('aw_profiles').select('moves_equipped, avatar_config').eq('user_id', userId).maybeSingle(),
    supabase.from('aw_users').select('handle').eq('user_id', userId).maybeSingle(),
  ])

  if (!profile || !userRow?.handle) return

  const avatar = (profile.avatar_config ?? {}) as Record<string, unknown>
  const skills = normalizeSkills(avatar.skills)
  const buildType = deriveBuildLoopType(skills)
  const leanSkill = buildType ?? dominantCombatSkill(skills)
  const level = computePlayerLevel(skills)
  const movesEquipped = Array.isArray(profile.moves_equipped)
    ? (profile.moves_equipped as string[])
    : ['strike', 'slip', 'whisper', 'hold']

  await supabase.from('aw_ghosts').upsert({
    user_id: userId,
    handle: userRow.handle,
    archetype: sanitizeArchetype(avatar.archetype),
    skills,
    moves_equipped: movesEquipped,
    level,
    build_type: buildType,
    lean_skill: leanSkill,
    build_name: buildNameFromSkills(skills),
    variant_id: sanitizeVariant(avatar.midnightVariant),
    updated_at: new Date().toISOString(),
  })
}

function pickVariety<T extends { build_type?: string | null; primarySkill?: string }>(
  pool: T[],
  count: number,
): T[] {
  const picked: T[] = []
  const usedTypes = new Set<string>()
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  for (const item of shuffled) {
    if (picked.length >= count) break
    const key = item.build_type ?? item.primarySkill ?? 'unknown'
    if (usedTypes.has(key) && picked.length < count - 1 && shuffled.length > count) continue
    picked.push(item)
    usedTypes.add(key)
  }
  for (const item of shuffled) {
    if (picked.length >= count) break
    if (!picked.includes(item)) picked.push(item)
  }
  return picked.slice(0, count)
}

async function resolveChampionSnapshot(supabase: SupabaseClient): Promise<PublicGhostSnapshot> {
  const { data: ranked } = await supabase.rpc('internal_gym_leaderboard_ranked', {
    p_since: ANALYTICS_V2_TRACKING_SINCE,
    p_limit: 1,
  })

  const top = ranked?.[0] as { user_id?: string; win_count?: number } | undefined
  if (top?.user_id && Number(top.win_count) > 0) {
    const { data: ghost } = await supabase
      .from('aw_ghosts')
      .select('*')
      .eq('user_id', top.user_id)
      .maybeSingle()
    if (ghost) {
      return { ...snapshotFromGhostRow(ghost as Record<string, unknown>), champion: true }
    }
  }
  return snapshotFromSeed(AUTHORED_CHAMPION, true)
}

async function buildDailySet(
  supabase: SupabaseClient,
  userId: string,
  playerLevel: number,
): Promise<{ opponents: OpponentRef[]; usedSeedFallback: boolean }> {
  const band = ghostLevelBand(playerLevel)
  const { data: realRows } = await supabase
    .from('aw_ghosts')
    .select('*')
    .neq('user_id', userId)
    .gte('level', band.min)
    .lte('level', band.max)
    .limit(40)

  const realPool = (realRows ?? []) as Record<string, unknown>[]
  const pickedReal = pickVariety(
    realPool.map((r) => ({ ...r, build_type: r.build_type as string | null })),
    DAILY_SET_SIZE,
  )

  const opponents: OpponentRef[] = []
  let slot = 0
  for (const row of pickedReal) {
    opponents.push({
      source: 'real',
      id: String(row.user_id),
      combatId: ghostCombatId('real', String(row.user_id)),
      slot,
    })
    slot++
  }

  let usedSeedFallback = false
  if (opponents.length < DAILY_SET_SIZE) {
    usedSeedFallback = true
    const seeds = seededInBand(band.min, band.max)
    const needed = DAILY_SET_SIZE - opponents.length
    const usedIds = new Set(opponents.map((o) => o.id))
    const seedPicks = pickVariety(
      seeds.filter((s) => !usedIds.has(s.id)),
      needed,
    )
    for (const seed of seedPicks) {
      opponents.push({
        source: 'seed',
        id: seed.id,
        combatId: ghostCombatId('seed', seed.id),
        slot,
      })
      slot++
    }
  }

  // Last resort: any seeds in adjacent levels
  if (opponents.length < DAILY_SET_SIZE) {
    usedSeedFallback = true
    const usedIds = new Set(opponents.map((o) => o.id))
    const extras = seededInBand(Math.max(1, band.min - 5), band.max + 5).filter((s) => !usedIds.has(s.id))
    for (const seed of extras) {
      if (opponents.length >= DAILY_SET_SIZE) break
      opponents.push({
        source: 'seed',
        id: seed.id,
        combatId: ghostCombatId('seed', seed.id),
        slot,
      })
      slot++
    }
  }

  // Increment your_ghost_served for real ghosts picked
  for (const opp of opponents) {
    if (opp.source !== 'real') continue
    const { data: ownerState } = await supabase
      .from('aw_ghost_training_state')
      .select('your_ghost_served')
      .eq('user_id', opp.id)
      .maybeSingle()
    const served = Number(ownerState?.your_ghost_served ?? 0) + 1
    await supabase
      .from('aw_ghost_training_state')
      .upsert({
        user_id: opp.id,
        your_ghost_served: served,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  }

  return { opponents: opponents.slice(0, DAILY_SET_SIZE), usedSeedFallback }
}

async function loadSnapshots(
  supabase: SupabaseClient,
  opponents: OpponentRef[],
): Promise<PublicGhostSnapshot[]> {
  const out: PublicGhostSnapshot[] = []
  for (const opp of opponents) {
    if (opp.source === 'real') {
      const { data } = await supabase.from('aw_ghosts').select('*').eq('user_id', opp.id).maybeSingle()
      if (data) out.push(snapshotFromGhostRow(data as Record<string, unknown>))
    } else if (opp.source === 'seed') {
      const def = getSeededById(opp.id)
      if (def) out.push(snapshotFromSeed(def))
    }
  }
  return out
}

async function ensureTrainingState(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from('aw_ghost_training_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return data as Record<string, unknown>

  const dayKey = currentGhostDayKey()
  const { data: inserted } = await supabase
    .from('aw_ghost_training_state')
    .insert({ user_id: userId, day_key: dayKey })
    .select('*')
    .maybeSingle()

  return (inserted ?? { user_id: userId, day_key: dayKey }) as Record<string, unknown>
}

async function handleSync(supabase: SupabaseClient, userId: string): Promise<Response> {
  await harvestGhost(supabase, userId)

  const dayKey = currentGhostDayKey()
  let state = await ensureTrainingState(supabase, userId)

  const { data: ownGhost } = await supabase.from('aw_ghosts').select('level').eq('user_id', userId).maybeSingle()
  const playerLevel = Number(ownGhost?.level) || 5

  if (state.day_key !== dayKey || !Array.isArray(state.daily_opponents) || (state.daily_opponents as unknown[]).length === 0) {
    const { opponents, usedSeedFallback } = await buildDailySet(supabase, userId, playerLevel)
    const prevStreak = Number(state.daily_streak ?? 0)
    const resetStreak = state.day_key !== dayKey && Array.isArray(state.daily_completed)
      && (state.daily_completed as unknown[]).length < DAILY_SET_SIZE
      ? 0
      : prevStreak

    const { data: updated } = await supabase
      .from('aw_ghost_training_state')
      .upsert({
        user_id: userId,
        day_key: dayKey,
        daily_opponents: opponents,
        daily_completed: state.day_key === dayKey ? state.daily_completed : [],
        daily_ghost_attempts: state.day_key === dayKey ? state.daily_ghost_attempts : {},
        daily_streak: state.day_key === dayKey ? state.daily_streak : resetStreak,
        used_seed_fallback: usedSeedFallback,
        champion_attempted_day_key: state.day_key === dayKey ? state.champion_attempted_day_key : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle()

    state = (updated ?? state) as Record<string, unknown>
  }

  const opponents = (state.daily_opponents ?? []) as OpponentRef[]
  const snapshots = await loadSnapshots(supabase, opponents)
  const champion = await resolveChampionSnapshot(supabase)

  const newsRaw = state.news_pending as { wins?: number; losses?: number; total?: number } | null
  const news =
    newsRaw && (Number(newsRaw.wins) > 0 || Number(newsRaw.losses) > 0)
      ? {
          wins: Number(newsRaw.wins ?? 0),
          losses: Number(newsRaw.losses ?? 0),
          total: Number(newsRaw.total ?? 0),
        }
      : null

  return jsonResponse({
    dayKey,
    opponents,
    snapshots,
    champion,
    dailyCompleted: state.daily_completed ?? [],
    dailyGhostAttempts:
      state.daily_ghost_attempts && typeof state.daily_ghost_attempts === 'object'
        ? state.daily_ghost_attempts
        : {},
    perGhostDailyCap: GHOST_DAILY_XP_BATTLE_CAP,
    dailyStreak: Number(state.daily_streak ?? 0),
    bestDailyStreak: Number(state.best_daily_streak ?? 0),
    championAttemptedToday: state.champion_attempted_day_key === dayKey,
    championClearedToday: state.champion_cleared_day_key === dayKey,
    usedSeedFallback: state.used_seed_fallback === true,
    explainerSeen: state.explainer_seen === true,
    news,
    stats: {
      ghostsFoughtTotal: Number(state.ghosts_fought_total ?? 0),
      ghostWins: Number(state.ghost_wins ?? 0),
      ghostLosses: Number(state.ghost_losses ?? 0),
      flawlessWins: Number(state.flawless_wins ?? 0),
      championAttempts: Number(state.champion_attempts ?? 0),
      championWins: Number(state.champion_wins ?? 0),
      dailySetsCompleted: Number(state.daily_sets_completed ?? 0),
      yourGhostWins: Number(state.your_ghost_wins ?? 0),
      yourGhostLosses: Number(state.your_ghost_losses ?? 0),
      yourGhostServed: Number(state.your_ghost_served ?? 0),
    },
    passiveXpToday: Number(state.passive_xp_today ?? 0),
    passiveXpCap: PASSIVE_XP_DAILY_CAP,
  })
}

async function grantChampionBadge(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const value = 'ghost-champion'
  const { data: existing } = await supabase
    .from('aw_grants')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'badge')
    .eq('value', value)
    .maybeSingle()
  if (existing?.id) return false

  const { error } = await supabase.from('aw_grants').insert({
    user_id: userId,
    kind: 'badge',
    value,
    label: 'GHOST CHAMPION',
    note: 'ghost training champion',
  })
  return !error
}

async function bumpOwnerNews(
  supabase: SupabaseClient,
  ownerId: string,
  won: boolean,
): Promise<void> {
  const state = await ensureTrainingState(supabase, ownerId)
  const prev = (state.news_pending ?? {}) as { wins?: number; losses?: number; total?: number }
  const news = {
    wins: Number(prev.wins ?? 0) + (won ? 1 : 0),
    losses: Number(prev.losses ?? 0) + (won ? 0 : 1),
    total: Number(prev.total ?? 0) + 1,
  }
  await supabase
    .from('aw_ghost_training_state')
    .upsert({
      user_id: ownerId,
      news_pending: news,
      your_ghost_wins: Number(state.your_ghost_wins ?? 0) + (won ? 1 : 0),
      your_ghost_losses: Number(state.your_ghost_losses ?? 0) + (won ? 0 : 1),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  // Passive XP for ghost owner on wins
  if (won) {
    const dayKey = currentGhostDayKey()
    let passiveToday = Number(state.passive_xp_today ?? 0)
    if (state.passive_xp_day_key !== dayKey) passiveToday = 0
    const grant = Math.min(PASSIVE_XP_PER_GHOST_WIN, PASSIVE_XP_DAILY_CAP - passiveToday)
    if (grant > 0) {
      await supabase
        .from('aw_ghost_training_state')
        .upsert({
          user_id: ownerId,
          passive_xp_day_key: dayKey,
          passive_xp_today: passiveToday + grant,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
    }
  }
}

async function handleRecordMatch(
  supabase: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const combatId = typeof body.combatId === 'string' ? body.combatId.trim() : ''
  const won = body.won === true
  const flawless = body.flawless === true
  const isChampion = body.isChampion === true
  const dailySlot = typeof body.dailySlot === 'number' ? Math.floor(body.dailySlot) : null
  const dayKey = currentGhostDayKey()

  if (!combatId.startsWith('ghost:')) {
    return jsonResponse({ error: 'Invalid combatId' }, 400)
  }

  const rest = combatId.slice('ghost:'.length)
  const colon = rest.indexOf(':')
  if (colon <= 0) return jsonResponse({ error: 'Invalid combatId' }, 400)
  const source = rest.slice(0, colon) as GhostSource
  const opponentId = rest.slice(colon + 1)

  let ghostOwnerId: string | null = source === 'real' ? opponentId : null

  await supabase.from('aw_ghost_matches').insert({
    fighter_user_id: userId,
    opponent_source: isChampion ? 'champion' : source,
    opponent_id: opponentId,
    ghost_owner_user_id: ghostOwnerId,
    won,
    flawless,
    is_champion: isChampion,
    is_daily_set: !isChampion,
    daily_slot: dailySlot,
    day_key: dayKey,
  })

  await supabase.from('aw_events').insert({
    user_id: userId,
    event_type: 'ghost_match',
    metadata: {
      combatId,
      won,
      flawless,
      isChampion,
      dailySlot,
      opponentSource: source,
      opponentId,
      ghostOwnerId,
    },
  })

  const state = await ensureTrainingState(supabase, userId)
  const completed = Array.isArray(state.daily_completed) ? [...(state.daily_completed as number[])] : []
  const dailyGhostAttempts =
    state.daily_ghost_attempts && typeof state.daily_ghost_attempts === 'object'
      ? { ...(state.daily_ghost_attempts as Record<string, number>) }
      : {}

  const updates: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
  let xpEligible = true

  if (isChampion) {
    updates.ghosts_fought_total = Number(state.ghosts_fought_total ?? 0) + 1
    updates.ghost_wins = Number(state.ghost_wins ?? 0) + (won ? 1 : 0)
    updates.ghost_losses = Number(state.ghost_losses ?? 0) + (won ? 0 : 1)
    updates.flawless_wins = Number(state.flawless_wins ?? 0) + (won && flawless ? 1 : 0)
    updates.champion_attempts = Number(state.champion_attempts ?? 0) + 1
    updates.champion_attempted_day_key = dayKey
    await supabase.from('aw_events').insert({
      user_id: userId,
      event_type: 'ghost_champion_attempt',
      metadata: { dayKey, won, combatId, opponentId },
    })
    if (won) {
      updates.champion_wins = Number(state.champion_wins ?? 0) + 1
      updates.champion_cleared_day_key = dayKey
      await supabase.from('aw_events').insert({
        user_id: userId,
        event_type: 'ghost_champion_win',
        metadata: { dayKey, combatId, opponentId, flawless },
      })
    }
  } else {
    const priorAttempts = Math.max(0, Number(dailyGhostAttempts[combatId] ?? 0))
    xpEligible = priorAttempts < GHOST_DAILY_XP_BATTLE_CAP
    if (xpEligible) {
      dailyGhostAttempts[combatId] = priorAttempts + 1
      updates.daily_ghost_attempts = dailyGhostAttempts
      updates.ghosts_fought_total = Number(state.ghosts_fought_total ?? 0) + 1
      updates.ghost_wins = Number(state.ghost_wins ?? 0) + (won ? 1 : 0)
      updates.ghost_losses = Number(state.ghost_losses ?? 0) + (won ? 0 : 1)
      updates.flawless_wins = Number(state.flawless_wins ?? 0) + (won && flawless ? 1 : 0)

      if (dailySlot != null && won && !completed.includes(dailySlot)) {
        completed.push(dailySlot)
        updates.daily_completed = completed
      }
    }
  }

  if (
    !isChampion &&
    xpEligible &&
    completed.length >= DAILY_SET_SIZE &&
    (state.daily_completed as unknown[] | undefined)?.length !== DAILY_SET_SIZE
  ) {
    updates.daily_sets_completed = Number(state.daily_sets_completed ?? 0) + 1
    const streak = Number(state.daily_streak ?? 0) + 1
    updates.daily_streak = streak
    updates.best_daily_streak = Math.max(Number(state.best_daily_streak ?? 0), streak)
    await supabase.from('aw_events').insert({
      user_id: userId,
      event_type: 'ghost_daily_set_complete',
      metadata: { dayKey, completedSlots: completed.length },
    })
  }

  await supabase.from('aw_ghost_training_state').upsert(updates, { onConflict: 'user_id' })

  if (ghostOwnerId && ghostOwnerId !== userId) {
    await bumpOwnerNews(supabase, ghostOwnerId, !won)
  }

  let championBadgeGranted = false
  if (isChampion && won) {
    championBadgeGranted = await grantChampionBadge(supabase, userId)
  }

  // Fighter passive XP on daily wins (tiny, capped)
  let fighterPassiveXp = 0
  if (won && !isChampion && xpEligible) {
    const passiveDay = state.passive_xp_day_key === dayKey ? Number(state.passive_xp_today ?? 0) : 0
    const grant = Math.min(12, PASSIVE_XP_DAILY_CAP - passiveDay)
    if (grant > 0) {
      fighterPassiveXp = grant
      await supabase.from('aw_ghost_training_state').upsert({
        user_id: userId,
        passive_xp_day_key: dayKey,
        passive_xp_today: passiveDay + grant,
      }, { onConflict: 'user_id' })
    }
  }

  return jsonResponse({
    ok: true,
    dailyCompleted: completed,
    dailyGhostAttempts,
    xpEligible,
    championBadgeGranted,
    fighterPassiveXp,
  })
}

async function handleDismissNews(supabase: SupabaseClient, userId: string): Promise<Response> {
  const dayKey = currentGhostDayKey()
  await supabase
    .from('aw_ghost_training_state')
    .upsert({
      user_id: userId,
      news_pending: null,
      news_seen_day_key: dayKey,
    }, { onConflict: 'user_id' })
  return jsonResponse({ ok: true })
}

async function handleMarkExplainer(supabase: SupabaseClient, userId: string): Promise<Response> {
  await supabase
    .from('aw_ghost_training_state')
    .upsert({ user_id: userId, explainer_seen: true }, { onConflict: 'user_id' })
  return jsonResponse({ ok: true })
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const action = typeof body.action === 'string' ? body.action : 'sync'

  try {
    switch (action) {
      case 'sync':
        return await handleSync(supabase, user.id)
      case 'record_match':
        return await handleRecordMatch(supabase, user.id, body)
      case 'dismiss_news':
        return await handleDismissNews(supabase, user.id)
      case 'mark_explainer':
        return await handleMarkExplainer(supabase, user.id)
      default:
        return jsonResponse({ error: 'Unknown action' }, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('ghost-training', message)
    return jsonResponse({ error: 'Ghost training unavailable' }, 500)
  }
})
