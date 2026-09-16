export interface ConstructionRecord {
  year: number | null;
  status:
    | 'recorded'
    | 'missing'
    | 'unverified-source-value'
    | 'conflicting-source-records';
  sourceRollYear: number;
  sourceUrl: string;
}

export const constructionSourceUrl = 'https://data.calgary.ca/d/4bsw-nn7w';

export function normalizeConstructionYear(
  value: unknown,
  rollYear = new Date().getFullYear(),
): number | null {
  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^\d{4}(?:\.0+)?$/.test(value.trim()))
  )
    return null;
  const year = Number(value);
  // 1800 is common in the source but not a credible Calgary construction date
  return Number.isInteger(year) &&
    Number.isInteger(rollYear) &&
    year > 1800 &&
    year <= Math.min(rollYear, new Date().getFullYear())
    ? year
    : null;
}

export function summarizeConstruction(
  values: unknown[],
  rollYear: number,
): ConstructionRecord {
  const present = values.filter(
    (value) => value !== null && value !== undefined && value !== '',
  );
  const years = present.map((value) =>
    normalizeConstructionYear(value, rollYear),
  );
  const known = [...new Set(years.filter((year) => year !== null))];
  const status =
    known.length > 1
      ? 'conflicting-source-records'
      : years.some((year) => year === null)
        ? 'unverified-source-value'
        : known.length === 1
          ? 'recorded'
          : 'missing';
  return {
    year: status === 'recorded' ? known[0] : null,
    status,
    sourceRollYear: rollYear,
    sourceUrl: constructionSourceUrl,
  };
}

export function normalizeAssessmentRoll(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{1,12}$/.test(value)) return null;
  return value.replace(/^0+/, '') || '0';
}

export interface SaleHistoryAvailability {
  status: 'unavailable-open-data';
  lastSoldDate: null;
  lastSoldPrice: null;
  checkedAt: string;
  explanation: string;
  sources: { label: string; url: string; access: string }[];
}

export const saleHistoryAvailability: SaleHistoryAvailability = {
  status: 'unavailable-open-data',
  lastSoldDate: null,
  lastSoldPrice: null,
  checkedAt: '2026-09-16',
  explanation:
    'No free source with confirmed redistribution rights was found for the last sale date and price. An assessment is not a sale price, and an unavailable record does not mean a property has never sold.',
  sources: [
    {
      label: 'City of Calgary myTax sales search',
      url: 'https://www.calgary.ca/property-owners/assessment/mytax.html',
      access:
        'Personal access under City terms; sign-in required for sales search. Covers the recent valuation period, not a complete sale history.',
    },
    {
      label: 'Alberta Land Titles',
      url: 'https://landregistry.alberta.ca/',
      access:
        'Title and registered-document purchases may help verify transfers. Fees apply; a title transfer is not necessarily an open-market sale.',
    },
  ],
};
