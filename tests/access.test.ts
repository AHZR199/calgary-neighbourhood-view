import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { chartScale } from '../lib/atlas/chart-scale';
import {
  DOWNTOWN,
  nearbyEssentials,
  type AmenityCollection,
} from '../lib/atlas/access';
import {
  distanceMetres,
  transitNearAddress,
  formatServiceTime,
  type TransitDataset,
  type DayTuple,
} from '../lib/atlas/transit';
const city = JSON.parse(
  readFileSync(
    new URL('../public/data/access-amenities-city.geojson', import.meta.url),
    'utf8',
  ),
) as AmenityCollection;
const osm = JSON.parse(
  readFileSync(
    new URL('../public/data/access-amenities-osm.geojson', import.meta.url),
    'utf8',
  ),
) as AmenityCollection;
const empty: AmenityCollection = { type: 'FeatureCollection', features: [] };
test('numeric axes include zero, all values and equal readable intervals', () => {
  for (const values of [
    [0],
    [3.7],
    [598765, 702000],
    [NaN, Infinity, 0],
    [81, 235, 402],
  ]) {
    const { top, ticks } = chartScale(values);
    assert.equal(ticks[0], 0);
    assert.equal(ticks.at(-1), top);
    for (const value of values.filter(Number.isFinite)) assert.ok(top >= value);
    assert.ok(ticks.length >= 2 && ticks.length <= 6);
    ticks
      .slice(1)
      .forEach((n, i) =>
        assert.ok(Math.abs(n - ticks[i] - (ticks[1] - ticks[0])) < 1e-8),
      );
  }
});
test('great-circle distances match known one-degree meridian and identity', () => {
  assert.equal(distanceMetres(51, -114, 51, -114), 0);
  assert.ok(Math.abs(distanceMetres(0, 0, 1, 0) - 111195.08) < 1);
  assert.equal(
    distanceMetres(51, -114, 52, -113),
    distanceMetres(52, -113, 51, -114),
  );
});
test('missing amenities and outside-coverage points cannot earn a score', () => {
  assert.equal(
    nearbyEssentials(DOWNTOWN.coordinates, empty, empty, true).score,
    null,
  );
  assert.equal(
    nearbyEssentials(DOWNTOWN.coordinates, city, osm, false).score,
    null,
  );
  assert.equal(nearbyEssentials([NaN, 51], city, osm, true).score, null);
});
test('actual downtown essentials retain source links and explain their coverage', () => {
  const result = nearbyEssentials(DOWNTOWN.coordinates, city, osm, true);
  assert.equal(result.count, 6);
  assert.equal(result.observedWeight, 100);
  assert.ok(result.score !== null && result.score >= 0 && result.score <= 100);
  for (const row of result.breakdown) {
    assert.ok(row.nearest);
    assert.ok(row.nearest.sourceId);
    assert.ok(row.nearest.distanceM >= 0);
  }
});
const day: DayTuple = [
  20,
  32400,
  64800,
  0,
  12,
  0,
  0,
  null,
  30,
  null,
  null,
  null,
  30,
  null,
  null,
];
function syntheticTransit(): TransitDataset {
  return {
    metadata: {
      schemaVersion: 2,
      capturedAt: '2026-09-14',
      source: {
        url: 'https://data.calgary.ca/d/npk7-z3bj',
        licenceUrl: 'https://data.calgary.ca',
        attribution: 'City',
      },
      coverage: {
        calendarStart: '2026-09-09',
        calendarEnd: '2026-12-20',
        referenceDates: {
          weekday: '2026-09-15',
          saturday: '2026-09-26',
          sunday: '2026-09-20',
        },
      },
      frequencyWindows: [],
    },
    routes: [
      {
        id: 'r1',
        shortName: '1',
        name: 'Example',
        gtfsType: 3,
        mode: 'bus',
        isMax: false,
        url: null,
        scheduledTrips: { weekday: 20, saturday: 20, sunday: 20 },
      },
    ],
    railStations: [],
    stops: [
      {
        id: 'a',
        code: 'a',
        name: 'Near',
        lat: 51,
        lon: -114,
        kind: 'bus',
        routeIds: ['r1'],
        serviceIndexes: [0, 1],
      },
      {
        id: 'b',
        code: 'b',
        name: 'Next stop',
        lat: 51.001,
        lon: -114,
        kind: 'bus',
        routeIds: ['r1'],
        serviceIndexes: [2],
      },
    ],
    services: [
      ['a', 'r1', '0', ['Outbound'], day, day, day],
      ['a', 'r1', '1', ['Inbound'], day, day, day],
      ['b', 'r1', '0', ['Outbound'], day, day, day],
    ],
  };
}
test('duplicate route stops and opposite directions do not inflate transit score', () => {
  const result = transitNearAddress(syntheticTransit(), 51, -114);
  assert.equal(result.nearbyRoutes.length, 1);
  assert.equal(result.nearbyRoutes[0].directions.length, 2);
  assert.equal(
    result.accessEstimate.inputs.weightedOneDirectionMiddayDeparturesPerHour,
    2,
  );
  assert.equal(result.accessEstimate.value, 39);
});
test('distant transit service scores zero and invalid coordinates are rejected', () => {
  assert.equal(
    transitNearAddress(syntheticTransit(), 52, -114).accessEstimate.value,
    0,
  );
  assert.throws(() => transitNearAddress(syntheticTransit(), NaN, -114));
  assert.equal(formatServiceTime(27 * 3600), '03:00 (+1 day)');
});
test('weekend-only routes appear on their service day without changing the weekday score', () => {
  const data = syntheticTransit();
  const none: DayTuple = [
    0,
    null,
    null,
    0,
    0,
    0,
    0,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  data.routes.push({ ...data.routes[0], id: 'sunday', shortName: '555' });
  data.services.push(['a', 'sunday', '0', ['Sunday only'], none, none, day]);
  data.stops[0].serviceIndexes.push(3);
  const weekday = transitNearAddress(data, 51, -114);
  const sunday = transitNearAddress(data, 51, -114, { serviceDay: 'sunday' });
  assert.ok(!weekday.nearbyRoutes.some((r) => r.route.id === 'sunday'));
  assert.ok(sunday.nearbyRoutes.some((r) => r.route.id === 'sunday'));
  assert.equal(sunday.accessEstimate.value, weekday.accessEstimate.value);
});
