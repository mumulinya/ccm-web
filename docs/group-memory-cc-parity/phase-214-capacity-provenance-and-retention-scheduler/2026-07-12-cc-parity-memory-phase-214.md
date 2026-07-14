# Phase 214: Capacity provenance and retention scheduler

## Goal

Turn Phase 213 retention policy into a safe long-running service and expose the model capacity calculation as runtime evidence instead of opaque configuration.

## Capacity provenance

`GET /api/groups/memory/capacity` returns `ccm-group-memory-capacity-status-v1` with:

- model name
- capacity source
- context window
- reported model max output
- reserved compact-summary output
- effective context window
- auto-compact buffer
- configured threshold override
- final effective auto-compact threshold

Default runtime evidence:

- source: `cc_default_200k`
- context window: `200,000`
- compact-summary reserve: `20,000`
- effective context window: `180,000`
- auto-compact trigger: `167,000`

An explicit user setting or provider capability reports `configured_or_provider_capability` instead. This keeps unknown OpenAI-compatible models conservative rather than guessing a larger window.

## Retention scheduler

The scheduler follows the server singleton lifecycle:

- starts only after the HTTP port is successfully bound
- stops on server close
- defaults to disabled
- reloads immediately when retention scheduler settings are saved
- delays the first enabled run by 60 seconds
- runs at the configured interval afterward
- writes a persistent status ledger to `memory-control/group-session-retention-maintenance.json`

Configuration:

- `groupSessionAutoPruneEnabled`, default `false`
- `groupSessionRetentionIntervalHours`, default `24`
- `groupSessionRetentionDays`, default `30`
- `groupSessionMaxArchived`, default `20`

When disabled, startup records `auto_prune_disabled` and performs no deletion. When enabled, the scheduler immediately records an auditable scheduled state before its delayed first run.

## Safety

- Scheduler candidates are archived sessions only.
- Active sessions are never candidates.
- Sessions with unfinished tasks fail the deletion gate.
- Manual preview is always dry-run.
- Manual actual cleanup requires `explicitExecution=true`; missing confirmation returns HTTP `400`.
- Each deleted transcript is followed by session memory artifact cleanup.

API:

- `GET /api/groups/sessions/maintenance`
- `POST /api/groups/sessions/maintenance`

## Memory Center

The capacity panel now shows live values for source, model window, output reserve, effective window, and compact trigger. It also provides:

- auto-prune toggle
- maintenance interval
- retention days
- maximum archived sessions
- dry-run preview command
- explicitly confirmed execution command
- last run, candidate, and deletion summary

## Verification

- TypeScript full check: passed.
- Frontend production build: passed.
- Capacity and session regression: `19/19` passed.
- Retention scheduler self-test: `4/4` passed.
- Capacity API returned `200K / 20K / 180K / 167K` with `cc_default_200k` provenance.
- Maintenance API default state: disabled.
- Manual preview: dry-run true.
- Unconfirmed destructive execution: HTTP `400`.
- Browser rendered all five capacity proof values and all four retention controls.
- Browser console errors: none.

## Next parity work

The long-term goal remains active. The next phase should add provider capability cache ingestion where providers expose trustworthy metadata, scheduler run leases for multi-process deployments beyond the existing port singleton, and retention history trend reporting in Memory Center.
