---
name: ccm-delivery-review-rework
description: Review CCM project Agent receipts against their work orders and the original acceptance criteria. Use when a group main Agent must distinguish completion from advice, detect missing changes or verification, reconcile dependencies and conflicts, decide whether TestAgent can run, and issue precise evidence-based rework.
---

# CCM Delivery Review and Rework

## Review

1. Map each assignment to its latest receipt and reject missing, stale, duplicated, or wrong-scope results.
2. Compare claimed actions and files with the assigned deliverable and required boundaries.
3. Check that every required verification was actually executed and that failures or skipped checks remain visible.
4. Reconcile dependent Agents against the same contract, field names, states, and versions.
5. Mark each acceptance criterion as proven, failed, blocked, or uncovered.

## Rework

- Continue the same Worker when the missing work is focused and its retained context is useful.
- Create a new route only when ownership or approach is wrong.
- Include the exact failed assertion, file, interface, observed evidence, expected outcome, and completion proof.
- Never send "continue based on your findings" or another context-dependent placeholder.

Hand work to TestAgent only after implementation receipts are sufficient. Do not convert dispatch, acknowledgements, suggestions, or green unrelated checks into completion.
