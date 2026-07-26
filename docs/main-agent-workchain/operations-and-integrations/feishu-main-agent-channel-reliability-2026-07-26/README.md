# Feishu Main Agent Channel Reliability

## Confirmed Flow

Global conversation:

```text
Feishu -> cc-connect -> ACP adapter -> CCM Global Main Agent
       -> visible ACP terminal frame -> original Feishu conversation
```

Project conversation:

```text
Feishu -> cc-connect -> ACP adapter -> exact project session
       -> CCM Project Main Agent -> conversation answer or canonical task
```

The ACP adapter is transport only. It never creates a second main Agent and it
never dispatches a project message directly to the configured development Agent.

For a project development task, the Project Main Agent creates the durable task
and plan first, returns the task ID through the current ACP turn, and then runs
the development Agent and TestAgent in the background. The accepted final result
is appended to the exact project session and delivered through the bound Feishu
outbox.

## Turn Contract

- Provider calls retain the shared five-attempt, 180-second total retry budget.
- The ACP HTTP request has a 195-second default deadline.
- cc-connect `idle_timeout_mins` and `max_turn_time_mins` are both written at the
  TOML root and set to four minutes.
- `reset_on_idle_mins = 0` remains project-scoped.
- Every ACP prompt ends with visible text or a visible failure. The text update
  and `end_turn` response are flushed in one ordered stdout write.
- A task that may run longer than one turn detaches only after the canonical task
  and project-session binding exist.

## Runtime Ownership

Each global or project Feishu channel stores an immutable runtime manifest under
`channel-runtime/`. It binds the launcher PID to:

- adapter SHA-256;
- effective private-runtime configuration SHA-256;
- CCM endpoint port;
- global/project scope and exact project ID.

A live PID is insufficient. Startup and the 30-second supervisor cycle verify the
manifest, endpoint, build fingerprint, and process command line. A stale owned
process is recycled. A process whose ownership cannot be proven is not killed and
a duplicate channel is not started.

Explicit project disconnects create a disabled marker, so the supervisor does not
undo the user's choice. Unexpected process loss retains the manifest and is
eligible for supervised restart.

## Failure Policy

- Empty model or main-Agent output fails closed with a visible reply.
- Timeout aborts the exact HTTP request and completes the ACP turn; later queued
  messages are no longer held for the historical two-hour default.
- Background project-task completion and failure use the durable Feishu outbox
  with dedupe keys and up to five delivery attempts.
- Missing scope/session binding prevents cross-session delivery.
- Long project work is never reported as completed before TestAgent and Project
  Main Agent acceptance.

## Verification

Completed without paid Provider calls:

- backend and MCP TypeScript checks;
- frontend, MCP, and backend production builds;
- Feishu integration domain: 12/12 scripts passed;
- global timeout and terminal-frame regression;
- two consecutive project ACP turns with no empty response;
- project task detach, exact binding, final transcript write, and outbox contract;
- live runtime manifest, PID, adapter hash, endpoint, and WebSocket readiness
  inspection for the global channel and `smart-live-Cloud` project channel.

Real user-message acceptance still requires sending a new message from Feishu;
automated verification used local mock Provider responses and made zero paid calls.
