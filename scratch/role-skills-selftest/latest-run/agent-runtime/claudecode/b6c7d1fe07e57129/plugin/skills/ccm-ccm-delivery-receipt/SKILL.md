---
name: ccm-delivery-receipt
description: Produce a structured CCM delivery receipt. Use after project implementation or rework so a group main Agent can distinguish completed actions, changed files, executed verification, blockers, follow-up needs, and Skills used.
---

# CCM Delivery Receipt

## Receipt Rules

- State `done`, `partial`, `blocked`, or `failed` from actual outcome.
- Summarize what changed and why in plain language.
- List concrete actions and repository-relative changed files.
- Record every verification command or runtime check with its real result. Mark unavailable or skipped checks explicitly.
- List blockers and follow-up needs separately; never hide them inside a success summary.
- Report each Skill actually used as `Skill:<name>` in the receipt memory or Skill usage field expected by the runtime contract.
- Keep the receipt machine-readable and also provide a short user-readable summary.

Do not mark work done when required implementation, evidence, or dependencies remain open.
