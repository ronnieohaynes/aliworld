import { useEffect, useState, useSyncExternalStore } from 'react'
import { ScaledDesignStage } from './components/ScaledDesignStage'
import { AuthScreen } from './components/AuthScreen'
import { ComingSoon } from './components/ComingSoon'
import { GameScreen } from './components/GameScreen'
import { HandlePickScreen } from './components/HandlePickScreen'
import { MidnightVariantSelectScreen } from './components/MidnightVariantSelectScreen'
import { PasswordResetScreen } from './components/PasswordResetScreen'
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { TermsOfService } from './components/TermsOfService'
import { TitleCard } from './components/TitleCard'
import { isComingSoonMode } from './config/comingSoon'
import { useAuthStore } from './store/authStore'
import {
  getSelectedMidnightVariant,
  subscribeCharacterStore,
} from './store/characterStore'
import { clearAuthParamsFromUrl, isPasswordResetPath } from './utils/authRoutes'

function LoadingSplash() {
  return (
    <ScaledDesignStage>
      <div className="app-loading app-loading--stage" aria-live="polite" aria-busy="true">
        loading…
      </div>
    </ScaledDesignStage>
  )
}

function isPrivacyPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/privacy' || path.endsWith('/privacy')
}

function isTermsPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/terms' || path.endsWith('/terms')
}

function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return pathname
}

function GameApp() {
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

  if (!started) {
    return (
      <ScaledDesignStage>
        <TitleCard onStart={() => setStarted(true)} />
      </ScaledDesignStage>
    )
  }

  if (auth.status === 'loading') {
    return <LoadingSplash />
  }

  if (auth.status === 'signed-in' && auth.passwordRecoveryPending) {
    return (
      <ScaledDesignStage>
        <PasswordResetScreen />
      </ScaledDesignStage>
    )
  }

  if (resetRoute && auth.status === 'signed-out') {
    return (
      <ScaledDesignStage>
        <div className="app-loading app-loading--stage" aria-live="polite">
          open the reset link from your email to continue.
        </div>
      </ScaledDesignStage>
    )
  }

  if (auth.status === 'signed-out') {
    return (
      <ScaledDesignStage>
        <AuthScreen />
      </ScaledDesignStage>
    )
  }

  if (variant === null) {
    return <MidnightVariantSelectScreen />
  }

  if (!auth.profile) {
    return (
      <ScaledDesignStage>
        <HandlePickScreen />
      </ScaledDesignStage>
    )
  }

  return <GameScreen />
}

export default function App() {
  const pathname = usePathname()

  if (isPrivacyPath(pathname)) {
    return <PrivacyPolicy />
  }

  if (isTermsPath(pathname)) {
    return <TermsOfService />
  }

  if (isComingSoonMode()) {
    return <ComingSoon />
  }

  return <GameApp />
}
