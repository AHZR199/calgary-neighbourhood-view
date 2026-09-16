'use client';

import { useId, useMemo, useState } from 'react';
import { Sun, Sunrise, Sunset } from 'lucide-react';
import {
  bearingLabel,
  calgaryLocalTime,
  calgaryTimeParts,
  formatSolarTime,
  solarDay,
  solarPosition,
  type SolarSample,
} from '@/lib/atlas/solar';
import './solar.css';

const sides = {
  N: {
    degrees: 0,
    name: 'North',
    advice:
      'Often more indirect daylight. Early or late summer sun may reach a north-facing side; winter direct sun is limited.',
  },
  NE: {
    degrees: 45,
    name: 'Northeast',
    advice:
      'Favours early morning light, especially in summer. Expect less winter direct sun than a south-facing side.',
  },
  E: {
    degrees: 90,
    name: 'East',
    advice:
      'A good starting point if you value morning sun. Low morning angles can create glare, so check blinds and nearby obstructions.',
  },
  SE: {
    degrees: 135,
    name: 'Southeast',
    advice:
      'Combines morning sun with some useful winter exposure. Check nearby shade and how much glass faces this direction.',
  },
  S: {
    degrees: 180,
    name: 'South',
    advice:
      'Useful for winter daylight and potential passive heat. Summer shading and the amount and type of glazing still matter.',
  },
  SW: {
    degrees: 225,
    name: 'Southwest',
    advice:
      'Combines afternoon light with winter exposure. Shading matters where summer sun can warm large areas of glass.',
  },
  W: {
    degrees: 270,
    name: 'West',
    advice:
      'Useful if you value afternoon and evening sun. Low western sun can mean summer heat and glare, especially through large windows.',
  },
  NW: {
    degrees: 315,
    name: 'Northwest',
    advice:
      'Can catch late summer-evening sun. Winter direct sun is more limited, so visit at the times you would use this space.',
  },
};
type Side = keyof typeof sides;
const point = (bearing: number, radius: number) => ({
  x: 100 + radius * Math.sin((bearing * Math.PI) / 180),
  y: 100 - radius * Math.cos((bearing * Math.PI) / 180),
});
const duration = (minutes: number | null) =>
  minutes === null
    ? 'Unavailable'
    : `${Math.floor(Math.round(minutes) / 60)}h ${String(Math.round(minutes) % 60).padStart(2, '0')}m`;

function SunCompass({
  azimuth,
  elevation,
  side,
}: {
  azimuth: number;
  elevation: number;
  side: Side | '';
}) {
  const sun = point(azimuth, 69);
  const facing = side ? point(sides[side].degrees, 45) : null;
  return (
    <svg
      viewBox="0 0 200 200"
      className="solar-compass"
      role="img"
      aria-label={`Sun bearing ${Math.round(azimuth)} degrees, ${bearingLabel(azimuth)}, from true north. Sun centre ${elevation > 0 ? 'above' : 'below'} the geometric horizon.`}
    >
      <circle cx="100" cy="100" r="74" className="solar-compass-ring" />
      <circle cx="100" cy="100" r="49" className="solar-compass-inner" />
      {Array.from({ length: 24 }, (_, index) => {
        const a = point(index * 15, index % 6 === 0 ? 62 : 68),
          b = point(index * 15, 74);
        return (
          <line
            key={index}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="solar-compass-tick"
          />
        );
      })}
      {[
        ['N', 0],
        ['NE', 45],
        ['E', 90],
        ['SE', 135],
        ['S', 180],
        ['SW', 225],
        ['W', 270],
        ['NW', 315],
      ].map(([label, angle]) => {
        const p = point(Number(angle), 91);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            className="solar-cardinal"
          >
            {label}
          </text>
        );
      })}
      {facing && (
        <line
          x1="100"
          y1="100"
          x2={facing.x}
          y2={facing.y}
          className="solar-facing-line"
        />
      )}
      <line
        x1="100"
        y1="100"
        x2={sun.x}
        y2={sun.y}
        className={elevation > 0 ? 'solar-sun-line' : 'solar-sun-line is-below'}
      />
      <circle cx="100" cy="100" r="4" fill="#315d7a" />
      <circle
        cx={sun.x}
        cy={sun.y}
        r="8"
        className={elevation > 0 ? 'solar-sun-dot' : 'solar-sun-dot is-below'}
      />
      {elevation > 0 &&
        Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          return (
            <line
              key={index}
              x1={sun.x + 11 * Math.sin(angle)}
              y1={sun.y + 11 * Math.cos(angle)}
              x2={sun.x + 14 * Math.sin(angle)}
              y2={sun.y + 14 * Math.cos(angle)}
              stroke="#8e7539"
              strokeWidth="1.4"
            />
          );
        })}
    </svg>
  );
}

