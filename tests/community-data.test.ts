import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadAtlas, titleCase } from '../lib/atlas/data';

test('missing sectors cannot become false NE search matches', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.ok(input.startsWith('/data/'));
    return Response.json(
      JSON.parse(
        readFileSync(new URL(`../public${input}`, import.meta.url), 'utf8'),
      ),
    );
  });
  const data = await loadAtlas();
  const park = data.communities.features.find(
    (feature) => feature.properties.comm_code === 'FPK',
  )?.properties;
  assert.ok(park);
  assert.equal(park.sector, '');
  assert.equal(
    `${park.name} ${park.comm_code} ${park.sector}`
      .toLowerCase()
      .includes('ne'),
    false,
  );
  assert.equal(titleCase(park.name), 'Fish Creek Park');
  assert.equal(titleCase(park.sector), '');
  assert.ok(
    data.communities.features.every(
      (feature) => typeof feature.properties.sector === 'string',
    ),
  );
});

test('optional source labels do not crash the interface', () => {
  assert.equal(titleCase(undefined), '');
  assert.equal(titleCase(null), '');
  assert.equal(titleCase('1768 7 AV NW'), '1768 7 Ave NW');
});
