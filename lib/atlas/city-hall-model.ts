import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
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
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';

export const CITY_HALL = {
  id: 'city-hall-landmark',
  coordinates: [-114.05735267487331, 51.046061477171925] as [number, number],
  heightMetres: 48.2,
  historicTowerHeightMetres: 32.5,
  heightIsApproximate: true,
  //only these individually checked municipal parts are unshared; the 5 m historic outline stays.
  basemapFeatureIds: [
    14555663142, 14555663162, 14555663112, 14555662892, 14555663042,
    14555662902, 14555663022, 14555663012,
  ],
  sourceUrl:
    'https://www.calgary.ca/arts-culture/heritage-sites/city-hall-character.html',
  locationSourceUrl: 'https://www.openstreetmap.org/way/37829977',
  municipalSourceUrl:
    'https://www.calgary.ca/content/dam/www/ca/city-clerks/documents/muni-tours/the-municipal-complex.pdf',
  detail:
    'Original illustration of historic sandstone City Hall, its clock tower and the stepped blue-glass Municipal Building. Plans follow OpenStreetMap; heights and architectural details are approximate.',
};

type BuildingPart = { height: number; base: number; outline: number[][] };
//the adjoining municipal mass follows attributed OSM building parts, not a downloaded 3d asset.
const municipalParts: BuildingPart[] = [
  {
    height: 4,
    base: 0,
    outline: [
      [18.24, 13.48],
      [20.12, 13.86],
      [19.74, 20.61],
      [35.13, 21.36],
      [32.51, 75.43],
      [15.61, 75.05],
      [18.24, 13.48],
    ],
  },
  {
    height: 4,
    base: 0,
    outline: [
      [94.08, -8.29],
      [88.45, -8.67],
      [88.45, -14.3],
      [97.08, -13.93],
      [97.08, -12.05],
      [94.45, -12.05],
      [94.08, -8.29],
    ],
  },
  {
    height: 5,
    base: 0,
    outline: [
      [101.21, 70.55],
      [106.84, 70.55],
      [106.09, 88.94],
      [100.08, 88.57],
      [101.21, 70.55],
    ],
  },
  {
    height: 5,
    base: 0,
    outline: [
      [-22.68, 109.22],
      [15.61, 74.3],
      [18.24, 13.48],
      [20.12, 13.86],
      [19.74, 20.61],
      [72.3, 22.49],
      [87.69, 7.47],
      [93.7, 2.59],
      [94.45, -12.05],
      [110.6, -11.3],
      [106.09, 88.94],
      [92.2, 88.19],
      [90.7, 113.72],
      [95.95, 114.1],
      [95.58, 124.61],
      [13.73, 120.48],
      [13.73, 115.6],
      [-23.06, 113.72],
      [-22.68, 109.22],
    ],
  },
  {
    height: 8,
    base: 0,
    outline: [
      [27.25, -11.67],
      [21.24, -11.67],
      [21.24, -13.18],
      [18.61, -13.18],
      [18.61, -18.81],
      [27.62, -18.81],
      [27.25, -11.67],
    ],
  },
  {
    height: 8,
    base: 0,
    outline: [
      [35.13, 21.36],
      [72.3, 22.49],
      [72.3, 23.62],
      [70.8, 23.62],
      [70.05, 41.26],
      [52.03, 40.89],
      [51.28, 58.53],
      [33.26, 57.78],
      [35.13, 21.36],
    ],
  },
  {
    height: 8,
    base: 0,
    outline: [
      [100.08, 88.57],
      [89.95, 88.19],
      [90.7, 70.17],
      [101.21, 70.55],
      [100.08, 88.57],
    ],
  },
  {
    height: 8,
    base: 0,
    outline: [
      [31.38, 121.61],
      [13.73, 120.48],
      [14.11, 110.34],
      [31.75, 111.1],
      [31.38, 121.61],
    ],
  },
  {
    height: 11,
    base: 0,
    outline: [
      [101.21, 70.55],
      [90.7, 70.17],
      [91.45, 52.15],
      [101.96, 52.53],
      [101.21, 70.55],
    ],
  },
  {
    height: 11,
    base: 0,
    outline: [
      [49.4, 122.36],
      [31.38, 121.61],
      [31.75, 111.1],
      [49.78, 111.85],
      [49.4, 122.36],
    ],
  },
  {
    height: 11,
    base: 0,
    outline: [
      [-23.06, 113.72],
      [-22.68, 109.22],
      [-4.29, 92.32],
      [-5.41, 114.47],
      [-23.06, 113.72],
    ],
  },
  {
    height: 11,
    base: 7,
    outline: [
      [101.21, 70.55],
      [101.96, 52.53],
      [107.59, 52.9],
      [106.84, 70.55],
      [101.21, 70.55],
    ],
  },
  {
    height: 15,
    base: 0,
    outline: [
      [27.62, -16.55],
      [97.08, -13.93],
      [97.08, -12.05],
      [94.45, -12.05],
      [93.7, 2.59],
      [87.69, 7.47],
      [72.3, 22.49],
      [19.74, 20.61],
      [21.24, -13.18],
      [18.61, -13.18],
      [18.61, -18.81],
      [27.62, -18.81],
      [27.62, -16.55],
    ],
  },
  {
    height: 15,
    base: 0,
    outline: [
      [19.74, 20.61],
      [20.12, 10.1],
      [26.5, 10.1],
      [27.62, -16.55],
      [88.45, -14.3],
      [87.69, 12.73],
      [93.33, 13.11],
      [92.95, 23.24],
      [19.74, 20.61],
    ],
  },
  {
    height: 15,
    base: 0,
    outline: [
      [102.71, 34.51],
      [101.96, 52.53],
      [91.45, 52.15],
      [92.58, 34.13],
      [102.71, 34.51],
    ],
  },
  {
    height: 15,
    base: 0,
    outline: [
      [67.05, 123.11],
      [49.4, 122.36],
      [49.78, 111.85],
      [67.42, 112.6],
      [67.05, 123.11],
    ],
  },
  {
    height: 15,
    base: 7,
    outline: [
      [101.96, 52.53],
      [102.71, 34.51],
      [108.34, 34.88],
      [107.59, 52.9],
      [101.96, 52.53],
    ],
  },
  {
    height: 19,
    base: 0,
    outline: [
      [27.25, -11.67],
      [26.5, 10.1],
      [20.12, 10.1],
      [21.24, -11.67],
      [27.25, -11.67],
    ],
  },
  {
    height: 19,
    base: 0,
    outline: [
      [88.45, -8.67],
      [94.08, -8.29],
      [93.33, 13.11],
      [87.69, 12.73],
      [88.45, -8.67],
    ],
  },
  {
    height: 19,
    base: 0,
    outline: [
      [95.58, 124.61],
      [67.05, 123.11],
      [67.42, 112.6],
      [95.95, 114.1],
      [95.58, 124.61],
    ],
  },
  {
    height: 19,
    base: 0,
    outline: [
      [-5.41, 114.47],
      [-4.29, 92.32],
      [13.73, 93.07],
      [12.61, 115.6],
      [-5.41, 114.47],
    ],
  },
  {
    height: 19,
    base: 7,
    outline: [
      [93.7, 2.59],
      [94.45, -12.05],
      [110.6, -11.3],
      [108.72, 26.62],
      [103.09, 26.25],
      [102.71, 33.0],
      [108.72, 33.38],
      [108.34, 34.88],
      [92.58, 34.13],
      [93.7, 2.59],
    ],
  },
  {
    height: 19,
    base: 7,
    outline: [
      [-4.29, 92.32],
      [8.1, 81.06],
      [14.48, 75.05],
      [13.73, 93.07],
      [-4.29, 92.32],
    ],
  },
  {
    height: 19,
    base: 14,
    outline: [
      [103.09, 26.25],
      [108.72, 26.62],
      [108.72, 33.38],
      [102.71, 33.0],
      [103.09, 26.25],
    ],
  },
  {
    height: 26,
    base: 0,
    outline: [
      [14.48, 75.05],
      [32.51, 75.43],
      [31.0, 111.1],
      [15.24, 110.34],
      [14.86, 115.6],
      [12.61, 115.6],
      [14.48, 75.05],
    ],
  },
  {
    height: 26,
    base: 10,
    outline: [
      [32.51, 75.43],
      [14.48, 75.05],
      [33.26, 57.78],
      [32.51, 75.43],
    ],
  },
  {
    height: 26,
    base: 10,
    outline: [
      [31.0, 111.1],
      [30.63, 116.35],
      [14.86, 115.6],
      [15.24, 110.34],
      [31.0, 111.1],
    ],
  },
  {
    height: 33,
    base: 0,
    outline: [
      [33.26, 57.78],
      [51.28, 58.53],
      [49.02, 111.85],
      [31.0, 111.1],
      [33.26, 57.78],
    ],
  },
  {
    height: 33,
    base: 14,
    outline: [
      [33.26, 57.78],
      [52.03, 40.89],
      [51.28, 58.53],
      [33.26, 57.78],
    ],
  },
  {
    height: 33,
    base: 14,
    outline: [
      [48.65, 117.1],
      [32.88, 116.35],
      [33.26, 111.1],
      [49.02, 111.85],
      [48.65, 117.1],
    ],
  },
  {
    height: 33,
    base: 10,
    outline: [
      [31.0, 111.1],
      [33.26, 111.1],
      [32.88, 116.35],
      [30.63, 116.35],
      [31.0, 111.1],
    ],
  },
  {
    height: 41,
    base: 0,
    outline: [
      [52.03, 40.89],
      [70.05, 41.26],
      [66.67, 112.6],
      [49.02, 111.85],
      [52.03, 40.89],
    ],
  },
  {
    height: 41,
    base: 18,
    outline: [
      [66.67, 117.85],
      [50.9, 117.1],
      [50.9, 111.85],
      [66.67, 112.6],
      [66.67, 117.85],
    ],
  },
  {
    height: 41,
    base: 18,
    outline: [
      [52.03, 40.89],
      [70.8, 23.62],
      [70.05, 41.26],
      [52.03, 40.89],
    ],
  },
  {
    height: 41,
    base: 14,
    outline: [
      [49.02, 111.85],
      [50.9, 111.85],
      [50.9, 117.1],
      [48.65, 117.1],
      [49.02, 111.85],
    ],
  },
  {
    height: 48,
    base: 0,
    outline: [
      [70.8, 23.62],
      [94.83, 24.74],
      [90.7, 113.72],
      [66.67, 112.6],
      [70.8, 23.62],
    ],
  },
  {
    height: 48,
    base: 21,
    outline: [
      [70.8, 23.62],
      [87.69, 7.47],
      [94.45, 1.84],
      [95.58, 1.84],
      [94.83, 24.74],
      [70.8, 23.62],
    ],
  },
  {
    height: 48,
    base: 21,
    outline: [
      [68.92, 112.97],
      [90.7, 113.72],
      [90.7, 118.98],
      [68.92, 118.23],
      [68.92, 112.97],
    ],
  },
  {
    height: 48,
    base: 18,
    outline: [
      [68.92, 118.23],
      [66.67, 117.85],
      [66.67, 112.6],
      [68.92, 112.97],
      [68.92, 118.23],
    ],
  },
];

