import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'
import { isRegisteredMidnightVariantId } from '../_shared/midnightVariantRegistry.ts'

type DayCount = { day: string; count: number }

type AnalyticsSummary = {
  dau: DayCount[]
  signups: DayCount[]
  avgSessionMinutes: number
  questDropoff: { step: string; players: number }[]
  episodeCompletion: { episode: string; players: number }[]
  buildPopularity: { build: string; players: number }[]
  battleStats: { enemy: string; wins: number; losses: number; avgTurns: number | null }[]
  funnelClicks: { destination: string; clicks: number }[]
  theaterOpens: number
}

type AdminUserRow = {
  user_id: string
  email: string
  handle: string | null
  level: number
  joined: string
}

const EMPTY: AnalyticsSummary = {
  dau: [],
  signups: [],
  avgSessionMinutes: 0,
  questDropoff: [],
  episodeCompletion: [],
  buildPopularity: [],
  battleStats: [],
  funnelClicks: [],
  theaterOpens: 0,
}

const SKILL_IDS = ['attack', 'speed', 'defense', 'luck', 'hp'] as const
const MAX_PLAYER_LEVEL = 100
const DEFAULT_EQUIPPED_MOVES = ['STRIKE', 'SLIP', 'HOLD', 'WHISPER'] as const
const DEFAULT_UNLOCKED_MOVES = ['strike', 'slip', 'whisper', 'hold'] as const

type SkillId = (typeof SKILL_IDS)[number]
type SkillProgress = { level: number; xp: number }
type SkillsState = Record<SkillId, SkillProgress>

const POST_ACTIONS = new Set([
  'user_detail',
  'user_delete',
  'user_reset',
  'user_set_handle',
  'user_set_variant',
  'signup_delete',
  'events_clear',
  'clear_events',
  'orphans_sweep',
  'grant_create',
  'grants_list',
  'grant_delete',
])

const GET_ACTIONS = new Set([
  'summary',
  'users',
  'signups',
  'emails_combined',
  'events_recent',
])

function createDefaultSkills(): SkillsState {
  const entry = (): SkillProgress => ({ level: 1, xp: 0 })
  return {
    attack: entry(),
    speed: entry(),
    defense: entry(),
    luck: entry(),
    hp: entry(),
  }
}

function emptyQuest1Serialized() {
  return {
    markDefeated: false,
    talkedGatingNpcs: { npc1: false, npc2: false, npc3: false, npc4: false },
    walkerConverted: false,
    jaclynConverted: false,
    cafeSceneSeen: false,
    e1CutscenePlayed: false,
    battleTutorialSeen: false,
    tutorialPhase2Seen: false,
    worldIntroSeen: false,
  }
}

function emptyQuest2Serialized() {
  return {
    crowdAddressed: false,
    crierConverted: false,
    clerkConverted: false,
    restockerDefeated: false,
    e2Seen: false,
  }
}

function emptyWorldMemory() {
  return { bossesCleared: [] as string[], citiesVisited: [] as string[] }
}

function freshAvatarConfig() {
  return {
    archetype: 'atk',
    skills: createDefaultSkills(),
    quest1: emptyQuest1Serialized(),
    quest2: emptyQuest2Serialized(),
    worldMemory: emptyWorldMemory(),
    artifacts: [] as string[],
  }
}

function sumSkillLevels(skills: SkillsState): number {
  return SKILL_IDS.reduce((sum, id) => sum + skills[id].level, 0)
}

function computePlayerLevel(skills: SkillsState): number {
  const total = sumSkillLevels(skills)
  const level = 1 + Math.floor(((total - 5) * 99) / 320)
  return Math.min(MAX_PLAYER_LEVEL, Math.max(1, level))
}

function parseSkills(raw: unknown): SkillsState {
  const skills = createDefaultSkills()
  if (!raw || typeof raw !== 'object') return skills
  const record = raw as Record<string, unknown>
  for (const id of SKILL_IDS) {
    const entry = record[id]
    if (!entry || typeof entry !== 'object') continue
    const level = Number((entry as SkillProgress).level)
    const xp = Number((entry as SkillProgress).xp)
    if (Number.isFinite(level)) skills[id].level = Math.max(1, Math.floor(level))
    if (Number.isFinite(xp)) skills[id].xp = Math.max(0, Math.floor(xp))
  }
  return skills
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function unauthorized(): Response {
  return jsonResponse({ error: 'Unauthorized' }, 401)
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message }, 400)
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function requireUserId(body: Record<string, unknown>): string | null {
  const userId = body.user_id
  return typeof userId === 'string' && userId.length > 0 ? userId : null
}

