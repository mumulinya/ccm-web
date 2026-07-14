---
name: ccm-acceptance-evidence
description: Collect criterion-linked CCM acceptance evidence. Use for tasks requiring tests, type checks, builds, API validation, browser flows, screenshots, responsive checks, or independent acceptance decisions.
---

# CCM Acceptance Evidence

## Evidence Workflow

1. Rewrite each acceptance criterion as an observable assertion without weakening it.
2. Select the narrowest real check that proves the assertion: command, API probe, browser interaction, screenshot, or persisted artifact.
3. Record the check identity, target, action, observed result, status, and artifact path where applicable.
4. Verify user-visible flows in a running product. A page load alone does not prove interaction behavior.
5. Preserve failures and blocked prerequisites exactly enough to reproduce, while redacting secrets and private session data.
6. Report uncovered criteria as incomplete. Never infer a pass from unrelated green checks.

Prefer concise evidence that another person or Agent can independently re-run.
