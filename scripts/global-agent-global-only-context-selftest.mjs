import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const globalAgent = require(path.join(root, "ccm-package", "dist", "modules", "global", "global-agent.js"));
const loop = require(path.join(root, "ccm-package", "dist", "agents", "global", "loop.js"));
const reasoning = require(path.join(root, "ccm-package", "dist", "agents", "reasoning-loop.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupMessageSentinel = `PHASE268_GROUP_MESSAGE_${nonce}`;
const groupMemorySentinel = `PHASE268_GROUP_MEMORY_${nonce}`;
const projectMemorySentinel = `PHASE268_PROJECT_MEMORY_${nonce}`;
const ordinaryTaskSentinel = `PHASE268_ORDINARY_GROUP_TASK_${nonce}`;
const globalMemorySentinel = `PHASE268_GLOBAL_MEMORY_${nonce}`;
const globalTaskSentinel = `PHASE268_GLOBAL_TASK_${nonce}`;
const groupSessionId = `gcs_${Date.now().toString(36)}_phase268_private`;

function sealContext(context) {
  const payload = { ...context };
  delete payload.context_boundary_proof;
  context.context_boundary_proof = {
    schema: "ccm-global-agent-context-boundary-proof-v1",
    context_checksum: crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    generated_at: new Date().toISOString(),
  };
  return context;
}

function buildRun() {
  const reasoningLoop = reasoning.createAgentReasoningState({ goal: "继续全局路由任务" });
  reasoningLoop.fact_snapshots.push({
    id: "legacy-fact",
    source: "tool:inspect_project",
    hash: "legacy-hash",
    summary: `${groupMemorySentinel} ${projectMemorySentinel} ${groupSessionId}`,
    at: new Date().toISOString(),
  });
  return {
    version: 1,
    id: `phase268-run-${nonce}`,
    trace_id: `phase268-trace-${nonce}`,
    session_id: `phase268-global-session-${nonce}`,
    source: "phase268-restart-recovery-selftest",
    user_message: "继续全局路由任务",
    history: [],
    status: "running",
    phase: "investigate",
    explicit_write_authorization: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    deadline_at: new Date(Date.now() + 60_000).toISOString(),
    max_steps: 12,
    steps: [
      {
        index: 1,
        at: new Date().toISOString(),
        state: "investigate",
        message: projectMemorySentinel,
        plan: [],
        tool: { name: "inspect_project", arguments: { project: "api", group_session_id: groupSessionId }, risk: "read", signature: "inspect-project" },
        observation: {
          success: true,
          project: "api",
          config: { work_dir: "C:/workspace/api", agent: "codex", platform: "local" },
          memory: projectMemorySentinel,
          project_memory: { content: projectMemorySentinel },
          group_session_id: groupSessionId,
        },
      },
      {
        index: 2,
        at: new Date().toISOString(),
        state: "investigate",
        message: ordinaryTaskSentinel,
        plan: [],
        tool: { name: "list_tasks", arguments: {}, risk: "read", signature: "legacy-list-tasks" },
        observation: { success: true, tasks: [{ id: "ordinary-task", title: ordinaryTaskSentinel, status: "running", group_session_id: groupSessionId }] },
      },
      {
        index: 3,
        at: new Date().toISOString(),
        state: "investigate",
        message: "读取全局任务",
        plan: [],
        tool: { name: "list_tasks", arguments: {}, risk: "read", signature: "global-list-tasks" },
        observation: {
          success: true,
          tasks: [{ id: "global-task", title: globalTaskSentinel, status: "running", group_id: "group-alpha", target_project: "api" }],
          task_boundary: { schema: "ccm-global-agent-task-boundary-v1", policy: "global_agent_owned_tasks_only" },
        },
      },
      {
        index: 4,
        at: new Date().toISOString(),
        state: "investigate",
        message: groupMessageSentinel,
        plan: [],
        tool: { name: "inspect_mission", arguments: { id: "mission-global" }, risk: "read", signature: "inspect-mission" },
        observation: {
          success: true,
          id: "mission-global",
          status: "running",
          children: [{ task_id: "child-1", status: "running", group_session_id: groupSessionId, messages: [groupMessageSentinel], memory: groupMemorySentinel }],
          summary: `${groupMessageSentinel} ${groupMemorySentinel}`,
        },
        error: `${groupMessageSentinel} ${groupSessionId}`,
      },
    ],
    pending_tool: null,
    approved_tool_signatures: [],
    final_reply: "",
    error: "",
    resume_count: 1,
    model_calls: 0,
    tool_calls: 4,
    consecutive_failures: 0,
    client_effects: [],
    reasoning_loop: reasoningLoop,
  };
}

const context = sealContext(globalAgent.buildAgenticContext("", `phase268-global-session-${nonce}`, {
  groups: [
    { id: "group-alpha", name: "Alpha", members: [{ project: "api", agent: "codex" }] },
    { id: "group-beta", name: "Beta", members: [{ project: "web", agent: "cursor" }] },
  ],
  recordMemoryMetric: false,
}));
context.global_memory = `[全局 Agent 记忆] ${globalMemorySentinel}`;
sealContext(context);

const validation = globalAgent.verifyGlobalAgentContextBoundary(context);
assert.equal(validation.valid, true, JSON.stringify(validation));

const run = buildRun();
const messages = await loop.buildGlobalAgentModelMessages(run, {
  persist: false,
  getContext: () => context,
  verifyContextBoundary: candidate => globalAgent.verifyGlobalAgentContextBoundary(candidate),
  callModel: async () => ({ state: "complete", message: "done", tool: null }),
  executeTool: async () => ({ success: true }),
});
const rendered = JSON.stringify(messages);

const checks = {
  globalMemoryIncluded: rendered.includes(globalMemorySentinel),
  provenGlobalTaskIncluded: rendered.includes(globalTaskSentinel),
  routingDirectoryIncluded: rendered.includes("group-alpha") && rendered.includes("group-beta") && rendered.includes("api") && rendered.includes("web"),
  groupMessageExcluded: !rendered.includes(groupMessageSentinel),
  groupMemoryExcluded: !rendered.includes(groupMemorySentinel),
  projectMemoryExcluded: !rendered.includes(projectMemorySentinel),
  ordinaryGroupTaskExcluded: !rendered.includes(ordinaryTaskSentinel),
  groupSessionIdentityExcluded: !rendered.includes(groupSessionId) && !/\bgcs_[a-z0-9_-]+\b/i.test(rendered),
  recoveredRawEvidenceWasActuallyTainted: JSON.stringify(run).includes(groupMemorySentinel) && JSON.stringify(run).includes(projectMemorySentinel),
  reasoningFactsProjectedWithoutSummary: !rendered.includes("legacy-hash") || !rendered.includes(groupMemorySentinel),
};
assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));

