import { supabase } from './supabaseClient'

export type PlayerMessageGrant = {
  kind: 'badge' | 'skin' | 'prints'
  value: string
  label: string | null
}

export type PlayerMessage = {
  id: string
  body: string
  createdAt: string
  grant: PlayerMessageGrant | null
}

function messagesEndpoint(action: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  if (!base) throw new Error('Missing VITE_SUPABASE_URL')
  return `${base.replace(/\/$/, '')}/functions/v1/player-messages?action=${action}`
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY')

  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  }
}

/** Unseen durable messages queued by mothership (oldest first). */
export async function fetchUnseenPlayerMessages(): Promise<PlayerMessage[]> {
  const headers = await authHeaders()
  const res = await fetch(messagesEndpoint('unseen'), { method: 'GET', headers })

  if (!res.ok) {
    if (res.status === 404) return []
    let message = `Messages request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const data = (await res.json()) as { messages?: PlayerMessage[] }
  return Array.isArray(data.messages) ? data.messages : []
}

export async function markPlayerMessagesSeen(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0

  const headers = await authHeaders()
  const res = await fetch(messagesEndpoint('mark_seen'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  })

  if (!res.ok) {
    let message = `Mark seen failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const data = (await res.json()) as { marked?: number }
  return typeof data.marked === 'number' ? data.marked : 0
}
