import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const projectMemory = await import("../ccm-package/dist/projects/memory.js");
const receipts = await import("../ccm-package/dist/modules/collaboration/agent-receipts.js");
const memoryCenter = await import("../ccm-package/dist/modules/knowledge/memory-control-center-api.js");

const core = projectMemory.runProjectMemorySelfTest();
assert.equal(core.pass, true, JSON.stringify(core, null, 2));

const parsed = receipts.extractAgentReceipt(`CCM_AGENT_RECEIPT ${JSON.stringify({
  status: "done",
  summary: "完成接口调整",
  projectMemory: {
    constraints: ["接口必须向后兼容"],
    openItems: [{ content: "迁移旧调用方", reason: "仍有一个消费者未升级" }],
  },
})}`, "api");
assert.deepEqual(parsed.projectMemory.constraints, ["接口必须向后兼容"]);
assert.equal(parsed.projectMemory.openItems[0].content, "迁移旧调用方");

const projectScope = memoryCenter.memorySummary("project", "project-memory-v4-selftest", {
  project: "project-memory-v4-selftest",
  architecture: "Node.js service",
  techStack: ["Node.js", "TypeScript"],
  durableMemories: [
    { id: "constraint_1", type: "constraint", content: "接口必须向后兼容", status: "active", confidence: "accepted" },
    { id: "resolved_1", type: "open_item", content: "已完成的迁移", status: "resolved", confidence: "accepted" },
  ],
  taskHistory: [{ id: "task_1", summary: "普通任务历史" }],
  memoryPolicy: {
    schema: "ccm-project-memory-policy-v4",
    taskHistoryInjectedByDefault: false,
    durableMemoryRequiresAcceptedDoneReceipt: true,
  },
  resources: {},
}, "Project Memory V4");
assert.equal(projectScope.autoCompactThreshold, 0);
assert.equal(projectScope.longTermMemory.activeCount, 1);
assert.equal(projectScope.longTermMemory.taskHistoryCount, 1);
assert.equal(projectScope.longTermMemory.writePolicy, "accepted_delivery_only");
assert.equal(projectScope.tokenSource, "project_long_term_injection_estimate");
assert.ok(projectScope.currentTokens > 0);

const projectGroups = memoryCenter.collectItems("project", "project-memory-v4-selftest", {
  durableMemories: [{ id: "constraint_1", type: "constraint", content: "接口必须向后兼容", status: "active" }],
  taskHistory: [{ id: "task_1", summary: "普通任务历史" }],
  decisions: [{ decision: "旧测试决策" }],
  conclusions: [{ summary: "旧测试结论" }],
  decisionArchives: [{ records: [{ decision: "旧归档决策" }] }],
  conclusionArchives: [{ records: [{ summary: "旧归档结论" }] }],
});
assert.deepEqual(projectGroups.map(group => group.type), ["durableMemories"]);
assert.equal(projectGroups[0].items[0].text, "接口必须向后兼容");

const frontend = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenterPanel.vue"), "utf8");
assert.match(frontend, /实际注入估算/);
assert.match(frontend, /验收后提交/);
assert.match(frontend, /longTermMemory\?\.activeCount/);

console.log(JSON.stringify({
  pass: true,
  checks: Object.keys(core.checks).length + 12,
  flow: "receipt -> task history -> final acceptance -> durable memory -> selective injection",
}, null, 2));