function validateHandle(handle: unknown): string | null {
  if (typeof handle !== 'string') return null
  const normalized = handle.trim()
  if (normalized.length < 3 || normalized.length > 16) return null
  return normalized
}

async function fetchAllAuthUsers(supabase: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
    page += 1
  }

  return users
}

async function handleUsersAction(supabase: SupabaseClient): Promise<Response> {
  const [authUsers, awUsersResult, profilesResult] = await Promise.all([
    fetchAllAuthUsers(supabase),
    supabase.from('aw_users').select('user_id, handle, email'),
    supabase.from('aw_profiles').select('user_id, avatar_config'),
  ])

  if (awUsersResult.error) return jsonResponse({ error: awUsersResult.error.message }, 500)
  if (profilesResult.error) return jsonResponse({ error: profilesResult.error.message }, 500)

  const handleByUserId = new Map<string, string>()
  const emailByUserId = new Map<string, string>()
  for (const row of awUsersResult.data ?? []) {
    if (row.user_id) {
      handleByUserId.set(row.user_id, row.handle)
      emailByUserId.set(row.user_id, row.email)
    }
  }

  const skillsByUserId = new Map<string, SkillsState>()
  for (const row of profilesResult.data ?? []) {
    if (!row.user_id) continue
    const avatarConfig = row.avatar_config as { skills?: unknown } | null
    skillsByUserId.set(row.user_id, parseSkills(avatarConfig?.skills))
  }

  const rows: AdminUserRow[] = authUsers.map((user) => {
    const skills = skillsByUserId.get(user.id) ?? createDefaultSkills()
    return {
      user_id: user.id,
      email: user.email ?? emailByUserId.get(user.id) ?? '',
      handle: handleByUserId.get(user.id) ?? null,
      level: computePlayerLevel(skills),
      joined: user.created_at ?? new Date(0).toISOString(),
    }
  })

  rows.sort((a, b) => b.joined.localeCompare(a.joined))
  return jsonResponse(rows)
}

async function handleUserDetailAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = requireUserId(body)
  if (!userId) return badRequest('user_id required')

  const [{ data: authData, error: authError }, awUserResult, profileResult, eventStats] =
    await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('aw_users').select('user_id, handle, email, created_at, last_played_at').eq('user_id', userId).maybeSingle(),
      supabase.from('aw_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('aw_events')
        .select('created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

  if (authError) return jsonResponse({ error: authError.message }, 500)
  if (!authData.user) return jsonResponse({ error: 'User not found' }, 404)
  if (awUserResult.error) return jsonResponse({ error: awUserResult.error.message }, 500)
  if (profileResult.error) return jsonResponse({ error: profileResult.error.message }, 500)
  if (eventStats.error) return jsonResponse({ error: eventStats.error.message }, 500)

  const authUser = authData.user
  const profile = profileResult.data
  const avatarConfig = (profile?.avatar_config ?? {}) as Record<string, unknown>
  const skills = parseSkills(avatarConfig.skills)

  return jsonResponse({
    user_id: userId,
    email: authUser.email ?? awUserResult.data?.email ?? '',
    handle: awUserResult.data?.handle ?? null,
    created: authUser.created_at ?? awUserResult.data?.created_at ?? null,
    last_sign_in: authUser.last_sign_in_at ?? null,
    last_played_at: awUserResult.data?.last_played_at ?? null,
    level: computePlayerLevel(skills),
    skills,
    equipped_moves: profile?.moves_equipped ?? DEFAULT_EQUIPPED_MOVES,
    moves_unlocked: profile?.moves_unlocked ?? DEFAULT_UNLOCKED_MOVES,
    current_episode: profile?.current_episode ?? 1,
    episodes_completed: profile?.episodes_completed ?? [],
    quest1: avatarConfig.quest1 ?? emptyQuest1Serialized(),
    quest2: avatarConfig.quest2 ?? emptyQuest2Serialized(),
    world_memory: avatarConfig.worldMemory ?? emptyWorldMemory(),
    artifacts: avatarConfig.artifacts ?? [],
    midnight_variant:
      typeof avatarConfig.midnightVariant === 'string' ? avatarConfig.midnightVariant : null,
    event_count: eventStats.count ?? 0,
    last_seen: eventStats.data?.[0]?.created_at ?? null,
  })
}

async function handleUserDeleteAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = requireUserId(body)
  if (!userId) return badRequest('user_id required')

  const { count: eventsDeleted, error: eventsError } = await supabase
    .from('aw_events')
    .delete({ count: 'exact' })
    .eq('user_id', userId)

  if (eventsError) return jsonResponse({ error: eventsError.message }, 500)

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
  if (deleteAuthError) return jsonResponse({ error: deleteAuthError.message }, 500)

  const { count: profilesDeleted } = await supabase
    .from('aw_profiles')
    .delete({ count: 'exact' })
    .eq('user_id', userId)

  const { count: usersDeleted } = await supabase
    .from('aw_users')
    .delete({ count: 'exact' })
    .eq('user_id', userId)

  return jsonResponse({
    user_id: userId,
    events_deleted: eventsDeleted ?? 0,
    profiles_deleted: profilesDeleted ?? 0,
    aw_users_deleted: usersDeleted ?? 0,
  })
}

