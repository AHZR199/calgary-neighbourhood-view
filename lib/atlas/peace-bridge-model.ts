import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';

export const PEACE_BRIDGE = {
  id: 'peace-bridge-landmark',
  coordinates: [-114.0789103, 51.0539135] as [number, number],
  lengthMetres: 126,
  widthMetres: 8,
  heightMetres: 5.85,
  altitudeMetres: 3,
  rotationRadians: -0.8358,
  basemapFeatureIds: [13136576772],
  sourceUrl: 'https://calatrava.com/projects/peace-bridge-calgary.html',
  locationSourceUrl: 'https://www.openstreetmap.org/way/1313657677',
  detail:
    'Original illustration of the red helical steel span, glazed roof and updated cable railings. Published overall dimensions; smaller details and clearance above the flat map are approximate.',
};

//a rectangular ribbon follows an elliptical helix; its inner face is off-white.
function ribbon(direction: number, phase: number) {
  const positions: number[] = [];
  const red: number[] = [];
  const white: number[] = [];
  const steps = 384;
  const turn = Math.PI * 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turn * direction + phase;
    const centre = new Vector3(
      (t - 0.5) * 126,
      2.925 + 2.66 * Math.cos(a),
      3.72 * Math.sin(a),
    );
    const tangent = new Vector3(
      126,
      -2.66 * Math.sin(a) * turn * direction,
      3.72 * Math.cos(a) * turn * direction,
    ).normalize();
    const normal = new Vector3(
      0,
      Math.cos(a) / 2.66,
      Math.sin(a) / 3.72,
    ).normalize();
    const across = new Vector3().crossVectors(tangent, normal).normalize();
    for (const [w, d] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const point = centre
        .clone()
        .addScaledVector(across, w * 0.31)
        .addScaledVector(normal, d * 0.18);
      positions.push(point.x, point.y, point.z);
    }
    if (i === steps) continue;
    for (let side = 0; side < 4; side++) {
      const a0 = i * 4 + side;
      const b = i * 4 + ((side + 1) % 4);
      (side === 0 ? white : red).push(a0, a0 + 4, b, b, a0 + 4, b + 4);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([...red, ...white]);
  geometry.addGroup(0, red.length, 0);
  geometry.addGroup(red.length, white.length, 1);
  geometry.computeVertexNormals();
  return geometry;
}

function canopy() {
  const positions: number[] = [];
  const indices: number[] = [];
  const sections = 32;
  for (let row = 0; row <= 1; row++) {
    for (let i = 0; i <= sections; i++) {
      const angle = -1.05 + (i / sections) * 2.1;
      positions.push(
        row ? 62.9 : -62.9,
        2.925 + 2.52 * Math.cos(angle),
        3.56 * Math.sin(angle),
      );
      if (row || i === sections) continue;
      indices.push(
        i,
        i + sections + 1,
        i + 1,
        i + 1,
        i + sections + 1,
        i + sections + 2,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPeaceBridgeModel(): Group {
  const bridge = new Group();
  bridge.name = 'Peace Bridge';
  const red = new MeshStandardMaterial({
    color: '#bf2730',
    roughness: 0.5,
    metalness: 0.2,
    side: DoubleSide,
  });
  const white = new MeshStandardMaterial({
    color: '#f2e9de',
    roughness: 0.72,
    side: DoubleSide,
  });
  const concrete = new MeshStandardMaterial({
    color: '#bdbbb3',
    roughness: 0.95,
  });
  const paving = new MeshStandardMaterial({
    color: '#747e80',
    roughness: 0.96,
  });
  const steel = new MeshStandardMaterial({
    color: '#bdc7c7',
    roughness: 0.48,
    metalness: 0.6,
  });
  const glass = new MeshStandardMaterial({
    color: '#a9cdd9',
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: DoubleSide,
  });
  function box(
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material = concrete,
  ) {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    bridge.add(mesh);
  }
  box('concrete walking deck', [126, 0.32, 6.2], [0, 1.25, 0]);
  box('central cycle lane', [125.9, 0.04, 2.5], [0, 1.43, 0], paving);
  box('red canopy spine', [126, 0.18, 0.38], [0, 5.76, 0], red);
  for (const side of [-1, 1]) {
    box(
      'cycle lane divider',
      [125.9, 0.08, 0.13],
      [0, 1.45, side * 1.3],
      white,
    );
    box(
      'red longitudinal edge girder',
      [126, 0.38, 0.36],
      [0, 1.12, side * 3.15],
      red,
    );
    box('handrail', [126, 0.065, 0.075], [0, 2.6, side * 3.07], steel);
    for (let cable = 0; cable < 7; cable++)
      box(
        '2023 tension cable railing',
        [126, 0.024, 0.024],
        [0, 1.65 + cable * 0.125, side * 3.07],
        steel,
      );
    box('bank abutment', [2.2, 1.35, 7.7], [side * 64, 0.675, 0]);
  }
  for (const direction of [-1, 1]) {
    for (const phase of [0, Math.PI]) {
      const mesh = new Mesh(ribbon(direction, phase), [red, white]);
      mesh.name = 'elliptical helical box girder';
      bridge.add(mesh);
    }
  }
  const roof = new Mesh(canopy(), glass);
  roof.name = 'curved glazed canopy';
  bridge.add(roof);
  const posts = new InstancedMesh(
    new BoxGeometry(0.055, 1.13, 0.07),
    steel,
    86,
  );
  posts.name = 'railing posts';
  const pose = new Object3D();
  for (let i = 0; i < 43; i++) {
    for (let side = 0; side < 2; side++) {
      pose.position.set(-63 + i * 3, 2, side ? 3.07 : -3.07);
      pose.updateMatrix();
      posts.setMatrixAt(i * 2 + side, pose.matrix);
    }
  }
  bridge.add(posts);
  const beams = new InstancedMesh(new BoxGeometry(0.14, 0.32, 6.22), red, 43);
  beams.name = 'deck cross beams';
  for (let i = 0; i < 43; i++) {
    pose.position.set(-63 + i * 3, 0.91, 0);
    pose.updateMatrix();
    beams.setMatrixAt(i, pose.matrix);
  }
  bridge.add(beams);
  bridge.rotation.y = PEACE_BRIDGE.rotationRadians;
  bridge.userData.units = 'metres';
  bridge.userData.attribution =
    'Footprint alignment © OpenStreetMap contributors, ODbL 1.0. Original illustrative geometry; no external model or texture.';
  return bridge;
}
