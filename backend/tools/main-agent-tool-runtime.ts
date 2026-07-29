import * as crypto from "crypto";
import { estimateTextTokens } from "../system/context-budget";
import { normalizeToolAuthorization, type ToolGrantSet } from "./tool-authorization";
import { toolManager, type ToolScope } from "./tool-manager";

export type MainAgentToolRequest = {
  name: string;
  arguments: any;
  reason: string;
};

export type MainAgentToolRuntimeContext = {
  schema: "ccm-main-agent-tool-runtime-context-v1";
  scope: ToolScope;
  configured: ToolGrantSet;
  executionSkills: string[];
  effective: ToolGrantSet;
  catalog: { mcp: any[]; skills: any[]; rejectedMcp: any[] };
  toolAudit: any;
  mcpPrompt: string;
  skillPrompt: string;
  policyPrompt: string;
  checksum: string;
};

function uniqueNames(values: any[] = []) {
  return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)));
}

export function isMainAgentReadOnlyMcpTool(tool: any) {
  const annotations = tool?.annotations && typeof tool.annotations === "object" ? tool.annotations : {};
  if (annotations.destructiveHint === true || annotations.readOnlyHint === false) return false;
  const name = String(tool?.name || "").trim();
  if (!name) return false;
  if (/(?:create|add|update|edit|set|write|delete|remove|clear|send|post|publish|upload|move|copy|rename|execute|run|start|stop|restart|deploy|install|uninstall|merge|commit|push|apply|approve|reject|cancel|archive|restore|trigger|invoke|dispatch|assign|grant|revoke|login|logout|authenticate|pay|refund)/i.test(name)) return false;
  if (annotations.readOnlyHint === true) return true;
  return /^(?:get|list|read|search|query|find|fetch|lookup|inspect|check|status|describe|resolve|preview|view|show|count|validate|verify|compare|diff|history|manifest)/i.test(name);
}

export function buildMainAgentToolRuntimeContext(input: {
  configuredTools?: any;
  executionSkills?: string[];
  auditContext?: ToolScope["auditContext"];
  mcpPolicy?: "read_only" | "all";
  label?: string;
}): MainAgentToolRuntimeContext {
  const configured = normalizeToolAuthorization(input.configuredTools || {});
  const executionSkills = uniqueNames(input.executionSkills || []);
  const effective = normalizeToolAuthorization({
    mcp: configured.mcp,
    skill: uniqueNames([...configured.skill, ...executionSkills]),
  });
  const scope: ToolScope = { ...effective, auditContext: input.auditContext || {} };
  const scoped = toolManager.getScopedToolCatalog(scope);
  const readOnly = input.mcpPolicy !== "all";
  const mcp = readOnly ? scoped.tools.filter(isMainAgentReadOnlyMcpTool) : scoped.tools;
  const rejectedMcp = readOnly ? scoped.tools.filter(tool => !isMainAgentReadOnlyMcpTool(tool)) : [];
  const toolAudit = toolManager.buildScopeAudit(scope);
  const label = String(input.label || "主 Agent");
  const mcpPrompt = mcp.length ? [
    `${label}已授权的${readOnly ? "只读" : ""} MCP 工具（必须使用 canonicalName）：`,
    ...mcp.map(tool => `- ${tool.canonicalName}: ${tool.description || tool.name}; 参数 Schema=${JSON.stringify(tool.inputSchema || {})}`),
  ].join("\n") : "";
  const skillPrompt = scoped.skills.length ? [
    `${label}已授权的 Skill：`,
    ...scoped.skills.map(skill => `- ${skill.name}: ${skill.description || "未提供描述"}; hash=${skill.contentHash || ""}`),
  ].join("\n") : "";
  const unavailable = [
    ...(Array.isArray(toolAudit?.missing_mcp_servers) ? toolAudit.missing_mcp_servers : []),
    ...(Array.isArray(toolAudit?.missing_mcp_tools) ? toolAudit.missing_mcp_tools : []),
    ...(Array.isArray(toolAudit?.missing_skills) ? toolAudit.missing_skills : []),
  ];
  const policyPrompt = (mcpPrompt || skillPrompt || rejectedMcp.length || unavailable.length) ? [
    mcpPrompt,
    skillPrompt,
    rejectedMcp.length ? `以下 MCP 可能写入或产生副作用，不向${label}开放：${rejectedMcp.map(tool => tool.canonicalName).join(", ")}` : "",
    unavailable.length ? "部分已配置工具当前不可用；不得声称已经调用。" : "",
    `需要工具数据时在 toolRequests 中请求。MCP只能使用上面列出的 canonicalName；Skill只能使用 invoke_skill，并在 arguments.name 中填写已列出的 Skill。工具结果由CCM执行后重新交给模型，不得把请求本身视为完成。`,
  ].filter(Boolean).join("\n\n") : "";
  const checksum = crypto.createHash("sha256").update(JSON.stringify({ effective, mcp: mcp.map(row => row.canonicalName), skills: scoped.skills.map(row => row.name), auditContext: scope.auditContext || {} })).digest("hex");
  return {
    schema: "ccm-main-agent-tool-runtime-context-v1" as const,
    scope,
    configured,
    executionSkills,
    effective,
    catalog: { mcp, skills: scoped.skills, rejectedMcp },
    toolAudit,
    mcpPrompt,
    skillPrompt,
    policyPrompt,
    checksum,
  };
}

