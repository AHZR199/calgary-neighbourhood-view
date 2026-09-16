import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Color,
  Group,
  InstancedMesh,
  LatheGeometry,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';

export const CALGARY_TOWER = {
  id: 'calgary-tower-landmark',
  coordinates: [-114.06313680360175, 51.04430128061789] as [number, number],
  heightMetres: 190.8,
  basemapFeatureId: 257197932,
  //a small search box for the existing tower extrusion, not a building footprint.
  coarseBounds: [-114.06343, 51.04411, -114.06284, 51.0445] as [
    number,
    number,
    number,
    number,
  ],
  sourceUrl: 'https://www.calgarytower.com/architecture',
  locationSourceUrl: 'https://www.openstreetmap.org/way/25719793',
  locationMethod:
    'Area centroid of the OpenStreetMap tower footprint in the OpenFreeMap snapshot dated 13 September 2026; not a survey.',
  detail:
    'Original architectural illustration. Overall height is published; smaller dimensions and placement are approximate.',
};

const segments = 96;

//the smaller dimensions are visual approximations, not surveyed building data.
export function createCalgaryTowerModel(): Group {
  const tower = new Group();
  tower.name = 'Calgary Tower';
  const concrete = new MeshStandardMaterial({
    color: '#c2beb2',
    roughness: 0.93,
  });
  const soffit = new MeshStandardMaterial({
    color: '#aaa9a3',
    roughness: 0.86,
  });
  const red = new MeshStandardMaterial({
    color: '#ba282d',
    roughness: 0.46,
    metalness: 0.18,
  });
  const redEdge = new MeshStandardMaterial({
    color: '#8d2027',
    roughness: 0.5,
    metalness: 0.12,
  });
  const silver = new MeshStandardMaterial({
    color: '#d9dedc',
    roughness: 0.42,
    metalness: 0.45,
  });
  const dark = new MeshStandardMaterial({
    color: '#333f43',
    roughness: 0.65,
    metalness: 0.2,
  });
  const glass = new MeshStandardMaterial({
    color: '#3c6577',
    roughness: 0.22,
    metalness: 0.55,
  });
  const glassLight = new MeshStandardMaterial({
    color: '#718992',
    roughness: 0.2,
    metalness: 0.48,
  });
  const roof = new MeshStandardMaterial({
    color: '#d9d8ce',
    roughness: 0.6,
    metalness: 0.16,
  });

  function add(
    geometry: BufferGeometry,
    material: Material,
    name: string,
    y = 0,
  ) {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    tower.add(mesh);
    return mesh;
  }
  function cylinder(
    name: string,
    bottom: number,
    top: number,
    y0: number,
    y1: number,
    material: Material,
  ) {
    return add(
      new CylinderGeometry(top, bottom, y1 - y0, segments),
      material,
      name,
      (y0 + y1) / 2,
    );
  }
  function profile(
    name: string,
    points: [number, number][],
    material: Material,
  ) {
    return add(
      new LatheGeometry(
        points.map(([r, y]) => new Vector2(r, y)),
        segments,
      ),
      material,
      name,
    );
  }
  function ring(
    name: string,
    radius: number,
    y: number,
    thickness: number,
    material: Material,
  ) {
    const mesh = add(
      new TorusGeometry(radius, thickness, 5, segments),
      material,
      name,
      y,
    );
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }
  function radialBars(
    name: string,
    count: number,
    radius: number,
    y0: number,
    y1: number,
    width: number,
    depth: number,
    material: Material,
  ) {
    const mesh = new InstancedMesh(
      new BoxGeometry(width, y1 - y0, depth),
      material,
      count,
    );
    const transform = new Object3D();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      transform.position.set(
        Math.sin(angle) * radius,
        (y0 + y1) / 2,
        Math.cos(angle) * radius,
      );
      transform.rotation.y = angle;
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    tower.add(mesh);
    return mesh;
  }
  function radialStruts(
    name: string,
    count: number,
    r0: number,
    y0: number,
    r1: number,
    y1: number,
    width: number,
    material: Material,
  ) {
    const mesh = new InstancedMesh(
      new CylinderGeometry(width, width, 1, 5),
      material,
      count,
    );
    const transform = new Object3D();
    const up = new Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const start = new Vector3(Math.sin(angle) * r0, y0, Math.cos(angle) * r0);
      const end = new Vector3(Math.sin(angle) * r1, y1, Math.cos(angle) * r1);
      transform.position.copy(start).add(end).multiplyScalar(0.5);
      transform.quaternion.setFromUnitVectors(
        up,
        end.clone().sub(start).normalize(),
      );
      transform.scale.set(1, start.distanceTo(end), 1);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    tower.add(mesh);
    return mesh;
  }

  function glazing(
    name: string,
    bottom: number,
    top: number,
    y0: number,
    y1: number,
    tint: string,
  ) {
    const geometry = new CylinderGeometry(
      top,
      bottom,
      y1 - y0,
      64,
      1,
      true,
    ).toNonIndexed();
    const positions = geometry.getAttribute('position');
    const colours: number[] = [];
    for (let face = 0; face < positions.count / 6; face++) {
      const angle = (face / 64) * Math.PI * 2;
      const reflection =
        0.76 + 0.14 * Math.cos(angle - 0.9) + 0.065 * Math.sin(face * 2.71);
      const colour = new Color(tint).multiplyScalar(reflection);
      for (let vertex = 0; vertex < 6; vertex++)
        colours.push(colour.r, colour.g, colour.b);
    }
    geometry.setAttribute(
      'color',
      new BufferAttribute(new Float32Array(colours), 3),
    );
    const material = new MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.45,
    });
    return add(geometry, material, name, (y0 + y1) / 2);
  }

  cylinder('base collar', 7.8, 7.8, 0, 1.2, soffit);
  const shaftProfile: [number, number][] = [];
  for (let y = 0; y <= 144; y += 3)
    shaftProfile.push([7.2 - 2.1 * Math.pow(y / 144, 0.8), y]);
  const shaft = profile('tapered concrete shaft', shaftProfile, concrete);
  //subtle aggregate and pour variation are vertex colours, not image textures.
  const position = shaft.geometry.getAttribute('position');
  const colours: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const variation =
      0.98 + 0.011 * Math.sin(y * 1.7 + i * 2.3) + 0.006 * Math.cos(y * 0.27);
    colours.push(variation, variation, variation);
  }
  shaft.geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(colours), 3),
  );
  concrete.vertexColors = true;

  profile(
    'crown concrete underside',
    [
      [5.1, 139.5],
      [6.2, 140],
      [8, 141],
      [10.5, 142.6],
      [13.2, 144.4],
      [15.4, 145.5],
    ],
    soffit,
  );
  radialStruts('underside ribs', 64, 5.5, 139.9, 15.3, 145.4, 0.075, silver);
  cylinder('crown lower red lip', 15.5, 15.5, 145.4, 145.9, redEdge);
  cylinder('red crown', 15.5, 17.25, 145.9, 153.7, red);
  radialStruts(
    'red crown panel seams',
    96,
    15.57,
    145.9,
    17.31,
    153.7,
    0.027,
    redEdge,
  );
  ring('lower glazing sill', 17.27, 153.7, 0.085, silver);
  glazing('restaurant glazing', 17.25, 17.94, 153.7, 156.8, '#3d535d');
  radialStruts(
    'restaurant window mullions',
    64,
    17.3,
    153.7,
    18,
    156.8,
    0.057,
    silver,
  );
  ring('restaurant window rail', 17.62, 155.25, 0.04, silver);
  cylinder('upper red fascia', 17.96, 18.55, 156.8, 159.6, red);
  radialStruts(
    'upper fascia panel seams',
    96,
    18.01,
    156.8,
    18.6,
    159.6,
    0.027,
    redEdge,
  );
  ring('observation sill', 18.62, 159.6, 0.1, silver);
  glazing('observation glazing', 18.58, 19.18, 159.7, 162.5, '#69818b');
  radialStruts(
    'observation window mullions',
    64,
    18.63,
    159.7,
    19.23,
    162.5,
    0.073,
    silver,
  );
  ring('observation window transom', 18.94, 161.1, 0.05, silver);
  cylinder('crown top coping', 19.25, 19.7, 162.5, 163.15, silver);
  cylinder('roof shadow line', 19.7, 19.7, 163.15, 163.3, dark);
  cylinder('roof rim', 19.8, 19.8, 163.3, 163.65, roof);
  const dome: [number, number][] = [
    [19.6, 163.65],
    [18.9, 164.5],
    [17.6, 165.9],
    [15.8, 167.3],
    [13.5, 168.5],
    [10.8, 169.5],
    [7.6, 170.2],
    [5.4, 170.5],
    [0, 170.5],
  ];
  profile('domed pale roof', dome, roof);
  //the radial roof seams follow the dome instead of cutting through it.
  for (let i = 0; i < dome.length - 2; i++)
    radialStruts(
      `roof seams ${i}`,
      48,
      dome[i][0],
      dome[i][1] + 0.04,
      dome[i + 1][0],
      dome[i + 1][1] + 0.04,
      0.032,
      silver,
    );

  const rooflightFrames = new InstancedMesh(
    new TorusGeometry(0.78, 0.09, 6, 24),
    silver,
    16,
  );
  const rooflightGlass = new InstancedMesh(
    new CylinderGeometry(0.71, 0.71, 0.07, 24),
    glass,
    16,
  );
  const frameTransform = new Object3D();
  const glassTransform = new Object3D();
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const normal = new Vector3(
      Math.sin(angle) * 0.5,
      1,
      Math.cos(angle) * 0.5,
    ).normalize();
    frameTransform.position.set(
      Math.sin(angle) * 12.6,
      168.93,
      Math.cos(angle) * 12.6,
    );
    frameTransform.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
    frameTransform.updateMatrix();
    rooflightFrames.setMatrixAt(i, frameTransform.matrix);
    glassTransform.position
      .copy(frameTransform.position)
      .addScaledVector(normal, 0.015);
    glassTransform.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
    glassTransform.updateMatrix();
    rooflightGlass.setMatrixAt(i, glassTransform.matrix);
  }
  rooflightFrames.name = 'circular rooflight frames';
  rooflightGlass.name = 'circular rooflights';
  tower.add(rooflightFrames, rooflightGlass);

  cylinder('central rooftop drum', 5.45, 6.15, 170.2, 174.4, roof);
  radialStruts('central drum seams', 48, 5.5, 170.4, 6.2, 174.35, 0.03, silver);
  cylinder('central drum cap', 6.35, 5.7, 174.4, 174.75, silver);
  cylinder('mast plinth', 1.6, 1.1, 174.75, 178.2, roof);
  cylinder('mast', 0.68, 0.31, 178.2, 188.0, silver);
  radialStruts('mast supports', 8, 2.1, 175, 0.55, 184.2, 0.065, silver);
  ring('mast service collar', 0.8, 183.0, 0.085, silver);
  cylinder('cauldron base', 0.6, 2.0, 187.7, 189.2, dark);
  cylinder('cauldron rim', 2.0, 2.0, 189.2, 189.7, silver);
  cylinder('cauldron burner', 1.8, 1.8, 189.7, 189.85, dark);
  radialBars(
    'cauldron rim supports',
    12,
    1.75,
    189.85,
    CALGARY_TOWER.heightMetres,
    0.06,
    0.06,
    silver,
  );

  //a small glazed projection is visible on the north side; its dimensions are illustrative.
  const balcony = add(
    new BoxGeometry(10.97, 0.2, 1.37),
    glassLight,
    'glass observation floor',
    159.75,
  );
  balcony.position.z = -18.95;
  const balconyFace = add(
    new BoxGeometry(10.97, 2.75, 0.08),
    glass,
    'glass floor outer window',
    161.15,
  );
  balconyFace.position.z = -19.6;
  const balconyPosts = new InstancedMesh(
    new BoxGeometry(0.11, 2.8, 0.14),
    silver,
    10,
  );
  for (let i = 0; i < 10; i++)
    balconyPosts.setMatrixAt(
      i,
      new Matrix4().makeTranslation(-5.43 + (i * 10.86) / 9, 161.15, -19.65),
    );
  balconyPosts.name = 'glass floor window frames';
  tower.add(balconyPosts);
  tower.updateMatrixWorld(true);
  tower.userData = {
    ...CALGARY_TOWER,
    originalGeometry: true,
    units: 'metres',
  };
  return tower;
}

export function disposeCalgaryTowerModel(tower: Group) {
  const geometry = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  tower.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometry.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      materials.add(material);
    if (object instanceof InstancedMesh) object.dispose();
  });
  for (const item of geometry) item.dispose();
  for (const item of materials) item.dispose();
  tower.clear();
}
