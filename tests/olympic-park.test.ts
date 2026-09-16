import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Box3,
  BufferGeometry,
  InstancedMesh,
  Material,
  Mesh,
  Raycaster,
  Vector3,
} from 'three';
import {
  olympicGroundHeight,
  olympicTerrainWeight,
} from '../lib/atlas/olympic-park-terrain';
import { containsPoint } from '../lib/atlas/geography';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';
import {
  OLYMPIC_JUMPS,
  OLYMPIC_PARK,
  createOlympicParkModel,
  olympicParkMetresToLngLat,
  olympicRampPoint,
} from '../lib/atlas/olympic-park-model';

test('the main tower uses physical height, lies in its mapped footprint and stays grounded', () => {
  const model = createOlympicParkModel();
  const bounds = new Box3().setFromObject(model);
  assert.ok(bounds.min.y >= 0);
  assert.ok(bounds.max.y > 150 && bounds.max.y < 170);
  assert.equal(model.userData.mainTowerPhysicalHeight, 58);
  assert.ok(Math.abs(olympicGroundHeight(0, 0) - 96.7) < 1);
  assert.ok(olympicGroundHeight(65, -303) < 1);
  assert.equal(OLYMPIC_PARK.heightMetres, 58);
  assert.ok(bounds.max.x - bounds.min.x <= 390);
  assert.ok(bounds.max.z - bounds.min.z <= 540);
  assert.ok(
    containsPoint(OLYMPIC_PARK.coordinates, {
      type: 'Polygon',
      coordinates: [
        [
          [-114.213114, 51.0767853],
          [-114.2129398, 51.0767484],
          [-114.213027, 51.0765858],
          [-114.2132012, 51.0766227],
          [-114.213114, 51.0767853],
        ],
      ],
    }),
  );
  assert.deepEqual(
    OLYMPIC_PARK.basemapFeatureIds,
    [],
    'the basemap groups these 5 m ramps with 258 unrelated building parts',
  );
  assert.equal(model.userData.operatingSkiJumps, false);
  assert.equal(model.userData.units, 'metres');
  assert.equal(model.userData.axes, 'x east, y up, z south');
  disposeCalgaryTowerModel(model);
});

test('inrun headings and endpoints follow the mapped ramps without flipping north and south', () => {
  //independent midpoints of the osm ramp edges, fetched 16 september 2026.
  const mappedPlan = [
    { start: [-114.21304055, 51.07676975], end: [-114.21273745, 51.0773953] },
    { start: [-114.2132579, 51.07717055], end: [-114.21288005, 51.0778662] },
    { start: [-114.2120747, 51.07633235], end: [-114.21188395, 51.07688365] },
    { start: [-114.2115963, 51.0767127], end: [-114.2115563, 51.0771295] },
  ];
  const model = createOlympicParkModel();
  OLYMPIC_JUMPS.forEach((jump, i) => {
    const start = olympicParkMetresToLngLat(jump.start);
    const end = olympicParkMetresToLngLat(jump.end);
    for (const [actual, expected] of [
      [start, mappedPlan[i].start],
      [end, mappedPlan[i].end],
    ]) {
      assert.ok(Math.abs(actual[0] - expected[0]) < 0.000001);
      assert.ok(Math.abs(actual[1] - expected[1]) < 0.000001);
    }
    assert.ok(end[1] > start[1]);
    assert.ok(end[0] > start[0]);
    const ramp = model.getObjectByName(`${jump.name} curved inrun`) as Mesh;
    assert.equal(ramp.userData.osmWay, jump.rampWay);
    const top = olympicRampPoint(jump, 0);
    const bottom = olympicRampPoint(jump, 1);
    assert.ok(top.y > bottom.y);
    assert.equal(olympicTerrainWeight(...jump.centre), 1);
    if (i === 3) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const point = olympicRampPoint(jump, t);
        assert.ok(
          Math.abs(point.y - olympicGroundHeight(point.x, point.z) - 0.65) <
            0.001,
        );
      }
    } else {
      assert.ok(
        Math.abs(
          top.y - olympicGroundHeight(...jump.centre) - jump.deckHeight,
        ) < 0.001,
      );
      assert.ok(
        Math.abs(bottom.y - olympicGroundHeight(...jump.end) - 3.4) < 0.001,
      );
    }
    const midpoint = new Vector3(
      (jump.start[0] + jump.end[0]) / 2,
      200,
      (jump.start[1] + jump.end[1]) / 2,
    );
    const hit = new Raycaster(midpoint, new Vector3(0, -1, 0)).intersectObject(
      ramp,
    );
    assert.ok(hit.length > 0, 'the top face must render from above');
  });
  disposeCalgaryTowerModel(model);
});

test('landings follow licensed terrain and detailed structures have a bounded rendering cost', () => {
  const model = createOlympicParkModel();
  let meshes = 0;
  let vertices = 0;
  let instances = 0;
  let landings = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    meshes++;
    const position = object.geometry.getAttribute('position');
    vertices += position.count;
    for (const value of position.array) assert.ok(Number.isFinite(value));
    if (object instanceof InstancedMesh) {
      instances += object.count;
      for (const value of object.instanceMatrix.array)
        assert.ok(Number.isFinite(value));
    }
    if (object.name.endsWith('landing')) {
      landings++;
      for (let vertex = 0; vertex < position.count; vertex++) {
        assert.ok(
          Math.abs(
            position.getY(vertex) -
              olympicGroundHeight(
                position.getX(vertex),
                position.getZ(vertex),
              ) -
              0.24,
          ) < 0.001,
        );
      }
      const normals = object.geometry.getAttribute('normal');
      for (let vertex = 0; vertex < normals.count; vertex++)
        assert.ok(
          normals.getY(vertex) > 0,
          'all landing triangles face upward',
        );
    }
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      assert.equal(material.transparent, object.name === 'lidar hillside');
  });
  assert.equal(landings, 4);
  assert.ok(meshes < 65);
  assert.ok(vertices < 34000);
  assert.ok(instances > 1000 && instances < 2500);
  for (const name of [
    'main concrete tower',
    'lidar hillside',
    'inrun safety handrails',
    'paired ski grooves',
    'inrun access stair treads',
    'solid inrun support walls',
  ])
    assert.ok(
      model.getObjectByName(name),
      `missing architectural detail: ${name}`,
    );
  disposeCalgaryTowerModel(model);
});

test('the shared disposer releases the model and its instanced GPU resources once', () => {
  const model = createOlympicParkModel();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  let instanceCount = 0;
  let instancesDisposed = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(material);
    if (object instanceof InstancedMesh) {
      instanceCount++;
      object.addEventListener('dispose', () => instancesDisposed++);
    }
  });
  let geometryCount = 0;
  let materialCount = 0;
  for (const geometry of geometries)
    geometry.addEventListener('dispose', () => geometryCount++);
  for (const material of materials)
    material.addEventListener('dispose', () => materialCount++);
  disposeCalgaryTowerModel(model);
  assert.equal(geometryCount, geometries.size);
  assert.equal(materialCount, materials.size);
  assert.equal(instancesDisposed, instanceCount);
  assert.equal(model.children.length, 0);
  disposeCalgaryTowerModel(model);
  assert.equal(geometryCount, geometries.size);
  assert.equal(materialCount, materials.size);
});
