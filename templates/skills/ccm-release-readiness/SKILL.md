---
name: ccm-release-readiness
description: Assess whether CCM work is ready to deploy or release. Use for deployment, packaging, version upgrades, migrations, environment changes, scheduled rollout, or production handoff requiring build and test evidence, configuration checks, compatibility review, migration safety, rollback planning, observability, and explicit residual risk.
---

# CCM Release Readiness

## Workflow

1. Identify the release unit, target environment, version boundary, dependencies, and change surface.
2. Verify required type, test, build, package, and runtime checks using current source and configuration.
3. Check environment variables, secrets references, feature flags, external services, and backward compatibility without exposing values.
4. Review data or configuration migrations for ordering, retry safety, partial failure, and rollback implications.
5. Define rollout, health signals, failure thresholds, and a feasible rollback or forward-fix path.
6. Return ready, blocked, or conditionally ready with evidence and named residual risks.

Read [references/release-checklist.md](references/release-checklist.md) for the handoff matrix.

Do not equate a successful build with release readiness.
