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
  fabricationSourceUrl: 'https://www.heavyexperience.com/wonderland',
  detail:
    'Independent, simplified map-scale depiction of Wonderland by Jaume Plensa (2012). The artist publishes dimensions of 12 × 7.8 × 10.7 m. This original generic head geometry is not a scan or a reproduction of the artist’s mesh; facial proportions, wire spacing, openings and orientation are approximate. Original model code does not establish clearance of rights in the artwork.',
};

type Profile = [height: number, halfWidth: number, front: number, back: number];
type Segment = [Vector3, Vector3];
//the real rods are roughly 18–22 mm across; a small display allowance keeps them readable.
const wireRadius = 0.014;
const height = WONDERLAND.heightMetres;
//an original portrait profile: a long face and tapered jaw, rather than a sphere with a nose.
//dimensions and photographs guide the silhouette; these are not traced or scanned vertices.
const profile: Profile[] = [
  [0, 2.46, 1.56, -2.93],
  [1.05, 2.32, 1.46, -2.79],
  [1.75, 2.22, 1.65, -2.93],
  [2.25, 2.22, 2.69, -3.16],
  [2.85, 2.51, 3.28, -3.56],
  [3.65, 2.89, 3.35, -4.09],
  [4.65, 3.15, 3.27, -4.64],
  [5.8, 3.42, 3.2, -5.03],
  [7.1, 3.65, 3.2, -5.13],
  [8.45, 3.87, 3.37, -4.97],
  [9.55, 3.73, 3.43, -4.52],
  [10.55, 3.2, 3.15, -3.82],
  [11.3, 2.3, 2.51, -2.83],
  [11.8, 1.16, 1.38, -1.49],
  [12, 0, 0.1, 0.1],
];

//monotone tangents avoid rings of sharp creases where the profile measurements meet.
function slope(index: number, field: number) {
  const previous = profile[Math.max(0, index - 1)];
  const current = profile[index];
  const next = profile[Math.min(profile.length - 1, index + 1)];
  const before =
    index > 0
      ? (current[field] - previous[field]) / (current[0] - previous[0])
      : (next[field] - current[field]) / (next[0] - current[0]);
  const after =
    index < profile.length - 1
      ? (next[field] - current[field]) / (next[0] - current[0])
      : before;
  return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
}
const tangents = profile.map((_, index) => [
  0,
  slope(index, 1),
  slope(index, 2),
  slope(index, 3),
]);
function dimensions(y: number) {
  const index = Math.max(0, profile.findIndex((row) => row[0] >= y) - 1);
  const a = profile[index];
  const b = profile[index + 1] ?? a;
  const step = b[0] - a[0] || 1;
  const t = Math.min(1, Math.max(0, (y - a[0]) / step));
  const t2 = t * t;
  const t3 = t2 * t;
  const blend = (field: number) =>
    (2 * t3 - 3 * t2 + 1) * a[field] +
    (t3 - 2 * t2 + t) * step * tangents[index][field] +
    (-2 * t3 + 3 * t2) * b[field] +
    (t3 - t2) * step * tangents[index + 1][field];
  return { width: Math.max(0, blend(1)), front: blend(2), back: blend(3) };
}

function gaussian(value: number, centre: number, width: number) {
  return Math.exp(-(((value - centre) / width) ** 2));
}

