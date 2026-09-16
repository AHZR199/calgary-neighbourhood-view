import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bearingLabel,
  calgaryLocalTime,
  calgaryTimeParts,
  formatSolarTime,
  solarDay,
  solarPosition,
} from '../lib/atlas/solar';

const lat = 51.0447,
  lon = -114.0719;
const near = (actual: number, expected: number, tolerance: number) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );

test('approximate solar position agrees with the published NREL reference case', () => {
  // Reda & Andreas (2008), appendix A.4: 12:30:30 MST, 17 October 2003.
  // https://docs.nrel.gov/docs/fy08osti/34302.pdf
  // this simpler NOAA model does not claim SPA precision or atmospheric correction.
  const position = solarPosition(
    new Date('2003-10-17T19:30:30Z'),
    39.742476,
    -105.1786,
  );
  near(position.azimuth, 194.34024, 0.5);
  near(position.elevation, 90 - 50.11162, 0.5);
});

test('Calgary solstice height and daylight reflect its northern latitude', () => {
  const summer = solarDay('2026-06-21', lat, lon);
  const winter = solarDay('2026-12-21', lat, lon);
  near(summer.maxElevation, 90 - lat + 23.44, 0.2);
  near(winter.maxElevation, 90 - lat - 23.44, 0.2);
  near(summer.daylightMinutes!, 16.56 * 60, 6);
  near(winter.daylightMinutes!, 7.91 * 60, 6);
  assert.ok(summer.sunrise && summer.sunset && winter.sunrise && winter.sunset);
  assert.ok(solarPosition(summer.sunrise, lat, lon).azimuth < 90);
  assert.ok(solarPosition(winter.sunrise, lat, lon).azimuth > 90);
  assert.ok(solarPosition(summer.sunset, lat, lon).azimuth > 270);
  assert.ok(solarPosition(winter.sunset, lat, lon).azimuth < 270);
  near(solarPosition(summer.solarNoon, lat, lon).azimuth, 180, 0.1);
});

test('rise and set cross the conventional horizon on the correct Calgary date', () => {
  const day = solarDay('2026-06-21', lat, lon);
  for (const at of [day.sunrise, day.sunset]) {
    assert.ok(at);
    assert.equal(calgaryTimeParts(at).date, '2026-06-21');
    near(solarPosition(at, lat, lon).elevation, -0.833, 0.01);
  }
  assert.equal(formatSolarTime(day.sunrise), '5:21 am');
  assert.equal(formatSolarTime(day.sunset), '9:55 pm');
});

test('time conversion observes historical DST and the permanent Alberta time change', () => {
  assert.equal(
    calgaryLocalTime('2026-01-15', 720)?.toISOString(),
    '2026-01-15T19:00:00.000Z',
  );
  assert.equal(
    calgaryLocalTime('2026-07-15', 720)?.toISOString(),
    '2026-07-15T18:00:00.000Z',
  );
  assert.equal(
    calgaryLocalTime('2026-12-21', 720)?.toISOString(),
    '2026-12-21T18:00:00.000Z',
  );
  assert.equal(
    calgaryLocalTime('2027-01-15', 720)?.toISOString(),
    '2027-01-15T18:00:00.000Z',
  );
  assert.equal(calgaryTimeParts(new Date('2026-12-21T18:00Z')).zone, 'ABT');
  const summer = solarDay('2026-06-21', lat, lon),
    winter = solarDay('2026-12-21', lat, lon);
  assert.equal(calgaryTimeParts(summer.solarNoon).offsetMinutes, -360);
  assert.equal(calgaryTimeParts(winter.solarNoon).offsetMinutes, -360);
});

test('spring missing times are rejected and historical autumn repeats use the first occurrence', () => {
  assert.equal(calgaryLocalTime('2026-03-08', 150), null);
  assert.equal(
    calgaryLocalTime('2026-03-08', 180)?.toISOString(),
    '2026-03-08T09:00:00.000Z',
  );
  assert.equal(
    calgaryLocalTime('2025-11-02', 90)?.toISOString(),
    '2025-11-02T07:30:00.000Z',
  );
  const springDay = solarDay('2026-03-08', lat, lon);
  assert.ok(
    !springDay.samples.some(({ minutes }) => minutes >= 120 && minutes < 180),
  );
  const autumn2026Start = calgaryLocalTime('2026-11-01', 0)!;
  const autumn2026End = calgaryLocalTime('2026-11-02', 0)!;
  assert.equal(
    (autumn2026End.getTime() - autumn2026Start.getTime()) / 3_600_000,
    24,
  );
});

test('leap dates are real calendar dates and invalid input never rolls into another month', () => {
  assert.ok(calgaryLocalTime('2024-02-29', 720));
  assert.equal(calgaryLocalTime('2023-02-29', 720), null);
  assert.equal(calgaryLocalTime('2026-04-31', 720), null);
  assert.equal(calgaryLocalTime('2026-06-21', 1440), null);
  assert.equal(calgaryLocalTime('2026-06-21', NaN), null);
  assert.throws(() => solarDay('2026-13-10', lat, lon), RangeError);
  const leapDay = solarDay('2024-02-29', lat, lon);
  assert.ok(leapDay.daylightMinutes! > 600 && leapDay.daylightMinutes! < 700);
});

test('bearings use east-positive longitude and north-clockwise direction without changing with viewer location', () => {
  const morning = solarPosition(new Date('2026-06-21T15:00:00Z'), lat, lon);
  const evening = solarPosition(new Date('2026-06-22T01:00:00Z'), lat, lon);
  assert.ok(morning.azimuth > 60 && morning.azimuth < 150);
  assert.ok(evening.azimuth > 240 && evening.azimuth < 310);
  assert.ok(morning.aboveHorizon && evening.aboveHorizon);
  const midnight = solarPosition(calgaryLocalTime('2026-12-21', 0)!, lat, lon);
  assert.ok(!midnight.aboveHorizon && midnight.elevation < -50);
  assert.equal(bearingLabel(359), 'N');
  assert.equal(bearingLabel(90), 'E');
  assert.equal(bearingLabel(180), 'S');
  assert.equal(bearingLabel(270), 'W');
  assert.throws(() => solarPosition(new Date('invalid'), lat, lon), RangeError);
  assert.throws(() => solarPosition(new Date(), NaN, lon), RangeError);
});
