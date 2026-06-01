import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import './StartMenuScreen.css'

export type StartMenuAction =
  | 'resume'
  | 'fanny-pack'
  | 'stats'
  | 'moves'
  | 'new-game'
  | 'sign-out'

const MENU_ITEMS: { id: StartMenuAction; label: string; danger?: boolean }[] = [
  { id: 'resume', label: 'resume' },
  { id: 'fanny-pack', label: 'fanny pack' },
  { id: 'stats', label: 'stats' },
  { id: 'moves', label: 'moves' },
  { id: 'new-game', label: 'new game', danger: true },
  { id: 'sign-out', label: 'sign out' },
]

export type StartMenuHandle = {
  activate: () => void
}

type Props = {
  onAction: (action: StartMenuAction) => void
  onConfirmNewGame: () => void
}

export const StartMenuScreen = forwardRef<StartMenuHandle, Props>(function StartMenuScreen(
  { onAction, onConfirmNewGame },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [confirmingNewGame, setConfirmingNewGame] = useState(false)
  const [confirmChoice, setConfirmChoice] = useState<0 | 1>(1)

  const clampMenuIndex = useCallback((index: number) => {
    const len = MENU_ITEMS.length
    return ((index % len) + len) % len
  }, [])

  const activateMenuItem = useCallback(
    (index: number) => {
      const item = MENU_ITEMS[index]!
      if (item.id === 'new-game') {
        setConfirmingNewGame(true)
        setConfirmChoice(1)
        return
      }
      onAction(item.id)
    },
    [onAction],
  )

  const activate = useCallback(() => {
    if (confirmingNewGame) {
      if (confirmChoice === 0) onConfirmNewGame()
      else setConfirmingNewGame(false)
      return
    }
    activateMenuItem(selectedIndex)
  }, [
    activateMenuItem,
    confirmChoice,
    confirmingNewGame,
    onConfirmNewGame,
    selectedIndex,
  ])

  useImperativeHandle(ref, () => ({ activate }), [activate])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        if (confirmingNewGame) {
          if (e.key === 'Escape') {
            setConfirmingNewGame(false)
            return
          }
          if (confirmChoice === 0) onConfirmNewGame()
          else setConfirmingNewGame(false)
          return
        }
        if (e.key === 'Escape' || MENU_ITEMS[selectedIndex]?.id === 'resume') {
          onAction('resume')
        } else {
          activate()
        }
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (confirmingNewGame) {
          setConfirmChoice(0)
        } else {
          setSelectedIndex((i) => clampMenuIndex(i - 1))
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (confirmingNewGame) {
          setConfirmChoice(1)
        } else {
          setSelectedIndex((i) => clampMenuIndex(i + 1))
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    activate,
    clampMenuIndex,
    confirmChoice,
    confirmingNewGame,
    onAction,
    onConfirmNewGame,
    selectedIndex,
  ])

  if (confirmingNewGame) {
    return (
      <div
        className="start-menu-screen"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm new game"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="start-menu-screen__panel start-menu-screen__confirm">
          <p className="start-menu-screen__confirm-text">
            Start over? This erases your progress.
          </p>
          <div className="start-menu-screen__confirm-actions">
            <button
              type="button"
              className={`start-menu-screen__confirm-btn start-menu-screen__confirm-btn--primary${
                confirmChoice === 0 ? ' start-menu-screen__confirm-btn--selected' : ''
              }`}
              onClick={onConfirmNewGame}
            >
              confirm
            </button>
            <button
              type="button"
              className={`start-menu-screen__confirm-btn${
                confirmChoice === 1 ? ' start-menu-screen__confirm-btn--selected' : ''
              }`}
              onClick={() => setConfirmingNewGame(false)}
            >
              cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="start-menu-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Start menu"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="start-menu-screen__panel">
        <h1 className="start-menu-screen__title">menu</h1>
        <ul className="start-menu-screen__list">
          {MENU_ITEMS.map((item, index) => (
            <li key={item.id} className="start-menu-screen__item">
              <button
                type="button"
                className={`start-menu-screen__btn${
                  index === selectedIndex ? ' start-menu-screen__btn--selected' : ''
                }${item.danger ? ' start-menu-screen__btn--danger' : ''}`}
                onClick={() => activateMenuItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="start-menu-screen__hint">↑↓ navigate · △ select · start esc</p>
      </div>
    </div>
  )
})
