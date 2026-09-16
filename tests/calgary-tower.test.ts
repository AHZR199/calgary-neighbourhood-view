import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { FeatureCollection, Polygon } from 'geojson';
import { containsPoint } from '../lib/atlas/geography';
import test from 'node:test';
import {
  Box3,
  BufferGeometry,
  InstancedMesh,
  Material,
  Mesh,
  Vector3,
} from 'three';
import {
  CALGARY_TOWER,
  createCalgaryTowerModel,
  disposeCalgaryTowerModel,
} from '../lib/atlas/calgary-tower-model';

test('the landmark stays at ground level and uses the published overall height in metres', () => {
  const model = createCalgaryTowerModel();
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(bounds.min.y) < 0.001);
  assert.ok(Math.abs(bounds.max.y - 190.8) < 0.001);
  assert.ok(
    size.x > 30 && size.x < 41,
    'the crown has a plausible diameter without exaggeration',
  );
  assert.ok(size.z > 30 && size.z < 41);
  assert.deepEqual(
    CALGARY_TOWER.coordinates,
    [-114.06313680360175, 51.04430128061789],
  );
  assert.equal(model.userData.units, 'metres');
  disposeCalgaryTowerModel(model);
});

test('the original mesh has finite geometry, separate architectural details and bounded draw calls', () => {
  const model = createCalgaryTowerModel();
  let drawCalls = 0;
  let instances = 0;
  let vertices = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    drawCalls++;
    const positions = object.geometry.getAttribute('position');
    vertices += positions.count;
    for (const value of positions.array) assert.ok(Number.isFinite(value));
    if (object instanceof InstancedMesh) {
      instances += object.count;
      for (const value of object.instanceMatrix.array)
        assert.ok(Number.isFinite(value));
    }
  });
  assert.ok(
    drawCalls < 50,
    'repeated windows and ribs should remain instanced',
  );
  assert.ok(vertices < 45000);
  assert.ok(instances > 250);
  for (const name of [
    'tapered concrete shaft',
    'restaurant glazing',
    'observation window mullions',
    'red crown',
    'domed pale roof',
    'cauldron rim',
    'glass observation floor',
  ]) {
    assert.ok(
      model.getObjectByName(name),
      `missing architectural detail: ${name}`,
    );
  }
  disposeCalgaryTowerModel(model);
});

test('removal disposes every geometry, shared material and instance buffer once', () => {
  const model = createCalgaryTowerModel();
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
  let geometriesDisposed = 0;
  let materialsDisposed = 0;
  for (const geometry of geometries)
    geometry.addEventListener('dispose', () => geometriesDisposed++);
  for (const material of materials)
    material.addEventListener('dispose', () => materialsDisposed++);
  disposeCalgaryTowerModel(model);
  assert.equal(geometriesDisposed, geometries.size);
  assert.equal(materialsDisposed, materials.size);
  assert.equal(instancesDisposed, instanceCount);
  assert.equal(model.children.length, 0);
  disposeCalgaryTowerModel(model);
  assert.equal(geometriesDisposed, geometries.size);
});

test('the tower centre and replacement ID match the published tower-only footprint', () => {
  const footprints = JSON.parse(
    readFileSync(
      new URL('../public/data/landmark-footprints.geojson', import.meta.url),
      'utf8',
    ),
  ) as FeatureCollection<Polygon>;
  const footprint = footprints.features.find(
    (feature) => feature.id === 25719793,
  );
  assert.ok(
    footprint,
    'retain the openly licensed alignment evidence with the model',
  );
  assert.equal(
    footprint.properties?.mapFeatureId,
    CALGARY_TOWER.basemapFeatureId,
  );
  assert.equal(
    footprint.properties?.sourceUrl,
    CALGARY_TOWER.locationSourceUrl,
  );
  assert.ok(containsPoint(CALGARY_TOWER.coordinates, footprint.geometry));
  const [west, south, east, north] = CALGARY_TOWER.coarseBounds;
  for (const [longitude, latitude] of footprint.geometry.coordinates[0]) {
    assert.ok(longitude >= west && longitude <= east);
    assert.ok(latitude >= south && latitude <= north);
  }
});
