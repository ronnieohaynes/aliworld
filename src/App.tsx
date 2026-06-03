import { useEffect, useState, useSyncExternalStore } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { GameScreen } from './components/GameScreen'
import { HandlePickScreen } from './components/HandlePickScreen'
import { MidnightVariantSelectScreen } from './components/MidnightVariantSelectScreen'
import { PasswordResetScreen } from './components/PasswordResetScreen'
import { TitleCard } from './components/TitleCard'
import { useAuthStore } from './store/authStore'
import {
  clearMidnightVariant,
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from './store/characterStore'
import { clearAuthParamsFromUrl, isPasswordResetPath } from './utils/authRoutes'

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
  const [resetRoute, setResetRoute] = useState(() => isPasswordResetPath())

  useEffect(() => {
    const syncRoute = () => setResetRoute(isPasswordResetPath())
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    if (auth.status !== 'signed-in' || auth.passwordRecoveryPending) return
    if (!window.location.hash && !window.location.search) return
    clearAuthParamsFromUrl()
  }, [auth.passwordRecoveryPending, auth.status])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      clearMidnightVariant()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!started) {
    return <TitleCard onStart={() => setStarted(true)} />
  }

  if (auth.status === 'loading') {
    return <LoadingSplash />
  }

  if (auth.status === 'signed-in' && auth.passwordRecoveryPending) {
    return <PasswordResetScreen />
  }

  if (resetRoute && auth.status === 'signed-out') {
    return (
      <div className="app-loading" aria-live="polite">
        open the reset link from your email to continue.
      </div>
    )
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
