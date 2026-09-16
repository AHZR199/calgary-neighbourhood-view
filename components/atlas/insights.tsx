'use client';
import { ChartAxes, chartScale } from './charts';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calculator,
  ChevronRight,
  Info,
  House,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { getPublicPropertyDetails } from '@/lib/atlas/property-details';
import { money, number, TAX_RATE } from '@/lib/atlas/data';
import type { Property } from '@/lib/atlas/data';
import {
  minimumDownPayment,
  insurancePremium,
  monthlyPayment,
  registrationFees,
  remainingBalance,
  utilityBill,
} from '@/lib/atlas/calculations';
interface Demographic {
  communityCode: string;
  populationPrivateHouseholds: number | null;
  households: {
    totalBySizeTable: number | null;
    averageSize: number | null;
    sizeDistribution: {
      label: string;
      count: number | null;
      percent: number | null;
    }[];
  };
  ageGroups: { label: string; count: number | null; percent: number | null }[];
}
export function CensusContext({ code }: { code: string }) {
  const [records, setRecords] = useState<Demographic[]>([]);
  useEffect(() => {
    let off = false;
    fetch('/data/demographics.json')
      .then((r) => r.json() as Promise<{ communities: Demographic[] }>)
      .then((d) => {
        if (!off) setRecords(d.communities);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  const row = records.find((c) => c.communityCode === code);
  if (!row) return null;
  const singleHouseholds = row.households.sizeDistribution.find(
    (item) => item.label === '1 person',
  )?.percent;
  const metrics = [
    {
      label: 'Private-household residents',
      value: row.populationPrivateHouseholds,
      unit: '',
    },
    {
      label: 'Average household size',
      value: row.households.averageSize,
      unit: '',
    },
    {
      label: 'Private households',
      value: row.households.totalBySizeTable,
      unit: '',
    },
    { label: 'One-person households', value: singleHouseholds, unit: '%' },
  ].filter((metric) => metric.value != null);
  const ages = row.ageGroups.filter((item) => item.percent != null);
  const sizes = row.households.sizeDistribution.filter(
    (item) => item.percent != null,
  );
  if (!metrics.length && !ages.length && !sizes.length) return null;
  return (
    <section className="census-context">
      <div className="section-line">
        <h3>People & households</h3>
        <span className="data-badge">2021 census</span>
      </div>
      {metrics.length > 0 && (
        <div className="census-grid">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <strong>
                {metric.value == null ? null : number(metric.value)}
                {metric.unit && <small>{metric.unit}</small>}
              </strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      )}
      {(ages.length > 0 || sizes.length > 0) && (
        <details className="reading-detail">
          <summary>
            Age & household composition <ChevronRight size={14} />
          </summary>
          {ages.length > 0 && (
            <>
              <h4 className="distribution-label">Age of residents</h4>
              <div
                className="percent-axis"
                aria-label="Percentage scale from 0 to 100"
              >
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <div className="age-distribution">
                {ages.map((item) => (
                  <div key={item.label}>
                    <span>{item.label} years</span>
                    <div>
                      <span style={{ width: `${item.percent}%` }} />
                    </div>
                    <strong>{item.percent}%</strong>
                  </div>
                ))}
              </div>
            </>
          )}
          {sizes.length > 0 && (
            <>
              <h4 className="distribution-label">People per household</h4>
              <div className="housing-mix">
                {sizes.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.percent}%</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </details>
      )}
      <p className="quiet-note">
        Historical data on 2022 community geography; excludes collective
        dwellings. Published rounding is preserved. This does not describe
        individual residents.
      </p>
      <a
        className="source-link"
        href="https://data.calgary.ca/d/f9wk-wej9"
        target="_blank"
        rel="noreferrer"
      >
        Open population & age data <ArrowUpRight size={13} />
      </a>
      <a
        className="source-link"
        href="https://data.calgary.ca/d/msjx-5ygv"
        target="_blank"
        rel="noreferrer"
      >
        Open household-size data <ArrowUpRight size={13} />
      </a>
      <a
        className="source-link"
        href="https://www.calgary.ca/communities/profiles.html"
        target="_blank"
        rel="noreferrer"
      >
        Income, tenure & full City profiles <ArrowUpRight size={13} />
      </a>
    </section>
  );
}
interface HistoryRow {
  year: number;
  assessedValue: number | null;
  status: string;
}
export function AssessmentHistory({ property }: { property: Property }) {
  const [rows, setRows] = useState<HistoryRow[]>([]),
    [active, setActive] = useState(2026);
  useEffect(() => {
    let off = false;
    fetch('/data/assessment-history.json')
      .then(
        (r) =>
          r.json() as Promise<{
            byRollNumber: Record<string, { history: HistoryRow[] }>;
          }>,
      )
      .then(async (d) => {
        let history = d.byRollNumber[property.rollNumber]?.history;
        if (!history) {
          const extra = await getPublicPropertyDetails(property);
          history = [
            ...(extra.history || []),
            {
              year: property.rollYear,
              assessedValue: property.assessedValue,
              status: 'recorded',
            },
          ];
        }
        if (!off) {
          setRows(
            Array.from(
              { length: 10 },
              (_, i) =>
                history.find((row) => row.year === 2017 + i) ?? {
                  year: 2017 + i,
                  assessedValue: null,
                  status: 'not-published',
                },
            ),
          );
          setActive(property.rollYear);
        }
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [property]);
  if (rows.filter((row) => row.assessedValue != null).length < 2) return null;
  const scale = chartScale(rows.map((r) => r.assessedValue ?? 0)),
    selected = rows.find((r) => r.year === active),
    prior = rows.find((r) => r.year === active - 1);
  const change =
    selected?.assessedValue && prior?.assessedValue
      ? ((selected.assessedValue - prior.assessedValue) / prior.assessedValue) *
        100
      : null;
  return (
    <section className="assessment-history">
      <div className="section-line">
        <h3>Assessment history</h3>
        <span>2017–2026</span>
      </div>
      <div className="history-readout">
        <span>{active}</span>
        <strong>
          {selected?.assessedValue != null
            ? money(selected.assessedValue)
            : null}
        </strong>
        {change !== null && (
          <small>
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}% from {active - 1}
          </small>
        )}
      </div>
      <div className="history-plot">
        <span className="chart-unit">CAD · select a year</span>
        <div className="history-grid" aria-hidden="true">
          {scale.ticks.map((v) => (
            <div key={v} style={{ bottom: `${(v / scale.top) * 100}%` }}>
              <span>
                {v >= 1e6
                  ? `$${+(v / 1e6).toFixed(2)}m`
                  : v
                    ? `$${v / 1000}k`
                    : '$0'}
              </span>
            </div>
          ))}
        </div>
        <div
          className="history-bars"
          role="group"
          aria-label="Select an assessment year"
        >
          {rows.map((r) =>
            r.assessedValue == null ? (
              <span
                className="history-gap"
                key={r.year}
                aria-hidden="true"
                style={{ flex: 1, minWidth: 0 }}
              />
            ) : (
              <button
                key={r.year}
                aria-label={`${r.year}: ${money(r.assessedValue)}`}
                aria-pressed={r.year === active}
                className={r.year === active ? 'active' : ''}
                onClick={() => setActive(r.year)}
              >
                <span className="history-bar-track">
                  <span
                    style={{
                      height: `${(r.assessedValue / scale.top) * 100}%`,
                    }}
                  />
                </span>
                <small>{String(r.year).slice(2)}</small>
              </button>
            ),
          )}
        </div>
      </div>
      <p className="quiet-note">
        Annual tax assessments, not sale prices or investment returns. Missing
        years are retained as gaps; changes to a property or its assessment
        account can affect comparisons.
      </p>
      <a
        className="source-link"
        href="https://data.calgary.ca/d/4ur7-wsgc"
        target="_blank"
        rel="noreferrer"
      >
        City assessment history <ArrowUpRight size={13} />
      </a>
    </section>
  );
}
export function OwnershipPlanner({
  property,
  assessment,
}: {
  property: Property | null;
  assessment: number;
}) {
  const [open, setOpen] = useState(false),
    [price, setPrice] = useState(assessment),
    [down, setDown] = useState(Math.round(assessment * 0.2)),
    [rate, setRate] = useState(5),
    [years, setYears] = useState(25),
    [eligible, setEligible] = useState(false),
    [includeUtility, setIncludeUtility] = useState(false),
    [water, setWater] = useState(19),
    [renewal, setRenewal] = useState(6),
    [other, setOther] = useState<Record<string, string>>({
      Condo: '',
      Insurance: '',
      Maintenance: '',
      Energy: '',
    });
  const minimum = minimumDownPayment(price),
    insured = down < price * 0.2,
    invalid =
      price <= 0
        ? 'Enter a purchase price.'
        : down < minimum
          ? `Minimum down payment for this example is ${money(minimum)}.`
          : down > price
            ? 'Down payment cannot exceed purchase price.'
            : insured && years === 30 && !eligible
              ? 'Confirm Home Start eligibility to use a 30-year insured example.'
              : '';
  const premium = insured ? insurancePremium(price, down, years) : 0,
    principal = Math.max(0, price - down) + premium,
    payment = monthlyPayment(principal, rate, years),
    utility = includeUtility ? (utilityBill(water) * 365) / 360 : 0,
    additional = Object.values(other).reduce(
      (n, v) => n + (v === '' ? 0 : Number(v)),
      0,
    ),
    subtotal = payment + (assessment * TAX_RATE) / 12 + utility + additional,
    unknown = Object.values(other).filter((v) => v === '').length,
    fees = registrationFees(price, principal),
    balance = remainingBalance(principal, rate, years, 60),
    nextPayment = monthlyPayment(balance, renewal, years - 5);
  return (
    <>
      <button className="planner-launch" onClick={() => setOpen(true)}>
        <span>
          <Calculator size={21} />
        </span>
        <span>
          <strong>Plan the cost of owning</strong>
          <small>Mortgage, taxes, utilities & closing costs</small>
        </span>
        <ArrowUpRight size={17} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="ownership-dialog">
          <DialogTitle>Ownership cost worksheet</DialogTitle>
          <DialogDescription>
            A planning worksheet using your assumptions and published rates.
            This is not a mortgage quote or approval.
          </DialogDescription>
          <div className="ownership-layout">
            <div className="planner-inputs">
              <div className="planner-section-label">
                <Wallet size={17} />
                <h3>Purchase & mortgage</h3>
              </div>
              <div className="input-pair">
                <label>
                  Purchase price
                  <span className="planner-field">
                    <span>$</span>
                    <input
                      aria-label="Purchase price"
                      type="number"
                      min="1"
                      max="100000000"
                      value={price}
                      onChange={(e) =>
                        setPrice(Math.max(0, Number(e.target.value)))
                      }
                    />
                  </span>
                </label>
                <label>
                  Down payment
                  <span className="planner-field">
                    <span>$</span>
                    <input
                      aria-label="Down payment"
                      type="number"
                      min="0"
                      max={price}
                      value={down}
                      onChange={(e) =>
                        setDown(Math.max(0, Number(e.target.value)))
                      }
                    />
                  </span>
                </label>
              </div>
              <p className="quiet-note">
                Price starts at the{' '}
                {property
                  ? 'property assessment'
                  : 'community median assessment'}{' '}
                for illustration. Enter your intended purchase price.
              </p>
              <div className="input-pair">
                <label>
                  Assumed fixed rate
                  <span className="planner-field">
                    <input
                      aria-label="Assumed mortgage rate"
                      type="number"
                      min="0"
                      max="25"
                      step=".05"
                      value={rate}
                      onChange={(e) =>
                        setRate(
                          Math.min(25, Math.max(0, Number(e.target.value))),
                        )
                      }
                    />
                    <span>%</span>
                  </span>
                </label>
                <label>
                  Amortization
                  <select
                    aria-label="Mortgage amortization"
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                  >
                    <option value={25}>25 years</option>
                    <option value={30}>30 years</option>
                  </select>
                </label>
              </div>
              {insured && years === 30 && (
                <label className="planner-check">
                  <input
                    type="checkbox"
                    checked={eligible}
                    onChange={(e) => setEligible(e.target.checked)}
                  />
                  <span>
                    Assume eligibility for CMHC Home Start
                    <small>
                      Qualifying first-time buyer or new build; further criteria
                      apply.
                    </small>
                  </span>
                </label>
              )}
              {premium > 0 && (
                <div className="planner-fact">
                  <span>Estimated default insurance, financed</span>
                  <strong>{money(premium)}</strong>
                </div>
              )}
              <div className="planner-section-label">
                <House size={17} />
                <h3>Everyday ownership</h3>
              </div>
              <div className="planner-fact">
                <span>
                  Base property tax / month
                  <small>Based on {money(assessment)} assessment</small>
                </span>
                <strong>{money((assessment * TAX_RATE) / 12, 2)}</strong>
              </div>
              <label className="planner-check">
                <input
                  type="checkbox"
                  checked={includeUtility}
                  onChange={(e) => setIncludeUtility(e.target.checked)}
                />
                <span>
                  Include City metered water & three carts
                  <small>
                    Only if applicable and not already in condo fees.
                  </small>
                </span>
              </label>
              {includeUtility && (
                <label className="utility-input">
                  Assumed water use per 30 days
                  <span className="planner-field">
                    <input
                      aria-label="Water use in cubic metres"
                      type="number"
                      min="0"
                      max="1000"
                      value={water}
                      onChange={(e) =>
                        setWater(Math.max(0, Number(e.target.value)))
                      }
                    />
                    <span>m³</span>
                  </span>
                  <small>
                    {money(utilityBill(water), 2)} per 30-day bill ·{' '}
                    {money(utility, 2)} per average month
                  </small>
                </label>
              )}
              <div className="input-pair">
                {Object.entries(other).map(([key, value]) => (
                  <label key={key}>
                    {key === 'Condo'
                      ? 'Condo fees'
                      : key === 'Energy'
                        ? 'Energy & other utilities'
                        : key === 'Insurance'
                          ? 'Home insurance'
                          : 'Maintenance allowance'}
                    <span className="planner-field">
                      <span>$</span>
                      <input
                        aria-label={`${key} monthly cost`}
                        type="number"
                        min="0"
                        value={value}
                        placeholder="Unknown"
                        onChange={(e) =>
                          setOther((o) => ({
                            ...o,
                            [key]:
                              e.target.value === ''
                                ? ''
                                : String(Math.max(0, Number(e.target.value))),
                          }))
                        }
                      />
                      <span>/ mo</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="quiet-note">
                Enter 0 only when confirmed not applicable. Extra tax levies,
                HOA charges and other unentered costs are excluded.
              </p>
            </div>
            <aside className="planner-results">
              <span className="eyebrow">YOUR MONTHLY PLAN</span>
              {invalid ? (
                <div className="validation-note">
                  <Info size={17} />
                  {invalid}
                </div>
              ) : (
                <>
                  <div className="ownership-total">
                    <strong>{money(subtotal)}</strong>
                    <span>known monthly subtotal</span>
                    <small>
                      {unknown} additional cost{' '}
                      {unknown === 1 ? 'category' : 'categories'} unconfirmed
                    </small>
                  </div>
                  <div className="cost-breakdown">
                    <div>
                      <span>Mortgage principal & interest</span>
                      <strong>{money(payment, 2)}</strong>
                    </div>
                    <div>
                      <span>Base property tax</span>
                      <strong>{money((assessment * TAX_RATE) / 12, 2)}</strong>
                    </div>
                    {includeUtility && (
                      <div>
                        <span>Estimated City utilities</span>
                        <strong>{money(utility, 2)}</strong>
                      </div>
                    )}
                    {additional > 0 && (
                      <div>
                        <span>Other entered monthly costs</span>
                        <strong>{money(additional, 2)}</strong>
                      </div>
                    )}
                  </div>
                  <div className="renewal-scenario">
                    <h3>At renewal in five years</h3>
                    <label>
                      Assumed renewal rate<strong>{renewal.toFixed(1)}%</strong>
                    </label>
                    <Slider
                      aria-label="Assumed renewal mortgage rate"
                      value={[renewal]}
                      min={0}
                      max={12}
                      step={0.1}
                      onValueChange={(v) => setRenewal(v[0])}
                    />
                    <div>
                      <span>
                        Illustrative mortgage payment
                        <strong>{money(nextPayment, 2)} / mo</strong>
                      </span>
                    </div>
                    <p>
                      Assumes scheduled payments, no prepayments and unchanged
                      amortization. The future rate is your scenario.
                    </p>
                  </div>
                  <div className="closing-estimate">
                    <h3>Registration fees to budget</h3>
                    <div>
                      <span>Transfer</span>
                      <strong>{money(fees.transfer)}</strong>
                    </div>
                    <div>
                      <span>New mortgage</span>
                      <strong>{money(fees.mortgage)}</strong>
                    </div>
                    <p>
                      Alberta schedule · May 2026. Assumes one title and a
                      registered mortgage equal to the calculated principal.
                      Legal fees, inspections and closing adjustments are
                      additional.
                    </p>
                  </div>
                </>
              )}
              <div className="planner-sources">
                <a
                  href="https://itools-ioutils.fcac-acfc.gc.ca/MC-CH/MortgageCalculator.aspx"
                  target="_blank"
                  rel="noreferrer"
                >
                  FCAC mortgage calculator <ArrowUpRight size={12} />
                </a>
                <a
                  href="https://www.calgary.ca/water/water-utility/residential-water-rates-and-billing.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  2026 City utility rates <ArrowUpRight size={12} />
                </a>
                <a
                  href="https://www.alberta.ca/system/files/sartr-land-titles-and-surveys-common-documents-fee-schedule.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Alberta registration fees <ArrowUpRight size={12} />
                </a>
              </div>
              <p className="quiet-note">
                Fixed-rate model: nominal annual interest compounded
                semiannually, monthly payments. Standard 1–2-unit owner-occupied
                purchase, traditional down payment. Lender and product
                eligibility require confirmation.
              </p>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
interface ElectionHistory {
  reproductionNotice: string;
  currentRepresentativeId: string;
  electionDate: string;
  boundarySeriesId: string;
  comparableWithPreviousListedElection: boolean | null;
  winner: { name: string; party: string; voteSharePercent: number };
  sources: { url: string; label: string }[];
}
export function PoliticalTimeline({
  representativeId,
}: {
  representativeId: string;
}) {
  const [history, setHistory] = useState<ElectionHistory[]>([]);
  useEffect(() => {
    fetch('/data/election-history.json')
      .then((r) => r.json() as Promise<{ results: ElectionHistory[] }>)
      .then((d) => setHistory(d.results))
      .catch(() => {});
  }, []);
  const rows = history.filter(
    (h) => h.currentRepresentativeId === representativeId,
  );
  if (rows.length < 2) return null;
  return (
    <details className="political-timeline">
      <summary>
        Earlier election history
        <ChevronRight size={14} />
      </summary>
      <div>
        {rows.map((r, i) => (
          <div key={r.electionDate}>
            {i > 0 && r.boundarySeriesId !== rows[i - 1].boundarySeriesId && (
              <p className="boundary-break">
                District boundaries changed before this election
              </p>
            )}
            <a href={r.sources[0]?.url} target="_blank" rel="noreferrer">
              <span>{r.electionDate.slice(0, 4)}</span>
              <span>
                <strong>{r.winner.name}</strong>
                <small>
                  {r.winner.party} · {r.winner.voteSharePercent}%
                </small>
              </span>
              <ArrowUpRight size={12} />
            </a>
            <p className="quiet-note">{r.reproductionNotice}</p>
            {r.sources.map((source) => (
              <a
                className="source-link"
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label} <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
        ))}
      </div>
      <p className="quiet-note">
        Historical winners for the whole riding. Current representatives and
        affiliations are shown above.
      </p>
    </details>
  );
}
interface PMStation {
  name: string;
  daily: { date: string; mean: number | null; complete24Hours: boolean }[];
}
export function ParticulateHistory() {
  const [stations, setStations] = useState<Record<string, PMStation>>({}),
    [station, setStation] = useState('calgary-central-inglewood');
  useEffect(() => {
    fetch('/data/pm25.json')
      .then((r) => r.json() as Promise<{ stations: Record<string, PMStation> }>)
      .then((d) => setStations(d.stations))
      .catch(() => {});
  }, []);
  const item = stations[station];
  if (!item) return null;
  const scale = chartScale(
    item.daily.map((d) => d.mean ?? 0),
    30,
  );
  return (
    <section className="pm-history">
      <div className="section-line">
        <h3>Fine particulate matter</h3>
        <span>PM₂.₅ · µg/m³</span>
      </div>
      <select
        aria-label="PM2.5 monitoring station"
        value={station}
        onChange={(e) => setStation(e.target.value)}
      >
        {Object.entries(stations).map(([id, s]) => (
          <option key={id} value={id}>
            {s.name}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 320 162"
        role="img"
        aria-label="Daily PM2.5 means from August 13 to September 12, 2026; gaps represent incomplete days"
      >
        <ChartAxes scale={scale} unit="µg/m³" />
        {item.daily.map((d, i) => (
          <g key={d.date}>
            {d.mean !== null ? (
              <rect
                x={42 + i * 8.85}
                y={133 - (d.mean / scale.top) * 108}
                width="6"
                height={(d.mean / scale.top) * 108}
                rx="2"
                fill="#829eaa"
              >
                <title>
                  {d.date}: {d.mean} µg/m³
                </title>
              </rect>
            ) : (
              <circle cx={45 + i * 8.85} cy="138" r="1.5" fill="#acc9dc">
                <title>{d.date}: incomplete day</title>
              </circle>
            )}
          </g>
        ))}
        <text x="40" y="159" fontSize="12" fill="#5a6670">
          Aug 13
        </text>
        <text x="316" y="159" textAnchor="end" fontSize="12" fill="#5a6670">
          Sep 12
        </text>
      </svg>
      <p className="quiet-note">
        31-day station record, provisional and not fully quality-controlled.
        Daily means require 24 valid hours; incomplete days stay blank. Source
        timestamps are retained without an assumed timezone. This is not a
        long-term exposure estimate for a home.
      </p>
      <a
        className="source-link"
        href="https://data.calgary.ca/d/g9s5-qhu5"
        target="_blank"
        rel="noreferrer"
      >
        City pollutant observations <ArrowUpRight size={13} />
      </a>
    </section>
  );
}
