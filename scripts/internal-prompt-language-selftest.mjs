#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const han = /[\u3400-\u9fff]/u;
const internalPrompt = require(path.join(root, "ccm-package", "dist", "agents", "internal-prompt-contract.js"));
const workflow = require(path.join(root, "ccm-package", "dist", "agents", "workflow-decision.js"));
const identity = require(path.join(root, "ccm-package", "dist", "agents", "main-agent-identity.js"));
const roleSkills = require(path.join(root, "ccm-package", "dist", "skills", "role-skills.js"));
const toolRuntime = require(path.join(root, "ccm-package", "dist", "tools", "main-agent-tool-runtime.js"));
const toolLoop = require(path.join(root, "ccm-package", "dist", "tools", "tool-call-loop.js"));
const workspaceTools = require(path.join(root, "ccm-package", "dist", "tools", "workspace-readonly-tools.js"));

const contract = internalPrompt.runInternalPromptContractSelfTest();
assert.equal(contract.pass, true, JSON.stringify(contract));
assert.equal(han.test(workflow.WORKFLOW_DECISION_GUIDANCE), false, "workflow guidance contains CJK");
for (const value of [
  identity.buildGlobalMainIdentityRules(),
  identity.buildGroupMainIdentityRules({ projectBrief: "- demo" }),
  identity.buildProjectMainIdentityRules({ project: "demo" }),
  identity.buildGlobalMainSessionGuidance(),
  identity.buildGroupMainSessionGuidance(),
  identity.buildProjectMainSessionGuidance(),
  roleSkills.buildModelSelectableSkillCatalog(),
  roleSkills.buildSelectedSkillUsageDirective([{ name: "ccm-project-source-research", reason: "source evidence" }]),
  ...toolRuntime.MAIN_AGENT_NATIVE_TOOLS_V2.map(item => item.description),
  toolLoop.buildToolContinuationPrompt({ round: 1, transcript: "", toolResults: "<ccm_tool_results />", hasNativeSession: true }),
].filter(Boolean)) {
  assert.equal(han.test(String(value)), false, "generated internal prompt contains CJK");
}

for (const definition of workspaceTools.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2 || []) {
  assert.equal(han.test(JSON.stringify(definition)), false, `workspace tool definition ${definition.name} contains CJK`);
}

const skillRoot = path.join(root, "ccm-package", "templates", "skills");
for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(skillRoot, entry.name, "SKILL.md");
  if (!fs.existsSync(file)) continue;
  assert.equal(han.test(fs.readFileSync(file, "utf8")), false, `Skill ${entry.name} contains CJK`);
}

const mcpManifest = JSON.parse(fs.readFileSync(path.join(root, "ccm-package", "mcp-feishu", "internal-mcp.json"), "utf8"));
assert.equal(han.test(mcpManifest.description), false);
for (const tool of mcpManifest.tools || []) {
  assert.equal(han.test(tool.label), false, `MCP label ${tool.name} contains CJK`);
  assert.equal(han.test(tool.description), false, `MCP description ${tool.name} contains CJK`);
}

console.log("internal-prompt-language-selftest: pass");
