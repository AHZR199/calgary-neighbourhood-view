'use client';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
export function AboutView({
  onBack,
  onSources,
  onClearLocalData,
}: {
  onBack: () => void;
  onSources: () => void;
  onClearLocalData: () => void;
}) {
  return (
    <section
      id="workspace-content"
      tabIndex={-1}
      className="workspace-view about-view"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">CALGARY NEIGHBOURHOOD ANALYTICS</span>
          <h1>About the project</h1>
          <p>
            Public records for people researching a home or neighbourhood in
            Calgary.
          </p>
        </div>
        <button className="secondary-button" onClick={onBack}>
          Explore Calgary <ArrowRight size={16} />
        </button>
      </div>
      <div className="about-layout">
        <article className="about-story">
          <div className="maker-credit">
            <span>Made by</span>
            <strong>Abdullah Zubair</strong>
            <a
              href="https://www.linkedin.com/in/zubair-a-/"
              target="_blank"
              rel="noreferrer"
            >
              Connect on LinkedIn <ArrowUpRight size={15} />
            </a>
            <a
              href="https://github.com/AHZR199/calgary-neighbourhood-analytics"
              target="_blank"
              rel="noreferrer"
            >
              Source on GitHub <ArrowUpRight size={15} />
            </a>
          </div>
        </article>
        <div className="about-principles">
          <article>
            <h2>What you can explore</h2>
            <p>
              Explore neighbourhoods, quadrants and public property accounts on
              a 3D map. Save a shortlist on your device, compare places and
              create a printable research brief.
            </p>
          </article>
          <article>
            <h2>Sources and limitations</h2>
            <p>
              Sources, dates and coverage sit alongside the data. Estimates show
              their assumptions; unavailable information stays unavailable.
              Public service pipes do not identify private plumbing, and an
              assessment is not a sale price.
            </p>
            <button className="source-link" onClick={onSources}>
              Sources, methods & reuse terms <ArrowUpRight size={15} />
            </button>
          </article>
          <article>
            <h2>Independence and privacy</h2>
            <p>Made by Abdullah Zubair. Operated from Alberta, Canada.</p>
            <p>
              Calgary Neighbourhood Analytics is not affiliated with or endorsed
              by the City of Calgary, Calgary Police Service, a political party
              or a real estate brokerage. It is a research aid, not a valuation,
              inspection, insurance decision or professional advice.
            </p>
            <p>
              Saved places and checklists stay in this browser until you remove
              them or clear this site’s browser data. They are not sent to an
              account or saved-place database. This personal, noncommercial demo
              has no accounts, lead forms, advertising or marketing analytics.
            </p>
            <p>
              Hosting and map providers process connection information to
              deliver the service, including outside Canada. Clearing browser
              data does not remove provider logs. Our privacy policy explains
              the data involved, retention, providers and your choices.
            </p>
            <p>
              <Link href="/privacy" prefetch={false}>
                Read the privacy policy
              </Link>
              {' · '}
              <a href="mailto:az28140@icloud.com">az28140@icloud.com</a>
            </p>
            <button className="source-link" onClick={onClearLocalData}>
              Clear saved places & checklists from this browser
            </button>
          </article>
        </div>
      </div>
      <div className="about-bottom">
        <span>Data and map credits</span>
        <p>
          Contains information licensed under the{' '}
          <a
            href="https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/"
            target="_blank"
            rel="noreferrer"
          >
            Open Government Licence – City of Calgary
          </a>
          .
        </p>
        <p>
          Map data © OpenStreetMap contributors · OpenMapTiles · OpenFreeMap.
          Individual data and software terms apply; see Sources for the reuse
          register and notices.
        </p>
      </div>
    </section>
  );
}
