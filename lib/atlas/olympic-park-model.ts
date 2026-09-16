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
  ShapeUtils,
  Vector2,
  Vector3,
} from 'three';

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
    'Original illustration of the decommissioned ski-jump complex. The main tower is 58 m tall; “90 m” is its historic jump designation, not its physical height. Plan positions follow OpenStreetMap. Smaller dimensions and colours are approximate; landing relief is compressed for the flat map. No current access or operating status is implied.',
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
    deckHeight: 49.8,
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
    height: 32,
    deckHeight: 29.1,
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
    height: 22,
    deckHeight: 19.2,
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
    height: 12,
    deckHeight: 10.5,
    width: 2.88,
    towerWidth: 2.88,
    towerDepth: 4,
  },
];

//the three mapped landing polygons. the largest jump has no separate landing
//polygon in this extract, so we do not invent another one across the grounds.
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

function rampPoint(jump: Jump, t: number, across = 0): Vector3 {
  const dx = jump.end[0] - jump.start[0];
  const dz = jump.end[1] - jump.start[1];
  const length = Math.hypot(dx, dz);
  const endHeight = 5.7;
  const drop = jump.deckHeight - endHeight;
  const terminalDrop = Math.min(length * 0.11, drop * 0.6);
  return new Vector3(
    jump.start[0] + dx * t - (dz / length) * across,
    endHeight +
      (drop - terminalDrop) * Math.pow(1 - t, 1.45) +
      terminalDrop * (1 - t),
    jump.start[1] + dz * t + (dx / length) * across,
  );
}

