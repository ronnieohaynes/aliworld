import { useCallback, useState } from 'react'
import { clearAnalyticsEvents, createGrant, queuePlayerMessage, sweepOrphans } from './analyticsApi'
import { AdminSkinGrantPicker } from './AdminSkinGrantPicker'
import { skinGrantValueForVariant } from '../src/data/skinGrants'
import { getMidnightVariantSheetEntry, type MidnightVariantId } from '../src/data/midnightVariants'

const PRINT_GRANT_PRESETS = ['50', '100', '250', '500', '1000'] as const

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
  const [grantSkinId, setGrantSkinId] = useState<MidnightVariantId | null>(null)
  const [grantValue, setGrantValue] = useState('')
  const [grantLabel, setGrantLabel] = useState('')
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting] = useState(false)
  const [messageHandle, setMessageHandle] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageAttachGrant, setMessageAttachGrant] = useState(false)
  const [messageGrantKind, setMessageGrantKind] = useState<'badge' | 'skin' | 'prints'>('skin')
  const [messageGrantSkinId, setMessageGrantSkinId] = useState<MidnightVariantId | null>(null)
  const [messageGrantValue, setMessageGrantValue] = useState('')
  const [messageGrantLabel, setMessageGrantLabel] = useState('')
  const [messageGrantNote, setMessageGrantNote] = useState('')
  const [queuingMessage, setQueuingMessage] = useState(false)

  const handleClear = useCallback(async () => {
    if (clearText !== 'CLEAR') return
    setClearing(true)
    try {
      const { cleared } = await clearAnalyticsEvents(adminSecret)
      showToast(`cleared ${cleared.toLocaleString()} raw analytics events (durable progress kept).`)
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
    const resolvedValue =
      grantKind === 'skin'
        ? grantSkinId
          ? skinGrantValueForVariant(grantSkinId)
          : ''
        : grantValue.trim()
    if (!handle || !resolvedValue) return
    setGranting(true)
    try {
      await createGrant(adminSecret, {
        handle,
        kind: grantKind,
        value: resolvedValue,
        label:
          grantKind === 'skin' && grantSkinId
            ? grantLabel.trim() || getMidnightVariantSheetEntry(grantSkinId).displayName
            : grantLabel.trim() || undefined,
        note: grantNote.trim() || undefined,
      })
      showToast(`granted ${grantKind} to @${handle}`)
      setGrantHandle('')
      setGrantSkinId(null)
      setGrantValue('')
      setGrantLabel('')
      setGrantNote('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Grant failed')
    } finally {
      setGranting(false)
    }
  }, [
    adminSecret,
    grantHandle,
    grantKind,
    grantLabel,
    grantNote,
    grantSkinId,
    grantValue,
    showToast,
  ])

  const handleQueueMessage = useCallback(async () => {
    const handle = messageHandle.trim()
    const body = messageBody.trim()
    if (!handle || !body) return
    if (messageAttachGrant) {
      if (messageGrantKind === 'skin' && !messageGrantSkinId) return
      if (messageGrantKind !== 'skin' && !messageGrantValue.trim()) return
    }

    setQueuingMessage(true)
    try {
      const grantValueResolved =
        messageGrantKind === 'skin' && messageGrantSkinId
          ? skinGrantValueForVariant(messageGrantSkinId)
          : messageGrantValue.trim()

      const row = await queuePlayerMessage(adminSecret, {
        handle,
        body,
        grant: messageAttachGrant
          ? {
              kind: messageGrantKind,
              value: grantValueResolved,
              label:
                messageGrantKind === 'skin' && messageGrantSkinId
                  ? messageGrantLabel.trim() || getMidnightVariantSheetEntry(messageGrantSkinId).displayName
                  : messageGrantLabel.trim() || undefined,
              note: messageGrantNote.trim() || undefined,
            }
          : undefined,
      })
      showToast(
        row.seen_at
          ? `message queued for @${handle} (already seen — unusual)`
          : `message queued for @${handle}`,
      )
      setMessageHandle('')
      setMessageBody('')
      setMessageAttachGrant(false)
      setMessageGrantSkinId(null)
      setMessageGrantValue('')
      setMessageGrantLabel('')
      setMessageGrantNote('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Queue failed')
    } finally {
      setQueuingMessage(false)
    }
  }, [
    adminSecret,
    messageAttachGrant,
    messageBody,
    messageGrantKind,
    messageGrantLabel,
    messageGrantNote,
    messageGrantSkinId,
    messageGrantValue,
    messageHandle,
    showToast,
  ])

  return (
    <div className="admin-ops">
      <section className="admin-danger">
        <h2 className="admin-danger__title">Danger zone</h2>
        <p className="admin-danger__lede">
          destructive ops on game data, accounts and waitlist emails have their own tabs
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
              onChange={(e) => {
                const next = e.target.value as 'badge' | 'skin' | 'prints'
                setGrantKind(next)
                if (next !== 'skin') setGrantSkinId(null)
              }}
            >
              <option value="badge">badge</option>
              <option value="skin">skin</option>
              <option value="prints">prints</option>
            </select>
          </label>
          {grantKind === 'skin' ? (
            <AdminSkinGrantPicker
              selectedId={grantSkinId}
              onSelect={(id) => {
                setGrantSkinId(id)
                if (!grantLabel.trim()) {
                  setGrantLabel(getMidnightVariantSheetEntry(id).displayName)
                }
              }}
            />
          ) : grantKind === 'prints' ? (
            <label>
              prints amount
              <select
                className="admin-modal__input"
                value={grantValue}
                onChange={(e) => setGrantValue(e.target.value)}
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
                value={grantValue}
                onChange={(e) => setGrantValue(e.target.value)}
                placeholder="gym-week-1"
              />
            </label>
          )}
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
          disabled={
            granting ||
            !grantHandle.trim() ||
            (grantKind === 'skin' ? !grantSkinId : !grantValue.trim())
          }
          onClick={() => void handleGrantByHandle()}
        >
          {granting ? 'granting…' : 'grant prize'}
        </button>
      </section>

      <section className="admin-ops__grant">
        <h2 className="admin-danger__title">Queue player message</h2>
        <p className="admin-danger__lede">
          durable in-game note — surfaces on the player&apos;s next login. optional grant attaches through{' '}
          <code>aw_grants</code> (silent grants still use grant-by-handle above).
        </p>
        <div className="admin-grants__fields">
          <label>
            handle
            <input
              className="admin-modal__input"
              value={messageHandle}
              onChange={(e) => setMessageHandle(e.target.value)}
              placeholder="player handle"
            />
          </label>
          <label>
            message
            <textarea
              className="admin-modal__input admin-ops__textarea"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="you won week 3 — champion skin unlocked."
              rows={4}
            />
          </label>
          <label className="admin-ops__checkbox">
            <input
              type="checkbox"
              checked={messageAttachGrant}
              onChange={(e) => setMessageAttachGrant(e.target.checked)}
            />
            attach grant
          </label>
          {messageAttachGrant ? (
            <>
              <label>
                grant kind
                <select
                  className="admin-modal__input"
                  value={messageGrantKind}
                  onChange={(e) => {
                    const next = e.target.value as 'badge' | 'skin' | 'prints'
                    setMessageGrantKind(next)
                    if (next !== 'skin') setMessageGrantSkinId(null)
                  }}
                >
                  <option value="badge">badge</option>
                  <option value="skin">skin</option>
                  <option value="prints">prints</option>
                </select>
              </label>
              {messageGrantKind === 'skin' ? (
                <AdminSkinGrantPicker
                  selectedId={messageGrantSkinId}
                  onSelect={(id) => {
                    setMessageGrantSkinId(id)
                    if (!messageGrantLabel.trim()) {
                      setMessageGrantLabel(getMidnightVariantSheetEntry(id).displayName)
                    }
                  }}
                  ariaLabel="Select skin grant to attach"
                />
              ) : messageGrantKind === 'prints' ? (
                <label>
                  prints amount
                  <select
                    className="admin-modal__input"
                    value={messageGrantValue}
                    onChange={(e) => setMessageGrantValue(e.target.value)}
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
                    value={messageGrantValue}
                    onChange={(e) => setMessageGrantValue(e.target.value)}
                    placeholder="gym-week-1"
                  />
                </label>
              )}
              <label>
                grant label
                <input
                  className="admin-modal__input"
                  value={messageGrantLabel}
                  onChange={(e) => setMessageGrantLabel(e.target.value)}
                  placeholder="WEEK 3 CHAMPION"
                />
              </label>
              <label>
                grant note
                <input
                  className="admin-modal__input"
                  value={messageGrantNote}
                  onChange={(e) => setMessageGrantNote(e.target.value)}
                  placeholder="optional"
                />
              </label>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className="admin-users__export"
          disabled={
            queuingMessage ||
            !messageHandle.trim() ||
            !messageBody.trim() ||
            (messageAttachGrant &&
              (messageGrantKind === 'skin' ? !messageGrantSkinId : !messageGrantValue.trim()))
          }
          onClick={() => void handleQueueMessage()}
        >
          {queuingMessage ? 'queuing…' : 'queue message'}
        </button>
      </section>

      <p className="admin-ops__boundary">
        platform ops (schema, auth settings, secrets, function deploys) live in supabase, everything else lives here.
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
