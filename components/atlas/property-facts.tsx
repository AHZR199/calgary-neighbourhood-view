import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { Property } from '@/lib/atlas/data';
import {
  saleHistoryAvailability,
  summarizeConstruction,
} from '@/lib/atlas/property-records';
import { CALGARY_RADON, RADON_LINKS } from '@/lib/atlas/radon';
import { solarDay } from '@/lib/atlas/solar';

export function PropertyFacts({
  property,
  onSource,
}: {
  property: Property;
  onSource: (id: string) => void;
}) {
  const construction =
    property.construction ??
    summarizeConstruction([property.yearBuilt], property.rollYear);
  const note =
    construction.status === 'conflicting-source-records'
      ? 'City parcel records for this account report different years. Confirm the building’s history directly.'
      : construction.status === 'unverified-source-value'
        ? 'The source year could not be verified as a plausible construction date.'
        : construction.status === 'missing'
          ? 'The City has not supplied a usable construction year for this account.'
          : 'City-recorded construction year. It does not establish the age of every structure or the date of renovations.';
  return (
    <section
      className="property-records"
      aria-label="Construction and sale records"
    >
      <div className="record-facts">
        <div>
          <span>Recorded year built</span>
          <strong>{construction.year ?? 'Unconfirmed'}</strong>
        </div>
        <div>
          <span>Assessment account</span>
          <strong>{property.rollNumber}</strong>
        </div>
      </div>
      <p className="quiet-note">
        {note} Source: {construction.sourceRollYear} assessment roll.
      </p>
      <button className="source-link" onClick={() => onSource('construction')}>
        <BookOpen size={13} /> Construction-year source{' '}
        <ArrowUpRight size={13} />
      </button>
      <details className="access-method sale-history">
        <summary>
          Last sale date & price <span>Unavailable</span>
        </summary>
        <p>{saleHistoryAvailability.explanation}</p>
        {saleHistoryAvailability.sources.map((source) => (
          <div className="sale-history-option" key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label} <ArrowUpRight size={13} />
            </a>
            <p className="quiet-note">{source.access}</p>
          </div>
        ))}
        <button className="source-link" onClick={() => onSource('sales')}>
          <BookOpen size={13} /> Availability & reuse review{' '}
          <ArrowUpRight size={13} />
        </button>
      </details>
    </section>
  );
}

export function HomeResearchNotes({ property }: { property: Property | null }) {
  const summer = property
    ? solarDay(
        `${property.rollYear}-06-21`,
        property.latitude,
        property.longitude,
      )
    : null;
  const winter = property
    ? solarDay(
        `${property.rollYear}-12-21`,
        property.latitude,
        property.longitude,
      )
    : null;
  const daylight = (minutes: number | null | undefined) =>
    minutes == null
      ? 'unavailable'
      : `${Math.floor(Math.round(minutes) / 60)}h ${Math.round(minutes) % 60}m`;
  return (
    <section className="report-context">
      <h3>Indoor radon & sunlight</h3>
      <p>
        Health Canada’s {CALGARY_RADON.surveyPeriod} Calgary CMA survey had{' '}
        {CALGARY_RADON.aboveGuideline} of {CALGARY_RADON.sampleSize} readings
        above 200 Bq/m³ ({CALGARY_RADON.percentageAbove.toFixed(1)}%). This
        dated regional sample cannot establish radon levels in this home or
        neighbourhood. Follow{' '}
        <a href={RADON_LINKS.testing}>current testing guidance</a>;{' '}
        <a href={CALGARY_RADON.sourceUrl}>survey source</a>. Contains
        information licensed under the{' '}
        <a href={CALGARY_RADON.licenceUrl}>Open Government Licence – Canada</a>.
      </p>
      {property && (
        <>
          <p>
            Modelled unobstructed daylight at this property in{' '}
            {property.rollYear}: June 21, {daylight(summer?.daylightMinutes)};
            December 21, {daylight(winter?.daylightMinutes)}. These are
            astronomical daylight durations, not direct-sun hours at the home.
            No window direction, trees, buildings or shading are inferred.
            Calculated from{' '}
            <a href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF">
              NOAA’s approximate equations
            </a>
            .
          </p>
          <p>
            Last sale date and price: unavailable from the reviewed free,
            redistributable sources. Assessment history is not sale history.
          </p>
        </>
      )}
      <p>
        See the website’s{' '}
        <a href="https://calgary-neighbourhood-analytics.vercel.app/terms">
          use and limitations
        </a>{' '}
        before relying on these records.
      </p>
    </section>
  );
}
