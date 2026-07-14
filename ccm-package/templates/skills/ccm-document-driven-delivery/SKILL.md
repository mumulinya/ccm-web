---
name: ccm-document-driven-delivery
description: Implement and verify CCM work backed by a PRD, business document, API specification, image, attachment, or extracted online document. Use when every relevant document clause must be traced to project changes, confirmed existing behavior, explicit exclusions, or criterion-linked verification evidence.
---

# CCM Document Driven Delivery

## Workflow

1. Build a clause matrix from the supplied requirement intake before editing.
2. Map each clause to an owning project, implementation location, dependency, and verification method.
3. Preserve exact contracts for fields, routes, states, validation, permissions, errors, and UI behavior.
4. Mark clauses as implemented, already satisfied, excluded by scope, blocked, or awaiting a decision.
5. Verify the implemented behavior against the source clause, not a weaker interpretation.
6. Return clause coverage and source references in the delivery receipt.

Read [references/clause-matrix.md](references/clause-matrix.md) for the traceability format.

Do not silently omit document rows or invent a contract where the source is ambiguous.
