import * as crypto from "crypto";
import { estimateTextTokens } from "../system/context-budget";
import { normalizeToolAuthorization, type ToolGrantSet } from "./tool-authorization";
import { toolManager, type ToolScope } from "./tool-manager";
import type { LoadedContextItemsV1 } from "../system/session-compaction-core";
import {
  WORKSPACE_READONLY_TOOL_DEFINITIONS_V2,
  executeWorkspaceReadonlyTool,
  sealScopedToolCapability,
  type MainAgentScopeKind,
} from "./workspace-readonly-tools";
import {
  recordMainAgentToolContinuityFromResult,
  resolveMainAgentContinuityIdentity,
  restoreMainAgentPostCompactContext,
  type MainAgentContinuityIdentityV1,
  type PostCompactToolRestoreReceipt,
} from "../system/main-agent-post-compact-continuity";
import {
  buildDynamicSkillCatalogPrompt,
  estimateMcpToolDefinitionTokens,
  readMainAgentContextPolicy,
  resolveMcpToolLoadingDecision,
  type MainAgentContextPolicy,
} from "./main-agent-context-policy";
import { recordToolSearchSuccess, searchTools } from "./tool-search-index";
import { executeSkillFork } from "../system/skill-fork-runtime";
import { boundedToolResultLimit, MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR } from "./cc-tool-result-limits";

export type MainAgentToolRequest = {
  name: string;
  arguments: any;
  reason: string;
};

export type MainAgentToolRuntimeContext = {
  schema: "ccm-main-agent-tool-runtime-context-v2";
  scope: ToolScope;
  configured: ToolGrantSet;
  executionSkills: string[];
  effective: ToolGrantSet;
  catalog: { mcp: any[]; loadedMcp?: any[]; skills: any[]; rejectedMcp: any[]; discoverableMcp?: any[]; native?: any[] };
  toolAudit: any;
  mcpPrompt: string;
  skillPrompt: string;
  policyPrompt: string;
  checksum: string;
  version?: 2;
  capabilityToken?: string;
  loadedToolNames?: string[];
  deferredToolNames?: string[];
  scopeIdentity?: MainAgentContinuityIdentityV1;
  restoredSkillAttachments?: any[];
  postCompactRestoreReceipt?: PostCompactToolRestoreReceipt;
  contextPolicy?: MainAgentContextPolicy;
  contextBudget?: any;
};

export type MainAgentNativeToolV2 = {
  name: string;
  description: string;
  loadPolicy: "base" | "conditional";
  sideEffect: "none" | "orchestrator_control";
};

export const MAIN_AGENT_NATIVE_TOOLS_V2: MainAgentNativeToolV2[] = [
  { name: "ask_user_question", description: "向当前精确会话提出结构化澄清问题。", loadPolicy: "base", sideEffect: "orchestrator_control" },
  { name: "update_todo", description: "更新当前Run的计划步骤和进度。", loadPolicy: "base", sideEffect: "orchestrator_control" },
  { name: "enter_plan_mode", description: "进入计划制定或修订阶段。", loadPolicy: "base", sideEffect: "orchestrator_control" },
  { name: "exit_plan_mode", description: "提交计划并进入现有确认或派发门禁。", loadPolicy: "base", sideEffect: "orchestrator_control" },
  { name: "invoke_skill", description: "加载并调用当前作用域已授权的Skill。", loadPolicy: "base", sideEffect: "none" },
  { name: "tool_search", description: "按需发现并加载低频只读工具Schema。", loadPolicy: "base", sideEffect: "none" },
  { name: "list_mcp_resources", description: "列出当前作用域已授权MCP的资源能力。", loadPolicy: "conditional", sideEffect: "none" },
  { name: "read_mcp_resource", description: "读取当前作用域已授权的精确MCP资源。", loadPolicy: "conditional", sideEffect: "none" },
  { name: "dispatch_task", description: "通过现有队列和权限门禁分派任务。", loadPolicy: "conditional", sideEffect: "orchestrator_control" },
  { name: "get_task_status", description: "读取当前作用域任务状态。", loadPolicy: "conditional", sideEffect: "none" },
  { name: "stop_task", description: "通过现有取消门禁停止任务。", loadPolicy: "conditional", sideEffect: "orchestrator_control" },
];

function uniqueNames(values: any[] = []) {
  return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)));
}

