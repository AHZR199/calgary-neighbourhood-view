// rebuild from the reviewed City extract; keep its retrieval receipt beside the raw rows
// node --import tsx scripts/build-schools.mjs --source rows.json --metadata metadata.json --receipt receipt.json
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import {
  schoolAreaCodes,
  schoolLevels,
  schoolWebsite,
} from '../lib/atlas/schools.ts';

const { values } = parseArgs({
  options: {
    source: { type: 'string' },
    metadata: { type: 'string' },
    receipt: { type: 'string' },
    websites: { type: 'string' },
    output: { type: 'string' },
  },
});
if (!values.source || !values.metadata || !values.receipt)
  throw new Error('Provide --source, --metadata and --receipt.');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sourceBytes = await readFile(values.source);
const rows = JSON.parse(sourceBytes.toString('utf8'));
const catalogue = await readJson(values.metadata);
const receipt = await readJson(values.receipt);
const websites = values.websites ? await readJson(values.websites) : null;
if (
  websites &&
  (websites.metadata.citySourceSha256 !== receipt.rawSha256 ||
    websites.metadata.licenceUrl !== 'https://open.alberta.ca/licence' ||
    websites.metadata.sourceUrl !==
      'https://education.alberta.ca/media/1626669/authority_and_school.xlsx')
)
  throw new Error(
    'School website matches do not belong to this reviewed source.',
  );
const websitesById = new Map(
  websites?.matches.map((match) => [match.cityGlobalId, match]) || [],
);
if (websites && websitesById.size !== websites.matches.length)
  throw new Error('Duplicate school website matches.');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (
  digest(sourceBytes) !== receipt.rawSha256 ||
  rows.length !== receipt.count ||
  !receipt.sourceStableDuringFetch
)
  throw new Error(
    'School extract does not match its complete reviewed receipt.',
  );
if (
  catalogue.id !== 'fd9t-tdn2' ||
  !JSON.stringify(
    catalogue.metadata?.custom_fields?.['License/Attribution'],
  ).includes('u45n-7awa')
)
  throw new Error('Review the school dataset and licence before publication.');
const areaPaths = ['communities.geojson', 'quadrants.geojson'];
const areas = { type: 'FeatureCollection', features: [] };
const boundaryHashes = {};
for (const name of areaPaths) {
  const bytes = await readFile(
    new URL(`../public/data/${name}`, import.meta.url),
  );
  areas.features.push(...JSON.parse(bytes.toString('utf8')).features);
  boundaryHashes[name] = digest(bytes);
}
const clean = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const locationReviews = new Map([
  [
    '{DF794E74-08FB-4D8D-8CF6-F40C501551EA}',
    {
      name: 'Chinook Learning Services',
      address: '2336 53 Ave SW',
      coordinates: [-114.0654399, 51.0685884],
      note: 'The City publishes a southwest address with a map point in Tuxedo Park. Confirm the current campus before using this distance.',
      reviewedAt: '2026-09-16',
    },
  ],
]);
const seen = new Set();
const features = rows
  .map((row) => {
    const id = clean(row.global_id);
    if (!id || seen.has(id)) throw new Error('Missing or duplicate school ID.');
    seen.add(id);
    const point = row.point?.coordinates;
    if (
      row.point?.type !== 'Point' ||
      !Array.isArray(point) ||
      point.length !== 2 ||
      !point.every(Number.isFinite) ||
      point[0] < -116 ||
      point[0] > -112 ||
      point[1] < 50 ||
      point[1] > 52
    )
      throw new Error(`Review school geometry for ${id}.`);
    if (!clean(row.name)) throw new Error('School name missing.');
    const locationReview = locationReviews.get(id);
    if (
      locationReview &&
      (row.name !== locationReview.name ||
        row.address_ab !== locationReview.address ||
        point.some((value, index) => value !== locationReview.coordinates[index]))
    )
      throw new Error(`Review the existing school location note for ${id}.`);
    const level = schoolLevels(row);
    const website = websitesById.get(id);
    if (
      website &&
      (website.citySourceRowId !== row.source_row_id ||
        website.name !== row.name ||
        website.address !== row.address_ab)
    )
      throw new Error(
        'A school website match failed its identity or URL check.',
      );
    const areaCodes = schoolAreaCodes(point, areas);
    const communities = areaCodes.filter((code) => !code.startsWith('Q_'));
    const quadrants = areaCodes.filter((code) => code.startsWith('Q_'));
    return {
      type: 'Feature',
      id,
      properties: {
        id,
        name: clean(row.name),
        address: clean(row.address_ab),
        locationNote: locationReview?.note || null,
        board: clean(row.board),
        grades: clean(row.grades),
        ...level,
        website: website ? schoolWebsite(website.website) : null,
        websiteSourceUrl:
          website && schoolWebsite(website.website)
            ? websites.metadata.sourceUrl
            : null,
        sourceUrl: 'https://data.calgary.ca/d/fd9t-tdn2',
        communityCode: communities.length === 1 ? communities[0] : null,
        quadrant: quadrants.length === 1 ? quadrants[0].slice(2) : null,
        areaCodes,
      },
      geometry: { type: 'Point', coordinates: point },
    };
  })
  .sort((a, b) => a.properties.id.localeCompare(b.properties.id));
