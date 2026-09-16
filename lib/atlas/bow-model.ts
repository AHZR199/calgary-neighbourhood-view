import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Shape,
  Vector3,
} from 'three';

export const BOW = {
  id: 'bow-landmark',
  coordinates: [-114.0618754734, 51.0479119077] as [number, number],
  heightMetres: 237.5,
  coarseBounds: [-114.062623, 51.047518, -114.061319, 51.048201] as [
    number,
    number,
    number,
    number,
  ],
  basemapFeatureIds: [1277414992],
  sourceUrl: 'https://zeidler.com/projects/the-bow/',
  heightSourceUrl:
    'https://www.otis.com/en/ae/our-company/global-projects/project-showcase/the-bow-calgary',
  locationSourceUrl: 'https://tiles.openfreemap.org/planet',
  detail:
    'Original architectural illustration with a 237.5 m published height. Footprint and orientation follow OpenStreetMap; glazing, framing and roof details are approximate.',
};

type PlanPoint = [number, number];

//rounded metre offsets from the mapped footprint; x east, z south, y up.
const outer: PlanPoint[] = [
  [-50.8, -6.16],
  [-38.41, -20.05],
  [-26.02, -27.19],
  [-13.26, -30.94],
  [4.01, -32.07],
  [19.03, -23.81],
  [28.79, -14.05],
  [34.42, -3.16],
  [37.8, 5.85],
  [38.93, 13.74],
  [38.93, 21.62],
  [37.8, 30.25],
  [35.55, 38.14],
];
const east: PlanPoint[] = [
  [35.55, 38.14],
  [28.04, 43.39],
  [25.04, 43.77],
  [22.03, 43.39],
  [17.9, 39.64],
  [13.77, 38.14],
];
const inner: PlanPoint[] = [
  [13.77, 38.14],
  [10.77, 29.13],
  [6.27, 22.37],
  [0.63, 16.36],
  [-6.12, 12.23],
  [-14.01, 8.85],
  [-22.27, 7.73],
  [-30.53, 8.1],
  [-39.16, 10.73],
];
const west: PlanPoint[] = [
  [-39.16, 10.73],
  [-48.17, 6.98],
  [-52.3, 0.22],
  [-52.3, -2.78],
  [-50.8, -6.16],
];
const roofHeight = 233.2;
const lobbyHeight = 7.2;
const floorHeight = (roofHeight - lobbyHeight) / 56;

function curve(points: PlanPoint[]) {
  return new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
  );
}

function geometry(positions: number[], colours?: number[]) {
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (colours)
    result.setAttribute('color', new Float32BufferAttribute(colours, 3));
  result.computeVertexNormals();
  return result;
}

function quad(
  target: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
) {
  for (const point of [a, b, c, a, c, d])
    target.push(point.x, point.y, point.z);
}

