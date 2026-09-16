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
  ShapeUtils,
  Vector2,
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
  roofMaterialSourceUrl:
    'https://col.sika.com/dms/getdocument.get/2894d59b-e3e2-36a1-ae85-6cfbfee941b9/2014%20Ambitions%2018%20EN.pdf',
  locationSourceUrl: 'https://data.calgary.ca/d/x34e-bcjz',
  locationMethod:
    'City visitor-information point, aligned to the approximate OpenStreetMap outline in the 13 September 2026 OpenFreeMap snapshot; not a survey.',
  detail:
    'Original architectural illustration of the white saddle roof, leaning pale enclosure, red stair towers and concourse. Roof orientation follows published engineering research; height, facade details and smaller dimensions are approximate.',
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

//the visible roof is a white membrane, not an exposed six-metre structural grid.
function roofSeams() {
  const positions: number[] = [];
  const indices: number[] = [];
  const halfWidth = 0.035;
  for (const axis of ['x']) {
    for (let offset = -66; offset <= 66; offset += 3) {
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

export function saddledomeWallPoint(angle: number, height: number) {
  const x = radiusX * 0.968 * Math.cos(angle);
  const z = radiusZ * 0.968 * Math.sin(angle);
  const top = saddledomeRoofHeight(x / 0.968, z / 0.968) - 1.9;
  const inset = Math.max(0, top - height) * 0.22;
  const radius = Math.hypot(x, z);
  return new Vector3(
    x * (1 - inset / radius),
    height,
    z * (1 - inset / radius),
  );
}

function leaningEnclosure() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= edgeSegments; i++) {
    const angle = (i / edgeSegments) * Math.PI * 2;
    const top =
      saddledomeRoofHeight(
        radiusX * Math.cos(angle),
        radiusZ * Math.sin(angle),
      ) - 1.9;
    const bottomPoint = saddledomeWallPoint(angle, 12.3);
    const topPoint = saddledomeWallPoint(angle, top);
    positions.push(...bottomPoint.toArray(), ...topPoint.toArray());
    if (i < edgeSegments) {
      const at = i * 2;
      indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
    }
  }
  return geometry(positions, indices);
}

function enclosureSeams() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let y = 12.6; y < 39; y += 0.62) {
    for (let i = 0; i < edgeSegments; i++) {
      const a = (i / edgeSegments) * Math.PI * 2;
      const b = ((i + 1) / edgeSegments) * Math.PI * 2;
      const topA =
        saddledomeRoofHeight(radiusX * Math.cos(a), radiusZ * Math.sin(a)) - 2;
      const topB =
        saddledomeRoofHeight(radiusX * Math.cos(b), radiusZ * Math.sin(b)) - 2;
      if (y + 0.035 > Math.min(topA, topB)) continue;
      const start = positions.length / 3;
      for (const [angle, height] of [
        [a, y],
        [a, y + 0.035],
        [b, y],
        [b, y + 0.035],
      ]) {
        const point = saddledomeWallPoint(angle, height);
        point.x += Math.cos(angle) * 0.035;
        point.z += Math.sin(angle) * 0.035;
        positions.push(...point.toArray());
      }
      indices.push(
        start,
        start + 1,
        start + 2,
        start + 1,
        start + 3,
        start + 2,
      );
    }
  }
  return geometry(positions, indices);
}

function concourseSeams() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let y = 5.6; y < 9.3; y += 0.42) {
    for (let i = 0; i <= edgeSegments; i++) {
      const angle = (i / edgeSegments) * Math.PI * 2;
      const radius = 71.5 - ((y - 5.4) / 4.05) * 0.6 + 0.03;
      const x = radius * Math.cos(angle);
      const z = radius * (radiusZ / radiusX) * Math.sin(angle);
      const at = positions.length / 3;
      positions.push(x, y, z, x, y + 0.032, z);
      if (i < edgeSegments)
        indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
    }
  }
  return geometry(positions, indices);
}

