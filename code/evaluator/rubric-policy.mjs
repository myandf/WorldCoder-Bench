import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

export const PUBLIC_EVALUATION_SPLIT = 'dev';
export const LEGACY_PUBLIC_EVALUATION_SPLIT = 'dev_200';
export const PUBLIC_RUBRIC_FILENAME = 'rubric.json';
export const PUBLIC_DEV_KIT_DIRECTORY = 'WorldCoder-Bench-public-dev-kit-v0.2.0';
export const LEGACY_DEV_KIT_DIRECTORY = 'WorldCoder-Bench-dev-evaluation';

export class EvaluationPolicyError extends Error {
  constructor(message, code = 'EVALUATION_POLICY') {
    super(message);
    this.name = 'EvaluationPolicyError';
    this.code = code;
  }
}

export function assertPublicEvaluationSplit(split) {
  if (isPublicEvaluationSplit(split)) return split;
  throw new EvaluationPolicyError(
    `Split '${split}' is task-only and has no public ${PUBLIC_RUBRIC_FILENAME}; `
      + `public evaluation is restricted to '${PUBLIC_EVALUATION_SPLIT}'.`,
    'RUBRIC_NOT_PUBLIC',
  );
}

export function isPublicEvaluationSplit(split) {
  return split === PUBLIC_EVALUATION_SPLIT
    || split === LEGACY_PUBLIC_EVALUATION_SPLIT;
}

export function splitForTaskDir(taskDir) {
  return basename(dirname(resolve(taskDir)));
}

export function devKitRoot(releaseRoot) {
  if (process.env.WORLDCODER_DEV_KIT) {
    return resolve(process.env.WORLDCODER_DEV_KIT);
  }
  const integratedRoot = resolve(releaseRoot);
  if (existsSync(join(integratedRoot, 'tasks', PUBLIC_EVALUATION_SPLIT))) {
    return integratedRoot;
  }
  const parent = resolve(releaseRoot, '..');
  const publicRoot = join(parent, PUBLIC_DEV_KIT_DIRECTORY);
  return existsSync(publicRoot)
    ? publicRoot
    : join(parent, LEGACY_DEV_KIT_DIRECTORY);
}

export function publicRubricPath(taskDir) {
  const resolvedTaskDir = resolve(taskDir);
  const integratedRubric = join(resolvedTaskDir, PUBLIC_RUBRIC_FILENAME);
  if (existsSync(integratedRubric)) return integratedRubric;
  const releaseRoot = resolve(resolvedTaskDir, '../../..');
  return join(devKitRoot(releaseRoot), 'rubrics', basename(resolvedTaskDir), PUBLIC_RUBRIC_FILENAME);
}

function validateRubric(rubric, rubricPath) {
  if (!rubric || typeof rubric !== 'object' || Array.isArray(rubric)) {
    throw new EvaluationPolicyError(`Invalid public rubric: ${rubricPath}`, 'BAD_RUBRIC');
  }
  for (const field of ['affordances', 'states', 'transitions']) {
    if (!Array.isArray(rubric[field])) {
      throw new EvaluationPolicyError(
        `Invalid public rubric: ${rubricPath} must contain an array '${field}'.`,
        'BAD_RUBRIC',
      );
    }
  }
  return rubric;
}

export async function loadPublicRubric(taskDir, split = splitForTaskDir(taskDir)) {
  assertPublicEvaluationSplit(split);
  const rubricPath = publicRubricPath(taskDir);
  if (!existsSync(rubricPath)) {
    throw new EvaluationPolicyError(
      `Public rubric not found: ${rubricPath}. Evaluation is refused without ${PUBLIC_RUBRIC_FILENAME}.`,
      'RUBRIC_NOT_FOUND',
    );
  }
  let rubric;
  try {
    rubric = JSON.parse(await readFile(rubricPath, 'utf8'));
  } catch (error) {
    throw new EvaluationPolicyError(
      `Cannot read public rubric ${rubricPath}: ${error.message}`,
      'BAD_RUBRIC',
    );
  }
  return validateRubric(rubric, rubricPath);
}

export async function publicTaskNames(root, split = PUBLIC_EVALUATION_SPLIT) {
  assertPublicEvaluationSplit(split);
  const splitDir = join(resolve(root), 'tasks', split);
  let entries;
  try {
    entries = await readdir(splitDir, { withFileTypes: true });
  } catch (error) {
    throw new EvaluationPolicyError(
      `Public evaluation split not found: ${splitDir}.`,
      'DEV_SPLIT_NOT_FOUND',
    );
  }
  const taskNames = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('P'))
    .map(entry => entry.name)
    .filter(name => existsSync(join(splitDir, name, 'task.json')));
  const kitRoot = devKitRoot(root);
  const missingRubrics = taskNames.filter(
    name => {
      const taskDir = join(splitDir, name);
      return !existsSync(join(taskDir, PUBLIC_RUBRIC_FILENAME))
        && !existsSync(join(kitRoot, 'rubrics', name, PUBLIC_RUBRIC_FILENAME));
    },
  );
  if (missingRubrics.length) {
    throw new EvaluationPolicyError(
      `Public evaluation refused: ${missingRubrics.length} '${split}' task(s) lack ${PUBLIC_RUBRIC_FILENAME}: `
        + missingRubrics.slice(0, 10).join(', '),
      'RUBRIC_NOT_FOUND',
    );
  }
  return taskNames
    .sort((a, b) => (Number(a.match(/^P(\d+)/)?.[1] || 0)
      - Number(b.match(/^P(\d+)/)?.[1] || 0)) || a.localeCompare(b));
}