async function handleUserResetAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = requireUserId(body)
  if (!userId) return badRequest('user_id required')

  const { data: existing, error: existingError } = await supabase
    .from('aw_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) return jsonResponse({ error: existingError.message }, 500)
  if (!existing) return jsonResponse({ error: 'Profile not found' }, 404)

  const avatarConfig = freshAvatarConfig()
  const { error } = await supabase.from('aw_profiles').update({
    avatar_config: avatarConfig,
    moves_equipped: [...DEFAULT_EQUIPPED_MOVES],
    moves_unlocked: [...DEFAULT_UNLOCKED_MOVES],
    current_episode: 1,
    episodes_completed: [],
    badges: [],
    accessories_owned: [],
    accessory_loadout: {},
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  if (error) return jsonResponse({ error: error.message }, 500)

  return jsonResponse({ user_id: userId, reset: true })
}

async function handleUserSetHandleAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = requireUserId(body)
  if (!userId) return badRequest('user_id required')
  const handle = validateHandle(body.handle)
  if (!handle) return badRequest('handle must be 3–16 characters')

  const { data, error } = await supabase
    .from('aw_users')
    .update({ handle })
    .eq('user_id', userId)
    .select('handle')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') return badRequest('handle is taken')
    return jsonResponse({ error: error.message }, 500)
  }
  if (!data) return jsonResponse({ error: 'User row not found' }, 404)

  return jsonResponse({ user_id: userId, handle: data.handle })
}

async function handleUserSetVariantAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = requireUserId(body)
  if (!userId) return badRequest('user_id required')

  const variantId = typeof body.variant_id === 'string' ? body.variant_id.trim() : ''
  if (!isRegisteredMidnightVariantId(variantId)) {
    return badRequest('variant_id must be a registered midnight variant')
  }

  const { data: existing, error: existingError } = await supabase
    .from('aw_profiles')
    .select('avatar_config')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) return jsonResponse({ error: existingError.message }, 500)
  if (!existing) return jsonResponse({ error: 'Profile not found' }, 404)

  const avatarConfig = {
    ...((existing.avatar_config ?? {}) as Record<string, unknown>),
    midnightVariant: variantId,
  }

  const { error } = await supabase
    .from('aw_profiles')
    .update({
      avatar_config: avatarConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) return jsonResponse({ error: error.message }, 500)

  return jsonResponse({ user_id: userId, midnight_variant: variantId })
}

async function handleSignupsAction(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase
    .from('aw_email_signups')
    .select('email, created_at')
    .order('created_at', { ascending: false })

  if (error) return jsonResponse({ error: error.message }, 500)
  return jsonResponse(data ?? [])
}

async function handleSignupDeleteAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) return badRequest('email required')

  const { count, error } = await supabase
    .from('aw_email_signups')
    .delete({ count: 'exact' })
    .eq('email', email)

  if (error) return jsonResponse({ error: error.message }, 500)
  return jsonResponse({ email, deleted: count ?? 0 })
}

