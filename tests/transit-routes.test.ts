import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { FeatureCollection, LineString } from 'geojson';

interface RouteProperties {
  routeId: string;
  routeNumber: string;
  routeType: number;
  mode: 'train' | 'bus';
  shapeId: string;
  color: string | null;
  sourceTripCount: number;
  scheduledServiceDays: number;
  serviceStart: string;
  serviceEnd: string;
  sourceUrl: string;
}
const routes = JSON.parse(
  readFileSync(
    new URL('../public/data/transit-routes.geojson', import.meta.url),
    'utf8',
  ),
) as FeatureCollection<LineString, RouteProperties> & {
  metadata: {
    source: { archiveSha256: string; attribution: string; retrievedAt: string };
    counts: {
      routes: number;
      sourceTrips: number;
      routeShapeFeatures: number;
      displayVertices: number;
    };
    coverage: { calendarStart: string; calendarEnd: string };
    method: { maximumMeasuredDeviationMetres: number; toleranceMetres: number };
  };
};
const schedule = JSON.parse(
  readFileSync(
    new URL('../public/data/transit-citywide.json', import.meta.url),
    'utf8',
  ),
) as {
  routes: { id: string; shortName: string; gtfsType: number; mode: string }[];
  metadata: { source: { sha256: string } };
};

test('operating route lines join to the same reviewed schedule, including the two CTrain lines', () => {
  assert.equal(
    routes.metadata.source.archiveSha256,
    schedule.metadata.source.sha256,
  );
  assert.deepEqual(
    new Set(routes.features.map((feature) => feature.properties.routeId)),
    new Set(schedule.routes.map((route) => route.id)),
  );
  const registry = new Map(schedule.routes.map((route) => [route.id, route]));
  for (const { properties } of routes.features) {
    const route = registry.get(properties.routeId)!;
    assert.equal(properties.mode, route.mode);
    assert.equal(properties.routeNumber, route.shortName);
    assert.equal(properties.routeType, route.gtfsType);
    assert.equal(properties.sourceUrl, 'https://data.calgary.ca/d/npk7-z3bj');
  }
  assert.deepEqual(
    new Set(
      routes.features
        .filter((feature) => feature.properties.mode === 'train')
        .map((feature) => feature.properties.routeNumber),
    ),
    new Set(['201', '202']),
  );
  assert.equal(
    routes.features.reduce(
      (sum, feature) => sum + feature.properties.sourceTripCount,
      0,
    ),
    routes.metadata.counts.sourceTrips,
  );
});

test('every route pattern has distinct source identity, dated service and usable Calgary-region geometry', () => {
  assert.equal(
    new Set(routes.features.map((feature) => feature.id)).size,
    routes.features.length,
  );
  assert.equal(
    routes.features.length,
    routes.metadata.counts.routeShapeFeatures,
  );
  assert.equal(
    routes.features.reduce(
      (sum, feature) => sum + feature.geometry.coordinates.length,
      0,
    ),
    routes.metadata.counts.displayVertices,
  );
  assert.ok(
    routes.metadata.method.maximumMeasuredDeviationMetres <=
      routes.metadata.method.toleranceMetres,
  );
  assert.match(routes.metadata.source.attribution, /Open Government Licence/);
  for (const { properties, geometry } of routes.features) {
    assert.ok(properties.shapeId);
    assert.ok(properties.sourceTripCount > 0);
    assert.ok(properties.scheduledServiceDays > 0);
    assert.ok(
      properties.serviceStart >= routes.metadata.coverage.calendarStart,
    );
    assert.ok(properties.serviceEnd <= routes.metadata.coverage.calendarEnd);
    assert.ok(properties.serviceStart <= properties.serviceEnd);
    assert.ok(
      properties.color === null || /^#[0-9A-F]{6}$/.test(properties.color),
    );
    assert.equal(geometry.type, 'LineString');
    assert.ok(geometry.coordinates.length > 2);
    for (const [lon, lat] of geometry.coordinates) {
      assert.ok(Number.isFinite(lon) && lon > -116 && lon < -112);
      assert.ok(Number.isFinite(lat) && lat > 50 && lat < 52);
    }
  }
});