function rampDeck(jump: Jump, width: number, raise = 0, depth = 0.5) {
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
      const p = rampPoint(jump, i / steps, across);
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
  const materials = {
    concrete: new MeshStandardMaterial({ color: '#c3bca9', roughness: 0.93 }),
    pale: new MeshStandardMaterial({ color: '#dedace', roughness: 0.85 }),
    roof: new MeshStandardMaterial({
      color: '#737c7c',
      roughness: 0.65,
      metalness: 0.23,
    }),
    frame: new MeshStandardMaterial({
      color: '#667375',
      roughness: 0.64,
      metalness: 0.4,
    }),
    dark: new MeshStandardMaterial({ color: '#424e51', roughness: 0.63 }),
    glass: new MeshStandardMaterial({
      color: '#638692',
      roughness: 0.26,
      metalness: 0.38,
    }),
    red: new MeshStandardMaterial({ color: '#916e58', roughness: 0.79 }),
    track: new MeshStandardMaterial({ color: '#a9b8b4', roughness: 0.82 }),
    grass: new MeshStandardMaterial({ color: '#9bac86', roughness: 1 }),
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
    const main = index === 0;
    const towerWidth = jump.towerWidth;
    const towerDepth = jump.towerDepth;
    const headHeight = main ? 10 : index === 1 ? 4 : 2.4;
    const headY = jump.height - headHeight;
    function localBox(
      name: string,
      material: MaterialName,
      size: Point,
      at: Point,
    ) {
      const x = cx + Math.cos(angle) * at[0] + Math.sin(angle) * at[2];
      const z = cz - Math.sin(angle) * at[0] + Math.cos(angle) * at[2];
      box(name, material, size, [x, at[1], z], angle);
    }
    localBox(
      'tower foundations',
      'concrete',
      [towerWidth, 0.75, towerDepth],
      [0, 0.375, 0],
    );
    if (main) {
      localBox(
        'main concrete tower',
        'concrete',
        [8.2, headY, 12],
        [0, headY / 2, 1.1],
      );
      for (const side of [-1, 1]) {
        localBox(
          'tower side pilasters',
          'pale',
          [1, jump.height - 0.5, towerDepth - 1.8],
          [side * 5.65, (jump.height - 0.5) / 2, 0],
        );
        for (let y = 4; y < headY; y += 3.9) {
          localBox(
            'recessed stairwell windows',
            'dark',
            [0.09, 2.45, 1.7],
            [side * 4.16, y, 3.5],
          );
          localBox(
            'concrete construction joints',
            'pale',
            [8.24, 0.055, 12.04],
            [0, y - 1.5, 1.1],
          );
        }
      }
    } else {
      localBox(
        'smaller tower cores',
        'concrete',
        [towerWidth * 0.6, headY, towerDepth * 0.65],
        [0, headY / 2, 0],
      );
      for (const side of [-1, 1]) {
        localBox(
          'smaller tower columns',
          'pale',
          [0.55, headY, towerDepth * 0.9],
          [side * towerWidth * 0.39, headY / 2, 0],
        );
      }
    }
    localBox(
      'tower upper rooms',
      'concrete',
      [towerWidth * 0.95, headHeight - 0.35, towerDepth * 0.95],
      [0, headY + headHeight / 2 - 0.175, 0],
    );
    const floors = main ? 3 : 1;
    for (let floor = 0; floor < floors; floor++) {
      const y = headY + 1.2 + floor * 2.95;
      for (const side of [-1, 1]) {
        localBox(
          'observation glazing',
          'glass',
          [towerWidth * 0.74, 1.55, 0.11],
          [0, y, side * towerDepth * 0.48],
        );
        localBox(
          'observation glazing',
          'glass',
          [0.11, 1.55, towerDepth * 0.7],
          [side * towerWidth * 0.48, y, 0],
        );
        for (let col = -2; col <= 2; col++) {
          localBox(
            'window mullions',
            'frame',
            [0.075, 1.58, 0.14],
            [col * towerWidth * 0.135, y, side * towerDepth * 0.484],
          );
          localBox(
            'window mullions',
            'frame',
            [0.14, 1.58, 0.075],
            [side * towerWidth * 0.484, y, col * towerDepth * 0.13],
          );
        }
      }
      localBox(
        'upper floor fascia',
        'pale',
        [towerWidth, 0.26, towerDepth],
        [0, y + 0.93, 0],
      );
    }
    localBox(
      'flat roof coping',
      'pale',
      [towerWidth, 0.35, towerDepth],
      [0, jump.height - 0.175, 0],
    );
    localBox(
      'recessed roof surface',
      'roof',
      [towerWidth - 0.75, 0.035, towerDepth - 0.75],
      [0, jump.height - 0.045, 0],
    );
    localBox(
      'tower entrance',
      'dark',
      [1.4, 2.3, 0.08],
      [0, 1.15, towerDepth * 0.48],
    );

    const deck = mesh(
      `${jump.name} curved inrun`,
      rampDeck(jump, jump.width),
      'concrete',
    );
    deck.userData.osmWay = jump.rampWay;
    mesh(
      `${jump.name} running surface`,
      rampDeck(jump, jump.width * 0.68, 0.055, 0.04),
      'track',
    );
    for (const side of [-1, 1]) {
      for (let step = 0; step < 64; step++) {
        const a = rampPoint(jump, step / 64, side * (jump.width / 2 - 0.12));
        const b = rampPoint(
          jump,
          (step + 1) / 64,
          side * (jump.width / 2 - 0.12),
        );
        a.y += 0.85;
        b.y += 0.85;
        bar('inrun safety handrails', 'red', a, b, 0.095);
        if (step % 2 === 0) {
          const foot = a.clone();
          foot.y -= 0.86;
          bar('inrun railing uprights', 'frame', foot, a, 0.048);
        }
        const c = rampPoint(jump, step / 64, side * 0.19);
        const d = rampPoint(jump, (step + 1) / 64, side * 0.19);
        c.y += 0.08;
        d.y += 0.08;
        bar('paired ski grooves', 'dark', c, d, 0.046);
      }
    }
    const treadCount = Math.ceil(length / 0.8);
    for (let step = 0; step < treadCount; step++) {
      const t = step / treadCount;
      const point = rampPoint(jump, t, jump.width * 0.37);
      box(
        'inrun access stair treads',
        'pale',
        [Math.max(0.42, jump.width * 0.19), 0.085, 0.3],
        [point.x, point.y + 0.1, point.z],
        angle,
      );
    }
    for (const t of [0.2, 0.46, 0.72, 0.94]) {
      const point = rampPoint(jump, t);
      for (const side of [-1, 1]) {
        const p = rampPoint(jump, t, side * jump.width * 0.29);
        box(
          'inrun concrete trestles',
          'concrete',
          [0.65, p.y - 0.8, 0.85],
          [p.x, (p.y - 0.8) / 2, p.z],
          angle,
        );
      }
      const a = rampPoint(jump, t, -jump.width * 0.29);
      const b = rampPoint(jump, t, jump.width * 0.29);
      a.y = 1.1;
      b.y -= 1.3;
      bar('trestle cross bracing', 'frame', a, b, 0.1);
      a.y = b.y;
      b.y = 1.1;
      bar('trestle cross bracing', 'frame', a, b, 0.1);
      box(
        'trestle footing pads',
        'concrete',
        [jump.width * 0.88, 0.3, 2],
        [point.x, 0.15, point.z],
        angle,
      );
    }
  }

  //a thin site ribbon records the landing footprint without inventing the
  //park's large hillside terrain or implying a usable jump profile.
  for (const landing of landingPlans) {
    const positions: number[] = [];
    const points = landing.points;
    const height = (p: number[]) =>
      0.08 +
      2.7 *
        Math.exp(
          -Math.hypot(p[0] - landing.start[0], p[1] - landing.start[1]) / 35,
        );
    for (const triangle of ShapeUtils.triangulateShape(
      points.map(([x, z]) => new Vector2(x, z)),
      [],
    )) {
      const [a, b, c] = triangle.map((i) => points[i]);
      const upward =
        (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 0;
      for (const p of upward ? [a, b, c] : [a, c, b])
        positions.push(p[0], height(p), p[1]);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const ribbon = mesh('mapped landing strip', geometry, 'grass');
    ribbon.userData.osmWay = landing.way;
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
  park.userData.terrain = 'flat-map illustration; landing relief compressed';
  return park;
}
