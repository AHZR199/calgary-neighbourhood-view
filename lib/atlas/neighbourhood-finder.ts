import { distanceMetres } from './transit';

export type FinderQuadrant = 'NW' | 'NE' | 'SW' | 'SE';
export type FinderPriority =
  'budget' | 'services' | 'transit' | 'parks' | 'schools' | 'downtown';
export type FinderWeight = 0 | 1 | 2 | 3;
export type FinderSchoolLevel = 'any' | 'elementary' | 'juniorHigh' | 'high';
export interface FinderPreferences {
  budgetMax: number | null;
  budgetMustMatch: boolean;
  quadrants: FinderQuadrant[];
  maxDowntownKm: number | null;
  nearCommunityCode: string | null;
  maxReferenceKm: number | null;
  schoolLevel: FinderSchoolLevel;
  housingType: 'any';
  weights: Record<FinderPriority, FinderWeight>;
}
export const DEFAULT_FINDER_PREFERENCES: FinderPreferences = {
  budgetMax: null,
  budgetMustMatch: false,
  quadrants: [],
  maxDowntownKm: null,
  nearCommunityCode: null,
  maxReferenceKm: null,
  schoolLevel: 'any',
  housingType: 'any',
  weights: {
    budget: 2,
    services: 2,
    transit: 2,
    parks: 1,
    schools: 0,
    downtown: 1,
  },
};
export const FINDER_PRIORITY_LABELS: Record<FinderPriority, string> = {
  budget: 'Assessment budget',
  services: 'Everyday amenities',
  transit: 'Transit access',
  parks: 'Park proximity',
  schools: 'School proximity',
  downtown: 'Downtown proximity',
};
export interface FinderPlace {
  name: string;
  distanceM: number;
  sourceUrl: string;
}
export interface FinderProfile {
  code: string;
  name: string;
  sector: string;
  referencePoint: [number, number];
  referencePointMethod: string;
  quadrants: FinderQuadrant[];
  quadrantAccounts: Partial<Record<FinderQuadrant, number>>;
  assessment: {
    year: number;
    count: number;
    p25: number;
    median: number;
    p75: number;
    minimum: number;
    maximum: number;
  } | null;
  construction: {
    medianYear: number | null;
    knownCount: number;
    accountCount: number;
  };
  downtownKm: number;
  transitScore: number | null;
  weekdayRoutesWithin800m: number | null;
  servicesScore: number | null;
  servicesCoverage: number;
  nearest: {
    grocery: FinderPlace | null;
    healthcare: FinderPlace | null;
    community: FinderPlace | null;
    park: FinderPlace | null;
    school: FinderPlace | null;
    elementary: FinderPlace | null;
    juniorHigh: FinderPlace | null;
    high: FinderPlace | null;
    train: FinderPlace | null;
    bus: FinderPlace | null;
  };
}
export interface FinderData {
  schemaVersion: 1;
  metadata: {
    builtFrom: string;
    profileCount: number;
    assessmentYear: number;
    assessmentRetrievedAt: string;
    transitReferenceDate: string;
    sourceDates: Record<string, string>;
    method: Record<string, string>;
    limitations: string[];
    sources: {
      id: string;
      title: string;
      url: string;
      attribution: string;
      licenceUrl?: string;
    }[];
    inputHashes: Record<string, string>;
    [key: string]: unknown;
  };
  profiles: FinderProfile[];
}
export type FinderFilter = 'quadrants' | 'budget' | 'downtown' | 'reference';
export interface FinderCriterion {
  id: FinderPriority;
  label: string;
  weight: FinderWeight;
  score: number | null;
  detail: string;
  sourceIds: string[];
}
export interface FinderMatch {
  profile: FinderProfile;
  score: number | null;
  coverage: number;
  criteria: FinderCriterion[];
  reasons: string[];
  tradeoffs: string[];
  unmetFilters: FinderFilter[];
  missing: string[];
  nearReferenceKm: number | null;
}
export interface FinderResult {
  matches: FinderMatch[];
  nearMisses: FinderMatch[];
  recommendations: FinderMatch[];
  totalProfiles: number;
  eligibleCount: number;
  scoredCount: number;
  relaxations: {
    id: FinderFilter | 'all';
    label: string;
    changes: Partial<FinderPreferences>;
    count: number;
  }[];
}

const money = (value: number) =>
  new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value);
const metres = (value: number) =>
  value < 1000
    ? `${Math.round(value / 10) * 10} m`
    : `${(value / 1000).toFixed(1)} km`;
const valid = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;

export function finderProximityScore(distanceM: number | null): number | null {
  if (!valid(distanceM)) return null;
  return Math.round(Math.max(0, Math.min(100, (2000 - distanceM) / 16)));
}

