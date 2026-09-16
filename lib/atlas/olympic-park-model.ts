import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { createOlympicTowerModel, OLYMPIC_TOWER } from './olympic-tower-model';
import {
  createOlympicTerrain,
  olympicGroundHeight,
  olympicTerrainWeight,
} from './olympic-park-terrain';

export const OLYMPIC_PARK = {
  id: 'olympic-park-landmark',
  coordinates: [-114.2130705, 51.0766854] as [number, number],
  heightMetres: 58,
  basemapFeatureIds: [] as number[],
  sourceUrl:
    'https://www.heritagecalgary.ca/heritage-calgary-blog/inventory1000',
  operatorSourceUrl:
    'https://www.winsport.ca/new-day-lodge/olympic-legacy-assets/',
  locationSourceUrl: 'https://www.openstreetmap.org/way/272201819',
  sourceWayIds: [
    272201819, 272201820, 272201821, 272201822, 272201823, 272201824, 272201825,
    272201826, 272201827, 272201828, 272201829,
  ],
  detail:
    'Original illustration of the decommissioned ski-jump complex. The main tower is 58 m tall; “90 m” is its historic jump designation, not its physical height. Plan positions follow OpenStreetMap. Smaller dimensions and colours are approximate; local relief follows NRCan’s 2020 bare-earth elevation grid and blends into the flat map at the edges. No current access or operating status is implied.',
};

type PlanPoint = [number, number];
type Point = [number, number, number];
type Jump = {
  name: string;
  towerWay: number;
  rampWay: number;
  centre: PlanPoint;
  start: PlanPoint;
  end: PlanPoint;
  height: number;
  deckHeight: number;
  width: number;
  towerWidth: number;
  towerDepth: number;
};

//rounded metre offsets from osm, with north at negative z. only the 58 m height
//is a published architectural dimension; the smaller heights are illustrations.
export const OLYMPIC_JUMPS: readonly Jump[] = [
  {
    name: 'main heritage jump',
    towerWay: 272201819,
    rampWay: 272201822,
    centre: [0, 0],
    start: [2.095, -9.39],
    end: [23.29, -79.025],
    height: 58,
    deckHeight: 42.6,
    width: 5.95,
    towerWidth: 12.85,
    towerDepth: 19.1,
  },
  {
    name: 'second heritage jump',
    towerWay: 272201820,
    rampWay: 272201821,
    centre: [-14.4, -51.58],
    start: [-13.11, -54.005],
    end: [13.32, -131.445],
    height: 25.5,
    deckHeight: 22.8,
    width: 4.65,
    towerWidth: 9.3,
    towerDepth: 5.4,
  },
  {
    name: 'eastern training jump',
    towerWay: 272201824,
    rampWay: 272201825,
    centre: [69.85, 43.75],
    start: [69.645, 39.3],
    end: [82.99, -22.07],
    height: 18.2,
    deckHeight: 15.5,
    width: 3.88,
    towerWidth: 7.7,
    towerDepth: 8.6,
  },
  {
    name: 'small training jump',
    towerWay: 272201827,
    rampWay: 272201828,
    centre: [103.11, -1.05],
    start: [103.105, -3.04],
    end: [105.905, -49.435],
    height: 1.1,
    deckHeight: 0.65,
    width: 2.88,
    towerWidth: 2.88,
    towerDepth: 4,
  },
];

//the three mapped landing polygons. the largest jump has no separate landing
//polygon in this extract; the connecting large landing is labelled illustrative.
const landingPlans: { way: number; points: PlanPoint[]; start: PlanPoint }[] = [
  {
    way: 272201823,
    start: [13.32, -131.445],
    points: [
      [8.14, -133.66],
      [11.83, -131.87],
      [14.81, -131.02],
      [18.08, -130.17],
      [58.64, -229.02],
      [78.52, -302.89],
      [61.6, -308.8],
      [39.84, -234.13],
    ],
  },
  {
    way: 272201826,
    start: [82.99, -22.07],
    points: [
      [84.84, -21.82],
      [88.27, -22.23],
      [93.81, -61.18],
      [100.02, -86.36],
      [103.66, -125.2],
      [104.56, -134.72],
      [94.82, -136.07],
      [88.1, -79.48],
      [79.37, -22.9],
      [81.14, -22.32],
    ],
  },
  {
    way: 272201829,
    start: [105.905, -49.435],
    points: [
      [107.26, -49.36],
      [109.81, -49.2],
      [112.53, -103.83],
      [110.93, -125.22],
      [103.66, -125.2],
      [102.31, -82.58],
      [100.71, -49.51],
      [104.55, -49.51],
    ],
  },
];

