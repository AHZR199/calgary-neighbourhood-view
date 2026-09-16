import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import terrain from '../../public/data/olympic-park-terrain.json';

const smooth = (n: number) => {
  const t = Math.max(0, Math.min(1, n));
  return t * t * (3 - 2 * t);
};

//the local relief meets the flat city map only at its outer edge.
export function olympicTerrainWeight(x: number, z: number) {
  return (
    smooth((x + 150) / 75) *
    smooth((240 - x) / 85) *
    smooth((z + 400) / 60) *
    smooth((140 - z) / 80)
  );
}

export function olympicGroundHeight(x: number, z: number) {
  const column = Math.max(
    0,
    Math.min(terrain.columns - 1, (x - terrain.xMin) / terrain.step),
  );
  const row = Math.max(
    0,
    Math.min(terrain.rows - 1, (z - terrain.zMin) / terrain.step),
  );
  const c = Math.min(Math.floor(column), terrain.columns - 2);
  const r = Math.min(Math.floor(row), terrain.rows - 2);
  const u = column - c;
  const v = row - r;
  const a = terrain.elevations[r][c];
  const b = terrain.elevations[r][c + 1];
  const cHeight = terrain.elevations[r + 1][c];
  const d = terrain.elevations[r + 1][c + 1];
  //match the rendered triangle, so surfaces resting on the hill do not sink.
  const height =
    u + v <= 1
      ? a + (b - a) * u + (cHeight - a) * v
      : d + (cHeight - d) * (1 - u) + (b - d) * (1 - v);
  return Math.max(0, height - terrain.datumMetres) * olympicTerrainWeight(x, z);
}

export function createOlympicTerrain() {
  const positions: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  const ground = new Color('#a7b493');
  const flat = new Color('#bbc2c4');
  const colour = new Color();
  for (let row = 0; row < terrain.rows; row++) {
    for (let column = 0; column < terrain.columns; column++) {
      const x = terrain.xMin + column * terrain.step;
      const z = terrain.zMin + row * terrain.step;
      const weight = olympicTerrainWeight(x, z);
      positions.push(x, olympicGroundHeight(x, z) + 0.035, z);
      colour.copy(flat).lerp(ground, smooth(weight));
      const shade = 1 + Math.sin(x * 0.035 + z * 0.019) * 0.025 * weight;
      colours.push(
        colour.r * shade,
        colour.g * shade,
        colour.b * shade,
        smooth(weight * 3),
      );
      if (row === terrain.rows - 1 || column === terrain.columns - 1) continue;
      const a = row * terrain.columns + column;
      indices.push(
        a,
        a + terrain.columns,
        a + 1,
        a + 1,
        a + terrain.columns,
        a + terrain.columns + 1,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      transparent: true,
      alphaTest: 0.01,
    }),
  );
  mesh.name = 'lidar hillside';
  mesh.userData.source = terrain.metadata.sourceUrl;
  mesh.userData.edgeTreatment =
    'relief blends into the flat basemap outside the ski-jump site';
  return mesh;
}
