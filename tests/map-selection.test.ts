import assert from 'node:assert/strict';
import test from 'node:test';
import type { Polygon } from 'geojson';
import { buildingLookupPoint } from '../lib/atlas/map-selection';
import { containsPoint } from '../lib/atlas/geography';

test('a tilted roof click resolves inside a concave footprint, outside its courtyard', () => {
  const building: Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [6, 0],
        [6, 2],
        [2, 2],
        [2, 6],
        [0, 6],
        [0, 0],
      ],
      [
        [0.5, 0.5],
        [1.5, 0.5],
        [1.5, 1.5],
        [0.5, 1.5],
        [0.5, 0.5],
      ],
    ],
  };
  const result = buildingLookupPoint(building, [5, 5]);
  assert.ok(result && containsPoint(result, building));
  assert.deepEqual(buildingLookupPoint(building, [1, 4]), [1, 4]);
});

test('degenerate footprints do not invent a nearby home', () => {
  assert.equal(
    buildingLookupPoint(
      {
        type: 'Polygon',
        coordinates: [
          [
            [1, 1],
            [1, 1],
            [1, 1],
          ],
        ],
      },
      [0, 0],
    ),
    null,
  );
  assert.equal(
    buildingLookupPoint({ type: 'Point', coordinates: [1, 1] }, [0, 0]),
    null,
  );
});

test('a roof click stays with the closest part of a grouped building feature', () => {
  const point = buildingLookupPoint(
    {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        [
          [
            [10, 0],
            [30, 0],
            [30, 20],
            [10, 20],
            [10, 0],
          ],
        ],
      ],
    },
    [0.5, 1.2],
  );
  assert.deepEqual(point, [0.5, 0.5]);
});