export function isMainAgentReadOnlyMcpTool(tool: any) {
  const annotations = tool?.annotations && typeof tool.annotations === "object" ? tool.annotations : {};
  if (annotations.destructiveHint === true || annotations.readOnlyHint === false) return false;
  const name = String(tool?.name || "").trim();
  if (!name) return false;
  const trust = String(tool?.serverTrust || "").trim().toLowerCase();
  return annotations.readOnlyHint === true
    && !["blocked", "denied", "untrusted"].includes(trust);
}

export function buildMainAgentToolRuntimeContext(input: {
  configuredTools?: any;
  executionSkills?: string[];
  auditContext?: ToolScope["auditContext"];
  mcpPolicy?: "read_only" | "all";
  label?: string;
  scopeIdentity?: {
    scope: MainAgentScopeKind;
    scopeId: string;
    exactSessionId: string;
    allowedProjects?: string[];
    generation?: number;
  };
  loadedToolNames?: string[];
  contextPolicy?: any;
  contextWindow?: number;
  currentUserInput?: any;
  contextReservedTokens?: { system?: number; summary?: number; output?: number; safety?: number };
}): MainAgentToolRuntimeContext {
  const contextPolicy = readMainAgentContextPolicy(input.contextPolicy || {});
  const contextWindow = Math.max(32_000, Math.floor(Number(input.contextWindow || 200_000)));
  const configured = normalizeToolAuthorization(input.configuredTools || {});
  const executionSkills = uniqueNames(input.executionSkills || []);
  const effective = normalizeToolAuthorization({
    mcp: configured.mcp,
    skill: uniqueNames([...configured.skill, ...executionSkills]),
  });
  const scope: ToolScope = { ...effective, auditContext: input.auditContext || {} };
  const scoped = toolManager.getScopedToolCatalog(scope);
  const readOnly = input.mcpPolicy !== "all";
  const continuityIdentity = input.scopeIdentity ? resolveMainAgentContinuityIdentity({
    agentKind: input.scopeIdentity.scope,
    scope: input.scopeIdentity.scope,
    scopeId: input.scopeIdentity.scopeId,
    exactSessionId: input.scopeIdentity.exactSessionId,
    generation: Number(input.scopeIdentity.generation || 0),
  }) : undefined;
  const skillCatalogTargetTokens = Math.max(1, Math.floor(contextWindow * contextPolicy.skillCatalogBudgetPercent / 100));
  const contextSourceCatalogTargetTokens = Math.max(1, Math.floor(contextWindow * contextPolicy.contextSourceCatalogBudgetPercent / 100));
  const contextSourceHydrationNominalTokens = Math.max(1, Math.floor(contextWindow * contextPolicy.contextSourceHydrationBudgetPercent / 100));
  const reserveInput = input.contextReservedTokens || {};
  const reservedTokenBudget = {
    system: Math.max(0, Math.floor(Number(reserveInput.system ?? 4_000))),
    summary: Math.max(0, Math.floor(Number(reserveInput.summary ?? 4_000))),
    currentUser: estimateTextTokens(typeof input.currentUserInput === "string" ? input.currentUserInput : JSON.stringify(input.currentUserInput ?? "")),
    output: Math.max(0, Math.floor(Number(reserveInput.output ?? Math.max(4_096, Math.min(16_000, contextWindow * 0.05))))),
    safety: Math.max(0, Math.floor(Number(reserveInput.safety ?? Math.max(2_048, contextWindow * 0.02)))),
  };
  const fixedReservedTokens = Object.values(reservedTokenBudget).reduce((sum, value) => sum + value, 0);
  const dynamicRestoreCapacity = Math.max(0, contextWindow - fixedReservedTokens - skillCatalogTargetTokens - contextSourceCatalogTargetTokens);
  let restored = continuityIdentity
    ? restoreMainAgentPostCompactContext({
        identity: continuityIdentity,
        scope,
        maxPerSkillTokens: contextPolicy.postCompactSkillPerItemMaxTokens,
        maxTotalSkillTokens: Math.min(contextPolicy.postCompactSkillTotalMaxTokens, dynamicRestoreCapacity),
        maxTotalMcpSchemaTokens: dynamicRestoreCapacity,
      })
    : null;
  if (continuityIdentity && restored) {
    const skillCapacityAfterMcp = Math.max(0, dynamicRestoreCapacity - Number(restored.receipt.restoredMcpSchemaTokens || 0));
    if (Number(restored.receipt.restoredSkillTokens || 0) > skillCapacityAfterMcp) {
      restored = restoreMainAgentPostCompactContext({
        identity: continuityIdentity,
        scope,
        maxPerSkillTokens: contextPolicy.postCompactSkillPerItemMaxTokens,
        maxTotalSkillTokens: Math.min(contextPolicy.postCompactSkillTotalMaxTokens, skillCapacityAfterMcp),
        maxTotalMcpSchemaTokens: dynamicRestoreCapacity,
      });
    }
  }
  const capabilityToken = input.scopeIdentity ? sealScopedToolCapability({
    scope: input.scopeIdentity.scope,
    scopeId: input.scopeIdentity.scopeId,
    exactSessionId: input.scopeIdentity.exactSessionId,
    generation: Number(continuityIdentity?.generation || input.scopeIdentity.generation || 0),
    allowedProjects: input.scopeIdentity.allowedProjects || [],
  }) : "";
  const workspaceBase = capabilityToken ? WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.filter(tool => tool.loadPolicy === "base") : [];
  const workspaceSearch = capabilityToken ? WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.filter(tool => tool.loadPolicy === "search") : [];
  const configuredMcp = readOnly ? scoped.tools.filter(isMainAgentReadOnlyMcpTool) : scoped.tools;
  const requestedLoaded = new Set(uniqueNames([
    ...(input.loadedToolNames || []),
    ...(restored?.loadedToolNames || []),
  ]));
  const configuredAlwaysLoaded = configuredMcp.filter((tool: any) => tool?.alwaysLoad === true);
  const configuredPreviouslyLoaded = configuredMcp.filter((tool: any) => requestedLoaded.has(String(tool?.canonicalName || "")) || requestedLoaded.has(String(tool?.name || "")));
  const loadedConfiguredNames = new Set([...configuredAlwaysLoaded, ...configuredPreviouslyLoaded].map((tool: any) => String(tool?.canonicalName || "")));
  const workspacePreviouslyLoaded = workspaceSearch.filter((tool: any) => requestedLoaded.has(String(tool?.canonicalName || "")) || requestedLoaded.has(String(tool?.name || "")));
  const loadedWorkspaceNames = new Set(workspacePreviouslyLoaded.map((tool: any) => String(tool?.canonicalName || tool?.name || "")));
  const optionalMcp = [
    ...workspaceSearch.filter((tool: any) => !loadedWorkspaceNames.has(String(tool?.canonicalName || tool?.name || ""))),
    ...configuredMcp.filter((tool: any) => !loadedConfiguredNames.has(String(tool?.canonicalName || ""))),
  ];
  const optionalMcpTokens = optionalMcp.reduce((sum, tool) => sum + estimateMcpToolDefinitionTokens(tool), 0);
  const mcpLoading = resolveMcpToolLoadingDecision(contextPolicy, contextWindow, optionalMcpTokens);
  const autoThresholdTokens = mcpLoading.autoThresholdTokens;
  const priorityMcp = [
    ...workspaceBase,
    ...workspacePreviouslyLoaded,
    ...configuredMcp.filter((tool: any) => loadedConfiguredNames.has(String(tool?.canonicalName || ""))),
  ];
  const priorityMcpTokens = priorityMcp.reduce((sum, tool) => sum + estimateMcpToolDefinitionTokens(tool), 0);
  const finalInlineTokens = fixedReservedTokens
    + skillCatalogTargetTokens
    + contextSourceCatalogTargetTokens
    + Number(restored?.receipt?.restoredSkillTokens || 0)
    + priorityMcpTokens
    + optionalMcpTokens;
  const inlineSafetyDowngraded = mcpLoading.safetyDowngraded || (mcpLoading.inline && finalInlineTokens > contextWindow);
  const loadOptionalMcp = mcpLoading.inline && !inlineSafetyDowngraded;
  const mcp = [
    ...workspaceBase,
    ...workspacePreviouslyLoaded,
    ...configuredMcp.filter((tool: any) => loadedConfiguredNames.has(String(tool?.canonicalName || ""))),
    ...(loadOptionalMcp ? optionalMcp : []),
  ];
  const discoverableMcp = loadOptionalMcp ? [] : optionalMcp;
  const rejectedMcp = readOnly ? scoped.tools.filter(tool => !isMainAgentReadOnlyMcpTool(tool)) : [];
  const toolAudit = toolManager.buildScopeAudit(scope);
  const label = String(input.label || "主 Agent");
  const nativePrompt = [
    `${label}原生控制工具：`,
    ...MAIN_AGENT_NATIVE_TOOLS_V2.filter(tool => tool.loadPolicy === "base").map(tool => `- ${tool.name}: ${tool.description}`),
    "ask_user_question、update_todo、enter_plan_mode和exit_plan_mode由本轮结构化responseType/plan字段驱动，不要把它们放进toolRequests；invoke_skill与tool_search才通过toolRequests进入工具循环。",
  ].join("\n");
  const mcpPrompt = mcp.length ? [
    `${label}已授权的${readOnly ? "只读" : ""} MCP 工具（必须使用 canonicalName）：`,
    ...mcp.map(tool => `- ${tool.canonicalName}: ${tool.description || tool.name}; 参数 Schema=${JSON.stringify(tool.inputSchema || {})}`),
  ].join("\n") : "";
  const deferredMcpPrompt = discoverableMcp.length ? [
    `${label}已授权但尚未加载 Schema 的 MCP/低频工具：`,
    ...discoverableMcp.map(tool => `- ${tool.canonicalName || tool.name}`),
    "这些名称仅用于发现，不代表 Schema 已进入本轮上下文。调用前必须先使用 tool_search；tool_search 返回的完整 Schema 会保留在当前 Run 的后续轮次。",
  ].join("\n") : "";
  const skillCatalog = buildDynamicSkillCatalogPrompt({
    label,
    skills: scoped.skills,
    contextWindow,
    budgetPercent: contextPolicy.skillCatalogBudgetPercent,
    recentlyInvokedSkillNames: restored?.skillAttachments?.map((item: any) => String(item?.name || "")) || [],
  });
  const skillPrompt = skillCatalog.prompt;
  const unavailable = [
    ...(Array.isArray(toolAudit?.missing_mcp_servers) ? toolAudit.missing_mcp_servers : []),
    ...(Array.isArray(toolAudit?.missing_mcp_tools) ? toolAudit.missing_mcp_tools : []),
    ...(Array.isArray(toolAudit?.missing_skills) ? toolAudit.missing_skills : []),
  ];
  const policyPrompt = [
    nativePrompt,
    mcpPrompt,
    deferredMcpPrompt,
    skillPrompt,
    restored?.renderedSkillAttachments || "",
    rejectedMcp.length ? `以下 MCP 可能写入或产生副作用，不向${label}开放：${rejectedMcp.map(tool => tool.canonicalName).join(", ")}` : "",
    unavailable.length ? "部分已配置工具当前不可用；不得声称已经调用。" : "",
    discoverableMcp.length ? `延迟工具不会预先占用完整 Schema Token；需要时先调用 tool_search，按名称或能力描述加载。` : "",
    inlineSafetyDowngraded ? `MCP完整定义超过本轮安全容量，已从${contextPolicy.mcpToolLoadingMode}安全降级为deferred。` : "",
    `需要工具数据时在 toolRequests 中请求。MCP优先使用上面列出的 canonicalName；CCM内部只读工具也接受短名称。Skill只能使用 invoke_skill，并在 arguments.name 中填写已列出的 Skill。工具结果由CCM执行后重新交给模型，不得把请求本身视为完成。`,
  ].filter(Boolean).join("\n\n");
  const contextBudget = {
    contextWindow,
    reservedTokenBudget,
    fixedReservedTokens,
    dynamicRestoreCapacity,
    mcpLoadingMode: contextPolicy.mcpToolLoadingMode,
    mcpOptionalDefinitionTokens: optionalMcpTokens,
    mcpAutoThresholdTokens: autoThresholdTokens,
    mcpInline: loadOptionalMcp,
    mcpSafetyDowngraded: inlineSafetyDowngraded,
    skillCatalogTargetTokens: skillCatalog.targetTokens,
    skillCatalogActualTokens: skillCatalog.actualTokens,
    skillCatalogNameOnlyTokens: skillCatalog.nameOnlyTokens,
    skillCatalogBudgetOverrun: skillCatalog.budgetOverrun,
    skillCatalogDescribedCount: skillCatalog.describedCount,
    skillCatalogNameOnlyCount: skillCatalog.nameOnlyCount,
    contextSourceCatalogTargetTokens,
    contextSourceHydrationTargetTokens: Math.min(contextSourceHydrationNominalTokens, Math.max(0, contextWindow - finalInlineTokens)),
    postCompactSourcePerItemMaxTokens: contextPolicy.postCompactSourcePerItemMaxTokens,
    postCompactSourceTotalMaxTokens: Math.min(contextPolicy.postCompactSourceTotalMaxTokens, Math.max(0, contextWindow - finalInlineTokens)),
    restoredSkillTokens: Number(restored?.receipt?.restoredSkillTokens || 0),
    restoredMcpSchemaTokens: Number(restored?.receipt?.restoredMcpSchemaTokens || 0),
    priorityMcpSchemaTokens: priorityMcpTokens,
    finalSafetyRemainingTokens: Math.max(0, contextWindow - fixedReservedTokens - skillCatalog.actualTokens - contextSourceCatalogTargetTokens - Number(restored?.receipt?.restoredSkillTokens || 0) - priorityMcpTokens - (loadOptionalMcp ? optionalMcpTokens : 0)),
  };
  const checksum = crypto.createHash("sha256").update(JSON.stringify({ effective, contextPolicy, contextBudget, mcp: mcp.map((row: any) => ({ name: row.canonicalName, checksum: row.checksum || "" })), discoverable: discoverableMcp.map((row: any) => ({ name: row.canonicalName, checksum: row.checksum || "" })), skills: scoped.skills.map(row => row.name), auditContext: scope.auditContext || {}, scopeIdentity: continuityIdentity || null, restore: restored?.receipt?.checksum || "" })).digest("hex");
  return {
    schema: "ccm-main-agent-tool-runtime-context-v2" as const,
    scope,
    configured,
    executionSkills,
    effective,
    catalog: {
      mcp: configuredMcp,
      loadedMcp: mcp,
      skills: scoped.skills,
      rejectedMcp,
      discoverableMcp,
      native: MAIN_AGENT_NATIVE_TOOLS_V2,
    },
    toolAudit,
    mcpPrompt: [mcpPrompt, deferredMcpPrompt].filter(Boolean).join("\n\n"),
    skillPrompt,
    policyPrompt,
    checksum,
    version: 2,
    capabilityToken,
    loadedToolNames: mcp.map(row => String(row.canonicalName || row.name || "")).filter(Boolean),
    deferredToolNames: discoverableMcp.map(row => String(row.canonicalName || row.name || "")).filter(Boolean),
    scopeIdentity: continuityIdentity,
    restoredSkillAttachments: restored?.skillAttachments || [],
    postCompactRestoreReceipt: restored?.receipt,
    contextPolicy,
    contextBudget,
  };
}

