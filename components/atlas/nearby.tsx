'use client';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import {
  ArrowUpRight,
  Construction,
  TrainFront,
  Waves,
  CalendarDays,
} from 'lucide-react';
import { MobilityContext, useMobility } from './mobility';
import { SchoolsContext } from './schools';
import type { Overlay } from './city-map';
import { EnvironmentalChecklist, LocationOverlayDetails } from './location';
import type { Community, Property } from '@/lib/atlas/data';
import { CORE, titleCase } from '@/lib/atlas/data';
import { BuyerChecklist, EmptyState, SourceLink } from './panels';
import type {
  TransitMapLayers,
  TransitMapStatus,
} from '@/lib/atlas/map-overlays';
import { TransitLayerChoices } from './transit-layers';
import './nearby.css';

export type NearbySection =
  'schools' | 'gettingAround' | 'development' | 'checks';
const sections: { id: NearbySection; label: string }[] = [
  { id: 'schools', label: 'Schools' },
  { id: 'gettingAround', label: 'Getting around' },
  { id: 'development', label: 'Development' },
  { id: 'checks', label: 'Area checks' },
];
const areaOverlays: { id: Overlay; label: string }[] = [
  { id: 'parks', label: 'Parks & pathways' },
  { id: 'flood', label: 'Regulatory flood' },
  { id: 'hazard', label: 'Flood hazard' },
  { id: 'noise', label: 'Aircraft noise' },
];

