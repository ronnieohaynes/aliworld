import { FormEvent, useCallback, useState } from 'react'
import {
  BLNT_TRACK_URL,
  SOCIAL_INSTAGRAM_URL,
  SOCIAL_TWITTER_URL,
} from '../config/comingSoon'
import { submitEmailSignup } from '../lib/emailSignup'
import { publicAsset } from '../utils/publicAsset'
import './ComingSoon.css'

const SIGIL_SRC = publicAsset('Assets/ui/AW%20GAME%20LOGO.svg')

type SignupMessage = {
  tone: 'success' | 'muted' | 'error'
  text: string
} | null

export function ComingSoon() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<SignupMessage>(null)

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (submitting) return

      setSubmitting(true)
      setMessage(null)

      try {
        const result = await submitEmailSignup(email)
        switch (result.status) {
          case 'success':
            setMessage({ tone: 'success', text: "you're on the list." })
            setEmail('')
            break
          case 'duplicate':
            setMessage({ tone: 'muted', text: "you're already on it." })
            break
          case 'invalid':
            setMessage({ tone: 'error', text: 'enter a valid email address.' })
            break
          case 'error':
            setMessage({ tone: 'error', text: result.message })
            break
        }
      } catch {
        setMessage({ tone: 'error', text: 'could not reach the server — try again soon.' })
      } finally {
        setSubmitting(false)
      }
    },
    [email, submitting],
  )

  const socialLinks: { label: string; href: string }[] = []
  if (SOCIAL_INSTAGRAM_URL) {
    socialLinks.push({ label: 'instagram', href: SOCIAL_INSTAGRAM_URL })
  }
  if (SOCIAL_TWITTER_URL) {
    socialLinks.push({ label: 'x', href: SOCIAL_TWITTER_URL })
  }

  return (
    <div className="coming-soon">
      <div className="coming-soon__glow" aria-hidden />

      <main className="coming-soon__main">
        <img className="coming-soon__sigil" src={SIGIL_SRC} alt="" draggable={false} />
        <h1 className="coming-soon__wordmark">ALIWORLD</h1>
        <p className="coming-soon__tagline">coming soon</p>

        <form className="coming-soon__form" onSubmit={handleSubmit}>
          <label className="coming-soon__label" htmlFor="coming-soon-email">
            get notified at launch
          </label>
          <div className="coming-soon__field-row">
            <input
              id="coming-soon-email"
              className="coming-soon__input"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
            <button className="coming-soon__submit" type="submit" disabled={submitting}>
              {submitting ? '…' : 'notify me'}
            </button>
          </div>
          <p className="coming-soon__legal">
            by signing up you agree to our{' '}
            <a className="coming-soon__link" href="/privacy">
              privacy policy
            </a>
          </p>
          {message ? (
            <p
              className={`coming-soon__message coming-soon__message--${message.tone}`}
              role="status"
              aria-live="polite"
            >
              {message.text}
            </p>
          ) : null}
        </form>

        <a
          className="coming-soon__track"
          href={BLNT_TRACK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          BETTER LUCK NEXT TIME?
        </a>

        {socialLinks.length > 0 ? (
          <nav className="coming-soon__social" aria-label="Social links">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                className="coming-soon__social-link"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </main>

      <footer className="coming-soon__footer">© six5ive LLC 2025–2026</footer>
    </div>
  )
}
