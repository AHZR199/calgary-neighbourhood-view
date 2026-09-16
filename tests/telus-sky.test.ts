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
import { TELUS_SKY, createTelusSkyModel } from '../lib/atlas/telus-sky-model';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';

test('TELUS Sky fits its mapped block and reported height with diagonal upper floors', () => {
  const model = createTelusSkyModel();
  const bounds = new Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(Math.abs(bounds.max.y - TELUS_SKY.heightMetres) < 0.001);
  assert.deepEqual(TELUS_SKY.basemapFeatureIds, [5002940612]);
  const longitudeScale =
    111320 * Math.cos((TELUS_SKY.coordinates[1] * Math.PI) / 180);
  assert.ok(
    TELUS_SKY.coordinates[0] + bounds.min.x / longitudeScale >=
      TELUS_SKY.coarseBounds[0],
  );
  assert.ok(
    TELUS_SKY.coordinates[0] + bounds.max.x / longitudeScale <=
      TELUS_SKY.coarseBounds[2],
  );
  assert.ok(
    TELUS_SKY.coordinates[1] - bounds.max.z / 111320 >=
      TELUS_SKY.coarseBounds[1],
  );
  assert.ok(
    TELUS_SKY.coordinates[1] - bounds.min.z / 111320 <=
      TELUS_SKY.coarseBounds[3],
  );
  const down = new Vector3(0, -1, 0);
  const centre = new Raycaster(
    new Vector3(-22, 250, -10),
    down,
  ).intersectObject(model, true);
  const corner = new Raycaster(new Vector3(-22, 250, 12), down).intersectObject(
    model,
    true,
  );
  assert.ok(centre[0].point.y > 220);
  assert.ok(
    corner.length && corner[0].point.y < 160,
    'the opposing corners recede instead of making a rectangular tower',
  );
  for (const name of [
    'pale pixel facade frames',
    'residential balcony rails',
    'diagonal roof cap',
    'north podium connection',
  ])
    assert.ok(model.getObjectByName(name));
  disposeCalgaryTowerModel(model);
});

test('TELUS Sky batches opaque details and releases every GPU resource once', () => {
  const model = createTelusSkyModel();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  let meshes = 0;
  let vertices = 0;
  let instances = 0;
  let disposedInstances = 0;
  let instanceGroups = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    meshes++;
    geometries.add(object.geometry);
    const positions = object.geometry.getAttribute('position');
    vertices += positions.count;
    for (const coordinate of positions.array)
      assert.ok(Number.isFinite(coordinate));
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      assert.equal(material.transparent, false);
    }
    if (object instanceof InstancedMesh) {
      instances += object.count;
      instanceGroups++;
      for (const value of object.instanceMatrix.array)
        assert.ok(Number.isFinite(value));
      object.addEventListener('dispose', () => disposedInstances++);
    }
  });
  assert.ok(meshes <= 10 && vertices < 35000 && instances < 13000);
  let disposedGeometry = 0;
  let disposedMaterials = 0;
  for (const item of geometries)
    item.addEventListener('dispose', () => disposedGeometry++);
  for (const item of materials)
    item.addEventListener('dispose', () => disposedMaterials++);
  disposeCalgaryTowerModel(model);
  disposeCalgaryTowerModel(model);
  assert.equal(disposedGeometry, geometries.size);
  assert.equal(disposedMaterials, materials.size);
  assert.equal(disposedInstances, instanceGroups);
  assert.equal(model.children.length, 0);
});