async function handleEmailsCombinedAction(supabase: SupabaseClient): Promise<Response> {
  const [authUsers, signupsResult] = await Promise.all([
    fetchAllAuthUsers(supabase),
    supabase.from('aw_email_signups').select('email, created_at'),
  ])

  if (signupsResult.error) return jsonResponse({ error: signupsResult.error.message }, 500)

  const rows: { email: string; source: 'account' | 'signup'; created_at: string }[] = []

  for (const user of authUsers) {
    if (!user.email) continue
    rows.push({
      email: user.email.toLowerCase(),
      source: 'account',
      created_at: user.created_at ?? new Date(0).toISOString(),
    })
  }

  for (const row of signupsResult.data ?? []) {
    rows.push({
      email: row.email.toLowerCase(),
      source: 'signup',
      created_at: row.created_at ?? new Date(0).toISOString(),
    })
  }

  rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return jsonResponse(rows)
}

async function handleEventsRecentAction(
  supabase: SupabaseClient,
  limitRaw: string | null,
): Promise<Response> {
  const limit = Math.min(500, Math.max(1, Number(limitRaw) || 100))

  const { data: events, error } = await supabase
    .from('aw_events')
    .select('event_id, event_type, metadata, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return jsonResponse({ error: error.message }, 500)

  const userIds = [...new Set((events ?? []).map((e) => e.user_id).filter(Boolean))] as string[]
  const handleByUserId = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: users } = await supabase.from('aw_users').select('user_id, handle').in('user_id', userIds)
    for (const row of users ?? []) {
      if (row.user_id) handleByUserId.set(row.user_id, row.handle)
    }
  }

  const rows = (events ?? []).map((event) => ({
    id: event.event_id,
    ts: event.created_at,
    type: event.event_type,
    metadata: event.metadata ?? {},
    user_id: event.user_id,
    handle: event.user_id ? handleByUserId.get(event.user_id) ?? null : null,
  }))

  return jsonResponse(rows)
}

async function handleClearEventsAction(supabase: SupabaseClient): Promise<Response> {
  const { count, error: countError } = await supabase
    .from('aw_events')
    .select('*', { count: 'exact', head: true })

  if (countError) return jsonResponse({ error: countError.message }, 500)

  const { error: deleteError } = await supabase
    .from('aw_events')
    .delete()
    .gte('created_at', '1970-01-01T00:00:00Z')

  if (deleteError) return jsonResponse({ error: deleteError.message }, 500)

  return jsonResponse({ cleared: count ?? 0 })
}

async function handleOrphansSweepAction(supabase: SupabaseClient): Promise<Response> {
  const authUsers = await fetchAllAuthUsers(supabase)
  const validIds = new Set(authUsers.map((u) => u.id))

  const [{ data: profileRows }, { data: eventRows }] = await Promise.all([
    supabase.from('aw_profiles').select('user_id'),
    supabase.from('aw_events').select('user_id').not('user_id', 'is', null),
  ])

  const orphanProfileIds = [...new Set(
    (profileRows ?? [])
      .map((r) => r.user_id)
      .filter((id): id is string => typeof id === 'string' && !validIds.has(id)),
  )]

  const orphanEventUserIds = [...new Set(
    (eventRows ?? [])
      .map((r) => r.user_id)
      .filter((id): id is string => typeof id === 'string' && !validIds.has(id)),
  )]

  let profilesDeleted = 0
  let eventsDeleted = 0
  let awUsersDeleted = 0

  if (orphanProfileIds.length > 0) {
    const { count } = await supabase
      .from('aw_profiles')
      .delete({ count: 'exact' })
      .in('user_id', orphanProfileIds)
    profilesDeleted = count ?? 0
  }

  if (orphanEventUserIds.length > 0) {
    const { count } = await supabase
      .from('aw_events')
      .delete({ count: 'exact' })
      .in('user_id', orphanEventUserIds)
    eventsDeleted = count ?? 0
  }

  const { data: awUserRows } = await supabase.from('aw_users').select('user_id')
  const orphanAwIds = (awUserRows ?? [])
    .map((r) => r.user_id)
    .filter((id): id is string => typeof id === 'string' && !validIds.has(id))

  if (orphanAwIds.length > 0) {
    const { count } = await supabase
      .from('aw_users')
      .delete({ count: 'exact' })
      .in('user_id', orphanAwIds)
    awUsersDeleted = count ?? 0
  }

  return jsonResponse({
    profiles_deleted: profilesDeleted,
    events_deleted: eventsDeleted,
    aw_users_deleted: awUsersDeleted,
  })
}

