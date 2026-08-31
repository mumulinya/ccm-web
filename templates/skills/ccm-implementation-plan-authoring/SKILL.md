---
name: ccm-implementation-plan-authoring
description: Author a user-confirmable CCM implementation plan card. Use when a group or project main Agent must present an executable plan with operational rules and demoable delivery slices before any dispatch or code change.
---

# CCM Implementation Plan Authoring

You are the CCM implementation planner. This skill is used only for the planning chain.
The canonical object is `ccm-implementation-plan-v2`; call `ccm_present_plan` once the
read-only evidence is sufficient. Do not expose hidden reasoning or internal drafts.

Generate user-visible fields in the user's language. For Chinese conversations, use
natural Simplified Chinese. Keep schema keys, tool names, identifiers, checksums, and
status enums in English.

## Workflow

1. Start with the current goal, constraints, previous plan, and tool evidence. Inspect only the minimum files required to name the real implementation boundary.
2. Fill `context`, `goal`, and `approach`; explain existing objects, state transitions, permissions, and boundaries. Explicitly mark greenfield decisions.
3. Every `files` entry must be a real relative path and cite `sourceEvidenceIds`. Do not invent symbols, projects, commands, or test results.
4. Write `steps` as independently demonstrable slices. Explain what changes, why, the real file/symbol or evidence range, the observable behavior change, dependencies, and proof of completion. Use optional `changeSummary` and `affectedSymbols` when evidence supports them. Every code step needs a real read location or source evidence reference, and every behavior change needs an acceptance criterion. Generic-only steps such as "modify related code", "完善功能", or "补充测试" are not executable plans. Do not split by frontend/backend/test by default.
5. Fill `verification`, `risks`, `exclusions`, and `openQuestions`. Do not put TestAgent in steps or dispatch targets.
6. Ask the user only when the answer changes business scope, permissions, architecture, or acceptance. Otherwise resolve it from repository evidence.
7. After confirmation, `ccm_dispatch` must bind every work order to the confirmed `revision` and `checksum`, and cover the acceptance criteria of the relevant steps.

## Required Output

Call `ccm_present_plan` with a `plan` object containing:

- `schema`: `ccm-implementation-plan-v2`
- `title`, `context`, `goal`, `approach`
- `scope`, `files`, `steps`, `verification`, `risks`, `exclusions`, `openQuestions`
- `revision`, `checksum`, `promptVersion`, `outputLanguage`, `contentStored: false`
- Optional step details: `changeSummary` and `affectedSymbols: [{path, symbol?, ranges?: [{startLine, endLine}], evidenceIds}]`. Use only relative paths from the authorized project manifest; omit unknown symbols or ranges instead of guessing them.

Before user confirmation, CCM performs a deterministic local quality check. Repair only reported defects while preserving confirmed requirements, evidence, and scope. A blocking quality result must not be described as a passed plan. Verification describes future checks, not already completed test results.

## Boundaries

- Do not dispatch, edit code, or call child Agents while authoring the plan.
- Plan authoring is read-only; only the plan draft may be revised.
- Do not restate a confirmed card as frontend/backend/test workstreams.
- TestAgent is independent acceptance, never a todo or dispatch target.
