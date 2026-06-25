import { useEffect } from 'react'
import type { DevQuestJumpId } from '../lib/devQuestJump'
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

type DevModeToolbarProps = {
  onOpenShop: () => void
  onStartTutorial: () => void
  canStartTutorial: () => boolean
  onOpenQuestPicker: () => void
}

export function DevModeToolbar({
  onOpenShop,
  onStartTutorial,
  canStartTutorial,
  onOpenQuestPicker,
}: DevModeToolbarProps) {
  const tutorialReady = canStartTutorial()
  return (
    <div className="dev-mode-toolbar" aria-label="Dev mode controls">
      <span className="dev-mode-toolbar__badge">dev</span>
      <button
        type="button"
        className="dev-mode-toolbar__quest"
        title="Shift+5"
        onClick={onOpenQuestPicker}
      >
        quest · Shift+5
      </button>
      <button
        type="button"
        className="dev-mode-toolbar__tutorial"
        title="Shift+T"
        disabled={!tutorialReady}
        onClick={onStartTutorial}
      >
        tutorial · Shift+T
      </button>
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

type DevModeQuestPickerModalProps = {
  quests: ReadonlyArray<{ id: DevQuestJumpId; label: string }>
  onSelect: (questId: DevQuestJumpId) => void
  onCancel: () => void
}

export function DevModeQuestPickerModal({
  quests,
  onSelect,
  onCancel,
}: DevModeQuestPickerModalProps) {
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
      className="dev-mode-confirm dev-mode-quest-picker"
      role="dialog"
      aria-modal="true"
      aria-label="jump to quest"
      onClick={onCancel}
    >
      <div className="dev-mode-confirm__panel" onClick={(e) => e.stopPropagation()}>
        <p className="dev-mode-confirm__text">jump to quest (from the start)</p>
        <ul className="dev-mode-quest-picker__list">
          {quests.map((quest) => (
            <li key={quest.id}>
              <button
                type="button"
                className="dev-mode-quest-picker__btn"
                onClick={() => onSelect(quest.id)}
              >
                {quest.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="dev-mode-confirm__actions">
          <button type="button" className="dev-mode-confirm__btn" onClick={onCancel}>
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}
