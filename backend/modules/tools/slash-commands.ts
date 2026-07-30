import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR, collectRequestBuffer, sendJson } from "../../core/utils";
import { loadProjectConfigs, loadSkills } from "../../core/db";
import { loadGroups } from "../collaboration/storage";
import { loadGlobalAgentToolAuthorization } from "../global/global-agent-tool-authorization";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

export type SlashCommandScope = "global" | "project" | "group";
type SlashRisk = "safe" | "guarded" | "high";
type SlashImplementation = "local-query" | "local-mutation" | "client" | "navigation" | "agent-workflow";

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
  requiresContext?: boolean;
  implementation?: SlashImplementation;
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
const CONFIRMATION_SECRET = crypto.randomBytes(32);
const usedConfirmationReceipts = new Map<string, number>();
const CONFIRMATION_TTL_MS = 2 * 60_000;

function pruneConfirmationReceipts() {
  const cutoff = Date.now() - CONFIRMATION_TTL_MS;
  for (const [id, usedAt] of usedConfirmationReceipts) if (usedAt < cutoff) usedConfirmationReceipts.delete(id);
  while (usedConfirmationReceipts.size > 1000) usedConfirmationReceipts.delete(usedConfirmationReceipts.keys().next().value);
}

function principalIdentity(req: any) {
  const auth = req?.ccmAuth;
  if (!auth) throw new Error("缺少已认证主体");
  return {
    id: auth.kind === "browser" ? String(auth.userId || "") : `internal:${String(auth.caller || "")}`,
    session: auth.kind === "browser" ? String(auth.sessionId || "") : "",
    role: String(auth.role || ""),
  };
}

function signConfirmationPayload(payload: any) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", CONFIRMATION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readConfirmationPayload(token: unknown, expectedKind: "challenge" | "receipt") {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) throw new Error("确认凭据无效");
  const expected = crypto.createHmac("sha256", CONFIRMATION_SECRET).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("确认凭据签名无效");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (payload.kind !== expectedKind || Number(payload.expires_at || 0) < Date.now()) throw new Error("确认凭据已过期");
  return payload;
}

function confirmationBinding(req: any, scope: SlashCommandScope, command: SlashCommand, invocation: any, context: any) {
  const principal = principalIdentity(req);
  return {
    principal_id: principal.id,
    session_id: principal.session,
    role: principal.role,
    scope,
    command: command.name,
    invocation_checksum: crypto.createHash("sha256").update(JSON.stringify({ args: invocation.args || "", context: context || {} })).digest("hex"),
  };
}

function confirmationRequired(command: SlashCommand) {
  return command.risk === "high" || command.action.type === "mutation";
}

function assertCommandRole(req: any, command: SlashCommand) {
  const principal = principalIdentity(req);
  if (!confirmationRequired(command)) return;
  if (command.risk === "high" && principal.role !== "admin") throw new Error("该高风险命令只能由 Admin 确认");
  if (command.action.type === "mutation" && !["admin", "operator", "internal"].includes(principal.role)) throw new Error("当前账户无权执行本地修改命令");
}

function createConfirmationChallenge(req: any, scope: SlashCommandScope, command: SlashCommand, invocation: any, context: any) {
  assertCommandRole(req, command);
  return signConfirmationPayload({
    schema: "ccm-slash-command-confirmation-v1",
    kind: "challenge",
    id: `slash_ch_${crypto.randomUUID()}`,
    ...confirmationBinding(req, scope, command, invocation, context),
    expires_at: Date.now() + CONFIRMATION_TTL_MS,
  });
}

function consumeConfirmationReceipt(req: any, token: unknown, scope: SlashCommandScope, command: SlashCommand, invocation: any, context: any) {
  const payload = readConfirmationPayload(token, "receipt");
  const binding = confirmationBinding(req, scope, command, invocation, context);
  for (const key of ["principal_id", "session_id", "role", "scope", "command", "invocation_checksum"]) {
    if (String(payload[key] || "") !== String((binding as any)[key] || "")) throw new Error("确认凭据与当前命令或会话不匹配");
  }
  pruneConfirmationReceipts();
  if (usedConfirmationReceipts.has(payload.id)) throw new Error("确认凭据已使用");
  usedConfirmationReceipts.set(payload.id, Date.now());
}

