#!/usr/bin/env node

/**
 * Portable WorldCoder-Bench evaluator.
 *
 * The release contains task definitions and behavioral contracts, but no
 * model-generated HTML.  Pass a model artifact with --html-path when running
 * an evaluation.  The HTTP server always serves the release root so shared
 * assets resolve from assets/shared regardless of the task directory.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePublicPage, zeroEvaluation } from '../stateprobe/evaluate.mjs';
import {
  PUBLIC_EVALUATION_SPLIT,
  assertPublicEvaluationSplit,
  isPublicEvaluationSplit,
  loadPublicRubric,
  publicTaskNames,
} from './rubric-policy.mjs';

const CLI_PATH = fileURLToPath(import.meta.url);
const HERE = dirname(CLI_PATH);
const DEFAULT_ROOT = resolve(HERE, '../..');
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream', '.pdb': 'chemical/x-pdb', '.wasm': 'application/wasm',
};

function usage(exitCode = 0) {
  console.log(`WorldCoder-Bench evaluator\n\n` +
    `  node code/evaluator/cli.mjs --split dev --task P01... --html-path /tmp/model.html\n\n` +
    `Options: --root DIR --split NAME --task ID --html FILE --html-path FILE\n` +
    `         --model ID --output FILE --limit N --start ID --concurrency N --resume\n` +
    `         --offline --show --validate\n\n` +
    `  --validate checks archival task/contract files and does not expose them for public evaluation.`);
  process.exit(exitCode);
}

export function parseArgs(argv) {
  const o = { root: DEFAULT_ROOT, split: PUBLIC_EVALUATION_SPLIT, task: null, html: null, htmlPath: null,
    model: null, output: null, limit: null, start: null, concurrency: 1,
    resume: false, offline: false, show: false, validate: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], take = () => argv[++i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--root') o.root = resolve(take());
    else if (a.startsWith('--root=')) o.root = resolve(a.slice(7));
    else if (a === '--split') o.split = take();
    else if (a.startsWith('--split=')) o.split = a.slice(8);
    else if (a === '--task') o.task = take();
    else if (a.startsWith('--task=')) o.task = a.slice(7);
    else if (a === '--html') o.html = take();
    else if (a.startsWith('--html=')) o.html = a.slice(7);
    else if (a === '--html-path') o.htmlPath = resolve(take());
    else if (a.startsWith('--html-path=')) o.htmlPath = resolve(a.slice(12));
    else if (a === '--model') o.model = take();
    else if (a.startsWith('--model=')) o.model = a.slice(8);
    else if (a === '--output' || a === '--out') o.output = take();
    else if (a.startsWith('--output=')) o.output = a.slice(9);
    else if (a === '--limit') o.limit = Number(take());
    else if (a.startsWith('--limit=')) o.limit = Number(a.slice(8));
    else if (a === '--start') o.start = take();
    else if (a.startsWith('--start=')) o.start = a.slice(8);
    else if (a === '--concurrency') o.concurrency = Math.max(1, Number(take()));
    else if (a.startsWith('--concurrency=')) o.concurrency = Math.max(1, Number(a.slice(14)));
    else if (a === '--resume') o.resume = true;
    else if (a === '--offline') o.offline = true;
    else if (a === '--show') o.show = true;
    else if (a === '--validate') o.validate = true;
    else throw new Error(`Unknown option: ${a}`);
  }
  if (!o.validate) assertPublicEvaluationSplit(o.split);
  if (!Number.isFinite(o.concurrency) || o.concurrency < 1) throw new Error('--concurrency must be positive');
  if (o.htmlPath && o.html && o.html !== basename(o.htmlPath)) throw new Error('Use either --html or --html-path, not both');
  return o;
}

function under(root, target) {
  const r = resolve(root), t = resolve(target);
  return t === r || t.startsWith(`${r}${sep}`);
}

function sharedBasenamePath(root, requestPath) {
  const name = basename(requestPath);
  if (!name || name === '.' || name === '..' || name.includes('\\')) return null;
  const candidates = [name];
  if (name.startsWith('._') && name.length > 2) candidates.push(name.slice(2));
  for (const candidateName of candidates) {
    const candidate = join(root, 'assets', 'shared', candidateName);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function routePath(root, split, requestPath) {
  const clean = decodeURIComponent(requestPath.split('?')[0]);
  let rel;
  if (clean.startsWith(`/tasks/${split}/`)) rel = clean.slice(`/tasks/${split}/`.length);
  else if (clean.startsWith(`/assets/${split}/`)) return join(root, 'assets', split, clean.slice(`/assets/${split}/`.length));
  else if (clean.startsWith('/shared_assets/')) return join(root, 'assets', 'shared', clean.slice('/shared_assets/'.length));
  else if (clean.startsWith('/assets/')) {
    const direct = join(root, clean.slice(1));
    return existsSync(direct) ? direct : join(root, 'assets', 'shared', clean.slice('/assets/'.length));
  }
  else return sharedBasenamePath(root, clean);
  const taskPath = join(root, 'tasks', split, rel);
  if (existsSync(taskPath)) return taskPath;
  const shared = rel.indexOf('/shared_assets/');
  if (shared >= 0) return join(root, 'assets', 'shared', rel.slice(shared + '/shared_assets/'.length));
  const taskAssets = rel.indexOf('/assets/');
  if (taskAssets >= 0) {
    const assetRel = rel.slice(taskAssets + '/assets/'.length);
    if (assetRel.startsWith('shared/')) return join(root, 'assets', 'shared', assetRel.slice('shared/'.length));
    return join(root, 'assets', 'shared', assetRel);
  }
  return sharedBasenamePath(root, rel) || taskPath;
}

function startServer(root, split, { htmlRoute = null, htmlOverride = null } = {}) {
  return new Promise(resolveServer => {
    const server = createServer((req, res) => {
      try {
        const clean = decodeURIComponent((req.url || '/').split('?')[0]);
        if (htmlRoute && htmlOverride && clean === htmlRoute) {
          if (!existsSync(htmlOverride)) { res.writeHead(404); res.end('Input HTML not found'); return; }
          res.writeHead(200, { 'Content-Type': MIME['.html'], 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
          res.end(readFileSync(htmlOverride)); return;
        }
        const path = routePath(root, split, req.url || '/');
        if (!path || !under(root, path) || !existsSync(path)) { res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('Not Found'); return; }
        res.writeHead(200, {
          'Content-Type': MIME[extname(path).toLowerCase()] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store',
        });
        res.end(readFileSync(path));
      } catch (error) { res.writeHead(400); res.end(String(error.message)); }
    });
    server.listen(0, '127.0.0.1', () => resolveServer({ server, port: server.address().port }));
  });
}

function browserPath() {
  const candidates = [
    process.env.CHROME_PATH, process.env.CHROMIUM_PATH, '/usr/bin/chromium',
    '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find(existsSync) || chromium.executablePath();
}

function browserLaunchOptions(show = false) {
  return {
    headless: !show,
    executablePath: browserPath() || undefined,
    args: BROWSER_ARGS,
  };
}

export async function currentBrowserVersion() {
  const browser = await chromium.launch(browserLaunchOptions(false));
  try {
    return browser.version();
  } finally {
    await browser.close();
  }
}

async function installImportMap(page, offline) {
  const vendor = resolve(HERE, '../vendor/three');
  const hasVendor = existsSync(join(vendor, 'build/three.module.js'));
  if (offline && !hasVendor) throw new Error('--offline requested but code/vendor/three is absent');
  await page.route('**/*', async route => {
    const requestUrl = new URL(route.request().url());
    const localRequest = requestUrl.protocol === 'http:'
      && (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost');
    if (localRequest && route.request().resourceType() === 'document') {
      const response = await route.fetch();
      let html = await response.text();
      if (!html.includes('type="importmap"')) {
        const map = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>';
        html = html.replace(/<head([^>]*)>/i, `<head$1>${map}`);
      }
      await route.fulfill({ response, body: html, headers: { ...response.headers(), 'content-type': 'text/html; charset=utf-8' } });
      return;
    }
    if (localRequest) return route.continue();

    const isThreeCdn = requestUrl.hostname === 'cdn.jsdelivr.net'
      && /^\/npm\/three@[^/]+\//.test(requestUrl.pathname)
      || requestUrl.hostname === 'unpkg.com'
      && /^\/three@[^/]+\//.test(requestUrl.pathname);
    if (isThreeCdn && hasVendor) {
      const prefix = requestUrl.pathname.replace(/^\/npm\/three@[^/]+\//, '').replace(/^\/three@[^/]+\//, '');
      const local = join(vendor, prefix);
      if (existsSync(local) && under(vendor, local) && statSync(local).isFile()) {
        await route.fulfill({
          status: 200,
          body: readFileSync(local),
          contentType: prefix.endsWith('.js') ? 'application/javascript' : 'application/octet-stream',
        });
        return;
      }
    }
    if (offline && /^https?:$/.test(requestUrl.protocol)) return route.abort();
    return route.continue();
  });
  return hasVendor;
}