const GRANT_KINDS = new Set(['badge', 'skin', 'prints'])

async function resolveUserIdFromBody(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<string | null> {
  const direct = requireUserId(body)
  if (direct) return direct

  const handle = validateHandle(body.handle)
  if (!handle) return null

  const { data, error } = await supabase
    .from('aw_users')
    .select('user_id')
    .eq('handle', handle)
    .maybeSingle()

  if (error || !data?.user_id) return null
  return data.user_id
}

async function handleGrantsListAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = requireUserId(body)
  if (!userId) return badRequest('user_id required')

  const { data, error } = await supabase
    .from('aw_grants')
    .select('id, user_id, kind, value, label, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return jsonResponse({ error: error.message }, 500)
  return jsonResponse(data ?? [])
}

async function handleGrantCreateAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const userId = await resolveUserIdFromBody(supabase, body)
  if (!userId) return badRequest('user_id or valid handle required')

  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (!GRANT_KINDS.has(kind)) return badRequest('kind must be badge, skin, or prints')

  const value = typeof body.value === 'string' ? body.value.trim() : ''
  if (!value) return badRequest('value required')

  const label = typeof body.label === 'string' ? body.label.trim() || null : null
  const note = typeof body.note === 'string' ? body.note.trim() || null : null

  const { data, error } = await supabase
    .from('aw_grants')
    .insert({ user_id: userId, kind, value, label, note })
    .select('id, user_id, kind, value, label, note, created_at')
    .single()

  if (error) return jsonResponse({ error: error.message }, 500)
  return jsonResponse(data)
}

async function handleGrantDeleteAction(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Response> {
  const id = body.id
  if (typeof id !== 'string' || !id) return badRequest('id required')

  const { error } = await supabase.from('aw_grants').delete().eq('id', id)
  if (error) return jsonResponse({ error: error.message }, 500)
  return jsonResponse({ deleted: true })
}

async function handleSummaryAction(supabase: SupabaseClient, days: number): Promise<Response> {
  const { data, error } = await supabase.rpc('analytics_summary', { p_days: days })

  if (error) {
    const hint = error.message.includes('analytics_summary')
      ? ' Run db/003_analytics_summary_rpc.sql in Supabase SQL Editor.'
      : ''
    return jsonResponse({ error: error.message + hint }, 500)
  }

  return jsonResponse((data ?? EMPTY) as AnalyticsSummary)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const expectedSecret = Deno.env.get('ANALYTICS_ADMIN_SECRET')
  const providedSecret = req.headers.get('x-analytics-admin-secret')

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return unauthorized()
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'summary'

  if (POST_ACTIONS.has(action) && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (GET_ACTIONS.has(action) && req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!POST_ACTIONS.has(action) && !GET_ACTIONS.has(action)) {
    return badRequest(`Unknown action: ${action}`)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = POST_ACTIONS.has(action) ? await readJsonBody(req) : {}

    switch (action) {
      case 'users':
        return await handleUsersAction(supabase)
      case 'user_detail':
        return await handleUserDetailAction(supabase, body)
      case 'user_delete':
        return await handleUserDeleteAction(supabase, body)
      case 'user_reset':
        return await handleUserResetAction(supabase, body)
      case 'user_set_handle':
        return await handleUserSetHandleAction(supabase, body)
      case 'user_set_variant':
        return await handleUserSetVariantAction(supabase, body)
      case 'signups':
        return await handleSignupsAction(supabase)
      case 'signup_delete':
        return await handleSignupDeleteAction(supabase, body)
      case 'emails_combined':
        return await handleEmailsCombinedAction(supabase)
      case 'events_recent':
        return await handleEventsRecentAction(supabase, url.searchParams.get('limit'))
      case 'events_clear':
      case 'clear_events':
        return await handleClearEventsAction(supabase)
      case 'orphans_sweep':
        return await handleOrphansSweepAction(supabase)
      case 'grants_list':
        return await handleGrantsListAction(supabase, body)
      case 'grant_create':
        return await handleGrantCreateAction(supabase, body)
      case 'grant_delete':
        return await handleGrantDeleteAction(supabase, body)
      default: {
        const daysRaw = url.searchParams.get('days')
        const days = daysRaw ? Math.min(90, Math.max(7, Number(daysRaw) || 30)) : 30
        return await handleSummaryAction(supabase, days)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
