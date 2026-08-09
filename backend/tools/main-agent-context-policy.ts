import { estimateTextTokens } from "../system/context-budget";

export type McpToolLoadingMode = "deferred" | "auto" | "inline";

export type MainAgentContextPolicy = {
  mcpToolLoadingMode: McpToolLoadingMode;
  mcpToolAutoThresholdPercent: number;
  skillCatalogBudgetPercent: number;
  postCompactSkillPerItemMaxTokens: number;
  postCompactSkillTotalMaxTokens: number;
  contextSourceCatalogBudgetPercent: number;
  contextSourceHydrationBudgetPercent: number;
  postCompactSourcePerItemMaxTokens: number;
  postCompactSourceTotalMaxTokens: number;
  agentMaxParallelPerProject: number;
  agentMaxParallelGlobal: number;
};

export type MainAgentContextPolicyOverride = Partial<MainAgentContextPolicy>;

export const DEFAULT_MAIN_AGENT_CONTEXT_POLICY: MainAgentContextPolicy = Object.freeze({
  mcpToolLoadingMode: "deferred",
  mcpToolAutoThresholdPercent: 10,
  skillCatalogBudgetPercent: 1,
  postCompactSkillPerItemMaxTokens: 5_000,
  postCompactSkillTotalMaxTokens: 25_000,
  contextSourceCatalogBudgetPercent: 1,
  contextSourceHydrationBudgetPercent: 10,
  postCompactSourcePerItemMaxTokens: 5_000,
  postCompactSourceTotalMaxTokens: 25_000,
  agentMaxParallelPerProject: 2,
  agentMaxParallelGlobal: 6,
});

const FIELD_ALIASES: Record<keyof MainAgentContextPolicy, string[]> = {
  mcpToolLoadingMode: ["mcpToolLoadingMode", "mcp_tool_loading_mode"],
  mcpToolAutoThresholdPercent: ["mcpToolAutoThresholdPercent", "mcp_tool_auto_threshold_percent"],
  skillCatalogBudgetPercent: ["skillCatalogBudgetPercent", "skill_catalog_budget_percent"],
  postCompactSkillPerItemMaxTokens: ["postCompactSkillPerItemMaxTokens", "post_compact_skill_per_item_max_tokens"],
  postCompactSkillTotalMaxTokens: ["postCompactSkillTotalMaxTokens", "post_compact_skill_total_max_tokens"],
  contextSourceCatalogBudgetPercent: ["contextSourceCatalogBudgetPercent", "context_source_catalog_budget_percent"],
  contextSourceHydrationBudgetPercent: ["contextSourceHydrationBudgetPercent", "context_source_hydration_budget_percent"],
  postCompactSourcePerItemMaxTokens: ["postCompactSourcePerItemMaxTokens", "post_compact_source_per_item_max_tokens"],
  postCompactSourceTotalMaxTokens: ["postCompactSourceTotalMaxTokens", "post_compact_source_total_max_tokens"],
  agentMaxParallelPerProject: ["agentMaxParallelPerProject", "agent_max_parallel_per_project"],
  agentMaxParallelGlobal: ["agentMaxParallelGlobal", "agent_max_parallel_global"],
};

function ownValue(input: any, aliases: string[]) {
  if (!input || typeof input !== "object") return { present: false, value: undefined };
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(input, alias)) return { present: true, value: input[alias] };
  }
  return { present: false, value: undefined };
}

