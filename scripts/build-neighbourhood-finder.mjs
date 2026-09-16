// node --import tsx scripts/build-neighbourhood-finder.mjs --source-root ../../work/data
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DOWNTOWN } from '../lib/atlas/access.ts';
import { containsPoint } from '../lib/atlas/geography.ts';
import { buildingLookupPoint } from '../lib/atlas/map-selection.ts';
import { finderProximityScore } from '../lib/atlas/neighbourhood-finder.ts';
import { distanceMetres, transitNearAddress } from '../lib/atlas/transit.ts';

const { values } = parseArgs({
  options: { 'source-root': { type: 'string' }, output: { type: 'string' } },
});
if (!values['source-root'])
  throw new Error(
    'Provide --source-root with the reviewed assessment archives.',
  );
const stats = JSON.parse(
  execFileSync(
    'python3',
    [
      fileURLToPath(new URL('./finder-assessment-stats.py', import.meta.url)),
      '--source-root',
      values['source-root'],
    ],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  ),
);
const inputHashes = {};
const readData = async (name) => {
  const bytes = await readFile(
    new URL(`../public/data/${name}`, import.meta.url),
  );
  inputHashes[name] = createHash('sha256').update(bytes).digest('hex');
  return JSON.parse(bytes.toString('utf8'));
};
const [
  communities,
  summary,
  city,
  osm,
  amenityCoverage,
  schools,
  transit,
  quadrants,
] = await Promise.all(
  [
    'communities.geojson',
    'assessment-summary.json',
    'access-amenities-city.geojson',
    'access-amenities-osm.geojson',
    'access-amenities-coverage.json',
    'schools.geojson',
    'transit-citywide.json',
    'quadrants.geojson',
  ].map(readData),
);
const citySource = 'https://data.calgary.ca/d/';
const amenities = [...city.features, ...osm.features];
const nearestFeature = (point, features) => {
  let nearest = null;
  for (const feature of features) {
    const [lon, lat] = feature.geometry.coordinates;
    if (!Number.isFinite(lon) || !Number.isFinite(lat))
      throw new Error('Invalid source point.');
    const distanceM = distanceMetres(point[1], point[0], lat, lon);
    if (!nearest || distanceM < nearest.distanceM)
      nearest = {
        name: feature.properties.name || 'Unnamed mapped destination',
        distanceM,
        sourceUrl:
          feature.properties.sourceUrl ||
          `${citySource}${feature.properties.sourceId}`,
      };
  }
  return nearest
    ? { ...nearest, distanceM: Math.round(nearest.distanceM) }
    : null;
};
const nearestAmenity = (point, category) =>
  nearestFeature(
    point,
    amenities.filter((feature) => feature.properties.category === category),
  );
