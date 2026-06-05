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
            welcome to ALIWORLD, a game by six5ive LLC (&quot;we,&quot; &quot;us&quot;). by creating an
            account or playing, you agree to these terms. if you don&apos;t agree, don&apos;t use
            ALIWORLD.
          </p>
        </section>

        <section>
          <h2>1. who can play</h2>
          <p>
            you must be at least 13 (or the minimum digital-consent age where you live). if
            you&apos;re under 18, you confirm a parent or guardian agrees to these terms on your
            behalf.
          </p>
        </section>

        <section>
          <h2>2. your account</h2>
          <ul>
            <li>
              you give a valid email and choose a handle. keep your login secure; you&apos;re
              responsible for activity on your account.
            </li>
            <li>
              one person per account. don&apos;t impersonate others or pick a handle that&apos;s
              offensive, infringing, or misleading.
            </li>
            <li>we may suspend or remove accounts that break these terms.</li>
          </ul>
        </section>

        <section>
          <h2>3. your conduct</h2>
          <p>
            don&apos;t: cheat, exploit bugs, use bots or automation, tamper with the game or its
            data, harass other players, upload unlawful content, or try to access systems or data
            you&apos;re not authorized to. don&apos;t use ALIWORLD for anything illegal.
          </p>
        </section>

        <section>
          <h2>4. the game, and changes</h2>
          <p>
            ALIWORLD is evolving. we may add, change, or remove features, content, characters, or
            mechanics, and we may reset, rebalance, or wipe progress during development. we may
            update or take the game offline at any time.
          </p>
        </section>

        <section>
          <h2>5. virtual items and progress</h2>
          <ul>
            <li>
              any in-game progress, currency, cosmetics, or items have NO real-world monetary
              value, are not your property, and are licensed to you for use in the game only.
            </li>
            <li>
              we don&apos;t currently sell anything in-game. if paid items are added later,
              additional terms will apply at that time.
            </li>
            <li>we may modify, remove, or reset virtual items and progress (see section 4).</li>
          </ul>
        </section>

        <section>
          <h2>6. intellectual property</h2>
          <p>
            ALIWORLD, including its world, characters, art, music, cult.18 mythology, names, and
            code, is owned by six5ive LLC and protected by law. you get a personal, limited,
            non-transferable license to play. you may share screenshots and your ALIWORLD identity
            card for personal, non-commercial use. you may not copy, sell, modify, reverse-engineer,
            or make derivative works from the game without our written permission.
          </p>
        </section>

        <section>
          <h2>7. content you share</h2>
          <p>
            if you submit anything (a handle, feedback, shared images), you grant us a worldwide,
            royalty-free license to use it to operate and promote ALIWORLD. don&apos;t submit
            anything you don&apos;t have the right to share.
          </p>
        </section>

        <section>
          <h2>8. third-party services</h2>
          <p>
            ALIWORLD runs on services like Supabase and Cloudflare and links out to things like
            streaming and merch. we&apos;re not responsible for third-party services or sites; their
            terms apply to them.
          </p>
        </section>

        <section>
          <h2>9. disclaimers</h2>
          <p>
            ALIWORLD is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind.
            we don&apos;t promise it will be uninterrupted, error-free, or that progress won&apos;t be
            lost. you play at your own risk.
          </p>
        </section>

        <section>
          <h2>10. limitation of liability</h2>
          <p>
            to the fullest extent allowed by law, six5ive LLC is not liable for any indirect,
            incidental, or consequential damages, or for lost progress or data, arising from your
            use of ALIWORLD. our total liability is limited to the amount you paid us in the past
            12 months (currently $0).
          </p>
        </section>

        <section>
          <h2>11. termination</h2>
          <p>
            you can stop playing and delete your account anytime. we may suspend or end your access
            for breaking these terms. sections that by nature should survive (IP, disclaimers,
            liability) survive termination.
          </p>
        </section>

        <section>
          <h2>12. changes to these terms</h2>
          <p>
            we may update these terms. we&apos;ll post the new version with a new date, and for major
            changes we&apos;ll give notice in-game or by email where appropriate. continuing to play
            means you accept the update.
          </p>
        </section>

        <section>
          <h2>13. governing law</h2>
          <p>
            these terms are governed by the laws of the State of California, USA, without regard to
            conflict-of-laws rules. [confirm venue / arbitration with a lawyer.]
          </p>
        </section>

        <section>
          <h2>14. contact</h2>
          <p>
            questions:{' '}
            <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>{' '}
            - six5ive LLC
          </p>
        </section>

        <a className="privacy-policy__back" href="/">
          ← back
        </a>
      </div>
    </div>
  )
}
