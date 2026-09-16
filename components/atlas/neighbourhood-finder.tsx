'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { ArrowRight, ArrowUpRight, MapPin, RefreshCw } from 'lucide-react';
import {
  DEFAULT_FINDER_PREFERENCES,
  FINDER_PRIORITY_LABELS,
  rankNeighbourhoods,
  type FinderData,
  type FinderMatch,
  type FinderPreferences,
  type FinderPriority,
  type FinderQuadrant,
  type FinderSchoolLevel,
  type FinderWeight,
} from '@/lib/atlas/neighbourhood-finder';
import './neighbourhood-finder.css';

interface FinderProps {
  active?: boolean;
  onExplore: (code: string) => void;
  onCompare: (codes: string[]) => void;
  onSource: (id: string) => void;
}
const priorities: FinderPriority[] = [
  'budget',
  'services',
  'transit',
  'parks',
  'schools',
  'downtown',
];
const weightLabels = ['Off', 'Low', 'Medium', 'High'];
const priorityNotes: Record<FinderPriority, string> = {
  budget: 'How the neighbourhood median fits your assessment budget.',
  services: 'Proximity to mapped everyday destinations.',
  transit: 'Scheduled service near the reference point.',
  parks: 'Distance to a mapped park point, not its entrance.',
  schools: 'Location only; school quality and eligibility are not scored.',
  downtown: 'Straight-line distance to Calgary Tower.',
};
const filterLabels = {
  budget: 'Median assessment exceeds the budget, or is unavailable',
  quadrants: 'Outside your selected quadrants',
  downtown: 'Outside your downtown distance limit',
  reference: 'Outside your nearby-neighbourhood distance limit',
};
const money = (value: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);

let finderRequest: Promise<FinderData> | null = null;
function loadFinder() {
  if (!finderRequest)
    finderRequest = fetch('/data/neighbourhood-finder.json')
      .then(async (response) => {
        if (!response.ok) throw new Error('Neighbourhood profiles unavailable');
        const data = (await response.json()) as FinderData;
        if (data.schemaVersion !== 1 || !Array.isArray(data.profiles))
          throw new Error('Neighbourhood profiles unavailable');
        return data;
      })
      .catch((error) => {
        finderRequest = null;
        throw error;
      });
  return finderRequest;
}

