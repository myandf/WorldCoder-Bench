#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { currentBrowserVersion, evaluateTask } from '../code/evaluator/cli.mjs';
import { devKitRoot } from '../code/evaluator/rubric-policy.mjs';
import { validationFingerprint } from '../code/evaluator/validation-fingerprint.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RELEASE_ROOT = resolve(HERE, '..');

function parseArgs(argv) {
  const options = {
    concurrency: 4,
    limit: null,
    start: null,
    task: null,
    resume: false,
    offline: false,
    timeoutMs: 120_000,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const take = () => argv[++index];
    if (arg === '--concurrency') options.concurrency = Number(take());
    else if (arg.startsWith('--concurrency=')) options.concurrency = Number(arg.slice(14));
    else if (arg === '--limit') options.limit = Number(take());
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.slice(8));
    else if (arg === '--start') options.start = take();
    else if (arg.startsWith('--start=')) options.start = arg.slice(8);
    else if (arg === '--task') options.task = take();
    else if (arg.startsWith('--task=')) options.task = arg.slice(7);
    else if (arg === '--resume') options.resume = true;
    else if (arg === '--offline') options.offline = true;
    else if (arg === '--timeout-ms') options.timeoutMs = Number(take());
    else if (arg.startsWith('--timeout-ms=')) options.timeoutMs = Number(arg.slice(13));
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency must be a positive integer');
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
    throw new Error('--timeout-ms must be a positive integer');
  }
  return options;
}

