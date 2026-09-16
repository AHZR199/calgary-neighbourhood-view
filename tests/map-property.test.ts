import assert from 'node:assert/strict';
import test from 'node:test';
import type { MultiPolygon } from 'geojson';
import { POST, GET } from '../app/api/map-property/route';
import {
  normalizeParcelMatches,
  parcelContainsPoint,
  readMapPoint,
} from '../lib/atlas/map-property';
import { LookupInputError } from '../lib/atlas/request-body';

const point = { longitude: -114.1, latitude: 51.05 };
const square = (west: number, south: number, size: number) => [
  [west, south],
  [west + size, south],
  [west + size, south + size],
  [west, south + size],
  [west, south],
];
const geometry: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [[square(-114.11, 51.04, 0.02)]],
};
const row = (roll = '123456789', year: unknown = '2003.0') => ({
  roll_number: roll,
  roll_year: '2026',
  address: '101 100 TEST AV NW',
  assessment_class_description: 'Residential',
  assessed_value: '825000',
  re_assessed_value: '825000',
  nr_assessed_value: '0',
  year_of_construction: year,
  comm_code: 'HIL',
  comm_name: 'HILLHURST',
  multipolygon: geometry,
});
const request = (body: unknown, contentType = 'application/json', query = '') =>
  new Request(`https://example.test/api/map-property${query}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('map lookup accepts only bounded numeric coordinates in a small JSON body', async () => {
  assert.deepEqual(await readMapPoint(request(point)), point);
  for (const input of [
    null,
    [],
    {},
    { ...point, email: 'private' },
    { latitude: '51.05', longitude: -114.1 },
    { latitude: 51.05 },
    { latitude: 0, longitude: 0 },
    { latitude: 51.05, longitude: -120 },
    '{',
    '{"latitude":1e999,"longitude":-114.1}',
  ]) {
    await assert.rejects(readMapPoint(request(input)), LookupInputError);
  }
  await assert.rejects(
    readMapPoint(request(point, 'text/plain')),
    (error: unknown) =>
      error instanceof LookupInputError && error.status === 415,
  );
  await assert.rejects(
    readMapPoint(request(' '.repeat(513))),
    (error: unknown) =>
      error instanceof LookupInputError && error.status === 413,
  );
  await assert.rejects(
    readMapPoint(request(point, 'application/json', '?latitude=51.05')),
    LookupInputError,
  );
});

test('parcel matching includes boundaries and separate polygon parts while excluding holes and nearby parcels', () => {
  const parcel: MultiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
      [square(-114.11, 51.04, 0.02), square(-114.105, 51.045, 0.01)],
      [square(-114.2, 51.1, 0.01)],
    ],
  };
  assert.equal(parcelContainsPoint(parcel, point), false);
  assert.equal(
    parcelContainsPoint(parcel, { longitude: -114.11, latitude: 51.05 }),
    true,
  );
  assert.equal(
    parcelContainsPoint(parcel, { longitude: -114.105, latitude: 51.05 }),
    true,
  );
  assert.equal(
    parcelContainsPoint(parcel, { longitude: -114.195, latitude: 51.105 }),
    true,
  );
  assert.equal(
    parcelContainsPoint(parcel, { longitude: -114.12, latitude: 51.05 }),
    false,
  );
  assert.throws(
    () => normalizeParcelMatches([{ ...row(), multipolygon: parcel }], point),
    /does not contain/,
  );
});

test('condo accounts remain separate and duplicate parcel records keep conflicting construction years unresolved', () => {
  const result = normalizeParcelMatches(
    [
      row(),
      row('123456789', '1980.0'),
      { ...row('123456790'), address: '102 100 TEST AV NW' },
    ],
    point,
  );
  assert.equal(result.records.length, 2);
  assert.equal(result.truncated, false);
  assert.equal(
    result.records[0].construction?.status,
    'conflicting-source-records',
  );
  assert.equal(result.records[0].yearBuilt, null);
  assert.equal(result.records[1].yearBuilt, 2003);
  assert.equal(result.records[1].address, '102 100 TEST AV NW');
  assert.equal(result.records[1].assessedValue, 825000);
  assert.equal(result.records[1].longitude, point.longitude);
  assert.deepEqual(normalizeParcelMatches([], point), {
    records: [],
    truncated: false,
  });
});

test('capped results omit the possibly incomplete final account and report truncation', () => {
  const rows = Array.from({ length: 199 }, (_, index) =>
    row(String(100000000 + index)),
  );
  rows.push(row('200000000', '1980.0'), row('200000000', '2003.0'));
  const result = normalizeParcelMatches(rows, point);
  assert.equal(result.records.length, 199);
  assert.equal(result.truncated, true);
  assert.ok(
    result.records.every((record) => record.rollNumber !== '200000000'),
  );
});

test('every duplicate row must have complete and consistent assessment and address fields', () => {
  for (const invalid of [
    { assessed_value: '' },
    { re_assessed_value: -1 },
    { nr_assessed_value: 'unknown' },
    { address: '' },
    { comm_code: null },
    { comm_name: ' ' },
  ])
    assert.throws(
      () => normalizeParcelMatches([row(), { ...row(), ...invalid }], point),
      /Incomplete assessment record/,
    );
  for (const conflict of [
    { assessed_value: '826000' },
    { re_assessed_value: '820000' },
    { nr_assessed_value: '5000' },
    { address: '102 100 TEST AV NW' },
    { comm_code: 'SSD' },
    { comm_name: 'SUNNYSIDE' },
  ])
    assert.throws(
      () => normalizeParcelMatches([row(), { ...row(), ...conflict }], point),
      /Conflicting assessment records/,
    );
  assert.equal(
    normalizeParcelMatches(
      [
        row(),
        { ...row(), assessed_value: '825000.0', re_assessed_value: 825000 },
      ],
      point,
    ).records.length,
    1,
  );
});

test('malformed or nonresidential source rows cannot become plausible property matches', () => {
  for (const invalid of [
    null,
    { ...row(), assessed_value: '' },
    { ...row(), assessed_value: -1 },
    { ...row(), roll_year: '2025' },
    { ...row(), assessment_class_description: 'Non Residential' },
    { ...row(), multipolygon: { type: 'MultiPolygon', coordinates: [] } },
    { ...row(), comm_code: '' },
  ])
    assert.throws(() => normalizeParcelMatches([invalid], point));
});

test('POST queries parcel intersection, forwards no visitor headers and keeps the response uncached', async (t) => {
  const calls: { url: string; options?: RequestInit }[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo | URL, options?: RequestInit) => {
      calls.push({ url: String(input), options });
      return Response.json([
        row(),
        { ...row('123456790'), address: '102 100 TEST AV NW' },
      ]);
    },
  );
  const response = await POST(request(point));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.match, 'parcel');
  assert.equal(result.records.length, 2);
  assert.equal(result.truncated, false);
  assert.equal(result.source, 'City of Calgary');
  assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.hostname, 'data.calgary.ca');
  assert.match(
    url.searchParams.get('$where') || '',
    /intersects\(multipolygon, 'POINT \(-114\.1 51\.05\)'\)/,
  );
  assert.equal(url.searchParams.get('$limit'), '201');
  assert.equal(calls[0].options?.cache, 'no-store');
  assert.equal(calls[0].options?.headers, undefined);
});

test('invalid requests and unsupported GET never query the City; source failure is not reported as no match', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response('unavailable', { status: 503 });
  });
  for (const input of [
    request({ latitude: '51', longitude: -114 }),
    request(point, 'text/plain'),
  ]) {
    const response = await POST(input);
    assert.ok([400, 415].includes(response.status));
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const get = await GET();
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal(calls, 0);
  const failed = await POST(request(point));
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get('cache-control'), 'no-store');
  assert.equal((await failed.json()).records, undefined);
});
