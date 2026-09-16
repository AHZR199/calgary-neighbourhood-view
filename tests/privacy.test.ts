import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { clearSavedResearch } from '../lib/atlas/privacy-storage';
import { LookupInputError, readLookupFields } from '../lib/atlas/request-body';
import {
  POST as assessmentsPOST,
  GET as assessmentsGET,
} from '../app/api/assessments/route';
import { POST as detailsPOST } from '../app/api/property-details/route';

const request = (body: string, contentType = 'application/json') =>
  new Request('https://example.test/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });

test('clear removes all research entries without deleting unrelated site data', () => {
  const values = new Map([
    ['calgary-atlas-saved', '[]'],
    ['atlas-checks-1', '["visit"]'],
    ['unrelated-setting', 'keep'],
    ['atlas-checks-2', '[]'],
  ]);
  const storage = {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  assert.equal(clearSavedResearch(storage), 3);
  assert.deepEqual([...values.entries()], [['unrelated-setting', 'keep']]);
  assert.equal(clearSavedResearch(storage), 0);
});

test('lookup body rejects malformed, unexpected and oversized input before any source query', async () => {
  for (const body of [
    '{',
    'null',
    '[]',
    '{"q":123}',
    '{"q":{"address":"1 AV"}}',
    '{"q":"1 AV","email":"private"}',
  ]) {
    await assert.rejects(
      readLookupFields(request(body), ['q']),
      LookupInputError,
    );
  }
  await assert.rejects(
    readLookupFields(request('{"q":"1 AV"}', 'text/plain'), ['q']),
    (error: unknown) =>
      error instanceof LookupInputError && error.status === 415,
  );
  await assert.rejects(
    readLookupFields(request(JSON.stringify({ q: 'é'.repeat(600) })), ['q']),
    (error: unknown) =>
      error instanceof LookupInputError && error.status === 413,
  );
  assert.deepEqual(
    await readLookupFields(request('{"q":"1768 7 AV"}'), ['q']),
    { q: '1768 7 AV' },
  );
});

test('lookup routes reject invalid inputs with uncached responses', async () => {
  const responses = await Promise.all([
    assessmentsPOST(request('{"q":"private text"}')),
    assessmentsPOST(request('{"q":3}')),
    assessmentsGET(
      new NextRequest('https://example.test/api/assessments?q=ab'),
    ),
    detailsPOST(request('{"address":"1768 7 AV NW","roll":"bad"}')),
  ]);
  for (const response of responses) {
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('POST property lookups return public records, omit visitor headers, and disable caching', async (t) => {
  const calls: { url: string; options?: RequestInit }[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      calls.push({ url, options });
      if (url.includes('4bsw-nn7w'))
        return Response.json([
          {
            roll_number: '200256139',
            address: '1768 7 AV NW',
            comm_code: 'HIL',
            comm_name: 'HILLHURST',
            roll_year: '2026',
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
          },
        ]);
      if (url.includes('ta76-7bfx'))
        return Response.json([
          {
            water_service_address: '1768 7 AV NW',
            material_type: 'Copper',
            installed_date: '1980-01-01',
          },
        ]);
      return Response.json([
        {
          roll_number: '200256139',
          roll_year: '2025',
          assessed_value: '800000',
        },
      ]);
    },
  );
  const searched = await assessmentsPOST(request('{"q":"1768 7 AV"}'));
  assert.equal(searched.status, 200);
  assert.equal(searched.headers.get('cache-control'), 'no-store');
  assert.equal((await searched.json()).records[0].rollNumber, '200256139');
  const detail = await detailsPOST(
    request('{"address":"1768 7 AV NW","roll":"200256139"}'),
  );
  assert.equal(detail.status, 200);
  assert.equal(detail.headers.get('cache-control'), 'no-store');
  const body = await detail.json();
  assert.deepEqual(body.sourceStatus, {
    water: 'fulfilled',
    history: 'fulfilled',
  });
  assert.deepEqual(body.history, [
    { year: 2025, assessedValue: 800000, status: 'recorded' },
  ]);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(new URL(call.url).hostname, 'data.calgary.ca');
    assert.equal(call.options?.cache, 'no-store');
    assert.equal(call.options?.headers, undefined);
  }
});