function SunHeightChart({
  samples,
  minutes,
  elevation,
  zone,
}: {
  samples: SolarSample[];
  minutes: number;
  elevation: number;
  zone: string;
}) {
  const x = (minute: number) => 38 + (minute / 1440) * 284;
  const y = (degrees: number) => 26 + ((90 - degrees) / 180) * 126;
  const path = samples
    .map(
      (sample, index) =>
        `${index && sample.minutes - samples[index - 1].minutes === 30 ? 'L' : 'M'}${x(sample.minutes).toFixed(1)},${y(sample.elevation).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg
      className="solar-height-chart"
      viewBox="0 0 336 188"
      role="img"
      aria-label={`Approximate sun height through the day. Vertical axis: elevation in degrees, minus 90 to 90. Horizontal axis: Calgary time, midnight to midnight, ${zone}.`}
    >
      <text x="38" y="12" className="solar-axis-title">
        Sun height (°)
      </text>
      {[-90, -45, 0, 45, 90].map((degrees) => (
        <g key={degrees}>
          <line
            x1="38"
            y1={y(degrees)}
            x2="322"
            y2={y(degrees)}
            className={
              degrees === 0 ? 'solar-horizon-line' : 'solar-chart-grid'
            }
          />
          <text x="30" y={y(degrees) + 3} textAnchor="end">
            {degrees}°
          </text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map((hour) => (
        <text key={hour} x={x(hour * 60)} y="168" textAnchor="middle">
          {String(hour).padStart(2, '0')}
        </text>
      ))}
      <text x="322" y="184" textAnchor="end">
        Calgary time · {zone}
      </text>
      <path d={path} fill="none" stroke="#5c809d" strokeWidth="2.2" />
      <line
        x1={x(minutes)}
        y1="26"
        x2={x(minutes)}
        y2="152"
        stroke="#789cb8"
        strokeDasharray="3 4"
      />
      <circle
        cx={x(minutes)}
        cy={y(elevation)}
        r="4"
        fill="#315d7a"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}

// coordinates are the selected property's latitude and longitude, in decimal degrees.
export function SolarPanel({
  latitude,
  longitude,
  locationLabel = 'this property',
}: {
  latitude: number;
  longitude: number;
  locationLabel?: string;
}) {
  const id = useId();
  const [today] = useState(() => calgaryTimeParts(new Date()).date);
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState(12 * 60);
  const [side, setSide] = useState<Side | ''>('');
  const selectedDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= '2000-01-01' &&
    date <= '2100-12-31'
      ? date
      : today;
  const at = calgaryLocalTime(selectedDate, minutes);
  const validLocation =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 50 &&
    latitude <= 52 &&
    longitude >= -116 &&
    longitude <= -112;
  const day = useMemo(
    () => (validLocation ? solarDay(selectedDate, latitude, longitude) : null),
    [selectedDate, latitude, longitude, validLocation],
  );
  const year = selectedDate.slice(0, 4);
  const seasons = useMemo(
    () =>
      validLocation
        ? [
            {
              label: 'June 21',
              date: `${year}-06-21`,
              day: solarDay(`${year}-06-21`, latitude, longitude),
            },
            {
              label: 'December 21',
              date: `${year}-12-21`,
              day: solarDay(`${year}-12-21`, latitude, longitude),
            },
          ]
        : [],
    [year, latitude, longitude, validLocation],
  );
  if (!validLocation || !day)
    return (
      <section className="solar-panel">
        <h3>Sun & orientation</h3>
        <p className="quiet-note">
          Choose a Calgary address with a mapped location to explore the sun’s
          direction.
        </p>
      </section>
    );
  const position = at ? solarPosition(at, latitude, longitude) : null;
  const zone = calgaryTimeParts(at ?? day.solarNoon).zone;
  const startZone = calgaryTimeParts(calgaryLocalTime(selectedDate, 0)!).zone;
  const endZone = calgaryTimeParts(calgaryLocalTime(selectedDate, 1425)!).zone;
  const chartZone =
    startZone === endZone ? startZone : `${startZone} / ${endZone}`;
  const inFront =
    position &&
    side &&
    position.elevation > 0 &&
    Math.cos(((position.azimuth - sides[side].degrees) * Math.PI) / 180) > 0;
  return (
    <section className="solar-panel" aria-labelledby={`${id}-heading`}>
      <div className="solar-heading">
        <h3 id={`${id}-heading`}>Sun & orientation</h3>
        <span>
          <Sun size={13} aria-hidden="true" /> Modelled
        </span>
      </div>
      <p className="solar-intro">
        Explore where the sun would be at {locationLabel}. The home’s windows,
        trees and surrounding buildings are not mapped here.
      </p>
      <div className="solar-date-controls">
        <label htmlFor={`${id}-date`}>
          Date
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            min="2000-01-01"
            max="2100-12-31"
            onChange={(event) => {
              const next = event.target.value;
              if (!next || calgaryLocalTime(next, 720)) setDate(next);
            }}
            onBlur={() => setDate(selectedDate)}
          />
        </label>
        <div className="solar-presets" aria-label="Choose a reference date">
          <button
            type="button"
            aria-pressed={date === today}
            onClick={() => setDate(today)}
          >
            Today
          </button>
          <button
            type="button"
            aria-pressed={date === `${year}-06-21`}
            onClick={() => setDate(`${year}-06-21`)}
          >
            Summer
          </button>
          <button
            type="button"
            aria-pressed={date === `${year}-12-21`}
            onClick={() => setDate(`${year}-12-21`)}
          >
            Winter
          </button>
        </div>
      </div>
      <label className="solar-time-label" htmlFor={`${id}-time`}>
        <span>
          Calgary time <small>{zone}</small>
        </span>
        <strong>{at ? formatSolarTime(at) : 'Skipped clock hour'}</strong>
      </label>
      <input
        id={`${id}-time`}
        className="solar-time-range"
        type="range"
        min="0"
        max="1425"
        step="15"
        value={minutes}
        aria-valuetext={
          at
            ? `${formatSolarTime(at)} ${zone}`
            : 'This time does not occur during the daylight saving change'
        }
        onChange={(event) => setMinutes(+event.target.value)}
      />
      {position ? (
        <>
          <div className="solar-position">
            <SunCompass
              azimuth={position.azimuth}
              elevation={position.elevation}
              side={side}
            />
            <div
              className="solar-reading"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>Sun direction</span>
              <strong>
                {bearingLabel(position.azimuth)}{' '}
                <small>{Math.round(position.azimuth)}°</small>
              </strong>
              <span>Clockwise from true north</span>
              <p>
                <b>{Math.round(Math.abs(position.elevation))}°</b>{' '}
                {position.elevation > 0 ? 'above' : 'below'} the horizon
              </p>
              {position.elevation < -0.833 && (
                <small>Sun centre is below the horizon.</small>
              )}
            </div>
          </div>
          <SunHeightChart
            samples={day.samples}
            minutes={minutes}
            elevation={position.elevation}
            zone={chartZone}
          />
        </>
      ) : (
        <p className="quiet-note" role="status">
          This local time is skipped when the clocks move forward. Choose a time
          after 3 am.
        </p>
      )}
      <div className="solar-events">
        <div>
          <Sunrise size={16} aria-hidden="true" />
          <span>Sunrise</span>
          <strong>{formatSolarTime(day.sunrise)}</strong>
        </div>
        <div>
          <Sun size={16} aria-hidden="true" />
          <span>Daylight</span>
          <strong>{duration(day.daylightMinutes)}</strong>
        </div>
        <div>
          <Sunset size={16} aria-hidden="true" />
          <span>Sunset</span>
          <strong>{formatSolarTime(day.sunset)}</strong>
        </div>
      </div>
      <p className="solar-note">
        Approximate times for an unobstructed horizon. Daylight is not the
        number of hours of sun reaching the home.
      </p>
      <div className="solar-season-grid">
        {seasons.map((season) => (
          <button
            key={season.date}
            type="button"
            onClick={() => setDate(season.date)}
            aria-label={`Show sun path for ${season.label}, ${year}`}
          >
            <span>{season.label}</span>
            <strong>{duration(season.day.daylightMinutes)}</strong>
            <small>{Math.round(season.day.maxElevation)}° highest sun</small>
          </button>
        ))}
      </div>
      <div className="solar-orientation">
        <label htmlFor={`${id}-facing`}>
          Window or garden faces
          <select
            id={`${id}-facing`}
            aria-label="Window or garden faces"
            value={side}
            onChange={(event) => setSide(event.target.value as Side | '')}
          >
            <option value="">Choose a direction</option>
            {Object.entries(sides).map(([value, item]) => (
              <option key={value} value={value}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {side && (
          <>
            <p>{sides[side].advice}</p>
            {position && (
              <p className="solar-facing-result">
                {position.elevation <= 0
                  ? 'The sun’s centre is at or below the horizon. Visibility near sunrise and sunset can vary.'
                  : inFront
                    ? 'At this time, the sun is in front of a surface facing this direction, if unobstructed.'
                    : 'At this time, the sun is behind a surface facing this direction.'}
              </p>
            )}
          </>
        )}
        <p className="solar-note">
          You choose the facing direction; it is not inferred from the address.
          There is no single ideal orientation: compare the rooms you use, your
          preferred time of day, shading and summer comfort.
        </p>
      </div>
      <details className="solar-method">
        <summary>Method & sources</summary>
        <p>
          Calculated on your device from the property’s map coordinates and
          NOAA’s approximate solar equations. Bearings use true north, not
          magnetic north. Height is geometric elevation; sunrise and sunset use
          the conventional −0.833° horizon threshold. This is a planning aid,
          not a shadow study, solar-panel design or an energy estimate.
        </p>
        <p>
          Times follow Calgary’s historical time zone and Alberta’s permanent
          UTC−6 time from November 2026. On older autumn dates, a repeated clock
          hour uses its first occurrence. Dates and facing choices are not saved
          or sent to a solar service.
        </p>
        <div className="solar-source-links">
          <a
            href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF"
            target="_blank"
            rel="noreferrer"
          >
            NOAA equations
          </a>
          <a
            href="https://prod-natural-resources.azure.cloud.nrcan-rncan.gc.ca/energy-efficiency/home-energy-efficiency/keeping-heat-section-8-upgrading-windows-exterior-doors"
            target="_blank"
            rel="noreferrer"
          >
            NRCan window guidance
          </a>
          <a
            href="https://www.alberta.ca/albertas-new-time-system-abt"
            target="_blank"
            rel="noreferrer"
          >
            Alberta time
          </a>
        </div>
      </details>
    </section>
  );
}
