# Programmatic TestAgent Invocation Contract

## Purpose

This contract is the future integration boundary between a group-main-agent and the standalone TestAgent. No collaboration module is wired in this milestone.

## API

Public exports from `backend/test-agent/index.ts`:

```ts
invokeTestAgent(request, runtime?)
invokeTestAgentHandoff(handoff, runtime?)
invokeTestAgentWorkOrder(workOrder, runtime?)
```

Request schema: `ccm-test-agent-invocation-request-v1`

```json
{
  "schema": "ccm-test-agent-invocation-request-v1",
  "source": "handoff",
  "payload": {
    "taskId": "task-123",
    "groupId": "group-123",
    "originalUserGoal": "Ship and verify the web feature",
    "acceptanceCriteria": ["Saved item remains visible after refresh"],
    "completedByProjectAgents": ["frontend-agent", "api-agent"],
    "projects": [{
      "name": "web",
      "workDir": "C:/project",
      "targetUrl": "http://127.0.0.1:3000",
      "browserChecks": []
    }]
  }
}
```

The runtime argument may provide a browser tool executor for MCP, or select Playwright through `browserProvider`.

## Result Semantics

Result schema: `ccm-test-agent-invocation-result-v1`

- `status=completed`: TestAgent executed and produced contract-valid report, verdict, and verified artifacts. The tested project may still have failed or been blocked.
- `status=rejected`: request envelope, handoff, or work-order input was invalid. No project checks ran.
- `status=runtime_error`: TestAgent itself could not produce trustworthy output.
- `outcome`: the project verification status (`passed`, `failed`, `partial`, or `blocked`).
- `canAccept`: the only direct machine decision for delivery acceptance. It must match `verdict.canAccept`.

Callers must not treat `status=completed` as project acceptance. They must require `canAccept=true`.

## Completed Task Coverage

The handoff builder turns each `completedTasks` entry into an independent acceptance criterion. A project check can explicitly cover that criterion by putting the original task text in `coversAcceptanceCriteria`; the builder resolves it to the generated criterion.

```json
{
  "completedTasks": ["Task creation persists after refresh"],
  "browserChecks": [{
    "name": "Task persistence flow",
    "coversAcceptanceCriteria": ["Task creation persists after refresh"]
  }]
}
```

This avoids fuzzy matching and does not automatically claim that every check verifies every completed task.

## Output Guarantees

A completed invocation includes:

- validated TestAgent report and verdict
- artifact manifest semantic verification
- browser execution coverage and run provenance
- browser tool-call lineage and deadlines
- temporal integrity
- resource lifecycle cleanup evidence
- exact artifact paths for later retention or inspection

## Verification

`runTestAgentInvocationSelfTest()` verifies real Playwright acceptance, functional failure, environmental blocking, invalid envelope rejection, invalid handoff rejection, output contracts, verdicts, and artifact verification.
