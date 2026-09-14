import type { FeatureCollection, Point } from 'geojson';
import { distanceMetres } from './transit';
export const DOWNTOWN = {
  name: 'Calgary Tower',
  coordinates: [-114.0631268, 51.044487] as [number, number],
  source: 'https://data.calgary.ca/d/x34e-bcjz',
};
export const ACCESS_CATEGORIES = [
  { id: 'groceries', label: 'Groceries', weight: 25 },
  { id: 'convenience', label: 'Convenience stores', weight: 5 },
  { id: 'parks', label: 'Parks', weight: 20 },
  { id: 'schools', label: 'Schools', weight: 15 },
  { id: 'healthcare', label: 'Pharmacy & healthcare', weight: 20 },
  { id: 'community', label: 'Libraries & community', weight: 15 },
];
export interface Amenity {
  name: string | null;
  category: string;
  subcategory: string;
  sourceId: string;
  sourceUrl?: string;
  coordinateMethod: string;
  address?: string;
}
export type AmenityCollection = FeatureCollection<Point, Amenity>;
export function nearbyEssentials(
  origin: [number, number],
  city: AmenityCollection,
  osm: AmenityCollection,
  insideCity: boolean,
) {
  const valid =
    origin.every(Number.isFinite) &&
    Math.abs(origin[0]) <= 180 &&
    Math.abs(origin[1]) <= 90;
  const features = [...city.features, ...osm.features];
  let observedWeight = 0,
    weighted = 0,
    count = 0;
  const breakdown = ACCESS_CATEGORIES.map((category) => {
    let nearest: (Amenity & { id: string; distanceM: number }) | null = null;
    if (valid)
      for (const feature of features) {
        if (feature.properties.category !== category.id) continue;
        const d = distanceMetres(
          origin[1],
          origin[0],
          feature.geometry.coordinates[1],
          feature.geometry.coordinates[0],
        );
        if (!nearest || d < nearest.distanceM)
          nearest = {
            ...feature.properties,
            id: String(feature.id),
            distanceM: d,
          };
      }
    const observed =
      valid && insideCity && nearest !== null && nearest.distanceM <= 2000;
    const score = observed
      ? Math.max(0, Math.min(100, (2000 - nearest!.distanceM) / 16))
      : null;
    if (score !== null) {
      observedWeight += category.weight;
      weighted += category.weight * score;
      count++;
    }
    return {
      ...category,
      score: score === null ? null : Math.round(score),
      nearest,
    };
  });
  return {
    score:
      count >= 4 && observedWeight >= 70
        ? Math.round(weighted / observedWeight)
        : null,
    observedWeight,
    count,
    breakdown,
  };
}
export function distanceLabel(metres: number) {
  return metres < 1000
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toFixed(1)} km`;
}