function refreshMainAgentToolPromptState(toolContext: MainAgentToolRuntimeContext) {
  const label = String((toolContext.scope.auditContext as any)?.runtime || "主 Agent");
  const loadedMcp = toolContext.catalog.loadedMcp || toolContext.catalog.mcp;
  const loadedPrompt = loadedMcp.length ? [
    `${label}当前已加载 Schema 的 MCP 工具（必须使用 canonicalName）：`,
    ...loadedMcp.map((tool: any) => `- ${tool.canonicalName}: ${tool.description || tool.name}; 参数 Schema=${JSON.stringify(tool.inputSchema || {})}`),
  ].join("\n") : "";
  const deferredPrompt = (toolContext.catalog.discoverableMcp || []).length ? [
    `${label}已授权但尚未加载 Schema 的 MCP/低频工具：`,
    ...(toolContext.catalog.discoverableMcp || []).map((tool: any) => `- ${tool.canonicalName || tool.name}`),
    "调用前必须先使用 tool_search 加载完整功能说明和参数 Schema。",
  ].join("\n") : "";
  toolContext.mcpPrompt = [loadedPrompt, deferredPrompt].filter(Boolean).join("\n\n");
  toolContext.loadedToolNames = uniqueNames(loadedMcp.map((tool: any) => tool.canonicalName || tool.name));
  toolContext.deferredToolNames = uniqueNames((toolContext.catalog.discoverableMcp || []).map((tool: any) => tool.canonicalName || tool.name));
  const marker = "[CCM ToolSearch 本轮已加载 Schema]";
  toolContext.policyPrompt = `${String(toolContext.policyPrompt || "").split(marker)[0].trim()}\n\n${marker}\n${toolContext.mcpPrompt}`.trim();
}

