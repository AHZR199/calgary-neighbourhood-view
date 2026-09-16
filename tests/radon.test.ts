import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALGARY_RADON, summarizeRadonSample } from '../lib/atlas/radon';

test('radon action threshold does not count exactly 200 as above the guideline', () => {
  const summary = summarizeRadonSample([0, 100, 199, 200, 201, 400]);
  assert.equal(summary.sampleSize, 6);
  assert.equal(summary.aboveGuideline, 2);
  assert.equal(summary.atOrBelowGuideline, 4);
  assert.ok(Math.abs(summary.percentageAbove - 100 / 3) < 0.00001);
});

test('radon summary rejects missing, invalid and negative measurements', () => {
  for (const readings of [[], [NaN], [Infinity], [-1], [120, NaN]]) {
    assert.throws(() => summarizeRadonSample(readings));
  }
});

test('Calgary radon extract reconciles to the historical metropolitan survey', () => {
  assert.equal(CALGARY_RADON.sampleSize, 99);
  assert.equal(CALGARY_RADON.aboveGuideline, 14);
  assert.equal(CALGARY_RADON.atOrBelowGuideline, 85);
  assert.equal(CALGARY_RADON.percentageAbove.toFixed(1), '14.1');
  assert.equal(CALGARY_RADON.concentrations.filter((n) => n === 200).length, 1);
  assert.equal(CALGARY_RADON.surveyPeriod, '2012–2013');
  assert.equal(CALGARY_RADON.spatialUnit, 'census-metropolitan-area');
  assert.deepEqual(CALGARY_RADON.testDurationDays, {
    minimum: 61,
    maximum: 149,
    atLeast90Days: 96,
  });
  assert.equal(
    CALGARY_RADON.originalSha256,
    '1891c163666b770376b6887488003f2cd397a0c969e8a9a4cc6f7c671cb72394',
  );
  assert.equal(
    CALGARY_RADON.licenceUrl,
    'https://open.canada.ca/en/open-government-licence-canada',
  );
  assert.ok(!('forwardSortationAreaCodes' in CALGARY_RADON));
});
