# TestAgent Adversarial Evidence Relevance Gate

## Goal

This milestone closes a gap in the required adversarial evidence gate:

- A successful but unrelated adversarial probe must not authorize acceptance.
- At least one passed adversarial HTTP or browser probe must be linked to the original user goal or an acceptance criterion.
- Any adversarial failure still routes the delivery to rework, even when the failed probe is unlinked.
- Browser or HTTP environment blocking remains an environment limitation.

The work is isolated to `backend/test-agent/**` and `docs/test-agent/**`. This milestone did not edit the collaboration module.

## Linkage Rules

TestAgent evaluates linkage from probe definition data only. Response bodies, page text, and assertion output are not used to infer relevance.

Priority:

1. Explicit linkage through `coversAcceptanceCriteria`, `covers_acceptance_criteria`, `acceptanceCriteria`, or `acceptance_criteria`.
2. Conservative lexical inference from probe name, probe type, target URL, adversarial intent, original goal, and acceptance criteria.
3. `none` when no reliable link exists.

An explicit criterion must exactly match a criterion in the work order after basic normalization. If a probe explicitly names an unknown criterion, TestAgent returns `relevance=none` and does not fall back to lexical inference.

## Gate Outcomes

| Evidence | Adversarial summary | Delivery effect |
| --- | --- | --- |
| Relevant probe passed | `verified` | Can accept when all other gates pass |
| Probes passed but all are unrelated | `unlinked` | `partial`, `need_human`, cannot accept |
| Any adversarial probe failed | `failed` | `failed`, `rework` |
| Probe blocked by environment | `blocked` | Blocked/partial environment outcome |
| No probe evidence | `missing` | `partial`, cannot accept |
| Requirement disabled with a reason | `waived` | Can accept when all other gates pass |

## Report Evidence

`adversarialEvidenceSummary` now records:

- `relevant`
- `unlinked`
- `passedRelevant`
- `goalLinked`
- `criteriaCovered`
- Per-item `relevance`, `linkedCriteria`, `goalLinked`, and `matchScore`

The report also persists `originalUserGoal` and `acceptanceCriteria`. The artifact manifest repeats those fields so the artifact verifier can reject provenance changes.

The verdict includes:

- `adversarialRelevant`
- `adversarialUnlinked`
- `adversarialPassedRelevant`

## Execution Plan

The dry-run execution plan now exposes:

- `adversarialProbeCount`
- `adversarialLinkedProbeCount`
- `adversarialUnlinkedProbeCount`

When adversarial evidence is required and every configured probe is unlinked, the plan emits:

```text
unlinked_adversarial_probe_plan
```

This lets the project main Agent correct the handoff before starting a browser or dev server.

## Handoff Example

```json
{
  "originalUserGoal": "Invalid login must remain on the login page.",
  "acceptanceCriteria": [
    "An invalid login shows Invalid password and stays on /login."
  ],
  "projects": [
    {
      "name": "web-app",
      "workDir": "C:\\path\\to\\web-app",
      "targetUrl": "http://127.0.0.1:5173",
      "adversarialBrowserChecks": [
        {
          "name": "Invalid login browser flow",
          "probeType": "invalid_form_input",
          "coversAcceptanceCriteria": [
            "An invalid login shows Invalid password and stays on /login."
          ],
          "url": "http://127.0.0.1:5173/login",
          "actions": [
            { "type": "fill", "label": "Email", "value": "bad@example.test" },
            { "type": "fill", "label": "Password", "value": "wrong-password" },
            { "type": "click", "role": "button", "name": "Sign in" }
          ],
          "assertions": [
            { "type": "text", "text": "Invalid password" },
            { "type": "urlIncludes", "text": "/login" },
            { "type": "consoleNoErrors" }
          ]
        }
      ]
    }
  ]
}
```

Acceptance-derived browser flows already put their source criterion in `context.acceptanceCriteria`, so generated invalid-form flows are treated as explicit linkage.

## Integrity Protection

The artifact verifier rebuilds adversarial relevance from:

- Report `originalUserGoal`
- Report `acceptanceCriteria`
- HTTP/browser result definitions and context

It rejects changes to relevance status, linked criteria, match score, counters, waiver reason, or verdict counters even if the report file hash in the manifest is refreshed.

## Verification

Completed checks:

- Full `npm run check`.
- Dedicated adversarial evidence gate self-test.
- Relevant inferred HTTP probe acceptance.
- Explicit browser probe acceptance.
- Goal-only inferred linkage.
- Unrelated passing probe rejection.
- Unknown explicit criterion rejection.
- Missing, failed, blocked, and waived gate behavior.
- Summary, relevance, and waiver tamper detection.
- Report and verdict contract validation.
- Execution-plan linked/unlinked counters and warning.
- Fourteen key TestAgent regressions passed, including real Playwright invalid-form and repeated-click flows, MCP browser probes, multi-session browser execution, action-effect evidence, contracts, CLI, verdicts, manifests, and artifact verification.