export function normalizeMainAgentToolRequests(value: any, limit = 32): MainAgentToolRequest[] {
  const rows = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const result: MainAgentToolRequest[] = [];
  for (const row of rows) {
    const name = String(row?.name || "").trim();
    if (!name) continue;
    const args = row?.arguments && typeof row.arguments === "object" ? row.arguments : {};
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify({ name, args })).digest("hex");
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push({ name, arguments: args, reason: String(row?.reason || "").trim().slice(0, 240) });
    if (result.length >= limit) break;
  }
  return result;
}

export function mainAgentToolRequestFingerprint(request: MainAgentToolRequest) {
  return crypto.createHash("sha256").update(JSON.stringify({ name: request.name, arguments: request.arguments || {} })).digest("hex");
}

function contextItemChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function buildMainAgentLoadedContextItems(
  toolContext: MainAgentToolRuntimeContext,
  results: any[] = [],
  additionalSkills: Array<{ name: string; contentHash?: string; checksum?: string; loadLevel?: "catalog" | "body" }> = [],
): LoadedContextItemsV1 {
  const skills = [
    ...toolContext.catalog.skills.map((skill: any) => ({
      kind: "skill" as const,
      name: String(skill?.name || ""),
      aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
      loadLevel: "catalog" as const,
      checksum: String(skill?.contentHash || contextItemChecksum({ name: skill?.name, description: skill?.description })),
      loadSource: "catalog" as const,
      tokens: estimateTextTokens(JSON.stringify({ name: skill?.name || "", description: skill?.description || "" })),
    })),
    ...additionalSkills.map(skill => ({
      kind: "skill" as const,
      name: String(skill?.name || ""),
      aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
      loadLevel: skill?.loadLevel === "catalog" ? "catalog" as const : "body" as const,
      checksum: String(skill?.contentHash || skill?.checksum || contextItemChecksum({ name: skill?.name })),
      loadSource: "same_run" as const,
    })),
    ...(toolContext.restoredSkillAttachments || []).map((skill: any) => ({
      kind: "skill" as const,
      name: String(skill?.name || ""),
      aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
      loadLevel: "body" as const,
      checksum: String(skill?.contentHash || contextItemChecksum({ name: skill?.name })),
      loadSource: "post_compact_restored" as const,
      tokens: Math.max(0, Number(skill?.tokenCount || 0)),
    })),
    ...(Array.isArray(results) ? results : []).filter((row: any) => row?.toolKind === "skill" && row?.ok === true).map((row: any) => {
      let parsed: any = null;
      try { parsed = typeof row?.output === "string" ? JSON.parse(row.output) : row?.output; } catch {}
      const result = parsed?.result && typeof parsed.result === "object" ? parsed.result : parsed;
      return {
        kind: "skill" as const,
        name: String(row?.itemName || result?.name || row?.name || ""),
        aliases: Array.isArray(row?.aliases) ? row.aliases : [],
        loadLevel: "body" as const,
        checksum: String(result?.contentHash || row?.resultChecksum || contextItemChecksum(row?.output)),
        loadSource: "same_run" as const,
        tokens: Math.max(0, Number(row?.outputTokens || 0)),
      };
    }),
  ].filter(item => item.name);
  const mcp = (toolContext.catalog.loadedMcp || toolContext.catalog.mcp).map((tool: any) => ({
    kind: "mcp" as const,
    name: String(tool?.canonicalName || tool?.name || ""),
    aliases: [
      String(tool?.canonicalName || ""),
      String(tool?.server || ""),
      tool?.server && tool?.name ? `${tool.server}/${tool.name}` : "",
      String(tool?.name || ""),
    ].filter(Boolean),
    loadLevel: "schema" as const,
    checksum: contextItemChecksum({
      canonicalName: tool?.canonicalName || tool?.name,
      server: tool?.server,
      inputSchema: tool?.inputSchema || null,
      annotations: tool?.annotations || {},
    }),
    loadSource: toolContext.postCompactRestoreReceipt?.loadedToolNames?.includes(String(tool?.canonicalName || tool?.name || ""))
      ? "post_compact_restored" as const
      : tool?.alwaysLoad === true ? "always_load" as const : "same_run" as const,
    tokens: estimateTextTokens(JSON.stringify({ description: tool?.description || "", inputSchema: tool?.inputSchema || null })),
  })).filter(item => item.name);
  const invocations = (Array.isArray(results) ? results : []).map((row: any) => ({
    kind: row?.toolKind === "skill" ? "skill" as const : "mcp" as const,
    name: String(row?.itemName || row?.name || ""),
    aliases: Array.isArray(row?.aliases) ? row.aliases.map((value: any) => String(value || "")).filter(Boolean) : [],
    ok: row?.ok === true,
    resultChecksum: String(row?.resultChecksum || contextItemChecksum(row?.output ?? row?.error ?? null)),
  })).filter(item => item.name);
  return { schema: "ccm-loaded-context-items-v1", skills, mcp, invocations };
}

