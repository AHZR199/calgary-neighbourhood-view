import { NextRequest, NextResponse } from 'next/server';
import { LookupInputError, readLookupFields } from '@/lib/atlas/request-body';
export const maxDuration = 30;
export async function GET(request: NextRequest) {
  return lookup(
    request.nextUrl.searchParams.get('q') || '',
    request.nextUrl.searchParams.get('community') || '',
  );
}
export async function POST(request: Request) {
  try {
    const fields = await readLookupFields(request, ['q', 'community']);
    return await lookup(fields.q || '', fields.community || '');
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof LookupInputError
            ? error.message
            : 'Invalid lookup request.',
      },
      {
        status: error instanceof LookupInputError ? error.status : 400,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
async function lookup(query: string, community: string) {
  const q = query.trim().toUpperCase();
  const code = community.trim().toUpperCase();
  if (!code && (q.length < 3 || q.length > 80 || !/[0-9]/.test(q)))
    return NextResponse.json(
      { error: 'Enter at least three characters including a street number.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  if (code && !/^[A-Z0-9]{3}$/.test(code))
    return NextResponse.json(
      { error: 'Invalid community.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  const safe = q.replace(/'/g, "''").replace(/[%_]/g, '');
  const where = code
    ? `comm_code = '${code}' AND assessment_class_description = 'Residential' AND property_type = 'LI'`
    : `upper(address) like '%${safe}%' AND assessment_class_description = 'Residential'`;
  const params = new URLSearchParams({
    $where: `roll_year = 2026 AND (${where})`,
    $limit: '40',
    $order: 'address,roll_number',
  });
  try {
    const response = await fetch(
      `https://data.calgary.ca/resource/4bsw-nn7w.json?${params}`,
      { signal: AbortSignal.timeout(20000), cache: 'no-store' },
    );
    if (!response.ok) throw new Error('Source unavailable');
    const rows = (await response.json()) as Record<string, unknown>[];
    const seen = new Set<string>();
    const records = rows.flatMap((r) => {
      const geometry = r.multipolygon as
        { type: 'MultiPolygon'; coordinates: number[][][][] } | undefined;
      const ring = geometry?.coordinates?.[0]?.[0];
      if (!ring?.length || seen.has(String(r.roll_number))) return [];
      seen.add(String(r.roll_number));
      const pts = ring.slice(0, -1);
      const longitude = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const latitude = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (
        !Number.isFinite(longitude) ||
        longitude < -115 ||
        longitude > -113 ||
        latitude < 50 ||
        latitude > 52
      )
        return [];
      return [
        {
          recordId: String(r.id || `${r.roll_year}${r.roll_number}`),
          rollNumber: String(r.roll_number),
          address: String(r.address),
          communityCode: String(r.comm_code),
          communityName: String(r.comm_name),
          rollYear: Number(r.roll_year),
          assessedValue: Number(r.assessed_value),
          residentialAssessedValue: Number(
            r.re_assessed_value || r.assessed_value,
          ),
          nonResidentialAssessedValue: Number(r.nr_assessed_value || 0),
          yearBuilt: r.year_of_construction
            ? Number(r.year_of_construction)
            : null,
          subPropertyUse: String(r.sub_property_use || ''),
          longitude,
          latitude,
          geometry,
          sourceUrl: 'https://data.calgary.ca/d/4bsw-nn7w',
        },
      ];
    });
    return NextResponse.json(
      {
        records,
        fetchedAt: new Date().toISOString(),
        source: 'City of Calgary',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'The City’s address service is temporarily unavailable. You can still explore the included properties.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
