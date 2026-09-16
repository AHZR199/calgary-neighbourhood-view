import sample from '../../public/data/radon.json';

export const RADON_GUIDELINE = 200;

export const RADON_LINKS = {
  testing:
    'https://www.canada.ca/en/health-canada/services/publications/health-risks-safety/guide-radon-measurements-residential-dwellings.html',
  guideline:
    'https://www.canada.ca/en/health-canada/services/health-risks-safety/radiation/radon/government-canada-radon-guideline.html',
  newerSurvey: 'https://www.evictradon.org/survey/',
};

export function summarizeRadonSample(concentrations: readonly number[]) {
  if (
    concentrations.length === 0 ||
    concentrations.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error('Radon sample must contain valid measured concentrations');
  }
  const aboveGuideline = concentrations.filter(
    (value) => value > RADON_GUIDELINE,
  ).length;
  return {
    sampleSize: concentrations.length,
    aboveGuideline,
    atOrBelowGuideline: concentrations.length - aboveGuideline,
    percentageAbove: (aboveGuideline / concentrations.length) * 100,
  };
}

export const CALGARY_RADON = {
  ...sample,
  ...summarizeRadonSample(sample.concentrations),
};
