#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const quality = require(path.join(root, "ccm-package", "dist", "agents", "presented-plan-quality.js"));
const loop = require(path.join(root, "ccm-package", "dist", "agents", "native-query-loop.js"));

const builtIn = quality.runPresentedPlanQualitySelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));

const LONG_GOAL = "到店履约时先占住资源，核销后改状态，超时从下单时钟释放并挂到现有预约单；没有现成域就按 greenfield 新建履约对象，验收以可演示切片为准。";

const nine = quality.evaluatePresentedPlanQuality({
  title: "预约履约",
  goal: LONG_GOAL,
  steps: Array.from({ length: 9 }, (_, index) => ({ title: `切片 ${index + 1}` })),
  exclusions: ["手工改库存"],
});
assert.equal(nine.ok, true);

const one = quality.evaluatePresentedPlanQuality({
  title: "预约履约",
  goal: LONG_GOAL,
  steps: [{ title: "占住资源" }],
  exclusions: ["手工改库存"],
});
assert.equal(one.ok, true);

const empty = quality.evaluatePresentedPlanQuality({
  title: "预约履约",
  goal: LONG_GOAL,
  steps: [],
  exclusions: ["手工改库存"],
});
assert.equal(empty.ok, false);
assert.ok(empty.issues.some(item => item.includes("at least one")));

const duplicate = quality.evaluatePresentedPlanQuality({
  title: "预约履约",
  goal: LONG_GOAL,
  steps: [{ title: "占住资源" }, { title: "占住资源" }],
  exclusions: ["手工改库存"],
});
assert.equal(duplicate.ok, false);
assert.ok(duplicate.issues.some(item => item.includes("Duplicate step title")));

const missingBoundary = quality.evaluatePresentedPlanQuality({
  title: "预约履约",
  goal: LONG_GOAL,
  steps: [{ title: "占住资源" }, { title: "核销改状态" }],
});
assert.equal(missingBoundary.ok, false);
assert.ok(missingBoundary.issues.some(item => item.includes("exclusions")));

const valid = quality.evaluatePresentedPlanQuality({
  title: "预约履约",
  goal: LONG_GOAL,
  steps: [{ title: "占住资源" }, { title: "核销改状态" }, { title: "超时释放" }],
  exclusions: ["线下手工改库存"],
});
assert.equal(valid.ok, true);

const nativeLoop = fs.readFileSync(path.join(root, "backend", "agents", "native-query-loop.ts"), "utf8");
assert.match(nativeLoop, /shouldRepairPresentedPlan/);
assert.match(nativeLoop, /PRESENTED_PLAN_QUALITY/);
assert.match(nativeLoop, /planRepairCount/);

const badPlan = { title: "短", goal: "太短", steps: [{ title: "占住资源" }] };
const presentTurn = (id) => ({
  text: "计划已经整理完成。",
  toolCalls: [{ id, name: "ccm_present_plan", arguments: { reply: "请看计划", plan: badPlan }, argumentsChecksum: id }],
  toolReferences: [],
  stopReason: "tool_calls",
  usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, reported: true },
});
let degradeIndex = 0;
let blockedError = null;
try {
  await loop.runNativeQueryLoop({
    config: { providerNativeToolsMode: "auto", forceNativeQueryLoop: true },
    messages: [{ role: "user", content: "做计划" }],
    tools: [],
    scope: "group",
    scopeId: "g1",
    exactSessionId: "gcs_plan_quality_script",
    executeTools: async () => [],
    callTurn: async () => presentTurn(degradeIndex++ === 0 ? "d1" : "d2"),
  });
} catch (error) {
  blockedError = error;
}
assert.equal(blockedError?.code, "CCM_PLAN_REVIEW_BLOCKED");
assert.equal(degradeIndex, 2);
assert.ok(Array.isArray(blockedError?.reviewReceipt?.issues));

console.log("presented-plan-quality-selftest: pass");
