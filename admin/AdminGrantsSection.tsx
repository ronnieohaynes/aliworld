import { useCallback, useEffect, useState } from 'react'
import { createGrant, deleteGrant, fetchUserGrants, formatDateTime } from './analyticsApi'
import type { AdminGrantRow } from './types'

type Props = {
  adminSecret: string
  userId: string
  showToast: (message: string) => void
}

const GRANT_KINDS = ['badge', 'skin', 'prints'] as const

export function AdminGrantsSection({ adminSecret, userId, showToast }: Props) {
  const [grants, setGrants] = useState<AdminGrantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<(typeof GRANT_KINDS)[number]>('badge')
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

  const handleCreate = async () => {
    if (!value.trim()) return
    setSubmitting(true)
    try {
      await createGrant(adminSecret, {
        user_id: userId,
        kind,
        value: value.trim(),
        label: label.trim() || undefined,
        note: note.trim() || undefined,
      })
      showToast('grant created.')
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
              onChange={(e) => setKind(e.target.value as (typeof GRANT_KINDS)[number])}
            >
              {GRANT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label>
            value
            <input
              className="admin-modal__input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="week1-champion"
            />
          </label>
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
          disabled={submitting || !value.trim()}
          onClick={() => void handleCreate()}
        >
          {submitting ? 'granting…' : 'grant prize'}
        </button>
      </div>
    </section>
  )
}
