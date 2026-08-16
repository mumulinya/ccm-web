#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);

const identity = require(dist("agents", "main-agent-identity.js"));
const loadPolicy = require(dist("agents", "global", "global-tool-load-policy.js"));
const nativeLoop = require(dist("agents", "native-query-loop.js"));
const transcript = require(dist("agents", "native-session-transcript.js"));
const storage = require(dist("tools", "tool-result-storage.js"));
const globalAdapter = require(dist("modules", "global", "global-native-query-adapter.js"));
const compact = require(dist("modules", "collaboration", "group-main-tool-result-compact.js"));

const identityResult = identity.runMainAgentIdentitySelfTest();
assert.equal(identityResult.pass, true, JSON.stringify(identityResult.checks, null, 2));
assert.equal(identityResult.checks.globalDefersManagementTools, true);

const loadPolicyResult = loadPolicy.runGlobalToolLoadPolicySelfTest();
assert.equal(loadPolicyResult.pass, true, JSON.stringify(loadPolicyResult.checks, null, 2));

const persistResult = storage.runToolResultStorageSelfTest();
assert.equal(persistResult.pass, true, JSON.stringify(persistResult.checks, null, 2));

const compactResult = compact.runGroupMainToolResultCompactSelfTest();
assert.equal(compactResult.pass, true, JSON.stringify(compactResult.checks, null, 2));

const transcriptResult = transcript.runNativeSessionTranscriptSelfTest();
assert.equal(transcriptResult.pass, true, JSON.stringify(transcriptResult.checks, null, 2));
assert.equal(transcriptResult.checks.nativeAppliesMicroCompact, true);

const globalNative = globalAdapter.runGlobalNativeQuerySelfTest();
assert.equal(globalNative.pass, true, JSON.stringify(globalNative.checks, null, 2));

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
assert.equal(catalog.every(tool => !String(tool.name).includes("ccm_workspace_readonly")), true);

const source = relative => fs.readFileSync(path.join(root, relative), "utf8");
assert.match(source("backend/modules/collaboration/group-coordinator-native-messages.ts"), /clearedToolCallIds/);
assert.match(source("backend/modules/projects/project-native-messages.ts"), /clearedToolCallIds/);
assert.match(source("backend/agents/global/global-native-messages.ts"), /clearedToolCallIds/);
assert.match(source("backend/agents/native-query-loop.ts"), /persistContext/);
assert.match(source("backend/modules/global/global-native-query-adapter.ts"), /persistContext/);
assert.doesNotMatch(source("backend/modules/collaboration/group-orchestrator-config.ts"), /timeBasedMicrocompactEnabled:\s*true/);

console.log("cc-tool-context-parity-selftest: pass");