function readPreferences(input: FinderPreferences, data: FinderData) {
  for (const key of ['budgetMax', 'maxDowntownKm', 'maxReferenceKm'] as const) {
    const value = input[key];
    if (value !== null && (!Number.isFinite(value) || value <= 0))
      throw new RangeError(`${key} must be positive or null.`);
  }
  if (input.housingType !== 'any')
    throw new RangeError(
      'A verified housing-type classification is not available.',
    );
  if (!['any', 'elementary', 'juniorHigh', 'high'].includes(input.schoolLevel))
    throw new RangeError('Choose a published school level.');
  if (input.quadrants.some((q) => !['NW', 'NE', 'SW', 'SE'].includes(q)))
    throw new RangeError('Choose a Calgary address quadrant.');
  const anchor = input.nearCommunityCode
    ? data.profiles.find((profile) => profile.code === input.nearCommunityCode)
    : null;
  if (input.nearCommunityCode && !anchor)
    throw new RangeError('Choose a neighbourhood in the directory.');
  if (input.maxReferenceKm !== null && !anchor)
    throw new RangeError('Choose a neighbourhood for the distance limit.');
  for (const id of Object.keys(FINDER_PRIORITY_LABELS) as FinderPriority[]) {
    if (![0, 1, 2, 3].includes(input.weights[id]))
      throw new RangeError('Priority weights must be 0, 1, 2 or 3.');
  }
  return anchor;
}

function criteriaFor(
  profile: FinderProfile,
  input: FinderPreferences,
): FinderCriterion[] {
  const school =
    profile.nearest[input.schoolLevel === 'any' ? 'school' : input.schoolLevel];
  const places = [
    profile.nearest.grocery,
    profile.nearest.healthcare,
    profile.nearest.community,
  ];
  const values: Record<
    FinderPriority,
    Omit<FinderCriterion, 'id' | 'label' | 'weight'>
  > = {
    budget: {
      score:
        input.budgetMax !== null && profile.assessment?.median
          ? Math.round(
              Math.min(
                100,
                (input.budgetMax / profile.assessment.median) * 100,
              ),
            )
          : null,
      detail: profile.assessment
        ? `$${money(profile.assessment.median)} median 2026 assessment; the middle half is $${money(profile.assessment.p25)}–$${money(profile.assessment.p75)}.`
        : 'No eligible assessment summary is available.',
      sourceIds: ['assessments'],
    },
    services: {
      score: valid(profile.servicesScore) ? profile.servicesScore : null,
      detail:
        places
          .filter((place) => place !== null)
          .map((place) => `${place.name}, ${metres(place.distanceM)}`)
          .join(' · ') || 'Mapped everyday destinations are unavailable.',
      sourceIds: ['essentials'],
    },
    transit: {
      score: valid(profile.transitScore) ? profile.transitScore : null,
      detail:
        profile.weekdayRoutesWithin800m !== null
          ? `${profile.weekdayRoutesWithin800m} scheduled weekday routes within 800 m of the reference point.`
          : 'Scheduled transit coverage is unavailable.',
      sourceIds: ['transit'],
    },
    parks: {
      score: finderProximityScore(profile.nearest.park?.distanceM ?? null),
      detail: profile.nearest.park
        ? `${profile.nearest.park.name}, ${metres(profile.nearest.park.distanceM)} to its mapped point; not a park entrance.`
        : 'No mapped park point is available.',
      sourceIds: ['essentials'],
    },
    schools: {
      score: finderProximityScore(school?.distanceM ?? null),
      detail: school
        ? `${school.name}, ${metres(school.distanceM)} to the published map point. Proximity does not establish school quality or eligibility.`
        : 'No usable school point is available for this grade group.',
      sourceIds: ['schools'],
    },
    downtown: {
      score: valid(profile.downtownKm)
        ? Math.round(Math.max(0, 100 - (profile.downtownKm / 30) * 100))
        : null,
      detail: valid(profile.downtownKm)
        ? `${profile.downtownKm.toFixed(1)} km straight-line to Calgary Tower; not a commute time.`
        : 'Downtown distance is unavailable.',
      sourceIds: ['essentials'],
    },
  };
  return (Object.keys(FINDER_PRIORITY_LABELS) as FinderPriority[]).map(
    (id) => ({
      id,
      label: FINDER_PRIORITY_LABELS[id],
      weight:
        id === 'budget' && input.budgetMax === null ? 0 : input.weights[id],
      ...values[id],
    }),
  );
}

