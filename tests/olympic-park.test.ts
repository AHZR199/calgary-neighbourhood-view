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
import { containsPoint } from '../lib/atlas/geography';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';
import {
  OLYMPIC_JUMPS,
  OLYMPIC_PARK,
  createOlympicParkModel,
  olympicParkMetresToLngLat,
} from '../lib/atlas/olympic-park-model';

test('the main tower uses physical height, lies in its mapped footprint and stays grounded', () => {
  const model = createOlympicParkModel();
  const bounds = new Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(Math.abs(bounds.max.y - 58) < 0.001);
  assert.equal(OLYMPIC_PARK.heightMetres, 58);
  assert.ok(bounds.max.x - bounds.min.x < 135);
  assert.ok(bounds.max.z - bounds.min.z < 365);
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
    const bounds = new Box3().setFromObject(ramp);
    assert.ok(
      bounds.min.y >= 5.19,
      'the custom ramp stays above the existing 5 m extrusion',
    );
    const midpoint = new Vector3(
      (jump.start[0] + jump.end[0]) / 2,
      70,
      (jump.start[1] + jump.end[1]) / 2,
    );
    const hit = new Raycaster(midpoint, new Vector3(0, -1, 0)).intersectObject(
      ramp,
    );
    assert.ok(hit.length > 0, 'the top face must render from above');
  });
  disposeCalgaryTowerModel(model);
});

test('landing relief remains shallow and detailed structures have a bounded rendering cost', () => {
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
    if (object.name === 'mapped landing strip') {
      landings++;
      const bounds = new Box3().setFromObject(object);
      assert.ok(bounds.min.y >= 0);
      assert.ok(
        bounds.max.y < 3,
        'do not invent a giant hillside on the flat map',
      );
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
      assert.equal(material.transparent, false);
  });
  assert.equal(landings, 3);
  assert.ok(meshes < 40);
  assert.ok(vertices < 10000);
  assert.ok(instances > 1000 && instances < 2500);
  for (const name of [
    'main concrete tower',
    'observation glazing',
    'window mullions',
    'inrun safety handrails',
    'paired ski grooves',
    'inrun access stair treads',
    'inrun concrete trestles',
    'trestle cross bracing',
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
