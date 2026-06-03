import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isComingSoonMode } from './config/comingSoon'
import { track } from './lib/analytics'

function AnalyticsBootstrap() {
  const bootedRef = useRef(false)

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    track('app_open')

    const heartbeatMs = 60_000
    const heartbeatId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      track('session_heartbeat')
    }, heartbeatMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        track('session_heartbeat')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(heartbeatId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <App />
}

function Root() {
  if (isComingSoonMode()) {
    return <App />
  }
  return <AnalyticsBootstrap />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
