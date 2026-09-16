import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, InstancedMesh, Mesh, Raycaster, Vector3 } from 'three';
import {
  WONDERLAND,
  createWonderlandModel,
} from '../lib/atlas/wonderland-model';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';

test('Wonderland is a hollow approximate head at the mapped artwork point', () => {
  const model = createWonderlandModel();
  const bounds = new Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y) < 0.03);
  assert.ok(Math.abs(bounds.max.y - 12) < 0.03);
  assert.ok(Math.abs(bounds.max.x - bounds.min.x - 10.7) < 0.04);
  assert.ok(Math.abs(bounds.max.z - bounds.min.z - 7.8) < 0.04);
  assert.equal(WONDERLAND.artist, 'Jaume Plensa');
  assert.deepEqual(
    WONDERLAND.basemapFeatureIds,
    [],
    'a mapped artwork point is not a building to hide',
  );
  assert.equal(model.userData.simplifiedDepiction, true);
  assert.equal(model.userData.hollow, true);
  //the two side arches form a clear passage through the neck; no solid skin or fill.
  const throughNeck = new Raycaster(
    new Vector3(0.95, 1, -8),
    new Vector3(0, 0, 1),
  ).intersectObject(model, true);
  assert.equal(throughNeck.length, 0);
  assert.ok(model.getObjectByName('two open neck arches'));
  disposeCalgaryTowerModel(model);
});

test('Wonderland uses finite instanced wire geometry with a bounded render cost', () => {
  const model = createWonderlandModel();
  let meshCount = 0;
  let instances = 0;
  let geometryDisposals = 0;
  let materialDisposals = 0;
  let instanceDisposals = 0;
  let geometry: Mesh['geometry'] | undefined;
  let material: Mesh['material'] | undefined;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    meshCount++;
    assert.ok(object instanceof InstancedMesh);
    instances += object.count;
    for (const value of object.instanceMatrix.array)
      assert.ok(Number.isFinite(value));
    for (const value of object.geometry.getAttribute('position').array)
      assert.ok(Number.isFinite(value));
    assert.equal(Array.isArray(object.material), false);
    if (!Array.isArray(object.material))
      assert.equal(object.material.transparent, false);
    if (geometry) assert.equal(object.geometry, geometry);
    if (material) assert.equal(object.material, material);
    geometry = object.geometry;
    material = object.material;
    object.addEventListener('dispose', () => instanceDisposals++);
  });
  assert.equal(meshCount, 2);
  assert.ok(instances > 5000 && instances < 7300);
  assert.ok(geometry && material && !Array.isArray(material));
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  disposeCalgaryTowerModel(model);
  disposeCalgaryTowerModel(model);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.equal(instanceDisposals, 2);
});
