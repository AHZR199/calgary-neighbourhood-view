/** @typedef {{ source: string, action: string, reviewed?: string, current?: string }} SourceChange */
/** @typedef {{ checkedAt: string, status: 'unchanged' | 'review-required' | 'failed', changes: SourceChange[], failures: string[] }} SourceReport */

/** @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @returns {SourceReport} */
export function assessSource(metadata, receipt, now = new Date()) {
  const report = {
    checkedAt: now.toISOString(),
    /** @type {SourceReport['status']} */
    status: 'unchanged',
    /** @type {SourceChange[]} */
    changes: [],
    /** @type {string[]} */
    failures: [],
  };
  const source = isRecord(receipt?.source) ? receipt.source : null;
  const baselineDate = new Date(source?.sourceRowsUpdatedAt);
  if (
    !source ||
    !Number.isInteger(receipt?.rollYear) ||
    typeof source.sourceRowsUpdatedAt !== 'string' ||
    !Number.isFinite(baselineDate.getTime()) ||
    !isRecord(source.schema) ||
    !Object.keys(source.schema).some((field) => field !== 'source_row_id') ||
    !Object.values(source.schema).every((type) => typeof type === 'string')
  ) {
    report.failures.push(
      'The reviewed source receipt has an invalid date, roll year or schema.',
    );
    report.status = 'failed';
    return report;
  }
  const updatedAt =
    typeof metadata?.rowsUpdatedAt === 'number' ? metadata.rowsUpdatedAt : NaN;
  const updatedDate = new Date(updatedAt * 1000);
  if (
    !Number.isFinite(updatedAt) ||
    updatedAt <= 0 ||
    !Number.isFinite(updatedDate.getTime())
  ) {
    report.failures.push('City metadata is missing a valid update timestamp.');
  } else {
    const updated = updatedDate.toISOString();
    const baseline = baselineDate.toISOString();
    if (updated !== baseline) {
      report.changes.push({
        source: `${receipt.rollYear} assessment roll`,
        reviewed: baseline,
        current: updated,
        action:
          'Review and re-extract the documented cohort before replacing the published snapshot. The existing snapshot has not been changed.',
      });
    }
  }
  if (!Array.isArray(metadata?.columns)) {
    report.failures.push('City metadata is missing its column definitions.');
  } else {
    const columns = new Map();
    for (const column of metadata.columns) {
      if (
        !isRecord(column) ||
        typeof column.fieldName !== 'string' ||
        typeof column.dataTypeName !== 'string'
      ) {
        report.failures.push(
          'City metadata contains an invalid column definition.',
        );
        continue;
      }
      if (
        columns.has(column.fieldName) &&
        columns.get(column.fieldName) !== column.dataTypeName
      ) {
        report.failures.push(
          `City metadata has conflicting definitions for ${column.fieldName}.`,
        );
      }
      columns.set(column.fieldName, column.dataTypeName);
    }
    for (const [field, expected] of Object.entries(source.schema)) {
      if (field === 'source_row_id') continue;
      if (columns.get(field) !== expected) {
        report.failures.push(
          `Schema changed: ${field}, expected ${expected}, observed ${columns.get(field) ?? 'missing'}`,
        );
      }
    }
  }
  if (now.getUTCFullYear() > receipt.rollYear) {
    report.changes.push({
      source: 'Tax year',
      action: `Review final residential tax rates and the new assessment year together. Do not apply the ${receipt.rollYear} rate to a later roll.`,
    });
  }
  report.status = report.failures.length
    ? 'failed'
    : report.changes.length
      ? 'review-required'
      : 'unchanged';
  return report;
}

/** @returns {Promise<{metadata: unknown, error?: never} | {error: string, metadata?: never}>} */
export async function fetchMetadata(
  url,
  request = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        if (response.status !== 429 && response.status < 500) {
          return { error: `City metadata returned ${response.status}` };
        }
        throw new Error(`City metadata returned ${response.status}`);
      }
      return { metadata: await response.json() };
    } catch (error) {
      if (attempt === 2)
        return {
          error:
            error instanceof Error
              ? error.message
              : 'City metadata could not be read.',
        };
      await pause(1000 * (attempt + 1));
    }
  }
  return { error: 'City metadata could not be read after three attempts.' };
}
