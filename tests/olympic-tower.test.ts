import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, InstancedMesh, Mesh, Raycaster, Vector3 } from 'three';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';
import {
  OLYMPIC_TOWER,
  createOlympicTowerModel,
} from '../lib/atlas/olympic-tower-model';

test('the ski-jump head has a recessed opening that the inrun can enter', () => {
  const tower = createOlympicTowerModel();
  tower.updateMatrixWorld(true);
  const portal = tower.getObjectByName('inrun portal');
  assert.ok(portal);
  assert.equal(portal.position.y, OLYMPIC_TOWER.portalHeightMetres);
  const hit = new Raycaster(
    new Vector3(0, portal.position.y + 1.2, -30),
    new Vector3(0, 0, 1),
  ).intersectObject(tower, true);
  assert.ok(hit.length);
  assert.ok(
    hit[0].point.z > -2.2 && hit[0].point.z < -2,
    'the front portal must remain open rather than painted onto a solid box',
  );
  const facade = new Raycaster(
    new Vector3(0, 49.85, -30),
    new Vector3(0, 0, 1),
  ).intersectObject(tower, true);
  assert.ok(facade[0].point.z < -9.25);
  disposeCalgaryTowerModel(tower);
});

test('tower silhouette is grounded and outward-facing with a bounded rendering cost', () => {
  const tower = createOlympicTowerModel();
  tower.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(tower);
  assert.equal(tower.userData.architecturalHeightMetres, 58);
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(bounds.max.y > 64 && bounds.max.y < 65);
  assert.ok(bounds.max.x - bounds.min.x < 13.1);
  assert.ok(bounds.max.z - bounds.min.z < 19.2);
  for (const side of [-1, 1]) {
    const hits = new Raycaster(
      new Vector3(side * 20, 40, 4),
      new Vector3(-side, 0, 0),
    ).intersectObject(tower, true);
    assert.ok(hits.length);
    assert.ok(Math.abs(Math.abs(hits[0].point.x) - 6.425) < 0.001);
  }
  let meshes = 0;
  let instances = 0;
  tower.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    meshes++;
    for (const value of object.geometry.getAttribute('position').array)
      assert.ok(Number.isFinite(value));
    if (object instanceof InstancedMesh) instances += object.count;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      assert.equal(material.transparent, false);
  });
  assert.ok(meshes < 12);
  assert.ok(instances < 180);
  disposeCalgaryTowerModel(tower);
});