export function olympicParkMetresToLngLat([x, z]: PlanPoint): PlanPoint {
  const metresPerDegree = (Math.PI / 180) * 6378137;
  return [
    OLYMPIC_PARK.coordinates[0] +
      x /
        (metresPerDegree *
          Math.cos((OLYMPIC_PARK.coordinates[1] * Math.PI) / 180)),
    OLYMPIC_PARK.coordinates[1] - z / metresPerDegree,
  ];
}

//a straight approach transitions into the curved take-off table. each ramp
//starts at its own hillside elevation instead of sharing an invented level base.
export function olympicRampPoint(jump: Jump, t: number, across = 0): Vector3 {
  const dx = jump.end[0] - jump.start[0];
  const dz = jump.end[1] - jump.start[1];
  const length = Math.hypot(dx, dz);
  if (jump.name === 'small training jump') {
    const x = jump.start[0] + dx * t - (dz / length) * across;
    const z = jump.start[1] + dz * t + (dx / length) * across;
    return new Vector3(x, olympicGroundHeight(x, z) + jump.deckHeight, z);
  }
  const top = olympicGroundHeight(...jump.centre) + jump.deckHeight;
  const bottom = olympicGroundHeight(...jump.end) + 3.4;
  const drop = top - bottom;
  const tangentAtEnd = Math.min(length * 0.11, drop * 0.35);
  const transition = 0.58;
  const straightDrop =
    (drop - (tangentAtEnd * (1 - transition)) / 2) / ((1 + transition) / 2);
  let height: number;
  if (t < transition) height = top - straightDrop * t;
  else {
    const u = (t - transition) / (1 - transition);
    height =
      top -
      straightDrop * transition -
      (1 - transition) *
        (straightDrop * u + ((tangentAtEnd - straightDrop) * u * u) / 2);
  }
  return new Vector3(
    jump.start[0] + dx * t - (dz / length) * across,
    height,
    jump.start[1] + dz * t + (dx / length) * across,
  );
}

