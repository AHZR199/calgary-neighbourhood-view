import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, InstancedMesh, Mesh, Vector3 } from 'three';
import {
  PEACE_BRIDGE,
  createPeaceBridgeModel,
} from '../lib/atlas/peace-bridge-model';
import { disposeCalgaryTowerModel } from '../lib/atlas/calgary-tower-model';

test('Peace Bridge uses a clear span with published envelope and mapped orientation', () => {
  const model = createPeaceBridgeModel();
  model.rotation.y = 0;
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(Math.abs(size.y - PEACE_BRIDGE.heightMetres) < 0.001);
  assert.ok(size.x >= 126 && size.x < 131);
  assert.ok(size.z > 7.4 && size.z <= 8.1);
  assert.equal(PEACE_BRIDGE.lengthMetres, 126);
  assert.ok(
    PEACE_BRIDGE.rotationRadians < -0.8 && PEACE_BRIDGE.rotationRadians > -0.9,
  );
  assert.ok(model.getObjectByName('curved glazed canopy'));
  assert.ok(model.getObjectByName('2023 tension cable railing'));
  assert.equal(
    model.children.filter((part) => part.name === 'bank abutment').length,
    2,
  );
  assert.ok(!model.children.some((part) => /pier/i.test(part.name)));
  disposeCalgaryTowerModel(model);
});

test('bridge geometry stays finite and repeated elements use bounded instancing', () => {
  const model = createPeaceBridgeModel();
  let draws = 0;
  let vertices = 0;
  let instances = 0;
  model.traverse((part) => {
    if (!(part instanceof Mesh)) return;
    draws += Array.isArray(part.material) ? part.material.length : 1;
    const positions = part.geometry.getAttribute('position');
    vertices += positions.count;
    for (const value of positions.array) assert.ok(Number.isFinite(value));
    if (part instanceof InstancedMesh) instances += part.count;
  });
  assert.ok(draws <= 40);
  assert.ok(vertices < 15000);
  assert.ok(instances > 100);
  disposeCalgaryTowerModel(model);
  assert.deepEqual(
    new Box3().setFromObject(model).getSize(new Vector3()).toArray(),
    [0, 0, 0],
  );
});
