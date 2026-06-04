import type { AdminUserRow, AnalyticsSummary } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function hasAnalyticsClientConfig(): boolean {
  return Boolean(supabaseUrl && anonKey)
}

function analyticsEndpoint(query: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/analytics-summary?${query}`
}

async function analyticsRequest<T>(
  adminSecret: string,
  query: string,
  init: RequestInit = {},
): Promise<T> {
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  const res = await fetch(analyticsEndpoint(query), {
    ...init,
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-analytics-admin-secret': adminSecret,
      ...(init.headers ?? {}),
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

  return (await res.json()) as T
}

export async function fetchAnalyticsSummary(
  adminSecret: string,
  days = 30,
): Promise<AnalyticsSummary> {
  return analyticsRequest<AnalyticsSummary>(adminSecret, `days=${days}`)
}

export async function fetchAdminUsers(adminSecret: string): Promise<AdminUserRow[]> {
  return analyticsRequest<AdminUserRow[]>(adminSecret, 'action=users')
}

export async function clearAnalyticsEvents(adminSecret: string): Promise<{ cleared: number }> {
  return analyticsRequest<{ cleared: number }>(adminSecret, 'action=clear_events', {
    method: 'POST',
  })
}

export function downloadUsersCsv(rows: AdminUserRow[]): void {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }

  const header = 'email,handle,level,joined'
  const lines = rows.map((row) => {
    const joined = row.joined.slice(0, 10)
    return [
      escape(row.email),
      escape(row.handle ?? ''),
      String(row.level),
      escape(joined),
    ].join(',')
  })

  const blob = new Blob([[header, ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `aliworld-users-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function formatJoinedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
