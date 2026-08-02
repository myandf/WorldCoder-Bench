# WorldCoder-Bench

This is the streamlined public WorldCoder-Bench release. Tasks, public Dev
evaluation material, assets, and evaluator code are in one package.

## Layout

| Path | Contents |
| --- | --- |
| `tasks/core/` | 205 public task specifications; hidden contracts are not published |
| `tasks/dev/` | 200 task specifications with public evaluation rubrics |
| `tasks/extended/` | 1,621 public task specifications; hidden contracts are not published |
| `tasks/robust/` | 615 derived public task specifications; hidden contracts are not published |
| `assets/shared/` | Shared task assets |
| `code/` | StateProbe evaluator and vendored browser runtime |

Each Dev task directory contains:

```text
task.json
rubric.json
```

See `tasks/dev/README.md` for the Dev file contract.

## Evaluate

Requirements: Node.js 18 or newer, npm, and Playwright Chromium. Install the
runtime dependency without adding package metadata to the release:

```bash
npm install --no-save --package-lock=false playwright@1.58.2
npx playwright install chromium
node code/evaluator/cli.mjs --validate --split core
./code/run_eval.sh --split dev --task <task-id> --html-path <generated.html> --offline
```

The public evaluator accepts only `tasks/dev/`, because Core, Extended, and
Robust behavioral contracts remain private.

## Release status

The package contains 2,026 canonical tasks plus 615 derived Robust variants.
It is a deterministic local reconstruction with the assets required by its
public tasks. Complete official frozen 2026 membership is not independently
verified. Twelve source gaps are represented by controlled task/contract
augmentations.
