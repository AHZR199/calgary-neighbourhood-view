import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import {
  listSchools,
  schoolAreaCodes,
  schoolLevels,
  schoolWebsite,
  type SchoolData,
} from '../lib/atlas/schools';

const data = JSON.parse(
  readFileSync(
    new URL('../public/data/schools.geojson', import.meta.url),
    'utf8',
  ),
) as SchoolData;
const all = {
  point: [-114.096, 51.057] as [number, number],
  mode: 'nearby' as const,
  radiusKm: null,
  level: 'all' as const,
};

test('source level flags keep combined schools and unknown levels without guessing from names', () => {
  assert.deepEqual(
    schoolLevels({ elem: 'Y', junior_h: 'Y', senior_h: 'Y', postsecond: 'N' })
      .levels,
    ['elementary', 'juniorHigh', 'high'],
  );
  assert.deepEqual(
    schoolLevels({
      name: 'Example High School',
      elem: 'N',
      junior_h: 'N',
      senior_h: 'N',
      postsecond: 'N',
    }).levels,
    ['unknown'],
  );
  assert.deepEqual(schoolLevels({ postsecond: 'Y' }).levels, []);
  assert.throws(
    () => schoolLevels({ elem: 'yes' }),
    /Unknown school-level flag/,
  );
});

test('published registry reconciles all schools, includes unknowns and does not collapse shared campuses', () => {
  const schools = listSchools(data, all);
  assert.equal(data.features.length, 506);
  assert.equal(schools.length, 499);
  assert.equal(new Set(schools.map((school) => school.id)).size, 499);
  assert.ok(
    new Set(schools.map((school) => school.coordinates.join(','))).size <
      schools.length,
  );
  assert.equal(listSchools(data, { ...all, level: 'unknown' }).length, 31);
  assert.equal(listSchools(data, { ...all, level: 'elementary' }).length, 385);
  assert.equal(listSchools(data, { ...all, level: 'juniorHigh' }).length, 202);
  assert.equal(listSchools(data, { ...all, level: 'high' }).length, 111);
  assert.ok(schools.every((school) => school.postSecondary !== true));
});

test('area membership uses polygons including holes, not a bounding box or an address suffix', () => {
  const geometry: Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1],
      ],
    ],
  };
  const areas: FeatureCollection<Polygon | MultiPolygon> = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { comm_code: 'AREA' }, geometry },
      {
        type: 'Feature',
        properties: { comm_code: 'Q_NW' },
        geometry: { type: 'MultiPolygon', coordinates: [geometry.coordinates] },
      },
    ],
  };
  assert.deepEqual(schoolAreaCodes([0.5, 0.5], areas), ['AREA', 'Q_NW']);
  assert.deepEqual(schoolAreaCodes([2, 2], areas), []);
  assert.deepEqual(schoolAreaCodes([5, 2], areas), []);
  assert.equal(
    listSchools(data, { ...all, mode: 'area', communityCode: 'HIL' }).length,
    3,
  );
  assert.equal(
    listSchools(data, { ...all, mode: 'area', communityCode: 'DOES_NOT_EXIST' })
      .length,
    0,
  );
  assert.equal(
    listSchools(data, { ...all, mode: 'area', quadrant: 'NW' }).length,
    listSchools(data, { ...all, mode: 'area', communityCode: 'Q_NW' }).length,
  );
});

test('nearby searches cross community borders and every returned distance uses the selected origin', () => {
  const hillhurst = data.features.find(
    (feature) => feature.properties.name === 'Hillhurst School',
  )!;
  const point = hillhurst.geometry.coordinates as [number, number];
  const nearby = listSchools(data, {
    ...all,
    point,
    communityCode: 'HIL',
    radiusKm: 3,
  });
  assert.equal(nearby[0].name, 'Hillhurst School');
  assert.ok(nearby[0].distanceM < 0.01);
  assert.ok(nearby.some((school) => !school.inSelectedArea));
  assert.ok(
    nearby.every(
      (school, index) =>
        school.distanceM <= 3000 &&
        (!index || school.distanceM >= nearby[index - 1].distanceM),
    ),
  );
  assert.ok(
    listSchools(data, { ...all, point, radiusKm: 5 }).length >= nearby.length,
  );
  assert.throws(
    () => listSchools(data, { ...all, point: [NaN, 51] }),
    /origin/,
  );
  assert.throws(() => listSchools(data, { ...all, radiusKm: -1 }), /radius/);
});

test('search supports French names and filters do not invent an eligibility rule', () => {
  const schools = listSchools(data, { ...all, query: 'ecole' });
  assert.ok(schools.length > 0);
  assert.ok(schools.some((school) => school.name.includes('École')));
  const board = 'The Calgary School Division';
  assert.ok(
    listSchools(data, { ...all, board }).every(
      (school) => school.board === board,
    ),
  );
  const combined = listSchools(data, {
    ...all,
    query: 'Queen Elizabeth High School',
    level: 'juniorHigh',
  });
  assert.equal(combined.length, 1);
  assert.ok(combined[0].levels.includes('high'));
});

test('directory websites are optional safe links, with separate source provenance', () => {
  for (const invalid of [
    'javascript:alert(1)',
    'data:text/html,test',
    'https://user:password@example.com',
    'http://www.lynxecs.education; www.lynx.education',
    'www.example.com',
    null,
  ])
    assert.equal(schoolWebsite(invalid), null);
  assert.equal(
    schoolWebsite('https://example.com/school'),
    'https://example.com/school',
  );
  assert.equal(
    listSchools(data, all).filter((school) => school.website).length,
    438,
  );
  for (const { properties } of data.features) {
    assert.equal(schoolWebsite(properties.website), properties.website);
    assert.equal(
      Boolean(properties.websiteSourceUrl),
      Boolean(properties.website),
    );
  }
});

test('reviewed school location discrepancies remain visible without moving or dropping the source point', () => {
  const schools = listSchools(data, all);
  const chinook = schools.find(
    (school) => school.id === '{DF794E74-08FB-4D8D-8CF6-F40C501551EA}',
  )!;
  assert.equal(chinook.address, '2336 53 Ave SW');
  assert.deepEqual(chinook.coordinates, [-114.0654399, 51.0685884]);
  assert.equal(chinook.communityCode, 'TUX');
  assert.equal(chinook.quadrant, 'NW');
  assert.equal(
    chinook.locationNote,
    'The City publishes a southwest address with a map point in Tuxedo Park. Confirm the current campus before using this distance.',
  );
  assert.equal(schools.filter((school) => school.locationNote).length, 1);
  const qualityNotes = data.metadata.qualityNotes as { recordId: string }[];
  assert.deepEqual(qualityNotes.map((note) => note.recordId), [chinook.id]);
});
