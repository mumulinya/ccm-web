# Release Handoff Matrix

Check only the rows relevant to the release:

| Area | Evidence |
| --- | --- |
| Source | Reviewed diff, intended files, clean ownership boundary |
| Quality | Required type, lint, test, build, and acceptance results |
| Package | Produced artifact, version, entry point, required bundled files |
| Configuration | Named settings and secret references present for target environment |
| Compatibility | API, schema, client, runtime, and dependency impact reviewed |
| Migration | Ordering, idempotency, backup, retry, and partial-failure behavior |
| Rollout | Steps, owner, health checks, thresholds, and communication |
| Recovery | Rollback or forward-fix procedure and data implications |

Use `conditionally ready` only when every condition has a named owner and observable completion check.
