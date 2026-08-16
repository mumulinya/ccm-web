#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const visible = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-coordinator-visible-reply.js"));
const builtIn = visible.runGroupCoordinatorVisibleReplySelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const llm = read("backend/modules/collaboration/group-orchestrator-llm.ts");
const prompts = read("backend/modules/collaboration/group-orchestrator-prompts.ts");
assert.match(llm, /shouldSynthesizeCoordinatorVisibleReply/);
assert.match(llm, /applySynthesizedCoordinatorReply/);
assert.match(llm, /coordinatorVisibleFallbackContent/);
assert.match(llm, /GROUP_MAIN_SESSION_CONTEXT_GUIDANCE/);
assert.match(llm, /recentContext/);
assert.equal(llm.includes("请描述更具体的需求"), false, "空回复不得再伪装成业务澄清");
assert.match(prompts, /做一个实现的计划/);
assert.match(prompts, /必须调用 ccm_present_plan/);
assert.match(llm, /publishGroupPresentedRequirementPlan/);
assert.match(llm, /coordinatorShouldFailEmptyVisibleReply/);
assert.match(llm, /extractPriorGroupPlanDraft/);
assert.match(read("backend/modules/collaboration/group-prior-plan-context.ts"), /不要重新扫仓库/);
assert.match(prompts, /不要再全量读取项目文件/);
assert.match(prompts, /展开\/重述刚才的计划/);

console.log("group-coordinator-visible-reply-selftest: pass");
