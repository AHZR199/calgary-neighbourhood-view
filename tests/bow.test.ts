import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Box3,
  BufferGeometry,
  CatmullRomCurve3,
  InstancedMesh,
  Material,
  Mesh,
  Raycaster,
  Vector3,
} from 'three';
import { BOW, createBowModel } from '../lib/atlas/bow-model';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';

test('Bow construction samples curves by plan position instead of repeating them on every floor', () => {
  const originalPoint = CatmullRomCurve3.prototype.getPointAt;
  const originalTangent = CatmullRomCurve3.prototype.getTangentAt;
  let points = 0;
  let tangents = 0;
  CatmullRomCurve3.prototype.getPointAt = function (...args) {
    points++;
    return originalPoint.apply(this, args);
  };
  CatmullRomCurve3.prototype.getTangentAt = function (...args) {
    tangents++;
    return originalTangent.apply(this, args);
  };
  try {
    for (let build = 0; build < 2; build++) {
      points = tangents = 0;
      const model = createBowModel();
      disposeCalgaryTowerModel(model);
      assert.ok(points > 0 && points < 400);
      assert.ok(tangents > 0 && tangents < 256);
    }
  } finally {
    CatmullRomCurve3.prototype.getPointAt = originalPoint;
    CatmullRomCurve3.prototype.getTangentAt = originalTangent;
  }
});

test('the Bow uses the published height and mapped footprint orientation', () => {
  const model = createBowModel();
  const bounds = new Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(Math.abs(bounds.max.y - 237.5) < 0.001);
  assert.equal(BOW.heightMetres, 237.5);
  assert.deepEqual(BOW.basemapFeatureIds, [1277414992]);

  //allow two metres for rounded curves and the framing outside the mapped glass.
  const metresPerLatitude = 111320;
  const metresPerLongitude =
    metresPerLatitude * Math.cos((BOW.coordinates[1] * Math.PI) / 180);
  const longitude = [bounds.min.x, bounds.max.x].map(
    (x) => BOW.coordinates[0] + x / metresPerLongitude,
  );
  const latitude = [bounds.max.z, bounds.min.z].map(
    (z) => BOW.coordinates[1] - z / metresPerLatitude,
  );
  assert.ok(longitude[0] >= BOW.coarseBounds[0] - 2 / metresPerLongitude);
  assert.ok(longitude[1] <= BOW.coarseBounds[2] + 2 / metresPerLongitude);
  assert.ok(latitude[0] >= BOW.coarseBounds[1] - 2 / metresPerLatitude);
  assert.ok(latitude[1] <= BOW.coarseBounds[3] + 2 / metresPerLatitude);

  const down = new Vector3(0, -1, 0);
  const plaza = new Raycaster(new Vector3(-30, 300, 25), down).intersectObject(
    model,
    true,
  );
  const offices = new Raycaster(
    new Vector3(-5, 300, -12),
    down,
  ).intersectObject(model, true);
  assert.equal(
    plaza.length,
    0,
    'the southwest-facing concavity stays open rather than becoming a solid block',
  );
  assert.ok(offices.some((hit) => hit.object.name === 'upper roof coping'));
  disposeCalgaryTowerModel(model);
});

test('detailed glazing and diagrid stay finite and within the shared-map rendering budget', () => {
  const model = createBowModel();
  let meshes = 0;
  let vertices = 0;
  let instances = 0;
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
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      assert.equal(
        material.transparent,
        false,
        'opaque glazing avoids expensive sorted transparency',
      );
    }
  });
  assert.ok(meshes <= 14);
  assert.ok(vertices < 100000);
  assert.ok(instances > 1000 && instances < 2500);
  for (const name of [
    'curved blue glazing',
    'floor spandrel ribbons',
    'six storey diagrid',
    'rounded end core edges',
    'setback mechanical roof',
    'roof maintenance rail',
  ])
    assert.ok(
      model.getObjectByName(name),
      `missing architectural element: ${name}`,
    );
  assert.equal(model.userData.units, 'metres');
  assert.equal(model.userData.axes, 'x east, y up, z south');
  disposeCalgaryTowerModel(model);
});

test('the shared landmark disposer releases Bow buffers and materials without double-disposing', () => {
  const model = createBowModel();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  let instanceCount = 0;
  let disposedInstances = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(material);
    if (object instanceof InstancedMesh) {
      instanceCount++;
      object.addEventListener('dispose', () => disposedInstances++);
    }
  });
  let disposedGeometry = 0;
  let disposedMaterials = 0;
  for (const item of geometries)
    item.addEventListener('dispose', () => disposedGeometry++);
  for (const item of materials)
    item.addEventListener('dispose', () => disposedMaterials++);
  disposeCalgaryTowerModel(model);
  assert.equal(disposedGeometry, geometries.size);
  assert.equal(disposedMaterials, materials.size);
  assert.equal(disposedInstances, instanceCount);
  assert.equal(model.children.length, 0);
  disposeCalgaryTowerModel(model);
  assert.equal(disposedGeometry, geometries.size);
  assert.equal(disposedMaterials, materials.size);
});
