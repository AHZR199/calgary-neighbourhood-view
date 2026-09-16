import type { MultiPolygon, Position } from 'geojson';
import type { Property } from './data';
import {
  normalizeAssessmentRoll,
  summarizeConstruction,
} from './property-records';
import { LookupInputError } from './request-body';

export const parcelRowLimit = 200;
export const parcelSourceUrl = 'https://data.calgary.ca/d/4bsw-nn7w';
export interface MapPoint {
  latitude: number;
  longitude: number;
}

export async function readMapPoint(request: Request): Promise<MapPoint> {
  if (new URL(request.url).search)
    throw new LookupInputError('Send the map location in the request body.');
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new LookupInputError('Send a JSON request.', 415);
  if (Number(request.headers.get('content-length')) > 512)
    throw new LookupInputError('Request is too large.', 413);
  if (!request.body) throw new LookupInputError('A map location is required.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0,
    text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512) {
        await reader.cancel();
        throw new LookupInputError('Request is too large.', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let fields: unknown;
  try {
    fields = JSON.parse(text);
  } catch {
    throw new LookupInputError('Invalid JSON request.');
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields))
    throw new LookupInputError('Invalid map location.');
  const input = fields as Record<string, unknown>;
  const { latitude, longitude } = input;
  if (
    Object.keys(input).length !== 2 ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 50.8 ||
    latitude > 51.3 ||
    longitude < -114.4 ||
    longitude > -113.8
  )
    throw new LookupInputError('Select a location within Calgary.');
  return { latitude, longitude };
}

function isParcelGeometry(value: unknown): value is MultiPolygon {
  if (!value || typeof value !== 'object') return false;
  const geometry = value as MultiPolygon;
  return (
    geometry.type === 'MultiPolygon' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 0 &&
    geometry.coordinates.every(
      (polygon) =>
        Array.isArray(polygon) &&
        polygon.length > 0 &&
        polygon.every(
          (ring) =>
            Array.isArray(ring) &&
            ring.length >= 4 &&
            ring.every(
              (point) =>
                Array.isArray(point) &&
                point.length >= 2 &&
                Number.isFinite(point[0]) &&
                Number.isFinite(point[1]) &&
                point[0] >= -115 &&
                point[0] <= -113 &&
                point[1] >= 50 &&
                point[1] <= 52,
            ) &&
            ring[0][0] === ring.at(-1)![0] &&
            ring[0][1] === ring.at(-1)![1],
        ),
    )
  );
}

function ringPosition(
  point: MapPoint,
  ring: Position[],
): 'inside' | 'outside' | 'boundary' {
  const x = point.longitude,
    y = point.latitude;
  let inside = false;
  for (let index = 1; index < ring.length; index++) {
    const [ax, ay] = ring[index - 1],
      [bx, by] = ring[index];
    const dx = bx - ax,
      dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared > 0) {
      const fraction = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared),
      );
      if ((x - ax - fraction * dx) ** 2 + (y - ay - fraction * dy) ** 2 < 1e-20)
        return 'boundary';
    }
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

export function parcelContainsPoint(
  geometry: MultiPolygon,
  point: MapPoint,
): boolean {
  return geometry.coordinates.some(([outer, ...holes]) => {
    const exterior = ringPosition(point, outer);
    if (exterior === 'boundary') return true;
    if (exterior === 'outside') return false;
    const interiors = holes.map((ring) => ringPosition(point, ring));
    return interiors.includes('boundary') || !interiors.includes('inside');
  });
}

function amount(value: unknown): number | null {
  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function assessmentFields(row: Record<string, unknown>) {
  const assessedValue = amount(row.assessed_value);
  const residentialAssessedValue = amount(
    row.re_assessed_value ?? row.assessed_value,
  );
  const nonResidentialAssessedValue = amount(row.nr_assessed_value ?? 0);
  if (
    assessedValue === null ||
    residentialAssessedValue === null ||
    nonResidentialAssessedValue === null ||
    typeof row.address !== 'string' ||
    !row.address.trim() ||
    typeof row.comm_code !== 'string' ||
    !/^[A-Z0-9]{3}$/.test(row.comm_code) ||
    typeof row.comm_name !== 'string' ||
    !row.comm_name.trim()
  )
    throw new Error('Incomplete assessment record');
  return {
    address: row.address.trim(),
    communityCode: row.comm_code,
    communityName: row.comm_name.trim(),
    assessedValue,
    residentialAssessedValue,
    nonResidentialAssessedValue,
  };
}

export function normalizeParcelMatches(
  value: unknown,
  point: MapPoint,
): { records: Property[]; truncated: boolean } {
  if (!Array.isArray(value) || value.length > parcelRowLimit + 1)
    throw new Error('Invalid parcel response');
  const rows = value as Record<string, unknown>[];
  const truncated = rows.length > parcelRowLimit;
  // the last account may be cut off mid-parcel, so leave it out when capped
  const partialRoll = truncated
    ? normalizeAssessmentRoll(rows.at(-1)?.roll_number)
    : null;
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') throw new Error('Invalid parcel row');
    const roll = normalizeAssessmentRoll(row.roll_number);
    if (
      !roll ||
      Number(row.roll_year) !== 2026 ||
      row.assessment_class_description !== 'Residential' ||
      !isParcelGeometry(row.multipolygon)
    )
      throw new Error('Invalid residential parcel');
    // check the actual parcel again; never turn a source mismatch into a nearby match
    if (!parcelContainsPoint(row.multipolygon, point))
      throw new Error('Parcel does not contain the selected point');
    if (roll === partialRoll) continue;
    const group = grouped.get(roll) || [];
    group.push(row);
    grouped.set(roll, group);
  }
  const records = [...grouped].map(([roll, group]): Property => {
    const row = group[0];
    const assessments = group.map(assessmentFields);
    const first = assessments[0];
    if (
      assessments.some(
        (entry) =>
          entry.address !== first.address ||
          entry.communityCode !== first.communityCode ||
          entry.communityName !== first.communityName ||
          entry.assessedValue !== first.assessedValue ||
          entry.residentialAssessedValue !== first.residentialAssessedValue ||
          entry.nonResidentialAssessedValue !==
            first.nonResidentialAssessedValue,
      )
    )
      throw new Error('Conflicting assessment records');
    const construction = summarizeConstruction(
      group.map((entry) => entry.year_of_construction),
      2026,
    );
    return {
      recordId: `2026${roll}`,
      rollNumber: String(row.roll_number),
      ...first,
      rollYear: 2026,
      yearBuilt: construction.year,
      construction,
      subPropertyUse: String(row.sub_property_use || ''),
      longitude: point.longitude,
      latitude: point.latitude,
      geometry: row.multipolygon as MultiPolygon,
      sourceUrl: parcelSourceUrl,
    };
  });
  return { records, truncated };
}
