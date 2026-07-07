# CCM Runtime Tool Fabric - Phase 1

Date: 2026-07-07

## Delivery Rule

Every CCM feature upgrade or behavior update must create or update a dedicated
folder under `docs/` and include a Markdown delivery record. The record must
cover scope, implementation, compatibility, verification, risks, and remaining
work. This rule is part of the long-running CCM MCP/Skill objective.

## Scope

This upgrade establishes one CCM-managed MCP and Skill delivery fabric for
project and group child agents. The effective grant is calculated by CCM,
materialized as an invocation-scoped authorization snapshot, and delivered to
Claude Code, Cursor Agent, and Codex CLI without exposing unrelated global
tools.

The same upgrade also adds an external marketplace lifecycle:

- discover
- trust/source display
- preview
- install
- update detection
- uninstall
- runtime synchronization after installation

## Baseline Findings

- Claude Code received strict MCP JSON, but its generated Skill directory was
  outside the CLI discovery path.
- Cursor received generated MCP/Skill files that were not consumed by the CLI.
- Codex used an isolated `CODEX_HOME`, but Skill discovery needed an explicit
  `.agents/skills` and config contract.
- The CCM proxy executed `<tool_call>` only after the child process exited. It
  appended results but never returned them to the agent.
- An explicit empty grant object was treated as allow-all by ToolManager.
- Marketplace records lacked package metadata, source trust, update state,
  package preservation, and uninstall lifecycle.
- The legacy filesystem MCP pointed at a missing Desktop directory.

## Implemented Runtime Delivery

### Effective authorization snapshot

- Group and project grants are merged into one effective allowlist.
- Each unique grant set produces an immutable snapshot ID.
- Snapshot metadata includes requested, synced, missing, permission rules,
  MCP status, Skill status, config paths, isolated homes, and plugin paths.
- Runtime snapshots do not write into the child project's normal global config.

### Claude Code

- Keeps `--mcp-config` plus `--strict-mcp-config`.
- Generates a session plugin with `.claude-plugin/plugin.json` and `skills/`.
- Loads the plugin using `--plugin-dir`.
- Plugin validation is available through the runtime readiness probe.

### Cursor Agent

- Generates `.cursor-plugin/plugin.json`, `.mcp.json`, and `skills/`.
- Launches with `--plugin-dir`, `--approve-mcps`, and `--trust`.
- Uses isolated `HOME`, `USERPROFILE`, `CURSOR_CONFIG_DIR`, and
  `CURSOR_DATA_DIR` so user-global MCP entries cannot leak into the invocation.

### Codex CLI

- Uses an isolated `HOME` and `CODEX_HOME`.
- Writes only authorized MCP servers to `config.toml`.
- Copies Skills to `.agents/skills`.
- Registers each copied `SKILL.md` through `[[skills.config]]`.
- Deep readiness checks run `codex mcp list` against the isolated home without
  invoking a model.

### Packaged Skills

- Marketplace Skill packages are preserved as directories instead of being
  flattened into a single prompt.
- Runtime synchronization copies the complete managed package, including
  scripts and referenced resources.
- Only packages inside CCM's managed Skill package root are eligible for
  automatic runtime copying.

## Iterative CCM Tool Loop

`backend/tools/tool-call-loop.ts` now provides the shared proxy loop used by:

- direct project Agent calls
- external Agent Runner calls
- group streaming calls
- project chat streaming calls

Behavior:

- parse authorized `<tool_call>` blocks
- execute through ToolManager
- return structured tool results to the same native session when available
- include the previous transcript when the runtime is stateless
- continue until a final response is produced
- stop after four rounds
- block identical repeated calls
- cap calls per round
- preserve authorization checks on every execution
- write bounded JSONL audit records without persisting raw tool arguments

External Runner continuation requests skip duplicate project verification while
the initial request retains normal verification.

## Authorization Fix

- `undefined` scope remains the administrative/unscoped behavior.
- An explicit scope with empty `mcp` and `skill` arrays now denies all tools.
- Tool prompt generation, Skill invocation, and MCP execution share this
  fail-closed behavior.
- Unauthorized MCP attempts are written to the permission audit.

## Runtime Readiness

New endpoint:

`GET /api/tools/runtime-readiness?deep=0|1`

The readiness model separates:

- `deliveryReady`: snapshot/config/plugin/Skill delivery is valid
- `runtimeReady`: the runtime CLI exists and starts
- `overallReady`: both layers pass

CLI availability/version probes are cached per command for 60 seconds. Snapshot
and deep configuration checks remain independent. In the current environment,
the readiness endpoint measured about 3.9 seconds cold and 0.27 seconds on the
next request.

The Tools screen now includes an `Agent runtime` view with:

- ready/delivery/CLI totals
- MCP and Skill synchronization counts
- snapshot ID
- runtime CLI version
- individual static and deep probe results

Legacy pre-snapshot audit rows remain visible as delivery failures. Re-running
the affected project or group creates a current snapshot and clears the
ambiguity instead of silently treating old files as healthy.

## Marketplace

Supported sources:

- CCM built-in catalog
- fixed CCM GitHub catalog
- Smithery
- custom HTTPS JSON catalog
- direct HTTPS `SKILL.md`
- GitHub repository, tree, or blob Skill source

Security and lifecycle controls:

- HTTPS-only remote access
- DNS resolution and private/loopback address rejection
- redirect, timeout, response-size, file-count, and package-size limits
- no symlinks in installed Skill packages
- atomic package replacement with rollback
- source trust and version metadata
- SHA-256 checksum
- install/update timestamps
- preview before installation
- install, update, and uninstall APIs
- protected MCP secrets and atomic registry writes

The built-in filesystem MCP now uses CCM's managed `shared` directory instead
of a potentially missing Desktop directory. The bundled Feishu MCP path is
resolved from the packaged runtime first, with development fallbacks.

The static web root now resolves both source and packaged layouts. The packaged
server serves `ccm-package/public` instead of the nonexistent
`ccm-package/dist/public`.

## Verification

Completed:

- Full TypeScript check passed after runtime loop, authorization, readiness,
  public-path, and UI integration changes.
- Backend build passed.
- Frontend production build passed.
- Runtime tool sync self-test passed.
- ToolManager self-test passed, including explicit empty-scope denial.
- Iterative tool loop self-test passed.
- Marketplace self-test passed.
- Dedicated `npm run test:runtime-tools` suite passed and covers runtime
  sessions, snapshot generation, fail-closed authorization, iterative tool
  continuation, and marketplace safety.
- Claude plugin validation passed.
- Cursor isolated runtime discovered both the authorized MCP and Skill.
- Codex isolated `mcp list` discovered only the CCM-authorized server.
- Six current Claude/Cursor/Codex snapshots passed deep runtime readiness.
- External `SKILL.md` discover, preview, install, runtime copy, and uninstall
  completed successfully using the OpenAI Skills repository.
- The built-in filesystem MCP was installed through the marketplace, connected
  successfully, and registered 14 tools.
- A real `filesystem-mcp/list_directory` call completed through the iterative
  proxy loop and the result was returned to the continuation.
- The same MCP call with an explicit empty grant was denied by CCM.
- The packaged server returned HTTP 200 for `/`, `/index.html`, and the runtime
  readiness API on port 3081.
- In-app browser desktop QA passed for the runtime readiness view, marketplace
  list, and preview modal.
- In-app browser mobile QA passed at `390x844`; marketplace filters, cards,
  labels, and actions fit without overlap.

Environment-specific observations:

- Claude Code version: `2.1.201`.
- Cursor Agent version: `2026.07.01-41b2de7`.
- Codex CLI version: `0.115.0`.
- A real Codex model prompt reached the authorized MCP startup stage, then the
  installed account rejected the configured standalone model. Runtime delivery
  and model/account readiness are therefore reported separately.
- The local validation server remains available on port 3081.

## Final Verification State

The transient concurrent TypeScript error observed during development is no
longer present. The final full backend build and the project-wide TypeScript
check both pass.

After rebuilding, the validation server was restarted from the packaged backend
on port 3081. The root page returns HTTP 200, all three managed MCP servers
connect, and the deep runtime-readiness endpoint reports six healthy current
snapshots. The other nine records in the `6/15` total are retained historical
audit snapshots rather than active runtime failures.

## Remaining Work

- Optionally fold `test:runtime-tools` into the main coordinator smoke suite
  after its existing compiled import paths are normalized.
- Continue expanding trusted marketplace sources and runtime-specific probes in
  later phases under the same long-running goal.