function surface(baseY: number, theta: number) {
  const cosine = Math.cos(theta);
  const face = Math.max(0, cosine);
  const unwarpedX = dimensions(baseY).width * Math.sin(theta);
  const eyeContour =
    gaussian(unwarpedX, -1.37, 0.8) + gaussian(unwarpedX, 1.37, 0.8);
  //bend the grid around the features too; horizontal latitude rings erase a face head-on.
  const y = Math.min(
    height,
    Math.max(
      0,
      baseY +
        face ** 4 *
          (0.34 * gaussian(unwarpedX, 0, 0.74) * gaussian(baseY, 5.8, 1) -
            0.42 * eyeContour * gaussian(baseY, 7.14, 0.56) +
            0.13 * eyeContour * gaussian(baseY, 7.92, 0.4) -
            0.15 * gaussian(unwarpedX, 0, 1.3) * gaussian(baseY, 4.4, 0.55)),
    ),
  );
  const { width, front, back } = dimensions(y);
  const centre = (front + back) / 2;
  let x = width * Math.sin(theta);
  x +=
    face ** 4 *
    Math.sign(x) *
    (0.24 * gaussian(Math.abs(x), 1.37, 0.8) * gaussian(y, 7.15, 0.7) -
      0.14 * gaussian(Math.abs(x), 0.65, 0.45) * gaussian(y, 5.85, 0.65));
  //a flatter front keeps the cheeks and forehead from reading like a globe.
  let z =
    centre +
    (cosine >= 0
      ? (front - centre) * cosine ** 0.62
      : (centre - back) * cosine);
  const noseBridge = 0.42 * gaussian(x, 0, 0.43) * gaussian(y, 6.65, 1.08);
  const noseTip = 0.62 * gaussian(x, 0, 0.61) * gaussian(y, 5.67, 0.39);
  const noseWings =
    0.13 *
    (gaussian(x, -0.57, 0.25) + gaussian(x, 0.57, 0.25)) *
    gaussian(y, 5.46, 0.24);
  const eyes =
    -0.27 *
    (gaussian(x, -1.37, 0.74) + gaussian(x, 1.37, 0.74)) *
    gaussian(y, 7.1, 0.38);
  const cheek =
    0.13 *
    (gaussian(x, -1.8, 0.75) + gaussian(x, 1.8, 0.75)) *
    gaussian(y, 5.95, 0.8);
  const brow = 0.09 * gaussian(y, 7.61, 0.3);
  const lips =
    gaussian(x, 0, 1.18) *
    (0.17 * gaussian(y, 4.55, 0.16) +
      0.16 * gaussian(y, 4.21, 0.21) -
      0.1 * gaussian(y, 4.39, 0.075));
  const chin = 0.16 * gaussian(x, 0, 1.22) * gaussian(y, 2.95, 0.52);
  z +=
    face ** 5 *
    (noseBridge + noseTip + noseWings + eyes + cheek + brow + lips + chin);
  //small integrated ears; the body remains one open wire surface.
  const side = gaussian(Math.abs(cosine), 0, 0.2) * gaussian(y, 6.35, 0.85);
  x += Math.sign(x) * 0.15 * side;
  return new Vector3(
    x,
    wireRadius + (y / height) * (height - wireRadius * 2),
    z,
  );
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
    y < 2.55 * Math.sqrt(Math.max(0, 1 - (distance / 0.43) ** 2))
  );
}

export function createWonderlandModel(): Group {
  const head = new Group();
  head.name = 'Wonderland';
  const segments: Segment[] = [];
  const arches: Segment[] = [];
  const meridians = 104;
  const heightSteps = 100;
  const rings = 69;
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
        surface(2.55 * Math.sin(a), side + 0.43 * Math.cos(a)),
        surface(2.55 * Math.sin(b), side + 0.43 * Math.cos(b)),
      ]);
    }
  }

  //slight eyelid and lip contours make the quiet expression legible without solid inserts.
  const expression: Segment[] = [];
  for (const eye of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const eyelidPoint = (t: number) => {
        const x = eye * 1.37 + t * 0.85;
        const y = 7.1 - 0.16 * (1 - t * t);
        return surface(y, Math.asin(x / dimensions(y).width));
      };
      expression.push([eyelidPoint(i / 13 - 1), eyelidPoint((i + 1) / 13 - 1)]);
    }
  }
  for (let i = 0; i < 30; i++) {
    const mouthPoint = (t: number) => {
      const y = 4.39 + 0.045 * (1 - t * t);
      return surface(y, Math.asin((t * 1.15) / dimensions(y).width));
    };
    expression.push([mouthPoint(i / 15 - 1), mouthPoint((i + 1) / 15 - 1)]);
  }

  //fit the original drawing to the artist's published envelope, without a scan.
  const points = [...segments, ...arches, ...expression].flat();
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
    color: '#eeeee7',
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
  add('two open neck arches', arches, wireRadius * 1.45);
  add('closed eyes and gentle mouth contours', expression, wireRadius * 1.2);
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
    renderedWireDiameterMetres: wireRadius * 2,
    photographicReference: WONDERLAND.fabricationSourceUrl,
  };
  head.updateMatrixWorld(true);
  return head;
}
