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
const live = read("backend/modules/collaboration/group-live-routes.ts");
const feishu = read("backend/modules/collaboration/feishu-channel.ts");
const message = read("frontend/src/components/agents/AgentExecutionMessage.vue");
const transcript = read("frontend/src/components/common/AgentExecutionTranscript.vue");
const shape = String(presented.PRESENTED_PLAN_SHAPE_GUIDANCE || "");
const handoff = String(presented.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE || "");

assert.equal(typeof presented.formatPresentedPlanMarkdown, "function");
assert.doesNotMatch(prompts, /如 P0–Pn/);
assert.doesNotMatch(loop, /如 P0–Pn/);
assert.doesNotMatch(prompts, /也不要先扫仓库/);
assert.match(prompts, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.match(prompts, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.match(prompts, /第一次为当前需求出实现计划/);
assert.match(loop, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.match(loop, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.match(loop, /一行可演示切片/);
assert.match(loop, /overview/);
assert.match(loop, /不要把 TestAgent 放进 targets/);
assert.match(shape, /交付切片/);
assert.match(shape, /运转规则/);
assert.match(shape, /第一次为当前需求出实现计划/);
assert.match(shape, /一行待办/);
assert.match(shape, /不要默认 P0.P4/);
assert.match(shape, /不要每步再写要做\/结果/);
assert.match(shape, /必须以 ccm_present_plan 出卡/);
assert.match(shape, /占住资源/);
assert.match(shape, /核销改状态/);
assert.match(shape, /超时释放/);
assert.match(shape, /不要把 TestAgent 写成待办/);
assert.match(handoff, /必须覆盖卡片每条切片的验收口径/);
assert.match(handoff, /不要把卡片重写成前端\/后端\/测试分工/);
assert.match(handoff, /targets\[\]\.task 要写明落实了哪些已确认切片/);
assert.match(handoff, /不要把 TestAgent 写成卡片待办或 targets\[\]/);
assert.match(handoff, /独立验收沿用卡片 overview 与 steps/);
assert.match(llm, /publishGroupPresentedRequirementPlan/);
assert.match(llm, /PRESENTED_PLAN_SHAPE_GUIDANCE/);
assert.match(llm, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/);
assert.match(llm, /写明落实了哪些已确认计划卡切片/);
assert.match(llm, /第一次为当前需求出实现计划/);
assert.match(llm, /展开或重述已有计划稿不要再读项目文件/);
assert.match(llm, /即使未点名具体项目/);
assert.doesNotMatch(llm, /即使未明确前端\/后端\/具体项目/);
assert.match(llm, /attachConfirmedPlanSlicesToDispatchTargets/);
assert.match(llm, /latestPresentedPlanFromGroupSession/);
assert.match(live, /visibleGroupPresentedPlanFields/);
assert.match(live, /presentedPlan: visiblePlan.presentedPlan/);
assert.match(feishu, /formatPresentedPlanMarkdown/);
assert.match(message, /showPresentedPlan/);
assert.match(message, /class="presented-plan"/);
assert.match(message, /presentedPlan\.overview \|\| presentedPlan\.goal/);
assert.match(message, /确认并执行/);
assert.match(message, /canConfirmExecute/);
assert.doesNotMatch(message, /完成后：/);
assert.equal(message.includes("Build"), false);
assert.match(transcript, /requirementPlan\?\.overview \|\| requirementPlan\?\.goal/);
assert.match(transcript, /项待办/);
assert.match(transcript, /确认并执行/);
assert.doesNotMatch(transcript, /完成后：\{\{ step\.outcome \}\}/);

const presentBlock = loop.slice(loop.indexOf('name: "ccm_present_plan"'), loop.indexOf('name: "ccm_dispatch"'));
assert.equal(presentBlock.includes('project: { type: "string" }'), false);
assert.equal(presentBlock.includes("dependsOn:"), false);
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