export function createBowModel(): Group {
  const bow = new Group();
  bow.name = 'The Bow';
  const glass = new MeshStandardMaterial({
    color: '#5892a7',
    roughness: 0.26,
    metalness: 0.32,
    vertexColors: true,
    side: DoubleSide,
  });
  const frame = new MeshStandardMaterial({
    color: '#c1d0d3',
    roughness: 0.47,
    metalness: 0.4,
  });
  const fineFrame = new MeshStandardMaterial({
    color: '#668897',
    roughness: 0.6,
    metalness: 0.23,
    side: DoubleSide,
  });
  const roof = new MeshStandardMaterial({ color: '#a0aeb2', roughness: 0.85 });
  const mechanical = new MeshStandardMaterial({
    color: '#68828e',
    roughness: 0.74,
    metalness: 0.12,
  });
  const paths = [curve(outer), curve(east), curve(inner), curve(west)];
  const samples = new Map<
    CatmullRomCurve3,
    Map<number, { point: Readonly<Vector3>; tangent: Readonly<Vector3> }>
  >();
  function facePoint(path: CatmullRomCurve3, u: number, y: number, offset = 0) {
    let pathSamples = samples.get(path);
    if (!pathSamples) {
      pathSamples = new Map();
      samples.set(path, pathSamples);
    }
    let sample = pathSamples.get(u);
    if (!sample) {
      sample = { point: path.getPointAt(u), tangent: path.getTangentAt(u) };
      pathSamples.set(u, sample);
    }
    //floors share plan samples; each facade vertex keeps its own height and offset.
    const point = sample.point.clone();
    point.x += sample.tangent.z * offset;
    point.z -= sample.tangent.x * offset;
    point.y = y;
    return point;
  }
  const divisions = [64, 12, 40, 12];
  const outline = paths.flatMap((path, i) =>
    path.getSpacedPoints(divisions[i]).slice(0, -1),
  );

  function add(name: string, shape: BufferGeometry, material: Material) {
    const mesh = new Mesh(shape, material);
    mesh.name = name;
    bow.add(mesh);
    return mesh;
  }

  function slab(
    name: string,
    y0: number,
    y1: number,
    scale: number,
    material: Material,
  ) {
    const plan = new Shape();
    outline.forEach((point, i) => {
      if (!i) plan.moveTo(point.x * scale, -point.z * scale);
      else plan.lineTo(point.x * scale, -point.z * scale);
    });
    plan.closePath();
    const shape = new ExtrudeGeometry(plan, {
      depth: y1 - y0,
      bevelEnabled: false,
      steps: 1,
    });
    shape.rotateX(-Math.PI / 2);
    shape.translate(0, y0, 0);
    return add(name, shape, material);
  }

  const panes: number[] = [];
  const paneColours: number[] = [];
  const bands: number[] = [];
  const mullions: [Vector3, Vector3][] = [];
  paths.forEach((path, face) => {
    const count = divisions[face];
    for (let column = 0; column < count; column++) {
      const u0 = column / count;
      const u1 = (column + 1) / count;
      for (let floor = 0; floor < 57; floor++) {
        const bottom =
          floor === 0 ? 0.2 : lobbyHeight + (floor - 1) * floorHeight;
        const top = floor === 0 ? lobbyHeight : bottom + floorHeight;
        quad(
          panes,
          facePoint(path, u0, bottom),
          facePoint(path, u1, bottom),
          facePoint(path, u1, top),
          facePoint(path, u0, top),
        );
        const skyGarden =
          face === 2 &&
          [24, 42, 54].some((level) => floor >= level - 1 && floor < level + 5);
        const tint = 0.93 + 0.07 * Math.sin(column * 2.73 + floor * 0.43);
        const colour = new Color().setRGB(
          tint * (skyGarden ? 0.76 : 1),
          tint * (skyGarden ? 0.88 : 1),
          tint * (skyGarden ? 0.94 : 1),
        );
        for (let j = 0; j < 6; j++)
          paneColours.push(colour.r, colour.g, colour.b);
        if (floor && !skyGarden)
          quad(
            bands,
            facePoint(path, u0, bottom - 0.1, 0.065),
            facePoint(path, u1, bottom - 0.1, 0.065),
            facePoint(path, u1, bottom + 0.1, 0.065),
            facePoint(path, u0, bottom + 0.1, 0.065),
          );
      }
      mullions.push([
        facePoint(path, u0, 0.25, 0.08),
        facePoint(path, u0, roofHeight, 0.08),
      ]);
    }
  });
  add('curved blue glazing', geometry(panes, paneColours), glass);
  add('floor spandrel ribbons', geometry(bands), fineFrame);

  function beams(
    name: string,
    segments: [Vector3, Vector3][],
    width: number,
    material: Material,
  ) {
    const mesh = new InstancedMesh(
      new BoxGeometry(width, 1, width),
      material,
      segments.length,
    );
    const transform = new Object3D();
    const up = new Vector3(0, 1, 0);
    segments.forEach(([start, end], i) => {
      transform.position.copy(start).add(end).multiplyScalar(0.5);
      transform.quaternion.setFromUnitVectors(
        up,
        end.clone().sub(start).normalize(),
      );
      transform.scale.set(1, start.distanceTo(end), 1);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    bow.add(mesh);
  }
  beams('fine vertical mullions', mullions, 0.13, fineFrame);

  //split the diagonals along the curve so straight chords never vanish inside the glass.
  const diagrid: [Vector3, Vector3][] = [];
  const diagridTies: [Vector3, Vector3][] = [];
  for (const [face, bays] of [
    [0, 6],
    [2, 3],
  ]) {
    const path = paths[face];
    const rows = 9;
    const bayHeight = (roofHeight - lobbyHeight) / rows;
    for (let row = 0; row < rows; row++) {
      const y0 = lobbyHeight + row * bayHeight;
      const y1 = y0 + bayHeight;
      for (let bay = 0; bay < bays; bay++) {
        const left = bay / bays;
        const right = (bay + 1) / bays;
        const middle = (left + right) / 2;
        for (const [startU, endU] of [
          [left, middle],
          [right, middle],
        ]) {
          for (let segment = 0; segment < 6; segment++) {
            const t0 = segment / 6;
            const t1 = (segment + 1) / 6;
            const low = row % 2 ? y1 : y0;
            const high = row % 2 ? y0 : y1;
            diagrid.push([
              facePoint(
                path,
                startU + (endU - startU) * t0,
                low + (high - low) * t0,
                0.58,
              ),
              facePoint(
                path,
                startU + (endU - startU) * t1,
                low + (high - low) * t1,
                0.58,
              ),
            ]);
          }
        }
      }
      for (let segment = 0; segment < divisions[face]; segment++)
        diagridTies.push([
          facePoint(path, segment / divisions[face], y0, 0.43),
          facePoint(path, (segment + 1) / divisions[face], y0, 0.43),
        ]);
    }
  }
  beams('six storey diagrid', diagrid, 0.75, frame);
  beams('diagrid horizontal ties', diagridTies, 0.28, frame);

  const edgeFrames: [Vector3, Vector3][] = [];
  for (const path of [paths[0], paths[2]])
    for (const u of [0, 1])
      edgeFrames.push([
        facePoint(path, u, 0.2, 0.5),
        facePoint(path, u, roofHeight, 0.5),
      ]);
  beams('rounded end core edges', edgeFrames, 0.8, frame);

  slab('ground sill', 0, 0.2, 1, roof);
  slab('roof edge', roofHeight, roofHeight + 0.5, 1, frame);
  slab('setback mechanical roof', roofHeight + 0.5, 236.9, 0.83, mechanical);
  slab('upper roof coping', 236.9, BOW.heightMetres, 0.85, roof);

  const roofRails: [Vector3, Vector3][] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i].clone().multiplyScalar(0.92);
    const b = outline[(i + 1) % outline.length].clone().multiplyScalar(0.92);
    a.y = b.y = roofHeight + 0.9;
    roofRails.push([a, b]);
  }
  beams('roof maintenance rail', roofRails, 0.14, frame);

  bow.updateMatrixWorld(true);
  bow.userData = {
    ...BOW,
    originalGeometry: true,
    units: 'metres',
    axes: 'x east, y up, z south',
    footprintAttribution: '© OpenStreetMap contributors, ODbL 1.0',
  };
  return bow;
}
