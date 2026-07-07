# Marketplace Install/Uninstall E2E

## Background

Marketplace resources must not only normalize correctly. CCM also needs evidence that install and uninstall actions persist the expected central catalog files, expose installed resources to authorization, and clean up packages and installation records.

This update adds a file-backed, temporary-directory E2E self-test for marketplace install/uninstall.

## What Changed

`backend/modules/tools/marketplace.ts` now has an internal install store abstraction used by tests:

- Production install/uninstall still uses CCM's normal central directories and DB helpers.
- Self-tests pass a file-backed temporary store.
- The same internal install/uninstall path is exercised in both modes.

The Skill package staging, package installation, and package cleanup helpers now accept an optional Skill package root. Production defaults to `SKILL_PACKAGES_DIR`; tests use a temporary directory.

## Covered Flow

The new E2E self-test:

1. Creates a temporary MCP catalog directory.
2. Creates a temporary Skill catalog directory.
3. Creates a temporary Skill package directory.
4. Installs an MCP marketplace item.
5. Installs a Skill marketplace item.
6. Reads the persisted JSON records back from disk.
7. Builds authorization options from the installed records.
8. Uninstalls both resources.
9. Verifies catalog files, package files, and installation records are removed.

## Assertions

The self-test verifies:

- MCP JSON is persisted with marketplace provenance.
- Skill JSON is persisted with marketplace provenance.
- Skill package `SKILL.md` is installed under the managed package root.
- Installation records are persisted with stable keys.
- Installed MCP and Skill records reach `buildToolAuthorizationOptions(...)`.
- Authorization options hide command, env, and prompt fields.
- Uninstall removes MCP and Skill catalog files.
- Uninstall removes the managed Skill package.
- Uninstall removes installation records.
- Tool reload hooks are called for install and uninstall actions.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```

`npm run test:runtime-tools` now includes:

- `marketplace.marketplaceInstallE2E`
