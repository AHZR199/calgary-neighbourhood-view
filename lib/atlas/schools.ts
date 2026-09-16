import type { FeatureCollection, Point, Polygon, MultiPolygon } from 'geojson';
import { containsPoint } from './geography';
import { distanceMetres } from './transit';

export type SchoolLevel = 'elementary' | 'juniorHigh' | 'high' | 'unknown';
export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  elementary: 'Elementary',
  juniorHigh: 'Junior high',
  high: 'High school',
  unknown: 'Level not reported',
};
export interface SchoolProperties {
  id: string;
  name: string;
  address: string | null;
  locationNote: string | null;
  board: string | null;
  grades: string | null;
  levels: SchoolLevel[];
  levelFlags: {
    elementary: boolean | null;
    juniorHigh: boolean | null;
    high: boolean | null;
  };
  postSecondary: boolean | null;
  website: string | null;
  websiteSourceUrl: string | null;
  sourceUrl: string;
  communityCode: string | null;
  quadrant: string | null;
  areaCodes: string[];
}
export interface SchoolData extends FeatureCollection<Point, SchoolProperties> {
  metadata: {
    source: {
      publisher: string;
      title: string;
      url: string;
      metadataUrl: string;
      retrievedAt: string;
      sourceRowsUpdatedAt: string;
      licenceUrl: string;
      attribution: string;
    };
    counts: {
      sourceRows: number;
      schools: number;
      postSecondary: number;
      unknownLevel: number;
      elementary: number;
      juniorHigh: number;
      high: number;
    };
    [key: string]: unknown;
  };
}
export interface SchoolMatch extends SchoolProperties {
  coordinates: [number, number];
  distanceM: number;
  inSelectedArea: boolean;
}
export interface SchoolOptions {
  point: [number, number];
  communityCode?: string;
  quadrant?: string;
  mode: 'area' | 'nearby';
  radiusKm: number | null;
  level: 'all' | SchoolLevel;
  query?: string;
  board?: string;
}

export function schoolWebsite(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
      ? value.trim()
      : null;
  } catch {
    return null;
  }
}

export function schoolLevels(row: Record<string, unknown>) {
  const flag = (value: unknown): boolean | null => {
    if (value === 'Y') return true;
    if (value === 'N') return false;
    if (value === null || value === undefined || value === '') return null;
    throw new Error(
      'Unknown school-level flag; review the City source schema.',
    );
  };
  const levelFlags = {
    elementary: flag(row.elem),
    juniorHigh: flag(row.junior_h),
    high: flag(row.senior_h),
  };
  const postSecondary = flag(row.postsecond);
  const levels = (
    Object.keys(levelFlags) as Array<keyof typeof levelFlags>
  ).filter((key) => levelFlags[key]);
  return {
    levels: (levels.length || postSecondary
      ? levels
      : ['unknown']) as SchoolLevel[],
    levelFlags,
    postSecondary,
  };
}

export function schoolAreaCodes(
  point: [number, number],
  areas: FeatureCollection<Polygon | MultiPolygon>,
): string[] {
  return [
    ...new Set(
      areas.features
        .filter((area) => containsPoint(point, area.geometry))
        .flatMap((area) =>
          typeof area.properties?.comm_code === 'string'
            ? [area.properties.comm_code]
            : [],
        ),
    ),
  ].sort();
}

const searchable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function listSchools(
  data: SchoolData,
  options: SchoolOptions,
): SchoolMatch[] {
  const [longitude, latitude] = options.point;
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) > 90
  )
    throw new RangeError('A valid distance origin is required.');
  if (
    options.radiusKm !== null &&
    (!Number.isFinite(options.radiusKm) || options.radiusKm < 0)
  )
    throw new RangeError(
      'School radius must be positive or null for all distances.',
    );
  const code =
    options.communityCode ||
    (options.quadrant ? `Q_${options.quadrant.replace(/^Q_/, '')}` : null);
  const query = searchable(options.query?.trim() || '');
  return data.features
    .flatMap(({ geometry, properties }) => {
      if (properties.postSecondary === true) return [];
      if (options.level !== 'all' && !properties.levels.includes(options.level))
        return [];
      if (options.board && properties.board !== options.board) return [];
      if (
        query &&
        !searchable(
          [
            properties.name,
            properties.address,
            properties.board,
            properties.grades,
          ]
            .filter(Boolean)
            .join(' '),
        ).includes(query)
      )
        return [];
      const coordinates: [number, number] = [
        geometry.coordinates[0],
        geometry.coordinates[1],
      ];
      if (!coordinates.every(Number.isFinite)) return [];
      const inSelectedArea =
        code !== null && properties.areaCodes.includes(code);
      if (options.mode === 'area' && !inSelectedArea) return [];
      const distanceM = distanceMetres(
        latitude,
        longitude,
        coordinates[1],
        coordinates[0],
      );
      if (
        options.mode === 'nearby' &&
        options.radiusKm !== null &&
        distanceM > options.radiusKm * 1000
      )
        return [];
      return [{ ...properties, coordinates, distanceM, inSelectedArea }];
    })
    .sort(
      (a, b) =>
        a.distanceM - b.distanceM ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
}
