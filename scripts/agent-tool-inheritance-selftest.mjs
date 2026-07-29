#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const { toolManager } = require("../ccm-package/dist/tools/tool-manager.js");
const mainTools = require("../ccm-package/dist/tools/main-agent-tool-runtime.js");
const runner = require("../ccm-package/dist/agents/runner.js");
const { signInternalMcpEvidence } = require("../ccm-package/dist/integrations/internal-mcp-runtime.js");
const { selectRoleSkills } = require("../ccm-package/dist/skills/role-skills.js");

const originalCatalog = toolManager.getScopedToolCatalog.bind(toolManager);
const originalAudit = toolManager.buildScopeAudit.bind(toolManager);
const reportRoot = path.join(repoRoot, "scratch", "agent-tool-inheritance-selftest");
fs.mkdirSync(reportRoot, { recursive: true });

try {
  toolManager.getScopedToolCatalog = scope => ({
    tools: [
      { name: "search_docs", canonicalName: "mcp__ccm__docs__search_docs", server: "docs", description: "search", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } },
      { name: "update_docs", canonicalName: "mcp__ccm__docs__update_docs", server: "docs", description: "update", inputSchema: { type: "object" }, annotations: { readOnlyHint: false } },
    ].filter(row => (scope.mcp || []).includes("docs")),
    skills: (scope.skill || []).map(name => ({ name, description: name, contentHash: `hash-${name}` })),
  });
  toolManager.buildScopeAudit = scope => ({
    mcp: (scope.mcp || []).map(raw => ({ raw, state: "available" })),
    skills: (scope.skill || []).map(name => ({ name, state: "available" })),
    missing_mcp_servers: [], missing_mcp_tools: [], missing_skills: [],
  });
  const projectContext = mainTools.buildMainAgentToolRuntimeContext({
    configuredTools: { mcp: ["docs"], skill: ["code-review"] },
    executionSkills: ["ccm-group-coordination-lead"],
    mcpPolicy: "read_only",
    label: "项目主 Agent",
    auditContext: { runtime: "project-main-agent", project: "alpha", executionId: "pchat-alpha" },
  });
  assert.ok(projectContext.catalog.mcp.some(row => row.name === "search_docs"));
  assert.ok(!projectContext.catalog.mcp.some(row => row.name === "update_docs"));
  assert.ok(projectContext.catalog.skills.some(row => row.name === "code-review"));
  const calls = await mainTools.executeMainAgentToolRequests({
    toolContext: projectContext,
    requests: [
      { name: "invoke_skill", arguments: { name: "code-review", input: "review" }, reason: "review" },
      { name: "mcp__ccm__docs__search_docs", arguments: {}, reason: "search" },
    ],
    executeToolCall: async name => name === "invoke_skill" ? "skill instructions" : "source evidence",
  });
  assert.ok(calls.every(row => row.ok));

  const task = {
    id: "task-v2",
    target_project: "alpha",
    group_id: "",
    project_session_id: "pchat-alpha",
    title: "修复接口错误",
    description: "定位并修复",
    acceptance_criteria: "测试通过",
    selected_skill_names: ["ccm-incident-diagnosis"],
  };
  const roleSkills = selectRoleSkills("project-child-agent", `${task.title}\n${task.description}\n${task.acceptance_criteria}`, {
    forceWork: true,
    phase: "execution",
    selectedSkillNames: task.selected_skill_names,
    modelDecision: { actionRequired: true, selectedSkills: task.selected_skill_names },
  }).map(row => row.name).sort();
  const configuredTools = { mcp: ["docs"], skill: ["code-review"] };
  const effectiveTools = { mcp: ["docs"], skill: [...configuredTools.skill, ...roleSkills].sort() };
  const persisted = {
    snapshotId: "snapshot-v2",
    runtime: "codex",
    requested: effectiveTools,
    synced: effectiveTools,
    dispatch_gate: { dispatchReady: true, status: "ready" },
  };
  const snapshotPath = path.join(reportRoot, "runtime-tool-snapshot.json");
  fs.writeFileSync(snapshotPath, JSON.stringify(persisted, null, 2));
  const identity = { projectName: "alpha", groupId: "", exactSessionId: "pchat-alpha", taskId: task.id, taskAgentSessionId: "tas-v2", nativeGeneration: 2, runtime: "codex" };
  const core = {
    schema: "ccm-runtime-tool-authorization-snapshot-v2",
    snapshotId: persisted.snapshotId,
    catalogRevision: "catalog-v2",
    configuredTools,
    executionRoleSkills: roleSkills,
    enforceExecutionRoleSkills: true,
    effectiveTools,
    scopeIdentity: identity,
  };
  const snapshot = {
    ...core,
    authorizationSignature: signInternalMcpEvidence(core),
    snapshotPath,
    runtime: "codex",
    allowedTools: effectiveTools,
    dispatchGate: persisted.dispatch_gate,
  };
  const request = {
    projectName: "alpha",
    groupId: "",
    groupSessionId: "",
    projectSessionId: "pchat-alpha",
    taskId: task.id,
    taskAgentSessionId: "tas-v2",
    agentSession: { id: "tas-v2", nativeGeneration: 2 },
    agentType: "codex",
    allowedTools: effectiveTools,
    runtimeToolSnapshot: snapshot,
    runtimeToolDispatchGate: persisted.dispatch_gate,
    runtimeToolSnapshotRequired: true,
  };
  const options = {
    skipReadinessProbe: true,
    loadTask: id => id === task.id ? task : null,
    loadCurrentToolScope: () => ({ ok: true, tools: configuredTools, scope: { scope: "project", projectName: "alpha" } }),
  };
  const accepted = runner.validateExternalRunnerRuntimeToolGate(request, options);
  assert.equal(accepted.ok, true, accepted.reason);

  const forgedCore = { ...core, executionRoleSkills: roleSkills.filter(name => name !== "ccm-incident-diagnosis"), effectiveTools: { ...effectiveTools, skill: effectiveTools.skill.filter(name => name !== "ccm-incident-diagnosis") } };
  fs.writeFileSync(snapshotPath, JSON.stringify({ ...persisted, requested: forgedCore.effectiveTools, synced: forgedCore.effectiveTools }, null, 2));
  const forged = runner.validateExternalRunnerRuntimeToolGate({
    ...request,
    allowedTools: forgedCore.effectiveTools,
    runtimeToolSnapshot: { ...snapshot, ...forgedCore, allowedTools: forgedCore.effectiveTools, authorizationSignature: signInternalMcpEvidence(forgedCore) },
  }, options);
  assert.equal(forged.ok, false);
  assert.match(forged.reason, /角色Skill/);
  fs.writeFileSync(snapshotPath, JSON.stringify(persisted, null, 2));

  const drift = runner.validateExternalRunnerRuntimeToolGate(request, {
    ...options,
    loadCurrentToolScope: () => ({ ok: true, tools: { mcp: [], skill: [] }, scope: { scope: "project", projectName: "alpha" } }),
  });
  assert.equal(drift.ok, false);
  assert.match(drift.reason, /配置已变化/);

  const wrongSession = runner.validateExternalRunnerRuntimeToolGate({ ...request, projectSessionId: "pchat-other" }, options);
  assert.equal(wrongSession.ok, false);
  assert.match(wrongSession.reason, /不匹配/);

  const projectMainSource = fs.readFileSync(path.join(repoRoot, "backend", "modules", "projects", "project-main-agent.ts"), "utf-8");
  assert.match(projectMainSource, /hydrateProjectConfiguredTools/);
  assert.match(projectMainSource, /configuredToolContext\.skillPrompt/);
  assert.match(projectMainSource, /executionSkills: roleSkills\.names/);

  console.log(JSON.stringify({
    pass: true,
    checks: {
      projectMainConfiguredSkillRegistered: true,
      projectMainReadOnlyMcpRegistered: true,
      projectMainWriteMcpHidden: true,
      projectMainSkillAndMcpInvoked: true,
      childConfiguredAndRoleSkillsAccepted: true,
      forgedRoleSkillRejected: true,
      configuredScopeDriftRejected: true,
      exactSessionMismatchRejected: true,
    },
  }, null, 2));
} finally {
  toolManager.getScopedToolCatalog = originalCatalog;
  toolManager.buildScopeAudit = originalAudit;
}
