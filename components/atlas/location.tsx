'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Leaf, Waves, Plane, Info } from 'lucide-react';
import type { Community } from '@/lib/atlas/data';
import { titleCase } from '@/lib/atlas/data';
import type { Overlay } from './city-map';
interface LocationSummary {
  communities: Record<
    string,
    {
      mappedParkSiteFeaturesIntersectingCommunity: number;
      namedParks: string[];
      mappedPathwayLengthKmInsideApprox: number;
      municipalRegulatoryFloodZonesPresent: string[];
      intersectingAirportNefContours: number[];
    }
  >;
}
export function LocationOverlayDetails({
  community,
  overlay,
  onSource,
}: {
  community: Community;
  overlay: Overlay;
  onSource: (id: string) => void;
}) {
  const [summary, setSummary] = useState<LocationSummary | null>(null);
  useEffect(() => {
    fetch('/data/location-summary.json')
      .then((r) => r.json() as Promise<LocationSummary>)
      .then(setSummary)
      .catch(() => {});
  }, []);
  const row = summary?.communities[community.comm_code];
  return (
    <section className="location-overlay-details">
      {overlay === 'parks' ? (
        <>
          <div className="location-topic">
            <Leaf size={22} />
            <h3>Parks & pathways</h3>
          </div>
          {row && (
            <>
              <div className="location-stats">
                <div>
                  <strong>
                    {row.mappedParkSiteFeaturesIntersectingCommunity}
                  </strong>
                  <span>Mapped park-site features</span>
                </div>
                <div>
                  <strong>
                    {row.mappedPathwayLengthKmInsideApprox.toFixed(1)}{' '}
                    <small>km</small>
                  </strong>
                  <span>Pathways inside · approximate</span>
                </div>
              </div>
              <div className="park-names">
                {row.namedParks.map((name) => (
                  <span key={name}>
                    {titleCase(name).replaceAll(';', ' ·')}
                  </span>
                ))}
              </div>
            </>
          )}
          <p>
            City park parcels and pathway geometry in the four study communities
            and their surroundings. Features are not necessarily separate parks
            or open entrances; distances are not walking-route calculations.
          </p>
          <button className="source-link" onClick={() => onSource('parks')}>
            Parks & pathway sources <ArrowUpRight size={13} />
          </button>
        </>
      ) : overlay === 'noise' ? (
        <>
          <div className="location-topic">
            <Plane size={22} />
            <h3>Airport noise contours</h3>
          </div>
          <div className="contour-key">
            <span>NEF 25</span>
            <span>30</span>
            <span>35</span>
            <span>40</span>
          </div>
          <p>
            Noise Exposure Forecast contours are a land-use planning measure.
            The values are <strong>not live decibel readings</strong>. Areas
            outside a contour can still experience aircraft noise.
          </p>
          <p>
            The map moves toward YYC so the citywide contours are visible. A
            home’s indoor sound levels require evidence at that home.
          </p>
          <button className="source-link" onClick={() => onSource('noise')}>
            Airport noise data & interpretation <ArrowUpRight size={13} />
          </button>
        </>
      ) : (
        <>
          <div className="location-topic">
            <Waves size={22} />
            <h3>
              {overlay === 'flood'
                ? 'Municipal regulatory flood map'
                : 'Provincial design-flood hazard'}
            </h3>
          </div>
          <span className="data-badge">
            {overlay === 'flood'
              ? 'Current City designation · 1983 calculation basis'
              : 'Bow & Elbow study · finalized 15 May 2025'}
          </span>
          {overlay === 'flood' ? (
            <p>
              The City’s current regulatory layer and Alberta’s newer hazard
              study serve different purposes. This layer describes municipal
              floodway, flood-fringe and river-channel designations; its
              published calculation basis is 1983.
            </p>
          ) : (
            <p>
              Alberta’s newer Bow and Elbow flood study includes the Springbank
              and Glenmore mitigation context. The displayed design-flood zones
              preserve river and flow-regime distinctions. This is not a
              replacement for the City’s current regulatory designation.
            </p>
          )}
          <p>
            Display geometry is generalized and bounded to the central study
            area. A missing overlay at a home is not flood clearance, an
            insurance decision or a legal determination.
          </p>
          <a
            className="outline-action"
            href="https://floods.alberta.ca/"
            target="_blank"
            rel="noreferrer"
          >
            <Waves size={17} />
            <span>
              Check the exact address<small>Alberta Flood Awareness Map</small>
            </span>
            <ArrowUpRight size={14} />
          </a>
          <button
            className="source-link"
            onClick={() =>
              onSource(overlay === 'flood' ? 'flood' : 'flood-hazard')
            }
          >
            Study, coverage & regulatory status <ArrowUpRight size={13} />
          </button>
        </>
      )}
    </section>
  );
}
export function EnvironmentalChecklist() {
  return (
    <section className="environmental-checklist">
      <div className="section-line">
        <h3>Checks that need the actual home</h3>
      </div>
      <details className="reading-detail">
        <summary>
          Radon evidence
          <Info size={14} />
        </summary>
        <p>
          Neighbourhood or regional averages cannot establish radon in one home.
          Ask for a valid long-term test and any mitigation records. Health
          Canada recommends testing for at least three months during the fall or
          winter heating season.
        </p>
        <a
          className="source-link"
          href="https://www.canada.ca/en/health-canada/services/health-risks-safety/radiation/radon.html"
          target="_blank"
          rel="noreferrer"
        >
          Health Canada radon guidance <ArrowUpRight size={13} />
        </a>
      </details>
      <details className="reading-detail">
        <summary>
          Sound, air & insurance
          <Info size={14} />
        </summary>
        <p>
          Visit at different times, review available measurements and obtain an
          address-specific insurance quote. Station air data, airport planning
          contours and a flood map answer different questions; none is a
          combined property risk score.
        </p>
      </details>
    </section>
  );
}
