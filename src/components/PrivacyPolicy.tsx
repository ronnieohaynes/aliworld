import './PrivacyPolicy.css'

const CONTACT_EMAIL = 'contact@six5ive.com'

export function PrivacyPolicy() {
  return (
    <div className="privacy-policy">
      <div className="privacy-policy__inner">
        <h1 className="privacy-policy__title">Privacy Policy</h1>
        <p className="privacy-policy__updated">Last updated: 06/03/2026</p>

        <section>
          <p>
            ALIWORLD (&quot;we,&quot; &quot;us&quot;) is a game created by six5ive LLC. this policy
            explains what information we collect, why, and what we do with it. by creating an
            account or signing up for updates, you agree to this policy.
          </p>
        </section>

        <section>
          <h2>who we are</h2>
          <p>
            ALIWORLD is operated by six5ive LLC. for any privacy questions or requests, contact us at{' '}
            <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2>what we collect</h2>
          <p className="privacy-policy__subhead">information you give us:</p>
          <ul>
            <li>
              <strong>email address:</strong> when you sign up for updates or create an account.
            </li>
            <li>
              <strong>account details:</strong> your handle (display name) and login credentials.
              passwords are handled by our authentication provider (Supabase) and stored securely;
              we do not store your password in readable form.
            </li>
          </ul>
          <p className="privacy-policy__subhead">information collected as you play:</p>
          <ul>
            <li>
              <strong>gameplay data:</strong> your progress (episode, location, quests), your
              character build (skills, moves, archetype), and in-game choices. this is saved to
              your account so you can pick up where you left off.
            </li>
            <li>
              <strong>usage analytics:</strong> events like when you open the game, how long you
              play, which parts you reach, battle outcomes, and clicks on external links. we use
              this to understand how people play and to improve the game.
            </li>
          </ul>
          <p>
            we do <strong>NOT</strong> collect: precise location, payment card numbers (we
            don&apos;t take in-app payments), or data from your device beyond what&apos;s needed to
            run the game.
          </p>
        </section>

        <section>
          <h2>how we use your information</h2>
          <ul>
            <li>to run the game and save your progress.</li>
            <li>to send you updates about ALIWORLD (if you signed up for them).</li>
            <li>to understand and improve gameplay (which parts are fun, where people get stuck).</li>
            <li>
              to produce aggregated, anonymized statistics about our overall audience (for example,
              total number of players, overall engagement). these aggregates do not identify
              individual players.
            </li>
          </ul>
        </section>

        <section>
          <h2>what we share</h2>
          <ul>
            <li>we do not sell your personal information.</li>
            <li>we do not share individual user data with advertisers or sponsors.</li>
            <li>
              we may share aggregated, anonymized statistics (audience size, overall engagement)
              with partners or sponsors. these cannot be used to identify you.
            </li>
            <li>
              we use service providers to operate the game (e.g. Supabase for accounts/data,
              Cloudflare for hosting). they process data only to provide their services to us.
            </li>
            <li>we may disclose information if required by law.</li>
          </ul>
        </section>

        <section>
          <h2>your choices and rights</h2>
          <ul>
            <li>
              <strong>email updates:</strong> you can unsubscribe at any time using the link in our
              emails or by contacting us.
            </li>
            <li>
              <strong>your data:</strong> you can request a copy of your data, ask us to correct it,
              or ask us to delete your account and associated data by contacting{' '}
              <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </li>
          </ul>
          <p>
            depending on where you live (e.g. California, the EU/UK), you may have additional rights
            over your personal information, including access, deletion, and the right to opt out of
            certain processing. contact us to exercise these rights.
          </p>
        </section>

        <section>
          <h2>data retention</h2>
          <p>
            we keep your account and gameplay data while your account is active. if you ask us to
            delete your account, we remove your personal data except where we must keep it for legal
            reasons. analytics events may be retained in aggregated form.
          </p>
        </section>

        <section>
          <h2>children</h2>
          <p>
            ALIWORLD is not directed at children under 13 (or the minimum age in your country). we do
            not knowingly collect personal information from children under that age. if you believe a
            child has given us information, contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2>security</h2>
          <p>
            we use industry-standard measures (including access controls and encryption in transit)
            to protect your information. no system is perfectly secure, but we work to keep your data
            safe.
          </p>
        </section>

        <section>
          <h2>changes to this policy</h2>
          <p>
            we may update this policy. we&apos;ll post the new version here with an updated date, and
            for significant changes we&apos;ll notify you where appropriate.
          </p>
        </section>

        <section>
          <h2>contact</h2>
          <p>
            questions or requests:{' '}
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
