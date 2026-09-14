'use client';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Construction,
  TrainFront,
  GraduationCap,
  Waves,
  CalendarDays,
} from 'lucide-react';
import { MobilityContext, useMobility } from './mobility';
import type { Overlay } from './city-map';
import { EnvironmentalChecklist, LocationOverlayDetails } from './location';
import type { Community, Property } from '@/lib/atlas/data';
import { CORE, titleCase } from '@/lib/atlas/data';
import { BuyerChecklist, EmptyState, SourceLink } from './panels';
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
export function NearbyPanel({
  community,
  property,
  onSource,
  overlay,
  onOverlay,
}: {
  community: Community;
  property: Property | null;
  onSource: (id: string) => void;
  overlay: Overlay;
  onOverlay: (value: Overlay) => void;
}) {
  const [permits, setPermits] = useState<Permit[]>([]),
    [loaded, setLoaded] = useState(false),
    [filter, setFilter] = useState('all'),
    [count, setCount] = useState(5);
  useEffect(() => {
    fetch('/data/development.json')
      .then((r) => r.json() as Promise<{ permits: Permit[] }>)
      .then((p) => {
        setPermits(p.permits);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);
  const covered = CORE.includes(community.comm_code);
  const local = permits.filter((p) => p.communityCode === community.comm_code),
    filtered = local.filter(
      (p) =>
        filter === 'all' ||
        (filter === 'residential'
          ? p.category.toLowerCase().includes('residential')
          : !['Cancelled', 'Refused'].includes(p.status)),
    );
  const mobility = useMobility(community, property);
  return (
    <div className="panel-flow">
      <p className="place-description">
        Development, transport and local services.
      </p>
      <div
        className="overlay-choices"
        role="group"
        aria-label="Nearby map overlay"
      >
        {(
          [
            { id: 'development', label: 'Development' },
            { id: 'transit', label: 'Transit' },
            { id: 'parks', label: 'Parks' },
            { id: 'flood', label: 'Regulatory flood' },
            { id: 'hazard', label: 'Flood hazard' },
            { id: 'noise', label: 'Aircraft noise' },
          ] as { id: Overlay; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={overlay === item.id}
            className={overlay === item.id ? 'active' : ''}
            onClick={() => onOverlay(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {['parks', 'flood', 'hazard', 'noise'].includes(overlay) && (
        <LocationOverlayDetails
          community={community}
          overlay={overlay}
          onSource={onSource}
        />
      )}
      <div className="overview-pair">
        <div className="small-metric-card">
          <Construction size={18} />
          <strong>{loaded && covered ? local.length : '—'}</strong>
          <span>Development applications</span>
          <small>
            {covered ? 'Sep 2025–Sep 2026' : 'Detailed extract not included'}
          </small>
        </div>
        <div className="small-metric-card">
          <TrainFront size={18} />
          <strong>{mobility.result?.transit.nearbyRoutes.length ?? '—'}</strong>
          <span>Weekday routes within 800 m</span>
          <small>
            {property
              ? 'From this property’s map point'
              : 'From the area reference point'}
          </small>
        </div>
      </div>
      <section>
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
        {loaded && !local.length && (
          <EmptyState title="Detailed activity not included here">
            This extract covers the four initial study communities. Explore the
            City’s development map for other addresses.
          </EmptyState>
        )}
        <p className="quiet-note">
          Applications include signs, renovations and changes of use. Approval
          does not mean construction has started. Current published status as of
          12 September 2026.
        </p>
        <SourceLink id="development" onSource={onSource} />
      </section>
      <MobilityContext community={community} property={property} />
      <section>
        <div className="section-line">
          <h3>Check the exact address</h3>
        </div>
        <div className="official-actions">
          <a
            href="https://www.cbe.ab.ca/find-a-school"
            target="_blank"
            rel="noreferrer"
          >
            <GraduationCap size={18} />
            <span>
              Public school eligibility<small>Calgary Board of Education</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <a
            href="https://www.cssd.ab.ca/schools"
            target="_blank"
            rel="noreferrer"
          >
            <GraduationCap size={18} />
            <span>
              Catholic schools<small>Calgary Catholic School District</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <a href="https://floods.alberta.ca/" target="_blank" rel="noreferrer">
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
          property ? `p:${property.rollNumber}` : `c:${community.comm_code}`
        }
      />
    </div>
  );
}
