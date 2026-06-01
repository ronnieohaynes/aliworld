import { useEffect, useSyncExternalStore } from 'react'
import { GameScreen } from './components/GameScreen'
import { MidnightVariantSelectScreen } from './components/MidnightVariantSelectScreen'
import { supabase } from './lib/supabaseClient'
import {
  clearMidnightVariant,
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from './store/characterStore'

export default function App() {
  const selectedMidnightVariant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )

  useEffect(() => {
    // TEMP connection test — remove when auth UI lands.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('[supabase] session check failed:', error.message)
      else console.log('[supabase] connected. session:', data.session ? 'active' : 'none')
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      clearMidnightVariant()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (selectedMidnightVariant === null) {
    return <MidnightVariantSelectScreen />
  }

  return <GameScreen />
}
