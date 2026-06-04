import { useCallback, useState } from 'react'
import { clearAnalyticsEvents } from './analyticsApi'

type Props = {
  adminSecret: string
  onCleared: () => void
}

export function AdminDangerZone({ adminSecret, onCleared }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const closeModal = useCallback(() => {
    if (clearing) return
    setModalOpen(false)
    setConfirmText('')
    setError(null)
  }, [clearing])

  const handleClear = useCallback(async () => {
    if (confirmText !== 'CLEAR') return
    setClearing(true)
    setError(null)
    try {
      const { cleared } = await clearAnalyticsEvents(adminSecret)
      setModalOpen(false)
      setConfirmText('')
      setToast(`cleared ${cleared.toLocaleString()} analytics events.`)
      window.setTimeout(() => setToast(null), 4000)
      onCleared()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear events')
    } finally {
      setClearing(false)
    }
  }, [adminSecret, confirmText, onCleared])

  return (
    <>
      <section className="admin-danger">
        <h2 className="admin-danger__title">Danger zone</h2>
        <p className="admin-danger__lede">
          destructive ops · accounts and email signups are never touched here
        </p>
        <button
          type="button"
          className="admin-danger__btn"
          onClick={() => {
            setError(null)
            setConfirmText('')
            setModalOpen(true)
          }}
        >
          clear analytics events
        </button>
      </section>

      {toast ? (
        <div className="admin-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-clear-title"
          onClick={closeModal}
        >
          <div className="admin-modal__panel" onClick={(e) => e.stopPropagation()}>
            <h3 id="admin-clear-title" className="admin-modal__title">
              clear analytics events?
            </h3>
            <p className="admin-modal__text">
              this deletes <strong>ALL</strong> analytics events (<code>aw_events</code>).
              accounts and emails are <strong>NOT</strong> touched. type{' '}
              <code>CLEAR</code> to confirm.
            </p>
            <input
              type="text"
              className="admin-modal__input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Type CLEAR to confirm"
              placeholder="CLEAR"
            />
            {error ? <p className="admin-modal__error">{error}</p> : null}
            <div className="admin-modal__actions">
              <button type="button" className="admin-modal__cancel" onClick={closeModal} disabled={clearing}>
                cancel
              </button>
              <button
                type="button"
                className="admin-modal__confirm"
                onClick={() => void handleClear()}
                disabled={clearing || confirmText !== 'CLEAR'}
              >
                {clearing ? 'clearing…' : 'clear events'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
