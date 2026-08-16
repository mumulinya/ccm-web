#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const transcript = require(path.join(root, "ccm-package", "dist", "agents", "native-session-transcript.js"));
const groupLedger = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-execution-ledger.js"));

const builtIn = transcript.runNativeSessionTranscriptSelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));
const ledger = groupLedger.runGroupSessionExecutionLedgerSelfTest();
assert.equal(ledger.pass, true, JSON.stringify(ledger.checks, null, 2));

const lastUser = transcript.lastNativeUserText(builtIn.messages);
assert.equal(lastUser, "按 P0–P4 展开成步骤");
assert.equal(JSON.stringify(builtIn.messages).includes("exact_session_context"), false);
assert.equal(JSON.stringify(builtIn.system).includes("【压缩前完整会话原文】"), false);

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const groupLlm = read("backend/modules/collaboration/group-orchestrator-llm.ts");
const groupNative = read("backend/modules/collaboration/group-coordinator-native-messages.ts");
const groupAdapter = read("backend/modules/collaboration/group-native-query-adapter.ts");
const projectMain = read("backend/modules/projects/project-main-agent.ts");
const projectNative = read("backend/modules/projects/project-native-messages.ts");
const globalProjection = read("backend/agents/global/global-agent-run-projection.ts");
const globalNative = read("backend/agents/global/global-native-messages.ts");
const globalAdapter = read("backend/modules/global/global-native-query-adapter.ts");
const shared = read("backend/agents/native-session-transcript.ts");

assert.match(groupLlm, /tryBuildGroupNativeCoordinatorMessages/);
assert.match(groupNative, /materializeNativeSessionTranscript/);
assert.match(groupNative, /本地知识库参考/);
assert.match(groupNative, /群聊共享文件/);
assert.match(groupAdapter, /appendGroupSessionExecutionEvent/);
assert.match(groupAdapter, /compactGroupNativeTranscript/);
assert.match(groupAdapter, /Math\.min\(40_000/);
assert.equal(groupAdapter.includes("threshold * 0.45"), false);
assert.match(projectMain, /tryBuildProjectNativeMainMessages/);
assert.match(projectNative, /当前项目源码证据|metaBlocks/);
assert.match(projectMain, /title: "当前项目源码证据"/);
assert.match(projectMain, /title: "可恢复任务摘要"/);
assert.match(globalProjection, /tryBuildGlobalNativeModelMessages/);
assert.match(globalProjection, /identityRules,/);
assert.match(globalProjection, /mcpPolicy,/);
assert.match(globalProjection, /【用户当前目标】/);
assert.equal(globalProjection.includes("currentUserText: currentGoal"), false);
assert.match(globalNative, /materializeNativeSessionTranscript/);
assert.match(globalAdapter, /recordGlobalAgentRuntimeOutput/);
assert.match(shared, /splitNativeSystemSegments/);
assert.match(shared, /clearedToolCallIds/);
assert.match(groupNative, /clearedToolCallIds/);
assert.match(projectNative, /clearedToolCallIds/);
assert.match(globalNative, /clearedToolCallIds/);
assert.match(shared, /缺对|droppedUnpairedToolUse|call_orphan/);
assert.equal(groupLlm.includes("identityRules") && groupNative.includes("ragContext"), true);

console.log("native-session-transcript-selftest: pass");
