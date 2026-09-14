import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseCalgaryAqhi,
  parseUtcStamp,
  formatCalgaryObservation,
} from '../lib/atlas/air-quality';
const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/air-quality.json', import.meta.url), 'utf8'),
);
for (const row of fixtures.cases)
  test(`ECCC ${row.name}`, () => {
    if (row.expectedError)
      return assert.throws(() => parseCalgaryAqhi(row.xml));
    const result = parseCalgaryAqhi(row.xml);
    for (const [key, value] of Object.entries(row.expected.city))
      assert.equal(result.city[key as keyof typeof result.city], value);
    assert.equal(result.observationPeriod.at, row.expected.at);
    assert.equal(result.stations.length, row.expected.stationCount);
    assert.deepEqual(
      result.stations.map((s) => s.aqhi),
      row.expected.stationValues,
    );
    assert.ok(
      result.stations.every(
        (s) => s.observedAt === result.observationPeriod.at,
      ),
    );
  });
test('dates reject rollover and use Calgary daylight saving rules', () => {
  assert.throws(() => parseUtcStamp('20260230010000'));
  assert.match(formatCalgaryObservation('2026-01-13T19:00:00Z'), /MST/);
  assert.match(formatCalgaryObservation('2026-09-13T19:00:00Z'), /MDT/);
});
