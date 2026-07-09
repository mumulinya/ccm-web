# Self-Test Matrix Runner

## Summary

Added a child-process self-test matrix runner for standalone TestAgent. This makes the growing TestAgent browser/self-test suite easier to run reliably because each self-test executes in its own Node process with an explicit timeout and structured result.

## Added

- New business helper file:
  - `backend/test-agent/self-test-matrix.ts`
- New exported APIs:
  - `discoverTestAgentSelfTests`
  - `runTestAgentSelfTestMatrix`
  - `formatTestAgentSelfTestMatrixSummary`
- New self-test:
  - `runTestAgentSelfTestMatrixSelfTest`
- Added `self_test_matrix_runner` to the TestAgent capability profile.

## Behavior

The runner:

- discovers exported functions matching `runTestAgent*SelfTest`,
- runs each selected self-test in a fresh child process,
- applies a per-test timeout,
- forces the child process to exit after pass/fail/timeout,
- captures stdout/stderr tails for debugging,
- supports `names`, `pattern`, and `stopOnFailure`,
- returns a structured report with total, passed, failed, duration, and per-test details.

This avoids the failure mode where a slow browser self-test or leftover runtime handle keeps the whole matrix process alive until the outer shell times out.

## Example

```js
const {
  runTestAgentSelfTestMatrix,
  formatTestAgentSelfTestMatrixSummary,
} = require("./test-agent");

(async () => {
  const report = await runTestAgentSelfTestMatrix({
    timeoutMs: 180000,
    stopOnFailure: false,
  });
  console.log(formatTestAgentSelfTestMatrixSummary(report));
  process.exit(report.pass ? 0 : 1);
})();
```

## Verification

- Added `runTestAgentSelfTestMatrixSelfTest`.
- The self-test uses a fake self-test module to verify:
  - discovery only returns `runTestAgent*SelfTest` exports,
  - passing tests are recorded as passed,
  - failing tests are recorded as failed without stopping when `stopOnFailure` is false,
  - hanging tests are converted into timeout failures,
  - formatted summaries include pass/fail lines.
