import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  Box3,
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import {
  CENTRAL_LIBRARY,
  createCentralLibraryModel,
  disposeCentralLibraryModel,
  libraryArchHeight,
} from '../lib/atlas/central-library-model';
import {
  CITY_HALL,
  createCityHallModel,
  disposeCityHallModel,
} from '../lib/atlas/city-hall-model';

function inspectGeometry(model: Group) {
  let calls = 0,
    vertices = 0,
    triangles = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    calls++;
    const position = object.geometry.getAttribute('position');
    const normal = object.geometry.getAttribute('normal');
    vertices += position.count;
    triangles +=
      ((object.geometry.index?.count ?? position.count) / 3) *
      (object instanceof InstancedMesh ? object.count : 1);
    for (const value of position.array) assert.ok(Number.isFinite(value));
    for (const value of normal.array) assert.ok(Number.isFinite(value));
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      assert.equal(material.transparent, false);
      if (material instanceof MeshStandardMaterial)
        assert.equal(material.map, null);
    }
    if (object instanceof InstancedMesh)
      for (const value of object.instanceMatrix.array)
        assert.ok(Number.isFinite(value));
  });
  return { calls, vertices, triangles };
}

test('library geometry preserves the raised open arch and distinctive facade at approximate map scale', () => {
  const model = createCentralLibraryModel();
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(bounds.max.y - CENTRAL_LIBRARY.heightMetres) < 0.01);
  assert.ok(size.x > 55 && size.x < 80);
  assert.ok(size.z > 138 && size.z < 150);
  assert.ok(libraryArchHeight(-7) > 10);
  assert.ok(libraryArchHeight(55) < 1);
  const facade = model.getObjectByName(
    'curved glass envelope above arch',
  ) as Mesh;
  const points = facade.geometry.getAttribute('position');
  for (let i = 0; i < points.count; i += 2) {
    assert.ok(
      Math.abs(points.getY(i) - libraryArchHeight(points.getZ(i))) < 0.001,
    );
    if (Math.abs(points.getZ(i) + 7) < 8) assert.ok(points.getY(i) > 9);
  }
  for (const name of [
    'hexagonal facade frames',
    'alternating opaque hexagonal panels',
    'wood lined sweeping arch soffit',
    'pointed oval roof skylight',
    'raised entrance plaza',
  ])
    assert.ok(model.getObjectByName(name));
  const stats = inspectGeometry(model);
  assert.ok(stats.calls < 35, JSON.stringify(stats));
  assert.ok(stats.vertices < 30000, JSON.stringify(stats));
  assert.ok(stats.triangles < 25000, JSON.stringify(stats));
  assert.equal(CENTRAL_LIBRARY.heightIsApproximate, true);
  disposeCentralLibraryModel(model);
});

test('a merged library feature is only suppressed with an exact unrelated-building restore', () => {
  const restore = JSON.parse(
    readFileSync(
      new URL(
        '../public/data/library-building-restore.geojson',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.equal(
    CENTRAL_LIBRARY.requiresBuildingRestore,
    '/data/library-building-restore.geojson',
  );
  assert.deepEqual(CENTRAL_LIBRARY.basemapFeatureIds, [4968240260]);
  assert.equal(restore.features.length, 1);
  const feature = restore.features[0];
  assert.equal(feature.geometry.type, 'Polygon');
  assert.equal(feature.properties.originalFeatureId, 4968240260);
  assert.equal(feature.properties.render_height, 21);
  assert.equal(feature.properties.render_min_height, 0);
  for (const [lon, lat] of feature.geometry.coordinates[0]) {
    assert.ok(lon > -114.0492 && lon < -114.0485);
    assert.ok(lat > 51.0443 && lat < 51.0451);
  }
  assert.equal(
    restore.metadata.licenceUrl,
    'https://opendatacommons.org/licenses/odbl/1-0/',
  );
});

test('city hall keeps its west-facing clock tower distinct from the stepped municipal context', () => {
  const model = createCityHallModel();
  const historic = model.getObjectByName('Historic City Hall')!;
  const modern = model.getObjectByName('Modern Municipal Building')!;
  const historicBounds = new Box3().setFromObject(historic);
  const modernBounds = new Box3().setFromObject(modern);
  assert.ok(historicBounds.max.y > 32 && historicBounds.max.y < 33);
  assert.ok(Math.abs(modernBounds.max.y - CITY_HALL.heightMetres) < 0.001);
  assert.ok(
    modernBounds.getCenter(new Vector3()).x >
      historicBounds.getCenter(new Vector3()).x + 35,
  );
  assert.ok(
    modernBounds.getCenter(new Vector3()).z >
      historicBounds.getCenter(new Vector3()).z + 40,
  );
  const tower = model.getObjectByName('square clock tower shaft')!;
  assert.ok(tower.position.x < -18);
  assert.equal(model.userData.clockIsLive, false);
  assert.equal(model.children[0].rotation.y, -0.035);
  for (const name of [
    'steep red mansard roof',
    'octagonal glazed roof dome',
    'entrance semicircular stone arch',
    'recessed sash windows',
    'municipal curtain wall grid',
    'municipal stepped roof terraces',
  ])
    assert.ok(model.getObjectByName(name));
  assert.equal(
    CITY_HALL.basemapFeatureIds.includes(108082730),
    false,
    'never hide the merged historic building outline',
  );
  const stats = inspectGeometry(model);
  assert.ok(stats.calls < 65, JSON.stringify(stats));
  assert.ok(stats.vertices < 15000, JSON.stringify(stats));
  assert.ok(stats.triangles < 85000, JSON.stringify(stats));
  disposeCityHallModel(model);
});

for (const [name, create, dispose] of [
  ['library', createCentralLibraryModel, disposeCentralLibraryModel],
  ['city hall', createCityHallModel, disposeCityHallModel],
] as const) {
  test(`${name} cleanup disposes each shared geometry, material and instance buffer once`, () => {
    const model = create();
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    let instances = 0,
      disposedInstances = 0;
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
      if (object instanceof InstancedMesh) {
        instances++;
        object.addEventListener('dispose', () => disposedInstances++);
      }
    });
    let g = 0,
      m = 0;
    for (const item of geometries) item.addEventListener('dispose', () => g++);
    for (const item of materials) item.addEventListener('dispose', () => m++);
    dispose(model);
    assert.equal(g, geometries.size);
    assert.equal(m, materials.size);
    assert.equal(instances, disposedInstances);
    assert.equal(model.children.length, 0);
    dispose(model);
    assert.equal(g, geometries.size);
  });
}
