import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';

export const TELUS_SKY = {
  id: 'telus-sky-landmark',
  coordinates: [-114.0635609622, 51.0467782508] as [number, number],
  heightMetres: 222.3,
  coarseBounds: [-114.06398535, 51.04659128, -114.06311095, 51.0470196] as [
    number,
    number,
    number,
    number,
  ],
  basemapFeatureIds: [5002940612],
  sourceUrl: 'https://big.dk/projects/telus-sky-4861',
  heightSourceUrl: 'https://custommetal.ab.ca/project/telus-sky-exterior/',
  locationSourceUrl: 'https://tiles.openfreemap.org/planet',
  detail:
    'Original architectural illustration of TELUS Sky, with the published 222.3 m height and mapped location. Stepped floorplates, balconies and facade details are approximate; the Northern Lights artwork is not reproduced.',
};

type Point = [number, number];
type Beam = { a: Vector3; b: Vector3; width: number; depth: number };
const bays = 18;
const bayWidth = 57.6 / bays;
const angle = -0.029;

//a broad office plate gradually loses opposite corners, leaving a diagonal slab.
//the small rectilinear steps are an illustration, not surveyed balcony outlines.
function floorPlan(floor: number) {
  const progress = Math.min(1, Math.max(0, (floor - 9) / 38));
  const t = progress * progress * (3 - 2 * progress);
  const rows = Array.from({ length: bays }, (_, i) => {
    const x = -28.8 + (i + 0.5) * bayWidth;
    const middle = x * 0.48 * t;
    const half = 17 - 9.4 * t;
    const snap = (n: number) => (floor >= 24 ? Math.round(n / 0.75) * 0.75 : n);
    return {
      x0: -28.8 + i * bayWidth,
      x1: -28.8 + (i + 1) * bayWidth,
      north: Math.max(-17, snap(middle - half)),
      south: Math.min(17, snap(middle + half)),
    };
  });
  const perimeter: Point[] = [];
  for (const row of rows)
    perimeter.push([row.x0, row.north], [row.x1, row.north]);
  for (const row of rows.toReversed())
    perimeter.push([row.x1, row.south], [row.x0, row.south]);
  return {
    rows,
    perimeter: perimeter.filter(
      (p, i, all) => !i || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1],
    ),
  };
}

function point(x: number, y: number, z: number) {
  return new Vector3(
    x * Math.cos(angle) + z * Math.sin(angle),
    y,
    -x * Math.sin(angle) + z * Math.cos(angle) + 1.2,
  );
}

function addQuad(
  target: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
) {
  for (const p of [a, b, c, a, c, d]) target.push(p.x, p.y, p.z);
}

