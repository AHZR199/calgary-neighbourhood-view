import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { searchCommunities } from '../lib/atlas/community-search';
import type { Community } from '../lib/atlas/data';

const communities: Community[] = [
  'communities.geojson',
  'quadrants.geojson',
].flatMap((file) => {
  const data = JSON.parse(
    readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'),
  );
  return data.features.map(
    (feature: { properties: Community }) => feature.properties,
  );
});

test('empty and whitespace-only searches retain the four detailed starting areas', () => {
  for (const query of ['', '   ', '\t\n'])
    assert.deepEqual(
      searchCommunities(communities, query).map(
        (community) => community.comm_code,
      ),
      ['BLN', 'BRD', 'HIL', 'SSD'],
    );
});

test('quadrant searches lead with the quadrant and only include its planning sector', () => {
  for (const [code, name] of [
    ['NE', 'North East'],
    ['NW', 'North West'],
    ['SE', 'South East'],
    ['SW', 'South West'],
  ]) {
    const canonical = searchCommunities(communities, code).map(
      (community) => community.comm_code,
    );
    for (const query of [
      code,
      code.toLowerCase(),
      name,
      name.replace(' ', ''),
      name.replace(' ', '-'),
      `  ${name} Calgary  `,
      `${code} quadrant`,
    ]) {
      const matches = searchCommunities(communities, query);
      assert.equal(matches[0]?.comm_code, `Q_${code}`, query);
      assert.deepEqual(
        matches.map((community) => community.comm_code),
        canonical,
        query,
      );
      assert.ok(matches.length <= 9, query);
      for (const community of matches.slice(1))
        assert.equal(
          community.sector.toLowerCase().replace(/[\s-]/g, ''),
          name.toLowerCase().replace(/\s/g, ''),
          `${query}: ${community.comm_code}`,
        );
    }
  }
  const northwest = searchCommunities(communities, 'North West');
  assert.ok(northwest.some((community) => community.class !== 'Quadrant'));
  const northeast = searchCommunities(communities, 'NE');
  assert.ok(
    northeast.every(
      (community) => !['BOW', 'BEL', 'BLN'].includes(community.comm_code),
    ),
    'NE does not match Bowness or Beltline merely because their names contain ne',
  );
});

test('exact neighbourhood names lead broad matches and search uses displayed names', () => {
  const hillhurst = searchCommunities(communities, '  hILLHURST  ');
  assert.equal(hillhurst[0].comm_code, 'HIL');
  assert.ok(hillhurst.some((community) => community.comm_code === 'WHL'));
  for (const query of ['Bridgeland / Riverside', 'Bridgeland/Riverside'])
    assert.equal(searchCommunities(communities, query)[0]?.comm_code, 'BRD');
});

test('missing optional source fields do not become searchable text', () => {
  const withoutOptionalFields = {
    comm_code: 'TEST',
    name: 'A test neighbourhood',
    class: 'Residential',
    centroid: [-114, 51],
    bounds: [-114.1, 50.9, -113.9, 51.1],
  } as Community;
  assert.deepEqual(searchCommunities([withoutOptionalFields], 'undefined'), []);
  assert.deepEqual(searchCommunities([withoutOptionalFields], 'null'), []);
  assert.deepEqual(searchCommunities([withoutOptionalFields], 'test'), [
    withoutOptionalFields,
  ]);
});

test('broad results are capped without reordering the source collection', () => {
  const originalOrder = communities.map((community) => community.comm_code);
  assert.equal(searchCommunities(communities, 'a').length, 9);
  assert.deepEqual(searchCommunities(communities, 'no such Calgary place'), []);
  assert.deepEqual(
    communities.map((community) => community.comm_code),
    originalOrder,
  );
});
