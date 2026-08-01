# WorldCoder-Bench Dataset Card

## Summary

WorldCoder-Bench is a browser-native 3D world synthesis benchmark evaluated
with StateProbe behavioral contracts. This public package contains task
specifications for Core, Dev, Extended, and Robust, plus public Dev rubrics and
validated references.

## Task groups

| Group | Count | Public contents |
| --- | ---: | --- |
| Core | 205 | `tasks/core/*/task.json` |
| Dev | 200 | task, rubric, reference, and validation JSON/HTML |
| Extended | 1,621 | `tasks/extended/*/task.json` |
| Robust | 615 | `tasks/robust/*/task.json` |

Robust is derived and is not added to the 2,026 canonical-task total.

## Provenance and limitations

Core membership and the historical 1,799-task source pool are tied to
immutable source evidence in `manifests/membership_evidence.json`. The complete
official 2026 membership ledger is not independently verified. Twelve unusable
historical records are disclosed in the recovery manifests and replaced by
deterministic controlled augmentations.

Asset identity, licensing, substitutions, and hashes are documented under
`manifests/` and `licenses/`. Hidden Core, Extended, and Robust contracts are
not part of this public package.

## Evaluation

Dev evaluation uses `tasks/dev/<task-id>/rubric.json`. Reference pages and
their offline validation reports are colocated in the same task directory.
The standard runtime state interface is `window.__3D_STATE__`.

## License

See `LICENSE`, `THIRD_PARTY_NOTICES.md`, and `licenses/`.
