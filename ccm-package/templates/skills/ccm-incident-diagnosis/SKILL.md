---
name: ccm-incident-diagnosis
description: Diagnose and repair CCM errors, failed requests, broken builds, runtime regressions, configuration failures, and production incidents. Use when an Agent must reproduce the symptom, collect bounded evidence, isolate the failing layer, identify a supported root cause, implement a focused correction, and verify both recovery and a relevant negative case.
---

# CCM Incident Diagnosis

## Workflow

1. Restate the exact symptom, environment, trigger, expected behavior, and known recent changes.
2. Reproduce safely and capture the smallest useful error, status, log, request, or failing assertion.
3. Trace the failure across configuration, input normalization, transport, application logic, persistence, and presentation as relevant.
4. Form competing hypotheses and falsify them with current-source or runtime evidence.
5. Fix the supported root cause at the narrowest durable boundary; avoid masking the symptom with broad fallback behavior.
6. Re-run the reproduction, relevant regression checks, and one negative or boundary case.
7. Report root cause, correction, evidence, residual risk, and any operational follow-up.

Never expose credentials in logs or artifacts. Do not call an unverified hypothesis the root cause.
