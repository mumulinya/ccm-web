#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const presented = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-presented-plan.js"));
const builtIn = presented.runGroupPresentedPlanSelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const loop = read("backend/agents/native-query-loop.ts");
const prompts = read("backend/modules/collaboration/group-orchestrator-prompts.ts");
const llm = read("backend/modules/collaboration/group-orchestrator-llm.ts");
const identity = read("backend/agents/main-agent-identity.ts");
const live = read("backend/modules/collaboration/group-live-routes.ts");
const feishu = read("backend/modules/collaboration/feishu-channel.ts");
const message = read("frontend/src/components/agents/AgentExecutionMessage.vue");
const transcript = read("frontend/src/components/common/AgentExecutionTranscript.vue");
const planCard = read("frontend/src/components/common/PresentedPlanCard.vue");
const shape = String(presented.PRESENTED_PLAN_SHAPE_GUIDANCE || "");
const handoff = String(presented.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE || "");

assert.equal(typeof presented.formatPresentedPlanMarkdown, "function");
assert.doesNotMatch(prompts, /如 P0–Pn/);
assert.doesNotMatch(loop, /如 P0–Pn/);
assert.doesNotMatch(prompts, /也不要先扫仓库/);
assert.match(prompts, /buildGroupMainSessionGuidance/);
assert.doesNotMatch(prompts, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.doesNotMatch(prompts, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.doesNotMatch(prompts, /第一次为当前需求出实现计划/);
assert.doesNotMatch(loop, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.doesNotMatch(loop, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.match(loop, /One demonstrable slice/);
assert.match(loop, /overview/);
assert.match(loop, /Never put TestAgent in targets/);
const skill = read("ccm-package/templates/skills/ccm-implementation-plan-authoring/SKILL.md");
const projectMessages = read("backend/modules/projects/project-native-messages.ts");
const roleSkills = read("backend/skills/role-skills.ts");
assert.match(skill, /name: ccm-implementation-plan-authoring/);
assert.match(skill, /You are the CCM implementation planner/);
assert.match(skill, /ccm-implementation-plan-v2/);
assert.match(skill, /read-only evidence/);
assert.match(skill, /sourceEvidenceIds/);
assert.match(skill, /acceptance criterion/);
assert.match(skill, /revision/);
assert.match(skill, /checksum/);
assert.match(skill, /Do not put TestAgent/);
assert.match(shape, /ccm-implementation-plan-v2/);
assert.match(shape, /Skill:ccm-implementation-plan-authoring/);
assert.match(handoff, /revision and checksum/);
assert.doesNotMatch(prompts, /没有现成域就写明 greenfield/);
assert.doesNotMatch(projectMessages, /没有现成域就写明 greenfield/);
assert.doesNotMatch(llm, /没有现成域就写明 greenfield/);
assert.match(roleSkills, /planAuthoring/);
assert.match(roleSkills, /implementationPlanAuthoring/);
assert.match(roleSkills, /options\.planAuthoring === true/);
assert.match(roleSkills, /The user selected plan authoring/);
assert.doesNotMatch(roleSkills, /if \(phase === "planning"\) \{\s*add\(CCM_ROLE_SKILL_NAMES\.implementationPlanAuthoring/);
assert.match(llm, /planAuthoring: isConversationPlanModeEnabled\("group"/);
assert.match(llm, /buildGroupMainIdentityRules/);
assert.match(llm, /buildGroupMainSessionGuidance/);
assert.match(llm, /renderSlashCommandSessionDirective\("group"/);
assert.match(llm, /publishGroupPresentedRequirementPlan/);
assert.doesNotMatch(llm, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.doesNotMatch(llm, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.match(identity, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.match(identity, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.match(identity, /Each target must implement the confirmed plan slice/);
assert.match(identity, /During the first plan for a request/);
assert.match(identity, /Plan tool: ccm_present_plan/);
assert.match(identity, /If no project is named/);
assert.doesNotMatch(llm, /即使未明确前端\/后端\/具体项目/);
assert.match(llm, /attachConfirmedPlanSlicesToDispatchTargets/);
assert.match(llm, /latestPresentedPlanFromGroupSession/);
assert.match(live, /visibleGroupPresentedPlanFields/);
assert.match(live, /presentedPlan: visiblePlan.presentedPlan/);
assert.match(feishu, /formatPresentedPlanMarkdown/);
assert.match(planCard, /class="presented-plan"/);
assert.match(planCard, /plan\.overview \|\| plan\.goal/);
assert.match(planCard, /确认并执行/);
assert.doesNotMatch(planCard, /完成后：/);
assert.equal(planCard.includes("Build"), false);
assert.doesNotMatch(message, /class="presented-plan"/);
assert.match(transcript, /requirementPlan\?\.overview \|\| requirementPlan\?\.goal/);
assert.match(transcript, /项待办/);
assert.doesNotMatch(transcript, /确认并执行/);
assert.doesNotMatch(transcript, /完成后：\{\{ step\.outcome \}\}/);

const presentBlock = loop.slice(loop.indexOf('name: "ccm_present_plan"'), loop.indexOf('name: "ccm_dispatch"'));
assert.equal(presentBlock.includes('project: { type: "string" }'), false);
assert.match(presentBlock, /dependsOn:/);
assert.match(presentBlock, /minItems:\s*1/);
assert.equal(presentBlock.includes("maxItems: 8"), false);
assert.equal(typeof presented.appendConfirmedPlanSliceContract, "function");
assert.equal(typeof presented.mergePresentedPlanAcceptanceCriteria, "function");
assert.equal(typeof presented.latestPresentedPlanFromMessages, "function");
const runtime = read("backend/modules/collaboration/collaboration-runtime-cross-agent-runtime.ts");
assert.match(runtime, /mergePresentedPlanAcceptanceCriteria/);
assert.match(runtime, /presentedPlanFromTask/);

const markdown = presented.formatPresentedPlanMarkdown({
  title: "贪心规划",
  overview: "规划用贪心，地图失败降级直线距离。",
  steps: [{ title: "接共享 loop", description: "很长的要做" }, { title: "改卡片为 To-dos" }],
  exclusions: ["子 Agent CLI"],
});
assert.match(markdown, /规划用贪心/);
assert.match(markdown, /- 接共享 loop/);
assert.match(markdown, /本次不包含：子 Agent CLI/);
assert.doesNotMatch(markdown, /很长的要做/);

console.log("group-presented-plan-selftest: pass");