function rampDeck(
  jump: Jump,
  width: number,
  raise = 0,
  depth = 1.4,
  centre = 0,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    for (const [across, bottom] of [
      [-width / 2, 0],
      [width / 2, 0],
      [width / 2, -depth],
      [-width / 2, -depth],
    ]) {
      const p = olympicRampPoint(jump, i / steps, centre + across);
      positions.push(p.x, p.y + raise + bottom, p.z);
    }
    if (i === steps) continue;
    for (let face = 0; face < 4; face++) {
      const a = i * 4 + face;
      const b = i * 4 + ((face + 1) % 4);
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  indices.push(0, 3, 1, 1, 3, 2);
  const end = steps * 4;
  indices.push(end, end + 1, end + 3, end + 1, end + 2, end + 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createOlympicParkModel(): Group {
  const park = new Group();
  park.name = 'Canada Olympic Park ski jumps';
  park.add(createOlympicTerrain());
  const materials = {
    concrete: new MeshStandardMaterial({ color: '#c6c8be', roughness: 0.92 }),
    pale: new MeshStandardMaterial({ color: '#e0e2d9', roughness: 0.85 }),
    frame: new MeshStandardMaterial({ color: '#657371', roughness: 0.75 }),
    dark: new MeshStandardMaterial({ color: '#3c4747', roughness: 0.8 }),
    red: new MeshStandardMaterial({ color: '#a97266', roughness: 0.8 }),
    track: new MeshStandardMaterial({ color: '#bdc8b9', roughness: 0.87 }),
    landing: new MeshStandardMaterial({ color: '#c7ccb4', roughness: 1 }),
    tree: new MeshStandardMaterial({ color: '#718c75', roughness: 1 }),
    treeLight: new MeshStandardMaterial({ color: '#8b9b7e', roughness: 1 }),
    trunk: new MeshStandardMaterial({ color: '#827b6a', roughness: 1 }),
  };
  type MaterialName = keyof typeof materials;
  const boxes = new Map<string, { material: MaterialName; poses: Matrix4[] }>();
  const bars = new Map<string, { material: MaterialName; poses: Matrix4[] }>();
  const pose = new Object3D();
  function box(
    name: string,
    material: MaterialName,
    size: Point,
    position: Point,
    rotation = 0,
  ) {
    const batch = boxes.get(name) ?? { material, poses: [] };
    pose.position.set(...position);
    pose.rotation.set(0, rotation, 0);
    pose.scale.set(...size);
    pose.updateMatrix();
    batch.poses.push(pose.matrix.clone());
    boxes.set(name, batch);
  }
  function bar(
    name: string,
    material: MaterialName,
    from: Vector3,
    to: Vector3,
    radius = 0.06,
  ) {
    const batch = bars.get(name) ?? { material, poses: [] };
    const direction = to.clone().sub(from);
    const rotation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    batch.poses.push(
      new Matrix4().compose(
        from.clone().add(to).multiplyScalar(0.5),
        rotation,
        new Vector3(radius, direction.length(), radius),
      ),
    );
    bars.set(name, batch);
  }
  function mesh(
    name: string,
    geometry: BufferGeometry,
    material: MaterialName,
  ) {
    const item = new Mesh(geometry, materials[material]);
    item.name = name;
    park.add(item);
    return item;
  }

  for (const [index, jump] of OLYMPIC_JUMPS.entries()) {
    const dx = jump.end[0] - jump.start[0];
    const dz = jump.end[1] - jump.start[1];
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(-dx, -dz);
    const [cx, cz] = jump.centre;
    const base = olympicGroundHeight(cx, cz);
    function localBox(
      name: string,
      material: MaterialName,
      size: Point,
      at: Point,
    ) {
      box(
        name,
        material,
        size,
        [
          cx + Math.cos(angle) * at[0] + Math.sin(angle) * at[2],
          base + at[1],
          cz - Math.sin(angle) * at[0] + Math.cos(angle) * at[2],
        ],
        angle,
      );
    }
    if (index === 0) {
      const tower = createOlympicTowerModel();
      tower.position.set(cx, base, cz);
      tower.rotation.y = angle;
      park.add(tower);
    } else if (index < 3) {
      //the smaller starts are open concrete portals, not glazed lookout cabins.
      const top = jump.deckHeight + 0.3;
      const depth = jump.towerDepth;
      for (const side of [-1, 1]) {
        localBox(
          'open starting tower piers',
          'concrete',
          [0.85, top, depth * 0.66],
          [side * (jump.width / 2 + 0.65), top / 2, 0.3],
        );
        localBox(
          'starting platform side cheeks',
          'pale',
          [0.65, jump.height - jump.deckHeight, depth],
          [
            side * (jump.width / 2 + 0.65),
            (jump.height + jump.deckHeight) / 2,
            0,
          ],
        );
      }
      localBox(
        'starting portal roof',
        'pale',
        [jump.width + 2.35, 0.5, depth + 0.7],
        [0, jump.height - 0.25, 0],
      );
      localBox(
        'starting platform deck',
        'concrete',
        [jump.width + 1.5, 0.8, depth],
        [0, jump.deckHeight - 0.4, 0],
      );
      localBox(
        'starting portal shadow',
        'dark',
        [jump.width + 0.25, 2.2, 0.13],
        [0, jump.deckHeight + 1.2, depth / 2 - 0.06],
      );
    }

    const deck = mesh(
      `${jump.name} curved inrun`,
      rampDeck(jump, jump.width, 0, index === 0 ? 1.8 : 1.25),
      'concrete',
    );
    deck.userData.osmWay = jump.rampWay;
    mesh(
      `${jump.name} running surface`,
      rampDeck(jump, jump.width * 0.63, 0.065, 0.05),
      'track',
    );
    for (const side of [-1, 1]) {
      mesh(
        `${jump.name} solid side beam`,
        rampDeck(jump, 0.29, 0.65, 1.85, side * (jump.width / 2 - 0.1)),
        'pale',
      );
      for (let step = 0; step < 64; step++) {
        const a = olympicRampPoint(
          jump,
          step / 64,
          side * (jump.width / 2 - 0.12),
        );
        const b = olympicRampPoint(
          jump,
          (step + 1) / 64,
          side * (jump.width / 2 - 0.12),
        );
        a.y += 1.1;
        b.y += 1.1;
        bar('inrun safety handrails', 'frame', a, b, 0.047);
        if (step % 3 === 0) {
          const foot = a.clone();
          foot.y -= 0.6;
          bar('inrun railing uprights', 'frame', foot, a, 0.033);
        }
        const c = olympicRampPoint(jump, step / 64, side * 0.19);
        const d = olympicRampPoint(jump, (step + 1) / 64, side * 0.19);
        c.y += 0.09;
        d.y += 0.09;
        bar('paired ski grooves', 'dark', c, d, 0.055);
      }
    }
    const treadCount = Math.ceil(length / 0.75);
    for (let step = 0; step < treadCount; step++) {
      const p = olympicRampPoint(jump, step / treadCount, jump.width * 0.36);
      box(
        'inrun access stair treads',
        'pale',
        [Math.max(0.46, jump.width * 0.19), 0.12, 0.34],
        [p.x, p.y + 0.11, p.z],
        angle,
      );
    }
    //broad concrete support walls are the visible structure in archive photos.
    for (const t of [0.42, 0.79]) {
      const p = olympicRampPoint(jump, t);
      const ground = olympicGroundHeight(p.x, p.z);
      const height = p.y - ground - 1.25;
      if (height <= 0) continue;
      box(
        'solid inrun support walls',
        'concrete',
        [jump.width * 0.82, height, index === 0 ? 1.65 : 1.05],
        [p.x, ground + height / 2, p.z],
        angle,
      );
      box(
        'ramp foundation pads',
        'concrete',
        [jump.width + 0.9, 0.35, 3],
        [p.x, ground + 0.1, p.z],
        angle,
      );
    }
    const end = olympicRampPoint(jump, 1);
    const ground = olympicGroundHeight(end.x, end.z);
    box(
      'take-off table front',
      'concrete',
      [jump.width + 0.5, end.y - ground, 1.0],
      [end.x, (end.y + ground) / 2, end.z],
      angle,
    );
  }

  //densely triangulated strips follow the actual hillside rather than bridging it.
  function landingStrip(name: string, points: PlanPoint[], way?: number) {
    const positions: number[] = [];
    const indices: number[] = [];
    //each pair is a left/right cross-section, including the shared outrun.
    for (let section = 0; section < points.length / 2 - 1; section++) {
      const a = points[section * 2],
        b = points[section * 2 + 1];
      const c = points[section * 2 + 2],
        d = points[section * 2 + 3];
      const count = Math.max(
        2,
        Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 1.5),
      );
      const across = Math.max(
        2,
        Math.ceil(
          Math.max(
            Math.hypot(b[0] - a[0], b[1] - a[1]),
            Math.hypot(d[0] - c[0], d[1] - c[1]),
          ) / 1.5,
        ),
      );
      const start = positions.length / 3;
      for (let j = 0; j <= count; j++) {
        const t = j / count;
        const left = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
        const right = [b[0] + (d[0] - b[0]) * t, b[1] + (d[1] - b[1]) * t];
        for (let k = 0; k <= across; k++) {
          const x = left[0] + ((right[0] - left[0]) * k) / across;
          const z = left[1] + ((right[1] - left[1]) * k) / across;
          positions.push(x, olympicGroundHeight(x, z) + 0.24, z);
          if (j < count && k < across) {
            const at = start + j * (across + 1) + k;
            indices.push(
              at,
              at + 1,
              at + across + 1,
              at + 1,
              at + across + 2,
              at + across + 1,
            );
          }
        }
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    //cross sections are ordered west/east while the slope runs north.
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const item = mesh(name, geometry, 'landing');
    item.userData.osmWay = way;
  }
  landingStrip(
    'normal hill landing',
    [
      [8.1, -133.7],
      [18.1, -130.2],
      [39.8, -234.1],
      [58.6, -229],
      [61.6, -308.8],
      [78.5, -302.9],
    ],
    landingPlans[0].way,
  );
  landingStrip(
    'eastern training landing',
    [
      [79.4, -22.9],
      [88.3, -22.2],
      [88.1, -79.5],
      [100, -86.4],
      [94.8, -136.1],
      [104.6, -134.7],
    ],
    landingPlans[1].way,
  );
  landingStrip(
    'small training landing',
    [
      [100.7, -49.5],
      [109.8, -49.2],
      [102.3, -82.6],
      [112.5, -103.8],
      [103.7, -125.2],
      [110.9, -125.2],
    ],
    landingPlans[2].way,
  );
  //the larger landing is absent from the osm extract. this connecting strip is
  //illustrative, aligned to the inrun and visible shared downhill corridor.
  landingStrip('large hill illustrative landing', [
    [20.5, -83],
    [27, -81],
    [39, -147],
    [53, -143],
    [55, -210],
    [72, -203],
    [68, -273],
    [85, -268],
    [61.6, -308.8],
    [78.5, -302.9],
  ]);

  //small, restrained stands give the jumps their wooded-hillside setting.
  //these are landscape illustration, not mapped individual tree records.
  const treePoses: Matrix4[] = [];
  const lightPoses: Matrix4[] = [];
  const unit = new Vector3(1, 1, 1);
  const rotation = new Quaternion();
  function distanceToRamp(x: number, z: number) {
    return Math.min(
      ...OLYMPIC_JUMPS.map((jump) => {
        const dx = jump.end[0] - jump.start[0],
          dz = jump.end[1] - jump.start[1];
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - jump.start[0]) * dx + (z - jump.start[1]) * dz) /
              (dx * dx + dz * dz),
          ),
        );
        return Math.hypot(
          x - jump.start[0] - t * dx,
          z - jump.start[1] - t * dz,
        );
      }),
    );
  }
  for (let row = 0; row < 22; row++) {
    const z = 35 - row * 10 + Math.sin(row * 7.3) * 5;
    for (const strip of [-1, 1])
      for (let col = 0; col < 3; col++) {
        if ((row * 13 + col * 7) % 5 === 0) continue;
        const x =
          strip < 0
            ? -25 - col * 12 + Math.sin(row * 2.7 + col) * 9
            : 125 + col * 10 + Math.sin(row * 1.6 + col) * 9;
        if (distanceToRamp(x, z) < 13 || olympicTerrainWeight(x, z) < 0.85)
          continue;
        const height = 6.5 + ((row * 7 + col * 11) % 8) * 0.7;
        const ground = olympicGroundHeight(x, z);
        box(
          'landscape tree trunks',
          'trunk',
          [0.32, height * 0.65, 0.32],
          [x, ground + height * 0.325, z],
        );
        const position = new Vector3(x, ground + height * 0.59, z);
        const scale = unit
          .clone()
          .set(2.4 + (row % 3) * 0.25, height * 0.82, 2.4 + (row % 3) * 0.25);
        (row % 4 === 0 ? lightPoses : treePoses).push(
          new Matrix4().compose(position, rotation, scale),
        );
      }
  }
  for (const [name, poses, material] of [
    ['conifer landscape', treePoses, materials.tree],
    ['lighter landscape', lightPoses, materials.treeLight],
  ] as const) {
    const item = new InstancedMesh(
      new CylinderGeometry(0, 1, 1, 7),
      material,
      poses.length,
    );
    item.name = name;
    poses.forEach((matrix, i) => item.setMatrixAt(i, matrix));
    item.instanceMatrix.needsUpdate = true;
    park.add(item);
  }
  for (const [name, batch] of boxes) {
    const item = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      materials[batch.material],
      batch.poses.length,
    );
    item.name = name;
    batch.poses.forEach((matrix, i) => item.setMatrixAt(i, matrix));
    item.instanceMatrix.needsUpdate = true;
    park.add(item);
  }
  for (const [name, batch] of bars) {
    const item = new InstancedMesh(
      new CylinderGeometry(1, 1, 1, 6),
      materials[batch.material],
      batch.poses.length,
    );
    item.name = name;
    batch.poses.forEach((matrix, i) => item.setMatrixAt(i, matrix));
    item.instanceMatrix.needsUpdate = true;
    park.add(item);
  }
  park.userData.units = 'metres';
  park.userData.axes = 'x east, y up, z south';
  park.userData.operatingSkiJumps = false;
  park.userData.terrain =
    'NRCan 2020 lidar elevations; local display datum and blended outer edges';
  park.userData.mainTowerPhysicalHeight = OLYMPIC_TOWER.heightMetres;
  park.updateMatrixWorld(true);
  return park;
}
