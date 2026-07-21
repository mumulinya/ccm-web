import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-third-party-memory-mcp-"));
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const { McpClient } = require(path.join(root, "ccm-package", "dist", "tools", "mcp-client.js"));
const snapshotModule = require(path.join(root, "ccm-package", "dist", "integrations", "third-party-memory-snapshot.js"));
const { buildProjectSessionBoundMemoryMcpServer } = require(path.join(root, "ccm-package", "dist", "integrations", "agent-internal-mcp.js"));
const receiptModule = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const { buildFinalWorkerDispatchPayloadGate } = require(path.join(root, "ccm-package", "dist", "agents", "final-dispatch-payload-gate.js"));
const { syncRuntimeToolsWithCatalog } = require(path.join(root, "ccm-package", "dist", "tools", "runtime-tool-sync.js"));
const { hashValue } = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions-shared-part-01.js"));
const { extractGroupSessionMemoryBinding } = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions-shared-part-02.js"));

const project = "memory-mcp-project";
const projectSessionId = "s1";
const workDir = path.join(home, "workspace");
fs.mkdirSync(workDir, { recursive: true });

const messages = Array.from({ length: 16 }, (_, index) => ({
  id: `msg_${index}`,
  role: index % 2 ? "assistant" : "user",
  content: index === 0
    ? `OLDEST_REQUIRED_CONTEXT ${"早期约束".repeat(180)}`
    : `项目会话消息 ${index} ${"完整对话轮次".repeat(90)}`,
}));

function createSnapshot(extra = {}) {
  return snapshotModule.createThirdPartyMemorySnapshot({
    bindingKind: "project_session",
    role: "project-agent",
    project,
    projectSessionId,
    provider: "codex",
    nativeGeneration: 1,
    boundaryGeneration: 0,
    mode: "precompact_full_raw",
    messages,
    memoryItems: [{ id: "project_required", kind: "project_memory", source: project, required: true, content: "必须运行 npm test，禁止修改生产密钥。" }],
    pageTokens: 1000,
    modelContextWindow: 200000,
    autoCompactThreshold: 167000,
    requestText: "继续实现记忆 MCP",
    ...extra,
  });
}

function buildServer(snapshot) {
  const challenge = receiptModule.createMemoryContextConsumptionChallenge({
    project,
    executionId: `${project}:${projectSessionId}`,
    attempt: snapshot.nativeGeneration || 1,
  });
  const servers = buildProjectSessionBoundMemoryMcpServer({
    project,
    projectSessionId,
    agentType: "codex",
    workDir,
    memoryReceiptChallenge: challenge,
    memoryReceiptFile: receiptModule.memoryContextConsumptionReceiptFile(challenge.challenge_id),
    memorySnapshotId: snapshot.id,
    memorySnapshotChecksum: snapshot.checksum,
    boundaryGeneration: snapshot.boundaryGeneration,
    nativeGeneration: snapshot.nativeGeneration,
    requestText: "继续实现记忆 MCP",
    memoryReadBudgetTokens: 167000,
  });
  return { config: servers.ccm__knowledge_context, challenge };
}

async function connect(config) {
  const client = new McpClient(config.command, config.args, config.env);
  assert.equal(await client.connect(), true, JSON.stringify(client.getDiagnostics()));
  return client;
}

async function call(client, name, args = {}) {
  const result = await client.callTool(name, args);
  return { raw: result, body: JSON.parse(result.content?.[0]?.text || "{}") };
}

