#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const reportRoot = path.join(repoRoot, "scratch", "role-skills-selftest");
const scratchRoot = path.join(reportRoot, "latest-run");
if (!scratchRoot.startsWith(reportRoot + path.sep)) throw new Error("unsafe role Skill self-test path");
fs.mkdirSync(reportRoot, { recursive: true });
fs.rmSync(scratchRoot, { recursive: true, force: true });
fs.mkdirSync(scratchRoot, { recursive: true });

const roleSkills = require("../ccm-package/dist/skills/role-skills.js");
const db = require("../ccm-package/dist/core/db.js");
const runtimeTools = require("../ccm-package/dist/tools/runtime-tool-sync.js");
const testAgentProfile = require("../ccm-package/dist/test-agent/agent-profile.js");
const { runTestAgent } = require("../ccm-package/dist/test-agent/agent.js");

const selector = roleSkills.runRoleSkillSelectionSelfTest();
assert.equal(selector.pass, true, "role Skill selector self-test failed");

const catalog = {
  mcpTools: [],
  skills: db.loadSkills(),
  skillPackagesDir: db.SKILL_PACKAGES_DIR,
  runtimeStorageRoot: path.join(scratchRoot, "agent-runtime"),
  codexGateway: null,
};

const runtimeScenarios = [
  {
    id: "document-ui",
    task: "根据 PRD 实现设置页面，并运行真实浏览器响应式截图验收",
    expected: [
      roleSkills.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery,
      roleSkills.CCM_ROLE_SKILL_NAMES.frontendVisualQa,
      roleSkills.CCM_ROLE_SKILL_NAMES.evidence,
    ],
  },
  {
    id: "incident",
    task: "修复 API 500 报错，定位根因并执行回归验证",
    expected: [
      roleSkills.CCM_ROLE_SKILL_NAMES.incidentDiagnosis,
      roleSkills.CCM_ROLE_SKILL_NAMES.evidence,
    ],
  },
  {
    id: "release",
    task: "完成版本升级、数据库迁移，运行构建并验证生产发布就绪",
    expected: [
      roleSkills.CCM_ROLE_SKILL_NAMES.releaseReadiness,
      roleSkills.CCM_ROLE_SKILL_NAMES.evidence,
    ],
  },
];
const requiredProjectRuntimeSkills = [
  roleSkills.CCM_ROLE_SKILL_NAMES.project,
  roleSkills.CCM_ROLE_SKILL_NAMES.projectSourceResearch,
  roleSkills.CCM_ROLE_SKILL_NAMES.receipt,
  roleSkills.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery,
  roleSkills.CCM_ROLE_SKILL_NAMES.frontendVisualQa,
  roleSkills.CCM_ROLE_SKILL_NAMES.evidence,
  roleSkills.CCM_ROLE_SKILL_NAMES.incidentDiagnosis,
  roleSkills.CCM_ROLE_SKILL_NAMES.releaseReadiness,
];
const runtimeResults = {};
for (const runtime of ["claudecode", "cursor", "codex"]) {
  const union = new Set();
  runtimeResults[runtime] = { scenarios: {} };
  for (const scenario of runtimeScenarios) {
    const selection = roleSkills.selectRoleSkills("project-child-agent", scenario.task, { forceWork: true, phase: "execution" });
    const allowedTools = { mcp: [], skill: selection.map(item => item.name) };
    for (const expected of scenario.expected) {
      assert.ok(allowedTools.skill.includes(expected), `${runtime}/${scenario.id} selector missed ${expected}`);
    }
    const usageDirective = roleSkills.buildSelectedSkillUsageDirective(selection);
    for (const selectedName of allowedTools.skill) {
      assert.match(usageDirective, new RegExp(`Skill:${selectedName}`), `${runtime}/${scenario.id} usage directive missed ${selectedName}`);
    }
    assert.match(usageDirective, /读取并应用其 SKILL\.md/);
    assert.match(usageDirective, /CCM_AGENT_RECEIPT/);
    const simulatedUsageReceipt = allowedTools.skill.map(name => `已实际应用 Skill:${name}`).join("\n");
    const detectedUsage = runtimeTools.detectInvokedSkillsFromText(simulatedUsageReceipt, allowedTools, catalog.skills);
    assert.deepEqual(
      detectedUsage.map(item => item.name).sort(),
      [...allowedTools.skill].sort(),
      `${runtime}/${scenario.id} did not record all reported Skill usage`,
    );
    assert.equal(
      runtimeTools.detectInvokedSkillsFromText("Skill:unauthorized-skill", allowedTools, catalog.skills).length,
      0,
      `${runtime}/${scenario.id} recorded unauthorized Skill usage`,
    );

    const workDir = path.join(scratchRoot, "workdirs", runtime, scenario.id);
    fs.mkdirSync(workDir, { recursive: true });
    const audit = runtimeTools.syncRuntimeToolsWithCatalog(workDir, runtime, allowedTools, catalog);
    assert.equal(audit.dispatch_gate?.dispatchReady, true, `${runtime}/${scenario.id} dispatch gate blocked`);
    assert.deepEqual([...audit.synced.skill].sort(), [...allowedTools.skill].sort(), `${runtime}/${scenario.id} did not sync all selected Skills`);
    assert.equal(audit.missing.skill.length, 0, `${runtime}/${scenario.id} reported missing Skills`);
    for (const status of audit.skill_statuses || []) {
      if (!allowedTools.skill.includes(status.name)) continue;
      assert.ok(status.skillPath && fs.existsSync(status.skillPath), `${runtime}/${scenario.id}/${status.name} SKILL.md missing`);
      assert.match(fs.readFileSync(status.skillPath, "utf-8"), new RegExp(`name:\\s*["']?${status.name}`));
      union.add(status.name);
    }
    const snapshot = JSON.parse(fs.readFileSync(audit.snapshotPath, "utf-8"));
    assert.deepEqual([...snapshot.requested.skill].sort(), [...allowedTools.skill].sort(), `${runtime}/${scenario.id} snapshot selection mismatch`);
    runtimeResults[runtime].scenarios[scenario.id] = {
      task: scenario.task,
      selected: allowedTools.skill,
      snapshotId: audit.snapshotId,
      snapshotPath: audit.snapshotPath,
      skillRoot: audit.skillRoot,
      requested: audit.requested.skill,
      synced: audit.synced.skill,
      missing: audit.missing.skill,
      usageDirective,
      detectedUsage,
    };
  }
  for (const required of requiredProjectRuntimeSkills) {
    assert.ok(union.has(required), `${runtime} never received project Skill ${required}`);
  }
  runtimeResults[runtime].coveredSkills = [...union].sort();
}

