import { NextResponse } from 'next/server';
import { LookupInputError } from '@/lib/atlas/request-body';
import {
  normalizeParcelMatches,
  parcelRowLimit,
  readMapPoint,
} from '@/lib/atlas/map-property';

export const maxDuration = 30;
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST to look up a map location.' },
    { status: 405, headers: { ...headers, Allow: 'POST' } },
  );
}

export async function POST(request: Request) {
  let point;
  try {
    point = await readMapPoint(request);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof LookupInputError
            ? error.message
            : 'Invalid map location.',
      },
      {
        status: error instanceof LookupInputError ? error.status : 400,
        headers,
      },
    );
  }
  const params = new URLSearchParams({
    $where: `roll_year = 2026 AND assessment_class_description = 'Residential' AND intersects(multipolygon, 'POINT (${point.longitude} ${point.latitude})')`,
    $order: 'roll_number,unique_key',
    $limit: String(parcelRowLimit + 1),
  });
  try {
    const response = await fetch(
      `https://data.calgary.ca/resource/4bsw-nn7w.json?${params}`,
      {
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error('Source unavailable');
    const result = normalizeParcelMatches(await response.json(), point);
    return NextResponse.json(
      {
        ...result,
        match: 'parcel',
        fetchedAt: new Date().toISOString(),
        source: 'City of Calgary',
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'The City’s property map service is temporarily unavailable. Try again or search by address.',
      },
      { status: 503, headers },
    );
  }
}
