import assert from "node:assert/strict";

const llm = await import("../ccm-package/dist/modules/collaboration/group-orchestrator-llm.js");
const { toolManager } = await import("../ccm-package/dist/tools/tool-manager.js");
const { buildModelVisiblePayloadSnapshot } = await import("../ccm-package/dist/system/session-compaction-core.js");

const originalCatalog = toolManager.getScopedToolCatalog.bind(toolManager);
const originalAudit = toolManager.buildScopeAudit.bind(toolManager);

try {
  toolManager.getScopedToolCatalog = scope => ({
    tools: [
      {
        name: "search_records",
        canonicalName: "mcp__ccm__docs__search_records",
        description: "Search approved group records",
        server: "docs",
        inputSchema: { type: "object", properties: { query: { type: "string" } } },
        annotations: { readOnlyHint: true },
      },
      {
        name: "update_record",
        canonicalName: "mcp__ccm__docs__update_record",
        description: "Update a record",
        server: "docs",
        inputSchema: { type: "object" },
        annotations: { destructiveHint: false },
      },
    ].filter(tool => (scope?.mcp || []).some(grant => String(grant).startsWith("docs"))),
    skills: (scope?.skill || []).map(name => ({ name, description: `Skill ${name}`, contentHash: `hash-${name}`, toolName: "invoke_skill" })),
  });
  toolManager.buildScopeAudit = scope => ({
    mcp: (scope?.mcp || []).map(raw => ({ raw, server: "docs", state: "available" })),
    skills: (scope?.skill || []).map(name => ({ name, state: "available" })),
    missing_mcp_servers: [],
    missing_mcp_tools: [],
    missing_skills: [],
  });

  const group = {
    id: "group-a",
    name: "Group A",
    tools: { mcp: ["docs"], skill: ["requirements-review"] },
    members: [
      { project: "Group Orchestrator", role: "coordinator" },
      { project: "web", role: "worker", agent: "codex" },
    ],
  };
  const toolContext = llm.buildGroupMainAgentToolContext({
    group,
    message: "请根据共享需求文档检查接口并分派实现",
    source: "group-chat",
    groupSessionId: "gcs_a",
  });
  assert.equal(toolContext.scope.groupId, undefined);
  assert.equal(toolContext.scope.auditContext.groupId, "group-a");
  assert.ok(toolContext.scope.skill.includes("requirements-review"));
  assert.ok(toolContext.catalog.mcp.some(tool => tool.canonicalName === "mcp__ccm__docs__search_records"));
  assert.ok(!toolContext.catalog.mcp.some(tool => tool.canonicalName === "mcp__ccm__docs__update_record"));
  assert.ok(toolContext.catalog.rejectedMcp.some(tool => tool.canonicalName === "mcp__ccm__docs__update_record"));

  const messages = llm.buildLlmCoordinatorMessages({
    group,
    message: "请根据共享需求文档检查接口并分派实现",
    sharedFilesContext: "shared-contract.md: GET /v1/items",
    source: "group-chat",
    groupSessionId: "gcs_a",
  });
  const prompt = messages.map(message => message.content).join("\n");
  assert.match(prompt, /shared-contract\.md: GET \/v1\/items/);
  assert.match(prompt, /mcp__ccm__docs__search_records/);
  assert.match(prompt, /requirements-review/);
  assert.doesNotMatch(prompt, /canonicalName.*mcp__ccm__docs__update_record/);

  const components = llm.buildLlmCoordinatorContextComponents({ group, message: "请检查接口", source: "group-chat" });
  assert.match(components.mcpTools, /search_records/);
  assert.match(components.skills, /requirements-review/);

  const hydratedInput = {
    group,
    message: "请检查接口",
    source: "group-chat",
    groupSessionId: "gcs_a",
    mainAgentToolResults: [{ name: "mcp__ccm__docs__search_records", ok: true, output: "GET /v1/items" }],
  };
  const hydratedMessages = llm.buildLlmCoordinatorMessages(hydratedInput);
  const hydratedComponents = llm.buildLlmCoordinatorContextComponents(hydratedInput);
  const hydratedSnapshot = buildModelVisiblePayloadSnapshot({
    scope: "group",
    sessionId: "group-a:gcs_a",
    system: hydratedMessages.filter(message => message.role === "system"),
    recentMessages: hydratedMessages.filter(message => message.role !== "system"),
    contextComponents: hydratedComponents,
  });
  assert.ok(hydratedSnapshot.tokenBreakdown.mcpTools > 0);
  assert.ok(hydratedSnapshot.tokenBreakdown.mcpResults > 0);
  assert.ok(hydratedSnapshot.tokenBreakdown.recentMessages > 0);

  const normalized = llm.normalizeGroupMainToolRequests([
    { name: "mcp__ccm__docs__search_records", arguments: { query: "api" }, reason: "查接口" },
    { name: "mcp__ccm__docs__search_records", arguments: { query: "api" }, reason: "重复" },
    { name: "invoke_skill", arguments: { name: "requirements-review", input: "review" }, reason: "核对规则" },
    { name: "mcp__ccm__docs__other", arguments: {}, reason: "超过上限" },
  ]);
  assert.equal(normalized.length, 2);

  const executed = [];
  const allowedResults = await llm.executeGroupMainAgentToolRequests({
    requests: normalized,
    toolContext,
    executeToolCall: async (name, args, scope) => {
      executed.push({ name, args, scope });
      return name === "invoke_skill" ? "skill instructions" : "GET /v1/items requires auth";
    },
  });
  assert.equal(allowedResults.length, 2);
  assert.ok(allowedResults.every(row => row.ok));
  assert.ok(executed.every(row => row.scope.auditContext.groupId === "group-a"));

  const deniedResults = await llm.executeGroupMainAgentToolRequests({
    requests: [
      { name: "mcp__ccm__docs__update_record", arguments: {}, reason: "write" },
      { name: "mcp__ccm__other__search_records", arguments: {}, reason: "sibling" },
    ],
    toolContext,
    executeToolCall: async () => { throw new Error("unauthorized tool was executed"); },
  });
  assert.ok(deniedResults.every(row => row.ok === false && row.error === "GROUP_MAIN_TOOL_NOT_AUTHORIZED"));

  const oversized = await llm.executeGroupMainAgentToolRequests({
    requests: [{ name: "mcp__ccm__docs__search_records", arguments: {}, reason: "large" }],
    toolContext,
    executeToolCall: async () => "x".repeat(40_000),
  });
  assert.equal(oversized[0].error, "GROUP_MAIN_TOOL_RESULT_EXCEEDS_8K_TOKEN_BUDGET");

  const sibling = llm.buildGroupMainAgentToolContext({
    group: { id: "group-b", tools: { mcp: [], skill: [] }, members: [] },
    message: "你好",
    source: "group-chat",
    groupSessionId: "gcs_b",
  });
  assert.equal(sibling.catalog.mcp.length, 0);
  assert.ok(!sibling.scope.mcp.includes("docs"));

  console.log(JSON.stringify({
    pass: true,
    checks: {
      groupConfiguredSkillAvailable: true,
      sharedFilesVisibleToMainAgent: true,
      readOnlyMcpVisible: true,
      mutatingMcpHidden: true,
      exactGroupScopeBound: true,
      unauthorizedCallsBlocked: true,
      duplicateRequestsDeduplicated: true,
      resultBudgetFailClosed: true,
      siblingGroupIsolated: true,
      contextComponentsClassified: true,
      dynamicMcpResultsClassified: true,
    },
  }, null, 2));
} finally {
  toolManager.getScopedToolCatalog = originalCatalog;
  toolManager.buildScopeAudit = originalAudit;
}