function buffer(positions: number[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createCityHallModel(): Group {
  const model = new Group();
  model.name = 'City Hall and Municipal Building';
  const historic = new Group();
  historic.name = 'Historic City Hall';
  historic.rotation.y = -0.035;
  model.add(historic);
  const stone = new MeshStandardMaterial({ color: '#c5ab85', roughness: 0.96 });
  const lightStone = new MeshStandardMaterial({
    color: '#dfc9a8',
    roughness: 0.91,
  });
  const darkStone = new MeshStandardMaterial({
    color: '#9c876c',
    roughness: 0.96,
  });
  const red = new MeshStandardMaterial({ color: '#9e5146', roughness: 0.77 });
  const roofEdge = new MeshStandardMaterial({
    color: '#784b40',
    roughness: 0.77,
  });
  const window = new MeshStandardMaterial({
    color: '#334d58',
    roughness: 0.38,
    metalness: 0.25,
  });
  const ivory = new MeshStandardMaterial({ color: '#ece7d6', roughness: 0.65 });
  const clockInk = new MeshStandardMaterial({
    color: '#3d403b',
    roughness: 0.7,
  });
  const blue = new MeshStandardMaterial({
    color: '#4b7389',
    roughness: 0.32,
    metalness: 0.35,
    side: DoubleSide,
  });
  const frame = new MeshStandardMaterial({
    color: '#9fb3bc',
    roughness: 0.6,
    metalness: 0.25,
  });
  const roof = new MeshStandardMaterial({
    color: '#b3bec0',
    roughness: 0.86,
    side: DoubleSide,
  });
  const add = (
    shape: BufferGeometry,
    material: Material,
    name: string,
    parent: Group = historic,
  ) => {
    const mesh = new Mesh(shape, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  function box(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    parent = historic,
  ) {
    const mesh = add(
      new BoxGeometry(width, height, depth),
      material,
      name,
      parent,
    );
    mesh.position.set(x, y, z);
    return mesh;
  }
  function batch(
    name: string,
    shape: BufferGeometry,
    material: Material,
    placements: Object3D[],
    parent = historic,
  ) {
    const mesh = new InstancedMesh(shape, material, placements.length);
    placements.forEach((p, i) => {
      p.updateMatrix();
      mesh.setMatrixAt(i, p.matrix);
    });
    mesh.name = name;
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    return mesh;
  }
  function placement(
    x: number,
    y: number,
    z: number,
    ry = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) {
    const p = new Object3D();
    p.position.set(x, y, z);
    p.rotation.y = ry;
    p.scale.set(sx, sy, sz);
    return p;
  }
  function hip(
    name: string,
    w: number,
    d: number,
    topW: number,
    topD: number,
    y0: number,
    y1: number,
    x = 0,
    z = 0,
    material = red,
  ) {
    const positions = [
      -w / 2,
      y0,
      -d / 2,
      w / 2,
      y0,
      -d / 2,
      w / 2,
      y0,
      d / 2,
      -w / 2,
      y0,
      d / 2,
      -topW / 2,
      y1,
      -topD / 2,
      topW / 2,
      y1,
      -topD / 2,
      topW / 2,
      y1,
      topD / 2,
      -topW / 2,
      y1,
      topD / 2,
    ];
    const indices = [
      0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7, 3, 7, 0, 0, 7, 4, 4,
      7, 5, 5, 7, 6,
    ];
    const mesh = add(buffer(positions, indices), material, name);
    mesh.position.set(x, 0, z);
    return mesh;
  }

  box('sandstone plinth', 37.2, 2.1, 28.8, 0, 1.05, 0, darkStone);
  box('sandstone main volume', 36.4, 11.8, 28.2, 0, 8, 0, stone);
  box('first floor stone belt', 37, 0.48, 28.7, 0, 4.45, 0, lightStone);
  box('upper stone belt', 37, 0.34, 28.7, 0, 9, 0, lightStone);
  box('deep cornice', 38, 0.65, 29.5, 0, 14.05, 0, lightStone);
  hip('steep red mansard roof', 38.2, 29.7, 28.6, 20.2, 14.35, 19.1);
  hip('upper shallow roof', 28.6, 20.2, 16, 7.7, 19.1, 20.25);
  const stones: Object3D[] = [];
  for (let course = 0; course < 20; course++) {
    const y = 2.55 + course * 0.56;
    for (const z of [-14.17, 14.17])
      stones.push(placement(0, y, z, 0, 36.5, 0.035, 0.06));
    for (const x of [-18.25, 18.25])
      stones.push(placement(x, y, 0, 0, 0.06, 0.035, 28.3));
  }
  batch(
    'sandstone horizontal coursing',
    new BoxGeometry(1, 1, 1),
    darkStone,
    stones,
  );
  const windowPlaces: Object3D[] = [];
  const surrounds: Object3D[] = [];
  const sills: Object3D[] = [];
  const sash: Object3D[] = [];
  for (const face of [-1, 1])
    for (let bay = 0; bay < 9; bay++)
      for (let floor = 0; floor < 3; floor++) {
        const x = -15.2 + bay * 3.8,
          y = 3.05 + floor * 4.0,
          z = face * 14.2;
        windowPlaces.push(placement(x, y, z, 0, 1.65, 2.6, 0.14));
        surrounds.push(
          placement(x - 0.98, y, z, 0, 0.28, 2.95, 0.25),
          placement(x + 0.98, y, z, 0, 0.28, 2.95, 0.25),
        );
        sills.push(
          placement(x, y - 1.48, z + face * 0.06, 0, 2.45, 0.22, 0.5),
          placement(x, y + 1.42, z, 0, 2.18, 0.24, 0.28),
        );
        sash.push(
          placement(x, y, z + face * 0.1, 0, 0.07, 2.6, 0.09),
          placement(x, y + 0.2, z + face * 0.1, 0, 1.65, 0.08, 0.09),
        );
      }
  for (const face of [-1, 1])
    for (const z of [-10.5, -6.5, 6.5, 10.5])
      for (let floor = 0; floor < 3; floor++) {
        const x = face * 18.26,
          y = 3.05 + floor * 4;
        windowPlaces.push(placement(x, y, z, Math.PI / 2, 1.65, 2.6, 0.14));
        surrounds.push(
          placement(x, y, z - 0.98, 0, 0.25, 2.95, 0.28),
          placement(x, y, z + 0.98, 0, 0.25, 2.95, 0.28),
        );
        sills.push(placement(x, y - 1.48, z, 0, 0.5, 0.22, 2.45));
      }
  batch(
    'recessed sash windows',
    new BoxGeometry(1, 1, 1),
    window,
    windowPlaces,
  );
  batch(
    'window sandstone jambs',
    new BoxGeometry(1, 1, 1),
    lightStone,
    surrounds,
  );
  batch(
    'window lintels and sills',
    new BoxGeometry(1, 1, 1),
    lightStone,
    sills,
  );
  batch('fine window sash bars', new BoxGeometry(1, 1, 1), ivory, sash);

  //the front tower faces Macleod Trail, west of the oblong main hall.
  box('square clock tower shaft', 7.6, 27.3, 7.8, -19.1, 13.65, -0.9, stone);
  box(
    'clock tower upper cornice',
    8.5,
    0.6,
    8.7,
    -19.1,
    27.35,
    -0.9,
    lightStone,
  );
  hip(
    'clock tower pyramidal roof',
    8.7,
    8.9,
    0.3,
    0.3,
    27.65,
    32.05,
    -19.1,
    -0.9,
    roofEdge,
  );
  const finial = add(
    new SphereGeometry(0.22, 10, 7),
    roofEdge,
    'clock tower finial',
  );
  finial.position.set(-19.1, 32.27, -0.9);
  const clockTicks: Object3D[] = [];
  const clockHands: Object3D[] = [];
  for (let face = 0; face < 4; face++) {
    const a = (face * Math.PI) / 2;
    const normal = new Vector3(Math.sin(a), 0, Math.cos(a));
    const along = new Vector3(Math.cos(a), 0, -Math.sin(a));
    const centre = new Vector3(-19.1, 24.75, -0.9).addScaledVector(
      normal,
      face % 2 ? 3.87 : 3.97,
    );
    const dial = add(new CircleGeometry(1.43, 48), ivory, 'clock face');
    dial.position.copy(centre);
    dial.rotation.y = a;
    for (let tick = 0; tick < 12; tick++) {
      const t = (tick * Math.PI) / 6;
      const p = placement(0, 0, 0);
      p.position
        .copy(centre)
        .addScaledVector(along, Math.sin(t) * 1.18)
        .add(new Vector3(0, Math.cos(t) * 1.18, 0))
        .addScaledVector(normal, 0.045);
      p.rotation.set(0, a, -t);
      p.scale.set(0.08, tick % 3 === 0 ? 0.25 : 0.16, 0.055);
      clockTicks.push(p);
    }
    for (const [angle, length] of [
      [-Math.PI / 3, 0.72],
      [Math.PI / 3, 1.0],
    ]) {
      const p = placement(0, 0, 0);
      p.position
        .copy(centre)
        .addScaledVector(along, (Math.sin(angle) * length) / 2)
        .add(new Vector3(0, (Math.cos(angle) * length) / 2, 0))
        .addScaledVector(normal, 0.075);
      p.rotation.set(0, a, -angle);
      p.scale.set(0.09, length, 0.065);
      clockHands.push(p);
    }
  }
  batch('clock hour markers', new BoxGeometry(1, 1, 1), clockInk, clockTicks);
  batch(
    'static illustrative clock hands',
    new BoxGeometry(1, 1, 1),
    clockInk,
    clockHands,
  );
  const towerBelts: Object3D[] = [];
  for (const y of [4.5, 9.1, 14.3, 20.6, 22.7, 26.8])
    towerBelts.push(placement(-19.1, y, -0.9, 0, 7.95, 0.24, 8.12));
  batch(
    'tower horizontal stone belts',
    new BoxGeometry(1, 1, 1),
    lightStone,
    towerBelts,
  );

  //arched openings are geometry, with no image of lettering, crests or the clock face.
  const arches: Object3D[] = [];
  function arch(
    x: number,
    z: number,
    y: number,
    r: number,
    width: number,
    front: boolean,
  ) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 19) * Math.PI;
      const p = placement(
        front ? x : x + Math.cos(a) * r,
        y + Math.sin(a) * r,
        front ? z + Math.cos(a) * r : z,
      );
      if (front) {
        p.rotation.x = a - Math.PI / 2;
        p.scale.set(0.42, 0.4, width);
      } else {
        p.rotation.z = a - Math.PI / 2;
        p.scale.set(width, 0.4, 0.42);
      }
      arches.push(p);
    }
  }
  box('recessed front entrance', 0.16, 4.2, 3.2, -23, 3.2, -0.9, window);
  arch(-23.13, -0.9, 4.8, 2.0, 0.46, true);
  const entryColumns = [-3.14, 1.34].map((z) => placement(-23.2, 3.5, z));
  batch(
    'entrance stone columns',
    new CylinderGeometry(0.33, 0.42, 3.3, 12),
    lightStone,
    entryColumns,
  );
  const stairs: Object3D[] = [];
  for (let i = 0; i < 8; i++)
    stairs.push(
      placement(-23.1 - i * 0.4, 0.16 + (7 - i) * 0.15, -0.9, 0, 0.5, 0.3, 6.5),
    );
  batch('front stone stairs', new BoxGeometry(1, 1, 1), lightStone, stairs);
  for (const side of [-1, 1]) {
    box(
      'projecting side portico',
      9.1,
      0.8,
      3.3,
      -2,
      5.2,
      side * 15.1,
      lightStone,
    );
    const cols = [-5.7, -3.2, -0.8, 1.7].map((x) =>
      placement(x, 3.5, side * 15.7),
    );
    batch(
      'portico columns',
      new CylinderGeometry(0.33, 0.4, 3, 12),
      lightStone,
      cols,
    );
    box(
      'side portico balustrade',
      9.2,
      0.72,
      0.3,
      -2,
      6,
      side * 16.65,
      lightStone,
    );
    for (const x of [-11, 0, 11]) {
      box(
        'roof dormer sandstone face',
        3.9,
        2.8,
        0.6,
        x,
        16.8,
        side * 12.8,
        stone,
      );
      box('roof dormer window', 1.6, 1.9, 0.16, x, 16.7, side * 13.14, window);
      hip(
        'dormer gable cap',
        4.1,
        1.3,
        0.2,
        1.0,
        18.2,
        20,
        x,
        side * 12.8,
        lightStone,
      );
    }
  }
  batch(
    'entrance semicircular stone arch',
    new BoxGeometry(1, 1, 1),
    lightStone,
    arches,
  );
  const dome = add(
    new SphereGeometry(3.05, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    window,
    'octagonal glazed roof dome',
  );
  dome.position.set(3.2, 20.3, 0);
  dome.scale.y = 0.85;
  const domeRibs: Object3D[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    domeRibs.push(
      placement(
        3.2 + Math.sin(a) * 2.7,
        21.25,
        Math.cos(a) * 2.7,
        a,
        0.12,
        2.3,
        0.12,
      ),
    );
  }
  batch('octagonal dome ribs', new BoxGeometry(1, 1, 1), ivory, domeRibs);
  const cupola = add(
    new CylinderGeometry(0.85, 0.9, 1.2, 8),
    ivory,
    'roof dome cupola',
  );
  cupola.position.set(3.2, 23, 0);
  const cupolaRoof = add(
    new CylinderGeometry(0, 1.1, 1.0, 8),
    roofEdge,
    'roof dome cupola cap',
  );
  cupolaRoof.position.set(3.2, 24.1, 0);

  const municipal = new Group();
  municipal.name = 'Modern Municipal Building';
  model.add(municipal);
  const walls: number[] = [];
  const wallFaces: number[] = [];
  const caps: number[] = [];
  const capFaces: number[] = [];
  const bands: Object3D[] = [];
  for (const part of municipalParts) {
    const ring = part.outline.slice(0, -1);
    const centre = ring.reduce(
      (a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length],
      [0, 0],
    );
    const points = ring.map(([x, z]) => [
      x + (x - centre[0]) * 0.001,
      z + (z - centre[1]) * 0.001,
    ]);
    const winding =
      Math.sign(
        points.reduce((area, [x, z], i) => {
          const next = points[(i + 1) % points.length];
          return area + x * next[1] - next[0] * z;
        }, 0),
      ) || 1;
    const bottom = part.base,
      top = part.height + 0.2;
    const at = caps.length / 3;
    for (const [x, z] of points) caps.push(x, top, z);
    for (const triangle of ShapeUtils.triangulateShape(
      points.map(([x, z]) => new Vector2(x, z)),
      [],
    ))
      capFaces.push(...triangle.map((i) => i + at));
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        start = walls.length / 3;
      walls.push(
        a[0],
        bottom,
        a[1],
        a[0],
        top,
        a[1],
        b[0],
        top,
        b[1],
        b[0],
        bottom,
        b[1],
      );
      wallFaces.push(start, start + 1, start + 2, start, start + 2, start + 3);
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz),
        angle = Math.atan2(-dz, dx);
      if (length < 0.8) continue;
      //keep the slim mullions outside the glass instead of relying on depth bias.
      const offsetX = ((dz * winding) / length) * 0.14;
      const offsetZ = ((-dx * winding) / length) * 0.14;
      for (let y = Math.ceil((bottom + 0.2) / 3.65) * 3.65; y < top; y += 3.65)
        bands.push(
          placement(
            (a[0] + b[0]) / 2 + offsetX,
            y,
            (a[1] + b[1]) / 2 + offsetZ,
            angle,
            length,
            0.13,
            0.13,
          ),
        );
      for (let along = 2; along < length; along += 3.6)
        bands.push(
          placement(
            a[0] + (dx * along) / length + offsetX,
            (bottom + top) / 2,
            a[1] + (dz * along) / length + offsetZ,
            angle,
            0.11,
            top - bottom,
            0.11,
          ),
        );
    }
  }
  add(
    buffer(walls, wallFaces),
    blue,
    'stepped municipal glass mass',
    municipal,
  );
  add(
    buffer(caps, capFaces),
    roof,
    'municipal stepped roof terraces',
    municipal,
  );
  batch(
    'municipal curtain wall grid',
    new BoxGeometry(1, 1, 1),
    frame,
    bands,
    municipal,
  );
  model.userData = {
    ...CITY_HALL,
    originalGeometry: true,
    units: 'metres',
    axes: 'x east, y up, z south',
    clockIsLive: false,
  };
  model.updateMatrixWorld(true);
  return model;
}

export function disposeCityHallModel(model: Group) {
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
