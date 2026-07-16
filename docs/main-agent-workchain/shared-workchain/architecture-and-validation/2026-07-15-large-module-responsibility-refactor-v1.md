# Large Module Responsibility Refactor V1

## Scope

This refactor reduces oversized main-agent modules by moving cohesive business responsibilities into named modules while preserving the existing public entry points.

The knowledge-base boundary is intentionally excluded. Files under `backend/modules/knowledge/` and the knowledge pages remain in their current structure. In particular, `backend/modules/knowledge/memory-control-center.ts` was not split. Group runtime memory under `backend/modules/collaboration/group-memory-*` is part of collaboration execution and is not the knowledge-base module.

## Results

| Compatibility entry | Before | After | Extracted responsibility |
| --- | ---: | ---: | --- |
| `backend/test-agent/self-test.ts` | 17,504 | 632 | Core, browser flows, browser assertions, and Playwright/CLI self-tests |
| `backend/modules/collaboration/group-orchestrator.ts` | 14,600 | 6,361 | Configuration, WorkerContext, replay repair, and protocol/provider/memory self-tests |
| `backend/modules/collaboration/collaboration.ts` | 31,947 | 19,708 | Routes, task intake/runtime/service, acceptance, TestAgent runtime, global missions, probes, and categorized self-tests |
| `backend/modules/collaboration/group-memory-index.ts` | 25,167 | 15,118 | Maintenance, distillation, loading, recall usage, and categorized self-tests |
| `frontend/src/components/global/GlobalAgent.vue` | 5,338 | 4,458 | Global execution-stream formatting and event projection |

The remaining entry files still own cross-cutting orchestration and state that is genuinely coupled. They were not split further merely to reduce line counts.

## Module Boundaries

### TestAgent

- `self-test-core.ts`: core contracts, work orders, artifacts, summaries, and HTTP planning checks.
- `self-test-browser-flows.ts`: browser acceptance flows and multi-session behavior.
- `self-test-browser-assertions.ts`: browser assertions, state, evidence, and advanced interaction checks.
- `self-test-playwright-cli.ts`: Playwright CLI, real-browser, upload, viewport, and standalone handoff checks.

### Group Orchestrator

- `group-orchestrator-config.ts`: persisted orchestrator configuration and normalization.
- `group-orchestrator-worker-context.ts`: WorkerContext budget gates, compaction, provider decisions, and related checks.
- `group-orchestrator-replay-repair.ts`: replay-repair files, plans, bindings, and worker packet helpers.
- `group-orchestrator-*-self-tests.ts`: protocol, memory, and provider validation suites.

### Collaboration Runtime

- `collaboration-routes.ts`: collaboration HTTP route registration.
- `collaboration-task-intake.ts`: task intent, plan mode, and project source analysis.
- `collaboration-task-runtime.ts` and `collaboration-task-service.ts`: queue/runtime lifecycle and task operations.
- `collaboration-acceptance.ts`: completion, evidence, review, and delivery gates.
- `collaboration-test-agent-runtime.ts`: TestAgent handoff, execution, and review integration.
- `collaboration-global-missions.ts`: global-to-group mission supervision and continuation.
- `collaboration-agent-probes.ts`: third-party Agent readiness and recovery probes.
- `collaboration-*-self-tests.ts`: UX, protocol, receipt, and coordination checks.

### Group Runtime Memory

- `group-memory-maintenance.ts`: maintenance, retention, cleanup, and repair lifecycle.
- `group-memory-distillation.ts`: typed-memory mutation and distillation.
- `group-memory-loading.ts`: load plans, includes, manifests, recall, and rendering.
- `group-memory-recall-usage.ts`: recall usage accounting and pressure summaries.
- `group-memory-*-self-tests.ts`: maintenance, distillation, and recall validation.

### Global Agent UI

- `frontend/src/utils/globalAgentExecutionStream.js`: Todo projection, tool summaries, TestAgent summaries, stream events, and user-visible execution state.
- `GlobalAgent.vue`: session ownership, user interaction, network calls, message composition, and component rendering.

## Compatibility Strategy

Existing imports continue to use the original entry files. Moved functions are exposed through small lazy `require()` wrappers so CommonJS module initialization does not eagerly create circular dependencies. Mutable timer state remains owned by the facade and is changed through explicit setters.

The runtime validation invokes representative functions from the compiled original entries, not from extracted modules directly. This verifies that the compatibility layer resolves to live functions after CommonJS initialization.

## UI State Corrections Found By Screenshot Regression

The real-render regression exposed and fixed three input-state issues in `GlobalAgent.vue`:

1. A waiting mission's explicit "submit and continue" state now takes precedence over the generic busy state.
2. Background supervision no longer occupies the current chat turn. Ordinary questions remain normal messages, while explicit goal revisions still update the supervised task.
3. Mid-turn task steering now writes the response to the active run message instead of overwriting a background supervision message.

Ordinary replies use a disabled "replying" state until execution intent is confirmed. Confirmed execution tasks expose "supplement request" or "queue" according to the selected turn-control mode.

## Verification

- `npm run check`: passed.
- `npm run build`: passed; Vite built 2,004 frontend modules and backend/MCP TypeScript output.
- Original-entry runtime checks: TestAgent normalization, coordinator protocol, WorkerContext gate, collaboration UX, collaboration protocol, and group-memory load plan all returned `pass: true`.
- `npm run test:render-regression`: passed with 38 Playwright screenshots, including ordinary conversation without Todo, multiline rendering, task Todo, folded technical details, TestAgent review, waiting-user continuation, mid-turn steering, code changes, and expanded child-Agent summary.

## Maintenance Rules

- Keep public entry imports stable unless a versioned migration is planned.
- Add new behavior to the responsibility module that owns it; do not grow the facade with another unrelated subsystem.
- Do not split `backend/modules/knowledge/` as part of this refactor.
- Do not create another module unless it owns a cohesive lifecycle, contract, or reusable user-facing projection.
- Run the original-entry runtime checks and render regression after changing facade wrappers or global conversation state.
