'use client';
import { useEffect, useRef, useState } from 'react';
import * as ml from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { RefreshCw } from 'lucide-react';
import type { AtlasData, Community, Layer, Property } from '@/lib/atlas/data';
import { isLandmarkKey, type LandmarkKey } from '@/lib/atlas/landmarks';
import { buildingLookupPoint } from '@/lib/atlas/map-selection';
import './map-property.css';
import {
  MapPropertyDialog,
  type MapPropertyChoices,
} from './map-property-dialog';
import {
  TRANSIT_COLOURS,
  GREEN_LINE_MAP_AVAILABLE,
  type TransitMapLayers,
  type TransitMapStatus,
} from '@/lib/atlas/map-overlays';
import 'maplibre-gl/dist/maplibre-gl.css';
ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
export type Overlay =
  'none' | 'development' | 'transit' | 'parks' | 'flood' | 'hazard' | 'noise';
interface Props {
  active: boolean;
  basemap: 'atlas' | 'aerial';
  overlay: Overlay;
  transitLayers: TransitMapLayers;
  onTransitStatus: (status: TransitMapStatus) => void;
  mapFocused: boolean;
  detailsMode: 'compact' | 'preview' | 'full';
  landmark: LandmarkKey | null;
  data: AtlasData | null;
  community: Community | undefined;
  property: Property | null;
  layer: Layer;
  is3d: boolean;
  action: { type: string; id: number };
  onCommunity: (code: string) => void;
  onProperty: (roll: string) => void;
  onPropertyRecord: (property: Property) => void;
  onSearch: () => void;
  onReady: () => void;
}
const withoutQuadrants = (
  communities: AtlasData['communities'] | undefined,
) => ({
  type: 'FeatureCollection' as const,
  features:
    communities?.features.filter((f) => f.properties.class !== 'Quadrant') ??
    [],
});
const onlyQuadrants = (communities: AtlasData['communities'] | undefined) => ({
  type: 'FeatureCollection' as const,
  features:
    communities?.features.filter((f) => f.properties.class === 'Quadrant') ??
    [],
});
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
const cityTransitAttribution =
  'Calgary Transit / City of Calgary · <a href="https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/">Open Government Licence – City of Calgary</a>';

function cameraPadding(
  map: ml.Map,
  desired: Required<ml.PaddingOptions>,
  preview = false,
) {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const mobile = preview && compactMap(map);
  const horizontal = desired.left + desired.right;
  const vertical = desired.top + desired.bottom;
  const xScale = Math.min(
    1,
    Math.max(0, width - Math.min(mobile ? 120 : 240, width / 2)) /
      Math.max(1, horizontal),
  );
  const yScale = Math.min(
    1,
    Math.max(0, height - Math.min(mobile ? 80 : 200, height / 2)) /
      Math.max(1, vertical),
  );
  return {
    left: desired.left * xScale,
    right: desired.right * xScale,
    top: desired.top * yScale,
    bottom: desired.bottom * yScale,
  };
}

function compactMap(map: ml.Map) {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  return width <= 760 || (width <= 960 && height <= 500);
}

function mobileMapPadding(
  map: ml.Map,
  detailsMode: Props['detailsMode'],
  landmark = false,
) {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const short = width <= 960 && height <= 500 && width > height;
  const app = map.getContainer().closest('.atlas-app');
  const header = app?.querySelector('.atlas-header');
  const nav = app?.querySelector('.header-tabs');
  const safeTop = header
    ? Number.parseFloat(getComputedStyle(header).paddingTop) || 0
    : 0;
  const navHeight = nav
    ? Number.parseFloat(getComputedStyle(nav).height) || (short ? 56 : 62)
    : short
      ? 56
      : 62;
  const preview = detailsMode === 'preview';
  //use the target sheet dimensions, not its height while it is animating.
  if (short && preview)
    return {
      top: safeTop + 110,
      bottom: navHeight + 20,
      left: 24,
      right: Math.min(width * 0.44, 340) + 28,
    };
  if (preview)
    return {
      top: safeTop + 118,
      bottom: navHeight + Math.min(420, height * 0.42) + 26,
      left: 24,
      right: 24,
    };
  return {
    top: safeTop + (short ? 110 : 174),
    bottom:
      (short ? 120 : landmark ? 265 : 205) + navHeight - (short ? 56 : 62),
    left: 24,
    right: short ? 90 : 62,
  };
}

function placeCameraPadding(
  map: ml.Map,
  selection: Pick<Props, 'detailsMode' | 'property' | 'landmark'>,
) {
  const tall =
    selection.landmark &&
    ['tower', 'bow', 'sky', 'olympic'].includes(selection.landmark);
  return cameraPadding(
    map,
    compactMap(map)
      ? mobileMapPadding(map, selection.detailsMode, !!selection.landmark)
      : selection.landmark
        ? { top: tall ? 340 : 180, bottom: 40, left: 40, right: 430 }
        : selection.property
          ? { top: 90, bottom: 90, left: 40, right: 420 }
          : { top: 140, bottom: 130, left: 110, right: 460 },
    selection.detailsMode === 'preview',
  );
}

function updateCameraPadding(
  map: ml.Map,
  selection: Pick<Props, 'detailsMode' | 'property' | 'landmark'>,
  animate = true,
) {
  const padding = placeCameraPadding(map, selection);
  const previous = map.getPadding();
  if (
    (Object.keys(padding) as (keyof typeof padding)[]).every(
      (side) => Math.abs(padding[side] - (previous[side] ?? 0)) < 0.5,
    )
  )
    return;
  map.easeTo({
    padding,
    duration:
      animate && !matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 220
        : 0,
  });
}

