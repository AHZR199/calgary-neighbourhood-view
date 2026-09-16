import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessSource, fetchMetadata } from '../scripts/source-contract.mjs';

const receipt = {
  rollYear: 2026,
  source: {
    sourceRowsUpdatedAt: '2026-09-08T15:32:28Z',
    schema: {
      roll_number: 'text',
      assessed_value: 'number',
      source_row_id: 'system field',
    },
  },
};
const metadata = {
  rowsUpdatedAt: Date.parse(receipt.source.sourceRowsUpdatedAt) / 1000,
  columns: [
    { fieldName: 'roll_number', dataTypeName: 'text' },
    { fieldName: 'assessed_value', dataTypeName: 'number' },
  ],
};
const now = new Date('2026-09-16T12:00:00Z');

test('a new source timestamp requires review without being a failed contract', () => {
  assert.equal(assessSource(metadata, receipt, now).status, 'unchanged');
  const report = assessSource(
    { ...metadata, rowsUpdatedAt: metadata.rowsUpdatedAt + 86400 },
    receipt,
    now,
  );
  assert.equal(report.status, 'review-required');
  assert.equal(report.changes.length, 1);
  assert.equal(report.failures.length, 0);
  assert.equal(receipt.source.sourceRowsUpdatedAt, '2026-09-08T15:32:28Z');
});

test('schema breaks and malformed source metadata still fail the check', () => {
  assert.equal(assessSource(metadata, null, now).status, 'failed');
  assert.equal(
    assessSource({ ...metadata, rowsUpdatedAt: true }, receipt, now).status,
    'failed',
  );
  assert.equal(
    assessSource(
      { ...metadata, columns: metadata.columns.slice(0, 1) },
      receipt,
      now,
    ).status,
    'failed',
  );
  assert.equal(assessSource({ columns: [] }, receipt, now).status, 'failed');
  assert.equal(
    assessSource({ ...metadata, rowsUpdatedAt: null }, receipt, now).status,
    'failed',
  );
  assert.equal(
    assessSource({ ...metadata, rowsUpdatedAt: 1e30 }, receipt, now).status,
    'failed',
  );
  assert.equal(
    assessSource({ ...metadata, columns: [null] }, receipt, now).status,
    'failed',
  );
  assert.equal(
    assessSource(
      metadata,
      {
        ...receipt,
        source: { ...receipt.source, sourceRowsUpdatedAt: 'invalid' },
      },
      now,
    ).status,
    'failed',
  );
  assert.equal(
    assessSource(
      metadata,
      { ...receipt, source: { ...receipt.source, schema: {} } },
      now,
    ).status,
    'failed',
  );
  const both = assessSource(
    { ...metadata, rowsUpdatedAt: metadata.rowsUpdatedAt + 86400, columns: [] },
    receipt,
    now,
  );
  assert.equal(both.status, 'failed');
  assert.equal(both.changes.length, 1);
  assert.equal(both.failures.length, 2);
});

test('a new tax year calls for rate review without relabelling the old snapshot', () => {
  const report = assessSource(
    metadata,
    receipt,
    new Date('2027-01-01T00:00:00Z'),
  );
  assert.equal(report.status, 'review-required');
  assert.equal(report.changes[0].source, 'Tax year');
});

test('metadata retries temporary failures and preserves permanent errors', async () => {
  let calls = 0;
  const pause = async () => {};
  const recovered = await fetchMetadata(
    'https://example.test',
    async () => {
      calls++;
      return calls === 1
        ? new Response(null, { status: 503 })
        : Response.json(metadata);
    },
    pause,
  );
  assert.equal(calls, 2);
  assert.deepEqual(recovered.metadata, metadata);
  calls = 0;
  const denied = await fetchMetadata(
    'https://example.test',
    async () => {
      calls++;
      return new Response(null, { status: 403 });
    },
    pause,
  );
  assert.equal(calls, 1);
  assert.match(denied.error!, /403/);
  calls = 0;
  const unavailable = await fetchMetadata(
    'https://example.test',
    async () => {
      calls++;
      throw new Error('offline');
    },
    pause,
  );
  assert.equal(calls, 3);
  assert.equal(unavailable.error, 'offline');
  calls = 0;
  const limited = await fetchMetadata(
    'https://example.test',
    async () => {
      calls++;
      return new Response(null, { status: 429 });
    },
    pause,
  );
  assert.equal(calls, 3);
  assert.match(limited.error!, /429/);
});

test('the actual monitor CLI keeps an artifact and succeeds for review, but fails on broken contracts', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'calgary-source-monitor-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  await mkdir(join(folder, 'scripts'));
  await mkdir(join(folder, 'docs'));
  for (const name of ['monitor-sources.mjs', 'source-contract.mjs']) {
    await copyFile(
      new URL(`../scripts/${name}`, import.meta.url),
      join(folder, 'scripts', name),
    );
  }
  const savedReceipt = {
    ...receipt,
    source: { ...receipt.source, metadataUrl: 'https://example.test/metadata' },
  };
  const receiptPath = join(folder, 'docs', 'assessment-extraction.json');
  const receiptText = JSON.stringify(savedReceipt);
  await writeFile(receiptPath, receiptText);
  const preload = join(folder, 'fake-metadata.mjs');
  const summary = join(folder, 'summary.md');
  const run = () =>
    spawnSync(
      process.execPath,
      ['--import', preload, join(folder, 'scripts', 'monitor-sources.mjs')],
      {
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...process.env,
          GITHUB_ACTIONS: 'true',
          GITHUB_STEP_SUMMARY: summary,
        },
      },
    );
  const report = async () =>
    JSON.parse(
      await readFile(
        join(folder, 'work', 'source-monitor', 'report.json'),
        'utf8',
      ),
    );

  await writeFile(
    preload,
    `globalThis.fetch = async () => Response.json(${JSON.stringify({ ...metadata, rowsUpdatedAt: metadata.rowsUpdatedAt + 86400 })});`,
  );
  const review = run();
  assert.equal(review.status, 0, review.stderr);
  assert.match(review.stdout, /::warning title=Source review needed/);
  assert.equal((await report()).status, 'review-required');
  assert.match(
    await readFile(summary, 'utf8'),
    /Source check: review-required/,
  );
  assert.equal(await readFile(receiptPath, 'utf8'), receiptText);

  await writeFile(
    preload,
    `globalThis.fetch = async () => Response.json(${JSON.stringify({ ...metadata, columns: [] })});`,
  );
  const broken = run();
  assert.equal(broken.status, 1, broken.stderr);
  assert.match(broken.stdout, /::error title=Source check failed/);
  assert.equal((await report()).status, 'failed');
  assert.match((await report()).failures[0], /Schema changed/);

  await writeFile(receiptPath, '{not json');
  const invalid = run();
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.equal((await report()).status, 'failed');
  assert.ok((await report()).failures.length > 0);
});
