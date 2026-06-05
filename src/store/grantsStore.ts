import { supabase } from '../lib/supabaseClient'

export type AwGrantKind = 'badge' | 'skin' | 'prints'

export type AwGrant = {
  id: string
  kind: AwGrantKind
  value: string
  label: string | null
  note: string | null
  created_at: string
}

let grants: AwGrant[] = []
let revision = 0
const listeners = new Set<() => void>()

function emit(): void {
  revision++
  for (const listener of listeners) {
    listener()
  }
}

export function getGrantsRevision(): number {
  return revision
}

export function subscribeGrantsStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPlayerGrants(): readonly AwGrant[] {
  return grants
}

export function getBadgeGrantLabels(): string[] {
  return grants
    .filter((g) => g.kind === 'badge')
    .map((g) => (g.label?.trim() || g.value).toUpperCase())
}

export async function refreshPlayerGrants(): Promise<void> {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    grants = []
    emit()
    return
  }

  const { data, error } = await supabase
    .from('aw_grants')
    .select('id, kind, value, label, note, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[grants]', error.message)
    return
  }

  grants = (data ?? []) as AwGrant[]
  emit()
}

export function resetGrantsStore(): void {
  grants = []
  emit()
}
