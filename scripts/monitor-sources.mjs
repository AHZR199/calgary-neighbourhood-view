import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { assessSource, fetchMetadata } from './source-contract.mjs';

const output = new URL('../work/source-monitor/', import.meta.url);
await mkdir(output, { recursive: true });
/** @type {import('./source-contract.mjs').SourceReport} */
let report;
try {
  const receipt = JSON.parse(
    await readFile(
      new URL('../docs/assessment-extraction.json', import.meta.url),
      'utf8',
    ),
  );
  if (typeof receipt?.source?.metadataUrl !== 'string') {
    throw new Error('The reviewed source receipt is missing its metadata URL.');
  }
  const result = await fetchMetadata(receipt.source.metadataUrl);
  report = result.error
    ? {
        checkedAt: new Date().toISOString(),
        status: 'failed',
        changes: [],
        failures: [result.error],
      }
    : assessSource(result.metadata, receipt);
} catch (error) {
  report = {
    checkedAt: new Date().toISOString(),
    status: 'failed',
    changes: [],
    failures: [
      error instanceof Error
        ? error.message
        : 'The source check could not be completed.',
    ],
  };
}
await writeFile(
  new URL('report.json', output),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (process.env.GITHUB_ACTIONS === 'true') {
  const escape = (value) =>
    value
      .replaceAll('%', '%25')
      .replaceAll('\r', '%0D')
      .replaceAll('\n', '%0A');
  for (const change of report.changes)
    console.log(
      `::warning title=Source review needed::${escape(`${change.source}: ${change.action}`)}`,
    );
  for (const failure of report.failures)
    console.log(`::error title=Source check failed::${escape(failure)}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `## Source check: ${report.status}`,
      '',
      'This monitor does not change published data. New source rows need review; connection and schema errors fail the job.',
      '',
      ...report.changes.map(
        (change) =>
          `- **${change.source}**: ${change.action}${change.current ? ` Source updated ${change.current}; published snapshot baseline ${change.reviewed}.` : ''}`,
      ),
      ...report.failures.map((failure) => `- **Failed**: ${failure}`),
      ...(report.status === 'unchanged'
        ? ['No source timestamp or schema changes detected.']
        : []),
      '',
      'The full receipt is in the official-source-review artifact.',
      '',
    ].join('\n'),
  );
}
if (report.status === 'failed') process.exitCode = 1;
