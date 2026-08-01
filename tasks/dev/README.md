# Dev tasks

Every `tasks/dev/<task-id>/` directory is self-contained:

- `task.json`: task specification.
- `rubric.json`: public StateProbe behavioral rubric.
- `reference.html`: selected public reference implementation.
- `validation.json`: offline browser-validation report for that reference.

The aggregate reference and validation indexes are
`manifests/references.jsonl`, `manifests/browser_validation.jsonl`, and
`manifests/dev_validation_summary.json`.
