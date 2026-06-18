import { useEffect } from 'react'
import './DevModeUI.css'

type ConfirmKind = 'enable' | 'disable'

type ConfirmModalProps = {
  kind: ConfirmKind
  onConfirm: () => void
  onCancel: () => void
}

export function DevModeConfirmModal({ kind, onConfirm, onCancel }: ConfirmModalProps) {
  const label = kind === 'enable' ? 'enable dev mode?' : 'disable dev mode?'
  const primary = kind === 'enable' ? 'enable' : 'disable'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div
      className="dev-mode-confirm"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onCancel}
    >
      <div className="dev-mode-confirm__panel" onClick={(e) => e.stopPropagation()}>
        <p className="dev-mode-confirm__text">{label}</p>
        <div className="dev-mode-confirm__actions">
          <button type="button" className="dev-mode-confirm__btn" onClick={onCancel}>
            cancel
          </button>
          <button
            type="button"
            className="dev-mode-confirm__btn dev-mode-confirm__btn--primary"
            onClick={onConfirm}
          >
            {primary}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DevModeToolbar({ onOpenShop }: { onOpenShop: () => void }) {
  return (
    <div className="dev-mode-toolbar" aria-label="Dev mode controls">
      <span className="dev-mode-toolbar__badge">dev</span>
      <button type="button" className="dev-mode-toolbar__shop" onClick={onOpenShop}>
        open shop
      </button>
    </div>
  )
}

/** @deprecated Use DevModeToolbar */
export function DevModeIndicator() {
  return (
    <div className="dev-mode-indicator" aria-hidden>
      dev
    </div>
  )
}

export function DevModeToast({ message }: { message: string }) {
  return (
    <div className="dev-mode-toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
