import { supabase } from './supabaseClient'

export type TheaterAttendanceSyncResponse = {
  attendedPremiereIds: string[]
  offline?: boolean
}

export type TheaterAttendResponse = {
  granted: boolean
  alreadyAttended: boolean
  premiereId: string
  rewardXp: number
  skinGranted?: string | null
  loyaltySealHook?: string | null
  printsQueued?: number
  offline?: boolean
}

function endpoint(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  if (!base) throw new Error('Missing VITE_SUPABASE_URL')
  return `${base.replace(/\/$/, '')}/functions/v1/theater-attendance`
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in to earn premiere rewards')
  }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY')
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  }
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(endpoint(), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('fetch')) {
      throw new Error(
        'Theater server unreachable. Deploy theater-attendance and run db/010_theater_attendance.sql.',
      )
    }
    throw err
  }

  if (!res.ok) {
    let message = `Theater request failed (${res.status})`
    try {
      const errBody = (await res.json()) as { error?: string }
      if (errBody.error) message = errBody.error
      if (res.status === 404) {
        message =
          'Theater edge function not deployed. Run: supabase functions deploy theater-attendance'
      }
    } catch {
      if (res.status === 404) {
        message =
          'Theater edge function not deployed. Run: supabase functions deploy theater-attendance'
      }
    }
    throw new Error(message)
  }

  return (await res.json()) as T
}

export async function syncTheaterAttendance(): Promise<TheaterAttendanceSyncResponse> {
  return post({ action: 'sync' })
}

export async function claimTheaterPremiereAttendance(
  premiereId: string,
  watchedSeconds: number,
): Promise<TheaterAttendResponse> {
  return post({ action: 'attend', premiereId, watchedSeconds })
}