function validateField(key: keyof MainAgentContextPolicy, value: any) {
  if (key === "mcpToolLoadingMode") {
    const mode = String(value || "").trim().toLowerCase();
    if (!["deferred", "auto", "inline"].includes(mode)) throw new Error("MCP 加载模式必须是 deferred、auto 或 inline");
    return mode as McpToolLoadingMode;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${key} 必须是有效数字`);
  if (key === "mcpToolAutoThresholdPercent") {
    if (number < 0 || number > 100) throw new Error("MCP 自动加载阈值必须介于 0 和 100% 之间");
    return Math.round(number * 100) / 100;
  }
  if (key === "skillCatalogBudgetPercent") {
    if (number < 0.1 || number > 10) throw new Error("Skill 目录预算必须介于上下文窗口的 0.1% 和 10% 之间");
    return Math.round(number * 100) / 100;
  }
  if (key === "contextSourceCatalogBudgetPercent") {
    if (number < 0.1 || number > 10) throw new Error("上下文来源目录预算必须介于上下文窗口的 0.1% 和 10% 之间");
    return Math.round(number * 100) / 100;
  }
  if (key === "contextSourceHydrationBudgetPercent") {
    if (number < 1 || number > 50) throw new Error("上下文来源正文预算必须介于上下文窗口的 1% 和 50% 之间");
    return Math.round(number * 100) / 100;
  }
  if (key === "postCompactSkillPerItemMaxTokens" || key === "postCompactSourcePerItemMaxTokens") {
    if (number < 500 || number > 20_000) throw new Error("单个 Skill 恢复预算必须介于 500 和 20,000 token");
    return Math.floor(number);
  }
  if (key === "agentMaxParallelPerProject") {
    if (number < 1 || number > 16) throw new Error("单项目 Agent 并发必须介于 1 和 16");
    return Math.floor(number);
  }
  if (key === "agentMaxParallelGlobal") {
    if (number < 1 || number > 64) throw new Error("全局 Agent 并发必须介于 1 和 64");
    return Math.floor(number);
  }
  if (number < 1_000 || number > 100_000) throw new Error(key === "postCompactSourceTotalMaxTokens" ? "来源恢复总预算必须介于 1,000 和 100,000 token" : "Skill 恢复总预算必须介于 1,000 和 100,000 token");
  return Math.floor(number);
}

function validatePair(policy: Partial<MainAgentContextPolicy>, fallback: MainAgentContextPolicy) {
  const perItem = Number(policy.postCompactSkillPerItemMaxTokens ?? fallback.postCompactSkillPerItemMaxTokens);
  const total = Number(policy.postCompactSkillTotalMaxTokens ?? fallback.postCompactSkillTotalMaxTokens);
  if (total < perItem) throw new Error("Skill 恢复总预算不能小于单个 Skill 恢复预算");
  const sourcePerItem = Number(policy.postCompactSourcePerItemMaxTokens ?? fallback.postCompactSourcePerItemMaxTokens);
  const sourceTotal = Number(policy.postCompactSourceTotalMaxTokens ?? fallback.postCompactSourceTotalMaxTokens);
  if (sourceTotal < sourcePerItem) throw new Error("来源恢复总预算不能小于单个来源恢复预算");
  if (Number(policy.agentMaxParallelGlobal ?? fallback.agentMaxParallelGlobal) < Number(policy.agentMaxParallelPerProject ?? fallback.agentMaxParallelPerProject)) {
    throw new Error("全局 Agent 并发不得小于单项目并发");
  }
}

export function readMainAgentContextPolicy(input: any = {}): MainAgentContextPolicy {
  const next: any = { ...DEFAULT_MAIN_AGENT_CONTEXT_POLICY };
  for (const key of Object.keys(FIELD_ALIASES) as Array<keyof MainAgentContextPolicy>) {
    const found = ownValue(input, FIELD_ALIASES[key]);
    if (found.present && found.value !== undefined && found.value !== null) next[key] = validateField(key, found.value);
  }
  validatePair(next, DEFAULT_MAIN_AGENT_CONTEXT_POLICY);
  return next;
}

export function updateMainAgentContextPolicyOverride(
  currentInput: any,
  updateInput: any,
  globalInput: any = {},
): MainAgentContextPolicyOverride {
  const current: any = {};
  for (const key of Object.keys(FIELD_ALIASES) as Array<keyof MainAgentContextPolicy>) {
    const found = ownValue(currentInput, FIELD_ALIASES[key]);
    if (found.present && found.value !== undefined && found.value !== null) current[key] = validateField(key, found.value);
  }
  const next: any = { ...current };
  for (const key of Object.keys(FIELD_ALIASES) as Array<keyof MainAgentContextPolicy>) {
    const found = ownValue(updateInput, FIELD_ALIASES[key]);
    if (!found.present) continue;
    if (found.value === null) delete next[key];
    else next[key] = validateField(key, found.value);
  }
  validatePair(next, readMainAgentContextPolicy(globalInput));
  return next;
}

export function resolveMainAgentContextPolicy(globalInput: any = {}, overrideInput: any = {}) {
  const globalPolicy = readMainAgentContextPolicy(globalInput);
  const override = updateMainAgentContextPolicyOverride({}, overrideInput, globalPolicy);
  if (override.agentMaxParallelPerProject !== undefined && override.agentMaxParallelPerProject > globalPolicy.agentMaxParallelPerProject) throw new Error("项目/群聊并发覆盖只能降低单项目全局上限");
  if (override.agentMaxParallelGlobal !== undefined && override.agentMaxParallelGlobal > globalPolicy.agentMaxParallelGlobal) throw new Error("项目/群聊并发覆盖只能降低全局并发上限");
  const effective = { ...globalPolicy, ...override };
  validatePair(effective, globalPolicy);
  return {
    override,
    effective,
    source: Object.keys(override).length ? "scope_override" : "global_default",
  };
}

export function mainAgentContextPolicyUpdatePresent(input: any) {
  const source = input?.contextPolicy ?? input?.context_policy ?? input;
  return Object.values(FIELD_ALIASES).some(aliases => ownValue(source, aliases).present);
}

export function contextPolicyUpdateSource(input: any) {
  return input?.contextPolicy ?? input?.context_policy ?? input;
}

function cleanSkillDescription(value: any) {
  const text = String(value || "未提供描述").replace(/\s+/g, " ").trim();
  return text.slice(0, 250);
}

function skillPriority(skill: any, recentNames: Set<string>) {
  const name = String(skill?.name || "");
  if (recentNames.has(name)) return 0;
  if (skill?.origin === "internal" || skill?.sourceType === "internal" || skill?.internal === true) return 1;
  return 2;
}

export function buildDynamicSkillCatalogPrompt(input: {
  label: string;
  skills: any[];
  contextWindow: number;
  budgetPercent: number;
  recentlyInvokedSkillNames?: string[];
}) {
  const skills = [...(input.skills || [])].filter(skill => String(skill?.name || "").trim());
  const recentNames = new Set((input.recentlyInvokedSkillNames || []).map(String));
  skills.sort((left, right) => {
    const priority = skillPriority(left, recentNames) - skillPriority(right, recentNames);
    return priority || String(left.name).localeCompare(String(right.name), "zh-CN");
  });
  if (!skills.length) return { prompt: "", targetTokens: 0, actualTokens: 0, nameOnlyTokens: 0, describedCount: 0, nameOnlyCount: 0, budgetOverrun: false };
  const header = `${input.label}已授权的 Skill：`;
  const lines = skills.map(skill => `- ${String(skill.name)}`);
  const render = () => [header, ...lines].join("\n");
  const nameOnlyTokens = estimateTextTokens(render());
  const targetTokens = Math.max(1, Math.floor(Math.max(1, Number(input.contextWindow || 200_000)) * Math.max(0.001, Number(input.budgetPercent || 1) / 100)));
  const hardBudget = Math.max(targetTokens, nameOnlyTokens);
  let describedCount = 0;
  for (let index = 0; index < skills.length; index += 1) {
    const nameLine = `- ${String(skills[index].name)}`;
    const description = cleanSkillDescription(skills[index].description);
    const full = `${nameLine}: ${description}`;
    lines[index] = full;
    if (estimateTextTokens(render()) <= hardBudget) {
      describedCount += 1;
      continue;
    }
    let low = 0;
    let high = description.length;
    let accepted = "";
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = middle > 0 ? `${nameLine}: ${description.slice(0, middle).trimEnd()}${middle < description.length ? "…" : ""}` : nameLine;
      lines[index] = candidate;
      if (estimateTextTokens(render()) <= hardBudget) {
        accepted = candidate;
        low = middle + 1;
      } else high = middle - 1;
    }
    lines[index] = accepted || nameLine;
    if (accepted && accepted !== nameLine) describedCount += 1;
  }
  const prompt = render();
  return {
    prompt,
    targetTokens,
    actualTokens: estimateTextTokens(prompt),
    nameOnlyTokens,
    describedCount,
    nameOnlyCount: Math.max(0, skills.length - describedCount),
    budgetOverrun: nameOnlyTokens > targetTokens,
  };
}

export function estimateMcpToolDefinitionTokens(tool: any) {
  return estimateTextTokens(JSON.stringify({
    name: tool?.canonicalName || tool?.name || "",
    description: tool?.description || "",
    inputSchema: tool?.inputSchema || {},
  }));
}

export function resolveMcpToolLoadingDecision(policyInput: any, contextWindowInput: number, optionalDefinitionTokensInput: number) {
  const policy = readMainAgentContextPolicy(policyInput);
  const contextWindow = Math.max(32_000, Math.floor(Number(contextWindowInput || 200_000)));
  const optionalDefinitionTokens = Math.max(0, Math.floor(Number(optionalDefinitionTokensInput || 0)));
  const autoThresholdTokens = Math.floor(contextWindow * policy.mcpToolAutoThresholdPercent / 100);
  const inlineSafetyLimit = Math.max(1, contextWindow - 16_000);
  const requestedInline = policy.mcpToolLoadingMode === "inline"
    || policy.mcpToolLoadingMode === "auto" && optionalDefinitionTokens <= autoThresholdTokens;
  const safetyDowngraded = requestedInline && optionalDefinitionTokens > inlineSafetyLimit;
  return {
    mode: policy.mcpToolLoadingMode,
    contextWindow,
    optionalDefinitionTokens,
    autoThresholdTokens,
    inlineSafetyLimit,
    inline: requestedInline && !safetyDowngraded,
    safetyDowngraded,
  };
}
