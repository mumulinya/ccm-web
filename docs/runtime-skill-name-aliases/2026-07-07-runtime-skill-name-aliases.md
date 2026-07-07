# Runtime Skill Name Aliases

## Background

CCM authorizes Skills by their catalog name, such as `release-notes`.

Some child-agent runtimes expose the same Skill through runtime-specific names:

- Claude Code plugin Skills are loaded as plugin commands, for example `ccm-runtime-<snapshot>:ccm-release-notes`.
- Cursor plugin Skills use the same session plugin directory shape.
- Codex receives Skill paths through `config.toml`; the runtime directory name can differ from the CCM catalog name.

Without an explicit mapping, runtime sync can succeed while an agent has to infer the native invocation name from implementation details.

## What Changed

`backend/tools/runtime-tool-sync.ts` now records Skill alias metadata in every synced `skill_statuses` entry:

- `runtimeDirectory`: the managed Skill directory copied into the runtime.
- `nativeSkillNames`: runtime-native names that may be visible to the child-agent CLI.
- `invocationAliases`: accepted names and aliases that map back to the CCM-authorized Skill.

For Claude Code and Cursor session plugins, the alias list includes the plugin-qualified native name:

```text
ccm-runtime-<snapshot>:ccm-<skill-name>
```

The runtime sync prompt now includes a compact `Skill 调用名映射` note so child agents can see both the CCM name and the runtime-native alias.

## Permission Boundary

The alias metadata does not expand authorization.

Authorization still uses the original CCM `allowedTools.skill` grant, and ToolManager still rejects unlisted Skills. The alias fields are only discovery and audit metadata for the already-synced Skill.

## Test Coverage

`npm run test:runtime-tools` now verifies:

- Codex Skill statuses persist the managed runtime directory alias.
- Claude Code Skill statuses persist the plugin-qualified native name.
- Claude Code invocation aliases include both raw and slash-style native names.
- The runtime sync prompt includes the Skill alias mapping.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```
