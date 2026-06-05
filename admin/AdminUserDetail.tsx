import { useCallback, useEffect, useState } from 'react'
import {
  deleteUser,
  fetchUserDetail,
  formatDateTime,
  formatJoinedDate,
  resetUserProgress,
  setUserHandle,
  setUserVariant,
} from './analyticsApi'
import { AdminGrantsSection } from './AdminGrantsSection'
import type { AdminUserDetail } from './types'
import { listAllMidnightVariantOptions } from '../src/data/midnightVariants'

type Props = {
  adminSecret: string
  userId: string
  onClose: () => void
  onChanged: () => void
  showToast: (message: string) => void
}

export function AdminUserDetail({ adminSecret, userId, onClose, onChanged, showToast }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [handleDraft, setHandleDraft] = useState('')
  const [savingHandle, setSavingHandle] = useState(false)
  const [variantDraft, setVariantDraft] = useState('')
  const [savingVariant, setSavingVariant] = useState(false)
  const variantOptions = listAllMidnightVariantOptions()
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUserDetail(adminSecret, userId)
      setDetail(data)
      setHandleDraft(data.handle ?? '')
      setVariantDraft(data.midnight_variant ?? 'default')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [adminSecret, userId])

  useEffect(() => {
    void load()
  }, [load])

  const handleSaveHandle = async () => {
    if (!detail) return
    setSavingHandle(true)
    try {
      const { handle } = await setUserHandle(adminSecret, userId, handleDraft)
      showToast(`handle updated → @${handle}`)
      await load()
      onChanged()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Handle update failed')
    } finally {
      setSavingHandle(false)
    }
  }

  const handleSaveVariant = async () => {
    if (!detail || !variantDraft) return
    setSavingVariant(true)
    try {
      const { midnight_variant } = await setUserVariant(adminSecret, userId, variantDraft)
      showToast(`sprite set → ${midnight_variant}`)
      await load()
      onChanged()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Variant update failed')
    } finally {
      setSavingVariant(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetUserProgress(adminSecret, userId)
      showToast('progress reset to fresh start.')
      setResetOpen(false)
      await load()
      onChanged()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async () => {
    if (!detail?.handle || deleteConfirm !== detail.handle) return
    setDeleting(true)
    try {
      const result = await deleteUser(adminSecret, userId)
      showToast(
        `deleted @${detail.handle} · ${result.events_deleted} events · ${result.profiles_deleted} profiles`,
      )
      setDeleteOpen(false)
      onChanged()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="admin-modal__panel admin-modal__panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="admin-detail__header">
          <div>
            <h3 className="admin-detail__title">
              {detail?.handle ? `@${detail.handle}` : 'user detail'}
            </h3>
            <p className="admin-detail__sub">{detail?.email ?? userId}</p>
          </div>
          <button type="button" className="admin-modal__cancel" onClick={onClose}>
            close
          </button>
        </div>

        {loading ? <p className="admin-empty">loading…</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}

        {detail ? (
          <>
            <div className="admin-detail__grid">
              <div className="admin-detail__stat">
                <span className="admin-stat__label">Level</span>
                <span className="admin-detail__value">{detail.level}</span>
              </div>
              <div className="admin-detail__stat">
                <span className="admin-stat__label">Joined</span>
                <span className="admin-detail__value">{formatJoinedDate(detail.created ?? '')}</span>
              </div>
              <div className="admin-detail__stat">
                <span className="admin-stat__label">Last sign-in</span>
                <span className="admin-detail__value">{formatDateTime(detail.last_sign_in)}</span>
              </div>
              <div className="admin-detail__stat">
                <span className="admin-stat__label">Last seen</span>
                <span className="admin-detail__value">{formatDateTime(detail.last_seen)}</span>
              </div>
              <div className="admin-detail__stat">
                <span className="admin-stat__label">Events</span>
                <span className="admin-detail__value">{detail.event_count.toLocaleString()}</span>
              </div>
              <div className="admin-detail__stat">
                <span className="admin-stat__label">Episode</span>
                <span className="admin-detail__value">{detail.current_episode}</span>
              </div>
            </div>

            <section className="admin-detail__section">
              <h4>Skills</h4>
              <pre className="admin-detail__json">{JSON.stringify(detail.skills, null, 2)}</pre>
            </section>

            <section className="admin-detail__section">
              <h4>Equipped moves</h4>
              <pre className="admin-detail__json">{JSON.stringify(detail.equipped_moves, null, 2)}</pre>
            </section>

            <section className="admin-detail__section">
              <h4>Quest / progress</h4>
              <pre className="admin-detail__json">
                {JSON.stringify(
                  {
                    quest1: detail.quest1,
                    quest2: detail.quest2,
                    world_memory: detail.world_memory,
                    artifacts: detail.artifacts,
                    episodes_completed: detail.episodes_completed,
                  },
                  null,
                  2,
                )}
              </pre>
            </section>

            <AdminGrantsSection adminSecret={adminSecret} userId={userId} showToast={showToast} />

            <section className="admin-detail__actions">
              <div className="admin-detail__handle-row">
                <label htmlFor="admin-variant-edit">set sprite / variant</label>
                <select
                  id="admin-variant-edit"
                  className="admin-modal__input"
                  value={variantDraft}
                  onChange={(e) => setVariantDraft(e.target.value)}
                >
                  {variantOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="admin-users__export"
                  onClick={() => void handleSaveVariant()}
                  disabled={savingVariant || !variantDraft}
                >
                  {savingVariant ? 'saving…' : 'save sprite'}
                </button>
              </div>

              <div className="admin-detail__handle-row">
                <label htmlFor="admin-handle-edit">edit handle</label>
                <input
                  id="admin-handle-edit"
                  className="admin-modal__input"
                  value={handleDraft}
                  onChange={(e) => setHandleDraft(e.target.value)}
                  maxLength={16}
                />
                <button
                  type="button"
                  className="admin-users__export"
                  onClick={() => void handleSaveHandle()}
                  disabled={savingHandle || handleDraft.trim().length < 3}
                >
                  {savingHandle ? 'saving…' : 'save handle'}
                </button>
              </div>

              <button type="button" className="admin-detail__btn" onClick={() => setResetOpen(true)}>
                reset progress
              </button>
              <button type="button" className="admin-danger__btn" onClick={() => setDeleteOpen(true)}>
                delete account
              </button>
            </section>
          </>
        ) : null}

        {resetOpen ? (
          <div className="admin-detail__confirm">
            <p>Reset this account to a fresh start? Skills, quest flags, and artifacts will wipe. Email and handle stay.</p>
            <div className="admin-modal__actions">
              <button type="button" className="admin-modal__cancel" onClick={() => setResetOpen(false)} disabled={resetting}>
                cancel
              </button>
              <button type="button" className="admin-modal__confirm" onClick={() => void handleReset()} disabled={resetting}>
                {resetting ? 'resetting…' : 'confirm reset'}
              </button>
            </div>
          </div>
        ) : null}

        {deleteOpen && detail ? (
          <div className="admin-detail__confirm admin-detail__confirm--danger">
            <p>
              Deletes auth user <strong>@{detail.handle ?? 'unknown'}</strong> and all rows. Type the handle to confirm.
            </p>
            <input
              className="admin-modal__input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={detail.handle ?? 'handle'}
              autoComplete="off"
            />
            <div className="admin-modal__actions">
              <button type="button" className="admin-modal__cancel" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                cancel
              </button>
              <button
                type="button"
                className="admin-modal__confirm"
                onClick={() => void handleDelete()}
                disabled={deleting || deleteConfirm !== (detail.handle ?? '')}
              >
                {deleting ? 'deleting…' : 'delete forever'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