function focusSelectedPlace(
  map: ml.Map,
  selection: Pick<Props, 'community' | 'property' | 'is3d' | 'detailsMode'>,
  resetOrientation = false,
  animate = true,
) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const padding = placeCameraPadding(map, { ...selection, landmark: null });
  const orientation = resetOrientation
    ? { bearing: -24, pitch: selection.is3d ? 57 : 0 }
    : {};
  if (selection.property)
    map.flyTo({
      ...orientation,
      center: [selection.property.longitude, selection.property.latitude],
      zoom: 16.8,
      padding,
      duration: reduced || !animate ? 0 : 1400,
    });
  else if (selection.community)
    map.fitBounds(selection.community.bounds, {
      ...orientation,
      padding,
      maxZoom: 14.7,
      duration: reduced || !animate ? 0 : 1300,
    });
}

function focusLandmark(
  map: ml.Map,
  key: LandmarkKey,
  landmark: {
    coordinates: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  },
  detailsMode: Props['detailsMode'],
  animate = true,
) {
  const mobile = compactMap(map);
  map.easeTo({
    center: landmark.coordinates,
    zoom: landmark.zoom - (mobile ? 0.6 : 0),
    pitch: landmark.pitch,
    bearing: landmark.bearing,
    padding: placeCameraPadding(map, {
      detailsMode,
      landmark: key,
      property: null,
    }),
    duration:
      !animate || matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 1100,
  });
}

function fitGreenLineRoute(
  map: ml.Map,
  data: FeatureCollection,
  detailsMode: Props['detailsMode'],
) {
  const bounds = new ml.LngLatBounds();
  for (const feature of data.features) {
    const geometry = feature.geometry;
    const points =
      geometry.type === 'Point'
        ? [geometry.coordinates]
        : geometry.type === 'LineString'
          ? geometry.coordinates
          : [];
    for (const point of points) {
      if (Number.isFinite(point[0]) && Number.isFinite(point[1]))
        bounds.extend([point[0], point[1]]);
    }
  }
  if (bounds.isEmpty()) return;
  const desktop = !compactMap(map);
  map.fitBounds(bounds, {
    padding: cameraPadding(
      map,
      desktop
        ? { top: 100, bottom: 140, left: 35, right: 410 }
        : mobileMapPadding(map, detailsMode),
      detailsMode === 'preview',
    ),
    bearing: 0,
    maxZoom: 13,
    duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900,
  });
}

