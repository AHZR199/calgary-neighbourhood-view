'use client';
import { useEffect, useRef, useState } from 'react';
import * as ml from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { RefreshCw } from 'lucide-react';
import type { AtlasData, Community, Layer, Property } from '@/lib/atlas/data';
import 'maplibre-gl/dist/maplibre-gl.css';
ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
export type Overlay =
  'development' | 'transit' | 'parks' | 'flood' | 'hazard' | 'noise';
interface Props {
  basemap: 'atlas' | 'aerial';
  overlay: Overlay;
  data: AtlasData | null;
  community: Community | undefined;
  property: Property | null;
  layer: Layer;
  is3d: boolean;
  action: { type: string; id: number };
  onCommunity: (code: string) => void;
  onProperty: (roll: string) => void;
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
export default function CityMap(props: Props) {
  const communities = props.data?.communities;
  const properties = props.data?.properties;
  const crime = props.data?.crime;
  const container = useRef<HTMLDivElement>(null),
    map = useRef<ml.Map | null>(null),
    cameraInitialized = useRef(false),
    current = useRef(props);
  useEffect(() => {
    current.current = props;
  });
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    loadedSources.current.clear();
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
          maxZoom: 19,
          minZoom: 9,
          attributionControl: false,
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
          m.addLayer(
            {
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
                'fill-extrusion-opacity': 0.98,
              },
            },
            firstSymbol,
          );
          m.addSource('properties', { type: 'geojson', data: empty });
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
          m.addSource('transit-citywide', { type: 'geojson', data: empty });
          m.addLayer({
            id: 'transit-points',
            source: 'transit-citywide',
            type: 'circle',
            filter: ['==', ['get', 'kind'], 'transit'],
            layout: { visibility: 'none' },
            paint: {
              'circle-radius': 5,
              'circle-color': '#6086a3',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
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
            if (!m) return;
            if (current.current.layer === 'nearby') {
              const results = m.queryRenderedFeatures(e.point, {
                layers: [
                  'development-points',
                  'transit-points',
                  'park-areas',
                  'pathways',
                  'flood-regulatory',
                  'flood-hazard',
                  'noise-fill',
                ],
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
                new ml.Popup({
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
            const areas = m.queryRenderedFeatures(e.point, {
              layers: ['community-wash'],
            });
            if (areas.length)
              current.current.onCommunity(
                String(areas[0].properties.comm_code),
              );
          });
          for (const id of ['property-dots', 'community-wash']) {
            m.on('mouseenter', id, () => {
              if (m) m.getCanvas().style.cursor = 'pointer';
            });
            m.on('mouseleave', id, () => {
              if (m) m.getCanvas().style.cursor = '';
            });
          }
          const observer = new ResizeObserver(() => m?.resize());
          observer.observe(container.current!);
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
      setReady(false);
      m?.remove();
      map.current = null;
    };
  }, [attempt]);
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
    if (!m || !ready) return;
    const isPhone = m.getContainer().clientWidth < 760;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!cameraInitialized.current && !props.property) {
      cameraInitialized.current = true;
      return;
    }
    cameraInitialized.current = true;
    if (props.property)
      m.flyTo({
        center: [props.property.longitude, props.property.latitude],
        zoom: 16.8,
        padding: isPhone
          ? { top: 150, bottom: 320, left: 20, right: 20 }
          : { top: 90, bottom: 90, left: 40, right: 420 },
        duration: reduced ? 0 : 1400,
      });
    else if (props.community) {
      m.fitBounds(props.community.bounds, {
        padding: isPhone
          ? { top: 160, bottom: 315, left: 50, right: 40 }
          : { top: 140, bottom: 130, left: 110, right: 460 },
        maxZoom: 14.7,
        duration: reduced ? 0 : 1300,
      });
    }
  }, [props.community, props.property, ready]);
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
    m.setPaintProperty(
      'atlas-buildings',
      'fill-extrusion-opacity',
      props.basemap === 'aerial' ? 0.86 : 0.98,
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
      development: ['development-points'],
      transit: ['transit-points'],
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
    if (props.layer !== 'nearby') return;
    const sources: Record<Overlay, [string, string]> = {
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
        padding: {
          top: 60,
          bottom: 80,
          left: 20,
          right: m.getContainer().clientWidth > 760 ? 390 : 40,
        },
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 1000,
      });
  }, [props.layer, props.overlay, ready]);
  useEffect(() => {
    map.current?.easeTo({
      pitch: props.is3d ? 57 : 0,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 700,
    });
  }, [props.is3d]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const type = props.action.type;
    if (type === 'in') m.zoomIn();
    if (type === 'out') m.zoomOut();
    if (type === 'home')
      m.flyTo({
        center: [-114.073, 51.049],
        zoom: 14.2,
        bearing: -24,
        pitch: current.current.is3d ? 57 : 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
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
  }, [props.action]);
  return (
    <div className="map-stage">
      <div
        ref={container}
        className="city-map"
        aria-label="Interactive 3D Calgary map. Select a neighbourhood or property marker."
      />
      <div className="map-rights">
        <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>{' '}
        ·{' '}
        <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">
          © OpenMapTiles
        </a>{' '}
        ·{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        {props.basemap === 'aerial' && (
          <>
            {' '}
            ·{' '}
            <a href="https://maps.calgary.ca/" target="_blank" rel="noreferrer">
              © The City of Calgary, 2025
            </a>
          </>
        )}
      </div>
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
