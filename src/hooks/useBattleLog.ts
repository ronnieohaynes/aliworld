import { useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Persists battle turns to Supabase when the user is signed in and tables exist.
 */
export function useBattleLog() {
  const { user } = useAuth()
  const sessionIdRef = useRef<string | null>(null)

  const ensureSession = useCallback(async () => {
    if (!supabase || !user) return null
    if (sessionIdRef.current) return sessionIdRef.current

    const { data, error } = await supabase
      .from('battle_sessions')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (error) {
      console.warn('[ALIWORLD] battle_sessions insert skipped:', error.message)
      return null
    }

    sessionIdRef.current = data.id
    return data.id
  }, [user])

  const logMove = useCallback(
    async (moveId: string, playerHp: number, foeHp: number) => {
      if (!supabase || !user) return
      const sessionId = await ensureSession()
      if (!sessionId) return

      const { error } = await supabase.from('battle_events').insert({
        session_id: sessionId,
        move_id: moveId,
        player_hp: playerHp,
        foe_hp: foeHp,
      })

      if (error) {
        console.warn('[ALIWORLD] battle_events insert skipped:', error.message)
      }
    },
    [user, ensureSession],
  )

  return { logMove }
}
