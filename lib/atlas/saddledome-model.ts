import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';

export const SADDLEDOME = {
  id: 'saddledome-landmark',
  coordinates: [-114.0519846, 51.0374081] as [number, number],
  heightMetres: 41,
  heightIsApproximate: true,
  footprintMetres: [154.2, 142] as [number, number],
  footprintIsApproximate: true,
  rotationRadians: 0,
  //the tile combines this arena with 1,386 other buildings. never hide that shared id.
  basemapFeatureIds: [] as number[],
  sourceUrl: 'https://www.scotiabanksaddledome.com/building-design/',
  structureSourceUrl:
    'https://diglib.tugraz.at/download.php?id=68ac3d93379e5&location=browse',
  locationSourceUrl: 'https://data.calgary.ca/d/x34e-bcjz',
  locationMethod:
    'City visitor-information point, aligned to the approximate OpenStreetMap outline in the 13 September 2026 OpenFreeMap snapshot; not a survey.',
  detail:
    'Original architectural illustration of the saddle roof, ring beam and concourse. Roof orientation follows published engineering research; height, facade details and smaller dimensions are approximate.',
};

const radiusX = 70;
const radiusZ = 69.5;
const edgeSegments = 160;

//local x is east, y is up and z is south. the high roof ends face east and west.
export function saddledomeRoofHeight(x: number, z: number) {
  return 27.5 + 13.5 * (x / radiusX) ** 2 - 12.2 * (z / radiusZ) ** 2;
}

function geometry(positions: number[], indices: number[]) {
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, 3));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

function saddleRoof() {
  const positions = [0, saddledomeRoofHeight(0, 0), 0];
  const indices: number[] = [];
  const rings = 28;
  for (let row = 1; row <= rings; row++) {
    const radius = row / rings;
    for (let i = 0; i < edgeSegments; i++) {
      const angle = (i / edgeSegments) * Math.PI * 2;
      const x = radiusX * radius * Math.cos(angle);
      const z = radiusZ * radius * Math.sin(angle);
      positions.push(x, saddledomeRoofHeight(x, z), z);
      const current = 1 + (row - 1) * edgeSegments + i;
      const next = 1 + (row - 1) * edgeSegments + ((i + 1) % edgeSegments);
      if (row === 1) indices.push(0, next, current);
      else {
        const previous = current - edgeSegments;
        const previousNext = next - edgeSegments;
        indices.push(previous, next, current, previous, previousNext, next);
      }
    }
  }
  return geometry(positions, indices);
}

function curvedWall(
  radius: number,
  lower: (x: number, z: number) => number,
  upper: (x: number, z: number) => number,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= edgeSegments; i++) {
    const angle = (i / edgeSegments) * Math.PI * 2;
    const x = radiusX * radius * Math.cos(angle);
    const z = radiusZ * radius * Math.sin(angle);
    positions.push(x, lower(x, z), z, x, upper(x, z), z);
    if (i < edgeSegments) {
      const at = i * 2;
      indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
    }
  }
  return geometry(positions, indices);
}

function roofRibbon(innerRadius: number, outerRadius: number, offset: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= edgeSegments; i++) {
    const angle = (i / edgeSegments) * Math.PI * 2;
    for (const radius of [innerRadius, outerRadius]) {
      const x = radiusX * radius * Math.cos(angle);
      const z = radiusZ * radius * Math.sin(angle);
      positions.push(x, saddledomeRoofHeight(x, z) + offset, z);
    }
    if (i < edgeSegments) {
      const at = i * 2;
      indices.push(at, at + 2, at + 1, at + 1, at + 2, at + 3);
    }
  }
  return geometry(positions, indices);
}

//thin mesh strips keep the roof panel rhythm readable without image textures.
function roofSeams() {
  const positions: number[] = [];
  const indices: number[] = [];
  const halfWidth = 0.095;
  for (const axis of ['x', 'z']) {
    for (let offset = -60; offset <= 60; offset += 6) {
      const fixedRadius = axis === 'x' ? radiusX : radiusZ;
      const runningRadius = axis === 'x' ? radiusZ : radiusX;
      const extent =
        runningRadius * Math.sqrt(0.97 ** 2 - (offset / fixedRadius) ** 2);
      const start = positions.length / 3;
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const along = ((i / steps) * 2 - 1) * extent;
        for (const side of [-halfWidth, halfWidth]) {
          const x = axis === 'x' ? offset + side : along;
          const z = axis === 'x' ? along : offset + side;
          positions.push(x, saddledomeRoofHeight(x, z) + 0.035, z);
        }
        if (i < steps) {
          const at = start + i * 2;
          indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
        }
      }
    }
  }
  return geometry(positions, indices);
}

