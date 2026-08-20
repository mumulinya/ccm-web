import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = await import("../ccm-package/dist/system/session-execution-ledger.js");
const storage = await import("../ccm-package/dist/tools/tool-result-storage.js");
const result = ledger.runSessionExecutionLedgerSelfTest();
const persist = storage.runToolResultStorageSelfTest();

const globalMemory = fs.readFileSync(path.join(root, "backend/agents/global/memory.ts"), "utf8");
const globalRuntime = fs.readFileSync(path.join(root, "backend/agents/global/runtime.ts"), "utf8");
const projectCompaction = fs.readFileSync(path.join(root, "backend/modules/projects/project-session-compaction.ts"), "utf8");
const projectMain = fs.readFileSync(path.join(root, "backend/modules/projects/project-main-agent.ts"), "utf8");
const projectSessions = fs.readFileSync(path.join(root, "backend/modules/projects/sessions.ts"), "utf8");

const wiring = {
  globalEncryptedTranscriptStoresExecution: globalMemory.includes("executionMessages")
    && globalMemory.includes("appendGlobalAgentExecutionEvent")
    && globalMemory.includes("mergeConversationWithExecution"),
  globalRuntimeCapturesToolLifecycle: globalRuntime.includes("registerGlobalAgentExecutionEventSink")
    && globalRuntime.includes('"tool_started", "tool_completed", "tool_failed"'),
  projectExactSessionStoresExecution: projectCompaction.includes("appendProjectSessionExecutionEvent")
    && projectCompaction.includes("execution_history"),
  projectCompressionUsesExecution: projectCompaction.includes("projectExecutionEvents(data)")
    && projectCompaction.includes("mergeConversationWithExecution(snapshot.messages, snapshot.executionEvents)"),
  projectMainRecordsSourceRuntimeMcpAndReview: [
    "read_project_source",
    "dispatch_project_worker",
    "run_test_agent_review",
    "recordProjectMainToolUse",
    "recordProjectMainToolResult",
  ].every(token => projectMain.includes(token)),
  userVisibleProjectSessionHidesLedger: projectSessions.includes("...publicData")
    && projectSessions.includes("execution_history = []"),
  persistContextOnAppend: globalMemory.includes("persistContext")
    && projectCompaction.includes("persistContext")
    && fs.readFileSync(path.join(root, "backend/modules/collaboration/group-session-execution-ledger.ts"), "utf8").includes("persistContext"),
};

assert.equal(persist.pass, true, JSON.stringify(persist.checks, null, 2));
for (const [name, value] of Object.entries({ ...result.checks, ...wiring })) assert.equal(value, true, name);
console.log(JSON.stringify({ pass: true, checks: Object.keys({ ...result.checks, ...wiring, persist: persist.pass }).length, ...wiring }, null, 2));