function shape(positions: number[], colours?: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (colours)
    geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createTelusSkyModel(): Group {
  const tower = new Group();
  tower.name = 'TELUS Sky';
  const glass = new MeshStandardMaterial({
    color: '#52666c',
    metalness: 0.36,
    roughness: 0.3,
    vertexColors: true,
    side: DoubleSide,
  });
  const frame = new MeshStandardMaterial({
    color: '#dce2df',
    metalness: 0.18,
    roughness: 0.65,
  });
  const graphite = new MeshStandardMaterial({
    color: '#30494f',
    metalness: 0.3,
    roughness: 0.5,
  });
  const roof = new MeshStandardMaterial({
    color: '#a0aaa8',
    roughness: 0.84,
    side: DoubleSide,
  });
  const facade: number[] = [];
  const colours: number[] = [];
  const terraces: number[] = [];
  const trim: Beam[] = [];
  const mullions: Beam[] = [];
  const rails: Beam[] = [];
  const colour = new Color();
  const floors = 60;
  const lobbyHeight = 7;
  const roofY = 219.3;
  const floorHeight = (roofY - lobbyHeight) / (floors - 1);

  for (let floor = 0; floor < floors; floor++) {
    const y0 = floor ? lobbyHeight + (floor - 1) * floorHeight : 0;
    const y1 = floor ? lobbyHeight + floor * floorHeight : lobbyHeight;
    const { rows, perimeter } = floorPlan(floor);
    const residential = floor >= 29;
    const inset = residential ? 1 : 0;
    for (const row of rows) {
      addQuad(
        terraces,
        point(row.x0, y1, row.north),
        point(row.x0, y1, row.south),
        point(row.x1, y1, row.south),
        point(row.x1, y1, row.north),
      );
    }
    for (let i = 0; i < perimeter.length; i++) {
      const [ax, az] = perimeter[i];
      const [bx, bz] = perimeter[(i + 1) % perimeter.length];
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.001) continue;
      const nx = -(bz - az) / length;
      const nz = (bx - ax) / length;
      const a = point(ax + nx * inset, y0 + 0.23, az + nz * inset);
      const b = point(bx + nx * inset, y0 + 0.23, bz + nz * inset);
      const c = point(bx + nx * inset, y1 - 0.24, bz + nz * inset);
      const d = point(ax + nx * inset, y1 - 0.24, az + nz * inset);
      addQuad(facade, a, b, c, d);
      colour.setHSL(
        0.53,
        0.07 + ((i + floor) % 3) * 0.016,
        0.73 + ((floor * 7 + i * 3) % 11) * 0.018,
      );
      for (let k = 0; k < 6; k++) colours.push(colour.r, colour.g, colour.b);
      trim.push({
        a: point(ax, y1 - 0.18, az),
        b: point(bx, y1 - 0.18, bz),
        width: residential ? 0.43 : 0.18,
        depth: residential ? 0.48 : 0.21,
      });
      trim.push({
        a: point(ax, y0 + 0.18, az),
        b: point(ax, y1 - 0.18, az),
        width: residential ? 0.39 : 0.15,
        depth: residential ? 0.43 : 0.16,
      });
      const subdivisions = Math.ceil(length / 1.65);
      for (let panel = 1; panel < subdivisions; panel++) {
        const u = panel / subdivisions;
        mullions.push({
          a: a.clone().lerp(b, u),
          b: d.clone().lerp(c, u),
          width: 0.075,
          depth: 0.085,
        });
      }
      if (residential && length > 2) {
        rails.push({
          a: point(ax, y0 + 1.12, az),
          b: point(bx, y0 + 1.12, bz),
          width: 0.065,
          depth: 0.09,
        });
      }
    }
  }

  function mesh(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
  ) {
    const object = new Mesh(geometry, material);
    object.name = name;
    tower.add(object);
  }
  function beams(
    name: string,
    segments: Beam[],
    material: MeshStandardMaterial,
  ) {
    const object = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      material,
      segments.length,
    );
    object.name = name;
    const pose = new Object3D();
    const up = new Vector3(0, 1, 0);
    for (const [i, segment] of segments.entries()) {
      const direction = segment.b.clone().sub(segment.a);
      pose.position.copy(segment.a).add(segment.b).multiplyScalar(0.5);
      pose.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      pose.scale.set(segment.width, direction.length(), segment.depth);
      pose.updateMatrix();
      object.setMatrixAt(i, pose.matrix);
    }
    object.computeBoundingSphere();
    tower.add(object);
  }

  mesh(
    'office glazing and recessed residential bays',
    shape(facade, colours),
    glass,
  );
  mesh('stepped floorplates and balcony terraces', shape(terraces), roof);
  beams('pale pixel facade frames', trim, frame);
  beams('fine curtain wall mullions', mullions, graphite);
  beams('residential balcony rails', rails, graphite);

  const crown = floorPlan(floors - 1);
  const crownFaces: number[] = [];
  const crownTop: number[] = [];
  for (const row of crown.rows) {
    addQuad(
      crownTop,
      point(row.x0, TELUS_SKY.heightMetres, row.north),
      point(row.x0, TELUS_SKY.heightMetres, row.south),
      point(row.x1, TELUS_SKY.heightMetres, row.south),
      point(row.x1, TELUS_SKY.heightMetres, row.north),
    );
  }
  for (let i = 0; i < crown.perimeter.length; i++) {
    const [ax, az] = crown.perimeter[i];
    const [bx, bz] = crown.perimeter[(i + 1) % crown.perimeter.length];
    addQuad(
      crownFaces,
      point(ax, roofY, az),
      point(bx, roofY, bz),
      point(bx, TELUS_SKY.heightMetres, bz),
      point(ax, TELUS_SKY.heightMetres, az),
    );
  }
  mesh('stepped mechanical crown', shape(crownFaces), graphite);
  mesh('diagonal roof cap', shape(crownTop), roof);

  const base = new Mesh(new BoxGeometry(57.6, 0.24, 34), roof);
  base.name = 'street level threshold';
  base.position.copy(point(0, 0.12, 0));
  base.rotation.y = angle;
  tower.add(base);

  const northLink = new Mesh(new BoxGeometry(7.5, 4.2, 9.5), graphite);
  northLink.name = 'north podium connection';
  northLink.position.copy(point(0, 8, -21.5));
  northLink.rotation.y = angle;
  tower.add(northLink);

  tower.userData = {
    ...TELUS_SKY,
    originalGeometry: true,
    units: 'metres',
    axes: 'x east, y up, z south',
    architecturalDesign: 'BIG with DIALOG',
    approximateFloorplates: true,
  };
  tower.updateMatrixWorld(true);
  return tower;
}
