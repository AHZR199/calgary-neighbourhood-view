import assert from 'node:assert/strict';
import test from 'node:test';
import { POST as assessmentsPOST } from '../app/api/assessments/route';
import { POST as detailsPOST } from '../app/api/property-details/route';
import {
  normalizeAssessmentRoll,
  normalizeConstructionYear,
  saleHistoryAvailability,
  summarizeConstruction,
} from '../lib/atlas/property-records';

const request = (fields: Record<string, string>) =>
  new Request('https://example.com/api/property-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

const propertyRow = (roll: string, address: string, year: unknown) => ({
  roll_number: roll,
  address,
  year_of_construction: year,
  roll_year: '2026',
  comm_code: 'HIL',
  comm_name: 'HILLHURST',
  assessed_value: '825000',
  multipolygon: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [-114.1, 51.05],
          [-114.099, 51.05],
          [-114.099, 51.051],
          [-114.1, 51.05],
        ],
      ],
    ],
  },
});

test('construction years accept City numeric text without turning placeholders into ages', () => {
  assert.equal(normalizeConstructionYear('2003.0', 2026), 2003);
  assert.equal(normalizeConstructionYear(1887, 2026), 1887);
  assert.equal(normalizeConstructionYear(' 1900 ', 2026), 1900);
  for (const invalid of [
    null,
    undefined,
    '',
    ' ',
    true,
    0,
    1800,
    '1800.0',
    'unknown',
    '2003/2004',
    2003.5,
    Infinity,
    '2e3',
    9999,
  ])
    assert.equal(normalizeConstructionYear(invalid, 2026), null);
  assert.equal(normalizeConstructionYear(2020, 2019), null);
});

test('repeated parcels agree, conflicting construction records remain unresolved', () => {
  assert.equal(summarizeConstruction(['2003.0', 2003], 2026).year, 2003);
  assert.equal(summarizeConstruction([], 2026).status, 'missing');
  assert.equal(
    summarizeConstruction(['1800.0', '2003.0'], 2026).status,
    'unverified-source-value',
  );
  const conflict = summarizeConstruction([1980, 2003], 2026);
  assert.equal(conflict.year, null);
  assert.equal(conflict.status, 'conflicting-source-records');
});

test('roll normalization preserves account identity and rejects fuzzy matches', () => {
  assert.equal(normalizeAssessmentRoll('001234567'), '1234567');
  assert.equal(normalizeAssessmentRoll('000000001'), '1');
  assert.equal(normalizeAssessmentRoll('1'), '1');
  assert.equal(normalizeAssessmentRoll('1234567A'), null);
  assert.equal(normalizeAssessmentRoll('1234567.0'), null);
  assert.equal(normalizeAssessmentRoll(1234567), null);
});

test('address results keep units separate and do not pick a first conflicting construction year', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json([
      propertyRow('200256139', '101 100 TEST AV NW', '2003.0'),
      propertyRow('200256139', '101 100 TEST AV NW', '1980.0'),
      propertyRow('200256140', '102 100 TEST AV NW', '2020.0'),
      propertyRow('200256141', '103 100 TEST AV NW', '1800.0'),
    ]),
  );
  const response = await assessmentsPOST(request({ q: '100 TEST' }));
  const { records } = await response.json();
  assert.equal(records.length, 3);
  assert.equal(records[0].yearBuilt, null);
  assert.equal(records[0].construction.status, 'conflicting-source-records');
  assert.equal(records[1].yearBuilt, 2020);
  assert.equal(records[1].address, '102 100 TEST AV NW');
  assert.equal(records[2].yearBuilt, null);
  assert.equal(records[2].construction.status, 'unverified-source-value');
});

test('a search response ending inside an account does not present partial parcel evidence', async (t) => {
  const rows = Array.from({ length: 39 }, (_, index) =>
    propertyRow(String(200256100 + index), `${index + 1} TEST AV NW`, 2003),
  );
  rows.push(
    propertyRow('200256999', '100 TEST AV NW', 1980),
    propertyRow('200256999', '100 TEST AV NW', 2003),
  );
  t.mock.method(globalThis, 'fetch', async () => Response.json(rows));
  const response = await assessmentsPOST(request({ q: '100 TEST' }));
  const { records } = await response.json();
  assert.equal(records.length, 39);
  assert.ok(
    !records.some(
      (record: { rollNumber: string }) => record.rollNumber === '200256999',
    ),
  );
});

test('historical assessments only use the selected account and do not become sales', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    if (String(input).includes('ta76-7bfx')) return Response.json([]);
    return Response.json([
      { roll_number: '1234567', roll_year: '2025', assessed_value: '800000' },
      { roll_number: '001234567', roll_year: '2025', assessed_value: '800000' },
      { roll_number: '1234568', roll_year: '2025', assessed_value: '900000' },
      { roll_number: '1234567', roll_year: '2026', assessed_value: '825000' },
      { roll_number: '1234567', roll_year: '2024.5', assessed_value: '700000' },
    ]);
  });
  const response = await detailsPOST(
    request({ address: '101 100 TEST AV NW', roll: '001234567' }),
  );
  const body = await response.json();
  assert.deepEqual(body.history, [
    { year: 2025, assessedValue: 800000, status: 'recorded' },
  ]);
  assert.deepEqual(body.saleHistory, saleHistoryAvailability);
  assert.equal(body.saleHistory.lastSoldDate, null);
  assert.equal(body.saleHistory.lastSoldPrice, null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
