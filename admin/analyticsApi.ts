import type { AnalyticsSummary } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function hasAnalyticsClientConfig(): boolean {
  return Boolean(supabaseUrl && anonKey)
}

export async function fetchAnalyticsSummary(
  adminSecret: string,
  days = 30,
): Promise<AnalyticsSummary> {
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/analytics-summary?days=${days}`

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-analytics-admin-secret': adminSecret,
    },
  })

  if (!res.ok) {
    let message = `Analytics request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return (await res.json()) as AnalyticsSummary
}
