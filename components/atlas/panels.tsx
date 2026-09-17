'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LOCAL_DATA_CHANGED } from '@/lib/atlas/privacy-storage';
import { ChartAxes, ChartData, chartScale } from './charts';
import { MobilityContext } from './mobility';
import { SchoolsContext } from './schools';
import { AreaContext } from './overview-context';
import type { NearbySection } from './nearby';
import { RightsAndAttribution } from './rights';
import { PropertyFacts } from './property-facts';
import { RadonPanel } from './radon';
import { SolarPanel } from './solar';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
  Droplets,
  House,
  Wind,
  Shield,
  Info,
  RefreshCw,
  SlidersHorizontal,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { getPublicPropertyDetails } from '@/lib/atlas/property-details';
import type { Pipe } from '@/lib/atlas/data';
import {
  AssessmentHistory,
  CensusContext,
  OwnershipPlanner,
  ParticulateHistory,
  PoliticalTimeline,
} from './insights';
import { Slider } from '@/components/ui/slider';
import type {
  Aggregate,
  Air,
  AtlasData,
  Community,
  Crime,
  Layer,
  Property,
  Representative,
} from '@/lib/atlas/data';
import {
  communityLabel,
  compactMoney,
  coreDescriptions,
  money,
  MUNICIPAL_RATE,
  number,
  PROVINCIAL_RATE,
  readableMaterial,
  SOURCES,
  TAX_RATE,
  titleCase,
} from '@/lib/atlas/data';
export function SourceLink({
  id,
  label = 'Source & methodology',
  onSource,
}: {
  id: string;
  label?: string;
  onSource: (id: string) => void;
}) {
  return (
    <button className="source-link" onClick={() => onSource(id)}>
      <BookOpen size={13} />
      {label}
      <ArrowUpRight size={13} />
    </button>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-empty">
      <Info size={19} />
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}
export function CrimeChart({
  crime,
  small = false,
}: {
  crime: Crime;
  small?: boolean;
}) {
  const a = crime.monthly.filter((m) => m.year === 2019 && m.month <= 12),
    b = crime.monthly.filter((m) => m.year === 2018 && m.month <= 12);
  const scale = chartScale(
    [...a, ...b].map((m) => m.publishedCount ?? 0),
    10,
  );
  return (
    <div className={`crime-chart ${small ? 'compact' : ''}`}>
      <svg
        viewBox="0 0 320 158"
        role="img"
        aria-label={`${crime.name}, historical crime counts, January to December 2019 compared with 2018`}
      >
        <title>Selected crime categories, published monthly values</title>
        <ChartAxes scale={scale} unit="Published count" />
        {Array.from({ length: 12 }, (_, i) => {
          const prev = b.find((m) => m.month === i + 1)?.publishedCount,
            cur = a.find((m) => m.month === i + 1)?.publishedCount;
          return (
            <g key={i}>
              {prev != null && (
                <rect
                  x={43 + i * 22.6}
                  y={133 - (prev / scale.top) * 108}
                  width="7"
                  height={(prev / scale.top) * 108}
                  rx="3"
                  fill="#b9c1c9"
                >
                  <title>
                    {2018}{' '}
                    {
                      [
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec',
                      ][i]
                    }
                    : {prev}
                  </title>
                </rect>
              )}
              {cur != null && (
                <rect
                  x={51 + i * 22.6}
                  y={133 - (cur / scale.top) * 108}
                  width="7"
                  height={(cur / scale.top) * 108}
                  rx="3"
                  fill="#789cb8"
                >
                  <title>
                    {2019}{' '}
                    {
                      [
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec',
                      ][i]
                    }
                    : {cur}
                  </title>
                </rect>
              )}
              {i % 2 === 0 && (
                <text
                  x={50 + i * 22.6}
                  y="154"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#5a6670"
                >
                  {
                    [
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec',
                    ][i]
                  }
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-key">
        <span>
          <i style={{ background: '#b9c1c9' }} />
          2018
        </span>
        <span>
          <i style={{ background: '#789cb8' }} />
          2019
        </span>
      </div>
      <ChartData
        caption={`${crime.name}: published monthly crime counts, 2018 and 2019`}
        columns={['Month', '2018', '2019']}
        rows={[
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ].map((label, index) => ({
          label,
          values: [
            b.find((month) => month.month === index + 1)?.publishedCount ?? '—',
            a.find((month) => month.month === index + 1)?.publishedCount ?? '—',
          ],
        }))}
        note="Published counts for the selected crime categories. A dash means no published value; it is not zero."
      />
    </div>
  );
}

export function Overview({
  data,
  community,
  property,
  onLayer,
  onNearby,
  onSun,
  onProperty,
  onSource,
}: {
  data: AtlasData;
  community: Community;
  property: Property | null;
  onLayer: (layer: Layer) => void;
  onNearby: (section: NearbySection) => void;
  onSun: () => void;
  onProperty: (p: Property) => void;
  onSource: (id: string) => void;
}) {
  const code = community.comm_code,
    stats = data.aggregates[code],
    water = data.water[code];
  const value = property?.assessedValue ?? stats?.median;
  const properties = data.properties.filter((p) => p.communityCode === code);
  const pipe = property ? data.pipes[property.rollNumber] : undefined;
  const ids = property
    ? [
        property.mpRepresentativeId,
        property.mlaRepresentativeId,
        property.councillorRepresentativeId,
      ]
    : [data.communityWards[code]];
  const reps = ids
    .map((id) => data.representatives.find((r) => r.id === id))
    .filter((r): r is Representative => !!r);
  return (
    <div className="panel-flow overview-complete">
      <p className="place-description">
        {property
          ? `Public records for ${titleCase(property.address)}, with context from ${communityLabel(community)}.`
          : community.class === 'Quadrant'
            ? 'Residential property context across this address quadrant. Choose a neighbourhood or home for local services and environmental checks.'
            : coreDescriptions[code] ||
              `Property, daily life and local context for ${communityLabel(community)}.`}
      </p>
      <button
        className="assessment-feature"
        onClick={() => onLayer('property')}
      >
        <div>
          <span className="metric-label">
            {property ? 'Property assessment' : 'Median residential assessment'}
          </span>
          <span className="large-metric">
            {value ? money(value) : 'Explore homes'}
          </span>
          <span className="metric-caption">
            {property
              ? '2026 City record · not a sale price'
              : stats
                ? `2026 · ${number(stats.count)} eligible accounts`
                : 'Search public property records'}
          </span>
        </div>
        <span className="circle-arrow">
          <ArrowUpRight size={21} />
        </span>
      </button>
      <div className="overview-facts">
        {value != null && (
          <button onClick={() => onLayer('property')}>
            <span>Estimated property tax</span>
            <strong>
              {money(value * TAX_RATE)}
              <small>/year</small>
            </strong>
            <small>{money((value * TAX_RATE) / 12, 2)}/month · 2026 rate</small>
          </button>
        )}
        {(property ? property.yearBuilt != null : stats != null) && (
          <button onClick={() => onLayer('property')}>
            <span>{property ? 'Year built' : 'Residential accounts'}</span>
            <strong>
              {property
                ? property.yearBuilt
                : stats
                  ? number(stats.count)
                  : null}
            </strong>
            <small>
              {property
                ? `${property.subPropertyUse ? titleCase(property.subPropertyUse) : 'City assessment record'}`
                : 'Eligible 2026 accounts in this area'}
            </small>
          </button>
        )}
        <button onClick={() => onLayer('air')}>
          <span>Calgary air quality</span>
          <strong>
            {data.air.city.displayLabel ?? data.air.city.displayAqhi}
            <small>AQHI</small>
          </strong>
          <small>
            {data.air.city.riskCategory} risk ·{' '}
            {new Date(data.air.observationPeriod.at).toLocaleDateString(
              'en-CA',
              { timeZone: 'America/Edmonton', month: 'short', day: 'numeric' },
            )}
          </small>
        </button>
        {(!property || stats) && (
          <button onClick={() => onLayer('property')}>
            <span>{property ? 'Area median assessment' : 'Tax outlook'}</span>
            <strong>
              {property && stats ? money(stats.median) : 'Scenario planner'}
            </strong>
            <small>
              {property
                ? 'Neighbourhood context · 2026'
                : 'Explore changes; future rates not final'}
            </small>
          </button>
        )}
      </div>
      <MobilityContext
        community={community}
        property={property}
        compact
        onMore={() => onNearby('gettingAround')}
      />
      <SchoolsContext
        community={community}
        property={property}
        compact
        onMore={() => onNearby('schools')}
        onSource={onSource}
      />
      {property && (
        <button className="sun-overview-link" onClick={onSun}>
          <span>
            <strong>Sunlight at this home</strong>
            <small>
              Sun direction, seasonal daylight and which way to face
            </small>
          </span>
          <ArrowUpRight size={19} />
        </button>
      )}
      <RadonPanel compact onSource={onSource} />
      {(water || Boolean(pipe?.knownMaterials.length)) && (
        <section className="overview-topic">
          <div className="section-line">
            <h3>Infrastructure & the home</h3>
            <button onClick={() => onLayer('water')}>
              Details <ChevronRight size={14} />
            </button>
          </div>
          {Boolean(pipe?.knownMaterials.length) && pipe && (
            <div className="overview-evidence">
              <Droplets size={21} />
              <div>
                <strong>{pipe.materialSummary}</strong>
                <p>
                  {pipe.matchLabel}. Public records do not establish private or
                  indoor pipe materials.
                </p>
              </div>
            </div>
          )}
          {water && (
            <dl className="overview-definition">
              <div>
                <dt>Mapped public main segments</dt>
                <dd>{number(water['water-mains'].count)}</dd>
              </div>
              <div>
                <dt>Recorded main breaks since 2021</dt>
                <dd>{number(water['water-breaks'].recordsSince2021)}</dd>
              </div>
            </dl>
          )}
          <p className="quiet-note">
            Main-break and material summaries cover the four study communities.
            A material or installation year alone does not predict replacement.
          </p>
        </section>
      )}
      {reps.length > 0 && (
        <section className="overview-topic">
          <div className="section-line">
            <h3>Who represents this place</h3>
            <button onClick={() => onLayer('politics')}>
              Political context <ChevronRight size={14} />
            </button>
          </div>
          {reps.map((rep) => (
            <a
              className="overview-representative"
              href={rep.profileUrl || rep.sourceUrl}
              target="_blank"
              rel="noreferrer"
              key={rep.id}
            >
              <span>
                <small>
                  {rep.level === 'federal'
                    ? 'MP'
                    : rep.level === 'provincial'
                      ? 'MLA'
                      : 'Councillor'}{' '}
                  · {rep.district}
                </small>
                <strong>{rep.name || rep.displayName || 'Vacant seat'}</strong>
                <small>
                  {rep.status === 'link-only'
                    ? 'Official Assembly directory'
                    : rep.party || 'Municipal office · no party listed'}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </a>
          ))}
          <p className="quiet-note">
            {property
              ? 'Address point matched to published district boundaries. Verify boundary-edge properties with the official locator.'
              : 'Select an address for its MP and MLA. Neighbourhoods can cross electoral boundaries.'}{' '}
            MP records verified 13 September 2026; councillors verified 14
            September 2026. Current MLA details are linked to the official
            directory.
          </p>
        </section>
      )}
      <AreaContext
        community={community}
        property={property}
        onNearby={onNearby}
      />
      <CensusContext code={code} />
      <section className="overview-topic">
        <div className="section-line">
          <h3>Crime & local conditions</h3>
          <button onClick={() => onLayer('crime')}>
            Crime sources <ChevronRight size={14} />
          </button>
        </div>
        <p className="quiet-note">
          Review the latest CPS community statistics alongside the exact
          categories and reporting period. Counts do not measure a home’s
          safety, and older figures should not be treated as today’s conditions.
        </p>
        <a
          className="outline-action"
          href="https://www.calgarypolice.ca/transparency-and-accountability/crime-statistics.html"
          target="_blank"
          rel="noreferrer"
        >
          <Shield size={19} />
          <span>
            Current CPS community statistics
            <small>Open the official report</small>
          </span>
          <ArrowUpRight size={16} />
        </a>
      </section>
      {!property && properties.length > 0 && (
        <section>
          <div className="section-line">
            <h3>Explore individual homes</h3>
            <button onClick={() => onLayer('property')}>
              All records <ArrowRight size={13} />
            </button>
          </div>
          {properties.slice(0, 2).map((p) => (
            <button
              className="property-list-row"
              key={p.rollNumber}
              onClick={() => onProperty(p)}
            >
              <span className="property-symbol">
                <House size={18} />
              </span>
              <span>
                <strong>{titleCase(p.address)}</strong>
                <small>
                  {p.yearBuilt != null ? `Built ${p.yearBuilt} · ` : ''}City
                  assessment
                </small>
              </span>
              <span className="price-small">
                {compactMoney(p.assessedValue)}
                <ChevronRight size={14} />
              </span>
            </button>
          ))}
        </section>
      )}
      <details className="reading-detail">
        <summary>
          Buying checklist · saved on this device <ChevronRight size={15} />
        </summary>
        <BuyerChecklist placeId={property?.rollNumber ?? code} />
      </details>
      <SourceLink
        id="assessments"
        onSource={onSource}
        label="Sources, dates & coverage"
      />
    </div>
  );
}

export function TaxCalculator({
  property,
  stats,
  onSource,
}: {
  property: Property | null;
  stats?: Aggregate;
  onSource: (id: string) => void;
}) {
  const initial = property?.assessedValue ?? stats?.median ?? 600000;
  const [value, setValue] = useState(initial),
    [change, setChange] = useState(5);
  const base = value * TAX_RATE,
    scenario = base * (1 + change / 100);
  return (
    <section className="tax-calculator">
      <div className="section-line">
        <h3>Property tax estimate</h3>
        <span className="data-badge">2026 rate</span>
      </div>
      <label className="amount-input">
        <span>Residential assessed value</span>
        <div>
          <span>$</span>
          <input
            aria-label="Residential assessed value"
            inputMode="numeric"
            type="number"
            min="0"
            max="100000000"
            value={value}
            onChange={(e) =>
              setValue(Math.min(1e8, Math.max(0, Number(e.target.value))))
            }
          />
        </div>
      </label>
      <div className="tax-result">
        <strong>{money(base)}</strong>
        <span>/ year</span>
        <small>{money(base / 12, 2)} per month</small>
      </div>
      <div className="tax-split">
        <span style={{ width: `${(MUNICIPAL_RATE / TAX_RATE) * 100}%` }} />
        <span />
      </div>
      <div className="split-labels">
        <span>
          <i />
          Municipal <strong>{money(value * MUNICIPAL_RATE)}</strong>
        </span>
        <span>
          <i />
          Provincial <strong>{money(value * PROVINCIAL_RATE)}</strong>
        </span>
      </div>
      <details className="scenario">
        <summary>
          <SlidersHorizontal size={16} />
          Explore a future scenario <ChevronRight size={15} />
        </summary>
        <div className="scenario-body">
          <div className="section-line">
            <label id="scenario-label">Assumed annual bill change</label>
            <strong>
              {change > 0 ? '+' : ''}
              {change}%
            </strong>
          </div>
          <Slider
            aria-labelledby="scenario-label"
            min={-10}
            max={20}
            step={0.5}
            value={[change]}
            onValueChange={(v) => setChange(v[0])}
          />
          <div className="range-labels">
            <span>−10%</span>
            <span>+20%</span>
          </div>
          <div className="scenario-output">
            <span>
              Illustrative next annual bill<strong>{money(scenario)}</strong>
            </span>
            <span>
              {change >= 0 ? '+' : '−'}
              {money(Math.abs(scenario - base))}
              <small>from 2026 estimate</small>
            </span>
          </div>
          <p className="quiet-note">
            Your assumption, not a tax forecast. Actual changes depend on
            budgets, provincial requisitions and your assessment relative to
            other properties.
          </p>
        </div>
      </details>
      <p className="quiet-note">
        Estimate excludes bill adjustments and fees. Assessment value is not a
        sale price.
      </p>
      <SourceLink id="tax" onSource={onSource} />
    </section>
  );
}
export function PropertyPanel({
  data,
  community,
  property,
  onProperty,
  onSource,
  onSearch,
}: {
  data: AtlasData;
  community: Community;
  property: Property | null;
  onProperty: (p: Property) => void;
  onSource: (id: string) => void;
  onSearch: () => void;
}) {
  const rows = data.properties.filter(
      (p) => p.communityCode === community.comm_code,
    ),
    stats = data.aggregates[community.comm_code];
  const [limit, setLimit] = useState(8),
    [sort, setSort] = useState('address');
  const sorted = [...rows].sort((a, b) =>
    sort === 'price-up'
      ? a.assessedValue - b.assessedValue
      : sort === 'price-down'
        ? b.assessedValue - a.assessedValue
        : a.address.localeCompare(b.address, undefined, { numeric: true }),
  );
  return (
    <div className="panel-flow">
      {property ? (
        <>
          <div className="property-value">
            <span className="metric-label">
              City assessment · {property.rollYear}
            </span>
            <strong>{money(property.assessedValue)}</strong>
            <p>Annual assessed value</p>
          </div>
          <PropertyFacts property={property} onSource={onSource} />
        </>
      ) : (
        stats && (
          <div className="neighbourhood-stat">
            <span>Median residential assessment</span>
            <strong>{money(stats.median)}</strong>
            <small>
              {number(stats.count)} eligible assessed accounts · 2026
            </small>
          </div>
        )
      )}
      {property && (
        <AssessmentHistory key={property.rollNumber} property={property} />
      )}
      {property || stats ? (
        <TaxCalculator property={property} stats={stats} onSource={onSource} />
      ) : (
        <EmptyState title="An assessment is needed">
          Search an address to estimate its property tax and ownership costs.
        </EmptyState>
      )}
      {(property || stats) && (
        <OwnershipPlanner
          property={property}
          assessment={property?.assessedValue ?? stats!.median}
        />
      )}
      {property && (
        <details className="property-sun-tool" data-solar-details>
          <summary>
            <span>
              <strong>Sun & orientation</strong>
              <small>Direction, seasonal daylight and window exposure</small>
            </span>
            <ChevronDown size={17} aria-hidden="true" />
          </summary>
          <SolarPanel
            latitude={property.latitude}
            longitude={property.longitude}
            locationLabel={titleCase(property.address)}
          />
        </details>
      )}
      {!property && (
        <section>
          <div className="section-line">
            <h3>Explore properties</h3>
            <select
              aria-label="Sort properties"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="address">Address</option>
              <option value="price-up">Value: low to high</option>
              <option value="price-down">Value: high to low</option>
            </select>
          </div>
          <p className="quiet-note">
            {rows.length} included accounts. Search an address for more City
            records.
          </p>
          {sorted.slice(0, limit).map((p) => (
            <button
              key={p.rollNumber}
              className="property-list-row"
              onClick={() => onProperty(p)}
            >
              <span className="property-symbol">
                <House size={17} />
              </span>
              <span>
                <strong>{titleCase(p.address)}</strong>
                {p.yearBuilt != null && <small>Built {p.yearBuilt}</small>}
              </span>
              <span className="price-small">
                {compactMoney(p.assessedValue)}
                <ChevronRight size={14} />
              </span>
            </button>
          ))}
          {limit < rows.length && (
            <button
              className="secondary-button"
              onClick={() => setLimit((n) => n + 12)}
            >
              Show more properties
            </button>
          )}
          <button className="text-button" onClick={onSearch}>
            Search another address <ArrowRight size={14} />
          </button>
        </section>
      )}
    </div>
  );
}
export function CrimePanel({
  crime,
  onSource,
  quadrant = false,
}: {
  crime?: Crime;
  quadrant?: boolean;
  onSource: (id: string) => void;
}) {
  const comparison = crime?.latestYearComparison;
  const months =
    crime?.monthly.filter((m) => m.year === 2019 && m.publishedCount !== null)
      .length ?? 0;
  return (
    <div className="panel-flow">
      <a
        className="outline-action"
        href="https://www.calgarypolice.ca/transparency-and-accountability/crime-statistics.html"
        target="_blank"
        rel="noreferrer"
      >
        <Shield size={20} />
        <span>
          Current CPS crime statistics
          <small>Open the latest official report</small>
        </span>
        <ArrowUpRight size={17} />
      </a>
      <p className="quiet-note">
        The current CPS workbook is linked at its source. Its data is not
        republished here because a redistribution licence has not been
        established.
      </p>
      {quadrant ? (
        <EmptyState title="Crime is published by community">
          Choose a neighbourhood. Community counts cannot be allocated
          accurately to address quadrants.
        </EmptyState>
      ) : !crime ? null : (
        <>
          <div className="crime-headline">
            <span className="metric-label">Historical crime · 2019</span>
            {comparison?.current.publishedCount != null && (
              <strong>{number(comparison.current.publishedCount)}</strong>
            )}
            <span>January–December 2019 · selected categories</span>
            {months < 12 && (
              <p className="quiet-note">
                Source rows in {months}/12 months; missing months are not zero.
              </p>
            )}
            {comparison?.changePercent != null && (
              <p className="change-label">
                {comparison.changePercent >= 0 ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}{' '}
                {Math.abs(comparison.changePercent).toFixed(1)}%{' '}
                {comparison.changePercent >= 0 ? 'higher' : 'lower'} than 2018
              </p>
            )}
          </div>
          <div className="context-note">
            <Info size={17} />
            <p>
              Historical context only. These 2018–2019 records do not describe
              present conditions or a home’s safety. Counts are not adjusted for
              population or visitors.
            </p>
          </div>
          {crime.monthly.some((month) => month.publishedCount != null) && (
            <CrimeChart crime={crime} />
          )}
          {crime.latestYearCategories.some(
            (category) =>
              category.priorPublishedCount != null ||
              category.currentPublishedCount != null,
          ) && (
            <section>
              <div className="section-line">
                <h3>By category</h3>
                <span>Historical counts</span>
              </div>
              <div className="category-heading">
                <span>Available records</span>
                <span>2018</span>
                <span>2019</span>
              </div>
              {crime.latestYearCategories
                .filter(
                  (c) =>
                    c.priorPublishedCount != null ||
                    c.currentPublishedCount != null,
                )
                .map((c) => (
                  <div className="crime-category" key={c.category}>
                    <span>{c.category}</span>
                    <span>{c.priorPublishedCount}</span>
                    <strong>{c.currentPublishedCount}</strong>
                  </div>
                ))}
            </section>
          )}
          <p className="quiet-note">
            Category totals sum available source records, not necessarily every
            month in the year. Eight named crime categories; disorder records
            excluded. Missing categories remain unavailable. One invalid source
            category was excluded; affected annual comparisons are suppressed.
            Changes in boundaries and reporting practices limit historical
            comparisons.
          </p>
        </>
      )}
      <SourceLink
        id="crime"
        onSource={onSource}
        label="Historical data, current report & reuse terms"
      />
    </div>
  );
}
export function WaterPanel({
  data,
  community,
  property,
  onSource,
  onSearch,
}: {
  data: AtlasData;
  community: Community;
  property: Property | null;
  onSource: (id: string) => void;
  onSearch: () => void;
}) {
  const [livePipe, setLivePipe] = useState<{
      rollNumber: string;
      pipe: Pipe | null;
    } | null>(null),
    [checkingPipe, setCheckingPipe] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (property && !data.pipes[property.rollNumber]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- start a lookup when the address changes
      setCheckingPipe(true);
      getPublicPropertyDetails(property)
        .then((d) => {
          if (!cancelled)
            setLivePipe({ rollNumber: property.rollNumber, pipe: d.pipe });
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setCheckingPipe(false);
        });
    } else setCheckingPipe(false);
    return () => {
      cancelled = true;
    };
  }, [property, data.pipes]);
  const water = data.water[community.comm_code],
    pipe = property
      ? (data.pipes[property.rollNumber] ??
        (livePipe?.rollNumber === property.rollNumber ? livePipe.pipe : null))
      : null;
  const pipeRecords =
    pipe?.records.filter(
      (record) =>
        !['', 'Unknown', 'Other', 'Not available'].includes(
          record.materialLabel || record.material,
        ) ||
        record.installedDate ||
        record.diameterMm != null,
    ) ?? [];
  const materials = water
    ? Object.entries(water['water-mains'].byMaterialOrType).sort(
        (a, b) => b[1] - a[1],
      )
    : [];
  const materialColors = [
    '#b98260',
    '#5b9298',
    '#8b91ac',
    '#a6b69c',
    '#c6b69f',
  ];
  const materialSummary = materials.slice(0, 5).map(([name, count], index) => ({
    name: readableMaterial(name),
    count,
    color: materialColors[index],
  }));
  const otherMaterialCount = materials
    .slice(5)
    .reduce((sum, [, count]) => sum + count, 0);
  if (otherMaterialCount > 0)
    materialSummary.push({
      name: 'Other recorded materials',
      count: otherMaterialCount,
      color: '#c7cfd5',
    });
  return (
    <div className="panel-flow">
      <div className="water-intro">
        <h2>Public water infrastructure</h2>
      </div>
      {property &&
      (pipe?.knownMaterials.length || pipeRecords.length || checkingPipe) ? (
        <section className="pipe-card">
          <span className="metric-label">Public service connection</span>
          {checkingPipe ? (
            <strong role="status">Checking City records…</strong>
          ) : pipe?.knownMaterials.length ? (
            <strong>{pipe.materialSummary}</strong>
          ) : null}
          {pipe?.matchLabel && !checkingPipe && (
            <span
              className={`match-label ${pipe?.matchQuality === 'exact-address' ? 'verified' : ''}`}
            >
              {pipe?.matchQuality === 'exact-address' ? (
                <Check size={14} />
              ) : (
                <Info size={14} />
              )}{' '}
              {pipe.matchLabel}
            </span>
          )}
          {!checkingPipe &&
            pipeRecords.map((r, i) => (
              <div className="pipe-record" key={i}>
                <span>
                  {!['', 'Unknown', 'Other', 'Not available'].includes(
                    r.materialLabel || r.material,
                  )
                    ? r.materialLabel || r.material
                    : null}
                  {r.installedDate && (
                    <small>
                      Recorded installation: {r.installedDate.slice(0, 10)}
                    </small>
                  )}
                </span>
                {r.diameterMm != null && <strong>{r.diameterMm} mm</strong>}
              </div>
            ))}
          <p className="quiet-note">
            Public portion only. Interior plumbing and the private service line
            are unverified. Multiple records may describe different connections;
            active status is not established.
          </p>
        </section>
      ) : !property ? (
        <button className="outline-action" onClick={onSearch}>
          <House size={18} />
          <span>
            Check a property’s service line<small>Search by address</small>
          </span>
          <ArrowRight size={17} />
        </button>
      ) : null}
      {water ? (
        <>
          <section>
            <div className="section-line">
              <h3>Public main materials</h3>
              <span>{number(water['water-mains'].count)} segments</span>
            </div>
            <div className="material-stack" aria-hidden="true">
              {materialSummary.map(({ name, count, color }) => (
                <div
                  key={name}
                  style={{
                    flex: count,
                    background: color,
                  }}
                />
              ))}
            </div>
            {materialSummary.map(({ name, count, color }) => (
              <div className="material-row" key={name}>
                <span>
                  <i style={{ background: color }} />
                  {name}
                </span>
                <strong>
                  {Math.round((count / water['water-mains'].count) * 100)}%
                  <small>{count} segments</small>
                </strong>
              </div>
            ))}
            {otherMaterialCount > 0 && (
              <details className="reading-detail">
                <summary>
                  All public main materials <ChevronRight size={15} />
                </summary>
                {materials.map(([name, count]) => (
                  <div className="material-row" key={name}>
                    <span>{readableMaterial(name)}</span>
                    <strong>
                      {number(count)}
                      <small>segments</small>
                    </strong>
                  </div>
                ))}
              </details>
            )}
          </section>
          <div className="history-callout">
            <CalendarDays size={20} />
            <span>
              <strong>
                {water['water-breaks'].recordsSince2021} recorded breaks
              </strong>
              <small>Within this community · 2021 onward</small>
            </span>
          </div>
          <p className="quiet-note">
            Published historical events. Pipe material and age do not establish
            replacement need or a homeowner’s costs. Display coverage:
            Hillhurst, Sunnyside, Bridgeland / Riverside and Beltline.
          </p>
        </>
      ) : null}
      <details className="reading-detail">
        <summary>
          What about Poly-B inside a home?
          <ChevronRight size={15} />
        </summary>
        <p>
          The public water dataset does not identify interior Poly-B plumbing.
          Ask for inspection records and have the actual plumbing identified
          during a home inspection. Building age alone cannot establish a
          material or replacement requirement.
        </p>
      </details>
      <SourceLink id="services" onSource={onSource} />
    </div>
  );
}
export function AirPanel({
  air,
  onRefresh,
  refreshing,
  refreshError,
  onSource,
}: {
  air: Air;
  onRefresh: () => void;
  refreshing: boolean;
  refreshError: string;
  onSource: (id: string) => void;
}) {
  const observations = [...air.recentCityObservations].reverse(),
    scale = chartScale(
      observations.map((x) => x.aqhi),
      4,
    );
  const points = observations
    .map(
      (x, i) =>
        `${40 + (i * 276) / Math.max(1, observations.length - 1)},${133 - (x.aqhi / scale.top) * 108}`,
    )
    .join(' ');
  return (
    <div className="panel-flow">
      <div className="air-hero">
        <span className="metric-label">Calgary air quality health index</span>
        <div className="air-orbit">
          <div>
            <strong>{air.city.displayLabel ?? air.city.displayAqhi}</strong>
            <span>{air.city.riskCategory} risk</span>
          </div>
        </div>
        <p>
          {new Date(air.observationPeriod.at).toLocaleString('en-CA', {
            timeZone: 'America/Edmonton',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · Calgary time
        </p>
        <button
          className="refresh-button"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh observation'}
        </button>
        {refreshError && <p className="quiet-note">{refreshError}</p>}
      </div>
      <div className="aqhi-scale">
        {Array.from({ length: 11 }, (_, i) => (
          <span
            key={i}
            className={
              (
                i === 10
                  ? air.city.displayAqhi > 10
                  : i + 1 === air.city.displayAqhi
              )
                ? 'chosen'
                : ''
            }
            style={{
              borderTopColor: [
                '#8bb6c2',
                '#78aeba',
                '#639fba',
                '#c8c45e',
                '#d4b255',
                '#d59a4b',
                '#c07b48',
                '#bb6446',
                '#a24d45',
                '#843f4d',
                '#6f435d',
              ][i],
            }}
          >
            {i === 10 ? '10+' : i + 1}
          </span>
        ))}
      </div>
      <div className="range-labels">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Very high</span>
      </div>
      <div className="context-note">
        <Wind size={18} />
        <p>
          A city and station reading. It does not measure pollution at this
          property or long-term exposure.
        </p>
      </div>
      {observations.length > 0 && (
        <section>
          <div className="section-line">
            <h3>Recent city observations</h3>
            <span>Saved 24-hour series</span>
          </div>
          <svg
            viewBox="0 0 320 142"
            className="air-chart"
            role="img"
            aria-label="Calgary AQHI, saved recent observations"
          >
            <ChartAxes scale={scale} unit="AQHI" />
            <path
              d={`M ${points.replaceAll(' ', ' L ')}`}
              fill="none"
              stroke="#829eaa"
              strokeWidth="2.5"
            />
          </svg>
          <div className="range-labels">
            <span>
              {new Date(observations[0]?.observedAt).toLocaleString('en-CA', {
                timeZone: 'America/Edmonton',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
              })}
            </span>
            <span>
              {new Date(observations.at(-1)!.observedAt).toLocaleString(
                'en-CA',
                {
                  timeZone: 'America/Edmonton',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                },
              )}
            </span>
          </div>
          <ChartData
            caption="Calgary AQHI: saved recent city observations"
            columns={['Observed · Calgary time', 'AQHI']}
            rows={observations.map((observation) => ({
              label: new Date(observation.observedAt).toLocaleString('en-CA', {
                timeZone: 'America/Edmonton',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
              }),
              values: [observation.aqhi],
            }))}
          />
        </section>
      )}
      {air.stations.length > 0 && (
        <section>
          <div className="section-line">
            <h3>Monitoring stations</h3>
            <span>Same observation period</span>
          </div>
          {air.stations.map((s) => (
            <div className="station-row" key={s.id}>
              <MapPin size={17} />
              <span>
                {s.name}
                <small className="station-time">
                  {new Date(
                    s.observedAt ?? air.observationPeriod.at,
                  ).toLocaleString('en-CA', {
                    timeZone: 'America/Edmonton',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </small>
              </span>
              <strong>{s.displayLabel ?? s.displayAqhi}</strong>
              <small>{s.riskCategory}</small>
            </div>
          ))}
        </section>
      )}
      <ParticulateHistory />
      <SourceLink id="air" onSource={onSource} />
      <RadonPanel onSource={onSource} />
    </div>
  );
}
interface Election {
  reproductionNotice: string;
  representativeId: string;
  electionDate: string;
  district: string;
  winner: { name: string; voteSharePercent: number; party: string };
  turnoutPercent: number;
  candidates: {
    name: string;
    party: string;
    votes: number;
    voteSharePercent: number;
    elected: boolean;
  }[];
  sources: { url: string; label: string }[];
}
export function CivicPanel({
  data,
  community,
  property,
  onProperty,
  onSource,
}: {
  data: AtlasData;
  community: Community;
  property: Property | null;
  onProperty: (p: Property) => void;
  onSource: (id: string) => void;
}) {
  const [elections, setElections] = useState<Election[]>([]);
  useEffect(() => {
    fetch('/data/elections.json')
      .then((r) => r.json() as Promise<{ results: Election[] }>)
      .then((d) => setElections(d.results))
      .catch(() => {});
  }, []);
  const sample =
      property ??
      data.properties.find((p) => p.communityCode === community.comm_code),
    ids = [
      sample?.mpRepresentativeId,
      sample?.mlaRepresentativeId,
      sample?.councillorRepresentativeId ??
        data.communityWards[community.comm_code],
    ];
  const reps = ids
    .map((id) => data.representatives.find((r) => r.id === id))
    .filter((r): r is Representative => !!r);
  return (
    <div className="panel-flow">
      <p className="place-description">
        Council, provincial and federal representation.
      </p>
      {!property && sample && (
        <div className="context-note">
          <MapPin size={17} />
          <p>
            Showing representatives for{' '}
            <button className="inline-link" onClick={() => onProperty(sample)}>
              {titleCase(sample.address)}
            </button>
            . Electoral districts can split a neighbourhood.
          </p>
        </div>
      )}
      {reps.length ? (
        reps.map((rep) => {
          const election = elections.find((e) => e.representativeId === rep.id);
          const linkOnly = rep.status === 'link-only';
          const party = linkOnly ? election?.winner.party : rep.party;
          const color =
            party === 'Liberal'
              ? '#bb5c54'
              : party === 'Conservative'
                ? '#4b73a5'
                : party?.includes('Democratic')
                  ? '#bd864b'
                  : '#607b72';
          return (
            <section className="representative-card" key={rep.id}>
              <div className="representative-heading">
                <span>
                  <small>
                    {rep.level === 'federal'
                      ? 'MEMBER OF PARLIAMENT'
                      : rep.level === 'provincial'
                        ? 'PROVINCIAL ELECTORAL DISTRICT'
                        : 'CITY COUNCILLOR'}
                  </small>
                  <h3>{rep.name || rep.displayName || 'Vacant seat'}</h3>
                </span>
              </div>
              <p className="district-name">{rep.district}</p>
              <div className="rep-footer">
                {(linkOnly || rep.status === 'vacant' || rep.party) && (
                  <span className="party-label">
                    {!linkOnly && <i style={{ background: color }} />}
                    {linkOnly
                      ? 'Official Assembly directory'
                      : rep.status === 'vacant'
                        ? 'No current officeholder'
                        : rep.party}
                  </span>
                )}
                <a
                  href={rep.profileUrl || rep.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={
                    linkOnly
                      ? `View the official MLA directory for ${rep.district}`
                      : `Official profile for ${rep.name || rep.displayName || 'Vacant seat'}`
                  }
                >
                  <ArrowUpRight size={17} />
                </a>
              </div>
              {election && (
                <details className="election-results">
                  <summary>
                    <span>
                      {election.electionDate.slice(0, 4)} election result
                    </span>
                    <strong>
                      {election.winner.voteSharePercent}%
                      <ChevronRight size={15} />
                    </strong>
                  </summary>
                  <div className="election-body">
                    <div className="candidate-axis">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                    {election.candidates.map((c) => (
                      <div className="candidate" key={c.name}>
                        <div>
                          <span>
                            {c.name}
                            {c.elected && <Check size={12} />}
                          </span>
                          <strong>{c.voteSharePercent}%</strong>
                        </div>
                        <div className="candidate-track">
                          <span
                            style={{
                              width: `${c.voteSharePercent}%`,
                              background: c.elected ? color : '#c8d2ce',
                            }}
                          />
                        </div>
                        <small>
                          {c.party} · {number(c.votes)} votes
                        </small>
                      </div>
                    ))}
                    <p className="quiet-note">
                      Whole district results · {election.turnoutPercent}%
                      turnout. Election-time party affiliation.
                    </p>
                    <p className="quiet-note">{election.reproductionNotice}</p>
                    {election.sources.map((source) => (
                      <a
                        className="source-link"
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label} <ArrowUpRight size={13} />
                      </a>
                    ))}
                  </div>
                </details>
              )}
              <PoliticalTimeline representativeId={rep.id} />
            </section>
          );
        })
      ) : (
        <EmptyState title="Representation needs an address match">
          Select a specific address to resolve its federal, provincial and
          municipal districts. Community boundaries can overlap electoral
          districts.
        </EmptyState>
      )}
      <p className="quiet-note">
        MP records verified 13 September 2026; councillors verified 14 September
        2026. Current MLA names and affiliations are available in the linked
        Assembly directory. District matches use published boundaries and
        approximate parcel points. Historical election results do not establish
        the current officeholder or affiliation.
      </p>
      <SourceLink
        id="federal"
        onSource={onSource}
        label="Representatives & election sources"
      />
    </div>
  );
}
const buyerChecks = [
  {
    id: 'radon',
    title: 'Ask for a long-term radon test',
    text: 'Review dated results and mitigation records; plan a test if the home has none.',
  },
  {
    id: 'sunlight',
    title: 'Check daylight in the rooms you will use',
    text: 'Confirm window direction and shade from trees or buildings, including in winter.',
  },
  {
    id: 'inspection',
    title: 'Inspect the home and private plumbing',
    text: 'Confirm actual materials, roof and foundation condition with inspection records.',
  },
  {
    id: 'title',
    title: 'Review title and property documents',
    text: 'Check encumbrances, permits and the real property report with your adviser.',
  },
  {
    id: 'flood',
    title: 'Check the flood map and insurance',
    text: 'Review the specific address, then obtain an insurance quote.',
  },
  {
    id: 'school',
    title: 'Confirm school eligibility',
    text: 'Catchment boundaries and capacity can change. Verify with the school board.',
  },
  {
    id: 'condo',
    title: 'Read condo documents, if applicable',
    text: 'Review the reserve fund study, fees, financials and special assessments.',
  },
  {
    id: 'visit',
    title: 'Visit at different times',
    text: 'Check traffic, sound, parking and your everyday journey in person.',
  },
];
export function BuyerChecklist({ placeId }: { placeId: string }) {
  const [checked, setChecked] = useState<string[]>([]);
  useEffect(() => {
    function read() {
      try {
        const stored = JSON.parse(
          localStorage.getItem(`atlas-checks-${placeId}`) || '[]',
        );
        setChecked(
          Array.isArray(stored)
            ? stored.filter((id) =>
                buyerChecks.some((check) => check.id === id),
              )
            : [],
        );
      } catch {
        setChecked([]);
      }
    }
    function sync(event: Event) {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== `atlas-checks-${placeId}`
      )
        return;
      read();
    }
    read();
    window.addEventListener('storage', sync);
    window.addEventListener(LOCAL_DATA_CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(LOCAL_DATA_CHANGED, sync);
    };
  }, [placeId]);
  function toggle(id: string) {
    const next = checked.includes(id)
      ? checked.filter((x) => x !== id)
      : [...checked, id];
    try {
      if (next.length)
        localStorage.setItem(`atlas-checks-${placeId}`, JSON.stringify(next));
      else localStorage.removeItem(`atlas-checks-${placeId}`);
    } catch {}
    setChecked(next);
  }
  return (
    <section className="buyer-checklist">
      <div className="section-line">
        <h3>Before you make an offer</h3>
        <span>
          {checked.length} / {buyerChecks.length}
        </span>
      </div>
      <p className="quiet-note">A practical checklist, saved on this device.</p>
      {buyerChecks.map((c) => (
        <label className="checklist-row" key={c.id}>
          <input
            type="checkbox"
            checked={checked.includes(c.id)}
            onChange={() => toggle(c.id)}
          />
          <span>
            <strong>{c.title}</strong>
            <small>{c.text}</small>
          </span>
        </label>
      ))}
    </section>
  );
}
export function SourcesView({
  focus,
  onBack,
  backLabel = 'Return to map',
}: {
  focus: string;
  onBack: () => void;
  backLabel?: string;
}) {
  const [category, setCategory] = useState('All');
  useEffect(() => {
    if (focus) {
      requestAnimationFrame(() =>
        document.getElementById(`source-${focus}`)?.scrollIntoView({
          block: 'center',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
        }),
      );
    }
  }, [focus]);
  return (
    <section
      id="workspace-content"
      tabIndex={-1}
      className="workspace-view sources-view"
    >
      <div className="workspace-heading">
        <div>
          <h1>Sources & methodology</h1>
          <p>Publishers, dates, geographic coverage and reuse terms.</p>
        </div>
        <button className="secondary-button" onClick={onBack}>
          {backLabel} <ArrowRight size={16} />
        </button>
      </div>
      <div className="sources-intro">
        <div>
          <h2>How to read these records</h2>
          <p>
            Each source lists its publisher, date and geographic coverage.
            Estimates and unavailable records are labelled.
          </p>
        </div>
        <div className="coverage-summary">
          <strong>Coverage at a glance</strong>
          <p>
            Citywide assessment summaries, neighbourhood boundaries, quadrants,
            licensed historical crime records, census context, transport and
            nearby essentials. Detailed development and infrastructure extracts
            start with Hillhurst, Sunnyside, Bridgeland / Riverside and
            Beltline. Address search connects to the City’s current assessment
            roll.
          </p>
          <span>Sources reviewed 13–16 September 2026</span>
        </div>
      </div>
      <nav className="source-filters" aria-label="Source categories">
        {['All', ...new Set(SOURCES.map((s) => s.category))].map((c) => (
          <button
            className={c === category ? 'active' : ''}
            aria-pressed={c === category}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </nav>
      <div className="source-grid">
        {SOURCES.filter(
          (s) => category === 'All' || s.category === category,
        ).map((s, i) => (
          <article
            id={`source-${s.id}`}
            className={`source-card ${focus === s.id ? 'highlighted' : ''}`}
            key={s.id}
          >
            <div className="source-card-top">
              <span>{s.category}</span>
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h2>{s.name}</h2>
            <p className="source-publisher">{s.publisher}</p>
            <dl>
              <div>
                <dt>Period</dt>
                <dd>{s.date}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{s.scope}</dd>
              </div>
            </dl>
            <details className="source-method" open={focus === s.id}>
              <summary>Method & limitations</summary>
              <p>{s.detail}</p>
            </details>
            <a href={s.url} target="_blank" rel="noreferrer">
              Open official source <ArrowUpRight size={15} />
            </a>
          </article>
        ))}
      </div>
      <RightsAndAttribution />
      <div className="source-credits">
        <h2>Map & interface credits</h2>
        <p>
          Map style adapted from Positron (CARTO, Stamen and Paul Norman, via
          OpenMapTiles/OpenFreeMap). Neighbourhood View adjusts colours and adds
          data layers. Original design and software terms are retained in the{' '}
          <a
            href="https://github.com/openmaptiles/positron-gl-style/blob/master/LICENSE.md"
            target="_blank"
            rel="noreferrer"
          >
            Positron licence and credits
          </a>
          .
        </p>
        <p>
          3D buildings use OpenStreetMap-derived geometry; heights may be
          missing or approximated. The Aerial mode uses the City’s real 2025
          orthophotography, with a separate vector building model. It is not
          Google’s textured 3D imagery.
        </p>
        <div>
          <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">
            OpenFreeMap <ArrowUpRight size={13} />
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap contributors <ArrowUpRight size={13} />
          </a>
          <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">
            OpenMapTiles <ArrowUpRight size={13} />
          </a>
          <Link href="/privacy" prefetch={false}>
            Privacy policy <ArrowUpRight size={13} />
          </Link>
          <Link href="/terms" prefetch={false}>
            Use & limitations <ArrowUpRight size={13} />
          </Link>
          <a href="https://maplibre.org/" target="_blank" rel="noreferrer">
            MapLibre GL <ArrowUpRight size={13} />
          </a>
        </div>
        <p>
          Calgary Neighbourhood View is an independent project. It is not
          affiliated with the City of Calgary, Calgary Police Service or a real
          estate brokerage.
        </p>
      </div>
    </section>
  );
}