const COMMANDS: SlashCommand[] = [
  { name: "help", aliases: ["commands", "?", "帮助"], description: "列出当前入口全部可用命令和执行方式", category: "基础", icon: "⌘", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "client", clientAction: "command_inventory" } },
  { name: "status", aliases: ["状态"], description: "查看当前会话、选择对象和消息状态", category: "基础", icon: "◉", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "client", clientAction: "status" } },
  { name: "plan", aliases: ["规划"], description: "先分析需求并给出可执行计划，不立即修改", category: "开发", icon: "◇", scopes: ["global", "project", "group"], argumentHint: "<目标>", requiresArgs: true, risk: "safe", source: "builtin", action: { type: "prompt", prompt: "请先分析并制定可执行计划，暂时不要修改项目。目标：$ARGS" } },
  { name: "review", aliases: ["审查"], description: "审查代码或当前交付，给出证据和风险", category: "开发", icon: "⌕", scopes: ["project", "group"], argumentHint: "[文件或范围]", risk: "safe", source: "builtin", action: { type: "prompt", prompt: "请对当前项目交付做严格审查，范围：$ARGS。请给出证据、风险等级和可操作建议，不要直接修改。" } },
  { name: "verify", aliases: ["test", "验证"], description: "运行适合当前项目的真实验证并汇报证据", category: "开发", icon: "✓", scopes: ["project", "group"], argumentHint: "[验证范围]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请针对当前项目执行真实验证，范围：$ARGS。记录实际运行的命令、输出摘要、失败原因和仍需人工确认的风险。" } },
  { name: "projects", aliases: ["项目"], description: "打开项目管理", category: "导航", icon: "▦", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "projects" } },
  { name: "groups", aliases: ["群聊"], description: "打开群聊协作", category: "导航", icon: "◌", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "groups" } },
  { name: "tasks", aliases: ["任务"], description: "打开任务中心查看执行状态和结果说明", category: "导航", icon: "☷", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "tasks" } },
  { name: "memory", aliases: ["记忆"], description: "打开记忆控制中心", category: "导航", icon: "◈", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "memory-center" } },
  { name: "quality", aliases: ["metrics", "质量"], description: "打开 Agent 质量与评测指标", category: "导航", icon: "◒", scopes: ["global", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "metrics" } },
  { name: "doctor", aliases: ["health", "诊断"], description: "读取系统就绪状态和故障详情", category: "运维", icon: "✚", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/orchestrator/diagnostics" } },
  { name: "tools", aliases: ["工具"], description: "打开 MCP、Skill 与工具配置", category: "导航", icon: "⚙", scopes: ["global", "project"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "tools" } },
  { name: "dashboard", aliases: ["workbench", "工作台"], description: "打开我的工作台", category: "导航", icon: "⌂", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "dashboard" } },
  { name: "config", aliases: ["配置"], description: "打开系统设置和 Agent 配置", category: "导航", icon: "⚙", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "navigate", tab: "settings" } },
  { name: "settings", aliases: ["设置"], description: "打开系统设置", category: "导航", icon: "⚙", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "settings" } },
  { name: "search", aliases: ["对话搜索"], description: "打开跨会话搜索", category: "导航", icon: "⌕", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "search" } },
  { name: "replay", aliases: ["任务回放"], description: "打开任务全过程回放", category: "导航", icon: "↻", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "trace-replay" } },
  { name: "changes", aliases: ["代码协作", "代码变更"], description: "打开代码协作工作台", category: "导航", icon: "±", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "changes" } },
  { name: "terminal", aliases: ["终端工作台", "内置终端", "终端"], description: "打开持久 PTY 终端工作台", category: "导航", icon: ">_", scopes: ["global", "project"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "terminal" } },
  { name: "cleanup", aliases: ["清理中心"], description: "打开受控清理中心", category: "导航", icon: "⌫", scopes: ["global", "project"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "cleanup-center" } },
  { name: "autodev", aliases: ["自动开发"], description: "打开自动开发工作流", category: "导航", icon: "▶", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "autodev" } },
  { name: "music", aliases: ["音乐"], description: "打开音乐 Agent", category: "导航", icon: "♪", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "music" } },
  { name: "compact", aliases: ["压缩"], description: "立即用模型压缩当前 Agent 会话，可附加摘要侧重点", argumentHint: "[摘要要求]", category: "记忆", icon: "⇲", scopes: ["global", "project", "group"], requiresContext: true, risk: "guarded", source: "ccm", action: { type: "client", clientAction: "compact_session" } },
  { name: "remember", aliases: ["记住"], description: "把明确事实或偏好写入正确的记忆作用域", category: "记忆", icon: "+", scopes: ["global", "project", "group"], argumentHint: "<要记住的内容>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请判断以下内容应属于全局、项目还是群聊记忆，说明作用域后写入；若含临时信息或敏感信息则不要长期保存：$ARGS" } },
  { name: "forget", aliases: ["忘记"], description: "从当前群聊会话删除唯一匹配的记忆", category: "记忆", icon: "-", scopes: ["group"], argumentHint: "<记忆 ID 或精确内容>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请从当前群聊会话记忆中忘记以下唯一目标；如果匹配到多条则只列候选，不要猜测删除：$ARGS" } },
  { name: "resume", aliases: ["continue", "续跑"], description: "从可靠的原生会话或任务检查点继续", category: "执行", icon: "▶", scopes: ["project", "group"], argumentHint: "[任务ID或说明]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请从当前上下文中查找可靠的原生会话、任务结果说明或检查点，并继续未完成工作：$ARGS。禁止无依据地宣称恢复成功。" } },
  { name: "retry", aliases: ["重试"], description: "按失败缺口重试，不重复已通过的步骤", category: "执行", icon: "↻", scopes: ["project", "group"], argumentHint: "[任务ID或失败项]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请根据最新失败结果说明按缺口重试：$ARGS。复用有效检查点，不要整轮盲目重跑，并重新执行交付门禁。" } },
  { name: "executor", aliases: ["执行器"], description: "查看或切换 Claude/Codex/Cursor 执行器", category: "执行", icon: "⌁", scopes: ["global", "project", "group"], argumentHint: "[claude|codex|cursor]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请检查当前执行器健康与会话恢复能力。用户指定：$ARGS。若要求切换，先验证目标执行器可用并说明影响，再走现有配置确认流程。" } },
  { name: "shadow", aliases: ["影子模式"], description: "查看或调整 Agent 决策影子模式", category: "治理", icon: "◐", scopes: ["global", "group"], argumentHint: "[status|on|off]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请读取 Agent 决策影子模式的真实配置和近期命中情况。请求：$ARGS。任何配置变更必须走现有确认和审计流程。" } },
  { name: "recover", aliases: ["恢复"], description: "诊断阻塞任务并按证据执行恢复", category: "治理", icon: "⟳", scopes: ["global", "project", "group"], argumentHint: "[任务ID或范围]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "请诊断并恢复指定范围：$ARGS。先读取 Trace、结果说明和检查点，区分业务失败与基础设施失败，再选择原会话恢复、切换执行器或按缺口返工。" } },
  { name: "project-start", aliases: ["启动项目"], description: "运行指定源码项目（需经过确认）", category: "项目操作", icon: "▶", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请运行源码项目 $ARGS。执行前必须核对项目身份、运行配置、启动命令和当前进程状态；多个配置且没有默认项时先询问用户，并走现有高风险确认流程。" } },
  { name: "project-stop", aliases: ["停止项目", "暂停项目"], description: "暂停指定源码项目（需经过确认）", category: "项目操作", icon: "■", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请暂停源码项目 $ARGS。执行前必须核对项目身份、运行配置与进程归属，并走现有高风险确认流程，不得按模糊名称误停其他进程。" } },
  { name: "project-restart", aliases: ["重新运行项目", "重启项目"], description: "重新运行指定源码项目", category: "项目操作", icon: "↻", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请重新运行源码项目 $ARGS。核对精确运行配置与进程归属后，先暂停该配置再使用原配置启动，并走现有高风险确认流程。" } },
  { name: "project-build", aliases: ["构建项目", "打包项目"], description: "构建或打包指定源码项目", category: "项目操作", icon: "▣", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请构建或打包源码项目 $ARGS。必须使用项目已经保存的精确构建配置，说明是否运行测试，并走现有高风险确认流程。" } },
  { name: "project-connect", aliases: ["连接项目Agent", "连接项目 Agent"], description: "连接项目 Agent 与协作通道", category: "项目操作", icon: "⌁", scopes: ["global"], argumentHint: "<项目名>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "请连接项目 Agent 与协作通道 $ARGS。这个操作只启动 cc-connect 会话和通知通道，不运行源码项目；核对项目后走现有高风险确认流程。" } },
  { name: "new", aliases: ["new-session", "新会话"], description: "新建当前 Agent 会话", category: "会话", icon: "+", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", action: { type: "client", clientAction: "new_session" } },
  { name: "clear", aliases: ["清空会话"], description: "清空当前会话消息（需确认）", category: "会话", icon: "⌫", scopes: ["global", "project", "group"], requiresContext: true, risk: "high", source: "ccm", action: { type: "client", clientAction: "clear_session" } },
  { name: "context", aliases: ["上下文"], description: "查看当前会话上下文和消息占用", category: "会话", icon: "◎", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", action: { type: "client", clientAction: "context" } },
  { name: "sessions", aliases: ["session", "会话列表"], description: "列出当前入口的真实会话", category: "会话", icon: "☷", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", action: { type: "client", clientAction: "list_sessions" } },
  { name: "rename", aliases: ["重命名会话"], description: "重命名当前会话", category: "会话", icon: "✎", scopes: ["global", "project", "group"], argumentHint: "<新名称>", requiresArgs: true, requiresContext: true, risk: "guarded", source: "builtin", action: { type: "client", clientAction: "rename_session" } },
  { name: "copy", aliases: ["复制回复"], description: "复制最近一条 Agent 可见回复", category: "会话", icon: "⧉", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", action: { type: "client", clientAction: "copy_last_response" } },
  { name: "usage", aliases: ["用量"], description: "统计当前会话消息和估算上下文占用", category: "会话", icon: "◔", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", action: { type: "client", clientAction: "usage_stats" } },
  { name: "stats", aliases: ["统计"], description: "查看当前会话角色、附件和内容统计", category: "会话", icon: "▥", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", action: { type: "client", clientAction: "usage_stats" } },
  { name: "theme", aliases: ["主题"], description: "查看或切换 light/dark 主题", category: "界面", icon: "◐", scopes: ["global", "project", "group"], argumentHint: "[light|dark]", risk: "safe", source: "builtin", action: { type: "client", clientAction: "theme" } },
  { name: "diff", aliases: ["changes", "变更"], description: "直接读取当前项目 Git 文件变更", category: "开发现场", icon: "±", scopes: ["project"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/git/status?project=$PROJECT" } },
  { name: "trace", aliases: ["链路"], description: "直接读取指定执行 Trace", category: "任务追踪", icon: "⌁", scopes: ["global", "project", "group"], argumentHint: "<Trace ID>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/reliability/traces?id=$ARGS" } },
  { name: "task", aliases: ["任务详情"], description: "直接读取任务状态、结果说明和验收结论", category: "任务追踪", icon: "☑", scopes: ["global", "project", "group"], argumentHint: "<任务 ID>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/tasks" } },
  { name: "agents", aliases: ["agent-health", "执行器健康"], description: "直接读取 Agent 与执行器健康状态", category: "任务追踪", icon: "◉", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/orchestrator/resilience" } },
  { name: "checkpoint", aliases: ["检查点"], description: "为指定执行创建 Git 安全检查点", category: "开发现场", icon: "◆", scopes: ["project", "group"], argumentHint: "<Execution ID>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "mutation", endpoint: "/api/tasks/execution/checkpoint", method: "POST", body: { execution_id: "$ARGS", label: "用户通过 /checkpoint 创建" } } },
  { name: "rollback", aliases: ["回滚检查点"], description: "回滚到指定执行检查点（仅隔离 worktree）", category: "开发现场", icon: "↶", scopes: ["project", "group"], argumentHint: "<Checkpoint ID>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "mutation", endpoint: "/api/tasks/execution/rollback", method: "POST", body: { checkpoint_id: "$ARGS", reason: "用户通过 /rollback 明确确认回滚", allow_shared: false, confirmed: true } } },
  { name: "logs", aliases: ["日志"], description: "读取当前群聊或任务的近期日志", category: "开发现场", icon: "≡", scopes: ["global", "project", "group"], argumentHint: "[任务 ID]", risk: "safe", source: "ccm", action: { type: "query", endpointByScope: { global: "/api/tasks", project: "/api/tasks", group: "/api/groups/logs?id=$GROUP_ID&limit=50" } } },
  { name: "knowledge", aliases: ["kb", "知识库"], description: "直接检索本地知识库，不调用模型", category: "知识", icon: "⌕", scopes: ["global", "project", "group"], argumentHint: "<关键词>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/rag/query", method: "POST", body: { query: "$ARGS" } } },
  { name: "files", aliases: ["共享文件"], description: "读取当前作用域的共享文件列表", category: "知识", icon: "▤", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpointByScope: { global: "/api/shared-files?scope=global", project: "/api/shared-files?scope=project&scope_id=$PROJECT", group: "/api/shared-files?scope=group&scope_id=$GROUP_ID" } } },
  { name: "cron", aliases: ["定时任务"], description: "直接读取定时任务和调度器状态", category: "运维", icon: "◷", scopes: ["global", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/cron" } },
  { name: "soak", aliases: ["稳定性"], description: "读取 24 小时稳定性运行状态和报告", category: "运维", icon: "≈", scopes: ["global", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/reliability/soak/status" } },
  { name: "permissions", aliases: ["权限"], description: "读取全局 Agent 能力与授权边界", category: "治理", icon: "⚿", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/global-agent/capabilities" } },
  { name: "model", aliases: ["模型"], description: "读取可用模型执行器及原生续跑能力", category: "执行", icon: "◇", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/orchestrator/resilience" } },
  { name: "mcp", aliases: ["MCP服务"], description: "直接读取已配置的 MCP 服务", category: "工具", icon: "◇", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "query", endpoint: "/api/mcp" } },
  { name: "skills", aliases: ["技能"], description: "直接读取已安装的 Skill", category: "工具", icon: "✦", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "query", endpoint: "/api/skills" } },
  { name: "hooks", aliases: ["钩子"], description: "直接读取全局 Agent 运行时钩子", category: "治理", icon: "⌁", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "query", endpoint: "/api/global-agent/runtime/hooks" } },
  { name: "branch", aliases: ["分支"], description: "直接读取当前项目 Git 分支和变更数", category: "开发现场", icon: "⑂", scopes: ["project"], risk: "safe", source: "builtin", action: { type: "query", endpoint: "/api/git/status?project=$PROJECT" } },
  { name: "history", aliases: ["git-log", "提交历史"], description: "直接读取当前项目 Git 提交历史", category: "开发现场", icon: "≡", scopes: ["project"], risk: "safe", source: "builtin", action: { type: "query", endpoint: "/api/git/log?project=$PROJECT&limit=30" } },
  { name: "commit", aliases: ["提交代码"], description: "提交当前项目全部变更（需确认）", category: "开发现场", icon: "✓", scopes: ["project"], argumentHint: "<提交说明>", requiresArgs: true, risk: "high", source: "builtin", action: { type: "mutation", endpoint: "/api/git/commit", method: "POST", body: { project: "$PROJECT", message: "$ARGS", allFiles: true, confirmed: true, action: "commit" } } },
  { name: "security-review", aliases: ["安全审查"], description: "让项目 Agent 执行真实安全审查并给出证据", category: "开发", icon: "⚿", scopes: ["project", "group"], argumentHint: "[范围]", risk: "guarded", source: "builtin", action: { type: "prompt", prompt: "请对当前项目执行安全审查，范围：$ARGS。检查依赖、密钥泄露、输入验证、权限边界和高风险代码路径，运行可用的真实检查，并把证据与修复建议分级汇报；不要在未经确认时修改。" } },
  { name: "export", aliases: ["导出"], description: "导出当前会话或群聊上下文为 JSON", category: "会话", icon: "⇩", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", action: { type: "client", clientAction: "export_context" } },
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

function authorizedSkillNames(scope: SlashCommandScope, context: any = {}) {
  if (scope === "global") return new Set((loadGlobalAgentToolAuthorization()?.tools?.skill || []).map((name: any) => String(name).trim()).filter(Boolean));
  if (scope === "project") {
    const project = String(context?.project || "").trim();
    return new Set((loadProjectConfigs()?.[project]?.tools?.skill || []).map((name: any) => String(name).trim()).filter(Boolean));
  }
  const groupId = String(context?.groupId || "").trim();
  const group = loadGroups().find((item: any) => String(item.id) === groupId);
  return new Set((group?.tools?.skill || []).map((name: any) => String(name).trim()).filter(Boolean));
}

function loadSkillCommands(scope: SlashCommandScope, context: any = {}): SlashCommand[] {
  const authorized = authorizedSkillNames(scope, context);
  return loadSkills()
    .filter((skill: any) => skill && skill.enabled !== false && skill.name && skill.prompt && authorized.has(String(skill.name)))
    .map((skill: any) => ({
      name: `skill:${String(skill.name).trim().replace(/\s+/g, "-")}`,
      aliases: [],
      description: String(skill.description || `调用 ${skill.name} Skill`),
      category: "Skill",
      icon: "✦",
      scopes: [scope] as SlashCommandScope[],
      argumentHint: "[补充要求]",
      risk: "guarded" as SlashRisk,
      source: "skill" as const,
      action: {
        type: "prompt" as const,
        prompt: `${String(skill.prompt).trim()}\n\n用户本次补充要求：$ARGS`,
      },
    }));
}

function commandsForScope(scope: SlashCommandScope, context: any = {}) {
  const merged = [...COMMANDS, ...loadCustomCommands(), ...loadSkillCommands(scope, context)];
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
  if (scope === "project" && command.requiresContext && !String(context.project || "").trim()) return { enabled: false, reason: "请先选择项目" };
  if (scope === "group" && command.requiresContext && !String(context.group || context.groupId || "").trim()) return { enabled: false, reason: "请先选择群聊" };
  return { enabled: true, reason: "" };
}

function commandImplementation(command: SlashCommand): SlashImplementation {
  if (command.implementation) return command.implementation;
  if (command.action.type === "query") return "local-query";
  if (command.action.type === "mutation") return "local-mutation";
  if (command.action.type === "client") return "client";
  if (command.action.type === "navigate") return "navigation";
  return "agent-workflow";
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
    implementation: commandImplementation(command),
    parameterSchema: command.argumentHint ? [{ name: "args", type: "string", required: !!command.requiresArgs, hint: command.argumentHint }] : [],
    availability: commandAvailability(command, scope, context),
  };
}

export function getSlashCommandSummary() {
  return {
    total: COMMANDS.length + loadCustomCommands().length,
    builtin: COMMANDS.length,
    custom: loadCustomCommands().length,
    skills: "scope_authorized",
  };
}

export function getSlashCommandContractSnapshot() {
  return {
    commands: COMMANDS.map(command => ({
      name: command.name,
      aliases: command.aliases || [],
      scopes: command.scopes,
      risk: command.risk || "safe",
      requiresArgs: !!command.requiresArgs,
      requiresContext: !!command.requiresContext,
      implementation: commandImplementation(command),
      action: command.action,
    })),
    counts: {
      global: commandsForScope("global").length,
      project: commandsForScope("project").length,
      group: commandsForScope("group").length,
    },
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
    skillsRequireScopeAuthorization: !globalCommands.some(command => command.source === "skill") || authorizedSkillNames("global").size > 0,
    localQueriesDoNotInvokeModel: projectCommands.find(command => command.name === "diff")?.action.type === "query" && globalCommands.find(command => command.name === "agents")?.action.type === "query",
    clientSessionCommandsAreExplicit: globalCommands.find(command => command.name === "new")?.action.clientAction === "new_session" && globalCommands.find(command => command.name === "clear")?.risk === "high",
    groupCompactIsDirectAndExactSession: commandsForScope("group").find(command => command.name === "compact")?.action.clientAction === "compact_session",
    checkpointAndRollbackAreControlled: projectCommands.find(command => command.name === "checkpoint")?.action.type === "mutation" && projectCommands.find(command => command.name === "rollback")?.risk === "high",
    localMutationNeedsManagePermission: publicCommand(projectCommands.find(command => command.name === "checkpoint")!, "project", { project: "demo" }).permission === "manage",
    endpointArgumentsAreEncoded: expandedEndpoint.includes("%E9%A1%B9%E7%9B%AE%20A") && expandedEndpoint.includes("trace%20a%2Fb"),
    longestContextPlaceholderWins: expandedGroupEndpoint.includes("id=group-1") && !expandedGroupEndpoint.includes("_ID"),
    allCommandsDeclareExecutableActions: [globalCommands, projectCommands, commandsForScope("group")].flat().every(command => {
      if (command.action.type === "prompt") return !!command.action.prompt?.trim();
      if (command.action.type === "navigate") return !!command.action.tab?.trim();
      if (command.action.type === "client") return !!command.action.clientAction?.trim();
      return !!(command.action.endpoint || command.action.endpointByScope);
    }),
    implementationMetadataPublished: ["client", "navigation", "local-query", "local-mutation", "agent-workflow"].every(implementation =>
      [globalCommands, projectCommands, commandsForScope("group")].flat().some(command => publicCommand(command).implementation === implementation)
    ),
    ccParityCommandsPresent: ["help", "status", "config", "context", "copy", "diff", "doctor", "export", "hooks", "mcp", "memory", "model", "permissions", "plan", "rename", "review", "security-review", "sessions", "skills", "stats", "tasks", "theme", "usage"].every(name =>
      [globalCommands, projectCommands, commandsForScope("group")].flat().some(command => command.name === name)
    ),
  };
  return { pass: Object.values(checks).every(Boolean), checks, endpointPreview: expandedEndpoint, counts: { global: globalCommands.length, project: projectCommands.length, group: commandsForScope("group").length } };
}

export function handleSlashCommandsApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/slash-commands" && req.method === "GET") {
    const scope = normalizeScope(parsed.query.scope);
    const context = { project: parsed.query.project || "", group: parsed.query.group || "", groupId: parsed.query.groupId || "" };
    const commands = commandsForScope(scope, context);
    sendJson(res, { scope, commands: commands.map(command => publicCommand(command, scope, context)), ...getSlashCommandSummary(), skills: commands.filter(command => command.source === "skill").length });
    return true;
  }

  if (pathname === "/api/slash-commands/custom" && req.method === "GET") {
    sendJson(res, { commands: loadCustomCommands().map(command => ({ ...command, source: undefined })) });
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
        withFileLock(CUSTOM_COMMANDS_FILE, () => writeJsonAtomic(CUSTOM_COMMANDS_FILE, { schema: "ccm-slash-command-registry-v2", revision: Date.now(), commands: values }));
        recordAudit({ command: "custom-registry:update", scope: "global", source: "custom", risk: "guarded", actionType: "registry", count: values.length });
        sendJson(res, { success: true, count: values.length });
      } catch (error: any) {
        sendJson(res, { error: error?.message || "保存自定义命令失败" }, 400);
      }
    }).catch((error: any) => sendJson(res, { error: error?.message || "读取请求失败" }, 400));
    return true;
  }

  if (pathname === "/api/slash-commands/confirm" && req.method === "POST") {
    collectRequestBuffer(req).then(buffer => {
      try {
        const body = JSON.parse(buffer.toString("utf8") || "{}");
        if (body.confirmed !== true) return sendJson(res, { success: false, error: "用户未确认命令" }, 409);
        const challenge = readConfirmationPayload(body.challenge, "challenge");
        const principal = principalIdentity(req);
        if (String(challenge.principal_id || "") !== principal.id || String(challenge.session_id || "") !== principal.session || String(challenge.role || "") !== principal.role) {
          return sendJson(res, { success: false, error: "确认挑战不属于当前登录会话" }, 403);
        }
        const receipt = signConfirmationPayload({
          ...challenge,
          kind: "receipt",
          id: `slash_rcpt_${crypto.randomUUID()}`,
          challenge_id: challenge.id,
          confirmed_at: Date.now(),
          expires_at: Date.now() + CONFIRMATION_TTL_MS,
        });
        recordAudit({ command: challenge.command, scope: challenge.scope, source: "confirmation", risk: "high", actionType: "confirm", principal: principal.id });
        sendJson(res, { success: true, confirmation_receipt: receipt, expires_in_ms: CONFIRMATION_TTL_MS });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "命令确认失败" }, 400);
      }
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "读取请求失败" }, 400));
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
        const command = commandsForScope(scope, body.context || {}).find(item => item.name.toLowerCase() === lowerName || (item.aliases || []).some(alias => alias.toLowerCase() === lowerName));
        if (!command) return sendJson(res, { error: `当前入口不支持 /${invocation.name}` }, 404);
        if (command.requiresArgs && !invocation.args) {
          return sendJson(res, { success: true, needsArgs: true, command: publicCommand(command, scope, body.context || {}) });
        }
        const availability = commandAvailability(command, scope, body.context || {});
        if (!availability.enabled) return sendJson(res, { error: availability.reason }, 409);
        const context = body.context || {};
        if (confirmationRequired(command)) {
          assertCommandRole(req, command);
          if (!body.confirmation_receipt) {
            return sendJson(res, {
              success: false,
              error: "该命令需要服务端确认",
              code: "SLASH_CONFIRMATION_REQUIRED",
              confirmation_required: true,
              confirmation_challenge: createConfirmationChallenge(req, scope, command, invocation, context),
              command: publicCommand(command, scope, context),
            }, 409);
          }
          consumeConfirmationReceipt(req, body.confirmation_receipt, scope, command, invocation, context);
        }
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
