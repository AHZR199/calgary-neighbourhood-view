import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';

export const CENTRAL_LIBRARY = {
  id: 'central-library-landmark',
  coordinates: [-114.05501830346103, 51.045394028820354] as [number, number],
  heightMetres: 28.5,
  heightIsApproximate: true,
  //only suppress this merged id when its unrelated companion is restored.
  basemapFeatureIds: [4968240260],
  requiresBuildingRestore: '/data/library-building-restore.geojson',
  sourceUrl: 'https://www.snohetta.com/projects/calgary-central-library',
  locationSourceUrl: 'https://www.openstreetmap.org/way/496824026',
  detail:
    'Original illustration of the curved plan, white/glass hexagonal facade and wood-lined raised arch. Plan follows OpenStreetMap; height, panel pattern and smaller details are approximate.',
};

//rounded offsets from the OSM footprint, in metres; x east, z south.
const outline = [
  [-27.81, -8],
  [-26.04, 11.99],
  [-22.14, 26.25],
  [-16.33, 41.8],
  [-4.27, 59.47],
  [9.15, 60.27],
  [28.53, 61.26],
  [29.61, 27.47],
  [28.16, 14.31],
  [25.29, 1.61],
  [18.41, -20.98],
  [12.24, -43.92],
  [3.58, -64.07],
  [-6.77, -79.41],
  [-15.69, -64.95],
  [-21.77, -48.72],
  [-26.58, -28.03],
];
const plan = new CatmullRomCurve3(
  outline.map(([x, z]) => new Vector3(x, 0, z)),
  true,
  'centripetal',
);
const roofHeight = 27.8;

export function libraryArchHeight(z: number) {
  return 0.8 + 9.8 * Math.exp(-(((z + 7) / 23) ** 2));
}

function surface(positions: number[], indices: number[]) {
  const shape = new BufferGeometry();
  shape.setAttribute('position', new Float32BufferAttribute(positions, 3));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return shape;
}

