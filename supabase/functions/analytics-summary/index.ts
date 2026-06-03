import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const expectedSecret = Deno.env.get('ANALYTICS_ADMIN_SECRET')
  const providedSecret = req.headers.get('x-analytics-admin-secret')

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const daysRaw = url.searchParams.get('days')
  const days = daysRaw ? Math.min(90, Math.max(7, Number(daysRaw) || 30)) : 30

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('analytics_summary', { p_days: days })

  if (error) {
    const hint = error.message.includes('analytics_summary')
      ? ' Run db/003_analytics_summary_rpc.sql in Supabase SQL Editor.'
      : ''
    return new Response(JSON.stringify({ error: error.message + hint }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const summary = (data ?? EMPTY) as AnalyticsSummary

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
