# WorldCoder-Bench

This is the streamlined public WorldCoder-Bench release. Tasks, public Dev
evaluation material, assets, evaluator code, and provenance manifests are in
one package.

## Layout

| Path | Contents |
| --- | --- |
| `tasks/core/` | 205 public task specifications; hidden contracts are not published |
| `tasks/dev/` | 200 tasks with public rubric, reference, and validation files |
| `tasks/extended/` | 1,621 public task specifications; hidden contracts are not published |
| `tasks/robust/` | 615 derived public task specifications; hidden contracts are not published |
| `assets/shared/` | Shared task assets |
| `code/` | StateProbe evaluator and vendored browser runtime |
| `manifests/` | Task, Dev validation, provenance, recovery, and integrity indexes |

Each Dev task directory contains:

```text
task.json
rubric.json
reference.html
validation.json
```

See `tasks/dev/README.md` for the Dev file contract and
`manifests/README.md` for provenance paths.

## Evaluate

Requirements: Node.js 18 or newer, npm, and Playwright Chromium.

```bash
npm ci
npx playwright install chromium
npm run smoke
npm run evaluate -- --task <task-id> --html-path <generated.html> --offline
```

The public evaluator accepts only `tasks/dev/`, because Core, Extended, and
Robust behavioral contracts remain private.

## Release status

The package contains 2,026 canonical tasks plus 615 derived Robust variants.
It is a deterministic local reconstruction with provenance-complete assets and
offline Dev validation. Complete official frozen 2026 membership is not
independently verified. Twelve disclosed source gaps are represented by
controlled task/contract augmentations.

Do not add or publish `WorldCoder-Bench-evaluation-private`, hidden contracts,
model outputs, screenshots, trajectories, or raw model reports.
