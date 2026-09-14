import { readFile, mkdir, writeFile } from 'node:fs/promises';
const receipt = JSON.parse(
  await readFile(
    new URL('../docs/assessment-extraction.json', import.meta.url),
    'utf8',
  ),
);
const output = new URL('../work/source-monitor/', import.meta.url);
await mkdir(output, { recursive: true });
const report = {
  checkedAt: new Date().toISOString(),
  status: 'unchanged',
  changes: [],
  failures: [],
};
try {
  const response = await fetch(receipt.source.metadataUrl, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(`City metadata returned ${response.status}`);
  const metadata = await response.json();
  const updated = new Date(metadata.rowsUpdatedAt * 1000).toISOString();
  const baseline = new Date(receipt.source.sourceRowsUpdatedAt).toISOString();
  if (updated !== baseline)
    report.changes.push({
      source: '2026 assessment roll',
      reviewed: baseline,
      current: updated,
      action:
        'Re-extract using the documented cohort, check duplicate accounts and review changed values before publication.',
    });
  const columns = new Map(
    metadata.columns.map((c) => [c.fieldName, c.dataTypeName]),
  );
  for (const [field, expected] of Object.entries(receipt.source.schema)) {
    if (field === 'source_row_id') continue;
    if (columns.get(field) !== expected)
      report.failures.push(
        `Schema changed: ${field}, expected ${expected}, observed ${columns.get(field)}`,
      );
  }
} catch (error) {
  report.failures.push(error.message);
}
if (new Date().getUTCFullYear() > receipt.rollYear)
  report.changes.push({
    source: 'Tax year',
    action:
      'Review final residential tax rates and the new assessment year together. Do not silently apply the 2026 rate to a later roll.',
  });
report.status = report.failures.length
  ? 'failed'
  : report.changes.length
    ? 'review-required'
    : 'unchanged';
await writeFile(
  new URL('report.json', output),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'unchanged') process.exitCode = 1;
