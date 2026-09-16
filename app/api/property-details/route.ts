import { NextRequest, NextResponse } from 'next/server';
import { LookupInputError, readLookupFields } from '@/lib/atlas/request-body';
import {
  normalizeAssessmentRoll,
  saleHistoryAvailability,
} from '@/lib/atlas/property-records';
export const maxDuration = 30;
const normalize = (value: string) =>
  value.trim().replace(/^#/, '').replace(/\s+/g, ' ').toUpperCase();
const literal = (value: string) => value.replace(/'/g, "''");
const materialLabel = (value: string) =>
  value.includes('(PEX)')
    ? 'PEX'
    : value.includes('(PVC)')
      ? 'PVC'
      : value.includes('(YDI)')
        ? 'Jacketed ductile iron'
        : value.includes('(DI)')
          ? 'Ductile iron'
          : value.includes('(CI)')
            ? 'Cast iron'
            : value;
async function query(dataset: string, where: string, select: string) {
  const params = new URLSearchParams({
    $where: where,
    $select: select,
    $limit: '1000',
  });
  const r = await fetch(
    `https://data.calgary.ca/resource/${dataset}.json?${params}`,
    { signal: AbortSignal.timeout(12000), cache: 'no-store' },
  );
  if (!r.ok) throw Error('Source unavailable');
  const rows = (await r.json()) as Record<string, unknown>[];
  if (rows.length === 1000)
    throw Error('Record set exceeds reviewed display limit');
  return rows;
}
export async function GET(request: NextRequest) {
  return lookup(
    request.nextUrl.searchParams.get('address') || '',
    request.nextUrl.searchParams.get('roll') || '',
  );
}
export async function POST(request: Request) {
  try {
    const fields = await readLookupFields(request, ['address', 'roll']);
    return await lookup(fields.address || '', fields.roll || '');
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
async function lookup(rawAddress: string, roll: string) {
  const address = normalize(rawAddress);
  if (address.length < 4 || address.length > 90 || !/^\d{6,12}$/.test(roll))
    return NextResponse.json(
      { error: 'A valid address and assessment account are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  const parts = address.split(' '),
    candidate =
      parts.length >= 6 && /^\d/.test(parts[1])
        ? parts.slice(1).join(' ')
        : null;
  const addresses = [
    address,
    '#' + address,
    ...(candidate ? [candidate, '#' + candidate] : []),
  ];
  const pipePromise = query(
    'ta76-7bfx',
    `upper(water_service_address) in (${addresses.map((a) => `'${literal(a)}'`).join(',')})`,
    'water_service_address,material_type,pipe_diameter_mm,installed_date,building_type',
  ).then((rows) => {
    const exact = rows.filter(
        (r) => normalize(String(r.water_service_address)) === address,
      ),
      building = rows.filter(
        (r) =>
          candidate && normalize(String(r.water_service_address)) === candidate,
      ),
      chosen = exact.length ? exact : building;
    const knownMaterials = [
      ...new Set(
        chosen
          .map((r) => materialLabel(String(r.material_type || 'Unknown')))
          .filter((m) => !['Unknown', 'Other'].includes(m)),
      ),
    ];
    const quality = exact.length
      ? 'exact-address'
      : building.length
        ? 'building-candidate'
        : 'unmatched';
    const records = chosen.map((r) => ({
      material: String(r.material_type || 'Unknown'),
      materialLabel: materialLabel(String(r.material_type || 'Unknown')),
      installedDate: r.installed_date ? String(r.installed_date) : undefined,
      diameterMm: r.pipe_diameter_mm ? Number(r.pipe_diameter_mm) : null,
    }));
    return {
      matchQuality: quality,
      matchLabel: exact.length
        ? 'City address match'
        : building.length
          ? 'Building address candidate'
          : 'No matching public record',
      knownMaterials,
      materialSummary: knownMaterials.length
        ? knownMaterials.join(' + ') +
          (building.length && !exact.length ? ' (building candidate)' : '')
        : 'Not available',
      installedYears: [
        ...new Set(
          records.flatMap((r) =>
            r.installedDate && Number(r.installedDate.slice(0, 4)) > 1900
              ? [Number(r.installedDate.slice(0, 4))]
              : [],
          ),
        ),
      ],
      records,
      scope: 'public-service-only',
      privatePlumbingStatus: 'unverified',
    };
  });
  const historicalRoll = roll.replace(/^0+/, '') || '0';
  const historyPromise = query(
    '4ur7-wsgc',
    `roll_number in ('${roll}','${historicalRoll}') AND roll_year between '2017' and '2025'`,
    'roll_year,roll_number,address,assessed_value',
  ).then((rows) => {
    const years = new Map<number, Set<number>>();
    for (const r of rows) {
      if (normalizeAssessmentRoll(r.roll_number) !== historicalRoll) continue;
      const year = Number(r.roll_year),
        value = Number(String(r.assessed_value || '').replaceAll(',', ''));
      if (
        !Number.isInteger(year) ||
        year < 2017 ||
        year > 2025 ||
        !Number.isFinite(value) ||
        value <= 0
      )
        continue;
      if (!years.has(year)) years.set(year, new Set());
      years.get(year)!.add(value);
    }
    return Array.from(years, ([year, values]) => ({
      year,
      assessedValue: values.size === 1 ? [...values][0] : null,
      status: values.size === 1 ? 'recorded' : 'conflicting-source-records',
    })).sort((a, b) => a.year - b.year);
  });
  const results = await Promise.allSettled([pipePromise, historyPromise]);
  return NextResponse.json(
    {
      pipe: results[0].status === 'fulfilled' ? results[0].value : null,
      history: results[1].status === 'fulfilled' ? results[1].value : null,
      saleHistory: saleHistoryAvailability,
      sourceStatus: { water: results[0].status, history: results[1].status },
      fetchedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