export function createCentralLibraryModel(): Group {
  const model = new Group();
  model.name = 'Central Library';
  const pale = new MeshStandardMaterial({
    color: '#e8ece8',
    roughness: 0.72,
    side: DoubleSide,
  });
  const white = new MeshStandardMaterial({
    color: '#f3f1e9',
    roughness: 0.83,
    side: DoubleSide,
  });
  const glass = new MeshStandardMaterial({
    color: '#50707a',
    roughness: 0.28,
    metalness: 0.34,
    side: DoubleSide,
  });
  const darkGlass = new MeshStandardMaterial({
    color: '#334e59',
    roughness: 0.3,
    metalness: 0.3,
    side: DoubleSide,
  });
  const wood = new MeshStandardMaterial({
    color: '#b38351',
    roughness: 0.89,
    side: DoubleSide,
  });
  const woodJoint = new MeshStandardMaterial({
    color: '#865c39',
    roughness: 0.94,
    side: DoubleSide,
  });
  const concrete = new MeshStandardMaterial({
    color: '#c1c1b8',
    roughness: 0.94,
    side: DoubleSide,
  });
  const roofMaterial = new MeshStandardMaterial({
    color: '#c9ceca',
    roughness: 0.9,
    side: DoubleSide,
  });
  const add = (shape: BufferGeometry, material: Material, name: string) => {
    const mesh = new Mesh(shape, material);
    mesh.name = name;
    model.add(mesh);
    return mesh;
  };
  const segments = 240;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = plan.getPointAt(i / segments);
    positions.push(p.x, libraryArchHeight(p.z), p.z, p.x, roofHeight, p.z);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  add(surface(positions, indices), glass, 'curved glass envelope above arch');

  const roofPlan = new Shape();
  for (let i = 0; i <= segments; i++) {
    const p = plan.getPointAt(i / segments);
    if (!i) roofPlan.moveTo(p.x, -p.z);
    else roofPlan.lineTo(p.x, -p.z);
  }
  const roof = add(
    new ShapeGeometry(roofPlan, segments),
    roofMaterial,
    'continuous curved roof',
  );
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = roofHeight;

  //every panel is mapped onto the curved skin; the pattern is illustrative, not a traced elevation.
  const framePositions: number[] = [];
  const frameIndices: number[] = [];
  const panelPositions: number[] = [];
  const panelIndices: number[] = [];
  const length = plan.getLength();
  const cellWidth = 4.8;
  const cellHeight = 6.6;
  function pointAt(distance: number, y: number, offset = 0.08) {
    const u = (((distance / length) % 1) + 1) % 1;
    const p = plan.getPointAt(u);
    const tangent = plan.getTangentAt(u);
    p.addScaledVector(new Vector3(-tangent.z, 0, tangent.x), offset);
    p.y = y;
    return p;
  }
  function quad(
    target: number[],
    faces: number[],
    a: Vector3,
    b: Vector3,
    c: Vector3,
    d: Vector3,
  ) {
    const start = target.length / 3;
    for (const p of [a, b, c, d]) target.push(p.x, p.y, p.z);
    faces.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  const columns = Math.ceil(length / cellWidth);
  for (let row = 0; row < 6; row++)
    for (let column = 0; column < columns; column++) {
      const s = (column + (row % 2) * 0.5) * cellWidth;
      const y = 3.3 + row * cellHeight * 0.75;
      const corners = [
        [0, -cellHeight / 2],
        [cellWidth / 2, -cellHeight / 4],
        [cellWidth / 2, cellHeight / 4],
        [0, cellHeight / 2],
        [-cellWidth / 2, cellHeight / 4],
        [-cellWidth / 2, -cellHeight / 4],
      ];
      if (
        corners.some(([du, dy]) => {
          const p = pointAt(s + du, y + dy);
          return p.y > roofHeight - 0.12 || p.y < libraryArchHeight(p.z) + 0.14;
        })
      )
        continue;
      const centre = pointAt(s, y);
      const vertices = corners.map(([du, dy]) => pointAt(s + du, y + dy));
      for (let side = 0; side < 6; side++) {
        const a = vertices[side],
          b = vertices[(side + 1) % 6];
        const innerA = a.clone().lerp(centre, 0.075),
          innerB = b.clone().lerp(centre, 0.075);
        quad(framePositions, frameIndices, a, b, innerB, innerA);
      }
      //vary opaque portions to suggest the clear/fritted facade without a branded graphic.
      if ((column * 7 + row * 3) % 5 === 0) {
        const start = panelPositions.length / 3;
        for (const p of vertices) panelPositions.push(p.x, p.y, p.z);
        for (let side = 1; side < 5; side++)
          panelIndices.push(start, start + side, start + side + 1);
      } else if ((column + row) % 3 === 0) {
        const start = panelPositions.length / 3;
        for (const p of [vertices[0], vertices[1], centre, vertices[5]])
          panelPositions.push(p.x, p.y, p.z);
        panelIndices.push(
          start,
          start + 1,
          start + 2,
          start,
          start + 2,
          start + 3,
        );
      }
    }
  add(surface(framePositions, frameIndices), pale, 'hexagonal facade frames');
  add(
    surface(panelPositions, panelIndices),
    white,
    'alternating opaque hexagonal panels',
  );

  const boundary = plan.getSpacedPoints(320);
  function widthAt(z: number) {
    const xs: number[] = [];
    for (let i = 0; i < boundary.length - 1; i++) {
      const a = boundary[i],
        b = boundary[i + 1];
      if ((a.z <= z && b.z > z) || (b.z <= z && a.z > z))
        xs.push(a.x + ((b.x - a.x) * (z - a.z)) / (b.z - a.z));
    }
    return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
  }
  const soffit: number[] = [];
  const soffitFaces: number[] = [];
  const slats: number[] = [];
  const slatFaces: number[] = [];
  for (let z = -76; z < 60; z += 0.65) {
    const nextZ = z + 0.65;
    const a = widthAt(z),
      b = widthAt(nextZ);
    if (!a || !b) continue;
    const y = libraryArchHeight(z),
      nextY = libraryArchHeight(nextZ);
    quad(
      soffit,
      soffitFaces,
      new Vector3(a[0], y, z),
      new Vector3(a[1], y, z),
      new Vector3(b[1], nextY, nextZ),
      new Vector3(b[0], nextY, nextZ),
    );
    if (z > -39 && z < 25)
      quad(
        slats,
        slatFaces,
        new Vector3(a[0], y - 0.035, z),
        new Vector3(a[1], y - 0.035, z),
        new Vector3(a[1], y - 0.035, z + 0.05),
        new Vector3(a[0], y - 0.035, z + 0.05),
      );
  }
  add(surface(soffit, soffitFaces), wood, 'wood lined sweeping arch soffit');
  add(surface(slats, slatFaces), woodJoint, 'arch cedar board joints');
  const entrance = add(
    new BoxGeometry(0.25, 4.5, 18),
    darkGlass,
    'recessed entrance glazing',
  );
  entrance.position.set(5, 4.7, -6);
  const landing = add(
    new BoxGeometry(59, 0.45, 24),
    concrete,
    'raised entrance plaza',
  );
  landing.position.set(0, 2.5, -7);
  for (const side of [-1, 1])
    for (let step = 0; step < 9; step++) {
      const stair = add(
        new BoxGeometry(0.65, 0.27 * (9 - step), 24),
        concrete,
        'terraced entrance stair',
      );
      stair.position.set(side * (29.8 + step * 0.65), 0.135 * (9 - step), -7);
    }
  const oculus = new Shape();
  oculus.moveTo(0, -36);
  oculus.bezierCurveTo(14, -13, 14, 15, 0, 34);
  oculus.bezierCurveTo(-12, 15, -12, -13, 0, -36);
  const skylight = add(
    new ShapeGeometry(oculus, 48),
    darkGlass,
    'pointed oval roof skylight',
  );
  skylight.rotation.x = -Math.PI / 2;
  skylight.position.set(-1, 28, -8);
  const skylightFrame = new Shape();
  skylightFrame.moveTo(0, -37);
  skylightFrame.bezierCurveTo(15, -13, 15, 15, 0, 35);
  skylightFrame.bezierCurveTo(-13, 15, -13, -13, 0, -37);
  //the pale rim lies below the smaller dark opening.
  const rim = add(
    new ShapeGeometry(skylightFrame, 48),
    pale,
    'skylight raised rim',
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(-1, 27.95, -8);
  const roofLip = add(
    new BoxGeometry(5, 0.7, 1.4),
    roofMaterial,
    'roof service upstand',
  );
  roofLip.position.set(17, 28.15, 46);
  model.userData = {
    ...CENTRAL_LIBRARY,
    originalGeometry: true,
    units: 'metres',
    axes: 'x east, y up, z south',
  };
  model.updateMatrixWorld(true);
  return model;
}

export function disposeCentralLibraryModel(model: Group) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(material);
  });
  for (const item of geometries) item.dispose();
  for (const item of materials) item.dispose();
  model.clear();
}