export function normalizeMainAgentToolRequests(value: any, limit = 2): MainAgentToolRequest[] {
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

export async function executeMainAgentToolRequests(input: {
  requests: MainAgentToolRequest[];
  toolContext: MainAgentToolRuntimeContext;
  executeToolCall?: (name: string, args: any, scope?: ToolScope) => Promise<any>;
  onUse?: (request: MainAgentToolRequest) => string | void;
  onResult?: (request: MainAgentToolRequest, callId: string, output: any, error?: string) => void;
  resultTokenLimit?: number;
}) {
  const allowedMcp = new Set(input.toolContext.catalog.mcp.map(tool => tool.canonicalName));
  const allowedSkills = new Set(input.toolContext.catalog.skills.map(skill => skill.name));
  const execute = input.executeToolCall || ((name: string, args: any, scope?: ToolScope) => toolManager.executeToolCall(name, args, scope));
  const results: any[] = [];
  for (const request of input.requests.slice(0, 2)) {
    const skillName = request.name === "invoke_skill" ? String(request.arguments?.name || "").trim() : "";
    if (!(skillName ? allowedSkills.has(skillName) : allowedMcp.has(request.name))) {
      results.push({ name: request.name, ok: false, error: "MAIN_AGENT_TOOL_NOT_AUTHORIZED", reason: request.reason });
      continue;
    }
    const callId = String(input.onUse?.(request) || "");
    try {
      const rawOutput = await execute(request.name, request.arguments, input.toolContext.scope);
      const output = typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);
      const outputTokens = estimateTextTokens(output);
      if (outputTokens > Math.max(1, Number(input.resultTokenLimit || 8_000))) {
        const error = "MAIN_AGENT_TOOL_RESULT_EXCEEDS_8K_TOKEN_BUDGET";
        input.onResult?.(request, callId, null, error);
        results.push({ name: request.name, ok: false, error, outputTokens, reason: request.reason });
        continue;
      }
      input.onResult?.(request, callId, rawOutput);
      results.push({ name: request.name, ok: !/^\[(?:错误|工具错误)\]/.test(output), output, outputTokens, reason: request.reason });
    } catch (error: any) {
      const detail = String(error?.message || error || "工具调用失败").slice(0, 1000);
      input.onResult?.(request, callId, null, detail);
      results.push({ name: request.name, ok: false, error: detail, reason: request.reason });
    }
  }
  return results;
}
