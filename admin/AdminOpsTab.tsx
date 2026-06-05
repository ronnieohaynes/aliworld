import { useCallback, useState } from 'react'
import { clearAnalyticsEvents, createGrant, sweepOrphans } from './analyticsApi'

type Props = {
  adminSecret: string
  onEventsCleared: () => void
  showToast: (message: string) => void
}

export function AdminOpsTab({ adminSecret, onEventsCleared, showToast }: Props) {
  const [clearOpen, setClearOpen] = useState(false)
  const [clearText, setClearText] = useState('')
  const [clearing, setClearing] = useState(false)
  const [sweeping, setSweeping] = useState(false)
  const [grantHandle, setGrantHandle] = useState('')
  const [grantKind, setGrantKind] = useState<'badge' | 'skin' | 'prints'>('badge')
  const [grantValue, setGrantValue] = useState('')
  const [grantLabel, setGrantLabel] = useState('')
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting] = useState(false)

  const handleClear = useCallback(async () => {
    if (clearText !== 'CLEAR') return
    setClearing(true)
    try {
      const { cleared } = await clearAnalyticsEvents(adminSecret)
      showToast(`cleared ${cleared.toLocaleString()} analytics events.`)
      setClearOpen(false)
      setClearText('')
      onEventsCleared()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Clear failed')
    } finally {
      setClearing(false)
    }
  }, [adminSecret, clearText, onEventsCleared, showToast])

  const handleSweep = useCallback(async () => {
    setSweeping(true)
    try {
      const result = await sweepOrphans(adminSecret)
      showToast(
        `sweep done · ${result.profiles_deleted} profiles · ${result.events_deleted} events · ${result.aw_users_deleted} aw_users`,
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sweep failed')
    } finally {
      setSweeping(false)
    }
  }, [adminSecret, showToast])

  const handleGrantByHandle = useCallback(async () => {
    const handle = grantHandle.trim()
    if (!handle || !grantValue.trim()) return
    setGranting(true)
    try {
      await createGrant(adminSecret, {
        handle,
        kind: grantKind,
        value: grantValue.trim(),
        label: grantLabel.trim() || undefined,
        note: grantNote.trim() || undefined,
      })
      showToast(`granted ${grantKind} to @${handle}`)
      setGrantHandle('')
      setGrantValue('')
      setGrantLabel('')
      setGrantNote('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Grant failed')
    } finally {
      setGranting(false)
    }
  }, [adminSecret, grantHandle, grantKind, grantLabel, grantNote, grantValue, showToast])

  return (
    <div className="admin-ops">
      <section className="admin-danger">
        <h2 className="admin-danger__title">Danger zone</h2>
        <p className="admin-danger__lede">
          destructive ops on game data — accounts and waitlist emails have their own tabs
        </p>

        <div className="admin-ops__actions">
          <button type="button" className="admin-danger__btn" onClick={() => setClearOpen(true)}>
            clear analytics events
          </button>
          <button type="button" className="admin-danger__btn" onClick={() => void handleSweep()} disabled={sweeping}>
            {sweeping ? 'sweeping…' : 'sweep orphans'}
          </button>
        </div>
      </section>

      <section className="admin-ops__grant">
        <h2 className="admin-danger__title">Grant by handle</h2>
        <p className="admin-danger__lede">shortcut prize grant without opening user detail</p>
        <div className="admin-grants__fields">
          <label>
            handle
            <input
              className="admin-modal__input"
              value={grantHandle}
              onChange={(e) => setGrantHandle(e.target.value)}
              placeholder="player handle"
            />
          </label>
          <label>
            kind
            <select
              className="admin-modal__input"
              value={grantKind}
              onChange={(e) => setGrantKind(e.target.value as 'badge' | 'skin' | 'prints')}
            >
              <option value="badge">badge</option>
              <option value="skin">skin</option>
              <option value="prints">prints</option>
            </select>
          </label>
          <label>
            value
            <input
              className="admin-modal__input"
              value={grantValue}
              onChange={(e) => setGrantValue(e.target.value)}
              placeholder="week1-champion"
            />
          </label>
          <label>
            label
            <input
              className="admin-modal__input"
              value={grantLabel}
              onChange={(e) => setGrantLabel(e.target.value)}
              placeholder="WEEK 1 CHAMPION"
            />
          </label>
          <label>
            note
            <input
              className="admin-modal__input"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
        <button
          type="button"
          className="admin-users__export"
          disabled={granting || !grantHandle.trim() || !grantValue.trim()}
          onClick={() => void handleGrantByHandle()}
        >
          {granting ? 'granting…' : 'grant prize'}
        </button>
      </section>

      <p className="admin-ops__boundary">
        platform ops (schema, auth settings, secrets, function deploys) live in supabase — everything else lives here.
      </p>

      {clearOpen ? (
        <div className="admin-modal" role="dialog" aria-modal="true" onClick={() => !clearing && setClearOpen(false)}>
          <div className="admin-modal__panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal__title">clear analytics events?</h3>
            <p className="admin-modal__text">
              this deletes <strong>ALL</strong> analytics events (<code>aw_events</code>). accounts and emails are{' '}
              <strong>NOT</strong> touched. type <code>CLEAR</code> to confirm.
            </p>
            <input
              type="text"
              className="admin-modal__input"
              value={clearText}
              onChange={(e) => setClearText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Type CLEAR to confirm"
              placeholder="CLEAR"
            />
            <div className="admin-modal__actions">
              <button type="button" className="admin-modal__cancel" onClick={() => setClearOpen(false)} disabled={clearing}>
                cancel
              </button>
              <button
                type="button"
                className="admin-modal__confirm"
                onClick={() => void handleClear()}
                disabled={clearing || clearText !== 'CLEAR'}
              >
                {clearing ? 'clearing…' : 'clear events'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
