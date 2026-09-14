import { NextResponse } from 'next/server';
import { parseCalgaryAqhi } from '@/lib/atlas/air-quality';
const SOURCE =
  'https://dd.weather.gc.ca/today/air_quality/aqhi/pnr/observation/realtime/xml/AQ_OBS_IAKID_CURRENT.xml';
export async function GET() {
  try {
    const response = await fetch(SOURCE, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('Observation unavailable');
    const observation = parseCalgaryAqhi(await response.text());
    return NextResponse.json(
      { ...observation, live: true, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, max-age=600' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'The latest observation could not be retrieved.' },
      { status: 503 },
    );
  }
}
