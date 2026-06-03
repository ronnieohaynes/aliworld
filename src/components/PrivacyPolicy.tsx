import './PrivacyPolicy.css'

const CONTACT_EMAIL = 'mgmt@dannyali.com'

export function PrivacyPolicy() {
  return (
    <div className="privacy-policy">
      <div className="privacy-policy__inner">
        <p className="privacy-policy__draft" role="note">
          draft placeholder — not legal advice. replace with a reviewed privacy policy before
          relying on this for compliance.
        </p>

        <h1 className="privacy-policy__title">privacy policy (draft)</h1>
        <p className="privacy-policy__updated">last updated: may 2026 · ALIWORLD / six5ive LLC</p>

        <section>
          <h2>what we collect</h2>
          <ul>
            <li>
              <strong>email address</strong> — if you join the waitlist on our coming-soon page.
            </li>
            <li>
              <strong>gameplay analytics</strong> — aggregate event data when you play (e.g.
              sessions, progress milestones, in-game actions). tied to your account while signed in.
            </li>
            <li>
              <strong>account info</strong> — handle and save data needed to run the game when you
              create an account.
            </li>
          </ul>
        </section>

        <section>
          <h2>how we use it</h2>
          <ul>
            <li>to email you about ALIWORLD launches, updates, and related news (waitlist only).</li>
            <li>to operate, debug, and improve the game experience.</li>
            <li>
              to produce <strong>aggregate, anonymized insights</strong> about how people play — we
              may share those summaries with partners or sponsors, but not your individual email or
              raw per-player rows.
            </li>
          </ul>
        </section>

        <section>
          <h2>what we do not do</h2>
          <p>
            we do not sell your personal email or individual gameplay records to third parties. sponsor
            and partner reporting uses aggregated statistics only.
          </p>
        </section>

        <section>
          <h2>retention &amp; security</h2>
          <p>
            data is stored on Supabase infrastructure with row-level access controls. we keep
            information as long as needed to run the service and meet legal obligations, then delete
            or anonymize it when reasonable.
          </p>
        </section>

        <section>
          <h2>your choices</h2>
          <p>
            you can ask us to remove your waitlist email or account data by contacting us below. you
            may unsubscribe from launch emails at any time.
          </p>
        </section>

        <section>
          <h2>contact</h2>
          <p>
            questions or deletion requests:{' '}
            <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <a className="privacy-policy__back" href="/">
          ← back
        </a>
      </div>
    </div>
  )
}
