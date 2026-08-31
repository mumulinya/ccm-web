"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlashCommandSummary = getSlashCommandSummary;
exports.getSlashCommandContractSnapshot = getSlashCommandContractSnapshot;
exports.runSlashCommandSelfTest = runSlashCommandSelfTest;
exports.handleSlashCommandsApi = handleSlashCommandsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const storage_1 = require("../collaboration/storage");
const global_agent_tool_authorization_1 = require("../global/global-agent-tool-authorization");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const CUSTOM_COMMANDS_FILE = path.join(utils_1.CCM_DIR, "configs", "slash-commands.json");
const AUDIT_FILE = path.join(utils_1.CCM_DIR, "logs", "slash-command-audit.jsonl");
const CONFIRMATION_SECRET = crypto.randomBytes(32);
const usedConfirmationReceipts = new Map();
const CONFIRMATION_TTL_MS = 2 * 60_000;
function pruneConfirmationReceipts() {
    const cutoff = Date.now() - CONFIRMATION_TTL_MS;
    for (const [id, usedAt] of usedConfirmationReceipts)
        if (usedAt < cutoff)
            usedConfirmationReceipts.delete(id);
    while (usedConfirmationReceipts.size > 1000)
        usedConfirmationReceipts.delete(usedConfirmationReceipts.keys().next().value);
}
function principalIdentity(req) {
    const auth = req?.ccmAuth;
    if (!auth)
        throw new Error("缺少已认证主体");
    return {
        id: auth.kind === "browser" ? String(auth.userId || "") : `internal:${String(auth.caller || "")}`,
        session: auth.kind === "browser" ? String(auth.sessionId || "") : "",
        role: String(auth.role || ""),
    };
}
function signConfirmationPayload(payload) {
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = crypto.createHmac("sha256", CONFIRMATION_SECRET).update(encoded).digest("base64url");
    return `${encoded}.${signature}`;
}
function readConfirmationPayload(token, expectedKind) {
    const [encoded, signature] = String(token || "").split(".");
    if (!encoded || !signature)
        throw new Error("确认凭据无效");
    const expected = crypto.createHmac("sha256", CONFIRMATION_SECRET).update(encoded).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected))
        throw new Error("确认凭据签名无效");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.kind !== expectedKind || Number(payload.expires_at || 0) < Date.now())
        throw new Error("确认凭据已过期");
    return payload;
}
function confirmationBinding(req, scope, command, invocation, context) {
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
function confirmationRequired(command) {
    return command.risk === "high" || command.action.type === "mutation";
}
function assertCommandRole(req, command) {
    const principal = principalIdentity(req);
    if (!confirmationRequired(command))
        return;
    if (command.risk === "high" && principal.role !== "admin")
        throw new Error("该高风险命令只能由 Admin 确认");
    if (command.action.type === "mutation" && !["admin", "user", "operator", "internal"].includes(principal.role))
        throw new Error("当前账户无权执行本地修改命令");
}
function createConfirmationChallenge(req, scope, command, invocation, context) {
    assertCommandRole(req, command);
    return signConfirmationPayload({
        schema: "ccm-slash-command-confirmation-v1",
        kind: "challenge",
        id: `slash_ch_${crypto.randomUUID()}`,
        ...confirmationBinding(req, scope, command, invocation, context),
        expires_at: Date.now() + CONFIRMATION_TTL_MS,
    });
}
function consumeConfirmationReceipt(req, token, scope, command, invocation, context) {
    const payload = readConfirmationPayload(token, "receipt");
    const binding = confirmationBinding(req, scope, command, invocation, context);
    for (const key of ["principal_id", "session_id", "role", "scope", "command", "invocation_checksum"]) {
        if (String(payload[key] || "") !== String(binding[key] || ""))
            throw new Error("确认凭据与当前命令或会话不匹配");
    }
    pruneConfirmationReceipts();
    if (usedConfirmationReceipts.has(payload.id))
        throw new Error("确认凭据已使用");
    usedConfirmationReceipts.set(payload.id, Date.now());
}
const COMMANDS = [
    { name: "help", aliases: ["commands", "?", "帮助"], description: "显示当前入口可用命令", category: "基础", icon: "⌘", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_exact", action: { type: "client", clientAction: "command_inventory" } },
    { name: "status", aliases: ["状态"], description: "显示版本、模型、Provider、工具和当前作用域状态", category: "基础", icon: "◉", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "status" } },
    { name: "plan", aliases: ["规划"], description: "进入、查看或退出当前会话 Plan Mode", category: "开发", icon: "◇", scopes: ["project", "group"], argumentHint: "[open|exit|目标]", risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_exact", action: { type: "client", clientAction: "plan_mode" } },
    { name: "review", aliases: ["审查"], description: "审查代码或当前交付，给出证据和风险", category: "开发", icon: "⌕", scopes: ["project", "group"], argumentHint: "[文件或范围]", risk: "safe", source: "builtin", action: { type: "prompt", prompt: "Perform a strict review of the current project delivery for scope $ARGS. Provide evidence, risk levels, and actionable recommendations; do not modify files directly." } },
    { name: "verify", aliases: ["test", "验证"], description: "运行适合当前项目的真实验证并汇报证据", category: "开发", icon: "✓", scopes: ["project", "group"], argumentHint: "[验证范围]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Run real verification suitable for the current project and scope $ARGS. Record commands actually run, safe output summaries, failure causes, and risks that still require user confirmation." } },
    { name: "projects", aliases: ["项目"], description: "打开项目管理", category: "导航", icon: "▦", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "projects" } },
    { name: "groups", aliases: ["群聊"], description: "打开群聊协作", category: "导航", icon: "◌", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "groups" } },
    { name: "tasks", aliases: ["任务"], description: "列出和管理当前会话的后台任务与子 Agent", category: "执行", icon: "☷", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "session_tasks" } },
    { name: "task-center", aliases: ["任务中心"], description: "打开 CCM 任务中心", category: "导航", icon: "☷", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", compatibility: "ccm_extension", action: { type: "navigate", tab: "tasks" } },
    { name: "memory", aliases: ["记忆"], description: "管理当前作用域的记忆", category: "记忆", icon: "◈", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "memory_manager" } },
    { name: "quality", aliases: ["metrics", "质量"], description: "打开 Agent 质量与评测指标", category: "导航", icon: "◒", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "metrics" } },
    { name: "doctor", aliases: ["health", "诊断"], description: "读取系统就绪状态和故障详情", category: "运维", icon: "✚", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/orchestrator/diagnostics" } },
    { name: "tools", aliases: ["工具"], description: "打开 MCP、Skill 与工具配置", category: "导航", icon: "⚙", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "tools" } },
    { name: "dashboard", aliases: ["workbench", "工作台"], description: "打开我的工作台", category: "导航", icon: "⌂", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "dashboard" } },
    { name: "config", aliases: ["配置"], description: "打开当前作用域配置面板", category: "配置", icon: "⚙", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "config_panel" } },
    { name: "settings", aliases: ["设置"], description: "打开系统设置", category: "导航", icon: "⚙", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "settings" } },
    { name: "search", aliases: ["对话搜索"], description: "打开跨会话搜索", category: "导航", icon: "⌕", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "search" } },
    { name: "replay", aliases: ["任务回放"], description: "打开任务全过程回放", category: "导航", icon: "↻", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "trace-replay" } },
    { name: "changes", aliases: ["代码协作", "代码变更"], description: "打开代码协作工作台", category: "导航", icon: "±", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "changes" } },
    { name: "terminal", aliases: ["终端工作台", "内置终端", "终端"], description: "打开持久 PTY 终端工作台", category: "导航", icon: ">_", scopes: ["global", "project"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "terminal" } },
    { name: "cleanup", aliases: ["清理中心"], description: "打开受控清理中心", category: "导航", icon: "⌫", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "cleanup-center" } },
    { name: "autodev", aliases: ["自动开发运营", "自动开发", "无人值守开发"], description: "打开自动开发运营、批量接活与工作复盘", category: "导航", icon: "▶", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "autodev" } },
    { name: "music", aliases: ["音乐"], description: "打开音乐 Agent", category: "导航", icon: "♪", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", action: { type: "navigate", tab: "music" } },
    { name: "compact", aliases: ["压缩"], description: "立即压缩当前 Agent 会话，可附加摘要侧重点", argumentHint: "[摘要要求]", category: "记忆", icon: "⇲", scopes: ["global", "project", "group"], requiresContext: true, risk: "guarded", source: "ccm", action: { type: "client", clientAction: "compact_session" } },
    { name: "remember", aliases: ["记住"], description: "把明确事实或偏好写入正确的记忆作用域", category: "记忆", icon: "+", scopes: ["global", "project", "group"], argumentHint: "<要记住的内容>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Determine whether the following content belongs in global, project, or group memory and write it only to that scope. Do not retain temporary or sensitive information: $ARGS" } },
    { name: "forget", aliases: ["忘记"], description: "从当前群聊会话删除唯一匹配的记忆", category: "记忆", icon: "-", scopes: ["group"], argumentHint: "<记忆 ID 或精确内容>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Forget the following single exact target from the current group memory. If multiple matches exist, list candidates only and never guess which one to delete: $ARGS" } },
    { name: "resume", aliases: ["continue", "续跑"], description: "搜索并恢复当前作用域的历史会话", category: "会话", icon: "▶", scopes: ["global", "project", "group"], argumentHint: "[会话ID或标题]", risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_exact", action: { type: "client", clientAction: "session_manager" } },
    { name: "retry", aliases: ["重试"], description: "按失败缺口重试，不重复已通过的步骤", category: "执行", icon: "↻", scopes: ["project", "group"], argumentHint: "[任务ID或失败项]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Use the latest failure evidence to retry only the missing gap: $ARGS. Reuse valid checkpoints, do not blindly rerun the whole round, and run the delivery gate again." } },
    { name: "executor", aliases: ["执行器"], description: "查看或切换 Claude/Codex/Cursor 执行器", category: "执行", icon: "⌁", scopes: ["global", "project", "group"], argumentHint: "[claude|codex|cursor]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Check the current executor health and session-recovery capability. User request: $ARGS. If a switch is requested, verify the target executor first, explain impact, and use the existing configuration-confirmation flow." } },
    { name: "shadow", aliases: ["影子模式"], description: "查看或调整 Agent 决策影子模式", category: "治理", icon: "◐", scopes: ["global"], argumentHint: "[status|on|off]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Read the actual Agent decision shadow-mode configuration and recent matches. Request: $ARGS. Any configuration change must use the existing confirmation and audit flow." } },
    { name: "recover", aliases: ["恢复"], description: "诊断阻塞任务并按证据执行恢复", category: "治理", icon: "⟳", scopes: ["global", "project", "group"], argumentHint: "[任务ID或范围]", risk: "guarded", source: "ccm", action: { type: "prompt", prompt: "Diagnose and recover the requested scope: $ARGS. Read Trace, result summaries, and checkpoints first; distinguish business failure from infrastructure failure, then choose session recovery, executor switch, or gap-specific rework." } },
    { name: "project-start", aliases: ["启动项目"], description: "运行指定源码项目（需经过确认）", category: "项目操作", icon: "▶", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "Run source project $ARGS. Before execution, verify project identity, run configuration, start command, and current process state. If multiple configurations exist without a default, ask the user first and use the existing high-risk confirmation flow." } },
    { name: "project-stop", aliases: ["停止项目", "暂停项目"], description: "暂停指定源码项目（需经过确认）", category: "项目操作", icon: "■", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "Pause source project $ARGS. Verify project identity, run configuration, and process ownership first. Use the existing high-risk confirmation flow and never stop another process based on an ambiguous name." } },
    { name: "project-restart", aliases: ["重新运行项目", "重启项目"], description: "重新运行指定源码项目", category: "项目操作", icon: "↻", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "Restart source project $ARGS. Verify the exact run configuration and process ownership, pause that configuration, then start it with the original configuration through the existing high-risk confirmation flow." } },
    { name: "project-build", aliases: ["构建项目", "打包项目"], description: "构建或打包指定源码项目", category: "项目操作", icon: "▣", scopes: ["global"], argumentHint: "<项目名> [运行配置]", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "Build or package source project $ARGS using the exact saved project build configuration. State whether tests will run and use the existing high-risk confirmation flow." } },
    { name: "project-connect", aliases: ["连接项目Agent", "连接项目 Agent"], description: "连接项目 Agent 与协作通道", category: "项目操作", icon: "⌁", scopes: ["global"], argumentHint: "<项目名>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "prompt", prompt: "Connect the project Agent and collaboration channel for $ARGS. This starts only the cc-connect session and notification channel; it does not run the source project. Verify the project and use the existing high-risk confirmation flow." } },
    { name: "new", aliases: ["new-session", "新会话"], description: "新建当前 Agent 会话", category: "会话", icon: "+", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", executionType: "local-jsx", displayMode: "skip", historyPolicy: "transient", modelVisibility: "hidden", action: { type: "client", clientAction: "new_session" } },
    { name: "clear", aliases: ["清空会话"], description: "清空当前会话消息（需确认）", category: "会话", icon: "⌫", scopes: ["global", "project", "group"], requiresContext: true, risk: "high", source: "ccm", action: { type: "client", clientAction: "clear_session" } },
    { name: "context", aliases: ["上下文"], description: "查看当前会话上下文和消息占用", category: "会话", icon: "◎", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", action: { type: "client", clientAction: "context" } },
    { name: "session", aliases: ["sessions", "会话列表"], description: "搜索、选择、恢复或分叉当前入口会话", category: "会话", icon: "☷", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "session_manager" } },
    { name: "rename", aliases: ["重命名会话"], description: "重命名当前会话", category: "会话", icon: "✎", scopes: ["global", "project", "group"], argumentHint: "<新名称>", requiresArgs: true, requiresContext: true, risk: "guarded", source: "builtin", action: { type: "client", clientAction: "rename_session" } },
    { name: "copy", aliases: ["复制回复"], description: "复制最近一条 Agent 可见回复", category: "会话", icon: "⧉", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "skip", historyPolicy: "transient", modelVisibility: "hidden", compatibility: "cc_equivalent", action: { type: "client", clientAction: "copy_last_response" } },
    { name: "usage", aliases: ["用量"], description: "显示 Provider 明确返回的额度和用量", category: "会话", icon: "◔", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "provider_usage" } },
    { name: "stats", aliases: ["统计"], description: "显示当前入口的跨会话活动统计", category: "会话", icon: "▥", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "activity_stats" } },
    { name: "session-stats", aliases: ["会话统计"], description: "显示当前会话消息、附件与上下文估算", category: "会话", icon: "▥", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", compatibility: "ccm_extension", action: { type: "client", clientAction: "usage_stats" } },
    { name: "cost", aliases: ["费用"], description: "显示 Provider 上报的当前会话费用和耗时", category: "会话", icon: "◒", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "builtin", compatibility: "cc_equivalent", action: { type: "client", clientAction: "provider_cost" } },
    { name: "theme", aliases: ["主题"], description: "查看或切换 light/dark 主题", category: "界面", icon: "◐", scopes: ["global", "project", "group"], argumentHint: "[light|dark]", risk: "safe", source: "builtin", action: { type: "client", clientAction: "theme" } },
    { name: "diff", aliases: ["变更"], description: "查看未提交变更和当前任务变更摘要", category: "开发现场", icon: "±", scopes: ["project"], risk: "safe", source: "builtin", compatibility: "cc_equivalent", action: { type: "query", endpoint: "/api/git/diff?project=$PROJECT" } },
    { name: "git-status", aliases: ["branch-status", "changes", "Git状态"], description: "读取当前项目 Git 分支和文件状态", category: "开发现场", icon: "⑂", scopes: ["project"], risk: "safe", source: "ccm", compatibility: "ccm_extension", action: { type: "query", endpoint: "/api/git/status?project=$PROJECT" } },
    { name: "trace", aliases: ["链路"], description: "直接读取指定执行 Trace", category: "任务追踪", icon: "⌁", scopes: ["global", "project", "group"], argumentHint: "<Trace ID>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/reliability/traces?id=$ARGS" } },
    { name: "task", aliases: ["任务详情"], description: "直接读取任务状态、结果说明和验收结论", category: "任务追踪", icon: "☑", scopes: ["global", "project", "group"], argumentHint: "<任务 ID>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/tasks" } },
    { name: "agents", aliases: ["Agent配置"], description: "管理当前作用域的 Agent 配置", category: "执行", icon: "◉", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "agents_manager" } },
    { name: "agent-health", aliases: ["执行器健康"], description: "读取 Agent 与执行器健康状态", category: "任务追踪", icon: "◉", scopes: ["global"], risk: "safe", source: "ccm", compatibility: "ccm_extension", action: { type: "query", endpoint: "/api/orchestrator/resilience" } },
    { name: "checkpoint", aliases: ["检查点"], description: "为指定执行创建 Git 安全检查点", category: "开发现场", icon: "◆", scopes: ["project", "group"], argumentHint: "<Execution ID>", requiresArgs: true, risk: "guarded", source: "ccm", action: { type: "mutation", endpoint: "/api/tasks/execution/checkpoint", method: "POST", body: { execution_id: "$ARGS", label: "用户通过 /checkpoint 创建" } } },
    { name: "rollback", aliases: ["回滚检查点"], description: "回滚到指定执行检查点（仅隔离 worktree）", category: "开发现场", icon: "↶", scopes: ["project", "group"], argumentHint: "<Checkpoint ID>", requiresArgs: true, risk: "high", source: "ccm", action: { type: "mutation", endpoint: "/api/tasks/execution/rollback", method: "POST", body: { checkpoint_id: "$ARGS", reason: "用户通过 /rollback 明确确认回滚", allow_shared: false, confirmed: true } } },
    { name: "logs", aliases: ["日志"], description: "读取当前群聊或任务的近期日志", category: "开发现场", icon: "≡", scopes: ["global", "project", "group"], argumentHint: "[任务 ID]", risk: "safe", source: "ccm", action: { type: "query", endpointByScope: { global: "/api/tasks", project: "/api/tasks", group: "/api/groups/logs?id=$GROUP_ID&limit=50" } } },
    { name: "knowledge", aliases: ["kb", "知识库"], description: "直接检索本地知识库，不调用模型", category: "知识", icon: "⌕", scopes: ["global", "project", "group"], argumentHint: "<关键词>", requiresArgs: true, risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/rag/query", method: "POST", body: { query: "$ARGS" } } },
    { name: "files", aliases: ["上下文文件"], description: "显示当前模型上下文中的文件和来源", category: "会话", icon: "▤", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", compatibility: "cc_equivalent", action: { type: "client", clientAction: "context_files" } },
    { name: "shared-files", aliases: ["共享文件"], description: "读取当前作用域的共享文件列表", category: "知识", icon: "▤", scopes: ["global", "project", "group"], risk: "safe", source: "ccm", compatibility: "ccm_extension", action: { type: "query", endpointByScope: { global: "/api/shared-files?scope=global", project: "/api/shared-files?scope=project&scope_id=$PROJECT", group: "/api/shared-files?scope=group&scope_id=$GROUP_ID" } } },
    { name: "cron", aliases: ["定时任务"], description: "直接读取定时任务和调度器状态", category: "运维", icon: "◷", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/cron" } },
    { name: "soak", aliases: ["稳定性"], description: "读取 24 小时稳定性运行状态和报告", category: "运维", icon: "≈", scopes: ["global"], risk: "safe", source: "ccm", action: { type: "query", endpoint: "/api/reliability/soak/status" } },
    { name: "permissions", aliases: ["权限"], description: "管理当前作用域的 Agent 能力与授权边界", category: "治理", icon: "⚿", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "permissions_manager" } },
    { name: "model", aliases: ["模型"], description: "查看或切换当前会话模型", category: "执行", icon: "◇", scopes: ["global", "project", "group"], argumentHint: "[model]", risk: "guarded", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "model_manager" } },
    { name: "mcp", aliases: ["MCP服务"], description: "管理当前作用域的 MCP 服务和授权", category: "工具", icon: "◇", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "mcp_manager" } },
    { name: "skills", aliases: ["技能"], description: "直接读取当前作用域已授权的 Skill", category: "工具", icon: "✦", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", action: { type: "query", endpointByScope: { global: "/api/skills?scope=global", project: "/api/skills?scope=project&project=$PROJECT", group: "/api/skills?scope=group&group_id=$GROUP_ID" } } },
    { name: "hooks", aliases: ["钩子"], description: "管理当前作用域有效的运行时钩子", category: "治理", icon: "⌁", scopes: ["global", "project", "group"], risk: "safe", source: "builtin", executionType: "local-jsx", displayMode: "overlay", compatibility: "cc_equivalent", action: { type: "client", clientAction: "hooks_manager" } },
    { name: "branch", aliases: ["fork", "分叉会话"], description: "从当前消息位置创建会话分支", category: "会话", icon: "⑂", scopes: ["global", "project", "group"], argumentHint: "[消息ID]", requiresContext: true, risk: "guarded", source: "builtin", compatibility: "cc_exact", action: { type: "client", clientAction: "branch_session" } },
    { name: "rewind", aliases: ["回退会话"], description: "预览并回退当前会话到指定消息", category: "会话", icon: "↶", scopes: ["global", "project", "group"], argumentHint: "[消息ID]", requiresContext: true, risk: "high", source: "builtin", compatibility: "cc_equivalent", action: { type: "client", clientAction: "rewind_session" } },
    { name: "effort", aliases: ["推理强度"], description: "查看或设置当前会话推理强度", category: "执行", icon: "◇", scopes: ["global", "project", "group"], argumentHint: "[low|medium|high]", risk: "guarded", source: "builtin", compatibility: "cc_equivalent", action: { type: "client", clientAction: "effort" } },
    { name: "fast", aliases: ["快速模式"], description: "查看或切换当前会话快速模式", category: "执行", icon: "⚡", scopes: ["global", "project", "group"], argumentHint: "[on|off]", risk: "guarded", source: "builtin", compatibility: "cc_equivalent", action: { type: "client", clientAction: "fast_mode" } },
    { name: "output-style", aliases: ["输出风格"], description: "查看或设置当前会话回答风格", category: "界面", icon: "¶", scopes: ["global", "project", "group"], argumentHint: "[concise|balanced|detailed]", risk: "safe", source: "builtin", compatibility: "cc_equivalent", action: { type: "client", clientAction: "output_style" } },
    { name: "history", aliases: ["git-log", "提交历史"], description: "直接读取当前项目 Git 提交历史", category: "开发现场", icon: "≡", scopes: ["project"], risk: "safe", source: "builtin", action: { type: "query", endpoint: "/api/git/log?project=$PROJECT&limit=30" } },
    { name: "commit", aliases: ["提交代码"], description: "提交当前项目全部变更（需确认）", category: "开发现场", icon: "✓", scopes: ["project"], argumentHint: "<提交说明>", requiresArgs: true, risk: "high", source: "builtin", action: { type: "mutation", endpoint: "/api/git/commit", method: "POST", body: { project: "$PROJECT", message: "$ARGS", allFiles: true, confirmed: true, action: "commit" } } },
    { name: "security-review", aliases: ["安全审查"], description: "让项目 Agent 执行真实安全审查并给出证据", category: "开发", icon: "⚿", scopes: ["project", "group"], argumentHint: "[范围]", risk: "guarded", source: "builtin", action: { type: "prompt", prompt: "Perform a real security review of the current project for scope $ARGS. Check dependencies, secret exposure, input validation, authorization boundaries, and high-risk code paths; run available real checks and report evidence and remediation advice by severity. Do not modify without confirmation." } },
    { name: "export", aliases: ["导出"], description: "导出当前会话或群聊上下文为 JSON", category: "会话", icon: "⇩", scopes: ["global", "project", "group"], requiresContext: true, risk: "safe", source: "ccm", executionType: "local-jsx", displayMode: "skip", historyPolicy: "transient", modelVisibility: "hidden", action: { type: "client", clientAction: "export_context" } },
];
function normalizeScope(value) {
    return value === "project" || value === "group" ? value : "global";
}
function validCustomCommand(value) {
    return !!value && /^[\p{L}\p{N}][\p{L}\p{N}:_-]{0,63}$/u.test(String(value.name || ""))
        && typeof value.description === "string"
        && Array.isArray(value.scopes)
        && value.scopes.every((scope) => ["global", "project", "group"].includes(scope))
        && value.action && ["prompt", "navigate"].includes(value.action.type)
        && (value.action.type !== "prompt" || typeof value.action.prompt === "string")
        && (value.action.type !== "navigate" || typeof value.action.tab === "string");
}
function loadCustomCommands() {
    try {
        if (!fs.existsSync(CUSTOM_COMMANDS_FILE))
            return [];
        const parsed = JSON.parse(fs.readFileSync(CUSTOM_COMMANDS_FILE, "utf8"));
        const values = Array.isArray(parsed) ? parsed : parsed.commands;
        return (Array.isArray(values) ? values : []).filter(validCustomCommand).map((command) => ({
            ...command,
            aliases: Array.isArray(command.aliases) ? command.aliases.map(String) : [],
            category: String(command.category || "自定义"),
            risk: ["safe", "guarded", "high"].includes(command.risk) ? command.risk : "guarded",
            source: "custom",
        }));
    }
    catch {
        return [];
    }
}
function authorizedSkillNames(scope, context = {}) {
    if (scope === "global")
        return new Set(((0, global_agent_tool_authorization_1.loadGlobalAgentToolAuthorization)()?.tools?.skill || []).map((name) => String(name).trim()).filter(Boolean));
    if (scope === "project") {
        const project = String(context?.project || "").trim();
        return new Set(((0, db_1.loadProjectConfigs)()?.[project]?.tools?.skill || []).map((name) => String(name).trim()).filter(Boolean));
    }
    const groupId = String(context?.groupId || "").trim();
    const group = (0, storage_1.loadGroups)().find((item) => String(item.id) === groupId);
    return new Set((group?.tools?.skill || []).map((name) => String(name).trim()).filter(Boolean));
}
function loadSkillCommands(scope, context = {}) {
    const authorized = authorizedSkillNames(scope, context);
    return (0, db_1.loadSkills)()
        .filter((skill) => skill && skill.enabled !== false && skill.name && skill.prompt && authorized.has(String(skill.name)))
        .map((skill) => ({
        name: `skill:${String(skill.name).trim().replace(/\s+/g, "-")}`,
        aliases: [],
        description: String(skill.description || `调用 ${skill.name} Skill`),
        category: "Skill",
        icon: "✦",
        scopes: [scope],
        argumentHint: "[补充要求]",
        risk: "guarded",
        source: "skill",
        action: {
            type: "prompt",
            prompt: `${String(skill.prompt).trim()}\n\nAdditional user request for this invocation: $ARGS`,
        },
    }));
}
function commandsForScope(scope, context = {}) {
    const merged = [...COMMANDS, ...loadCustomCommands(), ...loadSkillCommands(scope, context)];
    const seen = new Set();
    return merged.filter(command => {
        const key = command.name.toLowerCase();
        if (seen.has(key) || command.hidden || !command.scopes.includes(scope))
            return false;
        seen.add(key);
        return true;
    });
}
function parseInvocation(input) {
    const text = String(input || "").trim();
    if (!text.startsWith("/"))
        return null;
    const match = text.slice(1).match(/^(\S+)(?:\s+([\s\S]*))?$/);
    return match ? { name: match[1], args: String(match[2] || "").trim() } : null;
}
function findRegisteredCommand(name) {
    const normalized = String(name || "").trim().toLowerCase();
    return [...COMMANDS, ...loadCustomCommands()].find(command => command.name.toLowerCase() === normalized
        || (command.aliases || []).some(alias => alias.toLowerCase() === normalized));
}
function describeCommandScopes(scopes = []) {
    const labels = { global: "全局会话", project: "项目会话", group: "群聊会话" };
    return scopes.map(scope => labels[scope]).join("、") || "受支持的会话";
}
function expandPrompt(prompt, args, context) {
    return prompt
        .replaceAll("$ARGS", args || "（未指定，使用当前上下文）")
        .replaceAll("$PROJECT", String(context?.project || "当前项目"))
        .replaceAll("$GROUP", String(context?.group || "当前群聊"));
}
function expandActionTemplate(value, args, context, encode = false) {
    if (Array.isArray(value))
        return value.map(item => expandActionTemplate(item, args, context, encode));
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandActionTemplate(item, args, context, false)]));
    if (typeof value !== "string")
        return value;
    const replacement = (input) => encode ? encodeURIComponent(String(input || "")) : String(input || "");
    return value
        .replaceAll("$ARGS", replacement(args))
        .replaceAll("$PROJECT", replacement(context?.project))
        .replaceAll("$GROUP_ID", replacement(context?.groupId))
        .replaceAll("$SESSION_ID", replacement(context?.sessionId))
        .replaceAll("$GROUP", replacement(context?.group));
}
function recordAudit(entry) {
    fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
    fs.appendFileSync(AUDIT_FILE, JSON.stringify({ ...entry, at: new Date().toISOString() }) + "\n", "utf8");
}
function commandAvailability(command, scope, context = {}) {
    if (!command.scopes.includes(scope))
        return { enabled: false, reason: "当前入口不可用" };
    if (command.action.type === "prompt" && scope === "project" && !String(context.project || "").trim()) {
        return { enabled: false, reason: "请先选择项目" };
    }
    if (command.action.type === "prompt" && scope === "group" && !String(context.group || context.groupId || "").trim()) {
        return { enabled: false, reason: "请先选择群聊" };
    }
    const endpoint = command.action.endpoint || command.action.endpointByScope?.[scope] || "";
    if (scope === "project" && endpoint.includes("$PROJECT") && !String(context.project || "").trim())
        return { enabled: false, reason: "请先选择项目" };
    if (scope === "group" && endpoint.includes("$GROUP_ID") && !String(context.groupId || "").trim())
        return { enabled: false, reason: "请先选择群聊" };
    if (scope === "project" && command.requiresContext && !String(context.project || "").trim())
        return { enabled: false, reason: "请先选择项目" };
    if (scope === "group" && command.requiresContext && !String(context.group || context.groupId || "").trim())
        return { enabled: false, reason: "请先选择群聊" };
    return { enabled: true, reason: "" };
}
function commandImplementation(command) {
    if (command.implementation)
        return command.implementation;
    if (command.action.type === "query")
        return "local-query";
    if (command.action.type === "mutation")
        return "local-mutation";
    if (command.action.type === "client")
        return "client";
    if (command.action.type === "navigate")
        return "navigation";
    return "agent-workflow";
}
const OVERLAY_CLIENT_ACTIONS = new Set([
    "command_inventory", "status", "plan_mode", "session_tasks", "memory_manager", "config_panel",
    "session_manager", "provider_usage", "activity_stats", "agents_manager", "permissions_manager",
    "model_manager", "mcp_manager", "hooks_manager",
]);
function commandPresentation(command) {
    if (command.executionType && command.displayMode) {
        return {
            executionType: command.executionType,
            displayMode: command.displayMode,
            historyPolicy: command.historyPolicy || (command.displayMode === "overlay" || command.displayMode === "skip" ? "transient" : "persisted"),
            modelVisibility: command.modelVisibility || (command.executionType === "prompt" ? "visible" : "hidden"),
        };
    }
    if (command.action.type === "prompt")
        return { executionType: "prompt", displayMode: "conversation", historyPolicy: "persisted", modelVisibility: "visible" };
    if (command.action.type === "navigate")
        return { executionType: "local-jsx", displayMode: "skip", historyPolicy: "transient", modelVisibility: "hidden" };
    if (command.action.type === "client" && OVERLAY_CLIENT_ACTIONS.has(String(command.action.clientAction || ""))) {
        return { executionType: "local-jsx", displayMode: "overlay", historyPolicy: "transient", modelVisibility: "hidden" };
    }
    return { executionType: "local", displayMode: "transcript", historyPolicy: "persisted", modelVisibility: "hidden" };
}
function publicCommand(command, scope = "global", context = {}) {
    const risk = command.risk || "safe";
    const presentation = commandPresentation(command);
    return {
        schema: "ccm-slash-command-v2",
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
        ...presentation,
        compatibility: command.compatibility || (command.source === "ccm" ? "ccm_extension" : "cc_equivalent"),
        parameterSchema: command.argumentHint ? [{ name: "args", type: "string", required: !!command.requiresArgs, hint: command.argumentHint }] : [],
        availability: commandAvailability(command, scope, context),
    };
}
function getSlashCommandSummary() {
    return {
        total: COMMANDS.length + loadCustomCommands().length,
        builtin: COMMANDS.length,
        custom: loadCustomCommands().length,
        skills: "scope_authorized",
    };
}
function getSlashCommandContractSnapshot() {
    return {
        commands: COMMANDS.map(command => ({
            name: command.name,
            aliases: command.aliases || [],
            scopes: command.scopes,
            risk: command.risk || "safe",
            requiresArgs: !!command.requiresArgs,
            requiresContext: !!command.requiresContext,
            implementation: commandImplementation(command),
            ...commandPresentation(command),
            compatibility: command.compatibility || (command.source === "ccm" ? "ccm_extension" : "cc_equivalent"),
            action: command.action,
        })),
        counts: {
            global: commandsForScope("global").length,
            project: commandsForScope("project").length,
            group: commandsForScope("group").length,
        },
    };
}
function runSlashCommandSelfTest() {
    const globalCommands = commandsForScope("global");
    const projectCommands = commandsForScope("project");
    const groupCommands = commandsForScope("group");
    const parsed = parseInvocation("/plan 实现支付功能");
    const expanded = expandPrompt("目标：$ARGS，项目：$PROJECT", parsed?.args || "", { project: "项目A" });
    const expandedEndpoint = expandActionTemplate("/api/git/status?project=$PROJECT&id=$ARGS", "trace a/b", { project: "项目 A" }, true);
    const expandedGroupEndpoint = expandActionTemplate("/api/groups/logs?id=$GROUP_ID&name=$GROUP", "", { group: "开发群", groupId: "group-1" }, true);
    const checks = {
        parsesNameAndArguments: parsed?.name === "plan" && parsed.args === "实现支付功能",
        hasAllCoreScopes: ["global", "project", "group"].every(scope => commandsForScope(scope).length >= 10),
        scopeIsolation: !projectCommands.some(command => command.name === "project-stop") && globalCommands.some(command => command.name === "project-stop"),
        scopePolicyEnforced: ["doctor", "agent-health", "cron", "soak", "quality", "shadow", "settings", "tools", "cleanup"].every(name => globalCommands.some(command => command.name === name)
            && !projectCommands.some(command => command.name === name)
            && !groupCommands.some(command => command.name === name))
            && ["diff", "git-status", "history", "commit"].every(name => projectCommands.some(command => command.name === name)
                && !globalCommands.some(command => command.name === name)
                && !groupCommands.some(command => command.name === name))
            && ["agents", "permissions", "model", "hooks", "config", "branch"].every(name => globalCommands.some(command => command.name === name)
                && projectCommands.some(command => command.name === name)
                && groupCommands.some(command => command.name === name))
            && groupCommands.some(command => command.name === "forget")
            && !globalCommands.some(command => command.name === "forget")
            && !projectCommands.some(command => command.name === "forget")
            && projectCommands.some(command => command.name === "plan")
            && groupCommands.some(command => command.name === "plan")
            && !globalCommands.some(command => command.name === "plan"),
        highRiskIsNotDirectAction: globalCommands.find(command => command.name === "project-stop")?.action.type === "prompt",
        memoryUsesScopedManager: globalCommands.find(command => command.name === "memory")?.action.clientAction === "memory_manager",
        argumentsAndContextExpand: expanded.includes("实现支付功能") && expanded.includes("项目A"),
        aliasesAvailable: globalCommands.find(command => command.name === "status")?.aliases?.includes("状态") === true,
        parameterSchemaPublished: publicCommand(projectCommands.find(command => command.name === "plan")).parameterSchema[0]?.required === false,
        permissionDerivedFromRisk: publicCommand(globalCommands.find(command => command.name === "project-stop")).permission === "manage",
        skillsRequireScopeAuthorization: !globalCommands.some(command => command.source === "skill") || authorizedSkillNames("global").size > 0,
        localQueriesDoNotInvokeModel: projectCommands.find(command => command.name === "diff")?.action.type === "query" && globalCommands.find(command => command.name === "agent-health")?.action.type === "query",
        clientSessionCommandsAreExplicit: globalCommands.find(command => command.name === "new")?.action.clientAction === "new_session" && globalCommands.find(command => command.name === "clear")?.risk === "high",
        groupCompactIsDirectAndExactSession: groupCommands.find(command => command.name === "compact")?.action.clientAction === "compact_session",
        checkpointAndRollbackAreControlled: projectCommands.find(command => command.name === "checkpoint")?.action.type === "mutation" && projectCommands.find(command => command.name === "rollback")?.risk === "high",
        localMutationNeedsManagePermission: publicCommand(projectCommands.find(command => command.name === "checkpoint"), "project", { project: "demo" }).permission === "manage",
        endpointArgumentsAreEncoded: expandedEndpoint.includes("%E9%A1%B9%E7%9B%AE%20A") && expandedEndpoint.includes("trace%20a%2Fb"),
        longestContextPlaceholderWins: expandedGroupEndpoint.includes("id=group-1") && !expandedGroupEndpoint.includes("_ID"),
        allCommandsDeclareExecutableActions: [globalCommands, projectCommands, commandsForScope("group")].flat().every(command => {
            if (command.action.type === "prompt")
                return !!command.action.prompt?.trim();
            if (command.action.type === "navigate")
                return !!command.action.tab?.trim();
            if (command.action.type === "client")
                return !!command.action.clientAction?.trim();
            return !!(command.action.endpoint || command.action.endpointByScope);
        }),
        implementationMetadataPublished: ["client", "navigation", "local-query", "local-mutation", "agent-workflow"].every(implementation => [globalCommands, projectCommands, commandsForScope("group")].flat().some(command => publicCommand(command).implementation === implementation)),
        ccParityCommandsPresent: ["help", "status", "config", "context", "copy", "diff", "doctor", "export", "hooks", "mcp", "memory", "model", "permissions", "plan", "rename", "review", "security-review", "session", "skills", "stats", "tasks", "theme", "usage"].every(name => [globalCommands, projectCommands, groupCommands].flat().some(command => command.name === name)),
        scopedToolCatalogCommands: projectCommands.find(command => command.name === "mcp")?.action.clientAction === "mcp_manager"
            && groupCommands.find(command => command.name === "skills")?.action.endpointByScope?.group?.includes("scope=group") === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks, endpointPreview: expandedEndpoint, counts: { global: globalCommands.length, project: projectCommands.length, group: groupCommands.length } };
}
function handleSlashCommandsApi(pathname, req, res, parsed) {
    if (pathname === "/api/slash-commands" && req.method === "GET") {
        const scope = normalizeScope(parsed.query.scope);
        const context = { project: parsed.query.project || "", group: parsed.query.group || "", groupId: parsed.query.groupId || "" };
        const commands = commandsForScope(scope, context);
        (0, utils_1.sendJson)(res, { scope, commands: commands.map(command => publicCommand(command, scope, context)), ...getSlashCommandSummary(), skills: commands.filter(command => command.source === "skill").length });
        return true;
    }
    if (pathname === "/api/slash-commands/custom" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { commands: loadCustomCommands().map(command => ({ ...command, source: undefined })) });
        return true;
    }
    if (pathname === "/api/slash-commands/custom" && req.method === "PUT") {
        (0, utils_1.collectRequestBuffer)(req).then(buffer => {
            try {
                const body = JSON.parse(buffer.toString("utf8") || "{}");
                const values = Array.isArray(body) ? body : body.commands;
                if (!Array.isArray(values))
                    return (0, utils_1.sendJson)(res, { error: "commands 必须是数组" }, 400);
                const invalidIndex = values.findIndex((value) => !validCustomCommand(value));
                if (invalidIndex >= 0)
                    return (0, utils_1.sendJson)(res, { error: `第 ${invalidIndex + 1} 条自定义命令格式无效` }, 400);
                const builtinNames = new Set(COMMANDS.flatMap(command => [command.name, ...(command.aliases || [])]).map(name => name.toLowerCase()));
                const names = new Set();
                for (const value of values) {
                    const name = String(value.name).toLowerCase();
                    if (builtinNames.has(name))
                        return (0, utils_1.sendJson)(res, { error: `自定义命令 /${value.name} 与内置命令冲突` }, 409);
                    if (names.has(name))
                        return (0, utils_1.sendJson)(res, { error: `自定义命令 /${value.name} 重复` }, 409);
                    names.add(name);
                }
                (0, atomic_json_file_1.withFileLock)(CUSTOM_COMMANDS_FILE, () => (0, atomic_json_file_1.writeJsonAtomic)(CUSTOM_COMMANDS_FILE, { schema: "ccm-slash-command-registry-v2", revision: Date.now(), commands: values }));
                recordAudit({ command: "custom-registry:update", scope: "global", source: "custom", risk: "guarded", actionType: "registry", count: values.length });
                (0, utils_1.sendJson)(res, { success: true, count: values.length });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error?.message || "保存自定义命令失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/slash-commands/confirm" && req.method === "POST") {
        (0, utils_1.collectRequestBuffer)(req).then(buffer => {
            try {
                const body = JSON.parse(buffer.toString("utf8") || "{}");
                if (body.confirmed !== true)
                    return (0, utils_1.sendJson)(res, { success: false, error: "用户未确认命令" }, 409);
                const challenge = readConfirmationPayload(body.challenge, "challenge");
                const principal = principalIdentity(req);
                if (String(challenge.principal_id || "") !== principal.id || String(challenge.session_id || "") !== principal.session || String(challenge.role || "") !== principal.role) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "确认挑战不属于当前登录会话" }, 403);
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
                (0, utils_1.sendJson)(res, { success: true, confirmation_receipt: receipt, expires_in_ms: CONFIRMATION_TTL_MS });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "命令确认失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    if (pathname === "/api/slash-commands/resolve" && req.method === "POST") {
        (0, utils_1.collectRequestBuffer)(req).then(buffer => {
            try {
                const body = JSON.parse(buffer.toString("utf8") || "{}");
                const scope = normalizeScope(body.scope);
                const invocation = parseInvocation(body.input);
                if (!invocation)
                    return (0, utils_1.sendJson)(res, { error: "不是有效的斜杠命令" }, 400);
                const lowerName = invocation.name.toLowerCase();
                const command = commandsForScope(scope, body.context || {}).find(item => item.name.toLowerCase() === lowerName || (item.aliases || []).some(alias => alias.toLowerCase() === lowerName));
                if (!command) {
                    const registered = findRegisteredCommand(invocation.name);
                    if (registered) {
                        return (0, utils_1.sendJson)(res, {
                            success: false,
                            error: `/${registered.name} 仅可在${describeCommandScopes(registered.scopes)}使用`,
                            code: "SLASH_COMMAND_SCOPE_MISMATCH",
                            current_scope: scope,
                            allowed_scopes: registered.scopes,
                        }, 409);
                    }
                    return (0, utils_1.sendJson)(res, { error: `当前入口不支持 /${invocation.name}` }, 404);
                }
                if (command.requiresArgs && !invocation.args) {
                    return (0, utils_1.sendJson)(res, { success: true, needsArgs: true, command: publicCommand(command, scope, body.context || {}) });
                }
                const availability = commandAvailability(command, scope, body.context || {});
                if (!availability.enabled)
                    return (0, utils_1.sendJson)(res, { error: availability.reason }, 409);
                const context = body.context || {};
                if (confirmationRequired(command)) {
                    assertCommandRole(req, command);
                    if (!body.confirmation_receipt) {
                        return (0, utils_1.sendJson)(res, {
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
                let result;
                if (command.action.type === "navigate")
                    result = { type: "navigate", tab: command.action.tab };
                else if (command.action.type === "prompt")
                    result = { type: "prompt", prompt: expandPrompt(command.action.prompt || "", invocation.args, context) };
                else if (command.action.type === "client")
                    result = { type: "client", action: command.action.clientAction };
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
                (0, utils_1.sendJson)(res, { success: true, command: publicCommand(command, scope, body.context || {}), result });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { error: error?.message || "命令解析失败" }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { error: error?.message || "读取请求失败" }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=slash-commands.js.map