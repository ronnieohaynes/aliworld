import './PrivacyPolicy.css'

const CONTACT_EMAIL = 'contact@six5ive.com'

export function TermsOfService() {
  return (
    <div className="privacy-policy">
      <div className="privacy-policy__inner">
        <h1 className="privacy-policy__title">Terms of Service</h1>
        <p className="privacy-policy__updated">Last updated: June 05, 2026</p>

        <section>
          <p>
            ALIWORLD (&quot;we,&quot; &quot;us,&quot; &quot;the game&quot;) is operated by six5ive LLC. these terms
            govern your access to and use of ALIWORLD, including the website, game client, and
            related services. by creating an account, signing up for updates, or playing, you agree
            to these terms and to our{' '}
            <a className="privacy-policy__link" href="/privacy">
              privacy policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2>who we are</h2>
          <p>
            ALIWORLD is operated by six5ive LLC. questions about these terms:{' '}
            <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2>eligibility</h2>
          <p>
            you must be old enough to consent to these terms where you live (13+ in the united
            states, or the minimum age in your country). if you are under 18, you represent that
            your parent or guardian has reviewed and agreed to these terms on your behalf.
          </p>
        </section>

        <section>
          <h2>your account</h2>
          <ul>
            <li>
              you are responsible for your account credentials and for activity under your account.
            </li>
            <li>
              choose a handle you have the right to use. do not impersonate others or use offensive
              names.
            </li>
            <li>
              one person, one account — do not share accounts or sell them without our permission.
            </li>
            <li>
              we may suspend or terminate accounts that violate these terms or harm the game or other
              players.
            </li>
          </ul>
        </section>

        <section>
          <h2>acceptable use</h2>
          <p>you agree not to:</p>
          <ul>
            <li>cheat, exploit bugs, use bots, or reverse-engineer the client to gain unfair advantage.</li>
            <li>harass, threaten, or abuse other players or our team.</li>
            <li>attempt to access systems, data, or accounts that are not yours.</li>
            <li>use the game for unlawful purposes or to distribute malware or spam.</li>
            <li>scrape, mine, or bulk-harvest data from our services without permission.</li>
          </ul>
          <p>
            we may investigate violations and take action including warnings, resets, suspensions,
            or permanent bans.
          </p>
        </section>

        <section>
          <h2>game content and progress</h2>
          <ul>
            <li>
              gameplay, characters, items, and progress are licensed to you for personal,
              non-commercial use while you play — not sold to you.
            </li>
            <li>
              we may change, balance, reset, or remove game content as the game evolves. we try not
              to wipe progress without cause, but we may reset accounts that cheat or break the
              rules.
            </li>
            <li>
              prizes, badges, or rewards granted by us or our partners may have separate rules; we
              may modify or revoke them if earned through fraud or error.
            </li>
          </ul>
        </section>

        <section>
          <h2>intellectual property</h2>
          <p>
            ALIWORLD, including art, music, story, code, logos, and trademarks, belongs to six5ive
            LLC and its licensors. you may not copy, modify, distribute, or create derivative works
            from our content except as allowed by law or with our written permission.
          </p>
        </section>

        <section>
          <h2>disclaimer</h2>
          <p>
            ALIWORLD is provided &quot;as is&quot; and &quot;as available.&quot; we do not guarantee uninterrupted
            service, error-free play, or that saved progress will never be lost. use at your own
            risk.
          </p>
        </section>

        <section>
          <h2>limit of liability</h2>
          <p>
            to the fullest extent permitted by law, six5ive LLC and its team are not liable for
            indirect, incidental, special, consequential, or punitive damages, or for loss of data,
            progress, or profits, arising from your use of ALIWORLD. our total liability for any
            claim related to the game is limited to the amount you paid us for the game in the
            twelve months before the claim (typically zero — ALIWORLD is free to play).
          </p>
        </section>

        <section>
          <h2>termination</h2>
          <p>
            you may stop playing at any time. we may suspend or terminate access if you break these
            terms or if we discontinue the game. sections that by nature should survive (ownership,
            disclaimers, limits of liability) survive termination.
          </p>
        </section>

        <section>
          <h2>changes</h2>
          <p>
            we may update these terms. we will post the new version here with an updated date.
            continued use after changes means you accept the updated terms where permitted by law.
          </p>
        </section>

        <section>
          <h2>contact</h2>
          <p>
            questions about these terms:{' '}
            <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>six5ive LLC</p>
        </section>

        <a className="privacy-policy__back" href="/">
          ← back
        </a>
      </div>
    </div>
  )
}
