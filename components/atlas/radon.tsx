import { ArrowUpRight, BookOpen, House } from 'lucide-react';
import { CALGARY_RADON, RADON_GUIDELINE, RADON_LINKS } from '@/lib/atlas/radon';

export function RadonPanel({
  compact = false,
  onSource,
}: {
  compact?: boolean;
  onSource?: (id: string) => void;
}) {
  return (
    <section className="overview-topic radon-section">
      <div className="section-line">
        <h3>Indoor radon</h3>
        <span className="data-badge">Regional context</span>
      </div>
      <p className="location-origin">
        Calgary census metropolitan area · Health Canada ·{' '}
        {CALGARY_RADON.surveyPeriod}
      </p>
      <div className="access-scores radon-sample">
        <div>
          <strong>{CALGARY_RADON.percentageAbove.toFixed(1)}%</strong>
          <span>Of sampled homes above {RADON_GUIDELINE} Bq/m³</span>
          <small>
            {CALGARY_RADON.aboveGuideline} of {CALGARY_RADON.sampleSize}{' '}
            readings in this historical survey
          </small>
        </div>
        <div>
          <House size={19} aria-hidden="true" />
          <span>Test the home itself</span>
          <small>
            A regional sample cannot tell you the radon level in a particular
            home or neighbourhood.
          </small>
        </div>
      </div>
      <p className="quiet-note">
        Health Canada recommends a long-term test in every home, with at least
        91 days during the heating season. Nearby homes can have very different
        results.
      </p>
      {!compact && (
        <>
          <div className="overview-evidence">
            <BookOpen size={20} aria-hidden="true" />
            <div>
              <strong>Before buying or moving in</strong>
              <p>
                Ask for a dated, long-term radon test and any mitigation or
                follow-up test records. If none are available, plan to test the
                lowest lived-in level, following Health Canada’s guidance.
              </p>
            </div>
          </div>
          <p className="quiet-note">
            If the home’s average annual result exceeds {RADON_GUIDELINE} Bq/m³,
            Health Canada recommends reducing it within one year, sooner for
            higher readings. The guideline is an action level; lower readings do
            not mean zero risk.
          </p>
          <details className="access-method">
            <summary>What this survey can tell you</summary>
            <p>
              These are {CALGARY_RADON.sampleSize} published Calgary-region
              readings from {CALGARY_RADON.surveyPeriod}, counted equally. Tests
              lasted {CALGARY_RADON.testDurationDays.minimum}–
              {CALGARY_RADON.testDurationDays.maximum} days;{' '}
              {CALGARY_RADON.testDurationDays.atLeast90Days} ran for at least 90
              days. The sample is dated and covers the wider metropolitan area.
              It is not a current citywide prevalence estimate.
            </p>
            <p>
              Postal-area samples are too small to support useful neighbourhood
              comparisons. This app does not assign a radon score to an address,
              or infer indoor radon from outdoor air quality, construction year
              or nearby measurements.
            </p>
            <a href={CALGARY_RADON.sourceUrl} target="_blank" rel="noreferrer">
              Health Canada survey data <ArrowUpRight size={14} />
            </a>
            <a href={RADON_LINKS.newerSurvey} target="_blank" rel="noreferrer">
              Read the newer 2024 national survey <ArrowUpRight size={14} />
            </a>
          </details>
          <a
            className="source-link"
            href={RADON_LINKS.guideline}
            target="_blank"
            rel="noreferrer"
          >
            Canadian radon guideline <ArrowUpRight size={13} />
          </a>
        </>
      )}
      <a
        className="source-link"
        href={RADON_LINKS.testing}
        target="_blank"
        rel="noreferrer"
      >
        How to test a home <ArrowUpRight size={13} />
      </a>
      {onSource && (
        <button className="source-link" onClick={() => onSource('radon')}>
          <BookOpen size={13} /> Sources & coverage <ArrowUpRight size={13} />
        </button>
      )}
      <p className="data-attribution">
        Contains information licensed under the{' '}
        <a href={CALGARY_RADON.licenceUrl} target="_blank" rel="noreferrer">
          Open Government Licence – Canada
        </a>
        . Calculations by this app; no Health Canada endorsement.
      </p>
    </section>
  );
}
