import type { Geometry } from 'geojson';
import { containsPoint } from './geography';

// a roof click in a tilted map can land behind its footprint at ground level
export function buildingLookupPoint(
  geometry: Geometry,
  clicked: [number, number],
): [number, number] | null {
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    return null;
  if (containsPoint(clicked, geometry)) return clicked;
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let best: [number, number] | null = null;
  let nearest = Infinity;
  for (const rings of polygons) {
    const heights = [...new Set(rings.flat().map((p) => p[1]))]
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    for (let i = 1; i < heights.length; i++) {
      const y = (heights[i - 1] + heights[i]) / 2;
      const crossings: number[] = [];
      for (const ring of rings) {
        for (let j = 0, k = ring.length - 1; j < ring.length; k = j++) {
          const a = ring[j],
            b = ring[k];
          if (a[1] > y !== b[1] > y)
            crossings.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let j = 1; j < crossings.length; j += 2) {
        const point: [number, number] = [
          (crossings[j] + crossings[j - 1]) / 2,
          y,
        ];
        const distance =
          (point[0] - clicked[0]) ** 2 *
            Math.cos((clicked[1] * Math.PI) / 180) ** 2 +
          (point[1] - clicked[1]) ** 2;
        if (distance < nearest && containsPoint(point, geometry)) {
          nearest = distance;
          best = point;
        }
      }
    }
  }
  return best;
}
