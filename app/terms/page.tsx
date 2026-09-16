import type { Metadata } from 'next';
import Link from 'next/link';
import '../privacy/privacy.css';

export const metadata: Metadata = {
  title: 'Use & limitations | Calgary Neighbourhood Analytics',
  description:
    'Terms of use, source rights and the limits of property, radon and sunlight information.',
};

const contents = [
  ['project', 'About this service'],
  ['property', 'Property records and estimates'],
  ['radon', 'Radon and environmental context'],
  ['sunlight', 'Sun direction and orientation'],
  ['rights', 'Sources and reuse'],
  ['use', 'Using the service'],
  ['availability', 'Availability and responsibility'],
  ['contact', 'Changes and contact'],
] as const;

export default function TermsPage() {
  return (
    <div className="privacy-page">
      <a className="privacy-skip" href="#terms-content">
        Skip to terms of use
      </a>
      <header className="privacy-header">
        <Link className="privacy-wordmark" href="/">
          Calgary Neighbourhood Analytics
        </Link>
        <Link className="privacy-return" href="/">
          Return to the map <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <main id="terms-content" className="privacy-main" tabIndex={-1}>
        <div className="privacy-intro">
          <p className="privacy-eyebrow">USING THE WEBSITE</p>
          <h1>Use & limitations</h1>
          <p className="privacy-lead">
            Public records can help you ask better questions about a home. They
            do not replace checking the property and its documents.
          </p>
          <p className="privacy-date">
            Effective <time dateTime="2026-09-16">16 September 2026</time>
          </p>
        </div>
        <div className="privacy-layout">
          <nav className="privacy-toc" aria-label="Terms of use contents">
            <p>On this page</p>
            <ol>
              {contents.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="privacy-article" aria-label="Terms of use">
            <section id="project">
              <h2>1. About this service</h2>
              <p>
                Abdullah Zubair operates this independent, noncommercial
                research project from Alberta, Canada. There are no paid
                subscriptions or brokerage services. The project is not
                affiliated with or endorsed by the City of Calgary, Calgary
                Police Service, Health Canada, a political party or a real
                estate brokerage.
              </p>
              <p>
                Use the information as a starting point for research. It is not
                a professional valuation, inspection, engineering assessment,
                medical opinion, legal opinion or financing decision.
              </p>
            </section>
            <section id="property">
              <h2>2. Property records and estimates</h2>
              <p>
                Assessment values are for the stated roll year and are not sale
                prices. Tax and ownership calculations depend on their stated
                rates and your inputs; they can omit charges or conditions
                specific to a property. Verify the actual bill and transaction
                documents.
              </p>
              <p>
                A recorded construction year is a City assessment field. It may
                describe an improvement rather than every structure or
                renovation on a parcel. Missing, invalid or conflicting years
                remain unknown. We do not estimate a home’s age from its
                neighbours, pipe installation dates or changes in assessed
                value.
              </p>
              <p>
                No freely accessible source with confirmed public-reuse
                permission for individual last-sale dates and prices has been
                established for this release. Missing sale history does not mean
                a property has never sold. City owner services and Alberta land
                records are linked as separate research options; access
                restrictions or fees may apply. Their content is not copied into
                this app.
              </p>
            </section>
            <section id="radon">
              <h2>3. Radon and environmental context</h2>
              <p>
                The radon summary describes a dated Calgary
                census-metropolitan-area survey. It is not a current
                neighbourhood rating, a prediction for an address or evidence
                that a home is safe. Survey participation, sample size and
                measurement methods limit comparisons. Only testing the
                individual dwelling can establish its radon level.
              </p>
              <p>
                Follow{' '}
                <a
                  href="https://www.canada.ca/en/health-canada/services/publications/health-risks-safety/guide-radon-measurements-residential-dwellings.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Health Canada’s current measurement guidance
                </a>{' '}
                and obtain qualified advice about mitigation. Air-monitor
                readings, flood boundaries, noise contours and public pipe
                records also have their own geographic and measurement limits.
                Public water records do not establish private plumbing
                condition.
              </p>
            </section>
            <section id="sunlight">
              <h2>4. Sun direction and orientation</h2>
              <p>
                Solar position is an approximate astronomical calculation at the
                selected property coordinates, measured from true north. Times
                follow the stated Calgary time rule. Sunrise, sunset and
                daylight duration assume an unobstructed horizon; they are not
                hours of direct sunlight at a window, yard or solar panel.
              </p>
              <p>
                The tool does not know which way the building, roof or windows
                face. A facing direction you select is your assumption. Trees,
                adjacent buildings, terrain, weather, roof pitch, glazing and
                shading are not modelled. Orientation guidance describes
                trade-offs, not one ideal direction for every home. Confirm on
                site and use a site-specific study for building design or solar
                installation decisions.
              </p>
            </section>
            <section id="rights">
              <h2>5. Sources and reuse</h2>
              <p>
                Source dates, methods, attribution and reuse conditions are
                listed in the app’s Sources view and{' '}
                <a href="/data/rights-register.json">source reuse register</a>.
                Data, map services, software and linked material retain their
                respective licences and rights. The public GitHub repository
                does not grant a blanket licence to everything in it.
              </p>
              <p>
                When sharing a brief or a derived figure, retain its source,
                date, scope and limitations. Do not present estimates as
                official findings or imply publisher endorsement. Aerial imagery
                and restricted source materials are excluded from exported
                briefs. For further redistribution or commercial use, review the
                applicable source permissions separately; access to this website
                does not expand them.
              </p>
            </section>
            <section id="use">
              <h2>6. Using the service</h2>
              <p>
                Use public addresses and property identifiers for lookups. Do
                not submit sensitive personal details, attempt to bypass access
                controls or disrupt the service. We may limit requests to
                protect availability. Do not use area statistics to make claims
                about individual residents or their eligibility for housing,
                credit or insurance.
              </p>
              <p>
                The{' '}
                <Link href="/privacy" prefetch={false}>
                  privacy policy
                </Link>{' '}
                explains browser saves, search requests, service providers and
                your choices. External links open independently operated
                services with their own terms and privacy practices.
              </p>
            </section>
            <section id="availability">
              <h2>7. Availability and responsibility</h2>
              <p>
                The service is provided as available. Data can be incomplete,
                out of date, mis-matched or temporarily unavailable, and
                upstream services can change. Check important information with
                the original publisher and relevant professionals before acting.
              </p>
              <p>
                Transit lines and stops describe the dated source feed, not live
                vehicle positions or guaranteed service. Planned Green Line
                geometry is separately labelled and can change. It does not
                establish an opening date, a future walking route, service
                frequency or an effect on property value. Proposed service is
                excluded from the app’s transit-access estimates.
              </p>
              <p>
                To the extent permitted by applicable law, the operator does not
                guarantee uninterrupted service or the accuracy, completeness or
                suitability of information for a particular decision. Nothing on
                this page excludes rights, remedies or responsibilities that
                cannot lawfully be excluded.
              </p>
            </section>
            <section id="contact">
              <h2>8. Changes and contact</h2>
              <p>
                These terms and the source notes may be updated when features,
                data or providers change. The effective date identifies this
                version. Report errors, rights concerns or questions to{' '}
                <a href="mailto:az28140@icloud.com">az28140@icloud.com</a>,
                identifying the page or source involved.
              </p>
            </section>
          </article>
        </div>
      </main>
      <footer className="privacy-footer">
        <p>Calgary Neighbourhood Analytics</p>
        <div>
          <Link href="/">Return to the app</Link>
          <Link href="/privacy" prefetch={false}>
            Privacy policy
          </Link>
          <a href="#terms-content">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
