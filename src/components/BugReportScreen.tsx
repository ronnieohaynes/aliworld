import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuthState } from '../store/authStore'
import './BugReportScreen.css'

const WEBHOOK_URL = import.meta.env.VITE_DISCORD_BUG_WEBHOOK as string | undefined

type Props = {
  screenshot: string | null
  onClose: () => void
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

async function sendBugReport(
  description: string,
  screenshot: string | null,
  userId: string | null,
): Promise<void> {
  if (!WEBHOOK_URL) throw new Error('no webhook configured')

  const timestamp = new Date().toISOString()
  const embed = {
    title: '🐛 Bug Report',
    description: description,
    color: 0xb32a1f,
    fields: [
      { name: 'User', value: userId ?? 'anonymous', inline: true },
      { name: 'URL', value: window.location.href, inline: true },
      { name: 'Time', value: timestamp, inline: false },
    ],
    ...(screenshot ? { image: { url: 'attachment://screenshot.jpg' } } : {}),
  }

  const payload = JSON.stringify({ embeds: [embed] })

  if (screenshot) {
    // Send screenshot as a file attachment alongside the embed
    const blob = await fetch(screenshot).then((r) => r.blob())
    const form = new FormData()
    form.append('payload_json', payload)
    form.append('files[0]', blob, 'screenshot.jpg')
    const res = await fetch(WEBHOOK_URL, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`discord ${res.status}`)
  } else {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    if (!res.ok) throw new Error(`discord ${res.status}`)
  }
}

export function BugReportScreen({ screenshot, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || status === 'submitting') return
    setStatus('submitting')

    try {
      const userId = getAuthState().session?.user?.id ?? null
      await sendBugReport(description.trim(), screenshot, userId)
      setStatus('success')
      window.setTimeout(onClose, 1600)
    } catch {
      setStatus('error')
    }
  }, [description, onClose, screenshot, status])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  return (
    <div
      className="bug-report-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Report a bug"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <div className="bug-report-screen__panel">
        <header className="bug-report-screen__header">
          <h2 className="bug-report-screen__title">report a bug</h2>
          <button
            type="button"
            className="bug-report-screen__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {screenshot && (
          <div className="bug-report-screen__screenshot-wrap">
            <img
              className="bug-report-screen__screenshot"
              src={screenshot}
              alt="Screenshot at time of report"
              draggable={false}
            />
            <span className="bug-report-screen__screenshot-label">screenshot captured</span>
          </div>
        )}

        <label className="bug-report-screen__label" htmlFor="bug-description">
          what's not working?
        </label>
        <textarea
          id="bug-description"
          ref={textareaRef}
          className="bug-report-screen__textarea"
          placeholder="describe the bug..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={1000}
          disabled={status === 'submitting' || status === 'success'}
        />

        {status === 'error' && (
          <p className="bug-report-screen__error">something went wrong. try again.</p>
        )}

        {status === 'success' && (
          <p className="bug-report-screen__success">report sent. thank you.</p>
        )}

        <div className="bug-report-screen__actions">
          <button
            type="button"
            className="bug-report-screen__cancel"
            onClick={onClose}
            disabled={status === 'submitting'}
          >
            cancel
          </button>
          <button
            type="button"
            className="bug-report-screen__submit"
            onClick={handleSubmit}
            disabled={!description.trim() || status === 'submitting' || status === 'success'}
          >
            {status === 'submitting' ? 'sending...' : 'send report'}
          </button>
        </div>
      </div>
    </div>
  )
}
