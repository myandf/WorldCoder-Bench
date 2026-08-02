# StateProbe evaluator

`code/evaluator/cli.mjs` evaluates user-supplied HTML for public Dev tasks.
Rubrics are loaded from `tasks/dev/<task-id>/rubric.json`.

```bash
npm install --no-save --package-lock=false playwright@1.58.2
npx playwright install chromium
./code/run_eval.sh --split dev --task <task-id> --html-path <generated.html> --offline
```

`code/stateprobe/` contains the action executor, state probe, checkers, and
report logic. `code/vendor/three/` supports offline Three.js loading.
Evaluation is refused for Core, Extended, and Robust because their contracts
are private.