export function rankNeighbourhoods(
  data: FinderData,
  input: FinderPreferences,
): FinderResult {
  if (data.schemaVersion !== 1)
    throw new Error('Unsupported neighbourhood finder data.');
  const anchor = readPreferences(input, data);
  const ranked = data.profiles.map((profile): FinderMatch => {
    const criteria = criteriaFor(profile, input);
    const selected = criteria.filter((criterion) => criterion.weight > 0);
    const known = selected.filter((criterion) => criterion.score !== null);
    const requestedWeight = selected.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );
    const knownWeight = known.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );
    const coverage = requestedWeight
      ? Math.round((knownWeight / requestedWeight) * 100)
      : 0;
    const score =
      knownWeight && coverage >= 70
        ? Math.round(
            known.reduce(
              (sum, criterion) => sum + criterion.score! * criterion.weight,
              0,
            ) / knownWeight,
          )
        : null;
    const nearReferenceKm = anchor
      ? distanceMetres(
          anchor.referencePoint[1],
          anchor.referencePoint[0],
          profile.referencePoint[1],
          profile.referencePoint[0],
        ) / 1000
      : null;
    const unmetFilters: FinderFilter[] = [];
    if (
      input.quadrants.length &&
      !profile.quadrants.some((q) => input.quadrants.includes(q))
    )
      unmetFilters.push('quadrants');
    if (
      input.budgetMustMatch &&
      input.budgetMax !== null &&
      (!profile.assessment || profile.assessment.median > input.budgetMax)
    )
      unmetFilters.push('budget');
    if (
      input.maxDowntownKm !== null &&
      (!valid(profile.downtownKm) || profile.downtownKm > input.maxDowntownKm)
    )
      unmetFilters.push('downtown');
    if (
      input.maxReferenceKm !== null &&
      (nearReferenceKm === null || nearReferenceKm > input.maxReferenceKm)
    )
      unmetFilters.push('reference');
    const missing = selected
      .filter((criterion) => criterion.score === null)
      .map((criterion) => criterion.label);
    const reasons = [...known]
      .filter((criterion) => criterion.score! >= 60)
      .sort((a, b) => b.score! * b.weight - a.score! * a.weight)
      .slice(0, 3)
      .map((criterion) => criterion.detail);
    const tradeoffs = [...known]
      .filter((criterion) => criterion.score! < 60)
      .sort((a, b) => a.score! - b.score!)
      .slice(0, 3)
      .map((criterion) => `${criterion.label}: ${criterion.detail}`);
    if (
      input.budgetMax !== null &&
      profile.assessment &&
      profile.assessment.median > input.budgetMax
    )
      tradeoffs.unshift(
        `The median assessment is $${money(profile.assessment.median - input.budgetMax)} above your assessment budget.`,
      );
    if (missing.length)
      tradeoffs.push(
        `Missing priority data: ${missing.join(', ')}. This is omitted from the score, not treated as zero.`,
      );
    if (!requestedWeight)
      tradeoffs.push(
        'Choose at least one priority to calculate a match score.',
      );
    else if (coverage < 70)
      tradeoffs.push(
        'Less than 70% of your selected priority weight has data, so no overall score is shown.',
      );
    if (profile.assessment && profile.assessment.count < 30)
      tradeoffs.push(
        `Small assessment cohort: ${profile.assessment.count} accounts. Read the range carefully.`,
      );
    return {
      profile,
      score,
      coverage,
      criteria,
      reasons,
      tradeoffs,
      unmetFilters,
      missing,
      nearReferenceKm,
    };
  });
  const compare = (a: FinderMatch, b: FinderMatch) =>
    (b.score ?? -1) - (a.score ?? -1) ||
    b.coverage - a.coverage ||
    a.profile.name.localeCompare(b.profile.name) ||
    a.profile.code.localeCompare(b.profile.code);
  const matches = ranked
    .filter((match) => !match.unmetFilters.length)
    .sort(compare);
  const nearMisses = ranked
    .filter((match) => match.unmetFilters.length)
    .sort(
      (a, b) => a.unmetFilters.length - b.unmetFilters.length || compare(a, b),
    )
    .slice(0, 5);
  const options: FinderResult['relaxations'] = [
    {
      id: 'budget',
      label: 'Treat the assessment budget as a preference',
      changes: { budgetMustMatch: false },
      count: 0,
    },
    {
      id: 'downtown',
      label: 'Remove the downtown distance limit',
      changes: { maxDowntownKm: null },
      count: 0,
    },
    {
      id: 'quadrants',
      label: 'Consider all four quadrants',
      changes: { quadrants: [] },
      count: 0,
    },
    {
      id: 'reference',
      label: 'Remove the nearby-neighbourhood distance limit',
      changes: { maxReferenceKm: null },
      count: 0,
    },
  ];
  const relaxations = options
    .map((option) => ({
      ...option,
      count: ranked.filter((match) =>
        match.unmetFilters.every((id) => id === option.id),
      ).length,
    }))
    .filter((option) => option.count > matches.length)
    .sort((a, b) => b.count - a.count);
  if (!matches.length && !relaxations.length && ranked.length)
    relaxations.push({
      id: 'all',
      label: 'Remove location and strict budget limits; keep your priorities',
      changes: {
        quadrants: [],
        budgetMustMatch: false,
        maxDowntownKm: null,
        maxReferenceKm: null,
      },
      count: ranked.length,
    });
  return {
    matches,
    nearMisses,
    recommendations: matches
      .filter((match) => match.score !== null)
      .slice(0, 5),
    totalProfiles: data.profiles.length,
    eligibleCount: matches.length,
    scoredCount: matches.filter((match) => match.score !== null).length,
    relaxations,
  };
}
