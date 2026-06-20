import { StrictMode, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isComingSoonMode } from './config/comingSoon'
import { trackProgressEvent } from './lib/analytics'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#f87171', background: '#0a0a12', minHeight: '100dvh' }}>
          <strong>crash:</strong> {this.state.error.message}
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function AnalyticsBootstrap() {
  const bootedRef = useRef(false)

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    trackProgressEvent('app_open')

    const heartbeatMs = 60_000
    const heartbeatId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      trackProgressEvent('session_heartbeat')
    }, heartbeatMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackProgressEvent('session_heartbeat')
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
    <AppErrorBoundary>
      <Root />
    </AppErrorBoundary>
  </StrictMode>,
)