const clients = [];
try {
  const first = createSnapshot();
  assert.equal(first.deliveryMode, "full");
  assert.equal(first.mode, "precompact_full_raw");
  assert.ok(first.requiredSegmentIds.length > 1);
  const firstServer = buildServer(first);
  for (const runtime of ["codex", "claudecode", "cursor"]) {
    const audit = syncRuntimeToolsWithCatalog(workDir, runtime, { mcp: [], skill: [] }, {}, {
      internalMcpServers: { ccm__knowledge_context: firstServer.config },
    });
    assert.equal(audit.internal_mcp.some(row => row.name === "ccm__knowledge_context" && row.state === "synced"), true, `${runtime} memory MCP not synced`);
  }
  const client = await connect(firstServer.config); clients.push(client);
  const tools = (await client.listTools()).map(tool => tool.name);
  for (const name of ["get_context_manifest", "read_session_context", "search_memory", "read_memory_items", "report_memory_usage", "acknowledge_memory_context"]) {
    assert.equal(tools.includes(name), true, `missing ${name}`);
  }

  const premature = await call(client, "acknowledge_memory_context", {
    challenge_id: firstServer.challenge.challenge_id,
    snapshot_id: first.id,
    snapshot_checksum: first.checksum,
  });
  assert.equal(premature.raw.isError, true);
  assert.match(premature.body.error, /必需记忆尚未读取完成/);

  const manifestResult = await call(client, "get_context_manifest");
  assert.equal(manifestResult.body.manifest.snapshotId, first.id);
  assert.equal(manifestResult.body.manifest.requiredSegmentIds.length, first.requiredSegmentIds.length);
  let cursor = 0;
  let allContent = "";
  while (cursor !== null) {
    const page = await call(client, "read_session_context", { view: "continuity", cursor, max_tokens: 2000 });
    assert.notEqual(page.raw.isError, true, page.body.error);
    allContent += JSON.stringify(page.body.segments);
    cursor = page.body.nextCursor;
  }
  assert.match(allContent, /OLDEST_REQUIRED_CONTEXT/);
  const memory = await call(client, "read_memory_items", { ids: first.requiredMemoryItemIds });
  assert.notEqual(memory.raw.isError, true, memory.body.error);
  assert.match(JSON.stringify(memory.body.items), /禁止修改生产密钥/);

  const acknowledged = await call(client, "acknowledge_memory_context", {
    challenge_id: firstServer.challenge.challenge_id,
    snapshot_id: first.id,
    snapshot_checksum: first.checksum,
  });
  assert.notEqual(acknowledged.raw.isError, true, acknowledged.body.error);
  assert.equal(acknowledged.body.state, "loaded");

  const usageRoot = path.join(home, ".cc-connect", "project-memory");
  const beforeUsage = fs.existsSync(usageRoot) ? fs.readdirSync(usageRoot).length : 0;
  const usage = await call(client, "report_memory_usage", {
    snapshot_id: first.id,
    snapshot_checksum: first.checksum,
    usedIds: first.requiredMemoryItemIds,
    candidateUpdates: [
      { kind: "decision", content: "继续使用签名 MCP 快照", sourceMessageIds: ["msg_0"], evidence: ["npm test"] },
      { kind: "decision", content: "没有来源的候选" },
    ],
  });
  assert.notEqual(usage.raw.isError, true, usage.body.error);
  assert.equal(usage.body.report.status, "candidate_only_pending_existing_acceptance");
  assert.equal(usage.body.report.acceptedCandidates.length, 1);
  assert.equal(usage.body.report.rejectedCandidates.length, 1);
  const afterUsage = fs.existsSync(usageRoot) ? fs.readdirSync(usageRoot).length : 0;
  assert.equal(afterUsage, beforeUsage, "MCP candidate must not write canonical project memory");
  const mergedReceipt = snapshotModule.mergeThirdPartyMemoryUsageIntoReceipt({ status: "done", summary: "accepted" }, first.id, first.checksum);
  assert.equal(mergedReceipt.projectMemory.decisions.length, 1);
  assert.equal(mergedReceipt.memoryMcpUsageReports.length, 1);

  const delta = createSnapshot({
    taskAgentSessionId: "tas_native_known",
    nativeSessionId: "codex_native_known_after_first_turn",
    messages: [...messages, { id: "msg_16", role: "user", content: "ONLY_NEW_DELTA" }],
  });
  assert.equal(delta.deliveryMode, "delta");
  assert.deepEqual(delta.segments.filter(segment => segment.required).flatMap(segment => segment.messageIds), ["msg_16"]);
  assert.equal(delta.requiredMemoryItemIds.length, 0);

  const compressed = createSnapshot({
    mode: "canonical_summary_recent_raw",
    boundaryGeneration: 1,
    summary: { primaryRequest: "实现第三方记忆 MCP", decisions: ["签名作用域"] },
    summarySource: "model",
    messages: messages.slice(-6),
    archiveMessages: messages.slice(0, -6),
  });
  assert.equal(compressed.deliveryMode, "full");
  assert.equal(compressed.segments.some(segment => segment.kind === "summary" && segment.required), true);
  assert.equal(compressed.segments.some(segment => segment.kind === "raw_archive" && !segment.required), true);

  const sibling = snapshotModule.createThirdPartyMemorySnapshot({
    bindingKind: "project_session",
    role: "project-agent",
    project,
    projectSessionId: "sibling",
    provider: "codex",
    nativeGeneration: 1,
    boundaryGeneration: 0,
    mode: "precompact_full_raw",
    messages: [{ id: "sibling_1", role: "user", content: "SIBLING_SECRET" }],
    memoryItems: [],
  });
  const mismatchedServer = buildServer(sibling);
  const mismatched = await connect(mismatchedServer.config); clients.push(mismatched);
  const rejectedScope = await call(mismatched, "get_context_manifest");
  assert.equal(rejectedScope.raw.isError, true);
  assert.match(rejectedScope.body.error, /作用域不匹配/);

  const gate = buildFinalWorkerDispatchPayloadGate({
    renderedPrompt: "small bootstrap",
    requiredHydrationTokens: 166999,
    modelContextCapacity: { contextWindow: 200000, reservedOutputTokens: 20000, autoCompactBufferTokens: 13000, autoCompactThreshold: 167000 },
    provider: "codex",
  });
  assert.equal(gate.required_hydration_tokens, 166999);
  assert.equal(gate.status, "recompact_required");

  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf8");
  const runnerSource = fs.readFileSync(path.join(root, "backend", "server-agent-runner.ts"), "utf8");
  const groupSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-cross-agents-part-01.ts"), "utf8");
  assert.match(serverSource, /buildProjectSessionBoundMemoryMcpServer/);
  assert.match(serverSource, /memoryDeliveryMode:\s*memoryMcpEnabled\s*\?\s*"mcp"/);
  assert.match(runnerSource, /第三方 Agent 未完成必需记忆加载/);
  assert.match(groupSource, /buildGroupThirdPartyMemorySnapshot/);
  assert.match(groupSource, /requiredHydrationTokens:\s*thirdPartyMemoryMcpEnabled/);
  assert.match(groupSource, /ccm-third-party-memory-mcp-reference-v1/);
  const bindingCore = { schema: "ccm-task-agent-group-session-memory-binding-v2", groupId: "g1", groupSessionId: "gcs_1", deliveryReady: true };
  const binding = { ...bindingCore, checksum: hashValue(bindingCore) };
  const extractedBinding = extractGroupSessionMemoryBinding({ schema: "ccm-third-party-memory-mcp-reference-v1", group_session_memory_binding: binding });
  assert.equal(extractedBinding.deliveryReady, true);
  assert.equal(extractedBinding.checksumValid, true);
  assert.equal(extractGroupSessionMemoryBinding({ schema: "ccm-third-party-memory-mcp-reference-v1", group_session_memory_binding: { ...binding, groupId: "tampered" } }).deliveryReady, false);

  console.log(JSON.stringify({
    pass: true,
    checks: 49,
    tools: tools.length,
    project_session_without_task_id: true,
    precompact_full_history_required: true,
    acknowledgement_requires_reads: true,
    same_generation_delta: true,
    compact_boundary_rehydrates: true,
    sibling_scope_rejected: true,
    candidate_write_is_controlled: true,
    hydration_tokens_gate_provider_call: true,
    paid_provider_calls: 0,
  }, null, 2));
} finally {
  for (const client of clients) client.disconnect();
  fs.rmSync(home, { recursive: true, force: true });
}
