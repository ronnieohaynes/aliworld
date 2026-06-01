import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export type AuthProfile = {
  handle: string
}

export type AuthState = {
  session: Session | null
  status: AuthStatus
  profile: AuthProfile | null
}

type AuthResult = { error?: string }

let state: AuthState = {
  session: null,
  status: 'loading',
  profile: null,
}

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function setState(partial: Partial<AuthState>): void {
  state = { ...state, ...partial }
  emit()
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'that handle is taken. pick another.'
  return error.message
}

async function loadProfileInternal(): Promise<void> {
  const userId = state.session?.user?.id
  if (!userId) {
    setState({ profile: null })
    return
  }

  const { data, error } = await supabase
    .from('aw_users')
    .select('handle')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[auth] loadProfile failed:', error.message)
    return
  }

  setState({ profile: data?.handle ? { handle: data.handle } : null })
}

void supabase.auth.getSession().then(({ data: { session } }) => {
  setState({
    session,
    status: session ? 'signed-in' : 'signed-out',
  })
  if (session) void loadProfileInternal()
})

supabase.auth.onAuthStateChange((_event, session) => {
  setState({
    session,
    status: session ? 'signed-in' : 'signed-out',
    profile: session ? state.profile : null,
  })
  if (session) void loadProfileInternal()
  else setState({ profile: null })
})

export function getAuthState(): AuthState {
  return state
}

export function subscribeAuthStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  return {}
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return {}
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function loadProfile(): Promise<AuthResult> {
  const userId = state.session?.user?.id
  if (!userId) return { error: 'not signed in' }

  const { data, error } = await supabase
    .from('aw_users')
    .select('handle')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { error: error.message }

  setState({ profile: data?.handle ? { handle: data.handle } : null })
  return {}
}

/** Sets the player's public handle (updates aw_users; aw_profiles bootstrapped on signup). */
export async function createProfile(handle: string): Promise<AuthResult> {
  const userId = state.session?.user?.id
  const email = state.session?.user?.email
  if (!userId || !email) return { error: 'not signed in' }

  const normalized = handle.trim()
  if (normalized.length < 3 || normalized.length > 16) {
    return { error: 'handle must be 3–16 characters.' }
  }

  // aw_users + aw_profiles rows are created by the handle_new_user trigger on signup;
  // this updates the placeholder handle to the player's chosen one.
  const { data, error } = await supabase
    .from('aw_users')
    .update({ handle: normalized, email })
    .eq('user_id', userId)
    .select('handle')
    .maybeSingle()

  if (error) return { error: friendlyDbError(error) }
  if (!data?.handle) return { error: 'profile not found — try signing in again.' }

  setState({ profile: { handle: data.handle } })
  return {}
}
