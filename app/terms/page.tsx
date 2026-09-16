import type { Metadata } from 'next';
import Link from 'next/link';
import '../privacy/privacy.css';

export const metadata: Metadata = {
  title: 'Use & limitations | Calgary Neighbourhood View',
  description:
    'Terms of use, source rights and the limits of property records, neighbourhood matching, environmental context and map illustrations.',
};

const contents = [
  ['project', 'About this service'],
  ['property', 'Property records and estimates'],
  ['radon', 'Radon and environmental context'],
  ['sunlight', 'Sun direction and orientation'],
  ['schools', 'Schools and distances'],
  ['finder', 'Neighbourhood matching'],
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
          Calgary Neighbourhood View
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
              <p>
                Map selections use public assessment parcel geometry, which can
                differ from visible building footprints. A building may contain
                several units or assessment accounts. Confirm the displayed
                address and unit; a map selection does not establish legal
                boundaries, ownership or a home’s availability for sale.
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
            <section id="schools">
              <h2>5. Schools and distances</h2>
              <p>
                School lists show published locations and grade groups, with
                straight-line distances from the selected property or the
                labelled area reference point. These are not walking routes,
                travel times or school-bus eligibility. An area filter uses
                civic neighbourhood or quadrant boundaries, not school
                attendance zones.
              </p>
              <p>
                Nearby schools do not establish designated-school placement,
                admission, capacity, transportation or program availability.
                Public, Catholic, francophone, charter and independent schools
                may have different eligibility rules. Verify the exact address,
                grade and program with the school or board using its official
                finder. The app does not rank school quality or collect student
                information. Missing grade groups remain unclassified.
              </p>
            </section>
            <section id="finder">
              <h2>6. Neighbourhood matching</h2>
              <p>
                The finder compares 223 City Residential-class neighbourhood
                profiles; 219 have eligible assessment summaries. Its budget
                context uses 2026 assessed values across mixed residential
                property types. A median or middle-half range is not an asking
                price, available listing, sale-price prediction or affordability
                approval. A required budget limit tests the neighbourhood
                median, not every home. Verified home-type matching is not
                available in this extract.
              </p>
              <p>
                Match scores are transparent weighted comparisons of the
                priorities you select. Missing measures are omitted and coverage
                is shown; at least 70% of your selected priority weight must
                have data for an overall score. Required location and budget
                limits are applied separately. Alternatives identify unmet
                limits, and widening a limit requires your choice. The score is
                not confidence, a quality rating or a guarantee that an area
                will suit you.
              </p>
              <p>
                Distances and transit context use one labelled neighbourhood
                reference point. They are not household averages, route lengths
                or commute times. School proximity does not establish quality or
                admission. Demographics, crime, political information, resident
                characteristics and regional radon are not used to rank or
                exclude neighbourhoods. Confirm shortlisted homes at their exact
                addresses and with the original sources.
              </p>
            </section>
            <section id="rights">
              <h2>7. Sources and reuse</h2>
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
              <p>
                The{' '}
                <a href="/data/neighbourhood-finder.json">
                  downloadable finder profiles
                </a>{' '}
                include OSM-derived amenity information under the{' '}
                <a href="https://opendatacommons.org/licenses/odbl/1-0/">
                  Open Database License
                </a>
                , credited to OpenStreetMap contributors. Identified City
                information retains its Open Government Licence – City of
                Calgary attribution. Preserve the relevant notices, provenance
                and applicable derivative-database obligations in further
                distributions; these terms do not replace the source licences.
              </p>
              <p>
                The map includes original illustrations of Calgary Tower, the
                Saddledome, the Bow, Peace Bridge, Wonderland, TELUS Sky,
                Central Library, Historic City Hall with Municipal Building
                context, and Canada Olympic Park. Published dimensions are used
                where verified; other heights, smaller details and placement are
                approximate. The ski jumps are shown as heritage structures,
                with compressed landing relief on a flat map. They are
                decommissioned; the illustration does not establish current
                access or a complete inventory of structures still standing. The{' '}
                <a href="/data/landmark-footprints.geojson">
                  footprint extract
                </a>{' '}
                retains OpenStreetMap attribution and{' '}
                <a href="https://opendatacommons.org/licenses/odbl/1-0/">
                  ODbL
                </a>{' '}
                obligations; identified City inputs retain their separate
                licence. No third-party model, blueprint, photograph, texture,
                logo, City crest or Olympic symbol is bundled. These are not
                surveys, engineering models or shadow assessments. Software
                licences still apply.
              </p>
              <p>
                Wonderland (2012) is a sculpture by{' '}
                <a href="https://jaumeplensa.com/works-and-projects/public-space/wonderland-2012">
                  Jaume Plensa
                </a>
                . Its map illustration uses independently made, simplified head
                profiles and wire geometry; it is not an artist-supplied mesh or
                exact reproduction. Original code and attribution do not confer
                rights in the underlying artwork or architecture. Canada&apos;s{' '}
                <a href="https://laws-lois.justice.gc.ca/eng/acts/C-42/section-32.2.html">
                  Copyright Act, section 32.2(1)(b)
                </a>
                , addresses specified forms of pictorial reproduction. This
                project does not treat that exception as blanket permission to
                distribute or adapt 3D meshes. No universal copyright, trademark
                or publication clearance, or artist, architect, owner or
                operator endorsement, is claimed.
              </p>
            </section>
            <section id="use">
              <h2>8. Using the service</h2>
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
              <h2>9. Availability and responsibility</h2>
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
              <h2>10. Changes and contact</h2>
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
        <p>Calgary Neighbourhood View</p>
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