const usableSchools = schools.features.filter(
  (feature) =>
    feature.properties.postSecondary !== true &&
    !feature.properties.locationNote,
);
const profiles = communities.features
  .filter((feature) => feature.properties.class === 'Residential')
  .map((feature) => {
    const area = feature.properties;
    const statsRow = stats.communities[area.comm_code];
    const aggregate = summary[area.comm_code];
    if (
      Boolean(statsRow) !== Boolean(aggregate) ||
      (aggregate &&
        (statsRow.assessment.count !== aggregate.count ||
          statsRow.assessment.median !== aggregate.median))
    )
      throw new Error(`Assessment summary changed for ${area.comm_code}.`);
    const point = containsPoint(area.centroid, feature.geometry)
      ? area.centroid
      : buildingLookupPoint(feature.geometry, area.centroid);
    if (!point || !containsPoint(point, feature.geometry))
      throw new Error(`No interior reference point for ${area.comm_code}.`);
    const mobility = transitNearAddress(transit, point[1], point[0], {
      busLimit: 1,
      railLimit: 1,
    });
    const grocery = nearestAmenity(point, 'groceries');
    const healthcare = nearestAmenity(point, 'healthcare');
    const community = nearestAmenity(point, 'community');
    const components = [
      [grocery, 50],
      [healthcare, 30],
      [community, 20],
    ].filter(([place]) => place !== null);
    const servicesCoverage = components.reduce(
      (sum, [, weight]) => sum + weight,
      0,
    );
    const servicesScore =
      servicesCoverage >= 70
        ? Math.round(
            components.reduce(
              (sum, [place, weight]) =>
                sum + finderProximityScore(place.distanceM) * weight,
              0,
            ) / servicesCoverage,
          )
        : null;
    const bus = mobility.nearestBusStops[0];
    const train = mobility.nearestTrainStations[0];
    const quadrantAccounts = statsRow?.quadrantAccounts || {};
    const foundQuadrants = Object.keys(quadrantAccounts);
    const pointQuadrants = quadrants.features
      .filter((q) => containsPoint(point, q.geometry))
      .map((q) => q.properties.comm_code.replace('Q_', ''));
    return {
      code: area.comm_code,
      name: area.label,
      sector: area.sector,
      referencePoint: point,
      referencePointMethod: containsPoint(area.centroid, feature.geometry)
        ? 'Bundled neighbourhood reference point inside its boundary'
        : 'Interior point inside the neighbourhood boundary',
      quadrants: (foundQuadrants.length
        ? foundQuadrants
        : pointQuadrants
      ).sort(),
      quadrantAccounts,
      assessment: statsRow?.assessment || null,
      construction: statsRow?.construction || {
        medianYear: null,
        knownCount: 0,
        accountCount: 0,
      },
      downtownKm:
        Math.round(
          distanceMetres(
            point[1],
            point[0],
            DOWNTOWN.coordinates[1],
            DOWNTOWN.coordinates[0],
          ) / 10,
        ) / 100,
      transitScore: mobility.accessEstimate.value,
      weekdayRoutesWithin800m: mobility.nearbyRoutes.length,
      servicesScore,
      servicesCoverage,
      nearest: {
        grocery,
        healthcare,
        community,
        park: nearestAmenity(point, 'parks'),
        school: nearestFeature(point, usableSchools),
        ...Object.fromEntries(
          ['elementary', 'juniorHigh', 'high'].map((level) => [
            level,
            nearestFeature(
              point,
              usableSchools.filter((school) =>
                school.properties.levels.includes(level),
              ),
            ),
          ]),
        ),
        train: train
          ? {
              name: train.name,
              distanceM: train.distanceMetres,
              sourceUrl: transit.metadata.source.url,
            }
          : null,
        bus: bus
          ? {
              name: bus.name,
              distanceM: bus.distanceMetres,
              sourceUrl: transit.metadata.source.url,
            }
          : null,
      },
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));
const data = {
  schemaVersion: 1,
  metadata: {
    builtFrom: 'Reviewed source snapshots; deterministic offline generation',
    profileCount: profiles.length,
    assessmentYear: 2026,
    assessmentRetrievedAt: stats.metadata.retrievedAt,
    transitReferenceDate: transit.metadata.coverage.referenceDates.weekday,
    sourceDates: {
      assessment: stats.metadata.sourceRowsUpdatedAt,
      amenities: amenityCoverage.capturedAt,
      schools: schools.metadata.source.sourceRowsUpdatedAt,
      transit: transit.metadata.capturedAt,
    },
    assessmentAudit: stats.metadata,
    method: {
      cohort:
        'All City boundary records classified Residential. Accounts use the same verified 2026 Residential-class, positive-value, land-and-improvement, R-use-code cohort as the app assessment summaries. Account counts are not dwelling counts.',
      budget:
        'Priority score = min(100, 100 × entered assessment budget / neighbourhood median assessment). A strict budget limit tests the median only, not asking prices or availability. The middle-half range is p25 to p75 of unique accounts, not an estimated listing-price range.',
      quantiles: stats.metadata.quantile,
      quadrants: `${stats.metadata.quadrants} Any matching account quadrant satisfies the quadrant filter. Communities without eligible accounts use their reference-point quadrant and show no assessment values.`,
      referencePoints:
        'Distances use one labelled reference point inside each neighbourhood boundary. They are not averages of homes, walking routes or commute estimates. The points follow existing neighbourhood context; an outside centroid is replaced with an interior point.',
      services:
        'A separate everyday-amenity proximity index: nearest mapped grocery 50%, healthcare 30%, library/community place 20%. Each distance earns 100 at 400 m or less, declines linearly to zero at 2 km, and stays zero beyond. Missing categories are omitted, with at least 70% component weight required. Parks and schools are separate priorities, avoiding double counting.',
      parksAndSchools:
        'The same 400 m to 2 km distance scale, applied to the nearest mapped park representative point or published school point. School grade group follows the visitor choice. No school quality, catchment or eligibility inference. The reviewed Chinook Learning Services address/point discrepancy is excluded from proximity scoring; its directory record remains unchanged and visible.',
      transit:
        'The app’s existing weekday scheduled-service proximity index: 25 proximity, 60 scheduled midday service, 15 route choice; nearest stops per route/direction avoid repeated-stop inflation. No planned Green Line service is scored.',
      downtown:
        '100 minus straight-line kilometres to Calgary Tower divided by 30 and multiplied by 100, clamped at zero. The optional hard limit uses the stored straight-line distance rounded to 0.01 km, before rounding for result-card display.',
      ranking:
        'Weighted mean of selected known criterion scores. Unknown values are omitted from numerator and denominator and weighted coverage is shown; an overall score requires at least 70% selected weight. Budget priority is inactive until a budget is entered. Ties use coverage, then name and code. No selected priorities means no fabricated overall score.',
      construction:
        'Context only: account construction years must be integers 1801–2026; conflicting valid years remain unknown. Median year describes accounts, not every structure, condition or renovations. It is not a ranking criterion.',
      privacy:
        'All matching happens in the browser over this static derivative. Preference entries need no external query or account.',
    },
    limitations: [
      'Assessment context is not a home search, transaction-price estimate, lender affordability assessment or promise of homes for sale.',
      'One neighbourhood point cannot describe every street. Confirm the address-level view for shortlisted homes.',
      'OSM and City destinations can be incomplete, dated, moved or represented by an office or non-entrance point. Proximity scores describe this mapped evidence only.',
      'School proximity is separate from quality, program choice, capacity and eligibility; consult official school finders.',
      'No resident demographic, political, historical crime or regional radon variable is used to recommend or exclude neighbourhoods.',
      'Home-type matching is not offered because the source use-code classification dictionary has not been verified.',
    ],
    sources: [
      {
        id: 'assessments',
        title: '2026 City assessment accounts',
        url: 'https://data.calgary.ca/d/4bsw-nn7w',
        attribution:
          'Contains information licensed under the Open Government Licence – City of Calgary.',
      },
      {
        id: 'boundaries',
        title: 'City community boundaries',
        url: 'https://data.calgary.ca/d/surr-xmvs',
        attribution:
          'Contains information licensed under the Open Government Licence – City of Calgary.',
      },
      {
        id: 'transit',
        title: 'Calgary Transit scheduled services',
        url: transit.metadata.source.url,
        attribution: transit.metadata.source.attribution,
      },
      {
        id: 'schools',
        title: 'City school location registry',
        url: schools.metadata.source.url,
        attribution: schools.metadata.source.attribution,
      },
      {
        id: 'essentials',
        title: 'OpenStreetMap everyday destinations',
        url: 'https://www.openstreetmap.org/copyright',
        licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
        attribution:
          '© OpenStreetMap contributors. Contains a derivative of OSM data under ODbL; original extracts and their provenance remain downloadable.',
      },
      {
        id: 'parks',
        title: 'City parks, libraries and community-service points',
        url: 'https://data.calgary.ca/d/kami-qbfh',
        attribution:
          'Contains information licensed under the Open Government Licence – City of Calgary.',
      },
    ],
    inputHashes: Object.fromEntries(
      Object.entries(inputHashes).sort(([a], [b]) => a.localeCompare(b)),
    ),
  },
  profiles,
};
const encoded = `${JSON.stringify(data)}\n`;
await writeFile(
  values.output ||
    new URL('../public/data/neighbourhood-finder.json', import.meta.url),
  encoded,
);
console.log(
  JSON.stringify(
    {
      profiles: profiles.length,
      withAssessment: profiles.filter((p) => p.assessment).length,
      bytes: Buffer.byteLength(encoded),
      sha256: createHash('sha256').update(encoded).digest('hex'),
    },
    null,
    2,
  ),
);
