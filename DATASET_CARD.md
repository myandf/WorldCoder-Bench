# WorldCoder-Bench Dataset Card

## Summary

WorldCoder-Bench is a browser-native 3D world synthesis benchmark evaluated
with StateProbe behavioral contracts. This public package contains task
specifications for Core, Dev, Extended, and Robust, plus public Dev rubrics and
the StateProbe evaluator.

## Task groups

| Group | Count | Public contents |
| --- | ---: | --- |
| Core | 205 | `tasks/core/*/task.json` |
| Dev | 200 | `task.json` and public `rubric.json` |
| Extended | 1,621 | `tasks/extended/*/task.json` |
| Robust | 615 | `tasks/robust/*/task.json` |

Robust is derived and is not added to the 2,026 canonical-task total.

## Provenance and limitations

The complete official 2026 membership ledger is not independently verified.
Twelve unusable historical records were replaced by deterministic controlled
augmentations.

Hidden Core, Extended, and Robust contracts are not part of this public
package.

## Evaluation

Dev evaluation uses `tasks/dev/<task-id>/rubric.json` and a user-supplied HTML
file. The standard runtime state interface is `window.__3D_STATE__`.

## License

See `LICENSE`.
