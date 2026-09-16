'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, ChevronRight, RefreshCw } from 'lucide-react';
import type { Community, Property } from '@/lib/atlas/data';
import { communityLabel } from '@/lib/atlas/data';
import {
  listSchools,
  schoolWebsite,
  type SchoolData,
  type SchoolLevel,
  type SchoolMatch,
} from '@/lib/atlas/schools';
import './schools.css';

type GradeFilter = 'all' | SchoolLevel;
type SchoolScope = 'area' | 'nearby';
type Radius = 3 | 5 | 10 | null;
interface SchoolProps {
  community: Community;
  property: Property | null;
  compact?: boolean;
  onMore?: () => void;
  onSource?: (id: string) => void;
}
const gradeFilters: { id: GradeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'elementary', label: 'Elementary' },
  { id: 'juniorHigh', label: 'Junior high' },
  { id: 'high', label: 'High school' },
  { id: 'unknown', label: 'Level not reported' },
];
const boardFinders = [
  { label: 'CBE school finder', url: 'https://www.cbe.ab.ca/find-a-school' },
  { label: 'Calgary Catholic schools', url: 'https://www.cssd.ab.ca/schools' },
  {
    label: 'FrancoSud school finder',
    url: 'https://francosud.ca/trouver-une-ecole/',
  },
];
let schoolRequest: Promise<SchoolData> | null = null;
function loadSchools() {
  if (!schoolRequest)
    schoolRequest = fetch('/data/schools.geojson')
      .then(async (response) => {
        if (!response.ok) throw new Error('School records unavailable');
        const data = (await response.json()) as SchoolData;
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features))
          throw new Error('School records unavailable');
        return data;
      })
      .catch((error) => {
        schoolRequest = null;
        throw error;
      });
  return schoolRequest;
}

function useSchoolData() {
  const [data, setData] = useState<SchoolData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadSchools()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return {
    data,
    error,
    retry: () => {
      setError(false);
      setAttempt((value) => value + 1);
    },
  };
}

