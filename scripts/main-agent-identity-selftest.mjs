#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const identity = require(path.join(root, "ccm-package", "dist", "agents", "main-agent-identity.js"));
const builtIn = identity.runMainAgentIdentitySelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const source = read("backend/agents/main-agent-identity.ts");
const llm = read("backend/modules/collaboration/group-orchestrator-llm.ts");
const projectMain = read("backend/modules/projects/project-main-agent.ts");
const globalProjection = read("backend/agents/global/global-agent-run-projection.ts");

assert.match(source, /# Role/);
assert.match(source, /# Tools/);
assert.match(source, /# Workflow/);
assert.match(source, /# Work orders/);
assert.match(llm, /buildGroupMainIdentityRules/);
assert.match(llm, /buildGroupMainSessionGuidance\(\{ planAuthoring \}\)/);
assert.match(llm, /renderSlashCommandSessionDirective\("group"/);
assert.match(projectMain, /buildProjectMainIdentityRules/);
assert.match(projectMain, /buildProjectMainSessionGuidance\(\{[\s\S]*planAuthoring/);
assert.match(projectMain, /roleSkillsPrompt: roleSkills\.prompt/);
assert.doesNotMatch(globalProjection, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.match(globalProjection, /buildGlobalMainIdentityRules/);
assert.match(globalProjection, /buildGlobalMainSessionGuidance/);
assert.match(globalProjection, /policy_prompt/);
assert.doesNotMatch(globalProjection, /function buildToolPrompt/);
assert.doesNotMatch(globalProjection, /schema=\$\{JSON\.stringify/);
assert.match(source, /buildGlobalMainIdentityRules/);

const agent = identity.buildGroupMainIdentityRules({ projectBrief: "- demo" });
const plan = identity.buildGroupMainIdentityRules({ projectBrief: "- demo", planAuthoring: true });
assert.equal(agent.includes("ccm_present_plan"), true);
assert.equal(agent.includes("simple explicit changes directly"), true);
assert.equal(plan.includes("Skill:ccm-implementation-plan-authoring"), true);
assert.equal(plan.includes("Planning is read-only"), true);
assert.equal(plan.includes("must not call ccm_dispatch"), true);
assert.equal((agent.match(/During the first plan/g) || []).length, 1);
const projectAgent = identity.buildProjectMainIdentityRules({ project: "api" });
assert.equal(identity.buildGroupMainIdentityRules({ projectBrief: "- demo" }).includes("# Tools"), true);
assert.ok(projectAgent.includes("ccm_ask_user") && projectAgent.includes("invoke_skill") && projectAgent.includes("tool_search"));
assert.equal(projectAgent.includes("list_directory"), false);
assert.equal(projectAgent.includes("grounded in current code and configuration"), true);
const globalAgent = identity.buildGlobalMainIdentityRules();
assert.equal(globalAgent.includes("# Role") && globalAgent.includes("# Tools") && globalAgent.includes("# Workflow") && globalAgent.includes("# Work orders"), true);
assert.equal(globalAgent.includes("schema="), false);
assert.ok(globalAgent.includes("ccm_ask_user") && globalAgent.includes("ccm_present_plan"));
assert.equal(globalAgent.includes("必须 ccm_dispatch"), false);
assert.ok(globalAgent.includes("Never call ccm_dispatch"));

console.log("main-agent-identity-selftest: pass");
