import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = new URL('../public/data/', import.meta.url);
const read = async (name) =>
  JSON.parse(await readFile(new URL(name, directory), 'utf8'));
const [
  areas,
  quadrants,
  stats,
  properties,
  crime,
  pipes,
  representatives,
  history,
] = await Promise.all(
  [
    'communities.geojson',
    'quadrants.geojson',
    'assessment-summary.json',
    'properties.json',
    'crime.json',
    'pipes.json',
    'representatives.json',
    'assessment-history.json',
  ].map(read),
);
assert.equal(areas.features.length, 313);
assert.equal(quadrants.features.length, 4);
const codes = new Set(
  [...areas.features, ...quadrants.features].map((f) => f.properties.comm_code),
);
assert.equal(codes.size, 317);
const sum = (list) => list.reduce((total, row) => total + row.count, 0);
assert.equal(
  sum(
    Object.entries(stats)
      .filter(([k]) => !k.startsWith('Q_'))
      .map(([, v]) => v),
  ),
  499477,
);
assert.equal(
  sum(
    Object.entries(stats)
      .filter(([k]) => k.startsWith('Q_'))
      .map(([, v]) => v),
  ),
  499477,
);
for (const [code, row] of Object.entries(stats)) {
  assert.ok(codes.has(code), `Unknown assessment area ${code}`);
  assert.ok(row.count > 0 && row.median > 0 && Number.isFinite(row.mean));
  assert.equal(row.year, 2026, 'New tax years require an explicit rate review');
}
for (const [code, median] of Object.entries({
  HIL: 718000,
  SSD: 409750,
  BRD: 439750,
  BLN: 303000,
}))
  assert.equal(stats[code].median, median);
assert.equal(properties.length, 199);
assert.equal(
  new Set(properties.map((p) => p.rollNumber)).size,
  properties.length,
);
const ids = new Set(representatives.representatives.map((r) => r.id));
assert.equal(ids.size, 51);
const provincialDistricts = representatives.representatives.filter(
  (representative) => representative.level === 'provincial',
);
assert.equal(provincialDistricts.length, 26);
for (const district of provincialDistricts) {
  assert.equal(district.status, 'link-only');
  assert.equal(district.name, null);
  assert.equal(district.party, null);
  assert.equal(district.officialMemberId, undefined);
  assert.equal(district.partyCode, undefined);
  assert.equal(
    district.sourceUrl,
    'https://www.assembly.ab.ca/members/members-of-the-legislative-assembly',
    'Current MLA information remains link-only in the public demo',
  );
}
for (const p of properties) {
  assert.ok(codes.has(p.communityCode));
  assert.ok(p.assessedValue > 0);
  assert.equal(p.rollYear, 2026);
  assert.ok(
    p.longitude > -115 &&
      p.longitude < -113 &&
      p.latitude > 50 &&
      p.latitude < 52,
  );
  for (const key of [
    'mpRepresentativeId',
    'mlaRepresentativeId',
    'councillorRepresentativeId',
  ])
    if (p[key])
      assert.ok(ids.has(p[key]), `${p.rollNumber}: broken representative link`);
  const records = history.byRollNumber[p.rollNumber].history;
  assert.equal(new Set(records.map((r) => r.year)).size, records.length);
  assert.equal(
    records.find((r) => r.year === 2026).assessedValue,
    p.assessedValue,
  );
  assert.ok(pipes.byRollNumber[p.rollNumber]);
}
for (const c of Object.values(crime.communities)) {
  if (c.communityCode) assert.ok(codes.has(c.communityCode));
  const current = c.monthly.filter((m) => m.year === 2019 && m.month <= 12);
  if (current.some((m) => m.publishedCount === null))
    assert.equal(
      c.latestYearComparison.changePercent,
      null,
      'Incomplete crime periods must not produce growth rates',
    );
}
const [transit, demographic, cityAmenities, osmAmenities, supplement] =
  await Promise.all(
    [
      'transit-citywide.json',
      'demographics.json',
      'access-amenities-city.geojson',
      'access-amenities-osm.geojson',
      'access-supplement-osm.geojson',
    ].map(read),
  );
assert.equal(transit.stops.length, 6214);
assert.equal(transit.routes.length, 260);
assert.equal(demographic.communities.length, 313);
for (const row of demographic.communities) {
  assert.ok(row.households && Array.isArray(row.ageGroups));
  assert.equal(
    row.income,
    undefined,
    'PDF-only income data must not return without a licence review',
  );
  assert.ok(
    row.populationPrivateHouseholds === null ||
      Number.isFinite(row.populationPrivateHouseholds),
  );
}
for (const collection of [cityAmenities, osmAmenities, supplement]) {
  assert.equal(
    new Set(collection.features.map((f) => f.id)).size,
    collection.features.length,
  );
  for (const feature of collection.features) {
    assert.equal(feature.geometry.type, 'Point');
    assert.ok(feature.geometry.coordinates.every(Number.isFinite));
    assert.ok(feature.properties.sourceId);
  }
}
assert.equal(
  supplement.features.filter((f) => f.properties.category === 'childcare')
    .length,
  101,
);
assert.equal(
  supplement.features.filter((f) => f.properties.category === 'gyms').length,
  132,
);
assert.ok(
  Object.values(crime.communities).every((c) =>
    c.monthly.every((m) => m.year === 2018 || m.year === 2019),
  ),
  'Only the reviewed licensed historical crime extract is publishable',
);
const manifest = JSON.parse(
  await readFile(
    new URL('../docs/data-manifest.json', import.meta.url),
    'utf8',
  ),
);
for (const name of await readdir(directory)) {
  if (!/\.(json|geojson)$/.test(name)) continue;
  const bytes = await readFile(new URL(name, directory));
  JSON.parse(bytes.toString());
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    manifest.files[name],
    `${name}: review and record the changed snapshot`,
  );
}
console.log(
  'Verified: 499,477 accounts reconcile across communities and quadrants; source joins, dates, missing crime periods, histories and all snapshot hashes pass.',
);
