# Browser Network Required Coverage

## Summary

Tightened required-check coverage for browser network verification. A generic passing browser check no longer proves `browser_network`; TestAgent now requires browser network assertions, network telemetry, or a network log artifact.

## Added

- New dedicated coverage signal for:
  - `browser_network`
  - `browser_request`
  - `browser_requests`
  - `browser_response`
  - `browser_responses`
  - `network_assertion`
  - `network_assertions`
- Existing `browser_network_logs` and `network_log` coverage still use network log artifact evidence.
- `runTestAgentRequiredCheckCoverageSelfTest` now covers generic browser evidence, passing network evidence, and failed network assertion evidence.

## Behavior

- `browser_e2e` can be verified by a passing browser check.
- `browser_network` requires one of:
  - a passing `networkRequest` / `networkResponse` / negative network assertion step,
  - a passing `networkNoErrors` step,
  - recorded browser network telemetry or a network log path.
- A failed network assertion or recorded browser network error marks `browser_network` as `not_verified`.
- A browser check with only text/URL/visibility assertions leaves `browser_network` as `unknown`.

This prevents TestAgent from accepting API/network requirements based only on unrelated UI evidence.

## Verification

- Extended `runTestAgentRequiredCheckCoverageSelfTest`.
- The self-test verifies:
  - generic browser evidence verifies `browser_e2e`,
  - generic browser evidence does not verify `browser_network`,
  - network assertion steps verify `browser_network`,
  - network log paths verify `browser_network_logs`,
  - failed network assertion steps mark `browser_network` as `not_verified`.