export async function evaluateTask({
  root,
  split,
  taskName,
  htmlName,
  htmlPath = null,
  offline,
  show,
  taskTimeoutMs = 120_000,
}) {
  assertPublicEvaluationSplit(split);
  const startedAt = Date.now();
  const taskDir = join(root, 'tasks', split, taskName);
  const rubric = await loadPublicRubric(taskDir, split);
  const baseReport = {
    task_id: taskName,
    split,
    timestamp: new Date().toISOString(),
  };
  const html = htmlName || (htmlPath ? basename(htmlPath) : null) || 'input.html';
  const packagedHtml = join(taskDir, html);
  if (!htmlPath && !existsSync(packagedHtml)) {
    return { ...baseReport, html, ...zeroEvaluation(rubric, 'NO_HTML', 'HTML_NOT_FOUND'), message: 'No model HTML is packaged; pass --html-path.' };
  }
  if (htmlPath && !existsSync(htmlPath)) {
    return { ...baseReport, html, ...zeroEvaluation(rubric, 'NO_HTML', 'HTML_NOT_FOUND'), message: `Input HTML not found: ${htmlPath}` };
  }
  const htmlRoute = `/tasks/${split}/${encodeURIComponent(taskName)}/${encodeURIComponent(html)}`;
  const { server, port } = await startServer(root, split, { htmlRoute, htmlOverride: htmlPath });
  let browser = null;
  let context = null;
  let page = null;
  let taskTimer = null;
  let taskTimedOut = false;
  const consoleErrors = [];
  const report = { ...baseReport, html, consoleErrors, console_errors: consoleErrors };
  try {
    browser = await chromium.launch(browserLaunchOptions(show));
    report.browser_version = browser.version();
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage(); page.setDefaultTimeout(30000);
    if (Number.isFinite(taskTimeoutMs) && taskTimeoutMs > 0) {
      taskTimer = setTimeout(() => {
        taskTimedOut = true;
        context?.close().catch(() => {});
      }, taskTimeoutMs);
    }
    page.on('pageerror', e => consoleErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    await installImportMap(page, offline);
    const url = `http://127.0.0.1:${port}${htmlRoute}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    Object.assign(report, await evaluatePublicPage(page, rubric));
    if (report.vCov !== report.coverage.vCov.percent || report.tCov !== report.coverage.tCov.percent) {
      throw new Error('Shared evaluator returned inconsistent metric fields.');
    }
    report.failure_mode = report.mode;
  } catch (error) {
    Object.assign(
      report,
      zeroEvaluation(
        rubric,
        'RUNTIME_CRASH',
        taskTimedOut ? 'TASK_TIMEOUT' : 'EVALUATION_EXCEPTION',
      ),
    );
    report.failure_mode = report.mode;
    report.error = taskTimedOut
      ? `Task exceeded ${taskTimeoutMs}ms total evaluation timeout.`
      : error.message;
  }
  finally {
    if (taskTimer) clearTimeout(taskTimer);
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    server.close();
    report.duration_ms = Date.now() - startedAt;
  }
  return report;
}

export async function taskNames(root, split) {
  return publicTaskNames(root, split);
}

export async function archivalTaskNames(root, split) {
  const splitDir = join(resolve(root), 'tasks', split);
  let entries;
  try {
    entries = await readdir(splitDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Archival split not found: ${splitDir} (${error.message})`);
  }
  const names = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('P'))
    .map(entry => entry.name)
    .sort((a, b) => (Number(a.match(/^P(\d+)/)?.[1] || 0)
      - Number(b.match(/^P(\d+)/)?.[1] || 0)) || a.localeCompare(b));
  const missing = names.filter(name => !existsSync(join(splitDir, name, 'task.json')));
  if (missing.length) {
    throw new Error(`Task-only validation failed: ${missing.length} task(s) lack task.json: ${missing.slice(0, 10).join(', ')}`);
  }
  if (isPublicEvaluationSplit(split)) await publicTaskNames(root, split);
  return names;
}

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  const worker = async () => { while (true) { const i = next++; if (i >= items.length) return; results[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, worker));
  return results;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.validate) {
    const names = await archivalTaskNames(opts.root, opts.split);
    console.log(JSON.stringify({
      root: opts.root,
      split: opts.split,
      tasks: names.length,
      mode: isPublicEvaluationSplit(opts.split) ? 'task_plus_public_rubric' : 'task_only_schema',
    }, null, 2));
    return;
  }
  if (!opts.model && !opts.html && !opts.htmlPath) throw new Error('Provide --model, --html, or --html-path');
  if (opts.html && existsSync(resolve(opts.html))) opts.htmlPath = resolve(opts.html);
  if (opts.htmlPath && !opts.task) throw new Error('--html-path requires --task (one external HTML per task)');
  let names = opts.task ? [opts.task] : await taskNames(opts.root, opts.split);
  if (opts.start) { const index = names.findIndex(n => n.startsWith(opts.start)); names = index < 0 ? [] : names.slice(index); }
  if (opts.limit > 0) names = names.slice(0, opts.limit);
  if (opts.htmlPath && names.length !== 1) throw new Error('--html-path can evaluate exactly one task');
  const htmlName = opts.htmlPath ? basename(opts.htmlPath) : (opts.html || (opts.model ? `llm_${opts.model}.html` : null));
  const outputs = await mapConcurrent(names, opts.concurrency, async task => {
    const out = opts.output && names.length === 1 ? resolve(opts.output) : join(opts.root, 'results', opts.split, opts.model || 'custom', `${task}.json`);
    if (opts.resume && existsSync(out)) return JSON.parse(await readFile(out, 'utf8'));
    const result = await evaluateTask({ root: opts.root, split: opts.split, taskName: task, htmlName, htmlPath: opts.htmlPath, offline: opts.offline, show: opts.show });
    await mkdir(dirname(out), { recursive: true }); await writeFile(out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`${task}\t${result.mode}\tT=${result.tCov ?? 0}%\tV=${result.vCov ?? 0}%\tA=${result.aCov ?? 0}%\tS=${result.sCov ?? 0}%`);
    return result;
  });
  if (names.length > 1) { const summary = { split: opts.split, model: opts.model, tasks: outputs.length, meanTCov: outputs.length ? +(outputs.reduce((s, x) => s + (x.tCov || 0), 0) / outputs.length).toFixed(1) : 0, meanVCov: outputs.length ? +(outputs.reduce((s, x) => s + (x.vCov || 0), 0) / outputs.length).toFixed(1) : 0, modes: Object.fromEntries([...new Set(outputs.map(x => x.mode))].map(m => [m, outputs.filter(x => x.mode === m).length])) }; const path = join(opts.root, 'results', opts.split, opts.model || 'custom', 'summary.json'); await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`); console.log(JSON.stringify(summary, null, 2)); }
}

if (process.argv[1] && resolve(process.argv[1]) === CLI_PATH) {
  main().catch(error => { console.error(`ERROR: ${error.message}`); process.exit(1); });
}
