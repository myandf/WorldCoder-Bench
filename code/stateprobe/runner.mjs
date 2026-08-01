/**
 * Reusable StateProbe evaluator for the public Dev split.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Sandbox } from './sandbox.mjs';
import { evaluatePublicPage, zeroEvaluation } from './evaluate.mjs';
import {
  EvaluationPolicyError,
  PUBLIC_EVALUATION_SPLIT,
  assertPublicEvaluationSplit,
  isPublicEvaluationSplit,
  loadPublicRubric,
  splitForTaskDir,
} from '../evaluator/rubric-policy.mjs';

function reportFor(task, split, htmlFile, evaluation, consoleErrors = [], errors = []) {
  return {
    timestamp: new Date().toISOString(),
    task_id: task.id,
    html: htmlFile,
    html_file: htmlFile,
    split,
    ...evaluation,
    failure_mode: evaluation.mode,
    errors,
    consoleErrors,
    console_errors: consoleErrors,
  };
}

export async function runEvaluation(opts) {
  if (!opts?.taskDir) throw new EvaluationPolicyError('taskDir is required.', 'TASK_DIR_REQUIRED');
  const taskDir = resolve(opts.taskDir);
  const inferredSplit = splitForTaskDir(taskDir);
  const split = opts.split ?? inferredSplit;
  assertPublicEvaluationSplit(split);
  if (!isPublicEvaluationSplit(inferredSplit)) {
    throw new EvaluationPolicyError(
      `Task directory belongs to '${inferredSplit}', not '${PUBLIC_EVALUATION_SPLIT}'. `
        + 'Core/Extended task directories cannot be evaluated without a public rubric.',
      'RUBRIC_NOT_PUBLIC',
    );
  }

  const rubric = await loadPublicRubric(taskDir, split);
  const task = JSON.parse(await readFile(join(taskDir, 'task.json'), 'utf8'));
  const htmlFile = opts.htmlFile || (opts.htmlPath ? basename(opts.htmlPath) : 'input.html');
  const quiet = opts.quiet === true;

  const htmlPath = opts.htmlPath ? resolve(opts.htmlPath) : join(taskDir, htmlFile);
  if (!existsSync(htmlPath)) {
    const evaluation = zeroEvaluation(rubric, 'NO_HTML', 'HTML_NOT_FOUND');
    return reportFor(
      task,
      split,
      htmlFile,
      evaluation,
      [],
      [`Input HTML not found: ${htmlPath}`],
    );
  }

  if (!quiet) {
    console.log(`\n[WorldCoder-Bench / StateProbe] ${task.id} - ${task.title}`);
    console.log(`  Split: ${split} | File: ${htmlFile} | Difficulty: ${task.difficulty}`);
  }

  const releaseRoot = opts.releaseRoot ? resolve(opts.releaseRoot) : resolve(taskDir, '../../..');
  const sandbox = new Sandbox({
    taskDir,
    releaseRoot,
    htmlFile,
    htmlPath: opts.htmlPath ? htmlPath : null,
    offline: opts.offline === true,
    headless: opts.headless !== false,
  });
  let page;
  let consoleErrors = [];
  try {
    ({ page, consoleErrors } = await sandbox.launch());
  } catch (error) {
    await sandbox.teardown();
    const evaluation = zeroEvaluation(rubric, 'RUNTIME_CRASH', 'SANDBOX_FAILURE');
    return reportFor(task, split, htmlFile, evaluation, [], [`Page load failed: ${error.message}`]);
  }

  let evaluation;
  try {
    evaluation = await evaluatePublicPage(page, rubric);
  } catch (error) {
    evaluation = zeroEvaluation(rubric, 'RUNTIME_CRASH', 'EVALUATION_EXCEPTION');
    evaluation.error = error.message;
  } finally {
    await sandbox.teardown();
  }

  const errors = [];
  if (evaluation.diagnostic === 'PROBE_MISSING') errors.push('window.__3D_STATE__ is unavailable.');
  if (evaluation.error) errors.push(evaluation.error);
  const report = reportFor(task, split, htmlFile, evaluation, consoleErrors, errors);
  if (!quiet) {
    console.log(`  V-Cov=${report.vCov}%  A-Cov=${report.aCov}%  S-Cov=${report.sCov}%  T-Cov=${report.tCov}%`);
  }
  return report;
}

export async function saveReport(report, taskDir) {
  const name = report.html_file.replace(/[\/\\]/g, '_').replace(/\.html$/, '');
  const path = join(resolve(taskDir), `report_${name}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  return path;
}
