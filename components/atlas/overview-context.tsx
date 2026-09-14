'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronRight, Construction, Waves } from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import {
  CORE,
  titleCase,
  type Community,
  type Property,
  type Layer,
} from '@/lib/atlas/data';
import { containsPoint } from '@/lib/atlas/geography';
interface Permit {
  id: string;
  communityCode: string;
  address: string;
  description: string;
  status: string;
  appliedDate: string;
}
interface Context {
  permits: Permit[];
  flood: FeatureCollection;
  noise: FeatureCollection;
}
let pending: Promise<Context> | null = null;
function loadContext(): Promise<Context> {
  pending ??= Promise.all(
    [
      '/data/development.json',
      '/data/flood-regulatory.geojson',
      '/data/noise.geojson',
    ].map(async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('Context unavailable');
      return r.json();
    }),
  )
    .then(([development, flood, noise]) => ({
      permits: (development as { permits: Permit[] }).permits,
      flood: flood as FeatureCollection,
      noise: noise as FeatureCollection,
    }))
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}
export function AreaContext({
  community,
  property,
  onLayer,
}: {
  community: Community;
  property: Property | null;
  onLayer: (layer: Layer) => void;
}) {
  const [data, setData] = useState<Context | null>(null);
  useEffect(() => {
    let off = false;
    loadContext()
      .then((d) => {
        if (!off) setData(d);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  const permits = data?.permits.filter(
    (p) => p.communityCode === community.comm_code,
  );
  const covered = CORE.includes(community.comm_code);
  const point: [number, number] | null = property
    ? [property.longitude, property.latitude]
    : null;
  const floods =
    point && data
      ? data.flood.features
          .filter((f) => containsPoint(point, f.geometry))
          .map((f) => String(f.properties?.zone))
      : [];
  const noise =
    point && data
      ? data.noise.features
          .filter((f) => containsPoint(point, f.geometry))
          .map((f) => Number(f.properties?.nefIndex))
      : [];
  return (
    <>
      <section className="overview-topic">
        <div className="section-line">
          <h3>Development & change</h3>
          <button onClick={() => onLayer('nearby')}>
            Applications <ChevronRight size={14} />
          </button>
        </div>
        <div className="overview-evidence">
          <Construction size={21} />
          <div>
            <strong>
              {covered && permits
                ? `${permits.length} recent development applications`
                : 'Explore planned changes near the home'}
            </strong>
            <p>
              {covered
                ? 'Study-community records · 13 Sep 2025–12 Sep 2026. Applications can include signs and changes of use.'
                : 'Open the City development map for current applications at this address. This app’s detailed extract covers four central study communities.'}
            </p>
          </div>
        </div>
        {covered &&
          permits?.slice(0, 2).map((p) => (
            <div className="overview-permit" key={p.id}>
              <span>
                <strong>{titleCase(p.address)}</strong>
                <small>{titleCase(p.description)}</small>
              </span>
              <b>{p.status}</b>
            </div>
          ))}
        <a
          className="source-link"
          href="https://developmentmap.calgary.ca/"
          target="_blank"
          rel="noreferrer"
        >
          City development map <ArrowUpRight size={13} />
        </a>
      </section>
      <section className="overview-topic">
        <div className="section-line">
          <h3>Environmental checks</h3>
          <button onClick={() => onLayer('nearby')}>
            Map layers <ChevronRight size={14} />
          </button>
        </div>
        <div className="overview-evidence">
          <Waves size={21} />
          <div>
            <strong>
              {floods.length
                ? `Map point intersects: ${[...new Set(floods)].join(', ')}`
                : 'Check flood designation at the exact address'}
            </strong>
            <p>
              {floods.length
                ? 'Intersection with the saved City regulatory layer; verify against the official map.'
                : 'A missing overlap is not flood clearance. Regulatory designations, newer provincial hazard maps and insurance decisions are different.'}
            </p>
          </div>
        </div>
        {noise.length > 0 && (
          <p className="environment-observation">
            Map point falls inside NEF {Math.max(...noise)} aircraft-noise
            contour. NEF is a planning index, not decibels.
          </p>
        )}
        <div className="overview-check-links">
          <a href="https://floods.alberta.ca/" target="_blank" rel="noreferrer">
            Flood maps & address check <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.canada.ca/en/health-canada/services/health-risks-safety/radiation/radon.html"
            target="_blank"
            rel="noreferrer"
          >
            Radon testing guidance <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.cbe.ab.ca/find-a-school"
            target="_blank"
            rel="noreferrer"
          >
            Confirm school eligibility <ArrowUpRight size={14} />
          </a>
        </div>
        <p className="quiet-note">
          Pollution is measured at stations; pipes, radon, insurance and school
          eligibility need evidence for the specific home.
        </p>
      </section>
    </>
  );
}
