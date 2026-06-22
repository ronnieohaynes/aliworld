import { useCallback, useEffect, useState } from 'react'
import { createGrant, deleteGrant, fetchUserGrants, formatDateTime } from './analyticsApi'
import { AdminSkinGrantPicker } from './AdminSkinGrantPicker'
import { skinGrantValueForVariant } from '../src/data/skinGrants'
import { getMidnightVariantSheetEntry, type MidnightVariantId } from '../src/data/midnightVariants'
import type { AdminGrantRow } from './types'

const GRANT_KINDS = ['badge', 'skin', 'prints'] as const
const PRINT_GRANT_PRESETS = ['50', '100', '250', '500', '1000'] as const

type Props = {
  adminSecret: string
  userId: string
  showToast: (message: string) => void
}

export function AdminGrantsSection({ adminSecret, userId, showToast }: Props) {
  const [grants, setGrants] = useState<AdminGrantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<(typeof GRANT_KINDS)[number]>('badge')
  const [skinId, setSkinId] = useState<MidnightVariantId | null>(null)
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchUserGrants(adminSecret, userId)
      setGrants(rows)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load grants')
      setGrants([])
    } finally {
      setLoading(false)
    }
  }, [adminSecret, showToast, userId])

  useEffect(() => {
    void load()
  }, [load])

  const canSubmit =
    kind === 'skin' ? skinId !== null : value.trim().length > 0

  const handleCreate = async () => {
    if (!canSubmit) return
    const resolvedValue =
      kind === 'skin' && skinId ? skinGrantValueForVariant(skinId) : value.trim()
    setSubmitting(true)
    try {
      await createGrant(adminSecret, {
        user_id: userId,
        kind,
        value: resolvedValue,
        label:
          kind === 'skin' && skinId
            ? label.trim() || getMidnightVariantSheetEntry(skinId).displayName
            : label.trim() || undefined,
        note: note.trim() || undefined,
      })
      showToast('grant created.')
      setSkinId(null)
      setValue('')
      setLabel('')
      setNote('')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Grant failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteGrant(adminSecret, id)
      showToast('grant deleted.')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <section className="admin-detail__section">
      <h4>Grants</h4>
      {loading ? <p className="admin-empty">loading grants…</p> : null}
      {!loading && grants.length === 0 ? (
        <p className="admin-empty">no grants yet.</p>
      ) : null}
      {!loading && grants.length > 0 ? (
        <ul className="admin-grants__list">
          {grants.map((grant) => (
            <li key={grant.id} className="admin-grants__row">
              <div>
                <strong>{grant.label ?? grant.value}</strong>
                <span className="admin-grants__meta">
                  {grant.kind} · {grant.value} · {formatDateTime(grant.created_at)}
                </span>
                {grant.note ? <span className="admin-grants__note">{grant.note}</span> : null}
              </div>
              <button
                type="button"
                className="admin-danger__btn admin-grants__delete"
                onClick={() => void handleDelete(grant.id)}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="admin-grants__form">
        <p className="admin-grants__form-title">grant prize</p>
        <div className="admin-grants__fields">
          <label>
            kind
            <select
              className="admin-modal__input"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as (typeof GRANT_KINDS)[number]
                setKind(next)
                if (next !== 'skin') setSkinId(null)
              }}
            >
              {GRANT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          {kind === 'skin' ? (
            <AdminSkinGrantPicker
              selectedId={skinId}
              onSelect={(id) => {
                setSkinId(id)
                if (!label.trim()) {
                  setLabel(getMidnightVariantSheetEntry(id).displayName)
                }
              }}
            />
          ) : kind === 'prints' ? (
            <label>
              prints amount
              <select
                className="admin-modal__input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">select amount</option>
                {PRINT_GRANT_PRESETS.map((amount) => (
                  <option key={amount} value={amount}>
                    {amount} prints
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              badge value
              <input
                className="admin-modal__input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="gym-week-1"
              />
            </label>
          )}
          <label>
            label
            <input
              className="admin-modal__input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="WEEK 1 CHAMPION"
            />
          </label>
          <label>
            note
            <input
              className="admin-modal__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="admin note (optional)"
            />
          </label>
        </div>
        <button
          type="button"
          className="admin-users__export"
          disabled={submitting || !canSubmit}
          onClick={() => void handleCreate()}
        >
          {submitting ? 'granting…' : 'grant prize'}
        </button>
      </div>
    </section>
  )
}
