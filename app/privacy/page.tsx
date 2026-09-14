import type { Metadata } from 'next';
import Link from 'next/link';
import { PrivacyControls } from '@/components/atlas/privacy-controls';
import './privacy.css';

export const metadata: Metadata = {
  title: 'Privacy policy | Calgary Neighbourhood Analytics',
  description:
    'How Calgary Neighbourhood Analytics handles browser saves, public records, searches, service providers and privacy requests.',
};

const contents = [
  ['your-device', 'On your device'],
  ['searches', 'Searches and public records'],
  ['providers', 'Service providers'],
  ['purposes', 'Why information is processed'],
  ['locations', 'Processing locations'],
  ['retention', 'How long information stays'],
  ['choices', 'Your choices'],
  ['rights', 'Requests and complaints'],
  ['children', 'Children'],
  ['changes', 'Changes and contact'],
] as const;

export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <a className="privacy-skip" href="#privacy-content">
        Skip to privacy policy
      </a>

      <header className="privacy-header">
        <Link className="privacy-wordmark" href="/">
          Calgary Neighbourhood Analytics
        </Link>
        <Link className="privacy-return" href="/">
          Return to the map <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main id="privacy-content" className="privacy-main" tabIndex={-1}>
        <div className="privacy-intro">
          <p className="privacy-eyebrow">YOUR INFORMATION</p>
          <h1>Privacy policy</h1>
          <p className="privacy-lead">
            Saved places stay in your browser. Loading the website, searching
            public records and viewing maps still involve network requests. This
            page explains both.
          </p>
          <p className="privacy-date">
            Effective <time dateTime="2026-09-14">14 September 2026</time>
          </p>
          <div className="privacy-operator">
            <p>
              Operated by <strong>Abdullah Zubair</strong> in Alberta, Canada.
              This independent, noncommercial project has no accounts, ads,
              marketing forms or visitor analytics.
            </p>
            <a href="mailto:az28140@icloud.com">az28140@icloud.com</a>
          </div>
        </div>

        <div className="privacy-layout">
          <nav className="privacy-toc" aria-label="Privacy policy contents">
            <p>On this page</p>
            <ol>
              {contents.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="privacy-article" aria-label="Privacy policy">
            <section id="your-device" aria-labelledby="device-heading">
              <h2 id="device-heading">1. On your device</h2>
              <p>
                Saving a place or changing a saved checklist writes that choice
                to this browser’s local storage. These features are optional.
                Saved choices are not uploaded to an account or saved-place
                database, and do not sync between devices. Anyone using the same
                browser profile may be able to see them.
              </p>
              <p>
                Calculator inputs and comparisons are handled in browser memory.
                The site does not submit those inputs for financial profiling. A
                printout or export becomes a file you control. Local storage
                remains until you remove the items, use the controls below or
                clear this site’s data in your browser.
              </p>
              <p>
                In compatible browsers, assistant tools can read the selected
                property address or identifier and comparison selections, or
                change the map selection, when invoked. Use those tools only
                when you want to share that context with your browser or
                assistant; its permissions and privacy practices apply.
              </p>
              <PrivacyControls />
            </section>

            <section id="searches" aria-labelledby="searches-heading">
              <h2 id="searches-heading">2. Searches and public records</h2>
              <p>
                Address and property lookups pass through the Vercel-hosted app
                to the{' '}
                <a href="https://www.calgary.ca/info-requests/privacy-policy.html">
                  City of Calgary’s public data service
                </a>
                . The app forwards the public search query, not your visitor IP
                address. Normal lookups send queries in request bodies and
                return responses marked not to be stored by browsers or
                intermediary caches. Shared address links and older compatible
                lookup URLs can contain the query in the URL, which may appear
                in request logs, browser history or wherever you share it.
              </p>
              <p>
                Search for public addresses or property identifiers; do not
                enter private details. The site displays public civic and
                property fields, not property-owner profiles. Neighbourhood
                statistics describe areas, not individual residents.
              </p>
              <p>
                Public officials’ names, offices and party affiliations, where
                displayed, come from identified official sources. Public
                availability does not remove privacy rights. Contact the
                operator about an inaccurate or inappropriate display;
                corrections can be reviewed here even when the originating
                record is maintained by another organization.
              </p>
            </section>

            <section id="providers" aria-labelledby="providers-heading">
              <h2 id="providers-heading">3. Service providers</h2>
              <p>
                <a href="https://vercel.com/legal/privacy-notice">Vercel</a>{' '}
                hosts the website and processes technical request information,
                which can include IP address, browser or device details,
                requested URL, time, errors and security information. This
                supports delivery, troubleshooting and protection against abuse.
              </p>
              <p>
                Your browser requests map tiles and map lettering directly from{' '}
                <a href="https://openfreemap.org/privacy/">OpenFreeMap</a>.
                Selecting City of Calgary aerial imagery also sends requests to{' '}
                <a href="https://www.esri.com/en-us/privacy/privacy-statements/privacy-statement">
                  Esri-hosted tiles
                </a>
                . Those providers receive your IP address and the requested map
                area, plus ordinary connection information. This does not mean
                the app has obtained your device’s precise location. Interface
                fonts do not require an external font service.
              </p>
              <p>
                Privacy email is handled through{' '}
                <a href="https://www.apple.com/legal/privacy/">Apple iCloud</a>.
                Emailing shares your address, message and attachments. External
                links, including LinkedIn, are optional and open services with
                their own privacy practices. Providers may also process
                technical information for their own purposes described in those
                policies.
              </p>
            </section>

            <section id="purposes" aria-labelledby="purposes-heading">
              <h2 id="purposes-heading">4. Why information is processed</h2>
              <p>
                The operator uses information to provide the features you
                request, display sourced civic information, maintain a reliable
                and secure service, and respond to correspondence. The operator
                does not sell personal information or share it for behavioural
                advertising. The app sets no tracking cookies and has no
                advertising, tracking analytics or automated decision about your
                eligibility for housing, credit, insurance or employment.
              </p>
              <p>
                Applicable law depends on the activity and jurisdiction,
                including the scope of Alberta PIPA, Canada’s PIPEDA and the
                GDPR. Availability in Europe alone does not establish GDPR
                coverage. Where GDPR applies, necessary service delivery,
                security and replies rely on legitimate interests, assessed
                against individuals’ rights and reasonable expectations. You may
                object to that processing. Consent is used only where it is
                actually requested; visiting this site is not blanket consent to
                new uses.
              </p>
            </section>

            <section id="locations" aria-labelledby="locations-heading">
              <h2 id="locations-heading">5. Processing locations</h2>
              <p>
                Alberta operation does not mean Canadian-only storage. The app’s
                Vercel functions currently run in the United States. Vercel’s
                network and other providers may process information elsewhere,
                where local laws and lawful government access may differ. Vercel
                lists its subprocessors and locations in its{' '}
                <a href="https://security.vercel.com">security portal</a>.
              </p>
              <p>
                Vercel’s{' '}
                <a href="https://vercel.com/legal/dpa">
                  Data Processing Addendum
                </a>{' '}
                includes standard contractual clauses, but its processor
                provisions specify Pro and Enterprise plans. This Hobby demo
                does not claim that agreement as confirmed transfer coverage.
                Nor is a transfer agreement with every map or external provider
                established. Where transfer law applies, the operator must
                assess the recipient and required safeguards. You can request
                information about safeguards relevant to your data.
              </p>
            </section>

            <section id="retention" aria-labelledby="retention-heading">
              <h2 id="retention-heading">6. How long information stays</h2>
              <p>
                Local saves remain until cleared. App memory holds search inputs
                and results while handling the request or active session. The
                app has no visitor search-history database. Public dataset
                snapshots and public-data caches can remain for reuse; those are
                separate from a record of who searched.
              </p>
              <p>
                Hosting and map providers may retain operational or security
                records under their own schedules. Duration depends on the
                service, troubleshooting needs, abuse prevention and legal
                obligations. A short dashboard log-viewing window is not a
                promise that every provider record has been deleted. Ask the
                operator for available retention details for a specific request.
              </p>
              <p>
                OpenFreeMap states that ordinary logs exclude IP addresses and
                are retained indefinitely; security-incident IP logs are deleted
                within 30 days or when the incident is resolved, whichever is
                sooner. Its possible Cloudflare delivery provider has separate
                practices, linked in OpenFreeMap’s privacy policy.
              </p>
              <p>
                Privacy correspondence is normally deleted 12 months after
                resolution. A legal obligation or active claim may require
                longer retention; the reason and continuing need will be
                documented. Access to operator-held information is limited to
                what is needed to run the project and handle the request. No
                internet service can promise absolute security.
              </p>
            </section>

            <section id="choices" aria-labelledby="choices-heading">
              <h2 id="choices-heading">7. Your choices</h2>
              <p>
                You can browse without saving places or contacting the operator.
                Clear browser data using the controls above or your browser’s
                settings; the operator cannot remotely erase data held only on
                your device. Avoid sharing an address link if you do not want
                recipients to see its query. Aerial imagery and external contact
                links are optional.
              </p>
              <p>
                The operator does not sell personal information or share it for
                behavioural advertising, regardless of Global Privacy Control or
                Do Not Track preferences. The site does not claim to detect
                these signals. Essential hosting and map requests still occur
                when you use the associated features. Any future optional
                tracking will require an updated notice and consent where
                required.
              </p>
            </section>

            <section id="rights" aria-labelledby="rights-heading">
              <h2 id="rights-heading">8. Requests and complaints</h2>
              <p>
                Anyone can email{' '}
                <a href="mailto:az28140@icloud.com">az28140@icloud.com</a> to
                request access, correction, deletion, restriction, objection or
                a portable copy of information, or to withdraw consent where
                consent is the basis. Legal entitlements and exceptions depend
                on applicable law. Withdrawal does not undo earlier lawful
                processing. No account is required, and making a request will
                not reduce your access to the site.
              </p>
              <p>
                Describe the information or interaction concerned. Only
                proportionate verification will be requested; authorized agents
                may act with evidence of authority. Do not send identity
                documents unless a necessary, appropriate method has been
                agreed. The aim is to respond within 30 days, while meeting the
                GDPR’s one-calendar-month limit or any applicable shorter
                deadline. Any lawful extension, refusal or limitation will be
                explained within the required initial response period.
              </p>
              <p>
                You may complain to the{' '}
                <a href="https://oipc.ab.ca/privacy-correction-complaint/">
                  Alberta privacy commissioner
                </a>
                , the{' '}
                <a href="https://www.priv.gc.ca/en/report-a-concern/">
                  Office of the Privacy Commissioner of Canada
                </a>
                , your{' '}
                <a href="https://www.edpb.europa.eu/about-edpb/our-members_en">
                  EEA supervisory authority
                </a>{' '}
                or relevant{' '}
                <a href="https://www.naag.org/find-my-ag/">
                  US state attorney general
                </a>
                , according to their jurisdiction. Where a state privacy law
                provides an appeal, reply to the decision to request a review.
              </p>
            </section>

            <section id="children" aria-labelledby="children-heading">
              <h2 id="children-heading">9. Children</h2>
              <p>
                This property research tool is intended for adults and is not
                directed to children under 13. The operator does not knowingly
                solicit children’s personal information. If a child has sent
                personal information, a parent or guardian can contact the
                operator to have it reviewed and deleted as appropriate.
              </p>
            </section>

            <section id="changes" aria-labelledby="changes-heading">
              <h2 id="changes-heading">10. Changes and contact</h2>
              <p>
                Changes will be dated here. A material new use of personal
                information will be explained before it begins, with consent
                requested where required. This notice describes the current
                service; it is not a certification of compliance with every law.
              </p>
              <p>
                Abdullah Zubair is responsible for privacy questions and
                requests. Contact{' '}
                <a href="mailto:az28140@icloud.com">az28140@icloud.com</a> for
                this Alberta-operated project.
              </p>
            </section>
          </article>
        </div>
      </main>

      <footer className="privacy-footer">
        <p>Calgary Neighbourhood Analytics</p>
        <div>
          <Link href="/">Return to the app</Link>
          <a href="mailto:az28140@icloud.com">Privacy contact</a>
          <a href="https://github.com/AHZR199/calgary-neighbourhood-analytics">
            Source on GitHub
          </a>
          <a href="#privacy-content">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
