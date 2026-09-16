import {
  CylinderGeometry,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';

export const WONDERLAND = {
  id: 'wonderland-landmark',
  coordinates: [-114.0620917082, 51.0476502513] as [number, number],
  heightMetres: 12,
  widthMetres: 7.8,
  depthMetres: 10.7,
  coarseBounds: [-114.06218, 51.047593, -114.062004, 51.047707] as [
    number,
    number,
    number,
    number,
  ],
  basemapFeatureIds: [] as number[],
  sourceUrl:
    'https://jaumeplensa.com/works-and-projects/public-space/wonderland-2012',
  locationSourceUrl: 'https://tiles.openfreemap.org/planet',
  artist: 'Jaume Plensa',
  detail:
    'Independent, simplified map-scale depiction of Wonderland by Jaume Plensa (2012). The artist publishes dimensions of 12 × 7.8 × 10.7 m. This original generic head geometry is not a scan or a reproduction of the artist’s mesh; facial proportions, wire spacing, openings and orientation are approximate. Original model code does not establish clearance of rights in the artwork.',
};

type Profile = [height: number, halfWidth: number, front: number, back: number];
type Segment = [Vector3, Vector3];
const wireRadius = 0.032;
//a deliberately simplified head, drawn from profiles rather than traced sculpture data.
const profile: Profile[] = [
  [0, 2.05, 2.3, -2.45],
  [1.7, 2.08, 2.45, -2.6],
  [2.7, 2.18, 2.8, -3.1],
  [3.45, 2.5, 3.48, -3.75],
  [4.35, 3.06, 3.65, -4.35],
  [5.6, 3.61, 3.69, -4.73],
  [7.1, 3.84, 3.6, -4.78],
  [8.7, 3.73, 3.64, -4.49],
  [10.1, 3.04, 3.16, -3.81],
  [11.15, 1.99, 2.22, -2.62],
  [11.8, 0.84, 0.98, -1.18],
  [12, 0, 0, 0],
];

function dimensions(y: number) {
  const index = Math.max(0, profile.findIndex((row) => row[0] >= y) - 1);
  const a = profile[index];
  const b = profile[index + 1] ?? a;
  const t = Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0] || 1)));
  const blend = (k: number) => a[k] + (b[k] - a[k]) * t;
  return { width: blend(1), front: blend(2), back: blend(3) };
}

function gaussian(value: number, centre: number, width: number) {
  return Math.exp(-(((value - centre) / width) ** 2));
}

function surface(y: number, theta: number) {
  const { width, front, back } = dimensions(y);
  const x = width * Math.sin(theta);
  const face = Math.max(0, Math.cos(theta));
  let z = (front + back) / 2 + ((front - back) / 2) * Math.cos(theta);
  //nose, brow, eye sockets, lips and chin stay part of the same hollow wire surface.
  z +=
    face ** 6 *
    (1.67 * gaussian(x, 0, 0.61) * gaussian(y, 6.15, 1.02) +
      0.23 * gaussian(y, 7.35, 0.25) -
      0.36 *
        (gaussian(x, -1.55, 0.6) + gaussian(x, 1.55, 0.6)) *
        gaussian(y, 7.05, 0.42) +
      0.39 * gaussian(x, 0, 1.35) * gaussian(y, 4.9, 0.28) -
      0.16 * gaussian(x, 0, 1.1) * gaussian(y, 4.63, 0.14) +
      0.28 * gaussian(y, 3.8, 0.45));
  return new Vector3(x, wireRadius + (y / 12) * (12 - wireRadius * 2), z);
}

function angularDistance(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function isEntrance(y: number, theta: number) {
  const distance = Math.min(
    Math.abs(angularDistance(theta, Math.PI / 2)),
    Math.abs(angularDistance(theta, -Math.PI / 2)),
  );
  return (
    distance < 0.43 &&
    y < 2.65 * Math.sqrt(Math.max(0, 1 - (distance / 0.43) ** 2))
  );
}

export function createWonderlandModel(): Group {
  const head = new Group();
  head.name = 'Wonderland';
  const segments: Segment[] = [];
  const arches: Segment[] = [];
  const meridians = 64;
  const heightSteps = 72;
  const rings = 43;
  function segment(y0: number, t0: number, y1: number, t1: number) {
    if (
      isEntrance(y0, t0) ||
      isEntrance(y1, t1) ||
      isEntrance((y0 + y1) / 2, (t0 + t1) / 2)
    )
      return;
    const a = surface(y0, t0);
    const b = surface(y1, t1);
    if (a.distanceToSquared(b) > 0.000001) segments.push([a, b]);
  }
  for (let i = 0; i < meridians; i++) {
    const theta = (i / meridians) * Math.PI * 2;
    for (let j = 0; j < heightSteps; j++)
      segment(
        (j / heightSteps) * 12,
        theta,
        ((j + 1) / heightSteps) * 12,
        theta,
      );
  }
  for (let j = 0; j < rings; j++) {
    const y = (j / rings) * 12;
    for (let i = 0; i < meridians; i++)
      segment(
        y,
        (i / meridians) * Math.PI * 2,
        y,
        ((i + 1) / meridians) * Math.PI * 2,
      );
  }
  for (const side of [-Math.PI / 2, Math.PI / 2]) {
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI;
      const b = ((i + 1) / 30) * Math.PI;
      arches.push([
        surface(2.65 * Math.sin(a), side + 0.43 * Math.cos(a)),
        surface(2.65 * Math.sin(b), side + 0.43 * Math.cos(b)),
      ]);
    }
  }

  //fit the original drawing to the artist's published envelope, without a scan.
  const points = [...segments, ...arches].flat();
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minZ = Math.min(...points.map((p) => p.z));
  const maxZ = Math.max(...points.map((p) => p.z));
  const xScale = (WONDERLAND.widthMetres - wireRadius * 2) / (maxX - minX);
  const zScale = (WONDERLAND.depthMetres - wireRadius * 2) / (maxZ - minZ);
  for (const p of points) {
    p.x *= xScale;
    p.z = (p.z - (minZ + maxZ) / 2) * zScale;
  }
  const wire = new MeshStandardMaterial({
    color: '#e4e5de',
    metalness: 0.14,
    roughness: 0.7,
  });
  const tube = new CylinderGeometry(1, 1, 1, 5, 1, true);
  const pose = new Object3D();
  const up = new Vector3(0, 1, 0);
  function add(name: string, rods: Segment[], radius: number) {
    const mesh = new InstancedMesh(tube, wire, rods.length);
    mesh.name = name;
    for (const [i, [a, b]] of rods.entries()) {
      const direction = b.clone().sub(a);
      pose.position.copy(a).add(b).multiplyScalar(0.5);
      pose.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      pose.scale.set(radius, direction.length(), radius);
      pose.updateMatrix();
      mesh.setMatrixAt(i, pose.matrix);
    }
    mesh.computeBoundingSphere();
    head.add(mesh);
  }
  add('open wire head contours', segments, wireRadius);
  add('two open neck arches', arches, wireRadius * 1.1);
  //a westward map presentation; this is approximate, not surveyed orientation.
  head.rotation.y = -Math.PI / 2;
  head.userData = {
    ...WONDERLAND,
    originalGeometry: true,
    units: 'metres',
    axes: 'x east, y up, z south',
    approximateOrientation: true,
    simplifiedDepiction: true,
    hollow: true,
  };
  head.updateMatrixWorld(true);
  return head;
}
