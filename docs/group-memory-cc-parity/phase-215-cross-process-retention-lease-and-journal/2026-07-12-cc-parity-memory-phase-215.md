# Phase 215: Cross-process retention lease and journal

## Goal

Prevent duplicate session-retention maintenance when multiple CCM processes use the same `.cc-connect` data directory on different ports.

## Lease protocol

All scheduled and manual retention runs acquire the same filesystem lease before reading candidates or deleting artifacts.

Lease file:

`memory-control/group-session-retention-maintenance.lease.json`

Protocol properties:

- atomic acquisition with `openSync(..., "wx+")`
- owner PID, hostname, and instance id
- lease id and checksum
- five-minute default TTL
- fencing token
- recovery count
- renewal after every processed group
- released terminal state
- expired or dead local owner recovery
- abandoned lease archival before takeover

If another process owns an active lease, the contender returns `lease_busy` with zero groups, candidates, and deletions. It never enters the prune path.

## Fencing and recovery

Each takeover increments `fencingToken`. An expired active lease increments both the fencing token and recovery count. A runner that loses ownership while iterating groups stops with `maintenance lease lost while processing groups` instead of continuing to delete.

## Journal

Every completed, failed, or skipped run appends one terminal record to:

`memory-control/group-session-retention-maintenance.jsonl`

The journal records trigger, dry-run state, counts, error, lease id, fencing token, recovery state, owner PID, and owner hostname.

## Memory Center

The retention status line now shows:

- latest run time
- candidate count
- deletion count
- fencing token
- lease owner PID

This makes it possible to distinguish the process that actually executed maintenance from a contender that skipped.

## Verification

- TypeScript full check: passed.
- Backend production build: passed.
- Frontend production build: passed.
- Lease and scheduler self-test: `8/8` passed.
- Real two-process race test: `4/4` passed.
- First process held the lease while sleeping in prune.
- Second process returned `lease_busy` and processed zero groups.
- Both processes reported the same owner lease id.
- Expired lease recovery advanced the fencing token.
- Two real API previews advanced the main lease fencing token from `1` to `2`.
- Journal terminal record lease id matched the API status lease id.
- Browser rendered `租约 #2 / PID 7708` with no console errors.

## Next parity work

The long-term goal remains active. Next work should add trustworthy provider capability cache ingestion and expiry, then use that cache for per-provider compaction budgets without guessing unknown model windows.
