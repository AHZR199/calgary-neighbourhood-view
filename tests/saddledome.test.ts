import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Box3,
  BufferGeometry,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import {
  createSaddledomeModel,
  disposeSaddledomeModel,
  SADDLEDOME,
  saddledomeRoofHeight,
} from '../lib/atlas/saddledome-model';

test('the saddle rises east and west and falls north and south', () => {
  const centre = saddledomeRoofHeight(0, 0);
  assert.ok(saddledomeRoofHeight(70, 0) > centre);
  assert.ok(saddledomeRoofHeight(0, 69.5) < centre);
  assert.equal(saddledomeRoofHeight(70, 0), saddledomeRoofHeight(-70, 0));
  assert.equal(saddledomeRoofHeight(0, 69.5), saddledomeRoofHeight(0, -69.5));
  const model = createSaddledomeModel();
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(Math.abs(bounds.max.y - SADDLEDOME.heightMetres) < 0.01);
  assert.ok(size.x > 140 && size.x < 165);
  assert.ok(size.z > 138 && size.z < 150);
  assert.equal(SADDLEDOME.heightIsApproximate, true);
  assert.deepEqual(SADDLEDOME.coordinates, [-114.0519846, 51.0374081]);
  assert.deepEqual(
    SADDLEDOME.basemapFeatureIds,
    [],
    'the arena is part of a merged building feature, which must stay visible',
  );
  assert.equal(model.userData.axes, 'x east, y up, z south');
  disposeSaddledomeModel(model);
});

test('roof and exterior details use finite opaque geometry with bounded rendering cost', () => {
  const model = createSaddledomeModel();
  let drawCalls = 0;
  let vertices = 0;
  let triangles = 0;
  let instances = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    drawCalls++;
    const positions = object.geometry.getAttribute('position');
    const normals = object.geometry.getAttribute('normal');
    vertices += positions.count;
    triangles +=
      ((object.geometry.index?.count ?? positions.count) / 3) *
      (object instanceof InstancedMesh ? object.count : 1);
    for (const value of positions.array) assert.ok(Number.isFinite(value));
    for (const value of normals.array) assert.ok(Number.isFinite(value));
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      assert.equal(material.transparent, false);
      if (material instanceof MeshStandardMaterial)
        assert.equal(material.map, null, 'no remote images or textures');
    }
    if (object instanceof InstancedMesh) {
      instances += object.count;
      for (const value of object.instanceMatrix.array)
        assert.ok(Number.isFinite(value));
    }
  });
  assert.ok(drawCalls <= 25, `${drawCalls} draw calls`);
  assert.ok(vertices < 20000, `${vertices} stored vertices`);
  assert.ok(triangles < 40000, `${triangles} instanced triangles`);
  assert.ok(instances > 500);
  for (const name of [
    'continuous saddle roof',
    'saddle perimeter ring beam',
    'roof panel seams',
    'curved red upper bowl enclosure',
    'concourse window mullions',
    'perimeter roof bearings',
    'west entrance glazed doors',
    'low end a frame supports',
  ]) {
    assert.ok(model.getObjectByName(name), `missing ${name}`);
  }
  const roof = model.getObjectByName('continuous saddle roof') as Mesh;
  const normals = roof.geometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i++)
    assert.ok(normals.getY(i) > 0.7, 'roof winding must face upward');
  disposeSaddledomeModel(model);
});

test('cleanup disposes shared resources once and clears instance buffers', () => {
  const model = createSaddledomeModel();
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
  disposeSaddledomeModel(model);
  assert.equal(disposedGeometry, geometries.size);
  assert.equal(disposedMaterials, materials.size);
  assert.equal(disposedInstances, instanceCount);
  assert.equal(model.children.length, 0);
  disposeSaddledomeModel(model);
  assert.equal(disposedGeometry, geometries.size);
});
