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
  ShapeUtils,
  Vector2,
  Vector3,
} from 'three';

export const OLYMPIC_TOWER = {
  heightMetres: 58,
  portalHeightMetres: 42.6,
  portalFrontMetres: -9.4,
  portalWidthMetres: 6.2,
  antennaHeightMetres: 64.6,
  referenceUrl:
    'https://www.heritagecalgary.ca/heritage-calgary-blog/inventory1000',
};

type Point = [number, number, number];

//the heritage photos show a projecting head and a deep ramp opening. only the
//58 m building height is published; the smaller proportions are interpreted.
export function createOlympicTowerModel(): Group {
  const tower = new Group();
  tower.name = 'main concrete tower';
  const materials = {
    concrete: new MeshStandardMaterial({ color: '#c1c0b9', roughness: 0.93 }),
    pale: new MeshStandardMaterial({ color: '#e1e2dc', roughness: 0.83 }),
    joint: new MeshStandardMaterial({ color: '#aaada7', roughness: 0.92 }),
    glass: new MeshStandardMaterial({
      color: '#263e4a',
      roughness: 0.34,
      metalness: 0.2,
    }),
    dark: new MeshStandardMaterial({ color: '#252d30', roughness: 0.91 }),
    steel: new MeshStandardMaterial({
      color: '#848e90',
      roughness: 0.58,
      metalness: 0.46,
    }),
    roof: new MeshStandardMaterial({ color: '#7a8587', roughness: 0.82 }),
  };
  type MaterialName = keyof typeof materials;
  const boxes = new Map<MaterialName, Matrix4[]>();
  const rods: Matrix4[] = [];
  const pose = new Object3D();
  function box(material: MaterialName, size: Point, centre: Point) {
    pose.position.set(...centre);
    pose.rotation.set(0, 0, 0);
    pose.scale.set(...size);
    pose.updateMatrix();
    const batch = boxes.get(material) ?? [];
    batch.push(pose.matrix.clone());
    boxes.set(material, batch);
  }
  function rod(a: Point, b: Point, radius: number) {
    const start = new Vector3(...a);
    const end = new Vector3(...b);
    const direction = end.clone().sub(start);
    pose.position.copy(start.add(end).multiplyScalar(0.5));
    pose.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    pose.scale.set(radius, direction.length(), radius);
    pose.updateMatrix();
    rods.push(pose.matrix.clone());
  }
  function sideHousing(x0: number, x1: number) {
    //a chamfered lower cheek, not a pair of full-height freestanding fins.
    const profile: [number, number][] = [
      [-9.55, 58],
      [9.55, 58],
      [9.55, 37],
      [6.7, 32.8],
      [-1.4, 32.8],
      [-8.5, 38.8],
      [-9.55, 45.6],
    ];
    const points: number[] = [];
    function triangle(a: Point, b: Point, c: Point) {
      points.push(...a, ...b, ...c);
    }
    const area = profile.reduce((sum, [z, y], i) => {
      const [nz, ny] = profile[(i + 1) % profile.length];
      return sum + z * ny - nz * y;
    }, 0);
    for (const face of ShapeUtils.triangulateShape(
      profile.map(([z, y]) => new Vector2(z, y)),
      [],
    )) {
      const [a, b, c] = face.map((index) => profile[index]);
      const left: Point[] = [a, b, c].map(([z, y]) => [x0, y, z]);
      const right: Point[] = [a, b, c].map(([z, y]) => [x1, y, z]);
      //triangulateShape returns counterclockwise triangles in the yz profile.
      triangle(left[0], left[1], left[2]);
      triangle(right[0], right[2], right[1]);
    }
    for (let i = 0; i < profile.length; i++) {
      const [z0, y0] = profile[i];
      const [z1, y1] = profile[(i + 1) % profile.length];
      const a: Point = [x0, y0, z0];
      const b: Point = [x1, y0, z0];
      const c: Point = [x1, y1, z1];
      const d: Point = [x0, y1, z1];
      if (area < 0) {
        triangle(a, c, b);
        triangle(a, d, c);
      } else {
        triangle(a, b, c);
        triangle(a, c, d);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    geometry.computeVertexNormals();
    const cheek = new Mesh(geometry, materials.pale);
    cheek.name = 'cantilevered head side housing';
    tower.add(cheek);
  }

  box('concrete', [10.2, 0.6, 12.3], [0, 0.3, 2.5]);
  box('concrete', [8.5, 45.8, 9.8], [0, 22.9, 3.5]);
  //the shaft has sparse slit windows; the observation windows belong to the head.
  for (let y = 5.6; y < 41; y += 4.65) {
    box('glass', [1.05, 1.9, 0.05], [2.7, y, -1.425]);
    box('glass', [0.05, 1.9, 1.1], [-4.275, y, 4.9]);
  }
  for (let y = 3.4; y < 43; y += 3.6) {
    box('joint', [8.54, 0.038, 9.84], [0, y, 3.5]);
  }
  box('joint', [0.03, 42.8, 0.05], [-0.9, 21.4, -1.425]);
  box('joint', [0.03, 42.8, 0.05], [1.5, 21.4, -1.425]);
  box('dark', [1.7, 2.6, 0.07], [-0.8, 1.3, 8.44]);
  sideHousing(-6.425, -5.4);
  sideHousing(5.4, 6.425);

  //a solid upper cabin leaves a real recess underneath for the inrun.
  box('pale', [10.8, 12.25, 17.9], [0, 51.875, -0.3]);
  box('pale', [10.8, 4.3, 18.5], [0, 55.85, -0.25]);
  box('roof', [10.75, 0.06, 17.75], [0, 57.9, -0.3]);
  box('pale', [11.15, 0.3, 18.2], [0, 57.85, -0.3]);
  for (const y of [47.1, 49.85, 52.6]) {
    box('glass', [9.45, 1.8, 0.08], [0, y, -9.3]);
    //the short window returns stop at the deep side wall instead of wrapping it.
    for (const side of [-1, 1]) {
      box('glass', [0.075, 1.8, 5.6], [side * 6.47, y, -5.15]);
      for (let z = -7.55; z < -2.3; z += 1.4)
        box('pale', [0.1, 1.83, 0.07], [side * 6.49, y, z]);
    }
    for (const x of [-3.6, -1.8, 0, 1.8, 3.6])
      box('pale', [0.09, 1.86, 0.1], [x, y, -9.36]);
    box('pale', [10.75, 0.22, 0.18], [0, y - 1.06, -9.29]);
  }

  const portal = new Group();
  portal.name = 'inrun portal';
  portal.position.set(0, OLYMPIC_TOWER.portalHeightMetres, -9.4);
  portal.userData.clearWidthMetres = OLYMPIC_TOWER.portalWidthMetres;
  portal.userData.clearHeightMetres = 3.15;
  tower.add(portal);
  box('dark', [6.2, 3.15, 0.15], [0, 44.175, -2.1]);
  box('dark', [0.16, 3.15, 7.3], [-3.05, 44.175, -5.75]);
  box('dark', [0.16, 3.15, 7.3], [3.05, 44.175, -5.75]);
  box('dark', [6.2, 0.1, 7.3], [0, 45.72, -5.75]);
  box('concrete', [6.35, 0.6, 7.8], [0, 42.3, -5.5]);
  for (const side of [-1, 1])
    box('pale', [2.1, 3.6, 1], [side * 4.18, 44, -8.8]);

  //roof equipment is deliberately plain: no copied signage, rings or textures.
  box('roof', [2.8, 1.3, 3.3], [0.8, 58.55, 3.4]);
  for (const x of [-5.55, 5.55]) {
    rod([x, 58, -8.1], [x, 58.8, -8.1], 0.05);
    rod([x, 58, 7.3], [x, 58.8, 7.3], 0.05);
    rod([x, 58.8, -8.1], [x, 58.8, 7.3], 0.05);
  }
  for (const z of [-8.1, 7.3]) rod([-5.55, 58.8, z], [5.55, 58.8, z], 0.05);
  for (const x of [-0.55, 0.55]) {
    rod([x + 1.2, 58, 1], [1.2, 64.6, 1], 0.055);
    rod([x + 1.2, 58, 2], [1.2, 64.6, 1], 0.055);
  }
  for (let y = 58.7; y < 64; y += 0.8) {
    const spread = ((64.6 - y) / 6.6) * 0.55;
    rod([1.2 - spread, y, 1], [1.2 + spread, y, 1], 0.035);
  }
  for (const [x, z, height] of [
    [-4.3, -5.7, 2.8],
    [4.3, -5.7, 2.5],
    [-4.3, 5.8, 2.6],
    [4.3, 5.8, 2.1],
  ]) {
    rod([x, 58, z], [x, 58 + height, z], 0.07);
    box('pale', [0.42, 1.5, 0.28], [x, 58 + height - 0.65, z]);
  }

  for (const [material, matrices] of boxes) {
    const batch = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      materials[material],
      matrices.length,
    );
    batch.name = `tower ${material} details`;
    matrices.forEach((matrix, i) => batch.setMatrixAt(i, matrix));
    batch.instanceMatrix.needsUpdate = true;
    tower.add(batch);
  }
  const antennas = new InstancedMesh(
    new CylinderGeometry(1, 1, 1, 6),
    materials.steel,
    rods.length,
  );
  antennas.name = 'roof antennae and rails';
  rods.forEach((matrix, i) => antennas.setMatrixAt(i, matrix));
  antennas.instanceMatrix.needsUpdate = true;
  tower.add(antennas);
  tower.userData.architecturalHeightMetres = OLYMPIC_TOWER.heightMetres;
  tower.userData.antennaHeightIsApproximate = true;
  tower.userData.proportionsAreApproximate = true;
  tower.userData.axes = 'x width, y up, z rear; inrun faces negative z';
  return tower;
}