function stairTowerShapes() {
  const plan: [number, number][] = [[-5, -2.4]];
  for (let i = 0; i <= 24; i++) {
    const angle = Math.PI * (1 - i / 24);
    plan.push([5 * Math.cos(angle), 5 * Math.sin(angle)]);
  }
  plan.push([5, -2.4]);
  const top = (x: number, z: number) => 23.2 - 0.04 * x - 0.055 * z * z;
  const wallPositions: number[] = [];
  const wallIndices: number[] = [];
  for (let i = 0; i <= plan.length; i++) {
    const [x, z] = plan[i % plan.length];
    wallPositions.push(x, 5.3, z, x, top(x, z), z);
    if (i < plan.length) {
      const at = i * 2;
      wallIndices.push(at, at + 2, at + 1, at + 1, at + 2, at + 3);
    }
  }
  const roofPositions = plan.flatMap(([x, z]) => [x, top(x, z) + 0.09, z]);
  const roofIndices = ShapeUtils.triangulateShape(
    plan.map(([x, z]) => new Vector2(x, z)),
    [],
  ).flatMap(([a, b, c]) => [a, c, b]);
  return {
    wall: geometry(wallPositions, wallIndices),
    roof: geometry(roofPositions, roofIndices),
  };
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
    color: '#e5e7e3',
    roughness: 0.86,
    side: DoubleSide,
  });
  const roofSeam = new MeshStandardMaterial({
    color: '#d6dcd8',
    roughness: 0.85,
    side: DoubleSide,
  });
  const red = new MeshStandardMaterial({
    color: '#b94f3d',
    roughness: 0.66,
    metalness: 0.12,
    side: DoubleSide,
  });
  const enclosure = new MeshStandardMaterial({
    color: '#bdb9aa',
    roughness: 0.85,
    side: DoubleSide,
  });
  const enclosureJoint = new MeshStandardMaterial({
    color: '#a4a599',
    roughness: 0.9,
    side: DoubleSide,
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
  ellipse('lower concourse plinth', 70.9, 71.5, 5.4, 9.45, paleConcrete);
  ellipse('recessed concourse glazing', 70.25, 70.25, 9.45, 10.55, glass);
  ellipse('concourse concrete overhang', 69.2, 70.5, 10.55, 12.2, paleConcrete);
  ellipse('upper concourse shadow line', 68.9, 68.9, 12.2, 13, shadowConcrete);
  add(concourseSeams(), enclosureJoint, 'concourse horizontal cladding');

  repeated(
    'concourse concrete piers',
    40,
    new BoxGeometry(0.28, 5.4, 0.5),
    concrete,
    (part, i) => {
      const angle = (i / 40) * Math.PI * 2;
      part.position.set(70.8 * Math.sin(angle), 8.1, 70.3 * Math.cos(angle));
      part.rotation.y = angle;
    },
  );
  repeated(
    'concourse window mullions',
    240,
    new BoxGeometry(0.13, 1.13, 0.2),
    silver,
    (part, i) => {
      const angle = (i / 240) * Math.PI * 2;
      part.position.set(70.34 * Math.sin(angle), 10, 69.84 * Math.cos(angle));
      part.rotation.y = angle;
    },
  );

  add(leaningEnclosure(), enclosure, 'leaning pale upper enclosure');
  add(enclosureSeams(), enclosureJoint, 'horizontal cladding joints');

  const supportCount = 32;
  repeated(
    'perimeter roof bearings',
    supportCount,
    new BoxGeometry(1.6, 1, 1.55),
    shadowConcrete,
    (part, i) => {
      const angle = (i / supportCount) * Math.PI * 2;
      const wallAngle = Math.PI / 2 - angle;
      const topY =
        saddledomeRoofHeight(
          radiusX * Math.sin(angle),
          radiusZ * Math.cos(angle),
        ) - 1.55;
      const bottom = saddledomeWallPoint(wallAngle, 12.1);
      const top = saddledomeWallPoint(wallAngle, topY);
      bottom.x += Math.sin(angle) * 0.75;
      bottom.z += Math.cos(angle) * 0.75;
      top.x += Math.sin(angle) * 0.75;
      top.z += Math.cos(angle) * 0.75;
      part.position.copy(bottom).add(top).multiplyScalar(0.5);
      part.quaternion.setFromUnitVectors(
        new Vector3(0, 1, 0),
        top.clone().sub(bottom).normalize(),
      );
      part.scale.y = bottom.distanceTo(top);
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
  add(
    curvedWall(
      1.002,
      (x, z) => saddledomeRoofHeight(x / 1.002, z / 1.002) - 1.2,
      (x, z) => saddledomeRoofHeight(x / 1.002, z / 1.002) - 0.75,
    ),
    red,
    'terracotta roof edge trim',
  );

  //daylight reference photos show four red stair towers projecting from pale walls.
  const stairs = stairTowerShapes();
  const placeStair = (part: Object3D, i: number) => {
    const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
    part.position.set(65.5 * Math.sin(angle), 0, 65 * Math.cos(angle));
    part.rotation.y = angle;
  };
  repeated('red curved stair towers', 4, stairs.wall, red, placeStair);
  repeated('stair tower curved caps', 4, stairs.roof, paleConcrete, placeStair);
  repeated(
    'stair tower upper windows',
    4,
    new BoxGeometry(2.3, 2.5, 0.08),
    glass,
    (part, i) => {
      const angle = Math.PI / 4 + (i / 4) * Math.PI * 2;
      part.position.set(70.52 * Math.sin(angle), 20.2, 70.02 * Math.cos(angle));
      part.rotation.y = angle;
    },
  );
  repeated(
    'low end concrete entrance piers',
    4,
    new BoxGeometry(1.3, 8.5, 2.4),
    paleConcrete,
    (part, i) => {
      part.position.set(i % 2 ? -4.8 : 4.8, 10, i < 2 ? -69.7 : 69.7);
    },
  );
  repeated(
    'low end concrete entrance lintels',
    2,
    new BoxGeometry(11, 1.25, 2.4),
    paleConcrete,
    (part, i) => {
      part.position.set(0, 14.35, i ? 69.7 : -69.7);
    },
  );
  repeated(
    'round concourse vents',
    4,
    new CylinderGeometry(0.7, 0.7, 0.1, 20),
    shadowConcrete,
    (part, i) => {
      part.position.set(i % 2 ? -3.1 : 3.1, 11.8, i < 2 ? -70.95 : 70.95);
      part.rotation.x = Math.PI / 2;
    },
  );

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