const schools = features.filter((feature) => !feature.properties.postSecondary);
if ([...websitesById.keys()].some((id) => !seen.has(id)))
  throw new Error('School website lookup contains an unknown City record.');
if ([...locationReviews.keys()].some((id) => !seen.has(id)))
  throw new Error('Review the location note for a removed school record.');
const data = {
  type: 'FeatureCollection',
  metadata: {
    schemaVersion: 1,
    source: {
      publisher: 'City of Calgary',
      title: 'Schools',
      url: 'https://data.calgary.ca/d/fd9t-tdn2',
      metadataUrl: receipt.metadataUrl,
      retrievedAt: receipt.retrievedAt,
      sourceRowsUpdatedAt: receipt.sourceRowsUpdatedAt,
      licenceUrl:
        'https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/',
      attribution:
        'Contains information licensed under the Open Government Licence – City of Calgary.',
      rawSha256: receipt.rawSha256,
      queryUrl: receipt.queryUrl,
    },
    counts: {
      sourceRows: rows.length,
      schools: schools.length,
      postSecondary: features.length - schools.length,
      unknownLevel: schools.filter((feature) =>
        feature.properties.levels.includes('unknown'),
      ).length,
      elementary: schools.filter((feature) =>
        feature.properties.levels.includes('elementary'),
      ).length,
      juniorHigh: schools.filter((feature) =>
        feature.properties.levels.includes('juniorHigh'),
      ).length,
      high: schools.filter((feature) =>
        feature.properties.levels.includes('high'),
      ).length,
      schoolPointsOutsideCommunityPolygons: schools.filter(
        (feature) => !feature.properties.communityCode,
      ).length,
      schoolWebsites: schools.filter((feature) => feature.properties.website)
        .length,
      rejectedWebsiteValues: [...websitesById.values()].filter(
        (match) => !schoolWebsite(match.website),
      ).length,
    },
    websiteSource: websites?.metadata || null,
    qualityNotes: [...locationReviews].map(([recordId, review]) => ({
      recordId,
      name: review.name,
      note: review.note,
      reviewedAt: review.reviewedAt,
      sourceUrl: 'https://data.calgary.ca/d/fd9t-tdn2',
      treatment: 'Source point, address and area membership retained unchanged; display the discrepancy beside the distance.',
    })),
    method: {
      levels:
        'The source elem, junior_h and senior_h flags establish the three groups. Multi-level schools appear in every reported group. GRADES is preserved as the supplied group description, not interpreted as a numbered grade range. Unknown levels remain available in a separate filter. School names are never used to guess grade levels.',
      records:
        'All source points retained, with distinct institutions at a shared campus kept separate. Post-secondary institutions are excluded from the elementary/junior-high/high-school directory.',
      areaMembership:
        'Source points tested against the bundled community and quadrant polygons using containsPoint. All matched area codes are retained; a single community/quadrant is assigned only when unambiguous. Geographic inclusion does not establish a school catchment.',
      boundaryHashes,
      distances:
        'Great-circle straight-line distance from the selected property or labelled representative area point. Not walking/driving distance, travel time, designated school or admission eligibility.',
      websites:
        'No individual website field is present in the City school schema. When the reviewed Alberta directory join is supplied, require exact normalized name, address and authority; preserve its provenance separately. Invalid or multi-URL values remain null, as do unmatched records. Links are source-published, not individually uptime-verified.',
    },
    limitations: [
      'Coverage is the published City registry, not a guarantee that every currently operating institution or program is listed.',
      'The publisher excludes private Early Childhood Services operators. Post-secondary sites are retained only for source reconciliation, not shown in the school list.',
      'School grades, operators, addresses and admission rules can change. Confirm with the school or authority.',
      'Distances and area membership use the published school map point. Source locations can lag a move or differ from the supplied address; reviewed discrepancies are shown on individual records.',
      'Listed points can include online or specialized program offices; a mapped record is not proof of an in-person teaching campus.',
      'No school rankings, enrolment capacity, attendance-boundary polygons or guaranteed placement are supplied.',
      'City quadrant polygons have their own dated footprint; school address quadrants and geographic quadrant membership can differ.',
    ],
  },
  features,
};
const encoded = JSON.stringify(data) + '\n';
await writeFile(
  values.output || new URL('../public/data/schools.geojson', import.meta.url),
  encoded,
);
console.log(
  JSON.stringify(
    {
      bytes: Buffer.byteLength(encoded),
      sha256: digest(encoded),
      ...data.metadata.counts,
    },
    null,
    2,
  ),
);
