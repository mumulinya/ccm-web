---
name: ccm-interface-data-contract
description: Define and verify frontend, backend, API, event, and storage contracts for CCM development. Use when a task changes request or response fields, DTOs, schemas, persistence, events, migrations, validation, errors, permissions, pagination, or compatibility across modules.
---

# CCM Interface Data Contract

Make cross-layer data behavior explicit before implementation and verify that every producer and consumer follows the same contract.

## Workflow

1. Inspect the real producers, consumers, routes, schemas, generated types, and persistence code before proposing changes.
2. Define each field's name, type, required state, default, validation, ownership, sensitivity, and compatibility behavior.
3. Define endpoint or event behavior: method or event name, route, authentication, authorization, success response, errors, idempotency, pagination, and retry semantics.
4. Define storage behavior: constraints, indexes, transaction boundaries, migration, backfill, rollback, and retention where applicable.
5. Trace the contract to frontend, backend, worker, MCP, and database owners and identify the exact implementation and test surfaces.
6. Check old and new readers and writers. Use additive or versioned changes when compatibility requires it.
7. Report unresolved conflicts instead of silently choosing one side.

## Required Output

Provide a compact contract containing:

- endpoint or event definitions;
- field and error tables;
- authentication and authorization requirements;
- persistence and migration effects;
- compatibility and rollback rules;
- producer, consumer, file, and test ownership.

## Boundaries

- Real source and configuration are authoritative. Do not guess fields or model capabilities.
- Do not claim a migration or rollback is safe without reproducible evidence.
- Never expose secrets, credentials, private attachment contents, or unrelated scope data in a contract.
- Keep presentation-only changes out unless they alter the data contract.
