# Standalone TestAgent Completion Audit

## Original Scope

Build a standalone, business-separated TestAgent that can receive project context and runtime URLs from a future group-main-agent, operate a real browser to verify functionality, produce trustworthy evidence, and remain independent from current collaboration code.

## Requirement Evidence

### Standalone Module

- Source is isolated under `backend/test-agent` and split by work-order, providers, browser actions/assertions, evidence, contracts, artifacts, verdict, CLI, and self-tests.
- Public programmatic invocation and standalone CLI boundaries are both available.
- No group-chat collaboration source is required by TestAgent invocation.

### Main-Agent Handoff

- Handoff accepts original goal, acceptance criteria, completed tasks, project agents, project paths, commands, target/startup URLs, HTTP checks, browser checks, risks, and options.
- Handoff and work-order inputs have strict validators.
- Completed-task coverage aliases give explicit task-to-check evidence linkage.

### Real Functional Verification

- Playwright launches a real browser and executes navigation, forms, clicks, uploads/downloads, storage/cookies, dialogs/popups, keyboard/mouse, network state, responsive checks, accessibility checks, multi-session workflows, and stability runs.
- MCP adapters support Playwright MCP, Claude in Chrome, Chrome DevTools, and Computer Use capability families.
- Existing authenticated sessions and managed isolated authentication use distinct safety policies.

### Evidence Reliability

- Every planned browser check/run must produce attributable provider evidence or a synthetic blocked result.
- MCP tool calls are linked to exact check/run identities and have deadlines with AbortSignal support.
- Results and tool calls are tied to unique execution plan IDs and report time windows.
- Playwright browsers/contexts must be released; MCP sessions are explicitly external/retained.
- Report, verdict, manifest, browser artifacts, and semantic summaries are independently revalidated.
- Acceptance and adversarial gates prevent happy-path-only acceptance.

### Integration Result

- Invocation distinguishes input rejection, TestAgent runtime failure, completed verification, project outcome, recommendation, and `canAccept`.
- A future group-main-agent only needs to construct the handoff and consume the invocation result.
- Actual collaboration routing is intentionally deferred and was not modified.

## Final Verification Evidence

- `npm run check`: passed.
- Temporary backend compilation: passed.
- Final targeted matrix: 23/23 passed.
- Matrix includes handoff builder, standalone work-order CLI, standalone handoff CLI, programmatic invocation, real Playwright, MCP providers, authenticated sessions, mixed routing, multi-session, stability, contracts, artifacts, deadlines, lineage, temporal integrity, and resource cleanup.
- `git diff --check -- backend/test-agent docs/test-agent`: required before close-out.

## Completion Boundary

The standalone TestAgent is complete and ready for later wiring. Group-chat orchestration, message routing, task scheduling, and UI integration remain separate future work by design.
