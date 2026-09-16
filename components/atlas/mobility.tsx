'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BusFront,
  TrainFront,
  Footprints,
  Navigation,
  ChevronRight,
} from 'lucide-react';
import type { Community, Property } from '@/lib/atlas/data';
import {
  DOWNTOWN,
  distanceLabel,
  nearbyEssentials,
  type AmenityCollection,
} from '@/lib/atlas/access';
import {
  distanceMetres,
  transitNearAddress,
  formatServiceTime,
  type TransitDataset,
  type ServiceDay,
} from '@/lib/atlas/transit';
interface AccessData {
  city: AmenityCollection;
  osm: AmenityCollection;
  transit: TransitDataset;
  supplement: AmenityCollection | null;
}
let cached: Promise<AccessData> | null = null;
function loadAccess(): Promise<AccessData> {
  if (!cached)
    cached = Promise.all(
      [
        '/data/access-amenities-city.geojson',
        '/data/access-amenities-osm.geojson',
        '/data/transit-citywide.json',
        '/data/access-supplement-osm.geojson',
      ].map(async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error('Location data unavailable');
        return r.json();
      }),
    )
      .then(([city, osm, transit, supplement]) => ({
        city: city as AmenityCollection,
        osm: osm as AmenityCollection,
        transit: transit as TransitDataset,
        supplement: supplement as AmenityCollection,
      }))
      .catch((e) => {
        cached = null;
        throw e;
      });
  return cached;
}
export function useMobility(
  community: Community | null,
  property: Property | null,
  serviceDay: ServiceDay = 'weekday',
) {
  const [data, setData] = useState<AccessData | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadAccess()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const lon = property?.longitude ?? community?.centroid[0],
    lat = property?.latitude ?? community?.centroid[1];
  const quadrant = community?.class === 'Quadrant';
  const result = useMemo(() => {
    if (!data || lat === undefined || lon === undefined || quadrant)
      return null;
    const supplemental = ['childcare', 'gyms', 'preschool', 'sports'].map(
      (category) => ({
        category,
        nearest: data.supplement?.features
          .filter((f) => f.properties.category === category)
          .map((f) => ({
            ...f.properties,
            id: String(f.id),
            distanceM: distanceMetres(
              lat,
              lon,
              f.geometry.coordinates[1],
              f.geometry.coordinates[0],
            ),
          }))
          .sort((a, b) => a.distanceM - b.distanceM)[0],
      }),
    );
    return {
      supplemental,
      essentials: nearbyEssentials([lon, lat], data.city, data.osm, true),
      transit: transitNearAddress(data.transit, lat, lon, { serviceDay }),
      downtown: distanceMetres(
        lat,
        lon,
        DOWNTOWN.coordinates[1],
        DOWNTOWN.coordinates[0],
      ),
    };
  }, [data, lat, lon, quadrant, serviceDay]);
  return { result, error, quadrant, retry: () => setAttempt((v) => v + 1) };
}
export function MobilityContext({
  community,
  property,
  compact = false,
  onMore,
}: {
  community: Community;
  property: Property | null;
  compact?: boolean;
  onMore?: () => void;
}) {
  const [day, setDay] = useState<ServiceDay>('weekday');
  const { result, error, quadrant, retry } = useMobility(
    community,
    property,
    day,
  );
  if (quadrant)
    return (
      <section className="mobility-section">
        <h3>Getting around</h3>
        <p className="quiet-note">
          Choose a neighbourhood or address for nearby transport, walkability
          and downtown distance. A single score would not describe an entire
          quadrant.
        </p>
      </section>
    );
  if (!result)
    return (
      <section className="mobility-section">
        <h3>Getting around</h3>
        <p className="quiet-note">
          {error
            ? 'Nearby services could not be loaded.'
            : 'Finding nearby services…'}
        </p>
        {error && (
          <button className="source-link" onClick={retry}>
            Try again
          </button>
        )}
      </section>
    );
  const { essentials, transit, downtown } = result;
  const station = transit.nearestTrainStations[0],
    stop = transit.nearestBusStops[0];
  return (
    <section className="mobility-section">
      <div className="section-line">
        <h3>Getting around</h3>
        {onMore && (
          <button onClick={onMore}>
            All nearby <ChevronRight size={14} />
          </button>
        )}
      </div>
      <p className="location-origin">
        {property
          ? 'From this property’s map point'
          : 'From the neighbourhood reference point'}{' '}
        · straight-line distances
      </p>
      <div className="access-scores">
        {essentials.score != null && (
          <div>
            <Footprints size={18} />
            <strong>
              {essentials.score}
              <small>/100</small>
            </strong>
            <span>Walkability estimate</span>
            <small>
              {essentials.count}/6 amenity types · {essentials.observedWeight}%
              weight covered
            </small>
          </div>
        )}
        <div>
          <BusFront size={18} />
          <strong>
            {transit.accessEstimate.value}
            <small>/100</small>
          </strong>
          <span>Transit access estimate</span>
          <small>Weekday proximity & scheduled service</small>
        </div>
      </div>
      <div className="downtown-distance">
        <Navigation size={19} />
        <div>
          <strong>{distanceLabel(downtown)} to downtown</strong>
          <span>Calgary Tower · direct distance, not road distance</span>
        </div>
      </div>
      {station && (
        <div className="access-place">
          <TrainFront size={18} />
          <div>
            <strong>{station.name}</strong>
            <span>
              Nearest CTrain platform ·{' '}
              {station.platforms
                .flatMap((p) => p.services)
                .map((s) => s.route.name)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(' · ')}
            </span>
          </div>
          <b>{distanceLabel(station.distanceMetres)}</b>
        </div>
      )}
      {stop && (
        <div className="access-place">
          <BusFront size={18} />
          <div>
            <strong>{stop.name}</strong>
            <span>
              Stop {stop.code || stop.id} ·{' '}
              {stop.services
                .map((s) => s.route.shortName)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(', ')}
            </span>
          </div>
          <b>{distanceLabel(stop.distanceMetres)}</b>
        </div>
      )}
      {!compact && (
        <>
          <div className="section-line">
            <h3>Routes within 800 m</h3>
            <select
              aria-label="Transit schedule day"
              value={day}
              onChange={(e) => setDay(e.target.value as ServiceDay)}
            >
              <option value="weekday">Weekday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
          <p className="quiet-note">
            Scheduled for {transit.referenceDates[day]}. Feed covers{' '}
            {transit.feedCoverage.from} to {transit.feedCoverage.to}; check live
            changes before travelling.
          </p>
          {transit.nearbyRoutes.length ? (
            transit.nearbyRoutes.map((item) => (
              <details key={item.route.id} className="route-record">
                <summary>
                  <span
                    className={`route-number ${item.route.mode === 'train' ? 'rail' : ''}`}
                  >
                    {item.route.shortName}
                  </span>
                  <span>
                    {item.route.name}
                    <small>
                      {distanceLabel(
                        Math.min(
                          ...item.directions.map((d) => d.distanceMetres),
                        ),
                      )}{' '}
                      · nearest served stop
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </summary>
                <div>
                  {item.directions.map((d) => (
                    <div className="route-direction" key={d.directionId}>
                      <strong>{d.headsigns.join(' / ')}</strong>
                      <span>
                        {d.stopName} · {distanceLabel(d.distanceMetres)}
                      </span>
                      <dl>
                        <div>
                          <dt>Scheduled boardings</dt>
                          <dd>{d.days[day].departures}/day</dd>
                        </div>
                        <div>
                          <dt>Midday, 10:00–16:00</dt>
                          <dd>
                            {d.days[day].middayDeparturesPerHour.toFixed(1)}
                            /hour
                          </dd>
                        </div>
                        <div>
                          <dt>First → last boarding</dt>
                          <dd>
                            {formatServiceTime(d.days[day].firstSecond)} →{' '}
                            {formatServiceTime(d.days[day].lastSecond)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </details>
            ))
          ) : (
            <p className="quiet-note">
              No routes for this service day were found within 800 m of this
              reference point. Nearby stops can have weekend-only or school
              service.
            </p>
          )}
          <a
            className="source-link"
            href="https://www.calgarytransit.com/"
            target="_blank"
            rel="noreferrer"
          >
            Trip planner & current service alerts <ArrowUpRight size={14} />
          </a>
        </>
      )}
      {essentials.breakdown.some((item) => item.nearest) && (
        <div className="section-line essentials-heading">
          <h3>Everyday essentials</h3>
          <span>Mapped nearby places</span>
        </div>
      )}
      <div className="essentials-list">
        {essentials.breakdown
          .filter((c) => c.nearest)
          .map((c) => (
            <div key={c.id}>
              <span>
                {c.label}
                <small>
                  {c.nearest
                    ? c.nearest.name ||
                      `Mapped ${c.nearest.subcategory.replaceAll('_', ' ')}`
                    : null}
                </small>
              </span>
              {c.nearest ? (
                <a
                  href={
                    c.nearest.sourceUrl ||
                    `https://data.calgary.ca/d/${c.nearest.sourceId}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${c.label}: ${c.nearest.name || 'mapped location'}, ${distanceLabel(c.nearest.distanceM)}, source`}
                >
                  {distanceLabel(c.nearest.distanceM)}
                  <ArrowUpRight size={12} />
                </a>
              ) : null}
            </div>
          ))}
      </div>
      <div className="essentials-list supplemental-list">
        {result.supplemental
          .filter(
            (c) =>
              c.nearest &&
              (!compact || ['childcare', 'gyms'].includes(c.category)),
          )
          .map((c) => (
            <div key={c.category}>
              <span>
                {
                  {
                    childcare: 'Child care centre',
                    gyms: 'Gym / fitness centre',
                    preschool: 'Preschool / kindergarten',
                    sports: 'Sports & recreation',
                  }[c.category]
                }
                <small>
                  {c.nearest
                    ? c.nearest.name ||
                      `Mapped ${c.nearest.subcategory.replaceAll('_', ' ')}`
                    : null}
                </small>
              </span>
              {c.nearest ? (
                <a
                  href={c.nearest.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Nearest ${c.category}: ${c.nearest.name || 'mapped location'}, ${distanceLabel(c.nearest.distanceM)}, source`}
                >
                  {distanceLabel(c.nearest.distanceM)}
                  <ArrowUpRight size={12} />
                </a>
              ) : null}
            </div>
          ))}
      </div>
      <p className="quiet-note">
        Nearest mapped locations; completeness and current opening are not
        guaranteed. Child care and gyms do not change the walkability estimate.
      </p>
      <a
        className="source-link"
        href="https://childcare.alberta.ca/childcaresearch"
        target="_blank"
        rel="noreferrer"
      >
        Check child care licensing & inspection records{' '}
        <ArrowUpRight size={13} />
      </a>
      <details className="reading-detail access-method">
        <summary>
          How these estimates work <ChevronRight size={14} />
        </summary>
        <p>
          Walkability here estimates proximity to six types of everyday
          destination. It does not measure sidewalks, crossings, hills, safe
          routes, opening hours or accessibility. Park points may not mark
          entrances. School proximity does not establish eligibility.
        </p>
        <p>
          Each observed category scores 100 within 400 m, declining to 0 at 2
          km. Weights: groceries 25%, convenience 5%, parks 20%, schools 15%,
          healthcare 20%, libraries/community 15%. Missing categories are
          excluded, not scored zero; at least four categories and 70% of total
          weight must be observed. Compare coverage alongside scores.
        </p>
        <p>
          Transit uses {transit.accessEstimate.referenceDate} schedules:
          proximity {transit.accessEstimate.components.proximity}/25,
          distance-weighted midday service{' '}
          {transit.accessEstimate.components.scheduledService}/60, route choice{' '}
          {transit.accessEstimate.components.routeChoice}/15. Distances fade
          from full weight at 200 m to none at 800 m. Service saturates at 12
          departures/hour; choice at four routes. Each route counts once, using
          its stronger direction.
        </p>
        <p>
          These are independent Neighbourhood View estimates, not official
          ratings or licensed Walk Score® or Transit Score® results. A
          neighbourhood reference point does not describe every home in that
          area.
        </p>
        <a href="/data/access-heuristic.json" target="_blank" rel="noreferrer">
          Download walkability methodology <ArrowUpRight size={12} />
        </a>
      </details>
      <p className="data-attribution">
        City open data & Calgary Transit ·{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>{' '}
        ·{' '}
        <a href="/data/access-amenities-osm.geojson" download>
          OSM essentials (ODbL)
        </a>{' '}
        ·{' '}
        <a href="/data/access-supplement-osm.geojson" download>
          Child care & fitness extract (ODbL)
        </a>
        . Captured 14 September 2026.
      </p>
    </section>
  );
}

export function MobilityReport({
  community,
  property,
  comparison = false,
}: {
  community: Community | null;
  property: Property | null;
  comparison?: boolean;
}) {
  const { result } = useMobility(community, property);
  if (!result) return null;
  const { essentials, transit, downtown, supplemental } = result;
  return (
    <div className="mobility-report">
      {!comparison && <h3>Getting around & everyday places</h3>}
      <p className="quiet-note">
        {property ? 'Property map point' : 'Neighbourhood reference point'} ·
        straight-line distances.
      </p>
      <dl>
        {essentials.score != null && (
          <div>
            <dt>Walkability estimate</dt>
            <dd>
              {essentials.score}/100 · {essentials.count}/6 types,{' '}
              {essentials.observedWeight}% weight
            </dd>
          </div>
        )}
        <div>
          <dt>Weekday transit access</dt>
          <dd>{transit.accessEstimate.value}/100</dd>
        </div>
        <div>
          <dt>Downtown · Calgary Tower</dt>
          <dd>{distanceLabel(downtown)}</dd>
        </div>
        {!comparison && (
          <>
            {transit.nearestTrainStations[0] && (
              <div>
                <dt>Nearest train</dt>
                <dd>
                  {transit.nearestTrainStations[0].name} ·{' '}
                  {distanceLabel(
                    transit.nearestTrainStations[0].distanceMetres,
                  )}
                </dd>
              </div>
            )}
            {transit.nearestBusStops[0] && (
              <div>
                <dt>Nearest bus stop</dt>
                <dd>
                  {transit.nearestBusStops[0].name} ·{' '}
                  {distanceLabel(transit.nearestBusStops[0].distanceMetres)}
                </dd>
              </div>
            )}
            {[
              ...essentials.breakdown
                .filter((c) => c.id === 'groceries')
                .map((c) => ({ label: 'Grocery store', nearest: c.nearest })),
              ...supplemental
                .filter((c) => ['childcare', 'gyms'].includes(c.category))
                .map((c) => ({
                  label: c.category === 'childcare' ? 'Child care' : 'Gym',
                  nearest: c.nearest,
                })),
            ]
              .filter((c) => c.nearest)
              .map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>
                    {c.nearest
                      ? `${c.nearest.name || 'Mapped location'} · ${distanceLabel(c.nearest.distanceM)}`
                      : null}
                  </dd>
                </div>
              ))}
          </>
        )}
      </dl>
      <p className="quiet-note">
        Independent estimates; compare category coverage. Transit schedule:{' '}
        {transit.accessEstimate.referenceDate}. Nearby sources: City open data &
        © OpenStreetMap contributors (ODbL). Licensing, eligibility and opening
        require confirmation. Full credits and download links follow this
        report.
      </p>
    </div>
  );
}

export function ReportAttribution() {
  const [reportOrigin, setReportOrigin] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- use the current host for printed links after hydration
    setReportOrigin(window.location.origin);
  }, []);
  return (
    <div className="report-attribution" style={{ overflowWrap: 'anywhere' }}>
      <p className="quiet-note">
        Contains information licensed under the Open Government Licence – City
        of Calgary:{' '}
        <a href="https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/">
          https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/
        </a>
        . Air observations: Environment and Climate Change Canada.
      </p>
      <p className="quiet-note">
        Nearby-place data, where shown: © OpenStreetMap contributors —{' '}
        <a href="https://www.openstreetmap.org/copyright">
          https://www.openstreetmap.org/copyright
        </a>
        . Database licence: ODbL 1.0 —{' '}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/">
          https://opendatacommons.org/licenses/odbl/1-0/
        </a>
        . The OSM-derived databases are available at:{' '}
        <a href={`${reportOrigin}/data/access-amenities-osm.geojson`}>
          {reportOrigin}/data/access-amenities-osm.geojson
        </a>
        {' · '}
        <a href={`${reportOrigin}/data/access-supplement-osm.geojson`}>
          {reportOrigin}/data/access-supplement-osm.geojson
        </a>
        .
      </p>
    </div>
  );
}