export function createSaddledomeModel(): Group {
  const model = new Group();
  model.name = 'Saddledome';
  const concrete = new MeshStandardMaterial({
    color: '#bab8af',
    roughness: 0.92,
  });
  const paleConcrete = new MeshStandardMaterial({
    color: '#d1cfc6',
    roughness: 0.9,
  });
  const shadowConcrete = new MeshStandardMaterial({
    color: '#92958f',
    roughness: 0.9,
  });
  const roof = new MeshStandardMaterial({
    color: '#e2e2da',
    roughness: 0.86,
    side: DoubleSide,
  });
  const roofSeam = new MeshStandardMaterial({
    color: '#bac1bd',
    roughness: 0.85,
    side: DoubleSide,
  });
  const red = new MeshStandardMaterial({
    color: '#9f4140',
    roughness: 0.66,
    metalness: 0.12,
    side: DoubleSide,
  });
  const redRib = new MeshStandardMaterial({
    color: '#793c3a',
    roughness: 0.72,
  });
  const glass = new MeshStandardMaterial({
    color: '#455964',
    roughness: 0.3,
    metalness: 0.36,
  });
  const silver = new MeshStandardMaterial({
    color: '#c5c8c3',
    roughness: 0.48,
    metalness: 0.28,
  });

  function add(shape: BufferGeometry, material: Material, name: string) {
    const mesh = new Mesh(shape, material);
    mesh.name = name;
    model.add(mesh);
    return mesh;
  }
  function ellipse(
    name: string,
    topRadius: number,
    bottomRadius: number,
    lower: number,
    upper: number,
    material: Material,
  ) {
    const mesh = add(
      new CylinderGeometry(
        topRadius,
        bottomRadius,
        upper - lower,
        edgeSegments,
      ),
      material,
      name,
    );
    mesh.scale.z = radiusZ / radiusX;
    mesh.position.y = (lower + upper) / 2;
    return mesh;
  }
  function repeated(
    name: string,
    count: number,
    shape: BufferGeometry,
    material: Material,
    place: (object: Object3D, index: number) => void,
  ) {
    const mesh = new InstancedMesh(shape, material, count);
    const transform = new Object3D();
    for (let i = 0; i < count; i++) {
      transform.position.set(0, 0, 0);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      place(transform, i);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.name = name;
    mesh.instanceMatrix.needsUpdate = true;
    model.add(mesh);
    return mesh;
  }

  //an opaque raised base covers the coarse 5 m basemap extrusion without hiding neighbours.
  ellipse('concrete foundation', 71.5, 71.5, 0, 5.4, concrete);
  ellipse('lower concourse plinth', 70.9, 71.5, 5.4, 7.2, paleConcrete);
  ellipse('recessed concourse glazing', 69.8, 69.8, 7.2, 11.4, glass);
  ellipse('concourse concrete overhang', 71.1, 70.5, 11.4, 12.2, paleConcrete);
  ellipse('upper concourse shadow line', 68.9, 68.9, 12.2, 13, shadowConcrete);

  repeated(
    'concourse concrete piers',
    80,
    new BoxGeometry(0.75, 5.4, 1.8),
    concrete,
    (part, i) => {
      const angle = (i / 80) * Math.PI * 2;
      part.position.set(70.4 * Math.sin(angle), 8.7, 69.9 * Math.cos(angle));
      part.rotation.y = angle;
    },
  );
  repeated(
    'concourse window mullions',
    240,
    new BoxGeometry(0.12, 4.15, 0.18),
    silver,
    (part, i) => {
      const angle = (i / 240) * Math.PI * 2;
      part.position.set(69.9 * Math.sin(angle), 9.3, 69.4 * Math.cos(angle));
      part.rotation.y = angle;
    },
  );

  add(
    curvedWall(
      0.969,
      () => 12.2,
      (x, z) => saddledomeRoofHeight(x / 0.969, z / 0.969) - 2,
    ),
    red,
    'curved red upper bowl enclosure',
  );
  repeated(
    'upper bowl standing seams',
    192,
    new BoxGeometry(0.16, 1, 0.2),
    redRib,
    (part, i) => {
      const angle = (i / 192) * Math.PI * 2;
      const x = radiusX * 0.971 * Math.sin(angle);
      const z = radiusZ * 0.971 * Math.cos(angle);
      const top = saddledomeRoofHeight(x / 0.971, z / 0.971) - 2.1;
      part.position.set(x, (12.3 + top) / 2, z);
      part.scale.y = Math.max(0.2, top - 12.3);
      part.rotation.y = angle;
    },
  );

  const supportCount = 32;
  repeated(
    'perimeter roof bearings',
    supportCount,
    new BoxGeometry(1.5, 1, 2.1),
    paleConcrete,
    (part, i) => {
      const angle = (i / supportCount) * Math.PI * 2;
      const x = radiusX * 0.975 * Math.sin(angle);
      const z = radiusZ * 0.975 * Math.cos(angle);
      const top = saddledomeRoofHeight(x / 0.975, z / 0.975) - 1.45;
      part.position.set(x, (12 + top) / 2, z);
      part.scale.y = Math.max(0.5, top - 12);
      part.rotation.y = angle;
    },
  );

  add(
    curvedWall(
      1,
      (x, z) => saddledomeRoofHeight(x, z) - 1.6,
      saddledomeRoofHeight,
    ),
    paleConcrete,
    'saddle perimeter ring beam',
  );
  add(roofRibbon(0.964, 1, -1.6), shadowConcrete, 'ring beam soffit');
  add(saddleRoof(), roof, 'continuous saddle roof');
  add(roofSeams(), roofSeam, 'roof panel seams');
  add(roofRibbon(0.982, 1, 0), paleConcrete, 'roof perimeter coping');

  //the west concourse projects into the existing mapped southwest entrance footprint.
  const entry = add(
    new BoxGeometry(13.8, 6, 25),
    paleConcrete,
    'west entrance concourse',
  );
  entry.position.set(-67.8, 3, 21);
  entry.rotation.y = -0.27;
  const entryRoof = add(
    new BoxGeometry(15, 0.6, 26.4),
    shadowConcrete,
    'west entrance canopy',
  );
  entryRoof.position.set(-67.8, 6.25, 21);
  entryRoof.rotation.y = -0.27;
  const westDoors = add(
    new BoxGeometry(0.14, 3.4, 21),
    glass,
    'west entrance glazed doors',
  );
  westDoors.position.set(-74.1, 2.4, 22.7);
  westDoors.rotation.y = -0.27;
  repeated(
    'west entrance door frames',
    16,
    new BoxGeometry(0.2, 3.5, 0.12),
    silver,
    (part, i) => {
      const along = (i / 15 - 0.5) * 21;
      part.position.set(
        -74.2 - Math.sin(0.27) * along,
        2.4,
        22.7 + Math.cos(0.27) * along,
      );
      part.rotation.y = -0.27;
    },
  );
  repeated(
    'entry stair treads',
    6,
    new BoxGeometry(2.2, 0.25, 22),
    concrete,
    (part, i) => {
      part.position.set(-77.2 - i * 0.3, 0.125 + (5 - i) * 0.25, 23.5);
      part.rotation.y = -0.27;
    },
  );

  //low-end frames are visible beneath the saddle, kept as one instanced draw call.
  repeated(
    'low end a frame supports',
    8,
    new CylinderGeometry(0.45, 0.55, 1, 6),
    concrete,
    (part, i) => {
      const side = i < 4 ? -1 : 1;
      const pair = i % 4;
      const centre = pair < 2 ? -7 : 7;
      const offset = pair % 2 ? 2.2 : -2.2;
      const bottom = new Vector3(centre + offset, 5.4, side * 67.8);
      const top = new Vector3(centre, 13.3, side * 68.5);
      part.position.copy(bottom).add(top).multiplyScalar(0.5);
      part.quaternion.setFromUnitVectors(
        new Vector3(0, 1, 0),
        top.clone().sub(bottom).normalize(),
      );
      part.scale.y = bottom.distanceTo(top);
    },
  );

  model.userData = {
    ...SADDLEDOME,
    originalGeometry: true,
    units: 'metres',
    axes: 'x east, y up, z south',
  };
  model.updateMatrixWorld(true);
  return model;
}

export function disposeSaddledomeModel(model: Group) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(material);
    if (object instanceof InstancedMesh) object.dispose();
  });
  for (const item of geometries) item.dispose();
  for (const item of materials) item.dispose();
  model.clear();
}
