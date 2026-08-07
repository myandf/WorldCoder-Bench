# Evaluator Design Notes

Investigation date: 2026-08-07.

## GolfBall Existence Semantics

The `GolfBall` affordance in `tasks/dev/P244_procedural_mini_golf/rubric.json` is not a viewport or canvas-boundary test.

The relevant public rubric record is:

```json
{
  "type": "3d_object",
  "checks": [{"expr": "false", "tier": "L1"}],
  "check_origin": "unverifiable_fail_closed"
}
```

The same design is used for `Hole`, `Ferrari`, and `AimArrow` in that task. Therefore `false` means **the public evaluator intentionally cannot verify this affordance and closes the check as not found**. It does not mean that the object is required to be outside the canvas, outside the viewport, or invisible.

## Why This Happens

The public StateProbe protocol exposes `window.__3D_STATE__` and evaluates JavaScript expressions against it. The evaluator can reliably check explicit state fields such as `ballPosition`, `ballMoving`, `holeComplete`, and `obstacleCount`, but it cannot infer arbitrary Three.js scene-graph membership from a rendered canvas.

For an affordance with configured checks, `code/stateprobe/evaluate.mjs` evaluates the configured expression and returns immediately when it fails. Locator hints are not used as a fallback once a check is present. Since `eval("false")` is always false, the affordance receives `found: false` every time.

The expression evaluator in `code/stateprobe/probe.mjs` only evaluates the supplied JavaScript expression in the page context. It does not inspect Three.js objects, render pixels, frustum membership, or canvas coordinates.

## Scope In The Public Dev Rubrics

- Fail-closed affordances: **417**.
- Affected task specifications: **179**.
- `3d_object` affordances: **411**.
- Other affordances using the same fail-closed pattern: **6**.
- Check origin: `unverifiable_fail_closed` for all records in this audit.

This is a contract-design limitation, not evidence that the associated tasks are invalid. The task validity audit still passes all 2,641 task specifications.

## Evaluation Impact

- The affected affordance contributes `found: false` and lowers affordance coverage (`aCov`).
- It does not by itself change the transition assertions. Transition checks are evaluated separately from affordance discovery.
- A model can still pass executable behavioral checks that use `window.__3D_STATE__`, even when a non-verifiable 3D affordance remains unresolved.

## Recommended Contract Design

If 3D object existence should be evaluated as a benchmark requirement, expose explicit machine-readable state in the task contract, for example `window.__3D_STATE__.objects.golfBall.exists === true`, together with a stable object count or object-specific state fields. Then replace the unconditional `false` affordance check with an expression over that state.

Do not use canvas containment as the definition of existence. A Three.js object may be validly present while off-camera, temporarily occluded, behind another object, or intentionally hidden during an interaction. If visual visibility is a separate requirement, define it explicitly as a separate state field or pixel-level test.

## P244 Conclusion

For `P244_procedural_mini_golf`, `GolfBall` should be interpreted as an **unverifiable public affordance**, not as an object that must be absent from the canvas. The reliable checks for this task are the state-based checks for ball position, velocity, motion, strokes, hole completion, course dimensions, and Ferrari loading.
