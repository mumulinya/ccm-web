#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = async (...parts) => import(pathToFileURL(path.join(root, "backend", ...parts)).href);

const identity = await load("agents", "main-agent-identity.ts");
const loadPolicy = await load("agents", "global", "global-tool-load-policy.ts");
const nativeLoop = await load("agents", "native-query-loop.ts");
const transcript = await load("agents", "native-session-transcript.ts");
const storage = await load("tools", "tool-result-storage.ts");
const globalAdapter = await load("modules", "global", "global-native-query-adapter.ts");
const compact = await load("modules", "collaboration", "group-main-tool-result-compact.ts");
const runtime = await load("tools", "main-agent-tool-runtime.ts");
const ledger = await load("system", "session-execution-ledger.ts");
const compactionCore = await load("system", "session-compaction-core.ts");

const identityResult = identity.runMainAgentIdentitySelfTest();
assert.equal(identityResult.pass, true, JSON.stringify(identityResult.checks, null, 2));
assert.equal(identityResult.checks.globalDefersManagementTools, true);

const loadPolicyResult = loadPolicy.runGlobalToolLoadPolicySelfTest();
assert.equal(loadPolicyResult.pass, true, JSON.stringify(loadPolicyResult.checks, null, 2));

const persistResult = storage.runToolResultStorageSelfTest();
assert.equal(persistResult.pass, true, JSON.stringify(persistResult.checks, null, 2));

const ledgerResult = ledger.runSessionExecutionLedgerSelfTest();
assert.equal(ledgerResult.pass, true, JSON.stringify(ledgerResult.checks, null, 2));

const compactResult = compact.runGroupMainToolResultCompactSelfTest();
assert.equal(compactResult.pass, true, JSON.stringify(compactResult.checks, null, 2));

const bucketResult = compactionCore.runSessionContextCcMessageBucketSelfTest();
assert.equal(bucketResult.pass, true, JSON.stringify(bucketResult.checks, null, 2));

const transcriptResult = transcript.runNativeSessionTranscriptSelfTest();
assert.equal(transcriptResult.pass, true, JSON.stringify(transcriptResult.checks, null, 2));
assert.equal(transcriptResult.checks.nativeAppliesMicroCompact, true);

const nativeLoopResult = await nativeLoop.runNativeQueryLoopSelfTest();
assert.equal(nativeLoopResult.pass, true, JSON.stringify(nativeLoopResult.checks, null, 2));

const globalNative = globalAdapter.runGlobalNativeQuerySelfTest();
assert.equal(globalNative.pass, true, JSON.stringify(globalNative.checks, null, 2));

const promptContext = runtime.buildMainAgentToolRuntimeContext({
  configuredTools: {},
  label: "项目主 Agent",
  mcpPolicy: "read_only",
  schemaSurface: "prompt",
  scopeIdentity: { scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", allowedProjects: ["alpha"] },
});
const nativeContext = runtime.buildMainAgentToolRuntimeContext({
  configuredTools: {},
  label: "项目主 Agent",
  mcpPolicy: "read_only",
  schemaSurface: "native",
  scopeIdentity: { scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", allowedProjects: ["alpha"] },
});
assert.equal(String(promptContext.policyPrompt || "").includes("参数 Schema="), true);
assert.equal(String(nativeContext.policyPrompt || "").includes("参数 Schema="), false);

const catalog = nativeLoop.catalogToNativeTools({
  catalog: {
    loadedMcp: [
      { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly", description: "read", inputSchema: { type: "object" } },
    ],
    mcp: [
      { name: "query_knowledge", canonicalName: "query_knowledge", server: "ccm-group-readonly", description: "kb", inputSchema: { type: "object" } },
    ],
    discoverableMcp: [
      { name: "read_git_status", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_git_status", server: "ccm__workspace_readonly", description: "git", inputSchema: { type: "object" } },
    ],
  },
});
assert.equal(catalog.some(tool => tool.name === "tool_search"), true);
assert.equal(catalog.some(tool => tool.name === "invoke_skill"), true);
assert.equal(catalog.some(tool => tool.name === "read_file" && tool.deferred !== true), true);
assert.equal(catalog.some(tool => tool.name === "read_git_status" && tool.deferred === true), true);
assert.equal(catalog.some(tool => tool.name === "query_knowledge"), true);

const source = relative => fs.readFileSync(path.join(root, relative), "utf8");
assert.match(source("backend/modules/collaboration/group-coordinator-native-messages.ts"), /clearedToolCallIds/);
assert.match(source("backend/modules/projects/project-native-messages.ts"), /clearedToolCallIds/);
assert.match(source("backend/agents/global/global-native-messages.ts"), /clearedToolCallIds/);
assert.match(source("backend/agents/native-query-loop.ts"), /persistContext/);
assert.doesNotMatch(source("backend/modules/collaboration/group-orchestrator-config.ts"), /timeBasedMicrocompactEnabled:\s*true/);

console.log("cc-tool-context-parity-from-source: pass");
