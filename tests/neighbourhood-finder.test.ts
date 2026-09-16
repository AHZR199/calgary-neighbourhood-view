import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { containsPoint } from '../lib/atlas/geography';
import {
  DEFAULT_FINDER_PREFERENCES,
  finderProximityScore,
  rankNeighbourhoods,
  type FinderData,
  type FinderPreferences,
  type FinderProfile,
} from '../lib/atlas/neighbourhood-finder';
const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../public/data/${name}`, import.meta.url), 'utf8'),
  );
const data = read('neighbourhood-finder.json') as FinderData;
const preferences = (
  overrides: Partial<FinderPreferences> = {},
): FinderPreferences => ({
  ...DEFAULT_FINDER_PREFERENCES,
  quadrants: [],
  weights: {
    budget: 0,
    services: 0,
    transit: 0,
    parks: 0,
    schools: 0,
    downtown: 0,
  },
  ...overrides,
});
const place = (distanceM: number) => ({
  name: 'Published point',
  distanceM,
  sourceUrl: 'https://data.calgary.ca/',
});
const base = data.profiles.find((profile) => profile.code === 'HIL')!;
const profile = (
  code: string,
  overrides: Partial<FinderProfile> = {},
): FinderProfile => ({
  ...base,
  code,
  name: code,
  quadrants: ['NW'],
  downtownKm: 5,
  referencePoint: [-114.1, 51.05],
  assessment: {
    year: 2026,
    count: 100,
    p25: 300000,
    median: 500000,
    p75: 700000,
    minimum: 200000,
    maximum: 900000,
  },
  nearest: { ...base.nearest },
  ...overrides,
});
const dataset = (...profiles: FinderProfile[]): FinderData => ({
  ...data,
  profiles,
});

test('the profile registry preserves all residential areas and reconciles assessment quartiles', () => {
  const boundaries = read('communities.geojson') as FeatureCollection<
    Polygon | MultiPolygon
  >;
  const residential = boundaries.features.filter(
    (feature) => feature.properties?.class === 'Residential',
  );
  const summaries = read('assessment-summary.json');
  assert.equal(data.profiles.length, residential.length);
  assert.equal(data.profiles.length, 223);
  assert.equal(new Set(data.profiles.map((p) => p.code)).size, 223);
  assert.equal(data.profiles.filter((p) => p.assessment).length, 219);
  for (const p of data.profiles) {
    const feature = residential.find(
      (row) => row.properties?.comm_code === p.code,
    )!;
    assert.ok(containsPoint(p.referencePoint, feature.geometry), p.code);
    assert.ok(p.quadrants.every((q) => ['NE', 'NW', 'SE', 'SW'].includes(q)));
    if (p.assessment) {
      const { minimum, p25, median, p75, maximum, count } = p.assessment;
      assert.equal(median, summaries[p.code].median);
      assert.equal(count, summaries[p.code].count);
      assert.ok(
        minimum <= p25 && p25 <= median && median <= p75 && p75 <= maximum,
      );
    } else assert.equal(summaries[p.code], undefined);
    for (const point of Object.values(p.nearest))
      if (point) {
        assert.ok(point.distanceM >= 0 && Number.isFinite(point.distanceM));
        assert.ok(point.sourceUrl.startsWith('https://'));
        assert.notEqual(point.name, 'Chinook Learning Services');
      }
  }
  assert.deepEqual(data.profiles.find((p) => p.code === 'BLN')!.quadrants, [
    'SE',
    'SW',
  ]);
  assert.equal(base.assessment!.p25, 387000);
  assert.equal(base.assessment!.p75, 1000000);
});

test('changing explicit priorities changes the ranking without turning assessments into listing prices', () => {
  const cheap = profile('CHEAP', {
    servicesScore: 10,
    assessment: { ...base.assessment!, median: 300000 },
  });
  const amenity = profile('AMENITY', {
    servicesScore: 100,
    assessment: { ...base.assessment!, median: 800000 },
  });
  const cohort = dataset(cheap, amenity);
  const budget = preferences({ budgetMax: 400000 });
  budget.weights.budget = 3;
  assert.equal(
    rankNeighbourhoods(cohort, budget).recommendations[0].profile.code,
    'CHEAP',
  );
  const services = preferences();
  services.weights.services = 3;
  assert.equal(
    rankNeighbourhoods(cohort, services).recommendations[0].profile.code,
    'AMENITY',
  );
  assert.equal(rankNeighbourhoods(cohort, budget).matches.length, 2);
  const strict = rankNeighbourhoods(cohort, {
    ...budget,
    budgetMustMatch: true,
  });
  assert.deepEqual(
    strict.matches.map((m) => m.profile.code),
    ['CHEAP'],
  );
  assert.deepEqual(strict.nearMisses[0].unmetFilters, ['budget']);
  assert.match(
    strict.nearMisses[0].tradeoffs.join(' '),
    /above your assessment budget/,
  );
});

test('missing priorities are omitted, coverage is explicit, and observed zero remains zero', () => {
  const missing = profile('MISSING', { servicesScore: null, transitScore: 0 });
  const config = preferences({ budgetMax: 500000 });
  config.weights.budget = 3;
  config.weights.services = 1;
  const partial = rankNeighbourhoods(dataset(missing), config).matches[0];
  assert.equal(partial.score, 100);
  assert.equal(partial.coverage, 75);
  assert.deepEqual(partial.missing, ['Everyday amenities']);
  config.weights.budget = 1;
  assert.equal(
    rankNeighbourhoods(dataset(missing), config).matches[0].score,
    null,
  );
  config.weights = { ...preferences().weights, transit: 3 };
  const zero = rankNeighbourhoods(dataset(missing), config).matches[0];
  assert.equal(zero.coverage, 100);
  assert.equal(zero.score, 0);
});

test('a blank budget and zero priorities produce no invented overall score', () => {
  const config = preferences();
  config.weights.budget = 3;
  const result = rankNeighbourhoods(dataset(profile('A')), config);
  assert.equal(result.matches[0].score, null);
  assert.equal(result.recommendations.length, 0);
  assert.equal(
    result.matches[0].criteria.find((c) => c.id === 'budget')!.weight,
    0,
  );
  assert.match(
    result.matches[0].tradeoffs.join(' '),
    /Choose at least one priority/,
  );
});

test('quadrants, downtown and anchor radii are actual filters with explicit recovery', () => {
  const a = profile('A', { quadrants: ['NW', 'NE'], downtownKm: 5 });
  const b = profile('B', {
    quadrants: ['SW'],
    downtownKm: 20,
    referencePoint: [-114.25, 51.05],
  });
  const cohort = dataset(a, b);
  const config = preferences({ quadrants: ['NE'], maxDowntownKm: 5 });
  config.weights.transit = 1;
  assert.deepEqual(
    rankNeighbourhoods(cohort, config).matches.map((m) => m.profile.code),
    ['A'],
  );
  const anchor = rankNeighbourhoods(cohort, {
    ...config,
    quadrants: [],
    maxDowntownKm: null,
    nearCommunityCode: 'A',
    maxReferenceKm: 1,
  });
  assert.equal(anchor.matches[0].nearReferenceKm, 0);
  assert.deepEqual(anchor.nearMisses[0].unmetFilters, ['reference']);
  const empty = rankNeighbourhoods(cohort, {
    ...config,
    quadrants: ['SE'],
    maxDowntownKm: 0.1,
  });
  assert.equal(empty.matches.length, 0);
  assert.equal(empty.nearMisses.length, 2);
  assert.equal(empty.relaxations[0].id, 'all');
  assert.equal(
    rankNeighbourhoods(cohort, { ...config, ...empty.relaxations[0].changes })
      .matches.length,
    2,
  );
});

test('school preferences follow published level points and never rank quality', () => {
  const p = profile('A', {
    nearest: {
      ...base.nearest,
      school: place(300),
      elementary: place(300),
      high: place(2200),
    },
  });
  const config = preferences();
  config.weights.schools = 3;
  const elementary = rankNeighbourhoods(dataset(p), {
    ...config,
    schoolLevel: 'elementary',
  }).matches[0];
  const high = rankNeighbourhoods(dataset(p), {
    ...config,
    schoolLevel: 'high',
  }).matches[0];
  assert.equal(elementary.score, 100);
  assert.equal(high.score, 0);
  assert.match(
    elementary.reasons.join(' '),
    /does not establish school quality or eligibility/,
  );
  assert.equal(finderProximityScore(null), null);
  assert.equal(finderProximityScore(1200), 50);
});

test('invalid budgets, unverified housing types and unsupported anchors cannot silently change matching', () => {
  const cohort = dataset(profile('A'));
  for (const value of [-1, 0, NaN, Infinity])
    assert.throws(
      () => rankNeighbourhoods(cohort, preferences({ budgetMax: value })),
      RangeError,
    );
  assert.throws(
    () =>
      rankNeighbourhoods(cohort, preferences({ nearCommunityCode: 'MISSING' })),
    RangeError,
  );
  assert.throws(
    () => rankNeighbourhoods(cohort, preferences({ maxReferenceKm: 5 })),
    RangeError,
  );
  assert.throws(
    () =>
      rankNeighbourhoods(
        cohort,
        preferences({ housingType: 'detached' as 'any' }),
      ),
    /classification/,
  );
});

test('ranked output is deterministic and personal or political fields have no influence', () => {
  const config = preferences();
  config.weights.transit = 1;
  const cohort = dataset(profile('B'), profile('A'));
  const before = JSON.stringify(cohort);
  const result = rankNeighbourhoods(cohort, config);
  assert.deepEqual(
    result.matches.map((m) => m.profile.code),
    ['A', 'B'],
  );
  assert.equal(JSON.stringify(cohort), before);
  assert.deepEqual(rankNeighbourhoods(cohort, config), result);
  const augmented = structuredClone(cohort);
  Object.assign(augmented.profiles[0], {
    income: 1000000,
    ethnicity: 'ignored',
    party: 'ignored',
    radon: 0,
    crime: 0,
  });
  assert.deepEqual(
    rankNeighbourhoods(augmented, config).matches.map((m) => [
      m.profile.code,
      m.score,
    ]),
    result.matches.map((m) => [m.profile.code, m.score]),
  );
});
