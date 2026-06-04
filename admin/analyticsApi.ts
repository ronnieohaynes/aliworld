import type {
  AdminUserDetail,
  AdminUserRow,
  AnalyticsSummary,
  CombinedEmailRow,
  EmailSignupRow,
  RecentEventRow,
} from './types'

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
      'Content-Type': 'application/json',
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

function postAction<T>(adminSecret: string, action: string, body: Record<string, unknown>): Promise<T> {
  return analyticsRequest<T>(adminSecret, `action=${action}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
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

export async function fetchUserDetail(
  adminSecret: string,
  userId: string,
): Promise<AdminUserDetail> {
  return postAction<AdminUserDetail>(adminSecret, 'user_detail', { user_id: userId })
}

export async function deleteUser(
  adminSecret: string,
  userId: string,
): Promise<{ events_deleted: number; profiles_deleted: number; aw_users_deleted: number }> {
  return postAction(adminSecret, 'user_delete', { user_id: userId })
}

export async function resetUserProgress(
  adminSecret: string,
  userId: string,
): Promise<{ reset: boolean }> {
  return postAction(adminSecret, 'user_reset', { user_id: userId })
}

export async function setUserHandle(
  adminSecret: string,
  userId: string,
  handle: string,
): Promise<{ handle: string }> {
  return postAction(adminSecret, 'user_set_handle', { user_id: userId, handle })
}

export async function fetchEmailSignups(adminSecret: string): Promise<EmailSignupRow[]> {
  return analyticsRequest<EmailSignupRow[]>(adminSecret, 'action=signups')
}

export async function deleteEmailSignup(
  adminSecret: string,
  email: string,
): Promise<{ deleted: number }> {
  return postAction(adminSecret, 'signup_delete', { email })
}

export async function fetchCombinedEmails(adminSecret: string): Promise<CombinedEmailRow[]> {
  return analyticsRequest<CombinedEmailRow[]>(adminSecret, 'action=emails_combined')
}

export async function fetchRecentEvents(
  adminSecret: string,
  limit = 100,
): Promise<RecentEventRow[]> {
  return analyticsRequest<RecentEventRow[]>(adminSecret, `action=events_recent&limit=${limit}`)
}

export async function clearAnalyticsEvents(adminSecret: string): Promise<{ cleared: number }> {
  return postAction(adminSecret, 'events_clear', {})
}

export async function sweepOrphans(
  adminSecret: string,
): Promise<{ profiles_deleted: number; events_deleted: number; aw_users_deleted: number }> {
  return postAction(adminSecret, 'orphans_sweep', {})
}

export function downloadCsv(filename: string, header: string, rows: string[][]): void {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }

  const lines = rows.map((row) => row.map((cell) => escape(cell)).join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadUsersCsv(rows: AdminUserRow[]): void {
  downloadCsv(
    `aliworld-users-${new Date().toISOString().slice(0, 10)}.csv`,
    'email,handle,level,joined',
    rows.map((row) => [
      row.email,
      row.handle ?? '',
      String(row.level),
      row.joined.slice(0, 10),
    ]),
  )
}

export function downloadCombinedEmailsCsv(rows: CombinedEmailRow[]): void {
  downloadCsv(
    `aliworld-mailing-list-${new Date().toISOString().slice(0, 10)}.csv`,
    'email,source,created_at',
    rows.map((row) => [row.email, row.source, row.created_at.slice(0, 10)]),
  )
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

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
