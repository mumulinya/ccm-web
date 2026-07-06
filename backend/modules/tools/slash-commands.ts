import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, collectRequestBuffer, sendJson } from "../../core/utils";
import { loadSkills } from "../../core/db";

export type SlashCommandScope = "global" | "project" | "group";
type SlashRisk = "safe" | "guarded" | "high";

type SlashCommand = {
  name: string;
  aliases?: string[];
  description: string;
  category: string;
  icon?: string;
  scopes: SlashCommandScope[];
  argumentHint?: string;
  requiresArgs?: boolean;
  risk?: SlashRisk;
  hidden?: boolean;
  keywords?: string[];
  source?: "builtin" | "ccm" | "custom" | "skill";
  action: {
    type: "prompt" | "navigate" | "query" | "mutation" | "client";
    prompt?: string;
    tab?: string;
    endpoint?: string;
    endpointByScope?: Partial<Record<SlashCommandScope, string>>;
    method?: "GET" | "POST";
    body?: Record<string, any>;
    clientAction?: string;
  };
};

const CUSTOM_COMMANDS_FILE = path.join(CCM_DIR, "configs", "slash-commands.json");
const AUDIT_FILE = path.join(CCM_DIR, "logs", "slash-command-audit.jsonl");

const COMMANDS: SlashCommand[] = [
  { name: "help", aliases: ["commands", "?", "帮助"], description: "查看当前入口可用的命令和使用方式", category: "基础", icon: "⌘", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "prompt", prompt: "请结合当前上下文，简要说明我现在可以让你做什么，以及最适合使用的 CCM 斜杠命令。" } },
  { name: "status", aliases: ["状态"], description: "检查当前 Agent、会话或协作任务状态", category: "基础", icon: "◉", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "prompt", prompt: "请读取真实状态并汇报当前上下文的运行状态、正在执行的工作、阻塞项和下一步；不要仅凭对话猜测。" } },
  { name: "plan", aliases: ["规划"], description: "先分析需求并给出可执行计划，不立即修改", category: "开发", icon: "◇", scopes: ["global", "project", "group"], argumentHint: "<目标>", requiresArgs: true, risk: "safe", source: "builtin", action: { type: "prompt", prompt: "请先分析并制定可执行计划，暂时不要修改项目。目标：$ARGS" } },
  { name: "review", aliases: ["审查"], description: "审查代码或当前交付，给出证据和风险", category: "开发", icon: "⌕", scopes: ["project", "group"], argumentHint: "[文件或范围]", risk: "safe", source: "builtin", action: { type: "prompt", prompt: "请对当前项目交付做严格审查，范围：$ARGS。请给出证据、风险等级和可操作建议，不要直接修改。" } },
  { name: "verify", aliases: ["test", "验证"], description: "运行适合当前项目的真实验证并汇报证据", category: "开发", icon: "✓", scopes: ["project", "group"], argumentHint: "[验证范围]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请针对当前项目执行真实验证，范围：$ARGS。记录实际运行的命令、输出摘要、失败原因和仍需人工确认的风险。" } },
  { name: "projects", aliases: ["项目"], description: "打开项目管理", category: "导航", icon: "▦", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "projects" } },
  { name: "groups", aliases: ["群聊"], description: "打开群聊协作", category: "导航", icon: "◌", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "groups" } },
  { name: "tasks", aliases: ["任务"], description: "打开任务中心查看执行状态和回执", category: "导航", icon: "☷", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "tasks" } },
  { name: "memory", aliases: ["记忆"], description: "打开记忆控制中心", category: "导航", icon: "◈", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "memory-center" } },
  { name: "quality", aliases: ["metrics", "质量"], description: "打开 Agent 质量与评测指标", category: "导航", icon: "◒", scopes: ["global", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "metrics" } },
  { name: "doctor", aliases: ["health", "诊断"], description: "打开系统诊断与稳定性检查", category: "导航", icon: "✚", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "diagnostics" } },
  { name: "templates", aliases: ["模板"], description: "打开对话模板中心", category: "导航", icon: "▤", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "templates" } },
  { name: "tools", aliases: ["工具"], description: "打开 MCP、Skill 与工具配置", category: "导航", icon: "⚙", scopes: ["global", "project"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "tools" } },
  { name: "compact", aliases: ["压缩"], description: "检查并压缩当前作用域记忆，保留事实与决策", category: "记忆", icon: "⇲", scopes: ["global", "project", "group"], risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请检查当前上下文的记忆占用；仅在达到压缩条件时执行记忆压缩，并保留目标、事实、决策、未完成任务和证据引用。完成后汇报压缩前后变化。" } },
  { name: "remember", aliases: ["记住"], description: "把明确事实或偏好写入正确的记忆作用域", category: "记忆", icon: "+", scopes: ["global", "project", "group"], argumentHint: "<要记住的内容>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请判断以下内容应属于全局、项目还是群聊记忆，说明作用域后写入；若含临时信息或敏感信息则不要长期保存：$ARGS" } },
  { name: "resume", aliases: ["continue", "续跑"], description: "从可靠的原生会话或任务检查点继续", category: "执行", icon: "▶", scopes: ["project", "group"], argumentHint: "[任务ID或说明]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请从当前上下文中查找可靠的原生会话、任务回执或检查点，并继续未完成工作：$ARGS。禁止无依据地宣称恢复成功。" } },
  { name: "retry", aliases: ["重试"], description: "按失败缺口重试，不重复已通过的步骤", category: "执行", icon: "↻", scopes: ["project", "group"], argumentHint: "[任务ID或失败项]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请根据最新失败回执按缺口重试：$ARGS。复用有效检查点，不要整轮盲目重跑，并重新执行交付门禁。" } },
  { name: "executor", aliases: ["执行器"], description: "查看或切换 Claude/Codex/Cursor 执行器", category: "执行", icon: "⌁", scopes: ["global", "project", "group"], argumentHint: "[claude|codex|cursor]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请检查当前执行器健康与会话恢复能力。用户指定：$ARGS。若要求切换，先验证目标执行器可用并说明影响，再走现有配置确认流程。" } },
  { name: "shadow", aliases: ["影子模式"], description: "查看或调整 Agent 决策影子模式", category: "治理", icon: "◐", scopes: ["global", "group"], argumentHint: "[status|on|off]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请读取 Agent 决策影子模式的真实配置和近期命中情况。请求：$ARGS。任何配置变更必须走现有确认和审计流程。" } },
  { name: "recover", aliases: ["恢复"], description: "诊断阻塞任务并按证据执行恢复", category: "治理", icon: "⟳", scopes: ["global", "project", "group"], argumentHint: "[任务ID或范围]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请诊断并恢复指定范围：$ARGS。先读取 Trace、回执和检查点，区分业务失败与基础设施失败，再选择原会话恢复、切换执行器或按缺口返工。" } },
  { name: "project-start", aliases: ["启动项目"], description: "请求启动指定项目（需经过确认）", category: "项目操作", icon: "▶", scopes: ["global"], argumentHint: "<项目名>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请启动项目 $ARGS。执行前必须核对项目身份、启动命令、当前运行状态，并走现有高风险确认流程。" } },
  { name: "project-stop", aliases: ["停止项目"], description: "请求停止指定项目（需经过确认）", category: "项目操作", icon: "■", scopes: ["global"], argumentHint: "<项目名>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请停止项目 $ARGS。执行前必须核对项目身份与进程归属，并走现有高风险确认流程，不得按模糊名称误停其他进程。" } },
  { name: "new", aliases: ["new-session", "新会话"], description: "新建当前 Agent 会话", category: "会话", icon: "+", scopes: ["global", "project"], risk: "safe", source: "ccm", action: { type: "client", clientAction: "new_session" } },
  { name: "clear", aliases: ["清空会话"], description: "清空当前会话消息（需确认）", category: "会话", icon: "⌫", scopes: ["global", "project"], risk: "high", source: "ccm", action: { type: "client", clientAction: "clear_session" } },
  { name: "context", aliases: ["上下文"], description: "查看当前会话上下文和消息占用", category: "会话", icon: "◎", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "client", clientAction: "context" } },
  { name: "diff", aliases: ["changes", "变更"], description: "直接读取当前项目 Git 文件变更", category: "开发现场", icon: "±", scopes: ["project"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/git/status?project=$PROJECT" } },
  { name: "trace", aliases: ["链路"], description: "直接读取指定执行 Trace", category: "任务追踪", icon: "⌁", scopes: ["global", "project", "group"], argumentHint: "<Trace ID>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/reliability/traces?id=$ARGS" } },
  { name: "task", aliases: ["任务详情"], description: "直接读取任务状态、回执和门禁", category: "任务追踪", icon: "☑", scopes: ["global", "project", "group"], argumentHint: "<任务 ID>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/tasks" } },
  { name: "agents", aliases: ["agent-health", "执行器健康"], description: "直接读取 Agent 与执行器健康状态", category: "任务追踪", icon: "◉", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/orchestrator/resilience" } },
  { name: "checkpoint", aliases: ["检查点"], description: "为指定执行创建 Git 安全检查点", category: "开发现场", icon: "◆", scopes: ["project", "group"], argumentHint: "<Execution ID>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "mutation", endpoint: "/api/tasks/execution/checkpoint", method: "POST", body: { execution_id: "$ARGS", label: "用户通过 /checkpoint 创建" } } },
  { name: "rollback", aliases: ["回滚检查点"], description: "回滚到指定执行检查点（仅隔离 worktree）", category: "开发现场", icon: "↶", scopes: ["project", "group"], argumentHint: "<Checkpoint ID>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "mutation", endpoint: "/api/tasks/execution/rollback", method: "POST", body: { checkpoint_id: "$ARGS", reason: "用户通过 /rollback 明确确认回滚", allow_shared: false } } },
  { name: "logs", aliases: ["日志"], description: "读取当前群聊或任务的近期日志", category: "开发现场", icon: "≡", scopes: ["global", "project", "group"], argumentHint: "[任务 ID]", risk: "safe", source: "ccm", action: { type: "query", endpointByScope: { global: "/api/tasks", project: "/api/tasks", group: "/api/groups/logs?id=$GROUP_ID&limit=50" } } },
  { name: "knowledge", aliases: ["kb", "知识库"], description: "直接检索本地知识库，不调用模型", category: "知识", icon: "⌕", scopes: ["global", "project", "group"], argumentHint: "<关键词>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/rag/query", method: "POST", body: { query: "$ARGS" } } },
  { name: "files", aliases: ["共享文件"], description: "读取当前作用域的共享文件列表", category: "知识", icon: "▤", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpointByScope: { global: "/api/shared", project: "/api/projects/shared?project=$PROJECT", group: "/api/shared" } } },
  { name: "cron", aliases: ["定时任务"], description: "直接读取定时任务和调度器状态", category: "运维", icon: "◷", scopes: ["global", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/cron" } },
  { name: "soak", aliases: ["稳定性"], description: "读取 24 小时稳定性运行状态和报告", category: "运维", icon: "≈", scopes: ["global", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/reliability/soak/status" } },
  { name: "permissions", aliases: ["权限"], description: "读取全局 Agent 能力与授权边界", category: "治理", icon: "⚿", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/global-agent/capabilities" } },
  { name: "model", aliases: ["模型"], description: "读取可用模型执行器及原生续跑能力", category: "执行", icon: "◇", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/orchestrator/resilience" } },
  { name: "export", aliases: ["导出"], description: "导出当前会话或群聊上下文为 JSON", category: "会话", icon: "⇩", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "client", clientAction: "export_context" } },
];

function normalizeScope(value: any): SlashCommandScope {
  return value === "project" || value === "group" ? value : "global";
}

function validCustomCommand(value: any): value is SlashCommand {
  return !!value && /^[\p{L}\p{N}][\p{L}\p{N}:_-]{0,63}$/u.test(String(value.name || ""))
    && typeof value.description === "string"
    && Array.isArray(value.scopes)
    && value.scopes.every((scope: any) => ["global", "project", "group"].includes(scope))
    && value.action && ["prompt", "navigate"].includes(value.action.type)
    && (value.action.type !== "prompt" || typeof value.action.prompt === "string")
    && (value.action.type !== "navigate" || typeof value.action.tab === "string");
}

function loadCustomCommands(): SlashCommand[] {
  try {
    if (!fs.existsSync(CUSTOM_COMMANDS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(CUSTOM_COMMANDS_FILE, "utf8"));
    const values = Array.isArray(parsed) ? parsed : parsed.commands;
    return (Array.isArray(values) ? values : []).filter(validCustomCommand).map((command: any) => ({
      ...command,
      aliases: Array.isArray(command.aliases) ? command.aliases.map(String) : [],
      category: String(command.category || "自定义"),
      risk: ["safe", "guarded", "high"].includes(command.risk) ? command.risk : "guarded",
      source: "custom",
    }));
  } catch {
    return [];
  }
}

function loadSkillCommands(): SlashCommand[] {
  return loadSkills()
    .filter((skill: any) => skill && skill.enabled !== false && skill.name && skill.prompt)
    .map((skill: any) => ({
      name: `skill:${String(skill.name).trim().replace(/\s+/g, "-")}`,
      aliases: [],
      description: String(skill.description || `调用 ${skill.name} Skill`),
      category: "Skill",
      icon: "✦",
      scopes: ["global", "project", "group"] as SlashCommandScope[],
      argumentHint: "[补充要求]",
      risk: "guarded" as SlashRisk,
      source: "skill" as const,
      action: {
        type: "prompt" as const,
        prompt: `${String(skill.prompt).trim()}\n\n用户本次补充要求：$ARGS`,
      },
    }));
}

function commandsForScope(scope: SlashCommandScope) {
  const merged = [...COMMANDS, ...loadCustomCommands(), ...loadSkillCommands()];
  const seen = new Set<string>();
  return merged.filter(command => {
    const key = command.name.toLowerCase();
    if (seen.has(key) || command.hidden || !command.scopes.includes(scope)) return false;
    seen.add(key);
    return true;
  });
}

function parseInvocation(input: string) {
  const text = String(input || "").trim();
  if (!text.startsWith("/")) return null;
  const match = text.slice(1).match(/^(\S+)(?:\s+([\s\S]*))?$/);
  return match ? { name: match[1], args: String(match[2] || "").trim() } : null;
}

function expandPrompt(prompt: string, args: string, context: any) {
  return prompt
    .replaceAll("$ARGS", args || "（未指定，使用当前上下文）")
    .replaceAll("$PROJECT", String(context?.project || "当前项目"))
    .replaceAll("$GROUP", String(context?.group || "当前群聊"));
}

function expandActionTemplate(value: any, args: string, context: any, encode = false): any {
  if (Array.isArray(value)) return value.map(item => expandActionTemplate(item, args, context, encode));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandActionTemplate(item, args, context, false)]));
  if (typeof value !== "string") return value;
  const replacement = (input: any) => encode ? encodeURIComponent(String(input || "")) : String(input || "");
  return value
    .replaceAll("$ARGS", replacement(args))
    .replaceAll("$PROJECT", replacement(context?.project))
    .replaceAll("$GROUP_ID", replacement(context?.groupId))
    .replaceAll("$SESSION_ID", replacement(context?.sessionId))
    .replaceAll("$GROUP", replacement(context?.group));
}

function recordAudit(entry: any) {
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  fs.appendFileSync(AUDIT_FILE, JSON.stringify({ ...entry, at: new Date().toISOString() }) + "\n", "utf8");
}

function commandAvailability(command: SlashCommand, scope: SlashCommandScope, context: any = {}) {
  if (!command.scopes.includes(scope)) return { enabled: false, reason: "当前入口不可用" };
  if (command.action.type === "prompt" && scope === "project" && !String(context.project || "").trim()) {
    return { enabled: false, reason: "请先选择项目" };
  }
  if (command.action.type === "prompt" && scope === "group" && !String(context.group || context.groupId || "").trim()) {
    return { enabled: false, reason: "请先选择群聊" };
  }
  const endpoint = command.action.endpoint || command.action.endpointByScope?.[scope] || "";
  if (scope === "project" && endpoint.includes("$PROJECT") && !String(context.project || "").trim()) return { enabled: false, reason: "请先选择项目" };
  if (scope === "group" && endpoint.includes("$GROUP_ID") && !String(context.groupId || "").trim()) return { enabled: false, reason: "请先选择群聊" };
  if (scope === "project" && command.action.type === "client" && !String(context.project || "").trim()) return { enabled: false, reason: "请先选择项目" };
  if (scope === "group" && command.action.type === "client" && !String(context.group || context.groupId || "").trim()) return { enabled: false, reason: "请先选择群聊" };
  return { enabled: true, reason: "" };
}

function publicCommand(command: SlashCommand, scope: SlashCommandScope = "global", context: any = {}) {
  const risk = command.risk || "safe";
  return {
    name: command.name,
    aliases: command.aliases || [],
    description: command.description,
    category: command.category,
    icon: command.icon || "/",
    scopes: command.scopes,
    argumentHint: command.argumentHint || "",
    requiresArgs: !!command.requiresArgs,
    risk,
    permission: risk === "high" || command.action.type === "mutation" ? "manage" : ["navigate", "query", "client"].includes(command.action.type) ? "read" : "agent",
    source: command.source || "ccm",
    keywords: command.keywords || [],
    actionType: command.action.type,
    parameterSchema: command.argumentHint ? [{ name: "args", type: "string", required: !!command.requiresArgs, hint: command.argumentHint }] : [],
    availability: commandAvailability(command, scope, context),
  };
}

export function getSlashCommandSummary() {
  return {
    total: COMMANDS.length + loadCustomCommands().length + loadSkillCommands().length,
    builtin: COMMANDS.length,
    custom: loadCustomCommands().length,
    skills: loadSkillCommands().length,
    customFile: CUSTOM_COMMANDS_FILE,
    auditFile: AUDIT_FILE,
  };
}

export function runSlashCommandSelfTest() {
  const globalCommands = commandsForScope("global");
  const projectCommands = commandsForScope("project");
  const parsed = parseInvocation("/plan 实现支付功能");
  const expanded = expandPrompt("目标：$ARGS，项目：$PROJECT", parsed?.args || "", { project: "项目A" });
  const expandedEndpoint = expandActionTemplate("/api/git/status?project=$PROJECT&id=$ARGS", "trace a/b", { project: "项目 A" }, true);
  const expandedGroupEndpoint = expandActionTemplate("/api/groups/logs?id=$GROUP_ID&name=$GROUP", "", { group: "开发群", groupId: "group-1" }, true);
  const checks = {
    parsesNameAndArguments: parsed?.name === "plan" && parsed.args === "实现支付功能",
    hasAllCoreScopes: ["global", "project", "group"].every(scope => commandsForScope(scope as SlashCommandScope).length >= 10),
    scopeIsolation: !projectCommands.some(command => command.name === "project-stop") && globalCommands.some(command => command.name === "project-stop"),
    highRiskIsNotDirectAction: globalCommands.find(command => command.name === "project-stop")?.action.type === "prompt",
    navigationIsExplicit: globalCommands.find(command => command.name === "memory")?.action.tab === "memory-center",
    argumentsAndContextExpand: expanded.includes("实现支付功能") && expanded.includes("项目A"),
    aliasesAvailable: globalCommands.find(command => command.name === "status")?.aliases?.includes("状态") === true,
    parameterSchemaPublished: publicCommand(globalCommands.find(command => command.name === "plan")!).parameterSchema[0]?.required === true,
    permissionDerivedFromRisk: publicCommand(globalCommands.find(command => command.name === "project-stop")!).permission === "manage",
    skillsBecomeCommands: loadSkills().filter((skill: any) => skill?.enabled !== false).length === 0 || globalCommands.some(command => command.source === "skill"),
    localQueriesDoNotInvokeModel: projectCommands.find(command => command.name === "diff")?.action.type === "query" && globalCommands.find(command => command.name === "agents")?.action.type === "query",
    clientSessionCommandsAreExplicit: globalCommands.find(command => command.name === "new")?.action.clientAction === "new_session" && globalCommands.find(command => command.name === "clear")?.risk === "high",
    checkpointAndRollbackAreControlled: projectCommands.find(command => command.name === "checkpoint")?.action.type === "mutation" && projectCommands.find(command => command.name === "rollback")?.risk === "high",
    localMutationNeedsManagePermission: publicCommand(projectCommands.find(command => command.name === "checkpoint")!, "project", { project: "demo" }).permission === "manage",
    endpointArgumentsAreEncoded: expandedEndpoint.includes("%E9%A1%B9%E7%9B%AE%20A") && expandedEndpoint.includes("trace%20a%2Fb"),
    longestContextPlaceholderWins: expandedGroupEndpoint.includes("id=group-1") && !expandedGroupEndpoint.includes("_ID"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, endpointPreview: expandedEndpoint, counts: { global: globalCommands.length, project: projectCommands.length, group: commandsForScope("group").length } };
}

export function handleSlashCommandsApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/slash-commands" && req.method === "GET") {
    const scope = normalizeScope(parsed.query.scope);
    const context = { project: parsed.query.project || "", group: parsed.query.group || "", groupId: parsed.query.groupId || "" };
    sendJson(res, { scope, commands: commandsForScope(scope).map(command => publicCommand(command, scope, context)), ...getSlashCommandSummary() });
    return true;
  }

  if (pathname === "/api/slash-commands/custom" && req.method === "GET") {
    sendJson(res, { commands: loadCustomCommands().map(command => ({ ...command, source: undefined })), path: CUSTOM_COMMANDS_FILE });
    return true;
  }

  if (pathname === "/api/slash-commands/custom" && req.method === "PUT") {
    collectRequestBuffer(req).then(buffer => {
      try {
        const body = JSON.parse(buffer.toString("utf8") || "{}");
        const values = Array.isArray(body) ? body : body.commands;
        if (!Array.isArray(values)) return sendJson(res, { error: "commands 必须是数组" }, 400);
        const invalidIndex = values.findIndex((value: any) => !validCustomCommand(value));
        if (invalidIndex >= 0) return sendJson(res, { error: `第 ${invalidIndex + 1} 条自定义命令格式无效` }, 400);
        const builtinNames = new Set(COMMANDS.flatMap(command => [command.name, ...(command.aliases || [])]).map(name => name.toLowerCase()));
        const names = new Set<string>();
        for (const value of values) {
          const name = String(value.name).toLowerCase();
          if (builtinNames.has(name)) return sendJson(res, { error: `自定义命令 /${value.name} 与内置命令冲突` }, 409);
          if (names.has(name)) return sendJson(res, { error: `自定义命令 /${value.name} 重复` }, 409);
          names.add(name);
        }
        fs.mkdirSync(path.dirname(CUSTOM_COMMANDS_FILE), { recursive: true });
        const tempFile = `${CUSTOM_COMMANDS_FILE}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify({ commands: values }, null, 2), "utf8");
        fs.renameSync(tempFile, CUSTOM_COMMANDS_FILE);
        recordAudit({ command: "custom-registry:update", scope: "global", source: "custom", risk: "guarded", actionType: "registry", count: values.length });
        sendJson(res, { success: true, count: values.length, path: CUSTOM_COMMANDS_FILE });
      } catch (error: any) {
        sendJson(res, { error: error?.message || "保存自定义命令失败" }, 400);
      }
    }).catch((error: any) => sendJson(res, { error: error?.message || "读取请求失败" }, 400));
    return true;
  }

  if (pathname === "/api/slash-commands/resolve" && req.method === "POST") {
    collectRequestBuffer(req).then(buffer => {
      try {
        const body = JSON.parse(buffer.toString("utf8") || "{}");
        const scope = normalizeScope(body.scope);
        const invocation = parseInvocation(body.input);
        if (!invocation) return sendJson(res, { error: "不是有效的斜杠命令" }, 400);
        const lowerName = invocation.name.toLowerCase();
        const command = commandsForScope(scope).find(item => item.name.toLowerCase() === lowerName || (item.aliases || []).some(alias => alias.toLowerCase() === lowerName));
        if (!command) return sendJson(res, { error: `当前入口不支持 /${invocation.name}` }, 404);
        if (command.requiresArgs && !invocation.args) {
          return sendJson(res, { success: true, needsArgs: true, command: publicCommand(command, scope, body.context || {}) });
        }
        const availability = commandAvailability(command, scope, body.context || {});
        if (!availability.enabled) return sendJson(res, { error: availability.reason }, 409);
        const context = body.context || {};
        let result: any;
        if (command.action.type === "navigate") result = { type: "navigate", tab: command.action.tab };
        else if (command.action.type === "prompt") result = { type: "prompt", prompt: expandPrompt(command.action.prompt || "", invocation.args, context) };
        else if (command.action.type === "client") result = { type: "client", action: command.action.clientAction };
        else {
          const endpoint = command.action.endpointByScope?.[scope] || command.action.endpoint || "";
          result = {
            type: command.action.type,
            endpoint: expandActionTemplate(endpoint, invocation.args, context, true),
            method: command.action.method || "GET",
            body: expandActionTemplate(command.action.body || {}, invocation.args, context, false),
          };
        }
        result.args = invocation.args;
        recordAudit({
          command: command.name,
          scope,
          source: command.source || "ccm",
          risk: command.risk || "safe",
          actionType: command.action.type,
          context: { project: body.context?.project || "", group: body.context?.group || "" },
          argsPresent: !!invocation.args,
        });
        sendJson(res, { success: true, command: publicCommand(command, scope, body.context || {}), result });
      } catch (error: any) {
        sendJson(res, { error: error?.message || "命令解析失败" }, 400);
      }
    }).catch((error: any) => sendJson(res, { error: error?.message || "读取请求失败" }, 400));
    return true;
  }
  return false;
}
