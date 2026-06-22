import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders } from '../_shared/cors.ts'

export type PlayerMessageGrant = {
  kind: 'badge' | 'skin' | 'prints'
  value: string
  label: string | null
}

export type PlayerMessageRow = {
  id: string
  body: string
  createdAt: string
  grant: PlayerMessageGrant | null
}

export type UnseenMessagesResponse = {
  messages: PlayerMessageRow[]
}

export type MarkSeenResponse = {
  marked: number
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'unseen'

  try {
    if (action === 'unseen' && req.method === 'GET') {
      const { data: rows, error } = await supabase
        .from('aw_messages')
        .select('id, body, created_at, grant_id')
        .eq('user_id', user.id)
        .is('seen_at', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('aw_messages unseen', error.message)
        return jsonResponse({ error: 'Messages unavailable' }, 500)
      }

      const grantIds = (rows ?? [])
        .map((r) => r.grant_id)
        .filter((id): id is string => typeof id === 'string')

      const grantById = new Map<string, PlayerMessageGrant>()
      if (grantIds.length > 0) {
        const { data: grants } = await supabase
          .from('aw_grants')
          .select('id, kind, value, label')
          .in('id', grantIds)

        for (const g of grants ?? []) {
          if (!g.id || typeof g.kind !== 'string' || typeof g.value !== 'string') continue
          if (g.kind !== 'badge' && g.kind !== 'skin' && g.kind !== 'prints') continue
          grantById.set(g.id, {
            kind: g.kind,
            value: g.value,
            label: typeof g.label === 'string' ? g.label : null,
          })
        }
      }

      const messages: PlayerMessageRow[] = (rows ?? []).map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        grant:
          row.grant_id && grantById.has(row.grant_id)
            ? grantById.get(row.grant_id)!
            : null,
      }))

      return jsonResponse({ messages } satisfies UnseenMessagesResponse)
    }

    if (action === 'mark_seen' && req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const ids = Array.isArray(body.ids)
        ? body.ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : []

      if (ids.length === 0) {
        return jsonResponse({ error: 'ids required' }, 400)
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('aw_messages')
        .update({ seen_at: now })
        .eq('user_id', user.id)
        .in('id', ids)
        .is('seen_at', null)
        .select('id')

      if (error) {
        console.error('aw_messages mark_seen', error.message)
        return jsonResponse({ error: 'Failed to mark seen' }, 500)
      }

      return jsonResponse({ marked: data?.length ?? 0 } satisfies MarkSeenResponse)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    return jsonResponse({ error: 'Request failed' }, 500)
  }
})
