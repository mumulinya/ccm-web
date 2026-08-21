#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const prior = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-prior-plan-context.js"));
const visible = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-coordinator-visible-reply.js"));
const builtIn = prior.runGroupPriorPlanContextSelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));

const draft = prior.extractPriorGroupPlanDraft([
  "【压缩前完整会话原文 · 2/2 条】",
  JSON.stringify([
    { role: "user", content: "给我做个实现计划" },
    { role: "assistant", content: "建议按 P0 后端校验，再接 P1 AI/SSE。" },
  ]),
].join("\n"));
assert.equal(visible.coordinatorShouldFailEmptyVisibleReply({
  parsed: { responseType: "reply", reply: "" },
  priorPlanDraft: draft,
}) === true, true);
assert.equal(visible.coordinatorVisibleFallbackContent({
  parsed: { responseType: "reply", reply: "" },
  priorPlanDraft: draft,
}) === "", true);
assert.equal(visible.coordinatorShouldFailEmptyVisibleReply({
  parsed: { responseType: "reply", reply: "" },
}) === false, true);

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const llm = read("backend/modules/collaboration/group-orchestrator-llm.ts");
const prompts = read("backend/modules/collaboration/group-orchestrator-prompts.ts");
const identity = read("backend/agents/main-agent-identity.ts");
const loop = read("backend/agents/native-query-loop.ts");
const priorSrc = read("backend/modules/collaboration/group-prior-plan-context.ts");
assert.match(llm, /extractPriorGroupPlanDraft/);
assert.match(llm, /formatPriorGroupPlanBlock/);
assert.match(priorSrc, /不要重新扫仓库/);
assert.match(llm, /priorPlanDraft/);
assert.match(llm, /coordinatorShouldFailEmptyVisibleReply/);
assert.match(llm, /模型返回空响应/);
assert.match(identity, /Do not reread files just to restate a plan/i);
assert.match(identity, /Expanding or restating a plan is not dispatch authorization/i);
assert.match(prompts, /buildGroupMainSessionGuidance/);
assert.match(loop, /mergeNativeTurnParsed/);
assert.match(loop, /emptyFollowupKeepsFirstTurnText/);

console.log("group-prior-plan-context-selftest: pass");
