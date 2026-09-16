import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { Property } from '@/lib/atlas/data';
import { summarizeConstruction } from '@/lib/atlas/property-records';
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
  return (
    <section className="property-records" aria-label="Property records">
      <div className="record-facts">
        {construction.year != null && (
          <div>
            <span>Recorded year built</span>
            <strong>{construction.year}</strong>
          </div>
        )}
        <div>
          <span>Assessment account</span>
          <strong>{property.rollNumber}</strong>
        </div>
      </div>
      {construction.year != null && (
        <p className="quiet-note">
          City-recorded construction year. It does not establish the age of
          every structure or the date of renovations. Source:{' '}
          {construction.sourceRollYear} assessment roll.
        </p>
      )}
      <button className="source-link" onClick={() => onSource('construction')}>
        <BookOpen size={13} /> Construction-year source{' '}
        <ArrowUpRight size={13} />
      </button>
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
  const daylight = (minutes: number) =>
    `${Math.floor(Math.round(minutes) / 60)}h ${Math.round(minutes) % 60}m`;
  return (
    <section className="report-context">
      <h3>{property ? 'Indoor radon & sunlight' : 'Indoor radon'}</h3>
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
      {property &&
        summer?.daylightMinutes != null &&
        winter?.daylightMinutes != null && (
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
        )}
      <p>
        See the website’s{' '}
        <a href="https://calgaryneighbourhoodview.com/terms">
          use and limitations
        </a>{' '}
        before relying on these records.
      </p>
    </section>
  );
}
