import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import type { Property, Representative } from './data';
function pointInRing(point: [number, number], ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function containsPoint(point: [number, number], geometry: Geometry) {
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')
    return false;
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (rings) =>
      pointInRing(point, rings[0]) &&
      !rings.slice(1).some((hole) => pointInRing(point, hole)),
  );
}
let boundaries: Promise<FeatureCollection> | undefined;
export async function resolveRepresentatives(
  property: Property,
  reps: Representative[],
): Promise<Property> {
  boundaries ??= Promise.all(
    ['/data/electoral.geojson', '/data/wards.geojson'].map((u) =>
      fetch(u).then((r) => {
        if (!r.ok) throw Error('District boundaries unavailable');
        return r.json() as Promise<FeatureCollection>;
      }),
    ),
  ).then((all) => ({
    type: 'FeatureCollection',
    features: all.flatMap((d) => d.features),
  }));
  const data = await boundaries.catch((error) => {
      boundaries = undefined;
      throw error;
    }),
    point: [number, number] = [property.longitude, property.latitude];
  const matched = data.features.filter((f) => containsPoint(point, f.geometry));
  const federal = matched.find((f) => f.properties?.level === 'federal'),
    provincial = matched.find((f) => f.properties?.level === 'provincial'),
    municipal = matched.find((f) => f.properties?.level === 'municipal');
  const lookup = (f: Feature | undefined) =>
    f
      ? reps.find(
          (r) =>
            r.level === f.properties?.level &&
            r.district === f.properties?.name,
        )?.id
      : undefined;
  return {
    ...property,
    mpRepresentativeId: lookup(federal),
    mlaRepresentativeId: lookup(provincial),
    councillorRepresentativeId:
      municipal?.properties?.representativeId ?? lookup(municipal),
    federalRiding: federal?.properties?.name,
    provincialRiding: provincial?.properties?.name,
  };
}