function distanceLabel(metres: number) {
  if (metres < 10) return '<10 m';
  return metres < 1000
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toFixed(1)} km`;
}

function sourceDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date)
    : null;
}

function schoolOptions(
  community: Community,
  property: Property | null,
  mode: SchoolScope,
  radiusKm: Radius,
) {
  return {
    point: [
      property?.longitude ?? community.centroid[0],
      property?.latitude ?? community.centroid[1],
    ] as [number, number],
    communityCode: community.comm_code,
    ...(community.class === 'Quadrant'
      ? { quadrant: community.comm_code }
      : {}),
    mode,
    radiusKm,
  };
}

function originLabel(community: Community, property: Property | null) {
  return property
    ? 'the property’s map point'
    : community.class === 'Quadrant'
      ? 'the quadrant reference point'
      : 'the neighbourhood reference point';
}

function SchoolSources({
  data,
  onSource,
  full = false,
}: {
  data: SchoolData;
  onSource?: (id: string) => void;
  full?: boolean;
}) {
  const updated = sourceDate(data.metadata.source.sourceRowsUpdatedAt);
  return (
    <>
      <p className="schools-note">
        Nearby schools are not necessarily your designated schools. Confirm the
        address, grade, program and enrolment eligibility with the school board.
      </p>
      {full && (
        <div
          className="schools-source-links"
          aria-label="Official school finders"
        >
          {boardFinders.map((finder) => (
            <a
              key={finder.url}
              href={finder.url}
              target="_blank"
              rel="noreferrer"
            >
              {finder.label}
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
      <div className="schools-source-links">
        {onSource && (
          <button type="button" onClick={() => onSource('schools')}>
            <BookOpen size={13} aria-hidden="true" />
            Sources & coverage
          </button>
        )}
        <a
          href={
            schoolWebsite(data.metadata.source.url) ??
            'https://data.calgary.ca/'
          }
          target="_blank"
          rel="noreferrer"
        >
          City school data
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </div>
      {updated && (
        <p className="schools-note">
          City records updated {updated}. Distances use the published school
          points, which may lag a campus move. Confirm the current address,
          grade group and program with the school.
        </p>
      )}
      {full && (
        <p className="schools-note schools-attribution">
          Contains information licensed under the{' '}
          <a
            href={
              schoolWebsite(data.metadata.source.licenceUrl) ??
              'https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/'
            }
            target="_blank"
            rel="noreferrer"
          >
            Open Government Licence – City of Calgary
          </a>
          .
          {!!data.metadata.websiteSource && (
            <>
              {' '}
              School website links contain information licensed under the{' '}
              <a
                href="https://open.alberta.ca/licence"
                target="_blank"
                rel="noreferrer"
              >
                Open Government Licence – Alberta
              </a>
              .
            </>
          )}
        </p>
      )}
    </>
  );
}

function SchoolSummary({
  data,
  community,
  property,
  onMore,
  onSource,
}: SchoolProps & { data: SchoolData }) {
  const mode: SchoolScope = property ? 'nearby' : 'area';
  const matches = useMemo(
    () =>
      listSchools(data, {
        ...schoolOptions(community, property, mode, 3),
        level: 'all',
      }),
    [data, community, property, mode],
  );
  const label = property
    ? 'within 3 km'
    : `inside ${communityLabel(community)}`;
  const count = (level: SchoolLevel) =>
    matches.filter((school) => school.levels.includes(level)).length;
  return (
    <>
      <p className="schools-intro">
        {matches.length} mapped {matches.length === 1 ? 'school' : 'schools'}{' '}
        {label}. Distances are straight-line from{' '}
        {originLabel(community, property)}.
      </p>
      <div
        className="schools-level-summary"
        aria-label={`Published grade groups ${label}`}
      >
        <div>
          <strong>{count('elementary')}</strong>
          <span>Elementary</span>
        </div>
        <div>
          <strong>{count('juniorHigh')}</strong>
          <span>Junior high</span>
        </div>
        <div>
          <strong>{count('high')}</strong>
          <span>High school</span>
        </div>
      </div>
      {matches.length > 0 ? (
        <ul
          className="schools-summary-list"
          aria-label="Closest mapped schools in this selection"
        >
          {matches.slice(0, 3).map((school) => (
            <li key={school.id}>
              <div>
                <strong>{school.name}</strong>
                <small>{school.grades || 'Grade group not supplied'}</small>
              </div>
              <span>{distanceLabel(school.distanceM)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="schools-status">
          No school points are mapped in this selection. The nearby search also
          includes schools across neighbourhood boundaries.
        </p>
      )}
      <p className="schools-note">
        A school may cover more than one grade group.
        {count('unknown') > 0
          ? ` ${count('unknown')} ${count('unknown') === 1 ? 'record has no reported level' : 'records have no reported level'}.`
          : ''}
      </p>
      {onMore && (
        <button className="schools-more" type="button" onClick={onMore}>
          <span>
            {matches.length
              ? `Browse all ${matches.length} schools and nearby options`
              : 'Browse nearby schools'}
          </span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      )}
      <SchoolSources data={data} onSource={onSource} />
    </>
  );
}

function SchoolCard({ school }: { school: SchoolMatch }) {
  const website = schoolWebsite(school.website),
    source = schoolWebsite(school.sourceUrl);
  return (
    <li className="school-card">
      <div className="school-card-top">
        <div className="school-card-title">
          <h4>{school.name}</h4>
          <p>{school.board || 'Board not listed in source'}</p>
        </div>
        <div className="school-distance">
          <strong>{distanceLabel(school.distanceM)}</strong>
          <small>straight-line</small>
        </div>
      </div>
      <div className="school-card-facts">
        <span>{school.grades || 'Grade group not supplied'}</span>
        {!school.inSelectedArea && <span>Outside selected area</span>}
      </div>
      {school.address && <p className="school-address">{school.address}</p>}
      {school.locationNote && (
        <p className="schools-note">{school.locationNote}</p>
      )}
      <div className="school-links">
        {website && (
          <a href={website} target="_blank" rel="noreferrer">
            School website
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        )}
        {source && (
          <a href={source} target="_blank" rel="noreferrer">
            Source data
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </li>
  );
}

function SchoolDirectory({
  data,
  community,
  property,
  onSource,
}: SchoolProps & { data: SchoolData }) {
  const id = useId();
  const [mode, setMode] = useState<SchoolScope>(property ? 'nearby' : 'area');
  const [radius, setRadius] = useState<Radius>(3);
  const [level, setLevel] = useState<GradeFilter>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(
    () =>
      listSchools(data, {
        ...schoolOptions(community, property, mode, radius),
        level: 'all',
        query,
      }),
    [data, community, property, mode, radius, query],
  );
  const matches =
    level === 'all'
      ? rows
      : rows.filter((school) => school.levels.includes(level));
  const visible = showAll ? matches : matches.slice(0, 8);
  const counts = Object.fromEntries(
    gradeFilters.map(({ id: group }) => [
      group,
      group === 'all'
        ? rows.length
        : rows.filter((school) => school.levels.includes(group)).length,
    ]),
  );
  const areaName = communityLabel(community);
  const selectionLabel =
    mode === 'area'
      ? `Inside ${areaName}`
      : radius === null
        ? 'All mapped Calgary schools'
        : `Within ${radius} km`;
  return (
    <>
      <p className="schools-intro">
        Find schools by location and published grade group. Distances are
        straight-line from {originLabel(community, property)}, not walking
        routes.
      </p>
      {community.class === 'Quadrant' && !property && (
        <p className="schools-note">
          A quadrant covers a large area. Reference-point distance does not
          describe the journey from every home; choose an address for a closer
          comparison.
        </p>
      )}
      <div className="schools-controls">
        <fieldset className="schools-control">
          <legend>Search area</legend>
          <div className="schools-scope-options">
            <button
              type="button"
              aria-pressed={mode === 'area'}
              onClick={() => {
                setMode('area');
                setShowAll(false);
              }}
            >
              Inside {areaName}
            </button>
            <button
              type="button"
              aria-pressed={mode === 'nearby'}
              onClick={() => {
                setMode('nearby');
                setShowAll(false);
              }}
            >
              {property ? 'Near this address' : 'Near the reference point'}
            </button>
          </div>
        </fieldset>
        {mode === 'nearby' && (
          <label>
            <span className="schools-field-label">Straight-line distance</span>
            <select
              value={radius ?? 'all'}
              onChange={(event) => {
                setRadius(
                  event.target.value === 'all'
                    ? null
                    : (Number(event.target.value) as Radius),
                );
                setShowAll(false);
              }}
            >
              <option value="3">Within 3 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="all">All Calgary · no distance limit</option>
            </select>
          </label>
        )}
        <label htmlFor={`${id}-search`}>
          <span className="schools-field-label">
            Search school name or board
          </span>
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            placeholder="Name or board"
            onChange={(event) => {
              setQuery(event.target.value);
              setShowAll(false);
            }}
          />
        </label>
        <fieldset className="schools-control">
          <legend>Published grade group</legend>
          <div className="schools-grade-filters">
            {gradeFilters.map((filter) => (
              <button
                type="button"
                className="schools-grade-filter"
                key={filter.id}
                aria-pressed={level === filter.id}
                onClick={() => {
                  setLevel(filter.id);
                  setShowAll(false);
                }}
              >
                {filter.label}
                <span aria-label={`${counts[filter.id]} schools`}>
                  {counts[filter.id]}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="schools-results-heading" role="status" aria-live="polite">
        <strong>
          {matches.length} {matches.length === 1 ? 'school' : 'schools'}
        </strong>
        <span>{selectionLabel} · closest first</span>
      </div>
      {matches.length ? (
        <>
          <ul className="schools-results" aria-label="School search results">
            {visible.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </ul>
          <div className="schools-pagination">
            <span>
              Showing {visible.length} of {matches.length}
            </span>
            {matches.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? 'Show first 8' : `Show all ${matches.length}`}
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="schools-empty">
          <strong>No schools match these filters</strong>
          <p>
            {mode === 'area'
              ? 'Try nearby schools to include locations across the boundary, or choose another grade group.'
              : 'Try a wider distance, another grade group or a shorter search.'}
          </p>
          <button
            className="schools-more"
            type="button"
            onClick={() => {
              setMode('nearby');
              setRadius(5);
              setLevel('all');
              setQuery('');
              setShowAll(false);
            }}
          >
            Show all grade groups within 5 km
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="schools-note">
        Schools can appear in more than one grade filter. These are broad
        published groups; check the school for exact grades, programs, capacity
        and admission rules. Individual website links appear only where a source
        supplies them. Some listed locations are online or special-program
        offices, rather than in-person teaching campuses.
      </p>
      <SchoolSources data={data} onSource={onSource} full />
    </>
  );
}

export function SchoolsContext({
  community,
  property,
  compact = false,
  onMore,
  onSource,
}: SchoolProps) {
  const id = useId();
  const { data, error, retry } = useSchoolData();
  return (
    <section
      className={`schools-section ${compact ? 'is-compact' : ''}`}
      id={compact ? undefined : 'schools-directory'}
      aria-labelledby={`${id}-heading`}
    >
      <div className="schools-heading">
        <h3 id={`${id}-heading`}>Schools</h3>
        <span>Official location records</span>
      </div>
      {!data ? (
        <div className="schools-status" role="status">
          {error ? (
            <>
              <p>School records could not be loaded.</p>
              <button className="schools-retry" type="button" onClick={retry}>
                <RefreshCw size={14} aria-hidden="true" />
                Try again
              </button>
            </>
          ) : (
            <p>Finding mapped schools…</p>
          )}
        </div>
      ) : compact ? (
        <SchoolSummary
          data={data}
          community={community}
          property={property}
          onMore={onMore}
          onSource={onSource}
        />
      ) : (
        <SchoolDirectory
          key={`${community.comm_code}:${property?.rollNumber ?? 'area'}`}
          data={data}
          community={community}
          property={property}
          onSource={onSource}
        />
      )}
    </section>
  );
}