interface Permit {
  id: string;
  communityCode: string;
  address: string;
  category: string;
  description: string;
  status: string;
  appliedDate: string;
  coordinates: [number, number];
}
function WeekdayRoutes({
  community,
  property,
}: {
  community: Community;
  property: Property | null;
}) {
  const mobility = useMobility(community, property);
  if (community.class === 'Quadrant') return null;
  return (
    <div className="nearby-single-metric">
      <TrainFront size={18} aria-hidden="true" />
      <strong>{mobility.result?.transit.nearbyRoutes.length ?? '—'}</strong>
      <div>
        <span>Weekday routes within 800 m</span>
        <small>
          {property
            ? 'Straight-line from this property’s map point'
            : 'Straight-line from the area reference point'}
        </small>
      </div>
    </div>
  );
}
export function NearbyPanel({
  community,
  property,
  onSource,
  overlay,
  onOverlay,
  transitLayers,
  transitStatus,
  onTransitLayersChange,
  onShowGreenLine,
  section,
  onSectionChange,
}: {
  community: Community;
  property: Property | null;
  onSource: (id: string) => void;
  overlay: Overlay;
  onOverlay: (value: Overlay) => void;
  transitLayers: TransitMapLayers;
  transitStatus: TransitMapStatus;
  onTransitLayersChange: (layers: TransitMapLayers) => void;
  onShowGreenLine: () => void;
  section: NearbySection;
  onSectionChange: (section: NearbySection) => void;
}) {
  const id = useId();
  const [permits, setPermits] = useState<Permit[]>([]),
    [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false),
    [filter, setFilter] = useState('all'),
    [count, setCount] = useState(5);
  useEffect(() => {
    if (section !== 'development' || loaded) return;
    const controller = new AbortController();
    fetch('/data/development.json', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Development records unavailable');
        return r.json() as Promise<{ permits: Permit[] }>;
      })
      .then((p) => {
        if (controller.signal.aborted) return;
        setPermits(p.permits);
        setLoaded(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFailed(true);
        setLoaded(true);
      });
    return () => controller.abort();
  }, [section, loaded]);
  const covered = CORE.includes(community.comm_code);
  const local = permits.filter((p) => p.communityCode === community.comm_code),
    filtered = local.filter(
      (p) =>
        filter === 'all' ||
        (filter === 'residential'
          ? p.category.toLowerCase().includes('residential')
          : !['Cancelled', 'Refused'].includes(p.status)),
    );
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
    else if (event.key === 'ArrowLeft')
      next = (index + sections.length - 1) % sections.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = sections.length - 1;
    else return;
    event.preventDefault();
    onSectionChange(sections[next].id);
    document.getElementById(`${id}-${sections[next].id}`)?.focus();
  }
  return (
    <div className="nearby-panel">
      <div
        className="nearby-section-tabs"
        role="tablist"
        aria-label="Nearby information"
      >
        {sections.map((item, index) => (
          <button
            type="button"
            role="tab"
            id={`${id}-${item.id}`}
            key={item.id}
            aria-selected={section === item.id}
            aria-controls={`${id}-content`}
            tabIndex={section === item.id ? 0 : -1}
            onClick={() => onSectionChange(item.id)}
            onKeyDown={(event) => moveTab(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="nearby-section-content panel-flow"
        role="tabpanel"
        id={`${id}-content`}
        aria-labelledby={`${id}-${section}`}
        tabIndex={0}
      >
        {section === 'schools' && (
          <SchoolsContext
            community={community}
            property={property}
            onSource={onSource}
          />
        )}
        {section === 'gettingAround' && (
          <>
            <section>
              <div className="section-line">
                <h3>Transit on the map</h3>
              </div>
              <p className="quiet-note">
                Turn routes and stations on individually. These overlays stay
                visible when you explore other data layers.
              </p>
              <TransitLayerChoices
                layers={transitLayers}
                status={transitStatus}
                onChange={onTransitLayersChange}
                onShowGreenLine={onShowGreenLine}
              />
              <WeekdayRoutes community={community} property={property} />
              <SourceLink
                id="transit"
                label="Transit data & dates"
                onSource={onSource}
              />
            </section>
            <MobilityContext community={community} property={property} />
          </>
        )}
        {section === 'development' && (
          <section>
            <div className="nearby-single-metric">
              <Construction size={18} aria-hidden="true" />
              <strong>
                {loaded && covered && !failed ? local.length : '—'}
              </strong>
              <div>
                <span>Development applications</span>
                <small>
                  {covered
                    ? 'Sep 2025–Sep 2026'
                    : 'Detailed extract not included'}
                </small>
              </div>
            </div>
            <div className="section-line">
              <h3>Development activity</h3>
              <select
                aria-label="Filter development applications"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCount(5);
                }}
              >
                <option value="all">All applications</option>
                <option value="residential">Residential</option>
                <option value="active">Exclude cancelled / refused</option>
              </select>
            </div>
            {!loaded && (
              <p className="quiet-note" role="status">
                Loading development records…
              </p>
            )}
            {failed && (
              <div className="nearby-load-error" role="status">
                <p>Development records could not be loaded.</p>
                <button
                  type="button"
                  className="source-link"
                  onClick={() => {
                    setFailed(false);
                    setLoaded(false);
                  }}
                >
                  Try again
                </button>
              </div>
            )}
            {filtered.slice(0, count).map((p) => (
              <details className="permit-record" key={p.id}>
                <summary>
                  <span>
                    <strong>{titleCase(p.address)}</strong>
                    <small>
                      {p.id} · {p.appliedDate}
                    </small>
                  </span>
                  <span className="permit-status">{p.status}</span>
                </summary>
                <div>
                  <p>{titleCase(p.description)}</p>
                  <small>{p.category}</small>
                  <a
                    href="https://developmentmap.calgary.ca/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find {p.id} in the City development map{' '}
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </details>
            ))}
            {filtered.length > count && (
              <button
                className="secondary-button"
                onClick={() => setCount((n) => n + 8)}
              >
                Show more applications
              </button>
            )}
            {loaded && !failed && filtered.length > 0 && (
              <p className="quiet-note">
                Showing {Math.min(count, filtered.length)} of {filtered.length}{' '}
                applications.
              </p>
            )}
            {loaded && !failed && local.length > 0 && !filtered.length && (
              <p className="quiet-note">
                No applications match this filter. Choose All applications to
                see the full local extract.
              </p>
            )}
            {loaded && !failed && !local.length && (
              <EmptyState title="Detailed activity not included here">
                This extract covers the four initial study communities. Explore
                the City’s development map for other addresses.
              </EmptyState>
            )}
            <p className="quiet-note">
              Applications include signs, renovations and changes of use.
              Approval does not mean construction has started. Current published
              status as of 12 September 2026.
            </p>
            <SourceLink id="development" onSource={onSource} />
          </section>
        )}
        {section === 'checks' && (
          <>
            <div
              className="nearby-area-choices"
              role="group"
              aria-label="Area check map overlay"
            >
              {areaOverlays.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={overlay === item.id}
                  onClick={() => onOverlay(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {areaOverlays.some((item) => item.id === overlay) && (
              <LocationOverlayDetails
                community={community}
                overlay={overlay}
                onSource={onSource}
              />
            )}
            <section>
              <div className="section-line">
                <h3>Check the exact address</h3>
              </div>
              <div className="official-actions">
                <a
                  href="https://floods.alberta.ca/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Waves size={18} />
                  <span>
                    Flood hazard maps
                    <small>Government of Alberta · address lookup</small>
                  </span>
                  <ArrowUpRight size={16} />
                </a>
                <a
                  href="https://www.calgary.ca/waste/residential/garbage-schedule.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  <CalendarDays size={18} />
                  <span>
                    Waste collection calendar<small>City of Calgary</small>
                  </span>
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </section>
            <EnvironmentalChecklist />
            <BuyerChecklist
              placeId={
                property
                  ? `p:${property.rollNumber}`
                  : `c:${community.comm_code}`
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
