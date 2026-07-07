# Phase 22 - Claude Setting Source Memory Policy

## Goal

Move CCM closer to Claude Code's `settingSources` behavior so child Agent and global Agent memory context can deterministically include or suppress user, project, local, and managed Claude memory sources.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\settings\constants.ts`
  - `D:\claude-code\src\utils\settings\settings.ts`
  - `D:\claude-code\src\utils\claudemd.ts`
- Claude Code behavior mirrored:
  - `userSettings` gates user memory.
  - `projectSettings` gates project `CLAUDE.md` and `.claude/rules/*.md`.
  - `localSettings` gates `CLAUDE.local.md`.
  - `policySettings` and `flagSettings` are always enabled.
  - An empty setting source flag enters isolation mode for editable sources.

## Implementation

- Added `ccm-claude-memory-setting-source-policy-v1`.
- Added `buildClaudeMemorySettingSourcePolicy(options)`.
- Supported Claude-style `settingSources` inputs:
  - `"user,project,local"`
  - `"project"`
  - `"local"`
  - `""`
  - `["userSettings", "projectSettings"]`
- Project memory discovery now honors:
  - `projectSettings` for project `CLAUDE.md`, `.claude/CLAUDE.md`, and `.claude/rules/*.md`;
  - `localSettings` for `CLAUDE.local.md`.
- Global Claude memory discovery now honors:
  - `userSettings` for user Claude memory;
  - `policySettings` for managed Claude memory.
- Managed memory remains enabled in empty-source isolation mode, matching Claude Code's always-on policy source behavior.
- Existing explicit include flags still act as extra disables:
  - `includeUser: false`
  - `includeManaged: false`
  - `includeProject: false`
  - `includeLocal: false`
- Child Agent and global Agent rendered context now exposes active `setting sources` and isolation state.

## Selftests

- Added `runGroupClaudeMemorySettingSourcePolicySelfTest()`.
- The selftest verifies:
  - default policy enables user/project/local plus always-on managed/flag;
  - empty `settingSources` enters isolation mode but keeps managed memory;
  - project-only mode imports project memory but skips local memory;
  - local-only mode imports `CLAUDE.local.md` but skips project memory;
  - isolated project discovery skips both project and local memory;
  - isolated global import loads managed memory but not user memory;
  - typed recall sees the managed sentinel and not the skipped user sentinel.

## Operational Memory

- Use `settingSources: ""` to make a fresh child Agent session ignore user/project/local Claude memory while still receiving managed/policy memory.
- Use `settingSources: "project"` when a group wants checked-in project rules but not user or local preferences.
- Use `settingSources: "local"` when a trusted local private override should be the only project-root memory source.
- The policy is included in import results and rendered context, so future debugging can explain why a memory file was skipped.

## Still Open

- CCM still does not merge actual Claude settings JSON by source; this phase only controls memory source loading.
- First-class `InstructionsLoaded` hook execution remains future work.
- A UI/API still needs to expose setting source selection for real group dispatch workflows.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - full dist memory regression including `runGroupClaudeMemorySettingSourcePolicySelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
  "globalClaudeImport": true,
  "globalClaudeImportContext": true,
  "externalApproval": true,
  "settingSource": true,
  "reloadAudit": true,
  "distill": true,
  "distillQuality": true,
  "sourceManifest": true,
  "context": true,
  "globalContext": true,
  "warning": true,
  "preserved": true,
  "audit": true,
  "timeBased": true,
  "partial": true,
  "sidecar": true,
  "ptl": true,
  "recovery": true,
  "micro": true,
  "hook": true,
  "quality": true,
  "integration": true,
  "auto": true
}
```