assert.deepEqual(
  testAgentProfile.TEST_AGENT_DEFINITION.roleSkills,
  [roleSkills.CCM_ROLE_SKILL_NAMES.test, roleSkills.CCM_ROLE_SKILL_NAMES.evidence],
  "TestAgent profile did not receive verifier Skills",
);

const testAgentReport = await runTestAgent({
  id: "role-skills-test-agent-probe",
  taskId: "role-skills-test-agent-probe",
  originalUserGoal: "确认 TestAgent 的角色 Skill 已进入真实 work order",
  acceptanceCriteria: ["安全验证命令能够执行并记录结果"],
  requiredChecks: ["commands"],
  projects: [{
    name: "ccm-role-skill-probe",
    workDir: repoRoot,
    verificationCommands: ["node --version"],
  }],
  options: {
    artifactDir: path.join(scratchRoot, "test-agent-artifacts"),
    autoDiscoverVerificationCommands: false,
    requireAdversarialProbe: false,
    adversarialProbeWaiver: "Role Skill work-order metadata probe only.",
    browserProvider: "none",
  },
});
assert.deepEqual(
  testAgentReport.metadata?.roleSkills?.selected?.map(item => item.name),
  [roleSkills.CCM_ROLE_SKILL_NAMES.test, roleSkills.CCM_ROLE_SKILL_NAMES.evidence],
  "real TestAgent work order did not record verifier Skills",
);
assert.equal(testAgentReport.metadata?.roleSkills?.applied, true, "real TestAgent did not mark selected Skills as applied");
assert.equal(testAgentReport.metadata?.roleSkills?.appliedBy, "ccm-native-test-agent-engine");

const visualTestAgentReport = await runTestAgent({
  id: "role-skills-visual-test-agent-probe",
  taskId: "role-skills-visual-test-agent-probe",
  originalUserGoal: "在真实浏览器验证设置页面响应式布局并截图",
  acceptanceCriteria: ["桌面和移动端页面没有遮挡，并保留截图证据"],
  requiredChecks: ["commands"],
  projects: [{
    name: "ccm-role-skill-visual-probe",
    workDir: repoRoot,
    verificationCommands: ["node --version"],
  }],
  options: {
    artifactDir: path.join(scratchRoot, "test-agent-visual-artifacts"),
    autoDiscoverVerificationCommands: false,
    requireAdversarialProbe: false,
    adversarialProbeWaiver: "Role Skill visual work-order metadata probe only.",
    browserProvider: "none",
  },
});
const visualTestSkills = visualTestAgentReport.metadata?.roleSkills?.selected?.map(item => item.name) || [];
assert.ok(visualTestSkills.includes(roleSkills.CCM_ROLE_SKILL_NAMES.test));
assert.ok(visualTestSkills.includes(roleSkills.CCM_ROLE_SKILL_NAMES.evidence));
assert.ok(visualTestSkills.includes(roleSkills.CCM_ROLE_SKILL_NAMES.frontendVisualQa));
assert.equal(visualTestAgentReport.metadata?.roleSkills?.applied, true);

