#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");

let core;
try {
  core = require(path.join(root, "ccm-package", "dist", "system", "session-compaction-core.js"));
  if (typeof core.runSessionContextCcMessageBucketSelfTest !== "function") throw new Error("stale dist");
} catch {
  core = await import(pathToFileURL(path.join(root, "backend", "system", "session-compaction-core.ts")).href);
}
const result = core.runSessionContextCcMessageBucketSelfTest();
assert.equal(result.pass, true, JSON.stringify(result.checks, null, 2));

const snapshot = source("backend/system/session-compaction-core.ts");
const globalRuntime = source("backend/modules/global/global-agent-agentic-runtime.ts");
const groupLlm = source("backend/modules/collaboration/group-orchestrator-llm.ts");
const projectMain = source("backend/modules/projects/project-main-agent.ts");
const memoryCenter = source("backend/modules/knowledge/memory-control-center-api.ts");
const usageUi = source("frontend/src/components/common/SessionContextUsage.vue");

assert.match(snapshot, /const toolMcpTokens = toolHints\.mcpTools/);
assert.doesNotMatch(snapshot, /mcpResults: explicit\.mcpResults === undefined \? 0 : valueTokens\(explicit\.mcpResults\)/);
assert.match(globalRuntime, /selectUserMcpToolDefinitions\(authorizedTools\.catalog\.tools\)/);
assert.match(groupLlm, /selectUserMcpToolDefinitions\(mainAgentTools\.catalog/);
assert.doesNotMatch(groupLlm, /mcpResults:\s*toolResults/);
assert.match(projectMain, /selectUserMcpToolDefinitions\(configuredToolContext\.catalog\.mcp\)/);
assert.doesNotMatch(projectMain, /mcpResults:\s*\[runtimeHydration\.prompt/);
assert.match(memoryCenter, /const mcpLoadedTokens = Math.max\(0, Number\(breakdown\.mcpTools \?\? breakdown\.mcp \?\? 0\)\);/);
assert.match(usageUi, /label: 'MCP & dynamic tools', tokens: Number\(breakdown\.mcpAndDynamicTools \?\? breakdown\.mcpTools \?\? breakdown\.mcp \?\? 0\)/);
assert.doesNotMatch(usageUi, /label: '工具结果'/);

console.log(JSON.stringify({
  pass: true,
  checks: result.checks,
  project: result.project,
  global: result.global,
}, null, 2));