function naturalOrder(left, right) {
  const leftNumber = Number(left.match(/^P(\d+)/)?.[1] || 0);
  const rightNumber = Number(right.match(/^P(\d+)/)?.[1] || 0);
  return leftNumber - rightNumber || left.localeCompare(right);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readJsonLines(path) {
  const text = await readFile(path, 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

async function writeJsonLinesAtomic(path, rows) {
  const body = `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
  const temporary = `${path}.tmp`;
  await writeFile(temporary, body);
  await rename(temporary, path);
}

async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, worker),
  );
  return results;
}

function validationRow(
  source,
  report,
  reportPath,
  referenceHash,
  offline,
  evaluatorHash,
  browserVersion,
  taskTimeoutMs,
) {
  const passed = report.mode === 'CHECK_PASS'
    && report.tCov === 100
    && report.vCov === 100;
  return {
    task_id: source.task_id,
    status: passed ? 'pass' : 'fail',
    mode: report.mode,
    diagnostic: report.diagnostic ?? null,
    t_cov: report.tCov ?? 0,
    v_cov: report.vCov ?? 0,
    a_cov: report.aCov ?? 0,
    s_cov: report.sCov ?? 0,
    reference_sha256: referenceHash,
    rubric_sha256: source.rubric_sha256,
    report_path: reportPath,
    report_sha256: null,
    offline,
    evaluator_sha256: evaluatorHash,
    browser_version: report.browser_version ?? browserVersion,
    task_timeout_ms: taskTimeoutMs,
    duration_ms: report.duration_ms ?? null,
    validated_at: report.timestamp,
    error: report.error ?? null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const kitRoot = devKitRoot(RELEASE_ROOT);
  const integrated = kitRoot === RELEASE_ROOT
    && existsSync(join(RELEASE_ROOT, 'tasks', 'dev'));
  const evaluationSplit = integrated ? 'dev' : 'dev_200';
  const referenceManifest = join(kitRoot, 'manifests', 'references.jsonl');
  const validationRoot = integrated
    ? join(kitRoot, 'manifests')
    : join(kitRoot, 'validation');
  const reportRoot = integrated
    ? null
    : join(validationRoot, 'reports');
  const validationManifest = join(kitRoot, 'manifests', 'browser_validation.jsonl');
  const summaryPath = integrated
    ? join(validationRoot, 'dev_validation_summary.json')
    : join(validationRoot, 'summary.json');
  if (reportRoot) await mkdir(reportRoot, { recursive: true });
  const [evaluatorHash, browserVersion] = await Promise.all([
    validationFingerprint(RELEASE_ROOT),
    currentBrowserVersion(),
  ]);

  const sourceRows = await readJsonLines(referenceManifest);
  sourceRows.sort((left, right) => {
    const leftRank = Number(left.selection_rank);
    const rightRank = Number(right.selection_rank);
    if (Number.isFinite(leftRank) && Number.isFinite(rightRank) && leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return naturalOrder(left.task_id, right.task_id);
  });
  let selected = options.task
    ? sourceRows.filter(row => row.task_id === options.task)
    : sourceRows;
  if (options.start) {
    const startIndex = selected.findIndex(row => row.task_id.startsWith(options.start));
    selected = startIndex < 0 ? [] : selected.slice(startIndex);
  }
  if (options.limit !== null) selected = selected.slice(0, options.limit);
  if (!selected.length) throw new Error('No Dev references matched the requested selection.');

  const previousRows = existsSync(validationManifest)
    ? await readJsonLines(validationManifest)
    : [];
  const byTask = new Map(previousRows.map(row => [row.task_id, row]));

  const results = await mapConcurrent(selected, options.concurrency, async source => {
    const referencePath = join(kitRoot, source.reference_path);
    const reportPath = integrated
      ? join(kitRoot, 'tasks', 'dev', source.task_id, 'validation.json')
      : join(reportRoot, `${source.task_id}.json`);
    const reportRelative = reportPath.slice(kitRoot.length + 1).replaceAll('\\', '/');
    const referenceText = await readFile(referencePath);
    const referenceHash = sha256(referenceText);
    const previous = byTask.get(source.task_id);
    if (
      options.resume
      && previous
      && previous.reference_sha256 === referenceHash
      && previous.rubric_sha256 === source.rubric_sha256
      && previous.offline === options.offline
      && previous.evaluator_sha256 === evaluatorHash
      && previous.browser_version === browserVersion
      && previous.task_timeout_ms === options.timeoutMs
      && existsSync(reportPath)
    ) {
      console.log(`${source.task_id}\tRESUME\t${previous.status}`);
      return previous;
    }

    const report = await evaluateTask({
      root: RELEASE_ROOT,
      split: evaluationSplit,
      taskName: source.task_id,
      htmlName: basename(referencePath),
      htmlPath: referencePath,
      offline: options.offline,
      show: false,
      taskTimeoutMs: options.timeoutMs,
    });
    const reportBody = `${JSON.stringify(report, null, 2)}\n`;
    await writeFile(reportPath, reportBody);
    const row = validationRow(
      source,
      report,
      reportRelative,
      referenceHash,
      options.offline,
      evaluatorHash,
      browserVersion,
      options.timeoutMs,
    );
    row.report_sha256 = sha256(reportBody);
    byTask.set(source.task_id, row);
    console.log(
      `${source.task_id}\t${row.status.toUpperCase()}\t${row.mode}`
      + `\tT=${row.t_cov}%\tV=${row.v_cov}%\tA=${row.a_cov}%\tS=${row.s_cov}%`,
    );
    return row;
  });

  const allRows = sourceRows
    .map(source => byTask.get(source.task_id))
    .filter(Boolean);
  await writeJsonLinesAtomic(validationManifest, allRows);

  const sourceByTask = new Map(sourceRows.map(row => [row.task_id, row]));
  for (const row of allRows) {
    const source = sourceByTask.get(row.task_id);
    source.reference_sha256 = row.reference_sha256;
    source.current_browser_validation = row.status;
    source.current_browser_mode = row.mode;
    source.current_browser_t_cov = row.t_cov;
    source.current_browser_v_cov = row.v_cov;
    source.current_browser_report = row.report_path;
    source.current_browser_validated_at = row.validated_at;
    source.current_browser_offline = row.offline === true;
    source.current_browser_evaluator_sha256 = row.evaluator_sha256;
  }
  await writeJsonLinesAtomic(referenceManifest, sourceRows);

  const pass = allRows.filter(row => row.status === 'pass').length;
  const fail = allRows.filter(row => row.status === 'fail').length;
  const summary = {
    schema_version: '1.0',
    expected_references: sourceRows.length,
    validated_references: allRows.length,
    pass,
    fail,
    pending: sourceRows.length - allRows.length,
    selection_validated: results.length,
    offline: options.offline,
    evaluator_sha256: evaluatorHash,
    browser_version: browserVersion,
    task_timeout_ms: options.timeoutMs,
    ready: allRows.length === sourceRows.length && fail === 0,
    failure_modes: Object.fromEntries(
      [...Map.groupBy(allRows.filter(row => row.status === 'fail'), row => row.mode)]
        .map(([mode, rows]) => [mode, rows.length]),
    ),
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  const releaseSummaryPath = join(RELEASE_ROOT, 'manifests', 'build_summary.json');
  if (existsSync(releaseSummaryPath)) {
    const releaseSummary = JSON.parse(await readFile(releaseSummaryPath, 'utf8'));
    releaseSummary.dev_reference_browser_validation = summary.ready
      ? 'pass'
      : (summary.pending > 0 ? 'partial' : 'fail');
    releaseSummary.dev_browser_summary = {
      expected: summary.expected_references,
      validated: summary.validated_references,
      pass: summary.pass,
      fail: summary.fail,
      pending: summary.pending,
      offline: summary.offline,
      evaluator_sha256: summary.evaluator_sha256,
      browser_version: summary.browser_version,
      validated_at: allRows
        .map(row => row.validated_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
    };
    await writeFile(
      releaseSummaryPath,
      `${JSON.stringify(releaseSummary, null, 2)}\n`,
    );
  }
  console.log(JSON.stringify(summary, null, 2));
  if (results.some(row => row.status === 'fail')) process.exitCode = 2;
}

main().catch(error => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