const nativePromptChecks = {
  global: roleSkills.buildRoleSkillPrompt("global-agent", "请根据接口文档修复支付 500 错误", { forceWork: true, phase: "planning" }),
  groupPlanning: roleSkills.buildRoleSkillPrompt("group-main-agent", "请根据 PRD 拆分页面实现任务", { forceWork: true, phase: "planning" }),
  groupReview: roleSkills.buildRoleSkillPrompt("group-main-agent", "复核实现和测试证据并安排返工", { forceWork: true, phase: "review" }),
  testVisual: roleSkills.buildRoleSkillPrompt("test-agent", "浏览器验证响应式页面并截图", { forceWork: true, phase: "verification" }),
};
assert.match(nativePromptChecks.global.prompt, /Skill:ccm-global-mission-lead/);
assert.match(nativePromptChecks.global.prompt, /Skill:ccm-incident-diagnosis/);
assert.match(nativePromptChecks.groupPlanning.prompt, /Skill:ccm-task-decomposition/);
assert.match(nativePromptChecks.groupReview.prompt, /Skill:ccm-delivery-review-rework/);
assert.match(nativePromptChecks.testVisual.prompt, /Skill:ccm-frontend-visual-qa/);

const groupSource = fs.readFileSync(path.join(repoRoot, "backend", "modules", "collaboration", "group-orchestrator.ts"), "utf-8");
const projectSource = fs.readFileSync(path.join(repoRoot, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
const testAgentSource = fs.readFileSync(path.join(repoRoot, "backend", "test-agent", "agent.ts"), "utf-8");
const testAgentProfileSource = fs.readFileSync(path.join(repoRoot, "backend", "test-agent", "agent-profile.ts"), "utf-8");
const sourceChecks = {
  globalPromptUsesDynamicRoleSkill: /buildRoleSkillPrompt\([\s\S]*?"global-agent"/.test(fs.readFileSync(path.join(repoRoot, "backend", "agents", "global", "loop.ts"), "utf-8")),
  groupPromptUsesDynamicRoleSkill: /buildRoleSkillPrompt\("group-main-agent"/.test(groupSource),
  projectRuntimeMergesRoleSkills: /selectRoleSkills\("project-child-agent"[\s\S]*?selectedRoleSkills\.map/.test(projectSource),
  projectRuntimeRequiresSkillApplication: /buildSelectedSkillUsageDirective\(selectedRoleSkills\)/.test(projectSource),
  projectExecutionPromptsReceiveSkillDirective: (projectSource.match(/toolContext\.prompt/g) || []).length >= 4,
  projectExecutionRecordsInvokedSkills: /attachInvokedSkillsToReceipt\([\s\S]*?invoked_skills/.test(projectSource),
  testWorkOrderRecordsRoleSkills: /roleSkills:\s*\{[\s\S]*?role:\s*"test-agent"/.test(testAgentSource),
  testWorkOrderMarksNativeApplication: /appliedBy:\s*"ccm-native-test-agent-engine"/.test(testAgentSource),
  duplicateBrowserManualRemoved: !testAgentProfileSource.includes("Use genuinely concurrent HTTP requests"),
};
assert.equal(Object.values(sourceChecks).every(Boolean), true, "one or more Agent integration points are missing");

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  selector,
  runtimeScenarios,
  nativePromptChecks: Object.fromEntries(Object.entries(nativePromptChecks).map(([key, value]) => [key, value.names])),
  testAgentProfileSkills: testAgentProfile.TEST_AGENT_DEFINITION.roleSkills,
  testAgentWorkOrderSkills: testAgentReport.metadata?.roleSkills,
  visualTestAgentWorkOrderSkills: visualTestAgentReport.metadata?.roleSkills,
  testAgentProbe: {
    status: testAgentReport.status,
    recommendation: testAgentReport.recommendation,
    commandResults: testAgentReport.commandResults?.map(item => ({ command: item.command, status: item.status, exitCode: item.exitCode })),
  },
  runtimeResults,
  sourceChecks,
};
fs.writeFileSync(path.join(reportRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
console.log(JSON.stringify(report, null, 2));