export async function executeMainAgentToolRequests(input: {
  requests: MainAgentToolRequest[];
  toolContext: MainAgentToolRuntimeContext;
  executeToolCall?: (name: string, args: any, scope?: ToolScope) => Promise<any>;
  onUse?: (request: MainAgentToolRequest) => string | void;
  onResult?: (request: MainAgentToolRequest, callId: string, output: any, error?: string) => void;
  resultTokenLimit?: number;
  toolBatchSize?: number;
  readOnlyParallelism?: number;
}) {
  const loadedMcp = input.toolContext.catalog.loadedMcp || input.toolContext.catalog.mcp;
  const workspaceTools = [...input.toolContext.catalog.mcp, ...loadedMcp, ...(input.toolContext.catalog.discoverableMcp || [])]
    .filter((tool: any) => tool?.server === "ccm__workspace_readonly");
  const workspaceByName = new Map<string, any>();
  for (const tool of workspaceTools) {
    workspaceByName.set(String(tool.name || ""), tool);
    workspaceByName.set(String(tool.canonicalName || ""), tool);
  }
  const allowedMcp = new Set(loadedMcp.map(tool => tool.canonicalName));
  const allowedSkills = new Set(input.toolContext.catalog.skills.map(skill => skill.name));
  const execute = input.executeToolCall || ((name: string, args: any, scope?: ToolScope) => toolManager.executeToolCall(name, args, scope));
  const batchSize = Math.max(1, Math.min(8, Math.floor(Number(input.toolBatchSize || 2))));
  const readOnlyParallelism = Math.max(1, Math.min(8, Math.floor(Number(input.readOnlyParallelism || 2))));
  // `toolBatchSize` is a concurrency limit, not a limit on the number of
  // logical calls returned by one model turn. Keep the complete bounded turn
  // and drain it in safe batches so later independent calls are never lost.
  const requests = input.requests.slice(0, 32);

  const executeOne = async (request: MainAgentToolRequest) => {
    if (request.name === "tool_search") {
      const callId = input.onUse?.(request) || "";
      const rawQuery = String(request.arguments?.query || request.arguments?.name || "").trim();
      const discoverable = input.toolContext.catalog.discoverableMcp || [];
      const ranked = searchTools({ query: rawQuery, intent: request.reason, tools: discoverable, maxResults: request.arguments?.max_results || request.arguments?.maxResults || 12 });
      const candidates = ranked.map(item => item.tool);
      for (const tool of candidates) {
        if (!loadedMcp.some((row: any) => row.canonicalName === tool.canonicalName)) loadedMcp.push(tool);
      }
      const selectedNames = new Set(candidates.map((tool: any) => String(tool.canonicalName || "")));
      input.toolContext.catalog.discoverableMcp = discoverable.filter((tool: any) => !selectedNames.has(String(tool.canonicalName || "")));
      refreshMainAgentToolPromptState(input.toolContext);
      const output = { schema: "ccm-main-agent-tool-search-v2", query: rawQuery, tools: ranked.map((item: any) => ({ name: item.tool.name, canonicalName: item.tool.canonicalName, description: item.tool.description, inputSchema: item.tool.inputSchema, checksum: item.schemaChecksum, score: Number(item.score.toFixed(3)), matchReasons: item.reasons })) };
      recordMainAgentToolContinuityFromResult({
        identity: input.toolContext.scopeIdentity,
        requestName: request.name,
        requestArguments: request.arguments,
        loadedTools: candidates,
        eventId: String(callId || ""),
        sourceMessageId: String((input.toolContext.scope.auditContext as any)?.userMessageId || ""),
      });
      input.onResult?.(request, String(callId || ""), output);
      return { name: request.name, itemName: request.name, toolKind: "native", source: "native", loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: 0, aliases: ["tool_search"], ok: true, output: JSON.stringify(output), outputTokens: estimateTextTokens(JSON.stringify(output)), resultChecksum: contextItemChecksum(output), reason: request.reason };
    }
    const skillName = request.name === "invoke_skill" ? String(request.arguments?.name || "").trim() : "";
    const workspaceTool = workspaceByName.get(request.name);
    const toolKind = skillName ? "skill" : workspaceTool ? "internal_mcp" : "mcp";
    const itemName = skillName || workspaceTool?.name || request.name;
    const aliases = skillName
      ? [skillName, `skill:${skillName}`]
      : [request.name, ...input.toolContext.catalog.mcp
        .filter((tool: any) => tool?.canonicalName === request.name)
        .flatMap((tool: any) => [tool?.server, tool?.server && tool?.name ? `${tool.server}/${tool.name}` : "", tool?.name])]
        .map(value => String(value || ""))
        .filter(Boolean);
    const workspaceLoaded = workspaceTool && loadedMcp.some((tool: any) => tool.canonicalName === workspaceTool.canonicalName);
    const deferredTool = (input.toolContext.catalog.discoverableMcp || []).find((tool: any) => request.name === tool.canonicalName || request.name === tool.name);
    if (!(skillName ? allowedSkills.has(skillName) : workspaceTool ? workspaceLoaded : allowedMcp.has(request.name))) {
      const error = deferredTool ? "MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED" : "MAIN_AGENT_TOOL_NOT_AUTHORIZED";
      return { name: request.name, itemName, toolKind, aliases, ok: false, error, resultChecksum: contextItemChecksum(error), reason: request.reason };
    }
    const callId = String(input.onUse?.(request) || "");
    const startedAt = Date.now();
    try {
      let rawOutput = workspaceTool
        ? await executeWorkspaceReadonlyTool(workspaceTool.name, request.arguments, String(input.toolContext.capabilityToken || ""))
        : await execute(request.name, request.arguments, input.toolContext.scope);
      if (skillName && rawOutput?.executionMode === "fork") {
        const parentIdentity = input.toolContext.scopeIdentity;
        if (!parentIdentity) throw new Error("SKILL_FORK_REQUIRES_EXACT_SESSION_IDENTITY");
        rawOutput = await executeSkillFork({
          skill: rawOutput,
          parent: { scope: parentIdentity.scope, scopeId: parentIdentity.scopeId, exactSessionId: parentIdentity.exactSessionId, generation: parentIdentity.generation, turn: callId || startedAt },
          modelVisibleContext: input.toolContext.policyPrompt,
          tools: loadedMcp,
          executeTool: (name, args) => {
            const forkWorkspaceTool = workspaceByName.get(name);
            return forkWorkspaceTool
              ? executeWorkspaceReadonlyTool(forkWorkspaceTool.name, args, String(input.toolContext.capabilityToken || ""))
              : execute(name, args, input.toolContext.scope);
          },
        });
      }
      if (!skillName) recordToolSearchSuccess(request.name);
      const output = typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);
      const outputTokens = estimateTextTokens(output);
      const resultTokenLimit = boundedToolResultLimit(input.resultTokenLimit);
      if (outputTokens > resultTokenLimit) {
        const error = MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR;
        input.onResult?.(request, callId, null, error);
        return { name: request.name, itemName, toolKind, source: workspaceTool ? "ccm__workspace_readonly" : toolKind, loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: Date.now() - startedAt, aliases, ok: false, error, outputTokens, resultChecksum: contextItemChecksum(error), reason: request.reason };
      }
      input.onResult?.(request, callId, rawOutput);
      recordMainAgentToolContinuityFromResult({
        identity: input.toolContext.scopeIdentity,
        requestName: request.name,
        requestArguments: request.arguments,
        rawOutput,
        eventId: callId,
        sourceMessageId: String((input.toolContext.scope.auditContext as any)?.userMessageId || ""),
      });
      return { name: request.name, itemName, toolKind, source: workspaceTool ? "ccm__workspace_readonly" : toolKind, loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: Date.now() - startedAt, aliases, ok: !/^\[(?:错误|工具错误)\]/.test(output), output, outputTokens, resultChecksum: contextItemChecksum(rawOutput), reason: request.reason };
    } catch (error: any) {
      const detail = String(error?.message || error || "工具调用失败").slice(0, 1000);
      input.onResult?.(request, callId, null, detail);
      return { name: request.name, itemName, toolKind, source: workspaceTool ? "ccm__workspace_readonly" : toolKind, loaded: true, scope: input.toolContext.capabilityToken ? "scoped_session" : "configured_scope", durationMs: Date.now() - startedAt, aliases, ok: false, error: detail, resultChecksum: contextItemChecksum(detail), reason: request.reason };
    }
  };

  const isSafeReadOnly = (request: MainAgentToolRequest) => {
    if (request.name === "tool_search" || request.name === "invoke_skill") return false;
    if (workspaceByName.has(request.name)) return true;
    const tool = loadedMcp.find((row: any) => request.name === row?.canonicalName || request.name === row?.name);
    return isMainAgentReadOnlyMcpTool(tool);
  };

  // Preserve request order and never let a side-effectful/unknown request overlap
  // another call. Consecutive proven-read-only requests may share a small pool.
  const results: any[] = [];
  for (let index = 0; index < requests.length;) {
    if (!isSafeReadOnly(requests[index])) {
      results.push(await executeOne(requests[index]));
      index += 1;
      continue;
    }
    const readBatch: MainAgentToolRequest[] = [];
    while (index < requests.length && isSafeReadOnly(requests[index]) && readBatch.length < Math.min(readOnlyParallelism, batchSize)) {
      readBatch.push(requests[index]);
      index += 1;
    }
    results.push(...await Promise.all(readBatch.map(executeOne)));
  }
  return results;
}
