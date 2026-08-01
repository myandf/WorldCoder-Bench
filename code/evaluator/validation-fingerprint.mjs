import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

async function collectFiles(path, files) {
  const info = await stat(path);
  if (info.isFile()) {
    files.push(path);
    return;
  }
  for (const entry of await readdir(path, { withFileTypes: true })) {
    await collectFiles(join(path, entry.name), files);
  }
}

export async function validationFingerprint(releaseRoot) {
  const root = resolve(releaseRoot);
  const files = [];
  for (const path of [
    join(root, 'scripts', 'validate_dev_references.mjs'),
    join(root, 'code', 'evaluator'),
    join(root, 'code', 'stateprobe'),
    join(root, 'code', 'vendor', 'three'),
    join(root, 'package-lock.json'),
  ]) {
    await collectFiles(path, files);
  }
  files.sort((left, right) => (left < right ? -1 : (left > right ? 1 : 0)));

  const digest = createHash('sha256');
  for (const path of files) {
    const name = relative(root, path).split(sep).join('/');
    digest.update(name);
    digest.update('\0');
    digest.update(await readFile(path));
    digest.update('\0');
  }
  return digest.digest('hex');
}
