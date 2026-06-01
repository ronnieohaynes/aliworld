import { useState, useSyncExternalStore } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { GameScreen } from './components/GameScreen'
import { HandlePickScreen } from './components/HandlePickScreen'
import { MidnightVariantSelectScreen } from './components/MidnightVariantSelectScreen'
import { TitleCard } from './components/TitleCard'
import { useAuthStore } from './store/authStore'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from './store/characterStore'

function LoadingSplash() {
  return (
    <div className="app-loading" aria-live="polite" aria-busy="true">
      loading…
    </div>
  )
}

export default function App() {
  const auth = useAuthStore()
  const variant = useSyncExternalStore(
    subscribeCharacterStore,
    getSelectedMidnightVariant,
    getSelectedMidnightVariant,
  )
  const [started, setStarted] = useState(false)

  if (!started) {
    return <TitleCard onStart={() => setStarted(true)} />
  }

  if (auth.status === 'loading') {
    return <LoadingSplash />
  }

  if (auth.status === 'signed-out') {
    return <AuthScreen />
  }

  if (!auth.profile) {
    if (variant === null) {
      return <MidnightVariantSelectScreen />
    }
    return <HandlePickScreen />
  }

  return <GameScreen />
}
