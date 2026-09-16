import { MercatorCoordinate, type CustomLayerInterface } from 'maplibre-gl';
import {
  Camera,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  CALGARY_TOWER,
  createCalgaryTowerModel,
  disposeCalgaryTowerModel,
} from '@/lib/atlas/calgary-tower-model';
import { BOW, createBowModel } from '@/lib/atlas/bow-model';
import {
  SADDLEDOME,
  createSaddledomeModel,
} from '@/lib/atlas/saddledome-model';
import {
  PEACE_BRIDGE,
  createPeaceBridgeModel,
} from '@/lib/atlas/peace-bridge-model';

import { TELUS_SKY, createTelusSkyModel } from '@/lib/atlas/telus-sky-model';
import {
  WONDERLAND,
  createWonderlandModel,
} from '@/lib/atlas/wonderland-model';
import {
  CENTRAL_LIBRARY,
  createCentralLibraryModel,
} from '@/lib/atlas/central-library-model';
import { CITY_HALL, createCityHallModel } from '@/lib/atlas/city-hall-model';
import {
  OLYMPIC_PARK,
  createOlympicParkModel,
} from '@/lib/atlas/olympic-park-model';
import type { LandmarkKey } from '@/lib/atlas/landmarks';

export const LANDMARK_LAYER_ID = 'calgary-landmarks';
export const LANDMARKS = {
  tower: { ...CALGARY_TOWER, zoom: 16.45, bearing: -18, pitch: 58 },
  bow: { ...BOW, zoom: 16.1, bearing: 25, pitch: 58 },
  saddledome: { ...SADDLEDOME, zoom: 17.05, bearing: -32, pitch: 54 },
  peace: { ...PEACE_BRIDGE, zoom: 17.65, bearing: 25, pitch: 55 },
  wonderland: { ...WONDERLAND, zoom: 20, bearing: 0, pitch: 62 },
  sky: { ...TELUS_SKY, zoom: 16.25, bearing: 40, pitch: 58 },
  library: { ...CENTRAL_LIBRARY, zoom: 17.3, bearing: -60, pitch: 57 },
  hall: { ...CITY_HALL, zoom: 17.25, bearing: 65, pitch: 57 },
  olympic: { ...OLYMPIC_PARK, zoom: 16.45, bearing: -140, pitch: 58 },
} satisfies Record<
  LandmarkKey,
  {
    coordinates: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
    [key: string]: unknown;
  }
>;

export const REPLACED_BUILDING_IDS = [
  CALGARY_TOWER.basemapFeatureId,
  ...BOW.basemapFeatureIds,
  ...PEACE_BRIDGE.basemapFeatureIds,
  ...TELUS_SKY.basemapFeatureIds,
  ...CENTRAL_LIBRARY.basemapFeatureIds,
  ...CITY_HALL.basemapFeatureIds,
];

export function createCalgaryLandmarksLayer(): CustomLayerInterface {
  let renderer: WebGLRenderer | undefined;
  let scene: Scene | undefined;
  let mapZoom = () => 0;
  const models: Group[] = [];
  const camera = new Camera();
  const origin = MercatorCoordinate.fromLngLat(CALGARY_TOWER.coordinates, 0);
  const metre = origin.meterInMercatorCoordinateUnits();
  const transform = new Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new Vector3(metre, -metre, metre))
    .multiply(new Matrix4().makeRotationX(Math.PI / 2));
  const projection = new Matrix4();

  function place(model: Group, coordinates: [number, number], altitude = 0) {
    const point = MercatorCoordinate.fromLngLat(coordinates, altitude);
    const scale = point.meterInMercatorCoordinateUnits() / metre;
    model.scale.multiplyScalar(scale);
    model.position.set(
      (point.x - origin.x) / metre,
      point.z / metre,
      (point.y - origin.y) / metre,
    );
    models.push(model);
    scene!.add(model);
  }

  return {
    id: LANDMARK_LAYER_ID,
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl) {
      scene = new Scene();
      mapZoom = () => map.getZoom();
      place(createCalgaryTowerModel(), CALGARY_TOWER.coordinates);
      place(createBowModel(), BOW.coordinates);
      place(createSaddledomeModel(), SADDLEDOME.coordinates);
      place(
        createPeaceBridgeModel(),
        PEACE_BRIDGE.coordinates,
        PEACE_BRIDGE.altitudeMetres,
      );
      place(createTelusSkyModel(), TELUS_SKY.coordinates);
      place(createWonderlandModel(), WONDERLAND.coordinates);
      place(createCentralLibraryModel(), CENTRAL_LIBRARY.coordinates);
      place(createCityHallModel(), CITY_HALL.coordinates);
      place(createOlympicParkModel(), OLYMPIC_PARK.coordinates);
      scene.add(new HemisphereLight('#e6f1ff', '#929490', 2.15));
      const sun = new DirectionalLight('#fff3df', 2.35);
      sun.position.set(-150, 250, 180);
      scene.add(sun);
      const fill = new DirectionalLight('#c6e1f1', 0.6);
      fill.position.set(130, 80, -100);
      scene.add(fill);
      renderer = new WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      if (!renderer || !scene || mapZoom() < 12) return;
      camera.projectionMatrix
        .copy(projection.fromArray(args.defaultProjectionData.mainMatrix))
        .multiply(transform);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      renderer.resetState();
      renderer.render(scene, camera);
      renderer.resetState();
    },
    onRemove() {
      for (const model of models) disposeCalgaryTowerModel(model);
      models.length = 0;
      scene?.clear();
      //the renderer shares the map's context and never starts an animation loop.
      renderer?.dispose();
      renderer = undefined;
      scene = undefined;
    },
  };
}
