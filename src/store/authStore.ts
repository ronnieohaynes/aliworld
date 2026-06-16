import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isNetworkAuthError, toFriendlyAuthError } from '../utils/authErrors'
import { getPasswordResetRedirectUrl, isPasswordRecoveryUrl } from '../utils/authRoutes'
import { track } from '../lib/analytics'
import { resetCharacterForSignOut } from './characterStore'
import { refreshPlayerGrants, resetGrantsStore } from './grantsStore'
import { hydrateFromAccount, resetProgression } from './playerStore'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export type AuthProfile = {
  handle: string
}

export type AuthState = {
  session: Session | null
  status: AuthStatus
  profile: AuthProfile | null
  /** User landed from a password-reset email and must set a new password. */
  passwordRecoveryPending: boolean
}

type AuthResult = { error?: string; needsEmailConfirmation?: boolean }

const PLACEHOLDER_HANDLE_RE = /^player_[0-9a-f]{8}$/i

function profileFromHandle(handle: string | null | undefined): AuthProfile | null {
  if (!handle || PLACEHOLDER_HANDLE_RE.test(handle)) return null
  return { handle }
}

let state: AuthState = {
  session: null,
  status: 'loading',
  profile: null,
  passwordRecoveryPending: isPasswordRecoveryUrl(),
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
  return toFriendlyAuthError(error.message)
}

function wrapAuthError(message: string): string {
  return toFriendlyAuthError(message)
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

  setState({ profile: profileFromHandle(data?.handle) })
  void hydrateFromAccount()
  void refreshPlayerGrants()
}

function handleSignedIn(session: Session | null, recoveryPending: boolean): void {
  setState({
    session,
    status: session ? 'signed-in' : 'signed-out',
    profile: session ? state.profile : null,
    passwordRecoveryPending: recoveryPending,
  })
  if (session && !recoveryPending) void loadProfileInternal()
}

function handleSignedOut(): void {
  track('logout')
  setState({
    session: null,
    status: 'signed-out',
    profile: null,
    passwordRecoveryPending: false,
  })
  resetProgression()
  resetCharacterForSignOut()
  resetGrantsStore()
}

supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
  if (event === 'INITIAL_SESSION') {
    const recovery = isPasswordRecoveryUrl() && session != null
    handleSignedIn(session, recovery)
    return
  }

  if (event === 'PASSWORD_RECOVERY') {
    handleSignedIn(session, true)
    return
  }

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    const recovery = isPasswordRecoveryUrl() && session != null
    handleSignedIn(session, recovery)
    if (event === 'SIGNED_IN' && !recovery) {
      track('login_success')
    }
    return
  }

  if (event === 'USER_UPDATED') {
    if (session) {
      setState({ session })
      if (!state.passwordRecoveryPending) void loadProfileInternal()
    }
    return
  }

  if (event === 'SIGNED_OUT') {
    handleSignedOut()
  }
})

export function getAuthState(): AuthState {
  return state
}

export function subscribeAuthStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAuthStore(): AuthState {
  return useSyncExternalStore(subscribeAuthStore, getAuthState, getAuthState)
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: wrapAuthError(error.message) }
    track('signup_success')
    if (!data.session) return { needsEmailConfirmation: true }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: wrapAuthError(message) }
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: wrapAuthError(error.message) }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: wrapAuthError(message) }
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    })
    if (error) return { error: wrapAuthError(error.message) }
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: wrapAuthError(message) }
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: wrapAuthError(error.message) }
    setState({ passwordRecoveryPending: false })
    void loadProfileInternal()
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: wrapAuthError(message) }
  }
}

export function clearPasswordRecoveryPending(): void {
  setState({ passwordRecoveryPending: false })
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[auth] signOut failed:', err instanceof Error ? err.message : String(err))
  }
  handleSignedOut()
}

export async function loadProfile(): Promise<AuthResult> {
  const userId = state.session?.user?.id
  if (!userId) return { error: 'not signed in' }

  try {
    const { data, error } = await supabase
      .from('aw_users')
      .select('handle')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return { error: friendlyDbError(error) }

    setState({ profile: profileFromHandle(data?.handle) })
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: isNetworkAuthError(message) ? wrapAuthError(message) : friendlyDbError({ message }) }
  }
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

  try {
    const { data, error } = await supabase
      .from('aw_users')
      .update({ handle: normalized, email })
      .eq('user_id', userId)
      .select('handle')
      .maybeSingle()

    if (error) return { error: friendlyDbError(error) }
    if (!data?.handle) return { error: 'profile not found, try signing in again.' }

    setState({ profile: { handle: data.handle } })
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: wrapAuthError(message) }
  }
}

export { toFriendlyAuthError } from '../utils/authErrors'