const tampered = JSON.parse(JSON.stringify(context));
tampered.groups[0].group_session_id = groupSessionId;
sealContext(tampered);
const tamperedValidation = globalAgent.verifyGlobalAgentContextBoundary(tampered);
assert.equal(tamperedValidation.valid, false);
assert.ok(tamperedValidation.issues.includes("global_context_group_session_payload_present"));
assert.ok(tamperedValidation.issues.includes("global_context_group_session_identifier_present"));

let modelCalled = false;
await assert.rejects(
  () => loop.buildGlobalAgentModelMessages(buildRun(), {
    persist: false,
    getContext: () => tampered,
    verifyContextBoundary: candidate => globalAgent.verifyGlobalAgentContextBoundary(candidate),
    callModel: async () => { modelCalled = true; return { state: "complete", message: "unsafe", tool: null }; },
    executeTool: async () => ({ success: true }),
  }),
  /global agent model context boundary failed/,
);
assert.equal(modelCalled, false);

const checksumTampered = JSON.parse(JSON.stringify(context));
checksumTampered.global_memory += " tampered-without-reseal";
const checksumValidation = globalAgent.verifyGlobalAgentContextBoundary(checksumTampered);
assert.equal(checksumValidation.valid, false);
assert.ok(checksumValidation.issues.includes("global_context_boundary_checksum_invalid"));

process.stdout.write(`${JSON.stringify({
  pass: true,
  schema: "ccm-phase268-global-agent-global-only-context-selftest-v1",
  checks: { ...checks, tamperedContextRejected: true, checksumTamperRejected: true, modelCallBlockedBeforeUnsafePrompt: !modelCalled },
}, null, 2)}\n`);