export default function CityMap(props: Props) {
  const { transitLayers, onTransitStatus } = props;
  const communities = props.data?.communities;
  const properties = props.data?.properties;
  const crime = props.data?.crime;
  const container = useRef<HTMLDivElement>(null),
    map = useRef<ml.Map | null>(null),
    cameraInitialized = useRef(false),
    attributionPresented = useRef(false),
    framedDetailsMode = useRef<Props['detailsMode'] | null>(null),
    current = useRef(props),
    activePopup = useRef<ml.Popup | null>(null),
    propertyRequest = useRef<AbortController | null>(null),
    transitCache = useRef(new Map<string, FeatureCollection>());
  useEffect(() => {
    current.current = props;
  });
  const [propertyChoices, setPropertyChoices] =
    useState<MapPropertyChoices | null>(null);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    loadedSources.current.clear();
    cameraInitialized.current = false;
    framedDetailsMode.current = null;
    let disposed = false;
    let m: ml.Map | undefined;
    const start = async () => {
      try {
        const response = await fetch(
          'https://tiles.openfreemap.org/styles/positron',
          { signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) throw Error('Map unavailable');
        const style = (await response.json()) as ml.StyleSpecification;
        const fontUrl = new URL(
          '/fonts/lil-grotesk/LilGrotesk-Variable.woff2',
          window.location.origin,
        ).href;
        const boldFontUrl = new URL(
          '/fonts/lil-grotesk/LilGrotesk-Bold.woff2',
          window.location.origin,
        ).href;
        // keep the provider keys so its glyphs still work if a local font fails
        style['font-faces'] = {
          ...style['font-faces'],
          'Noto Sans Regular': fontUrl,
          'Noto Sans Italic': fontUrl,
          'Noto Sans Bold': boldFontUrl,
        };
        style.layers = style.layers.map((l) => {
          if (l.type === 'background')
            l.paint = { ...l.paint, 'background-color': '#eaf0f4' };
          if (l.id === 'water' && l.type === 'fill')
            l.paint = { ...l.paint, 'fill-color': '#a5cadf' };
          if (
            l.type === 'fill' &&
            /park|landcover_grass|landuse_residential/.test(l.id)
          )
            l.paint = {
              ...l.paint,
              'fill-color': /park|grass/.test(l.id) ? '#d4e1df' : '#e7edf0',
            };
          if (l.type === 'symbol' && l.paint?.['text-color'])
            l.paint = {
              ...l.paint,
              'text-color': '#576d7d',
              'text-halo-color': '#f6f9fc',
              'text-halo-width': 1.4,
            };
          if (l.type === 'symbol' && l.id.startsWith('highway-name'))
            l.layout = {
              ...l.layout,
              'symbol-spacing': 400,
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'text-pitch-alignment': 'map',
            };
          return l;
        });
        if (disposed) return;
        m = new ml.Map({
          container: container.current!,
          style,
          center: [-114.079, 51.052],
          zoom: 14.15,
          pitch: 57,
          bearing: -24,
          maxZoom: 20,
          maxPitch: 70,
          minZoom: 9,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          maxBounds: [
            [-114.7, 50.6],
            [-113.4, 51.5],
          ],
          renderWorldCopies: false,
        });
        map.current = m;
        m.addControl(
          new ml.AttributionControl({ compact: true }),
          'bottom-right',
        );
        m.on('error', (e) => {
          if ('sourceId' in e && typeof e.sourceId === 'string')
            loadedSources.current.delete(e.sourceId);
          if (/webgl|context lost/i.test(e.error.message)) setFailed(true);
        });
        m.on('load', () => {
          if (!m || disposed) return;
          m.setLight({
            anchor: 'viewport',
            color: '#f8fbff',
            intensity: 0.48,
            position: [1.5, 210, 38],
          });
          const firstSymbol = m
            .getStyle()
            .layers.find((l) => l.type === 'symbol')?.id;
          m.addSource('aerial', {
            type: 'raster',
            tiles: [
              'https://tiles.arcgis.com/tiles/AVP60cs0Q9PEA8rH/arcgis/rest/services/Calgary_Orthophoto_Web_2025/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            minzoom: 2,
            maxzoom: 23,
            attribution:
              '<a href="https://maps.calgary.ca/CalgaryImagery/" target="_blank" rel="noreferrer">© The City of Calgary, 2025</a>',
          });
          m.addLayer(
            {
              id: 'aerial-base',
              source: 'aerial',
              type: 'raster',
              layout: { visibility: 'none' },
              paint: {
                'raster-saturation': -0.14,
                'raster-contrast': 0.05,
                'raster-fade-duration': 400,
              },
            },
            firstSymbol,
          );
          m.addSource('communities', {
            type: 'geojson',
            data: withoutQuadrants(current.current.data?.communities),
            promoteId: 'comm_code',
          });
          m.addSource('quadrants', {
            type: 'geojson',
            data: onlyQuadrants(current.current.data?.communities),
          });
          m.addLayer(
            {
              id: 'quadrant-fill',
              source: 'quadrants',
              type: 'fill',
              filter: ['==', ['get', 'comm_code'], ''],
              paint: { 'fill-color': '#789cb8', 'fill-opacity': 0.08 },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'quadrant-outline',
              source: 'quadrants',
              type: 'line',
              filter: ['==', ['get', 'comm_code'], ''],
              paint: {
                'line-color': '#6286a2',
                'line-width': 2.5,
                'line-dasharray': [4, 2],
              },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'community-wash',
              source: 'communities',
              type: 'fill',
              paint: {
                'fill-color': '#789cb8',
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  0.14,
                  0.012,
                ],
              },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'community-boundaries',
              source: 'communities',
              type: 'line',
              paint: {
                'line-color': '#567e9b',
                'line-width': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  2.4,
                  0.65,
                ],
                'line-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  0.95,
                  0.22,
                ],
              },
            },
            firstSymbol,
          );
          m.addLayer({
            id: 'atlas-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': '#f1f6fa',
              'fill-extrusion-height': [
                'coalesce',
                ['get', 'render_height'],
                6,
              ],
              'fill-extrusion-base': [
                'coalesce',
                ['get', 'render_min_height'],
                0,
              ],
              'fill-extrusion-opacity': 1,
            },
          });
          m.addSource('properties', { type: 'geojson', data: empty });
          void import('./calgary-landmarks')
            .then(
              async ({
                createCalgaryLandmarksLayer,
                LANDMARK_LAYER_ID,
                REPLACED_BUILDING_IDS,
              }) => {
                if (!m || disposed) return;
                try {
                  const response = await fetch(
                    '/data/library-building-restore.geojson',
                    {
                      signal: AbortSignal.timeout(10000),
                    },
                  );
                  if (!response.ok) throw Error('Building context unavailable');
                  const context = (await response.json()) as FeatureCollection;
                  if (disposed || !m) return;
                  //the library shares a tile id with another building; restore it first.
                  m.addSource('landmark-building-context', {
                    type: 'geojson',
                    data: context,
                  });
                  m.addLayer({
                    id: 'landmark-building-context',
                    source: 'landmark-building-context',
                    type: 'fill-extrusion',
                    minzoom: 12,
                    paint: {
                      'fill-extrusion-color':
                        current.current.basemap === 'aerial'
                          ? '#e8e8db'
                          : '#f1f6fa',
                      'fill-extrusion-height': ['get', 'render_height'],
                      'fill-extrusion-base': ['get', 'render_min_height'],
                      'fill-extrusion-opacity': 1,
                    },
                  });
                  m.moveLayer('landmark-building-context', 'property-dots');
                  m.addLayer(createCalgaryLandmarksLayer(), 'property-dots');
                  m.setFilter('atlas-buildings', [
                    '!',
                    ['in', ['id'], ['literal', REPLACED_BUILDING_IDS]],
                  ]);
                  m.triggerRepaint();
                } catch {
                  if (disposed || !m) return;
                  if (m.getLayer('landmark-building-context'))
                    m.removeLayer('landmark-building-context');
                  if (m.getSource('landmark-building-context'))
                    m.removeSource('landmark-building-context');
                  if (m.getLayer(LANDMARK_LAYER_ID))
                    m.removeLayer(LANDMARK_LAYER_ID);
                  m.setFilter('atlas-buildings', null);
                }
              },
            )
            .catch(() => {});
          m.addLayer({
            id: 'property-parcels',
            source: 'properties',
            type: 'fill',
            paint: { 'fill-color': '#87acc7', 'fill-opacity': 0.14 },
          });
          m.addLayer({
            id: 'property-outlines',
            source: 'properties',
            type: 'line',
            paint: {
              'line-color': '#789cb8',
              'line-width': 1.2,
              'line-opacity': 0.55,
            },
          });
          m.addSource('property-points', { type: 'geojson', data: empty });
          m.addLayer({
            id: 'property-dots',
            source: 'property-points',
            type: 'circle',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                12,
                3,
                17,
                7,
              ],
              'circle-color': '#789cb8',
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 2,
              'circle-opacity': 0.95,
            },
          });
          m.addLayer({
            id: 'property-values',
            source: 'property-points',
            type: 'symbol',
            minzoom: 16,
            layout: {
              'text-field': ['get', 'price'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 12,
              'text-offset': [0, 1.6],
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#315d7a',
              'text-halo-color': '#fff',
              'text-halo-width': 2,
            },
          });
          m.addSource('selected-property', { type: 'geojson', data: empty });
          m.addLayer({
            id: 'selected-property-ring',
            source: 'selected-property',
            type: 'circle',
            paint: {
              'circle-color': '#fff',
              'circle-radius': 14,
              'circle-opacity': 0.95,
              'circle-stroke-color': '#789cb8',
              'circle-stroke-width': 1.5,
            },
          });
          m.addLayer({
            id: 'selected-property-dot',
            source: 'selected-property',
            type: 'circle',
            paint: { 'circle-color': '#789cb8', 'circle-radius': 7 },
          });
          m.addSource('water-mains', {
            type: 'geojson',
            data: empty,
          });
          m.addLayer({
            id: 'water-mains',
            source: 'water-mains',
            type: 'line',
            layout: { visibility: 'none' },
            paint: {
              'line-color': [
                'match',
                ['get', 'material'],
                'CI',
                '#bb7850',
                'PVC',
                '#478e96',
                'PVCG',
                '#478e96',
                'CU',
                '#b29a56',
                '#8393b4',
              ],
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                1,
                16,
                3.5,
              ],
              'line-opacity': 0.95,
            },
          });
          m.addSource('water-breaks', {
            type: 'geojson',
            data: empty,
          });
          m.addLayer({
            id: 'water-breaks',
            source: 'water-breaks',
            type: 'circle',
            layout: { visibility: 'none' },
            filter: ['>=', ['get', 'break_date'], '2021-01-01'],
            paint: {
              'circle-color': '#b55c44',
              'circle-radius': 5,
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 2,
            },
          });
          m.addSource('districts', {
            type: 'geojson',
            data: empty,
          });
          m.addLayer({
            id: 'districts',
            source: 'districts',
            type: 'line',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#736c98',
              'line-width': 2,
              'line-dasharray': [3, 2],
              'line-opacity': 0.8,
            },
          });
          m.addSource('nearby', { type: 'geojson', data: empty });
          m.addLayer({
            id: 'development-points',
            source: 'nearby',
            type: 'circle',
            filter: ['==', ['get', 'kind'], 'development'],
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': 6,
              'circle-color': '#ab8258',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            },
          });
          m.addSource('transit-citywide', {
            type: 'geojson',
            data: empty,
            attribution: cityTransitAttribution,
          });
          m.addSource('transit-routes', {
            type: 'geojson',
            data: empty,
            attribution: cityTransitAttribution,
          });
          m.addSource('green-line', {
            type: 'geojson',
            data: empty,
            attribution: cityTransitAttribution,
          });
          m.addLayer(
            {
              id: 'bus-routes',
              source: 'transit-routes',
              type: 'line',
              filter: ['==', ['get', 'mode'], 'bus'],
              layout: {
                visibility: 'none',
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': TRANSIT_COLOURS.bus,
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  9,
                  0.65,
                  13,
                  1.5,
                  17,
                  2.4,
                ],
                'line-opacity': 0.8,
              },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'train-route-casing',
              source: 'transit-routes',
              type: 'line',
              filter: ['==', ['get', 'mode'], 'train'],
              layout: {
                visibility: 'none',
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#fff',
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  9,
                  5,
                  15,
                  8,
                ],
                'line-opacity': 0.85,
              },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'train-routes',
              source: 'transit-routes',
              type: 'line',
              filter: ['==', ['get', 'mode'], 'train'],
              layout: {
                visibility: 'none',
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': [
                  'match',
                  ['get', 'routeNumber'],
                  '201',
                  TRANSIT_COLOURS.redLine,
                  '202',
                  TRANSIT_COLOURS.blueLine,
                  TRANSIT_COLOURS.blueLine,
                ],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  9,
                  2.5,
                  15,
                  4.5,
                ],
                'line-opacity': 0.9,
                'line-offset': [
                  'match',
                  ['get', 'routeNumber'],
                  '201',
                  -1.1,
                  '202',
                  1.1,
                  0,
                ],
              },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'green-line-route',
              source: 'green-line',
              type: 'line',
              filter: ['==', ['geometry-type'], 'LineString'],
              layout: {
                visibility: 'none',
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': TRANSIT_COLOURS.greenLine,
                'line-width': 3.5,
                'line-dasharray': [2, 2],
              },
            },
            firstSymbol,
          );
          m.addLayer({
            id: 'bus-points',
            source: 'transit-citywide',
            type: 'circle',
            minzoom: 11,
            filter: [
              'in',
              ['get', 'transitMode'],
              ['literal', ['bus', 'mixed']],
            ],
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                11,
                2,
                14,
                4,
                17,
                5,
              ],
              'circle-color': TRANSIT_COLOURS.bus,
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#fff',
            },
          });
          m.addLayer({
            id: 'train-points',
            source: 'transit-citywide',
            type: 'circle',
            filter: [
              'in',
              ['get', 'transitMode'],
              ['literal', ['train', 'mixed']],
            ],
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                9,
                4,
                13,
                6,
                17,
                8,
              ],
              'circle-color': '#fff',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': [
                'case',
                [
                  'all',
                  ['in', '201', ['get', 'routeNumbers']],
                  ['in', '202', ['get', 'routeNumbers']],
                ],
                '#64798a',
                ['in', '201', ['get', 'routeNumbers']],
                TRANSIT_COLOURS.redLine,
                TRANSIT_COLOURS.blueLine,
              ],
            },
          });
          m.addLayer({
            id: 'train-labels',
            source: 'transit-citywide',
            type: 'symbol',
            minzoom: 13,
            filter: [
              'in',
              ['get', 'transitMode'],
              ['literal', ['train', 'mixed']],
            ],
            layout: {
              visibility: 'none',
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-font': ['Noto Sans Regular'],
              'text-anchor': 'top',
              'text-offset': [0, 1.1],
              'text-max-width': 14,
            },
            paint: {
              'text-color': '#31516a',
              'text-halo-color': '#fff',
              'text-halo-width': 1.4,
            },
          });
          m.addLayer({
            id: 'green-line-stations',
            source: 'green-line',
            type: 'circle',
            filter: ['==', ['geometry-type'], 'Point'],
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': 6,
              'circle-color': '#f7fbf9',
              'circle-stroke-width': 2,
              'circle-stroke-color': TRANSIT_COLOURS.greenLine,
            },
          });
          m.addSource('amenities', { type: 'geojson', data: empty });
          m.addLayer(
            {
              id: 'park-areas',
              source: 'amenities',
              type: 'fill',
              filter: ['==', ['geometry-type'], 'Polygon'],
              layout: { visibility: 'none' },
              paint: { 'fill-color': '#78a46c', 'fill-opacity': 0.5 },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'pathways',
              source: 'amenities',
              type: 'line',
              filter: ['==', ['geometry-type'], 'LineString'],
              layout: { visibility: 'none' },
              paint: { 'line-color': '#497e56', 'line-width': 3 },
            },
            firstSymbol,
          );
          m.addSource('flood-regulatory', { type: 'geojson', data: empty });
          m.addLayer(
            {
              id: 'flood-regulatory',
              source: 'flood-regulatory',
              type: 'fill',
              layout: { visibility: 'none' },
              paint: {
                'fill-color': [
                  'match',
                  ['get', 'zone'],
                  'Floodway',
                  '#688bad',
                  'Flood Fringe',
                  '#9bb8ce',
                  '#bfd5df',
                ],
                'fill-opacity': 0.55,
              },
            },
            firstSymbol,
          );
          m.addSource('flood-hazard', { type: 'geojson', data: empty });
          m.addLayer(
            {
              id: 'flood-hazard',
              source: 'flood-hazard',
              type: 'fill',
              layout: { visibility: 'none' },
              paint: { 'fill-color': '#6492a5', 'fill-opacity': 0.48 },
            },
            firstSymbol,
          );
          m.addSource('noise', { type: 'geojson', data: empty });
          m.addLayer(
            {
              id: 'noise-fill',
              source: 'noise',
              type: 'fill',
              layout: { visibility: 'none' },
              paint: { 'fill-color': '#aa9161', 'fill-opacity': 0.18 },
            },
            firstSymbol,
          );
          m.addLayer(
            {
              id: 'noise-lines',
              source: 'noise',
              type: 'line',
              layout: { visibility: 'none' },
              paint: { 'line-color': '#a08451', 'line-width': 2 },
            },
            firstSymbol,
          );
          m.on('click', (e) => {
            if (!m || !current.current.active) return;
            propertyRequest.current?.abort();
            activePopup.current?.remove();
            const clickableLayers: string[] = [];
            if (current.current.transitLayers.train)
              clickableLayers.push(
                'train-points',
                'train-labels',
                'train-routes',
              );
            if (current.current.transitLayers.bus)
              clickableLayers.push('bus-points', 'bus-routes');
            if (
              current.current.transitLayers.greenLine &&
              GREEN_LINE_MAP_AVAILABLE
            )
              clickableLayers.push('green-line-stations', 'green-line-route');
            if (current.current.layer === 'nearby')
              clickableLayers.push(
                'development-points',
                'park-areas',
                'pathways',
                'flood-regulatory',
                'flood-hazard',
                'noise-fill',
              );
            if (clickableLayers.length) {
              const results = m.queryRenderedFeatures(e.point, {
                layers: clickableLayers,
              });
              if (results.length) {
                const p = results[0].properties;
                const card = document.createElement('div');
                card.className = 'atlas-map-popup';
                const title = document.createElement('strong');
                title.textContent = String(
                  p.title ||
                    p.name ||
                    p.zone ||
                    p.label ||
                    (current.current.overlay === 'hazard'
                      ? 'Provincial flood hazard'
                      : 'Mapped feature'),
                );
                card.appendChild(title);
                const description = document.createElement('p');
                description.textContent = String(
                  p.description ||
                    p.type ||
                    p.study ||
                    p.layerType ||
                    'Official mapped record',
                );
                card.appendChild(description);
                if (p.status) {
                  const status = document.createElement('span');
                  status.textContent =
                    String(p.status) + (p.date ? ' · ' + p.date : '');
                  card.appendChild(status);
                }
                activePopup.current?.remove();
                activePopup.current = new ml.Popup({
                  closeButton: true,
                  offset: 12,
                  maxWidth: '280px',
                })
                  .setLngLat(e.lngLat)
                  .setDOMContent(card)
                  .addTo(m);
                return;
              }
            }
            const pins = m.queryRenderedFeatures(e.point, {
              layers: ['property-dots', 'property-values'],
            });
            if (pins.length) {
              current.current.onProperty(String(pins[0].properties.rollNumber));
              return;
            }
            if (m.getZoom() >= 15.5) {
              const buildings = m.queryRenderedFeatures(e.point, {
                layers: [
                  'atlas-buildings',
                  ...(m.getLayer('landmark-building-context')
                    ? ['landmark-building-context']
                    : []),
                ],
              });
              const clicked: [number, number] = [e.lngLat.lng, e.lngLat.lat];
              const point = buildings.length
                ? buildingLookupPoint(buildings[0].geometry, clicked)
                : clicked;
              if (point) {
                const controller = new AbortController();
                propertyRequest.current = controller;
                const card = document.createElement('div');
                card.className = 'atlas-map-popup map-property-popup';
                const title = document.createElement('strong');
                title.textContent = 'Finding this property…';
                title.setAttribute('role', 'status');
                card.appendChild(title);
                const popup = new ml.Popup({
                  closeButton: true,
                  offset: 14,
                  maxWidth: '300px',
                })
                  .setLngLat(point)
                  .setDOMContent(card)
                  .addTo(m);
                popup.on('close', () => controller.abort());
                activePopup.current = popup;
                const message = (text: string) => {
                  const p = document.createElement('p');
                  p.textContent = text;
                  card.appendChild(p);
                };
                const search = () => {
                  const button = document.createElement('button');
                  button.className = 'map-property-search';
                  button.textContent = 'Search by address';
                  button.onclick = () => {
                    popup.remove();
                    current.current.onSearch();
                  };
                  card.appendChild(button);
                };
                void fetch('/api/map-property', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    longitude: point[0],
                    latitude: point[1],
                  }),
                  signal: controller.signal,
                })
                  .then(async (response) => {
                    const result = (await response.json()) as {
                      records?: Property[];
                      truncated?: boolean;
                      error?: string;
                    };
                    if (!response.ok)
                      throw new Error(
                        result.error || 'Property lookup unavailable.',
                      );
                    if (controller.signal.aborted) return;
                    const records = result.records ?? [];
                    if (records.length === 1 && !result.truncated) {
                      popup.remove();
                      current.current.onPropertyRecord(records[0]);
                      return;
                    }
                    title.textContent = records.length
                      ? 'Choose a property'
                      : result.truncated
                        ? 'Narrow this property search'
                        : 'No residential record here';
                    if (!records.length) {
                      message(
                        result.truncated
                          ? 'This point has too many parcel records to show a complete account. Search the address and unit to narrow the results.'
                          : 'The City’s 2026 assessment map has no residential account at this point. Try the centre of the home or search its address.',
                      );
                      search();
                      return;
                    }
                    popup.remove();
                    setPropertyChoices({
                      records,
                      truncated: !!result.truncated,
                    });
                  })
                  .catch(() => {
                    if (controller.signal.aborted) return;
                    title.textContent = 'Property lookup unavailable';
                    message(
                      'The City’s record service did not respond. Try again, or search the address.',
                    );
                    search();
                  });
                return;
              }
            }
            const areas = m.queryRenderedFeatures(e.point, {
              layers: ['community-wash'],
            });
            if (areas.length)
              current.current.onCommunity(
                String(areas[0].properties.comm_code),
              );
          });
          for (const id of [
            'property-dots',
            'atlas-buildings',
            'community-wash',
            'bus-points',
            'bus-routes',
            'train-points',
            'train-labels',
            'train-routes',
            'green-line-stations',
            'green-line-route',
          ]) {
            m.on('mouseenter', id, () => {
              if (m) m.getCanvas().style.cursor = 'pointer';
            });
            m.on('mouseleave', id, () => {
              if (m) m.getCanvas().style.cursor = '';
            });
          }
          //ground overlays belong below the roofs, while selection pins stay above.
          for (const id of [
            'property-parcels',
            'property-outlines',
            'water-mains',
            'districts',
          ])
            m.moveLayer(id, 'atlas-buildings');
          let previousWidth = m.getContainer().clientWidth;
          let previousHeight = m.getContainer().clientHeight;
          let previousCompact = compactMap(m);
          const observer = new ResizeObserver(() => {
            if (!m || disposed) return;
            const { clientWidth: width, clientHeight: height } =
              m.getContainer();
            if (width === previousWidth && height === previousHeight) return;
            const switchedLayout =
              compactMap(m) !== previousCompact ||
              width > height !== previousWidth > previousHeight;
            previousWidth = width;
            previousHeight = height;
            previousCompact = compactMap(m);
            m.resize();
            if (
              !current.current.active ||
              (compactMap(m) && current.current.detailsMode === 'full')
            ) {
              framedDetailsMode.current = null;
              return;
            }
            framedDetailsMode.current = current.current.detailsMode;
            const key = current.current.landmark;
            if (switchedLayout && key) {
              void import('./calgary-landmarks').then(({ LANDMARKS }) => {
                if (
                  !m ||
                  disposed ||
                  current.current.landmark !== key ||
                  !current.current.active ||
                  (compactMap(m) && current.current.detailsMode === 'full')
                )
                  return;
                focusLandmark(
                  m,
                  key,
                  LANDMARKS[key],
                  current.current.detailsMode,
                  false,
                );
              });
            } else updateCameraPadding(m, current.current, false);
          });
          observer.observe(m.getContainer());
          m.once('remove', () => observer.disconnect());
          setReady(true);
          setFailed(false);
          current.current.onReady?.();
        });
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    void start();
    return () => {
      disposed = true;
      propertyRequest.current?.abort();
      setReady(false);
      m?.remove();
      map.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    propertyRequest.current?.abort();
    activePopup.current?.remove();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a portal must close when its map selection becomes stale
    setPropertyChoices(null);
  }, [
    props.community?.comm_code,
    props.property?.rollNumber,
    props.layer,
    props.action.id,
    props.active,
  ]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !communities) return;
    (m.getSource('communities') as ml.GeoJSONSource).setData(
      withoutQuadrants(communities),
    );
    (m.getSource('quadrants') as ml.GeoJSONSource).setData(
      onlyQuadrants(communities),
    );
  }, [communities, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !properties) return;
    const records = properties;
    (m.getSource('properties') as ml.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: records
        .filter((p) => p.geometry)
        .map((p) => ({
          type: 'Feature',
          geometry: p.geometry!,
          properties: { rollNumber: p.rollNumber },
        })),
    });
    (m.getSource('property-points') as ml.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: records.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          rollNumber: p.rollNumber,
          communityCode: p.communityCode,
          quadrant: p.address.match(/(NE|NW|SE|SW)$/)?.[1] ?? '',
          price:
            p.assessedValue >= 1e6
              ? `$${(p.assessedValue / 1e6).toFixed(2)}m`
              : `$${Math.round(p.assessedValue / 1000)}k`,
        },
      })),
    });
  }, [properties, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.removeFeatureState({ source: 'communities' });
    if (props.community)
      m.setFeatureState(
        { source: 'communities', id: props.community.comm_code },
        { selected: true },
      );
    for (const id of ['quadrant-fill', 'quadrant-outline'])
      m.setFilter(id, [
        '==',
        ['get', 'comm_code'],
        props.community?.class === 'Quadrant' ? props.community.comm_code : '',
      ]);
    for (const id of ['property-dots', 'property-values'])
      m.setFilter(
        id,
        props.community
          ? props.community.class === 'Quadrant'
            ? ['==', ['get', 'quadrant'], props.community.comm_code.slice(2)]
            : ['==', ['get', 'communityCode'], props.community.comm_code]
          : undefined,
      );
    if (props.property) {
      (m.getSource('selected-property') as ml.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [props.property.longitude, props.property.latitude],
            },
            properties: {},
          },
        ],
      });
    } else
      (m.getSource('selected-property') as ml.GeoJSONSource).setData(empty);
  }, [props.community, props.property, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !props.active || attributionPresented.current) return;
    const credit = m
      .getContainer()
      .querySelector<HTMLDetailsElement>('.maplibregl-ctrl-attrib');
    if (!credit) return;
    const toggle = credit.querySelector('summary');
    toggle?.setAttribute('aria-label', 'Map credits');
    toggle?.setAttribute('title', 'Map credits');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => clearTimeout(timer);
    const schedule = () => {
      cancel();
      if (document.hidden || getComputedStyle(credit).visibility === 'hidden')
        return;
      //show the credits before collapsing them, as the OSM attribution guidance allows.
      timer = setTimeout(() => {
        if (
          document.hidden ||
          getComputedStyle(credit).visibility === 'hidden' ||
          credit.matches(':hover') ||
          credit.contains(document.activeElement)
        )
          return;
        credit.classList.remove('maplibregl-compact-show');
        credit.open = false;
        attributionPresented.current = true;
      }, 5000);
    };
    const keepOpen = () => {
      attributionPresented.current = true;
      cancel();
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    credit.addEventListener('pointerdown', keepOpen);
    credit.addEventListener('keydown', keepOpen);
    return () => {
      cancel();
      document.removeEventListener('visibilitychange', schedule);
      credit.removeEventListener('pointerdown', keepOpen);
      credit.removeEventListener('keydown', keepOpen);
    };
  }, [ready, props.active, props.detailsMode]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || (!props.property && !props.community)) return;
    const initialized = cameraInitialized.current;
    cameraInitialized.current = true;
    framedDetailsMode.current = current.current.detailsMode;
    focusSelectedPlace(m, current.current, false, initialized);
  }, [props.community, props.property, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !props.active) return;
    if (!compactMap(m)) {
      framedDetailsMode.current = props.detailsMode;
      return;
    }
    if (
      props.detailsMode === 'full' ||
      framedDetailsMode.current === props.detailsMode
    )
      return;
    framedDetailsMode.current = props.detailsMode;
    //a new selection already flies to this padding; do not interrupt that flight.
    updateCameraPadding(m, current.current);
  }, [props.detailsMode, props.active, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    for (const id of [
      'property-dots',
      'property-values',
      'property-parcels',
      'property-outlines',
    ])
      m.setLayoutProperty(
        id,
        'visibility',
        ['overview', 'property'].includes(props.layer) ? 'visible' : 'none',
      );
    for (const id of ['water-mains', 'water-breaks'])
      m.setLayoutProperty(
        id,
        'visibility',
        props.layer === 'water' ? 'visible' : 'none',
      );
    m.setLayoutProperty(
      'districts',
      'visibility',
      props.layer === 'politics' ? 'visible' : 'none',
    );
    if (props.layer === 'crime' && crime) {
      const colors: unknown[] = ['match', ['get', 'comm_code']];
      for (const [code, c] of Object.entries(crime)) {
        if (!code || code === 'null') continue;
        const count = c.latestYearComparison.current.publishedCount;
        if (count === null) continue;
        colors.push(
          code,
          count > 300
            ? '#426988'
            : count > 100
              ? '#769bb7'
              : count > 40
                ? '#a9c5d9'
                : '#d1e2ee',
        );
      }
      colors.push('#cbd1cf');
      m.setPaintProperty(
        'community-wash',
        'fill-color',
        colors as ml.ExpressionSpecification,
      );
      m.setPaintProperty('community-wash', 'fill-opacity', 0.42);
    } else {
      m.setPaintProperty('community-wash', 'fill-color', '#789cb8');
      m.setPaintProperty('community-wash', 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.14,
        0.012,
      ]);
    }
  }, [props.layer, crime, ready]);
  const loadedSources = useRef(new Set<string>());
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const sources =
      props.layer === 'water'
        ? [
            ['water-mains', 'water-mains.geojson'],
            ['water-breaks', 'water-breaks.geojson'],
          ]
        : props.layer === 'politics'
          ? [['districts', 'electoral.geojson']]
          : [];
    for (const [source, file] of sources) {
      if (loadedSources.current.has(source)) continue;
      (m.getSource(source) as ml.GeoJSONSource).setData('/data/' + file);
      loadedSources.current.add(source);
    }
  }, [props.layer, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setLayoutProperty(
      'aerial-base',
      'visibility',
      props.basemap === 'aerial' ? 'visible' : 'none',
    );
    m.setPaintProperty(
      'atlas-buildings',
      'fill-extrusion-color',
      props.basemap === 'aerial' ? '#e8e8db' : '#f1f6fa',
    );
    m.setPaintProperty('atlas-buildings', 'fill-extrusion-opacity', 1);
    if (m.getLayer('landmark-building-context'))
      m.setPaintProperty(
        'landmark-building-context',
        'fill-extrusion-color',
        props.basemap === 'aerial' ? '#e8e8db' : '#f1f6fa',
      );
    for (const l of m.getStyle().layers) {
      if (l.type === 'symbol' && l.id !== 'property-values') {
        m.setPaintProperty(
          l.id,
          'text-color',
          props.basemap === 'aerial' ? '#fbfff4' : '#576d7d',
        );
        m.setPaintProperty(
          l.id,
          'text-halo-color',
          props.basemap === 'aerial' ? '#263c32' : '#f6f9fc',
        );
      }
    }
  }, [props.basemap, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const groups: Record<Overlay, string[]> = {
      none: [],
      development: ['development-points'],
      transit: [],
      parks: ['park-areas', 'pathways'],
      flood: ['flood-regulatory'],
      hazard: ['flood-hazard'],
      noise: ['noise-fill', 'noise-lines'],
    };
    for (const [key, ids] of Object.entries(groups))
      for (const id of ids)
        m.setLayoutProperty(
          id,
          'visibility',
          props.layer === 'nearby' && props.overlay === key
            ? 'visible'
            : 'none',
        );
    if (
      props.layer !== 'nearby' ||
      props.overlay === 'transit' ||
      props.overlay === 'none'
    )
      return;
    const sources: Record<Exclude<Overlay, 'none'>, [string, string]> = {
      development: ['nearby', 'nearby-points.geojson'],
      transit: ['transit-citywide', 'transit-points.geojson'],
      parks: ['amenities', 'amenities.geojson'],
      flood: ['flood-regulatory', 'flood-regulatory.geojson'],
      hazard: ['flood-hazard', 'flood-hazard.geojson'],
      noise: ['noise', 'noise.geojson'],
    };
    const [source, file] = sources[props.overlay];
    if (!loadedSources.current.has(source)) {
      (m.getSource(source) as ml.GeoJSONSource).setData('/data/' + file);
      loadedSources.current.add(source);
    }
    if (props.overlay === 'noise')
      m.flyTo({
        center: [-114.02, 51.14],
        zoom: 11.8,
        pitch: 35,
        padding: cameraPadding(
          m,
          compactMap(m)
            ? mobileMapPadding(m, current.current.detailsMode)
            : { top: 60, bottom: 80, left: 20, right: 390 },
          current.current.detailsMode === 'preview',
        ),
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 1000,
      });
  }, [props.layer, props.overlay, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    activePopup.current?.remove();
    const groups: Record<keyof TransitMapLayers, string[]> = {
      train: [
        'train-route-casing',
        'train-routes',
        'train-points',
        'train-labels',
      ],
      bus: ['bus-routes', 'bus-points'],
      greenLine: ['green-line-route', 'green-line-stations'],
    };
    for (const [key, ids] of Object.entries(groups)) {
      const visible =
        transitLayers[key as keyof TransitMapLayers] &&
        (key !== 'greenLine' || GREEN_LINE_MAP_AVAILABLE);
      for (const id of ids)
        m.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
    const sources: [string, string][] = [];
    if (transitLayers.train || transitLayers.bus) {
      sources.push(
        ['transit-citywide', 'transit-points.geojson'],
        ['transit-routes', 'transit-routes.geojson'],
      );
    }
    if (transitLayers.greenLine && GREEN_LINE_MAP_AVAILABLE)
      sources.push(['green-line', 'green-line.geojson']);
    if (!sources.length) {
      onTransitStatus('idle');
      return;
    }
    const pending = sources.filter(
      ([source]) => !loadedSources.current.has(source),
    );
    if (!pending.length) {
      onTransitStatus('ready');
      return;
    }
    const controller = new AbortController();
    onTransitStatus('loading');
    void Promise.all(
      pending.map(async ([source, file]) => {
        let data = transitCache.current.get(source);
        if (!data) {
          const response = await fetch(`/data/${file}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Transit layer unavailable');
          data = (await response.json()) as FeatureCollection;
          if (
            data.type !== 'FeatureCollection' ||
            !Array.isArray(data.features)
          )
            throw new Error('Transit layer unavailable');
          transitCache.current.set(source, data);
        }
        if (controller.signal.aborted) return;
        (m.getSource(source) as ml.GeoJSONSource).setData(data);
        loadedSources.current.add(source);
        if (
          source === 'green-line' &&
          current.current.action.type === 'greenLine' &&
          current.current.transitLayers.greenLine
        )
          fitGreenLineRoute(m, data, current.current.detailsMode);
      }),
    )
      .then(() => {
        if (!controller.signal.aborted) onTransitStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) onTransitStatus('error');
      });
    return () => controller.abort();
  }, [transitLayers, onTransitStatus, ready]);
  useEffect(() => {
    if (!ready) return;
    map.current?.easeTo({
      pitch: props.is3d ? 57 : 0,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 700,
    });
  }, [props.is3d, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let cancelled = false;
    const type = props.action.type;
    if (type === 'in') m.zoomIn();
    if (type === 'out') m.zoomOut();
    if (type === 'returnToPlace') focusSelectedPlace(m, current.current, true);
    if (
      type === 'greenLine' &&
      GREEN_LINE_MAP_AVAILABLE &&
      current.current.transitLayers.greenLine
    ) {
      const data = transitCache.current.get('green-line');
      if (data) fitGreenLineRoute(m, data, current.current.detailsMode);
    }
    if (type === 'home')
      m.flyTo({
        center: [-114.073, 51.049],
        zoom: 14.2,
        bearing: -24,
        pitch: current.current.is3d ? 57 : 0,
        padding: compactMap(m)
          ? placeCameraPadding(m, current.current)
          : { top: 0, bottom: 0, left: 0, right: 0 },
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 1000,
      });
    if (type === 'north')
      m.easeTo({
        bearing: 0,
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 600,
      });
    if (isLandmarkKey(type)) {
      void import('./calgary-landmarks')
        .then(({ LANDMARKS }) => {
          if (cancelled || map.current !== m || !current.current.active) return;
          focusLandmark(m, type, LANDMARKS[type], current.current.detailsMode);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [props.action, ready]);
  return (
    <div
      className="map-stage"
      aria-hidden={!props.active}
      inert={!props.active}
    >
      <MapPropertyDialog
        result={props.active ? propertyChoices : null}
        onClose={() => setPropertyChoices(null)}
        onSelect={props.onPropertyRecord}
        onSearch={props.onSearch}
      />
      <div
        ref={container}
        className="city-map"
        aria-label="Interactive 3D Calgary map. Zoom in and click a home to select its property record, or use the address search."
      />

      {failed && (
        <div className="map-unavailable">
          <strong>The map connection was interrupted.</strong>
          <span>Your property records are still available.</span>
          <button
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            <RefreshCw size={15} />
            Reconnect map
          </button>
        </div>
      )}
    </div>
  );
}