function MatchCard({
  match,
  position,
  onExplore,
  onSource,
}: {
  match: FinderMatch;
  position: number;
  onExplore: FinderProps['onExplore'];
  onSource: FinderProps['onSource'];
}) {
  const { profile } = match;
  const active = match.criteria.filter((criterion) => criterion.weight > 0);
  return (
    <li className="finder-result-card">
      <div className="finder-card-heading">
        <div className="finder-card-title">
          <span className="finder-card-eyebrow">
            {String(position).padStart(2, '0')} ·{' '}
            {profile.quadrants.join(' / ') || profile.sector}
          </span>
          <h3>{profile.name}</h3>
        </div>
        {match.score != null && (
          <div
            className="finder-match"
            aria-label={`Preference match ${match.score} out of 100`}
          >
            <strong>
              {match.score}
              <small> /100</small>
            </strong>
            <span>Preference match</span>
          </div>
        )}
      </div>
      <dl className="finder-card-metrics">
        {profile.assessment && (
          <div>
            <dt>2026 median assessment</dt>
            <dd>{money(profile.assessment.median)}</dd>
          </div>
        )}
        <div>
          <dt>Downtown · straight-line</dt>
          <dd>{profile.downtownKm.toFixed(1)} km</dd>
        </div>
      </dl>
      {match.reasons.length > 0 && (
        <div className="finder-evidence">
          <h4>Why it appears here</h4>
          <ul>
            {match.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="finder-evidence">
        <h4>What to weigh up</h4>
        {match.tradeoffs.length ? (
          <ul>
            {match.tradeoffs.map((tradeoff) => (
              <li key={tradeoff}>{tradeoff}</li>
            ))}
          </ul>
        ) : (
          <p className="finder-note">
            The measured priorities fit well at the reference point. Individual
            streets and homes can have quite different access, costs and
            surroundings.
          </p>
        )}
      </div>
      <p className="finder-note">
        Data covers {match.coverage}% of your selected priority weight. A match
        score is a comparison of these preferences, not a rating of the
        neighbourhood or a prediction of suitability.
      </p>
      <details className="finder-detail">
        <summary>See the scoring and coverage</summary>
        <table className="finder-method-table">
          <caption className="sr-only">
            Priority scores for {profile.name}; scores are out of 100
          </caption>
          <thead>
            <tr>
              <th scope="col">Priority</th>
              <th scope="col">Importance</th>
              <th scope="col">Score /100</th>
            </tr>
          </thead>
          <tbody>
            {active
              .filter((criterion) => criterion.score != null)
              .map((criterion) => (
                <tr key={criterion.id}>
                  <th scope="row">{criterion.label}</th>
                  <td>{weightLabels[criterion.weight]}</td>
                  <td>{criterion.score}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {active.map((criterion) => (
          <div className="finder-criterion" key={criterion.id}>
            <p>
              <strong>{criterion.label}.</strong> {criterion.detail}
            </p>
            <button
              type="button"
              className="source-link"
              onClick={() =>
                onSource(criterion.sourceIds[0] || 'neighbourhood-finder')
              }
            >
              Source for {criterion.label.toLowerCase()}{' '}
              <ArrowUpRight size={12} aria-hidden="true" />
            </button>
          </div>
        ))}
        {profile.assessment && (
          <p>
            {profile.assessment.count.toLocaleString('en-CA')} assessment
            accounts. The middle half is {money(profile.assessment.p25)}–
            {money(profile.assessment.p75)}. The range combines available
            residential property types; it does not describe available listings.
          </p>
        )}
        <p>
          {profile.referencePointMethod} All destination distances and transit
          access refer to this one point. Check a home’s exact address before
          relying on the result.
        </p>
        {match.nearReferenceKm !== null && (
          <p>
            {match.nearReferenceKm.toFixed(1)} km straight-line from your chosen
            neighbourhood reference point.
          </p>
        )}
      </details>
      <div className="finder-card-actions">
        <button type="button" onClick={() => onExplore(profile.code)}>
          <MapPin size={15} aria-hidden="true" /> Explore {profile.name}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onSource('neighbourhood-finder')}>
          Method & sources
          <ArrowUpRight size={12} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function NeighbourhoodFinder({
  active = true,
  onExplore,
  onCompare,
  onSource,
}: FinderProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<FinderData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preferences, setPreferences] = useState<FinderPreferences>(
    DEFAULT_FINDER_PREFERENCES,
  );
  const [budget, setBudget] = useState('');
  const [submitted, setSubmitted] = useState<FinderPreferences | null>(null);
  const [validation, setValidation] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadFinder()
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const result = useMemo(
    () => (data && submitted ? rankNeighbourhoods(data, submitted) : null),
    [data, submitted],
  );
  const places = useMemo(
    () =>
      data
        ? [...data.profiles].sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [data],
  );
  const draft: FinderPreferences = {
    ...preferences,
    budgetMax: budget.trim() ? Number(budget) : null,
  };
  const changed =
    submitted !== null && JSON.stringify(draft) !== JSON.stringify(submitted);
  const recommendations = result?.recommendations.length
    ? result.recommendations
    : (result?.matches.slice(0, 5) ?? []);
  function setPreference<K extends keyof FinderPreferences>(
    key: K,
    value: FinderPreferences[K],
  ) {
    setPreferences((previous) => ({ ...previous, [key]: value }));
  }
  function showResults(next: FinderPreferences) {
    if (
      !priorities.some(
        (key) =>
          next.weights[key] > 0 &&
          (key !== 'budget' || next.budgetMax !== null),
      )
    ) {
      setValidation(
        'Choose at least one priority. The assessment budget priority also needs a budget amount.',
      );
      return;
    }
    setValidation('');
    setSubmitted(next);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      resultsRef.current?.focus({ preventScroll: true });
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    showResults(draft);
  }
  function relax(changes: Partial<FinderPreferences>) {
    if (!submitted) return;
    const next = { ...submitted, ...changes };
    setPreferences(next);
    setBudget(next.budgetMax === null ? '' : String(next.budgetMax));
    showResults(next);
  }
  function toggleQuadrant(quadrant: FinderQuadrant) {
    setPreference(
      'quadrants',
      preferences.quadrants.includes(quadrant)
        ? preferences.quadrants.filter((item) => item !== quadrant)
        : [...preferences.quadrants, quadrant],
    );
  }
  return (
    <section
      id={active ? 'workspace-content' : undefined}
      tabIndex={-1}
      className="workspace-view finder-view"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">COMPARE CALGARY NEIGHBOURHOODS</span>
          <h1>Find your neighbourhood</h1>
          <p>
            Start with the part of the city you have in mind and what matters
            day to day. Build a shortlist with clear reasons, trade-offs and
            source data.
          </p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onSource('neighbourhood-finder')}
        >
          How this works <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
      {!data ? (
        <div className="finder-empty" role="status">
          <h2>
            {failed
              ? 'Profiles could not be loaded'
              : 'Loading neighbourhood profiles…'}
          </h2>
          <p>
            {failed
              ? 'The local data file did not load. Please try again.'
              : 'Preparing the bundled public records for your comparison.'}
          </p>
          {failed && (
            <button
              type="button"
              className="source-link"
              onClick={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              <RefreshCw size={15} aria-hidden="true" /> Try again
            </button>
          )}
        </div>
      ) : (
        <div className="finder-layout">
          <form className="finder-form" ref={formRef} onSubmit={submit}>
            <fieldset>
              <legend>
                <span className="finder-step-number">01</span> Budget & location
              </legend>
              <label className="finder-field" htmlFor={`${id}-budget`}>
                <span>Assessment budget · optional</span>
                <span className="finder-money-input">
                  <span aria-hidden="true">$</span>
                  <input
                    id={`${id}-budget`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100000000"
                    step="1"
                    placeholder="e.g. 750000"
                    value={budget}
                    aria-describedby={`${id}-budget-note`}
                    onChange={(event) => {
                      setBudget(event.target.value);
                      if (!event.target.value)
                        setPreference('budgetMustMatch', false);
                    }}
                  />
                </span>
              </label>
              <p className="finder-hint" id={`${id}-budget-note`}>
                Compares 2026 assessed values, not asking prices or available
                homes. Neighbourhood medians combine different residential
                property types.
              </p>
              <label className="finder-check">
                <input
                  type="checkbox"
                  checked={preferences.budgetMustMatch}
                  disabled={!budget}
                  onChange={(event) =>
                    setPreference('budgetMustMatch', event.target.checked)
                  }
                />
                <span>
                  Only show neighbourhoods with a median assessment at or below
                  this amount.
                </span>
              </label>
              <fieldset className="finder-quadrants">
                <legend>Preferred quadrants</legend>
                <div className="finder-quadrant-options">
                  <button
                    type="button"
                    aria-pressed={!preferences.quadrants.length}
                    onClick={() => setPreference('quadrants', [])}
                  >
                    Anywhere
                  </button>
                  {(['NW', 'NE', 'SW', 'SE'] as FinderQuadrant[]).map(
                    (quadrant) => (
                      <button
                        type="button"
                        key={quadrant}
                        aria-pressed={preferences.quadrants.includes(quadrant)}
                        onClick={() => toggleQuadrant(quadrant)}
                      >
                        {quadrant}
                      </button>
                    ),
                  )}
                </div>
                <p className="finder-hint">
                  Choose more than one. A neighbourhood spanning quadrants can
                  match either.
                </p>
              </fieldset>
              <label className="finder-field">
                <span>Maximum distance to downtown</span>
                <select
                  value={preferences.maxDowntownKm ?? ''}
                  onChange={(event) =>
                    setPreference(
                      'maxDowntownKm',
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                >
                  <option value="">No limit</option>
                  {[3, 5, 10, 15, 20, 30].map((km) => (
                    <option value={km} key={km}>
                      Within {km} km
                    </option>
                  ))}
                </select>
                <small className="finder-hint">
                  Straight-line from the neighbourhood reference point to
                  Calgary Tower. This is a required limit, not a commute time.
                  Limits are checked before the rounding used in result cards.
                </small>
              </label>
              <details className="finder-detail">
                <summary>Stay near a particular neighbourhood</summary>
                <label className="finder-field">
                  <span>Neighbourhood to stay near</span>
                  <select
                    value={preferences.nearCommunityCode ?? ''}
                    onChange={(event) =>
                      setPreferences((previous) => ({
                        ...previous,
                        nearCommunityCode: event.target.value || null,
                        maxReferenceKm: event.target.value
                          ? (previous.maxReferenceKm ?? 5)
                          : null,
                      }))
                    }
                  >
                    <option value="">No preference</option>
                    {places.map((place) => (
                      <option key={place.code} value={place.code}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="finder-field">
                  <span>Maximum distance between reference points</span>
                  <select
                    disabled={!preferences.nearCommunityCode}
                    value={preferences.maxReferenceKm ?? ''}
                    onChange={(event) =>
                      setPreference(
                        'maxReferenceKm',
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">No limit</option>
                    {[2, 5, 10, 15, 20].map((km) => (
                      <option value={km} key={km}>
                        Within {km} km
                      </option>
                    ))}
                  </select>
                  <small className="finder-hint">
                    A straight-line limit between representative points; it does
                    not measure the distance between boundaries or every home.
                    Limits are checked before the rounding used in result cards.
                  </small>
                </label>
              </details>
            </fieldset>
            <fieldset>
              <legend>
                <span className="finder-step-number">02</span> What matters to
                you
              </legend>
              <p className="finder-hint">
                Higher importance gives a measure more weight. Off leaves it
                out. These preferences rank the neighbourhoods that meet your
                location and budget limits.
              </p>
              {priorities.map((priority) => (
                <label className="finder-priority" key={priority}>
                  <span>
                    <strong>{FINDER_PRIORITY_LABELS[priority]}</strong>
                    <small>
                      {priorityNotes[priority]}
                      {priority === 'budget' && !budget
                        ? ' Add a budget to use this priority.'
                        : ''}
                    </small>
                  </span>
                  <select
                    aria-label={`${FINDER_PRIORITY_LABELS[priority]} importance`}
                    value={preferences.weights[priority]}
                    onChange={(event) =>
                      setPreference('weights', {
                        ...preferences.weights,
                        [priority]: Number(event.target.value) as FinderWeight,
                      })
                    }
                  >
                    {weightLabels.map((label, weight) => (
                      <option key={label} value={weight}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {preferences.weights.schools > 0 && (
                <label className="finder-field">
                  <span>School grade group</span>
                  <select
                    value={preferences.schoolLevel}
                    onChange={(event) =>
                      setPreference(
                        'schoolLevel',
                        event.target.value as FinderSchoolLevel,
                      )
                    }
                  >
                    <option value="any">Any school level</option>
                    <option value="elementary">Elementary</option>
                    <option value="juniorHigh">Junior high</option>
                    <option value="high">High school</option>
                  </select>
                  <small className="finder-hint">
                    Uses the nearest mapped school for this group. Confirm
                    designated schools and admission with the board.
                  </small>
                </label>
              )}
            </fieldset>
            <div className="finder-form-actions">
              {validation && (
                <p className="finder-note" role="alert">
                  {validation}
                </p>
              )}
              <button type="submit" className="primary-button">
                {submitted ? 'Update my shortlist' : 'Find neighbourhoods'}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="finder-reset"
                onClick={() => {
                  setPreferences(DEFAULT_FINDER_PREFERENCES);
                  setBudget('');
                  setSubmitted(null);
                  setValidation('');
                }}
              >
                Reset preferences
              </button>
            </div>
            <p className="finder-note">
              Your choices stay in this page’s memory. They are not saved, sent
              to a recommendation service or used to profile you.
            </p>
          </form>
          <div
            ref={resultsRef}
            className="finder-results"
            role="region"
            tabIndex={-1}
            aria-label="Neighbourhood shortlist"
          >
            {!result ? (
              <div className="finder-empty">
                <h2>A shortlist with context</h2>
                <p>
                  Compare {data.profiles.length} neighbourhood profiles using
                  the same public records and transparent calculations.
                </p>
                <ul>
                  <li>See up to five matches with reasons and compromises.</li>
                  <li>
                    Check the assessment range, scheduled transit and nearby
                    destinations.
                  </li>
                  <li>
                    Open a neighbourhood on the map, then investigate the homes
                    and streets that interest you.
                  </li>
                </ul>
                <p>
                  Every distance starts at one representative neighbourhood
                  point. The shortlist is a starting point for research, not a
                  substitute for checking a particular address.
                </p>
              </div>
            ) : (
              <>
                <div className="finder-results-heading">
                  <h2>Your shortlist</h2>
                  {recommendations.length > 1 && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        onCompare(
                          recommendations
                            .slice(0, 3)
                            .map((match) => match.profile.code),
                        )
                      }
                    >
                      Compare top {Math.min(3, recommendations.length)}
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {changed && (
                  <div className="finder-stale" role="status">
                    <span>
                      Your preferences changed. These results still use the
                      previous choices.
                    </span>
                    <button
                      type="button"
                      onClick={() => formRef.current?.requestSubmit()}
                    >
                      Update results
                    </button>
                  </div>
                )}
                <p className="finder-result-summary" role="status">
                  {result.eligibleCount} of {result.totalProfiles}{' '}
                  neighbourhoods meet your limits. {result.scoredCount} have
                  enough data for a score.
                  {recommendations.length > 0
                    ? ` Showing ${recommendations.length} ${result.recommendations.length ? 'highest matches' : 'unscored profiles'}.`
                    : ''}
                </p>
                {recommendations.length ? (
                  <ol className="finder-result-list">
                    {recommendations.map((match, index) => (
                      <MatchCard
                        key={match.profile.code}
                        match={match}
                        position={index + 1}
                        onExplore={onExplore}
                        onSource={onSource}
                      />
                    ))}
                  </ol>
                ) : (
                  <div className="finder-empty">
                    <h2>No neighbourhood meets all these limits</h2>
                    <p>
                      You can widen a limit below. We keep your choices
                      unchanged until you select an alternative.
                    </p>
                  </div>
                )}
                {result.relaxations.length > 0 && result.eligibleCount < 5 && (
                  <div className="finder-method">
                    <h3>Widen the search</h3>
                    <p>
                      Each option explains which limits it changes. Your
                      priority weights stay the same.
                    </p>
                    {result.relaxations.map((option) => (
                      <button
                        type="button"
                        className="finder-relaxation"
                        key={option.id}
                        onClick={() => relax(option.changes)}
                      >
                        <span>
                          {option.label}
                          <small>
                            {option.count} neighbourhoods would meet the revised
                            limits
                          </small>
                        </span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
                {result.nearMisses.length > 0 && result.eligibleCount < 5 && (
                  <details className="finder-detail">
                    <summary>Other places outside your limits</summary>
                    <p>
                      These are alternatives, not matches to all your
                      requirements.
                    </p>
                    <ul className="finder-near-misses">
                      {result.nearMisses.map((match) => (
                        <li key={match.profile.code}>
                          <button
                            type="button"
                            onClick={() => onExplore(match.profile.code)}
                          >
                            {match.profile.name}
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </button>
                          <p>
                            {match.unmetFilters
                              .map((filter) => filterLabels[filter])
                              .join(' · ')}
                            .
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
            <div className="finder-method">
              <h3>Read the result in context</h3>
              <p>
                The score is a weighted average of available measures. Missing
                data is left out and coverage is shown; a score requires at
                least 70% of your selected priority weight. It is not a measure
                of safety, school quality, investment return or the people who
                live in an area.
              </p>
              <p>
                Assessments use the {data.metadata.assessmentYear} roll. Transit
                uses the {data.metadata.transitReferenceDate} reference day.
                Actual trips, school eligibility, available homes and local
                conditions need separate checks. Verified housing-type filters
                are not available in this extract.
              </p>
              <button
                type="button"
                className="source-link"
                onClick={() => onSource('neighbourhood-finder')}
              >
                Data, scoring methods & limitations
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
              <p className="finder-attribution">
                Contains information licensed under the{' '}
                <a
                  href="https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Government Licence – City of Calgary
                </a>
                . Amenity data ©{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap contributors
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
