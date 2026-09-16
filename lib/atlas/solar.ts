// approximate solar geometry from NOAA's published general solar equations.
// longitude is positive east; bearings are clockwise from true north.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF

const DEG = Math.PI / 180;
const MINUTE = 60_000;
const DAY = 86_400_000;
const ALBERTA_TIME_START = Date.UTC(2026, 10, 1, 6);
const localFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Edmonton',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface SolarPosition {
  azimuth: number;
  elevation: number;
  aboveHorizon: boolean;
}

export interface SolarSample extends SolarPosition {
  minutes: number;
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function solarPosition(
  at: Date,
  latitude: number,
  longitude: number,
): SolarPosition {
  if (
    !Number.isFinite(at.getTime()) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new RangeError('A valid date and coordinates are required.');
  }
  const year = at.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const daysInYear = (Date.UTC(year + 1, 0, 1) - yearStart) / DAY;
  const utcMinutes =
    at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  const dayOfYear = Math.floor((at.getTime() - yearStart) / DAY) + 1;
  const gamma =
    ((2 * Math.PI) / daysInYear) *
    (dayOfYear - 1 + (utcMinutes / 60 - 12) / 24);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const hourAngle =
    (wrap(utcMinutes + equationOfTime + 4 * longitude, 1440) / 4 - 180) * DEG;
  const lat = latitude * DEG;
  const elevation =
    Math.asin(
      clamp(
        Math.sin(lat) * Math.sin(declination) +
          Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
      ),
    ) / DEG;
  const azimuth = wrap(
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) -
        Math.tan(declination) * Math.cos(lat),
    ) /
      DEG +
      180,
    360,
  );
  return { azimuth, elevation, aboveHorizon: elevation > 0 };
}

// older browser timezone data may still move Alberta back to UTC−7 in 2026.
// https://www.alberta.ca/albertas-new-time-system-abt
export function calgaryTimeParts(at: Date) {
  if (!Number.isFinite(at.getTime())) throw new RangeError('Invalid date.');
  if (at.getTime() >= ALBERTA_TIME_START) {
    const shifted = new Date(at.getTime() - 6 * 60 * MINUTE);
    return {
      date: shifted.toISOString().slice(0, 10),
      minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
      offsetMinutes: -360,
      zone: 'ABT',
    };
  }
  const parts = Object.fromEntries(
    localFormatter.formatToParts(at).map(({ type, value }) => [type, value]),
  );
  const localUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
  );
  const offsetMinutes = Math.round(
    (localUtc - Math.floor(at.getTime() / MINUTE) * MINUTE) / MINUTE,
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: +parts.hour * 60 + +parts.minute,
    offsetMinutes,
    zone: offsetMinutes === -360 ? 'MDT' : 'MST',
  };
}

function dateStart(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(value.getTime()) ||
    value.toISOString().slice(0, 10) !== date
  )
    return null;
  return value.getTime();
}

export function calgaryLocalTime(date: string, minutes: number): Date | null {
  const day = dateStart(date);
  if (
    day === null ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes >= 1440
  )
    return null;
  // an autumn repeated hour uses the first occurrence; spring's missing hour is rejected.
  for (const offset of [-360, -420]) {
    const at = new Date(day + (minutes - offset) * MINUTE);
    const local = calgaryTimeParts(at);
    if (local.date === date && local.minutes === minutes) return at;
  }
  return null;
}

export function solarDay(date: string, latitude: number, longitude: number) {
  const day = dateStart(date);
  if (day === null) throw new RangeError('Invalid calendar date.');
  const nextDate = new Date(day + DAY).toISOString().slice(0, 10);
  const start = calgaryLocalTime(date, 0);
  const end = calgaryLocalTime(nextDate, 0);
  if (!start || !end)
    throw new RangeError('The local date could not be resolved.');
  const position = (time: number) =>
    solarPosition(new Date(time), latitude, longitude);
  const startMs = start.getTime(),
    endMs = end.getTime();
  let sunrise: Date | null = null,
    sunset: Date | null = null;
  let peakMs = startMs,
    maxElevation = -90;
  let previousTime = startMs;
  let previousHeight = position(startMs).elevation;
  // the conventional −0.833° threshold approximates refraction and the sun's radius.
  const threshold = -0.833;
  for (let time = startMs + 10 * MINUTE; time <= endMs; time += 10 * MINUTE) {
    const height = position(time).elevation;
    if (height > maxElevation) {
      maxElevation = height;
      peakMs = time;
    }
    if (previousHeight < threshold !== height < threshold) {
      let low = previousTime,
        high = time;
      const rising = height > previousHeight;
      for (let i = 0; i < 16; i++) {
        const mid = (low + high) / 2;
        if (position(mid).elevation < threshold === rising) low = mid;
        else high = mid;
      }
      if (rising) sunrise = new Date((low + high) / 2);
      else sunset = new Date((low + high) / 2);
    }
    previousTime = time;
    previousHeight = height;
  }
  let low = Math.max(startMs, peakMs - 10 * MINUTE),
    high = Math.min(endMs, peakMs + 10 * MINUTE);
  for (let i = 0; i < 24; i++) {
    const a = low + (high - low) / 3,
      b = high - (high - low) / 3;
    if (position(a).elevation > position(b).elevation) high = b;
    else low = a;
  }
  const solarNoon = new Date((low + high) / 2);
  const samples: SolarSample[] = [];
  for (let minutes = 0; minutes < 1440; minutes += 30) {
    const at = calgaryLocalTime(date, minutes);
    if (at)
      samples.push({ minutes, ...solarPosition(at, latitude, longitude) });
  }
  samples.push({ minutes: 1440, ...position(endMs) });
  return {
    sunrise,
    sunset,
    solarNoon,
    maxElevation: position(solarNoon.getTime()).elevation,
    daylightMinutes:
      sunrise && sunset
        ? (sunset.getTime() - sunrise.getTime()) / MINUTE
        : null,
    samples,
  };
}

export function bearingLabel(azimuth: number) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
    Math.round(wrap(azimuth, 360) / 45) % 8
  ];
}

export function formatSolarTime(at: Date | null) {
  if (!at) return 'Unavailable';
  const { minutes } = calgaryTimeParts(
    new Date(Math.round(at.getTime() / MINUTE) * MINUTE),
  );
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}
