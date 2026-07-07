# Marketplace Package-Backed Skill Runtime Sync

## Background

Marketplace-installed Skills are not always simple prompt records. GitHub and external Skill packages can include a full directory with `SKILL.md` and supporting files.

Runtime sync must preserve that package shape when delivering authorized Skills to child agents.

## What Changed

`backend/tools/runtime-tool-sync.ts` now allows the internal runtime sync self-test catalog to specify a temporary Skill package root.

Production behavior remains unchanged:

- CCM still trusts package-backed Skills only when `packagePath` is inside `SKILL_PACKAGES_DIR`.
- Runtime sync still copies the full Skill package into the invocation-scoped child-agent runtime.

The self-test can now use a temporary package root, so it can verify package copying without writing to the user's real `~/.cc-connect/skill-packages`.

## Covered Flow

The runtime sync integration self-test now creates:

- A prompt-backed Skill: `release-notes`
- A package-backed marketplace Skill: `market-package-skill`
- A package file: `market-package-skill/SKILL.md`
- A support file: `market-package-skill/references/guide.md`

It then syncs a Codex child-agent runtime and verifies:

- The package-backed Skill is copied into the isolated Codex Skill root.
- The copied `SKILL.md` comes from the package, not from fallback prompt text.
- Supporting package files are preserved.
- Codex `config.toml` registers the copied package Skill path.
- The runtime snapshot records the package-backed Skill source path.

## Why It Matters

This closes the marketplace-to-runtime package path:

1. Marketplace installs full Skill packages into the central CCM catalog.
2. Group/project authorization selects the installed Skill.
3. Runtime sync receives the package-backed Skill record.
4. Child-agent runtime gets the complete Skill package, not only a flattened prompt.

This is required for external Skill packages that rely on references, scripts, assets, or other files next to `SKILL.md`.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```

`npm run test:runtime-tools` now verifies package-backed Skill runtime sync through the expanded `runtimeSync.runtimeSyncIntegration` check.
