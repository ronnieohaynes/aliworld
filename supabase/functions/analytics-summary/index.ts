import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'

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

type SkillId = (typeof SKILL_IDS)[number]
type SkillProgress = { level: number; xp: number }
type SkillsState = Record<SkillId, SkillProgress>

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

function sumSkillLevels(skills: SkillsState): number {
  return SKILL_IDS.reduce((sum, id) => sum + skills[id].level, 0)
}

/** Same formula as client computePlayerLevel — sum of skill levels → display level. */
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
    if (Number.isFinite(level)) {
      skills[id].level = Math.max(1, Math.floor(level))
    }
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

async function fetchAllAuthUsers(supabase: SupabaseClient) {
  const users: { id: string; email?: string; created_at?: string }[] = []
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

  if (awUsersResult.error) {
    return jsonResponse({ error: awUsersResult.error.message }, 500)
  }
  if (profilesResult.error) {
    return jsonResponse({ error: profilesResult.error.message }, 500)
  }

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
      email: user.email ?? emailByUserId.get(user.id) ?? '',
      handle: handleByUserId.get(user.id) ?? null,
      level: computePlayerLevel(skills),
      joined: user.created_at ?? new Date(0).toISOString(),
    }
  })

  rows.sort((a, b) => b.joined.localeCompare(a.joined))

  return jsonResponse(rows)
}

async function handleClearEventsAction(supabase: SupabaseClient): Promise<Response> {
  const { count, error: countError } = await supabase
    .from('aw_events')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    return jsonResponse({ error: countError.message }, 500)
  }

  const { error: deleteError } = await supabase
    .from('aw_events')
    .delete()
    .gte('created_at', '1970-01-01T00:00:00Z')

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500)
  }

  return jsonResponse({ cleared: count ?? 0 })
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

  if (action === 'clear_events' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (action === 'summary' && req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (action === 'users' && req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    if (action === 'users') {
      return await handleUsersAction(supabase)
    }

    if (action === 'clear_events') {
      return await handleClearEventsAction(supabase)
    }

    const daysRaw = url.searchParams.get('days')
    const days = daysRaw ? Math.min(90, Math.max(7, Number(daysRaw) || 30)) : 30
    return await handleSummaryAction(supabase, days)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
