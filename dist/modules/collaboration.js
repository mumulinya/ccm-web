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
exports.FEISHU_SCOPES = void 0;
exports.buildEvidenceGateFollowUps = buildEvidenceGateFollowUps;
exports.createAndQueueTask = createAndQueueTask;
exports.resumeTaskQueues = resumeTaskQueues;
exports.runTaskWatchdog = runTaskWatchdog;
exports.runAgentRecoveryMonitorOnce = runAgentRecoveryMonitorOnce;
exports.startAgentRecoveryMonitor = startAgentRecoveryMonitor;
exports.stopAgentRecoveryMonitor = stopAgentRecoveryMonitor;
exports.startTaskWatchdog = startTaskWatchdog;
exports.stopTaskWatchdog = stopTaskWatchdog;
exports.runCollaborationProtocolSelfTest = runCollaborationProtocolSelfTest;
exports.importSharedDocsToDailyDevBacklog = importSharedDocsToDailyDevBacklog;
exports.claimReadyDailyDevBacklog = claimReadyDailyDevBacklog;
exports.markDailyDevBacklogStatus = markDailyDevBacklogStatus;
exports.continueDailyDevTasksFromGaps = continueDailyDevTasksFromGaps;
exports.handleCollaborationApi = handleCollaborationApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const db_1 = require("../db");
const group_orchestrator_1 = require("./group-orchestrator");
const agent_runtime_1 = require("../agent-runtime");
const agent_worktree_1 = require("../agent-worktree");
// === 任务队列系统（支持并行执行）===
const taskQueues = new Map(); // 每个目标（群聊/Agent）独立队列
const runningTasks = new Map(); // 正在运行的任务目标
const runningTaskIds = new Set(); // 正在运行的任务 ID
const GROUP_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory");
const TASK_WATCHDOG_INTERVAL_MS = 60 * 1000;
const TASK_WATCHDOG_STALE_MS = 15 * 60 * 1000;
const TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS = 60 * 1000;
const TASK_WATCHDOG_GAP_REWORK_MAX = 3;
const AGENT_RECOVERY_PROBE_INTERVAL_MS = 5 * 60 * 1000;
const AGENT_RECOVERY_PROBE_TIMEOUT_MS = 45 * 1000;
const AGENT_PROBE_SUCCESS_FRESH_MS = 30 * 60 * 1000;
const AGENT_PROBE_FAILURE_BLOCK_MS = 15 * 60 * 1000;
const AGENT_RUNNER_DIR = path.join(utils_1.CCM_DIR, "agent-runner");
const AGENT_PROBE_STATUS_FILE = path.join(AGENT_RUNNER_DIR, "probe-status.json");
let taskWatchdogTimer = null;
let agentRecoveryMonitorTimer = null;
let agentRecoveryProbeInFlight = false;
function runCronDailyDevProtocolSelfTestSafe() {
    try {
        const cronModule = require("./cron");
        if (typeof cronModule.runCronDailyDevProtocolSelfTest === "function") {
            return cronModule.runCronDailyDevProtocolSelfTest();
        }
        return {
            pass: false,
            error: "cron 模块未导出 runCronDailyDevProtocolSelfTest",
        };
    }
    catch (error) {
        return {
            pass: false,
            error: error?.message || String(error || "cron 协议自测加载失败"),
        };
    }
}
// 优先级权重
const PRIORITY_WEIGHT = { high: 3, normal: 2, low: 1 };
function isTaskPaused(task) {
    return !!(task?.is_paused || task?.paused);
}
function isRecoverableAutoTask(task) {
    if (!task?.auto_execute || isTaskPaused(task))
        return false;
    if (task.status === "pending")
        return true;
    if (task.status === "in_progress" && !task.completed_at)
        return true;
    return false;
}
function getTaskFailureText(task) {
    return [
        task?.status_detail,
        task?.result,
        task?.final_report,
        task?.delivery_summary?.detail,
        task?.delivery_summary?.headline,
        ...(Array.isArray(task?.delivery_summary?.blockers) ? task.delivery_summary.blockers : []),
    ].filter(Boolean).join("\n");
}
function getChildAgentIsolationMode(group = null, task = null) {
    const explicit = task?.child_agent_isolation
        || task?.childAgentIsolation
        || group?.orchestrator?.child_agent_isolation
        || group?.orchestrator?.childAgentIsolation
        || group?.child_agent_isolation
        || group?.childAgentIsolation
        || process.env.CCM_CHILD_AGENT_ISOLATION
        || "";
    return (0, agent_worktree_1.normalizeChildAgentIsolationMode)(explicit);
}
function isRecoverableRuntimeFailure(task) {
    if (!task?.auto_execute || isTaskPaused(task) || task.status !== "failed")
        return false;
    const text = getTaskFailureText(task);
    return /Agent Runner|外部 Agent Runner|spawn\s+EPERM|spawnSync .* EPERM|ConnectionRefused|Unable to connect to API|ECONNREFUSED|Agent 响应超时|响应超时|转发失败:\s*spawn EPERM/i.test(text);
}
function isAgentExecutionBlockedPendingTask(task) {
    if (!task?.auto_execute || isTaskPaused(task) || task.status !== "pending")
        return false;
    if (runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id))
        return false;
    const readiness = task.execution_readiness || {};
    const text = [
        task.status_detail,
        readiness.message,
        task.result,
    ].filter(Boolean).join("\n");
    return !!task.last_queue_blocked_at
        || readiness.ready === false
        || /Agent CLI|执行通道|Agent Runner|外部 Agent Runner|spawn\s+EPERM|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text);
}
// === 群聊管理 ===
function loadGroups() {
    if (!fs.existsSync(utils_1.GROUPS_FILE))
        return [];
    try {
        const groups = JSON.parse(fs.readFileSync(utils_1.GROUPS_FILE, "utf-8"));
        if (!Array.isArray(groups))
            return [];
        const before = JSON.stringify(groups);
        const normalized = groups.map(group_orchestrator_1.normalizeGroupOrchestrator);
        if (JSON.stringify(normalized) !== before) {
            saveGroups(normalized);
        }
        return normalized;
    }
    catch {
        return [];
    }
}
function saveGroups(groups) {
    fs.writeFileSync(utils_1.GROUPS_FILE, JSON.stringify(groups, null, 2));
}
function getGroupMessages(groupId) {
    const file = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    if (!fs.existsSync(file))
        return [];
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return [];
    }
}
function appendGroupMessage(groupId, msg) {
    const messages = getGroupMessages(groupId);
    messages.push(msg);
    if (!fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        fs.mkdirSync(utils_1.GROUP_MESSAGES_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`), JSON.stringify(messages, null, 2));
}
function saveGroupMessages(groupId, messages) {
    if (!fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        fs.mkdirSync(utils_1.GROUP_MESSAGES_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`), JSON.stringify(messages, null, 2));
}
function getGroupMemoryFile(groupId) {
    return path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
}
function createEmptyGroupMemory(groupId) {
    return {
        groupId,
        goal: "",
        summary: "",
        currentPhase: "idle",
        decisions: [],
        completed: [],
        blocked: [],
        workerLedger: [],
        openQuestions: [],
        nextActions: [],
        updated_at: new Date().toISOString(),
    };
}
function loadGroupMemory(groupId) {
    const file = getGroupMemoryFile(groupId);
    if (!fs.existsSync(file))
        return createEmptyGroupMemory(groupId);
    try {
        return { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
    }
    catch {
        return createEmptyGroupMemory(groupId);
    }
}
function saveGroupMemory(groupId, memory) {
    if (!fs.existsSync(GROUP_MEMORY_DIR))
        fs.mkdirSync(GROUP_MEMORY_DIR, { recursive: true });
    const next = compressGroupMemory({
        ...createEmptyGroupMemory(groupId),
        ...(memory || {}),
        groupId,
        updated_at: new Date().toISOString(),
    });
    fs.writeFileSync(getGroupMemoryFile(groupId), JSON.stringify(next, null, 2));
    return next;
}
function uniqueByKey(items, keyFn, limit = 20) {
    const seen = new Set();
    const result = [];
    for (const item of [...(items || [])].reverse()) {
        const key = keyFn(item);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        result.unshift(item);
    }
    return result.slice(-limit);
}
function compactMemoryText(value, max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function summarizeMemoryItems(title, items, mapper) {
    const values = (items || []).map(mapper).filter(Boolean);
    if (!values.length)
        return "";
    return `${title}: ${values.join("；")}`;
}
function compressGroupMemory(memory) {
    const next = { ...(memory || {}) };
    const summaryParts = [];
    const compressList = (key, keep = 8, title = key, mapper = (item) => JSON.stringify(item)) => {
        const items = Array.isArray(next[key]) ? next[key] : [];
        if (items.length <= keep)
            return;
        const oldItems = items.slice(0, Math.max(0, items.length - keep));
        next[key] = items.slice(-keep);
        const summary = summarizeMemoryItems(title, oldItems, mapper);
        if (summary)
            summaryParts.push(summary);
    };
    compressList("decisions", 8, "历史决策", (item) => `${item.decision}${item.reason ? `(${item.reason})` : ""}`);
    compressList("completed", 10, "历史完成", (item) => `${item.project || "unknown"}:${item.summary || ""}`);
    compressList("blocked", 8, "历史阻塞", (item) => `${item.project || "unknown"}:${item.reason || ""}`);
    compressList("workerLedger", 18, "历史 Worker 通知", (item) => `${item.project || "unknown"}:${item.status || ""}:${item.summary || ""}`);
    compressList("openQuestions", 6, "历史问题", (item) => String(item.question || item));
    compressList("nextActions", 6, "历史下一步", (item) => String(item.action || item));
    const mergedSummary = [next.summary || "", ...summaryParts].filter(Boolean).join(" | ");
    next.summary = compactMemoryText(mergedSummary, 1800);
    return next;
}
function buildGroupMemoryContext(memory) {
    if (!memory || (!memory.goal && !memory.decisions?.length && !memory.completed?.length && !memory.blocked?.length && !memory.workerLedger?.length && !memory.openQuestions?.length && !memory.nextActions?.length)) {
        return "";
    }
    const lines = [
        "群聊协作记忆（主 Agent 必须参考，避免重复派发和遗忘上下文）：",
        `- 原始/当前目标：${memory.goal || "未记录"}`,
        `- 当前阶段：${memory.currentPhase || "idle"}`,
    ];
    if (memory.summary)
        lines.push(`- 压缩摘要：${compactMemoryText(memory.summary, 900)}`);
    const addList = (title, items, mapper) => {
        if (!items?.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of items.slice(-6))
            lines.push(`  - ${mapper(item)}`);
    };
    addList("关键决策", memory.decisions || [], (item) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
    addList("已完成", memory.completed || [], (item) => `${item.project || "unknown"}：${item.summary || ""}`);
    addList("阻塞/未完成", memory.blocked || [], (item) => `${item.project || "unknown"}：${item.reason || ""}`);
    addList("Worker scratchpad", memory.workerLedger || [], (item) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
    addList("开放问题", memory.openQuestions || [], (item) => String(item.question || item));
    addList("下一步", memory.nextActions || [], (item) => String(item.action || item));
    return lines.join("\n");
}
function buildAgentMemoryPacket(groupId, targetProject, task = "") {
    const memory = loadGroupMemory(groupId);
    const ownCompleted = (memory.completed || []).filter((item) => item.project === targetProject).slice(-4);
    const otherCompleted = (memory.completed || []).filter((item) => item.project !== targetProject).slice(-5);
    const ownBlocked = (memory.blocked || []).filter((item) => item.project === targetProject).slice(-4);
    const globalBlocked = (memory.blocked || []).filter((item) => item.project !== targetProject).slice(-4);
    const ownLedger = (memory.workerLedger || []).filter((item) => item.project === targetProject).slice(-4);
    const relatedLedger = (memory.workerLedger || []).filter((item) => item.project !== targetProject).slice(-8);
    const lines = [
        "本次任务记忆包（由主 Agent 提供；即使你的底层 Agent 没有长期记忆，也必须以此为准）：",
        `- 群聊目标：${memory.goal || "未记录"}`,
        `- 当前阶段：${memory.currentPhase || "idle"}`,
    ];
    if (memory.summary)
        lines.push(`- 压缩摘要：${compactMemoryText(memory.summary, 700)}`);
    if (task)
        lines.push(`- 你本次任务：${compactMemoryText(task, 700)}`);
    const addList = (title, items, mapper) => {
        if (!items.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of items)
            lines.push(`  - ${mapper(item)}`);
    };
    addList("你之前的完成记录", ownCompleted, (item) => `${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
    addList("其他 Agent 已完成", otherCompleted, (item) => `${item.project || "unknown"}：${item.summary || ""}`);
    addList("协作 scratchpad / 你自己的 Worker 通知", ownLedger, (item) => `[${item.status || "unknown"}] ${item.summary || ""}${item.filesChanged?.length ? `；文件：${item.filesChanged.join("、")}` : ""}`);
    addList("协作 scratchpad / 其他 Worker 通知", relatedLedger, (item) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.blockers?.length ? `；阻塞：${item.blockers.join("、")}` : ""}`);
    addList("与你相关的阻塞", ownBlocked, (item) => `${item.reason || ""}${item.needs?.length ? `；需要：${item.needs.join("、")}` : ""}`);
    addList("全局阻塞", globalBlocked, (item) => `${item.project || "unknown"}：${item.reason || ""}`);
    addList("开放问题", memory.openQuestions || [], (item) => String(item.question || item));
    addList("下一步", memory.nextActions || [], (item) => String(item.action || item));
    lines.push("- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；不能编造未执行的验证或文件修改。");
    return lines.join("\n");
}
function buildChildAgentDevelopmentContract(targetProject, taskText = "", options = {}) {
    const requiresCodeChanges = options.requires_code_changes !== false && options.requiresCodeChanges !== false;
    const source = options.source ? `- 来源：${options.source}` : "";
    const acceptance = options.acceptance || options.acceptance_criteria || options.acceptanceCriteria || "";
    const verificationHints = Array.isArray(options.verification_hints || options.verificationHints)
        ? (options.verification_hints || options.verificationHints).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    return [
        "子 Agent 开发契约（必须遵守）：",
        `- 你的身份：${targetProject} 项目子 Agent。只在自己的项目职责和工作目录内处理。`,
        source,
        taskText ? `- 本次工作单：${compactMemoryText(taskText, 900)}` : "",
        acceptance ? `- 验收标准：${compactMemoryText(acceptance, 900)}` : "",
        requiresCodeChanges
            ? "- 完成条件：必须产生可捕获的实际文件变更；没有实际变更时不得把 status 写为 done。"
            : "- 完成条件：如不需要代码变更，必须说明原因、产出和验证依据。",
        "- 实施要求：先理解上下文，再做最小必要改动；不要改无关模块，不要删除用户已有改动。",
        "- 验证要求：只记录实际运行过的命令或人工核验；未运行的验证必须明确写成建议，不能伪造。",
        verificationHints.length ? `- 推荐优先执行的项目验证：${verificationHints.slice(0, 6).join("；")}` : "",
        "- 阻塞处理：缺字段、缺权限、接口不明确、环境失败时，status 写 blocked/needs_info，并列出需要谁补什么。",
        "- 回执要求：回复末尾必须包含 JSON 格式 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs。",
    ].filter(Boolean).join("\n");
}
function normalizeWorkerLedgerItem(item = {}) {
    return {
        time: item.time || new Date().toISOString(),
        taskId: String(item.taskId || item.task_id || "").trim(),
        project: String(item.project || item.agent || "").trim(),
        status: String(item.status || "").trim(),
        receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
        summary: compactMemoryText(item.summary || "", 320),
        filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
        verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
        blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
        needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
    };
}
function findLatestWorkerLedger(memory, project) {
    const target = String(project || "").trim();
    if (!target)
        return null;
    return [...(memory?.workerLedger || [])].reverse().find((item) => item.project === target) || null;
}
function appendWorkerLedger(memory, item) {
    const normalized = normalizeWorkerLedgerItem(item);
    if (!normalized.project && !normalized.summary)
        return memory;
    return {
        ...(memory || {}),
        workerLedger: uniqueByKey([...(memory?.workerLedger || []), normalized], (x) => [
            x.taskId || "",
            x.project || "",
            x.status || "",
            x.summary || "",
        ].join("|"), 40),
    };
}
function getTaskById(taskId) {
    if (!taskId)
        return null;
    return (0, db_1.loadTasks)().find((task) => task.id === taskId) || null;
}
function buildChildAgentTaskText(childTaskText, task = null) {
    if (!task || task.workflow_type !== "daily_dev")
        return childTaskText;
    return [
        "原始业务开发任务上下文：",
        `- 任务：${task.title || "未命名任务"}`,
        task.business_goal || task.businessGoal ? `- 业务目标：${compactMemoryText(task.business_goal || task.businessGoal, 700)}` : "",
        task.acceptance_criteria || task.acceptanceCriteria ? `- 全局验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 700)}` : "",
        task.source_documents || task.sourceDocuments ? `- 关联文档摘要：${compactMemoryText(task.source_documents || task.sourceDocuments, 900)}` : "",
        "",
        "主 Agent 指派给你的子任务：",
        childTaskText || "请根据原始业务开发任务上下文完成你负责的实现与验证。",
    ].filter(line => line !== "").join("\n");
}
function buildQueuedGroupTaskMessage(task) {
    const base = [
        `📋 执行任务：${task.title}`,
        task.description || "",
    ].filter(Boolean).join("\n");
    if (task?.workflow_type !== "daily_dev") {
        return `${base}\n\n请完成此任务并回复 "✅ 任务完成"。`;
    }
    const requiresCodeChanges = taskRequiresCodeChanges(task);
    const requiresVerification = taskRequiresVerification(task);
    return [
        "【主 Agent 业务开发工作单】",
        `任务标题：${task.title || "未命名任务"}`,
        `业务目标：${compactMemoryText(task.business_goal || task.businessGoal || task.title || "", 900)}`,
        task.acceptance_criteria || task.acceptanceCriteria
            ? `验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 900)}`
            : "",
        task.source_documents || task.sourceDocuments
            ? `关联文档：${compactMemoryText(task.source_documents || task.sourceDocuments, 1200)}`
            : "",
        "",
        "完整任务说明：",
        task.description || "无",
        "",
        "执行要求：",
        "- 先根据业务目标、文档和验收标准判断影响范围，再派发给对应项目子 Agent。",
        "- 每个被派发的子 Agent 必须拿到明确的实现范围、文件/模块方向、验收标准和风险提示。",
        "- 子 Agent 必须返回 CCM_AGENT_RECEIPT；缺回执、缺证据或状态不是 done 时不能判定完成。",
        requiresCodeChanges
            ? "- 完成门禁：必须有系统实际捕获的代码/配置/文档文件变更。"
            : "- 本任务允许无代码变更，但最终报告必须说明可验收产出和依据。",
        requiresVerification
            ? "- 验证门禁：必须有可采信的已执行验证记录；只写建议运行、未运行或失败验证不能完成。"
            : "- 本任务不强制验证门禁，但仍建议记录实际检查依据。",
        "- 主 Agent 必须等待子 Agent 完成并复盘；发现缺口时继续返工或向用户明确索要信息。",
        "- 最终报告必须说明完成内容、涉及项目/文件、已执行验证、风险、阻塞和仍需用户确认的事项。",
    ].filter(line => line !== "").join("\n");
}
function updateGroupMemory(groupId, patch = {}) {
    const memory = loadGroupMemory(groupId);
    const next = { ...memory };
    if (patch.goal && !next.goal)
        next.goal = compactMemoryText(patch.goal, 500);
    if (patch.currentPhase)
        next.currentPhase = patch.currentPhase;
    if (patch.decision) {
        next.decisions = uniqueByKey([...(next.decisions || []), {
                time: new Date().toISOString(),
                decision: compactMemoryText(patch.decision, 260),
                reason: compactMemoryText(patch.reason || "", 220),
            }], (item) => `${item.decision}|${item.reason}`, 20);
    }
    if (patch.completed) {
        const item = patch.completed;
        next.completed = uniqueByKey([...(next.completed || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                summary: compactMemoryText(item.summary || "", 260),
                filesChanged: item.filesChanged || [],
                verification: item.verification || [],
            }], (x) => `${x.project}|${x.summary}`, 30);
        next.blocked = (next.blocked || []).filter((x) => x.project !== item.project);
    }
    if (patch.blocked) {
        const item = patch.blocked;
        next.blocked = uniqueByKey([...(next.blocked || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                reason: compactMemoryText(item.reason || "", 260),
                needs: item.needs || [],
            }], (x) => `${x.project}|${x.reason}`, 30);
    }
    if (patch.workerLedger || patch.workerNotification) {
        const item = patch.workerLedger || patch.workerNotification;
        const merged = appendWorkerLedger(next, item);
        next.workerLedger = merged.workerLedger || [];
    }
    if (patch.openQuestion) {
        next.openQuestions = uniqueByKey([...(next.openQuestions || []), {
                time: new Date().toISOString(),
                question: compactMemoryText(patch.openQuestion, 260),
            }], (x) => x.question, 20);
    }
    if (patch.nextAction) {
        next.nextActions = uniqueByKey([...(next.nextActions || []), {
                time: new Date().toISOString(),
                action: compactMemoryText(patch.nextAction, 260),
            }], (x) => x.action, 20);
    }
    return saveGroupMemory(groupId, next);
}
function normalizePlanAssignments(assignments) {
    return (assignments || []).map((item) => ({
        ...item,
        status: item.status || "pending",
        statusText: item.statusText || "待处理",
        attempt: Number(item.attempt || 1),
        rework: !!item.rework,
        continuationOf: String(item.continuationOf || item.continuation_of || "").trim(),
        continuationStrategy: String(item.continuationStrategy || item.continuation_strategy || "").trim(),
    }));
}
function getWorkflowPhaseFromAssignments(assignments = []) {
    const items = assignments || [];
    if (items.length === 0)
        return "understanding";
    const statuses = items.map((item) => String(item.status || "pending"));
    if (statuses.some(s => ["failed", "blocked", "needs_info", "partial"].includes(s)))
        return "needs_rework";
    if (statuses.some(s => s === "running"))
        return "executing";
    if (statuses.every(s => s === "done"))
        return "reviewing";
    return "dispatching";
}
function buildWorkflowMeta(phase, label = "") {
    return {
        phase,
        label: label || phase,
        updated_at: new Date().toISOString(),
    };
}
function getInitialWorkflowMeta(assignments, dispatchPolicy, label = "主 Agent 初始计划") {
    const action = String(dispatchPolicy?.action || "");
    if (action === "ask_user")
        return buildWorkflowMeta("needs_user", "等待用户补充");
    if (action === "hold")
        return buildWorkflowMeta("hold", "暂不执行");
    if (action === "direct_answer")
        return buildWorkflowMeta("complete", "直接回复");
    if (dispatchPolicy?.requiresConfirmation)
        return buildWorkflowMeta("needs_user", "等待用户确认");
    return buildWorkflowMeta((assignments || []).length ? "dispatching" : "understanding", label);
}
function updateGroupMessageAssignmentStatus(groupId, messageId, project, status, statusText = "") {
    if (!messageId || !project)
        return null;
    const messages = getGroupMessages(groupId);
    let changed = false;
    let workflow = null;
    for (const msg of messages) {
        if (msg.id !== messageId || !Array.isArray(msg.assignments))
            continue;
        msg.assignments = msg.assignments.map((item) => {
            if (item.project !== project)
                return item;
            changed = true;
            return {
                ...item,
                status,
                statusText: statusText || status,
                updated_at: new Date().toISOString(),
            };
        });
        const phase = getWorkflowPhaseFromAssignments(msg.assignments);
        msg.workflow = {
            ...(msg.workflow || {}),
            ...buildWorkflowMeta(phase),
            phase,
        };
        workflow = msg.workflow;
    }
    if (changed)
        saveGroupMessages(groupId, messages);
    return workflow;
}
function safeAddGroupLog(groupId, level, category, message, details = null) {
    try {
        const logs = fs.existsSync(utils_1.GROUP_LOGS_FILE_SHARED)
            ? JSON.parse(fs.readFileSync(utils_1.GROUP_LOGS_FILE_SHARED, "utf-8"))
            : {};
        if (!logs[groupId])
            logs[groupId] = [];
        logs[groupId].push({
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            details
        });
        if (logs[groupId].length > 500)
            logs[groupId] = logs[groupId].slice(-500);
        fs.writeFileSync(utils_1.GROUP_LOGS_FILE_SHARED, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存群聊日志失败:", e.message);
    }
}
// === 群聊日志管理 ===
function loadGroupLogs() {
    try {
        if (fs.existsSync(utils_1.GROUP_LOGS_FILE)) {
            return JSON.parse(fs.readFileSync(utils_1.GROUP_LOGS_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载群聊日志失败:", e.message);
    }
    return {};
}
function saveGroupLogs(logs) {
    try {
        fs.writeFileSync(utils_1.GROUP_LOGS_FILE, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存群聊日志失败:", e.message);
    }
}
function addGroupLog(groupId, level, category, message, details = null) {
    const logs = loadGroupLogs();
    if (!logs[groupId])
        logs[groupId] = [];
    logs[groupId].push({
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        details
    });
    if (logs[groupId].length > 500) {
        logs[groupId] = logs[groupId].slice(-500);
    }
    saveGroupLogs(logs);
}
// === 任务日志系统 ===
const TASK_LOGS_FILE = path.join(utils_1.CCM_DIR, "task-logs.json");
function loadTaskLogs() {
    try {
        if (fs.existsSync(TASK_LOGS_FILE)) {
            return JSON.parse(fs.readFileSync(TASK_LOGS_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载任务日志失败:", e.message);
    }
    return {};
}
function saveTaskLogs(logs) {
    try {
        fs.writeFileSync(TASK_LOGS_FILE, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存任务日志失败:", e.message);
    }
}
function addTaskLog(taskId, level, message) {
    const logs = loadTaskLogs();
    if (!logs[taskId])
        logs[taskId] = [];
    logs[taskId].push({
        timestamp: new Date().toISOString(),
        level,
        message
    });
    if (logs[taskId].length > 100) {
        logs[taskId] = logs[taskId].slice(-100);
    }
    saveTaskLogs(logs);
    console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}
function getTaskLogs(taskId, limit = 50) {
    const logs = loadTaskLogs();
    const taskLogs = logs[taskId] || [];
    return taskLogs.slice(-limit);
}
function clearTaskLogs(taskId) {
    const logs = loadTaskLogs();
    delete logs[taskId];
    saveTaskLogs(logs);
}
// === 飞书消息与认证模块 ===
exports.FEISHU_SCOPES = [
    "im:message", // 发送消息
    "im:message.group_at_msg", // 群聊 @ 消息
    "im:chat", // 获取群聊信息
    "im:chat:readonly", // 读取群聊信息
    "contact:user.id:readonly", // 读取用户 ID
];
async function getFeishuTenantToken(appId, appSecret) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        });
        const data = await response.json();
        return data.tenant_access_token || null;
    }
    catch (e) {
        console.error("获取飞书 tenant_access_token 失败:", e.message);
        return null;
    }
}
async function getFeishuUserToken(appId, appSecret, code) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: appId,
                client_secret: appSecret,
                code: code,
                redirect_uri: "http://localhost:3080/api/feishu/callback"
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        console.error("获取 user_access_token 失败:", data.msg);
        return null;
    }
    catch (e) {
        console.error("获取 user_access_token 失败:", e.message);
        return null;
    }
}
async function refreshFeishuUserToken(appId, appSecret, refreshToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: appId,
                client_secret: appSecret,
                refresh_token: refreshToken
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("刷新 user_access_token 失败:", e.message);
        return null;
    }
}
async function getFeishuUserInfo(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("获取用户信息失败:", e.message);
        return null;
    }
}
async function getFeishuChatList(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/im/v1/chats?page_size=50", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data.items || [];
        }
        return [];
    }
    catch (e) {
        console.error("获取群聊列表失败:", e.message);
        return [];
    }
}
async function getValidFeishuToken() {
    const config = (0, db_1.loadFeishuConfig)();
    if (!config.app_id || !config.app_secret)
        return null;
    if (config.user_access_token && config.token_expires_at) {
        const expiresAt = new Date(config.token_expires_at);
        if (expiresAt > new Date()) {
            return config.user_access_token;
        }
        if (config.user_refresh_token) {
            const refreshed = await refreshFeishuUserToken(config.app_id, config.app_secret, config.user_refresh_token);
            if (refreshed) {
                config.user_access_token = refreshed.access_token;
                config.user_refresh_token = refreshed.refresh_token;
                config.token_expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
                (0, db_1.saveFeishuConfig)(config);
                return refreshed.access_token;
            }
        }
    }
    return await getFeishuTenantToken(config.app_id, config.app_secret);
}
async function sendFeishuMessageToUser(userId, content, msgType = "interactive") {
    const config = (0, db_1.loadFeishuConfig)();
    if (!userId || userId === "test") {
        if (config.authorized_user?.open_id) {
            userId = config.authorized_user.open_id;
        }
        else {
            console.log("[飞书通知] 未配置用户 ID，请先完成授权");
            return false;
        }
    }
    const token = await getValidFeishuToken();
    if (!token) {
        console.log("[飞书通知] 无法获取 Token，请检查 App ID 和 Secret");
        return false;
    }
    try {
        const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                receive_id: userId,
                msg_type: msgType,
                content: typeof content === "string" ? content : JSON.stringify(content)
            })
        });
        const result = await response.json();
        if (result.code === 0) {
            console.log("[飞书通知] 消息发送成功");
            return true;
        }
        else {
            console.error("[飞书通知] 消息发送失败:", result.msg);
            return false;
        }
    }
    catch (e) {
        console.error("[飞书通知] 发送失败:", e.message);
        return false;
    }
}
async function sendTaskCompletionNotification(task, result) {
    const config = (0, db_1.loadFeishuConfig)();
    const userId = config.authorized_user?.open_id || config.notify_user_id;
    if (!userId) {
        console.log("[飞书通知] 未配置通知用户，请先完成授权");
        return;
    }
    const summary = task?.delivery_summary || {};
    const sourceReport = String(summary.user_report || result || "");
    const resultSummary = sourceReport.substring(0, 900) + (sourceReport.length > 900 ? "..." : "");
    const fileCount = summary.actual_file_change_count ?? summary.files_changed?.length ?? 0;
    const verificationCount = summary.verification?.length || 0;
    const missingVerificationCount = summary.verification_required_missing?.length || 0;
    const reviewStatus = summary.has_final_review ? (summary.review_status || "complete") : "无";
    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            title: { tag: "plain_text", content: "✅ 任务完成通知" },
            template: "green"
        },
        elements: [
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**优先级**：${task.priority === 'high' ? '🔴 高' : task.priority === 'normal' ? '🟡 中' : '⚪ 低'}\n**完成时间**：${new Date().toLocaleString("zh-CN")}\n**实际文件变更**：${fileCount} 个\n**验证记录**：${verificationCount} 条\n**缺命令验证**：${missingVerificationCount} 项\n**主 Agent 复盘**：${reviewStatus}`
                }
            },
            { tag: "hr" },
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**用户交付报告**：\n${resultSummary}`
                }
            }
        ]
    };
    await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}
async function sendTaskFailureNotification(task, errorMsg) {
    const config = (0, db_1.loadFeishuConfig)();
    const userId = config.authorized_user?.open_id || config.notify_user_id;
    if (!userId) {
        console.log("[飞书通知] 未配置通知用户，请先完成授权");
        return;
    }
    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            title: { tag: "plain_text", content: "❌ 任务执行失败" },
            template: "red"
        },
        elements: [
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**失败时间**：${new Date().toLocaleString("zh-CN")}`
                }
            },
            { tag: "hr" },
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**错误信息**：\n${errorMsg.substring(0, 300)}`
                }
            }
        ]
    };
    await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}
function formatListForGroupReport(items, empty = "无") {
    const values = Array.isArray(items) ? items.map((item) => String(item || "").trim()).filter(Boolean) : [];
    if (values.length === 0)
        return empty;
    return values.slice(0, 8).map((item) => `- ${item}`).join("\n");
}
function formatDeliveryFileItem(item) {
    if (!item || typeof item === "string")
        return String(item || "").trim();
    const pathText = item.path || item.file || "";
    if (!pathText)
        return "";
    const agent = item.agent ? `${item.agent} · ` : "";
    const status = item.status ? ` (${item.status})` : "";
    const diff = Number(item.additions || item.deletions || 0) > 0 ? ` +${Number(item.additions || 0)}/-${Number(item.deletions || 0)}` : "";
    return `${agent}${pathText}${status}${diff}`.trim();
}
function formatDeliveryMissingVerification(item) {
    const agent = item?.agent || "未知 Agent";
    const required = Array.isArray(item?.required) ? item.required.join(" / ") : "";
    return `${agent}: ${required || "未提供项目验证命令执行证据"}`;
}
function formatDeliveryReworkItem(item) {
    const project = item?.project ? `${item.project}: ` : "";
    const attempt = item?.attempt ? `第 ${item.attempt} 轮 ` : "";
    const reason = item?.reason ? `（${item.reason}）` : "";
    const taskText = item?.task || "主 Agent 已生成返工工作单";
    return compactMemoryText(`${project}${attempt}${taskText}${reason}`, 320);
}
function formatDeliveryAssignmentItem(item) {
    const project = item?.project || "未知 Agent";
    const status = item?.status ? ` [${item.statusText || item.status}]` : "";
    const dependsOn = item?.dependsOn ? `；依赖 ${item.dependsOn}` : "";
    const continuation = item?.continuationStrategy ? `；续跑 ${item.continuationStrategy}` : "";
    const attempt = item?.attempt ? `；第 ${item.attempt} 轮` : "";
    const reason = item?.reason ? `（${item.reason}）` : "";
    return compactMemoryText(`${project}${status}: ${item?.task || "子 Agent 工作单"}${dependsOn}${continuation}${attempt}${reason}`, 360);
}
function formatReportLines(items, formatter = (item) => String(item || ""), limit = 10) {
    const values = Array.isArray(items) ? items.map(formatter).map(item => String(item || "").trim()).filter(Boolean) : [];
    if (!values.length)
        return "- 无";
    return values.slice(0, limit).map(item => `- ${item}`).join("\n");
}
function buildUserDeliveryReport(task, summary, status, detail = "") {
    const statusText = status === "done" ? "已完成" : status === "waiting" ? "等待补充/返工" : "失败";
    const intake = task?.workflow_meta?.intake || {};
    const sourceDocs = task?.source_documents || task?.sourceDocuments || "";
    const acceptance = task?.acceptance_criteria || task?.acceptanceCriteria || "";
    const lines = [
        "# 日常开发交付报告",
        "",
        `任务：${task?.title || "未命名任务"}`,
        `状态：${statusText}`,
        `业务目标：${summary?.business_goal || task?.business_goal || task?.businessGoal || task?.title || "未填写"}`,
        acceptance ? `验收标准：${compactMemoryText(acceptance, 1200)}` : "",
        sourceDocs ? `需求/接口文档：${compactMemoryText(sourceDocs, 1200)}` : "",
        intake.backlog_file ? `需求池文件：${intake.backlog_file}` : "",
        "",
        `参与 Agent：${Array.isArray(summary?.agents) && summary.agents.length ? summary.agents.join("、") : "暂无"}`,
        summary?.latest_coordination_plan?.phases?.length ? `主 Agent 计划：${summary.latest_coordination_plan.phases.join(" -> ")}` : "",
        summary?.coordination_plan_count ? `计划证据：${summary.coordination_plan_count} 条` : "",
        summary?.assignment_count ? `派发证据：${summary.assignment_count} 条` : "",
        summary?.assignment_evidence?.length ? formatReportLines(summary.assignment_evidence, formatDeliveryAssignmentItem, 12) : "",
        summary?.dependency_count ? `依赖证据：${summary.dependency_count} 条` : "",
        summary?.dependency_evidence?.length ? formatReportLines(summary.dependency_evidence, formatDeliveryAssignmentItem, 8) : "",
        summary?.continuation_count ? `续跑证据：${summary.continuation_count} 条` : "",
        summary?.continuation_evidence?.length ? formatReportLines(summary.continuation_evidence, formatDeliveryAssignmentItem, 8) : "",
        summary?.worker_notification_count ? `Worker 通知：${summary.worker_notification_count} 条` : "",
        summary?.worker_notifications?.length ? formatReportLines(summary.worker_notifications, (item) => `${item.task_id || "unknown"} [${item.status || "unknown"} / ${item.receipt_status || "missing"}] ${item.summary || ""}`, 12) : "",
        `主 Agent 复盘：${summary?.has_final_review ? (summary.review_status || "已记录") : "缺失"}`,
        `返工证据：${Number(summary?.rework_count || 0)} 条`,
        summary?.rework_evidence?.length ? formatReportLines(summary.rework_evidence, formatDeliveryReworkItem, 8) : "",
        "",
        `实际文件变更：${Number(summary?.actual_file_change_count || 0)} 个`,
        formatReportLines(summary?.actual_file_changes || summary?.files_changed, formatDeliveryFileItem, 12),
        "",
        `已执行验证：${Array.isArray(summary?.verification_executed) ? summary.verification_executed.length : 0} 条`,
        formatReportLines(summary?.verification_executed, (item) => item, 12),
        summary?.verification_required_missing?.length ? "" : "",
        summary?.verification_required_missing?.length ? "缺少项目验证命令证据：" : "",
        summary?.verification_required_missing?.length ? formatReportLines(summary.verification_required_missing, formatDeliveryMissingVerification, 12) : "",
        summary?.verification_failed?.length ? "" : "",
        summary?.verification_failed?.length ? "失败验证：" : "",
        summary?.verification_failed?.length ? formatReportLines(summary.verification_failed, (item) => item, 12) : "",
        summary?.verification_suggested?.length ? "" : "",
        summary?.verification_suggested?.length ? "建议/未执行验证：" : "",
        summary?.verification_suggested?.length ? formatReportLines(summary.verification_suggested, (item) => item, 12) : "",
        summary?.blockers?.length || summary?.needs?.length ? "" : "",
        summary?.blockers?.length ? "阻塞点：" : "",
        summary?.blockers?.length ? formatReportLines(summary.blockers, (item) => item, 10) : "",
        summary?.needs?.length ? "仍需补充/返工：" : "",
        summary?.needs?.length ? formatReportLines(summary.needs, (item) => item, 10) : "",
        detail ? "" : "",
        detail ? `执行摘要：${compactMemoryText(detail, 1200)}` : "",
        "",
        `生成时间：${new Date().toLocaleString("zh-CN")}`,
    ];
    return lines.filter(line => line !== "").join("\n");
}
function buildTaskGroupReportMessage(task, status, detail = "") {
    const summary = task?.delivery_summary || {};
    const title = status === "done"
        ? "任务交付完成"
        : status === "waiting"
            ? "任务需要继续处理"
            : "任务执行失败";
    const statusText = status === "done" ? "已完成" : status === "waiting" ? "等待补充/返工" : "失败";
    const backlogFile = task?.workflow_meta?.intake?.backlog_file || "";
    const fileChanges = summary.actual_file_changes || summary.files_changed || task?.file_changes?.files || [];
    const verification = summary.verification || task?.receipt?.verification || [];
    const blockers = summary.blockers || task?.receipt?.blockers || [];
    const needs = summary.needs || task?.receipt?.needs || [];
    const latestPlan = summary.latest_coordination_plan || null;
    const reworkEvidence = summary.rework_evidence || [];
    const assignmentEvidence = summary.assignment_evidence || [];
    const dependencyEvidence = summary.dependency_evidence || [];
    const continuationEvidence = summary.continuation_evidence || [];
    const finalReport = String(summary.user_report || task?.final_report || task?.result || detail || "").trim();
    return [
        `【${title}】`,
        `任务：${task?.title || "未命名任务"}`,
        `状态：${statusText}`,
        backlogFile ? `需求池：${backlogFile}` : "",
        summary.headline ? `摘要：${summary.headline}` : "",
        latestPlan?.phases?.length ? `主 Agent 计划：${latestPlan.phases.join(" -> ")}` : "",
        assignmentEvidence.length ? `派发证据：${assignmentEvidence.length} 条\n${formatListForGroupReport(assignmentEvidence.map(formatDeliveryAssignmentItem))}` : "",
        dependencyEvidence.length ? `依赖证据：${dependencyEvidence.length} 条\n${formatListForGroupReport(dependencyEvidence.map(formatDeliveryAssignmentItem))}` : "",
        continuationEvidence.length ? `续跑证据：${continuationEvidence.length} 条\n${formatListForGroupReport(continuationEvidence.map(formatDeliveryAssignmentItem))}` : "",
        reworkEvidence.length ? `返工证据：${reworkEvidence.length} 条\n${formatListForGroupReport(reworkEvidence.map(formatDeliveryReworkItem))}` : "",
        `实际文件变更：${Number(summary.actual_file_change_count ?? fileChanges.length ?? 0)} 个`,
        formatListForGroupReport(fileChanges),
        `验证记录：${Array.isArray(verification) ? verification.length : 0} 条`,
        formatListForGroupReport(verification),
        blockers.length ? `阻塞点：\n${formatListForGroupReport(blockers)}` : "",
        needs.length ? `仍需补充：\n${formatListForGroupReport(needs)}` : "",
        finalReport ? `用户交付报告：\n${finalReport.slice(0, 1600)}` : "",
    ].filter(Boolean).join("\n");
}
function appendTaskGroupReport(task, status, detail = "") {
    if (!task?.group_id)
        return;
    appendGroupMessage(task.group_id, {
        id: "m" + Date.now().toString(36) + "delivery" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: "system",
        content: buildTaskGroupReportMessage(task, status, detail),
        timestamp: new Date().toISOString(),
        task_id: task.id,
        delivery_summary: task.delivery_summary || null,
    });
}
function syncTaskBacklogStatus(task, status, result = "") {
    const backlogFile = task?.workflow_meta?.intake?.backlog_file;
    if (!task?.group_id || !backlogFile)
        return null;
    return markDailyDevBacklogStatus(task.group_id, backlogFile, status, {
        task_id: task.id,
        result: result || task.status_detail || task.result || status,
    });
}
// === 协作与辅助规则 ===
function getTaskTargetKey(task) {
    if (task.assign_type === "group" && task.group_id) {
        return `group:${task.group_id}`;
    }
    return `project:${task.target_project}`;
}
function isActionableMentionText(text) {
    const value = String(text || "").trim();
    if (value.length < 4)
        return false;
    if (/^(收到|好的|了解|谢谢|辛苦了|已完成|完成了|确认收到|ok|OK)[。！!,.，\s]*$/.test(value))
        return false;
    return true;
}
function normalizeMentionTask(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 240);
}
function stripMessageListPrefix(line) {
    return String(line || "").trim().replace(/^([>*-]|\d+[.)、]|[（(]\d+[）)])\s*/, "").trim();
}
function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractActionableMentions(text, group, sourceProject = "") {
    const memberNames = (group.members || [])
        .map((m) => String(m.project || "").trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    const members = new Set(memberNames);
    const results = [];
    const seen = new Set();
    for (const line of String(text || "").split(/\r?\n/)) {
        const normalized = stripMessageListPrefix(line);
        let targetName = "";
        let message = "";
        for (const name of memberNames) {
            const token = `@${name}`;
            if (!normalized.startsWith(token))
                continue;
            const rest = normalized.slice(token.length);
            if (rest && !/^[\s：:，,、\-—]/.test(rest))
                continue;
            targetName = name;
            message = rest.replace(/^[\s：:，,、\-—]+/, "").trim();
            break;
        }
        if (!targetName) {
            const match = normalized.match(/^@([^\s：:，,、\-—]+)(?:\s+|[：:，,、\-—]+)([\s\S]+)$/);
            if (!match)
                continue;
            targetName = match[1];
            message = match[2].trim();
        }
        if (!members.has(targetName) || targetName === sourceProject)
            continue;
        if (!isActionableMentionText(message))
            continue;
        const key = `${targetName}\n${normalizeMentionTask(message)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        results.push({ mention: `@${targetName}`, targetName, message });
    }
    return results;
}
function extractStructuredAssignments(result, group, sourceProject = "") {
    const memberNames = new Set((group.members || [])
        .map((m) => String(m.project || "").trim())
        .filter(Boolean));
    const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
    const seen = new Set();
    const mentions = [];
    for (const item of assignments) {
        const targetName = String(item?.project || item?.targetName || "").trim();
        const message = String(item?.task || item?.message || "").trim();
        if (!memberNames.has(targetName) || targetName === sourceProject)
            continue;
        if (!isActionableMentionText(message))
            continue;
        const key = `${targetName}\n${normalizeMentionTask(message)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        mentions.push({
            mention: `@${targetName}`,
            targetName,
            message,
            reason: String(item?.reason || "").trim(),
            dependsOn: String(item?.dependsOn || "").trim(),
            rework: !!item?.rework,
            attempt: Number(item?.attempt || 1),
            continuationOf: String(item?.continuationOf || item?.continuation_of || "").trim(),
            continuationStrategy: String(item?.continuationStrategy || item?.continuation_strategy || "").trim(),
            structured: true,
        });
    }
    return mentions;
}
function getCoordinatorActionMentions(result, group, sourceProject = "") {
    const structured = extractStructuredAssignments(result, group, sourceProject);
    if (structured.length > 0)
        return structured;
    return extractActionableMentions(result?.content || "", group, sourceProject);
}
function escapeTaskNotificationText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
function unescapeTaskNotificationText(value) {
    return String(value || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}
function normalizeTaskNotificationStatus(text, receipt = null) {
    const receiptStatus = String(receipt?.status || "").trim();
    if (!receipt)
        return "missing_receipt";
    if (receiptStatus === "done")
        return "completed";
    if (receiptStatus === "failed" || checkTaskFailure(text))
        return "failed";
    if (receiptStatus === "blocked" || receiptStatus === "needs_info")
        return "blocked";
    if (receiptStatus === "partial")
        return "partial";
    return "completed";
}
function buildTaskNotification(agent, text, receipt = null) {
    const status = normalizeTaskNotificationStatus(text, receipt);
    const summary = receipt?.summary || (status === "missing_receipt" ? "Worker completed without CCM_AGENT_RECEIPT" : compactMemoryText(text, 240));
    return [
        "<task-notification>",
        `<task-id>${escapeTaskNotificationText(agent)}</task-id>`,
        `<status>${escapeTaskNotificationText(status)}</status>`,
        `<receipt-status>${escapeTaskNotificationText(receipt?.status || "missing")}</receipt-status>`,
        `<summary>${escapeTaskNotificationText(summary)}</summary>`,
        `<result>${escapeTaskNotificationText(compactMemoryText(text, 1800))}</result>`,
        `<usage><duration_ms>0</duration_ms></usage>`,
        "</task-notification>",
    ].join("\n");
}
function extractTaskNotificationTag(text, tag) {
    const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = String(text || "").match(pattern);
    return match ? unescapeTaskNotificationText(match[1].trim()) : "";
}
function parseTaskNotificationsFromText(text) {
    const raw = String(text || "");
    const blocks = [...raw.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/gi)];
    return blocks.map((match) => {
        const block = `<task-notification>${match[1]}</task-notification>`;
        return {
            task_id: extractTaskNotificationTag(block, "task-id"),
            status: extractTaskNotificationTag(block, "status"),
            receipt_status: extractTaskNotificationTag(block, "receipt-status"),
            summary: compactMemoryText(extractTaskNotificationTag(block, "summary"), 600),
            result: compactMemoryText(extractTaskNotificationTag(block, "result"), 1000),
        };
    }).filter((item) => item.task_id || item.status || item.summary);
}
function getCollectedOutputAgent(output) {
    const notificationAgent = extractTaskNotificationTag(output, "task-id");
    if (notificationAgent)
        return notificationAgent;
    return (String(output || "").match(/^【([^】]+)】/) || [])[1]?.trim() || "";
}
function getCollectedOutputReceiptStatus(output) {
    const receiptStatus = extractTaskNotificationTag(output, "receipt-status");
    if (receiptStatus)
        return receiptStatus;
    return (String(output || "").match(/-\s*状态：\s*([a-zA-Z_]+)/) || [])[1]?.trim() || "";
}
function formatCollectedAgentOutput(agent, text, receipt = null) {
    const body = String(text || "").trim();
    return [
        buildTaskNotification(agent, body, receipt),
        "",
        `【${agent}】`,
        body,
        "",
        formatAgentReceiptForReview(receipt),
    ].join("\n");
}
function getAgentDependencyStateFromOutputs(agent, outputs = []) {
    const text = outputs.filter(Boolean).join("\n\n");
    const notifications = parseTaskNotificationsFromText(text)
        .filter((item) => !item.task_id || item.task_id === agent);
    const problemNotification = notifications.find((item) => {
        const status = String(item.status || "").trim();
        const receiptStatus = String(item.receipt_status || "").trim();
        return status !== "completed" || (!!receiptStatus && receiptStatus !== "done");
    });
    if (problemNotification) {
        return {
            ok: false,
            status: problemNotification.status || "blocked",
            reason: `${agent} 前置输出未完成：通知 ${problemNotification.status || "unknown"} / 回执 ${problemNotification.receipt_status || "missing"}；${problemNotification.summary || ""}`,
        };
    }
    if (notifications.length > 0) {
        return { ok: true, status: "done", reason: `${agent} 前置输出已完成` };
    }
    const receipts = parseFormattedReceiptsFromText(text).filter((item) => item.agent === agent);
    const problemReceipt = receipts.find((item) => item.status !== "done");
    if (problemReceipt) {
        return {
            ok: false,
            status: problemReceipt.status || "blocked",
            reason: `${agent} 前置回执不是 done：${problemReceipt.status || "unknown"}；${problemReceipt.summary || ""}`,
        };
    }
    if (receipts.some((item) => item.status === "done")) {
        return { ok: true, status: "done", reason: `${agent} 前置回执已完成` };
    }
    return {
        ok: false,
        status: "missing_receipt",
        reason: `${agent} 前置输出缺少可验收的 task-notification/CCM_AGENT_RECEIPT`,
    };
}
function checkTaskCompletion(response) {
    if (!response)
        return false;
    const completionMarkers = [
        "✅ 任务完成", "✅ 已完成", "✅ 完成", "任务已完成",
        "已完成任务", "已经完成", "done", "completed", "finished"
    ];
    const lowerResponse = response.toLowerCase();
    return completionMarkers.some(marker => lowerResponse.includes(marker.toLowerCase()));
}
function checkTaskFailure(response) {
    if (!response)
        return false;
    return /\bAgent 错误:|响应超时|^❌\s*错误|转发给 @.+ 失败|转发失败:\s*spawn EPERM|\bspawn\s+EPERM\b|自动返工已达上限/i.test(response);
}
function normalizeTaskResultText(value, max = 500) {
    return String(value || "").trim().slice(0, max);
}
function buildTaskExecutionResult(status, result, details = {}) {
    return {
        status,
        result: normalizeTaskResultText(result, 1200),
        report: normalizeTaskResultText(details.report || result, 12000),
        detail: details.detail || "",
        receipt: details.receipt || null,
        review: details.review || null,
        fileChanges: details.fileChanges || null,
        deliverySummary: details.deliverySummary || null,
        assignments: Array.isArray(details.assignments) ? details.assignments : [],
        coordinationPlan: details.coordinationPlan || null,
        dispatchPolicy: details.dispatchPolicy || null,
        executionOrder: details.executionOrder || "",
        coordinatorRuntime: details.coordinatorRuntime || details.runtime || "",
        coordinatorAgent: details.coordinatorAgent || "",
    };
}
function getReadyDailyDevMembers(group, configs = (0, db_1.getConfigs)()) {
    const normalizedGroup = group ? (0, group_orchestrator_1.normalizeGroupOrchestrator)(group) : null;
    const coordinator = normalizedGroup ? (0, group_orchestrator_1.getCoordinatorMember)(normalizedGroup) : null;
    const routableMembers = normalizedGroup ? (0, group_orchestrator_1.getRoutableMembers)(normalizedGroup) : [];
    const readyMembers = routableMembers
        .map((member) => {
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(member.project, normalizedGroup, configs);
        const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
        return {
            project: member.project,
            configured: !!runtime,
            workDir: runtime?.workDir || "",
            workDirExists: !!workDirState?.exists,
            workDirWritable: !!workDirState?.writable,
        };
    })
        .filter((member) => member.configured && member.workDirExists && member.workDirWritable);
    return { normalizedGroup, coordinator, routableMembers, readyMembers };
}
function validateDailyDevGroupReady(group) {
    const readiness = getReadyDailyDevMembers(group);
    if (!readiness.normalizedGroup)
        throw new Error("开发群聊不存在");
    if (!readiness.coordinator?.project)
        throw new Error("开发群聊缺少主 Agent 协调者");
    if (readiness.routableMembers.length === 0) {
        throw new Error("开发群聊至少需要 1 个可派发的项目子 Agent，不能只有主 Agent");
    }
    if (readiness.readyMembers.length === 0) {
        const details = readiness.routableMembers
            .map((member) => {
            const ready = readiness.readyMembers.find((item) => item.project === member.project);
            return ready
                ? `${member.project}: ok`
                : `${member.project}: 项目配置缺失或工作目录不可读写`;
        })
            .join("；");
        throw new Error(`开发群聊没有可执行的项目子 Agent：${details || "请检查项目配置和工作目录"}`);
    }
    return readiness;
}
function splitEvidenceList(value) {
    if (Array.isArray(value))
        return normalizeStringArray(value);
    const text = String(value || "").trim();
    if (!text || text === "无" || text === "未提供" || text === "未填写")
        return [];
    return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}
function uniqueStrings(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const value of splitEvidenceList(list)) {
            if (seen.has(value))
                continue;
            seen.add(value);
            result.push(value);
        }
    }
    return result;
}
function taskRequiresVerification(task) {
    if (task?.requires_verification === false || task?.requiresVerification === false)
        return false;
    return task?.workflow_type === "daily_dev";
}
function isSuggestedOnlyVerification(value) {
    const text = String(value || "").trim();
    if (!text)
        return true;
    return /建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|todo|not\s+run|not\s+executed|suggest/i.test(text);
}
function isFailedVerification(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    return /失败|未通过|报错|错误|超时|中断|failed|failure|error|timeout/i.test(text);
}
function getVerificationEvidenceGate(receipts = []) {
    const executed = [];
    const suggested = [];
    const failed = [];
    const values = uniqueStrings(...(receipts || []).map((receipt) => receipt?.verification || []));
    for (const item of values) {
        if (isFailedVerification(item)) {
            failed.push(item);
            continue;
        }
        if (isSuggestedOnlyVerification(item)) {
            suggested.push(item);
            continue;
        }
        executed.push(item);
    }
    return {
        pass: executed.length > 0 && failed.length === 0,
        executed,
        suggested,
        failed,
    };
}
function normalizeVerificationMatchText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[`"'“”‘’]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function isManualVerificationEvidence(value) {
    const text = String(value || "").trim();
    if (!text || isSuggestedOnlyVerification(text) || isFailedVerification(text))
        return false;
    return /人工核验|手动核验|人工检查|手动检查|manual\s+(check|verification|verified)|checked\s+manually/i.test(text);
}
function verificationTextMatchesCommand(text, command) {
    const normalizedText = normalizeVerificationMatchText(text);
    const normalizedCommand = normalizeVerificationMatchText(command);
    return !!normalizedCommand && normalizedText.includes(normalizedCommand);
}
function getRequiredVerificationCoverage(receipts = []) {
    const required = [];
    const covered = [];
    const missing = [];
    for (const receipt of receipts || []) {
        const agent = String(receipt?.agent || "").trim();
        if (!agent)
            continue;
        const commands = getConfiguredProjectVerificationCommands(agent);
        if (!commands.length)
            continue;
        const verification = splitEvidenceList(receipt?.verification || []);
        const executed = verification.filter(item => !isSuggestedOnlyVerification(item) && !isFailedVerification(item));
        const manual = executed.some(isManualVerificationEvidence);
        const matched = commands.filter(command => executed.some(item => verificationTextMatchesCommand(item, command)));
        const item = {
            agent,
            required: commands.slice(0, 6),
            executed,
            matched,
            manual,
        };
        required.push(item);
        if (manual || matched.length > 0)
            covered.push(item);
        else
            missing.push(item);
    }
    return {
        pass: missing.length === 0,
        required,
        covered,
        missing,
    };
}
function parseFormattedReceiptsFromText(text) {
    const raw = String(text || "");
    const sections = raw.split(/\n(?=【[^】]+】)/g).filter(Boolean);
    const receipts = [];
    for (const section of sections) {
        const agent = (section.match(/^【([^】]+)】/) || [])[1]?.trim();
        if (!agent)
            continue;
        const getLine = (label) => (section.match(new RegExp(`-\\s*${label}：\\s*([^\\n]+)`)) || [])[1]?.trim() || "";
        const status = getLine("状态");
        if (!status)
            continue;
        receipts.push({
            agent,
            status,
            summary: getLine("摘要"),
            actions: splitEvidenceList(getLine("动作")),
            filesChanged: splitEvidenceList(getLine("文件")),
            verification: splitEvidenceList(getLine("验证")),
            blockers: splitEvidenceList(getLine("阻塞")),
            needs: splitEvidenceList(getLine("需要补充")),
        });
    }
    return receipts;
}
function summarizeFileChange(file, agent = "") {
    if (!file?.path)
        return null;
    const diff = file.diff || {};
    return {
        path: String(file.path),
        agent,
        status: file.statusText || file.statusKind || "",
        status_kind: file.statusKind || "",
        additions: Number(diff.additions || file.additions || 0),
        deletions: Number(diff.deletions || file.deletions || 0),
    };
}
function extractActualFileChanges(fileChanges, agent = "") {
    if (!fileChanges?.files || !Array.isArray(fileChanges.files))
        return [];
    return fileChanges.files
        .map((file) => summarizeFileChange(file, agent))
        .filter(Boolean);
}
function collectTaskActualFileChanges(task, execution) {
    const changes = [];
    changes.push(...extractActualFileChanges(task?.file_changes, task?.target_project || ""));
    changes.push(...extractActualFileChanges(execution?.fileChanges, task?.target_project || ""));
    if (task?.group_id && task?.id) {
        for (const message of getGroupMessages(task.group_id)) {
            if (message?.task_id !== task.id)
                continue;
            changes.push(...extractActualFileChanges(message.fileChanges, message.agent || ""));
        }
    }
    const seen = new Set();
    return changes.filter((change) => {
        const key = `${change.agent || ""}|${change.path}|${change.status_kind || change.status}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function collectTaskCoordinationPlans(task, execution) {
    const plans = [];
    const addPlan = (plan, source = "", message = null) => {
        if (!plan || typeof plan !== "object")
            return;
        plans.push({
            ...plan,
            source,
            message_id: message?.id || "",
            agent: message?.agent || "",
            timestamp: message?.timestamp || "",
            assignments: Array.isArray(message?.assignments) ? message.assignments.length : undefined,
        });
    };
    addPlan(execution?.coordinationPlan, "execution");
    addPlan(task?.coordination_plan || task?.coordinationPlan, "task");
    if (task?.group_id && task?.id) {
        for (const message of getGroupMessages(task.group_id)) {
            if (message?.task_id !== task.id)
                continue;
            addPlan(message.coordinationPlan || message.coordination_plan, "group-message", message);
        }
    }
    const seen = new Set();
    return plans.filter((plan) => {
        const key = `${plan.source}|${plan.message_id}|${JSON.stringify(plan.phases || [])}|${JSON.stringify(plan.targets || [])}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function collectTaskAssignmentEvidence(task, execution) {
    const items = [];
    const addAssignments = (assignments, source = "", message = null) => {
        for (const assignment of assignments || []) {
            if (!assignment || typeof assignment !== "object")
                continue;
            const project = String(assignment.project || assignment.targetName || "").trim();
            const taskText = String(assignment.task || assignment.message || "").trim();
            if (!project && !taskText)
                continue;
            items.push({
                project,
                task: compactMemoryText(taskText, 700),
                reason: compactMemoryText(assignment.reason || "", 260),
                dependsOn: String(assignment.dependsOn || "").trim(),
                status: String(assignment.status || "").trim(),
                statusText: String(assignment.statusText || "").trim(),
                rework: !!assignment.rework,
                attempt: Number(assignment.attempt || 0) || undefined,
                continuationOf: String(assignment.continuationOf || assignment.continuation_of || "").trim(),
                continuationStrategy: String(assignment.continuationStrategy || assignment.continuation_strategy || "").trim(),
                source,
                message_id: message?.id || "",
                timestamp: message?.timestamp || "",
            });
        }
    };
    addAssignments(Array.isArray(execution?.assignments) ? execution.assignments : [], "execution", execution);
    if (task?.group_id && task?.id) {
        for (const message of getGroupMessages(task.group_id)) {
            if (message?.task_id !== task.id)
                continue;
            addAssignments(Array.isArray(message?.assignments) ? message.assignments : [], "group-message", message);
        }
    }
    const seen = new Set();
    return items.filter((item) => {
        const key = [
            item.project,
            item.task,
            item.dependsOn,
            item.rework ? "rework" : "",
            item.attempt || "",
            item.continuationStrategy,
            item.message_id,
        ].join("|");
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function collectTaskReworkEvidence(task, execution) {
    const items = [];
    const addItem = (item, source = "", message = null) => {
        if (!item || typeof item !== "object")
            return;
        const project = String(item.project || item.targetName || "").trim();
        const taskText = String(item.task || item.message || item.content || "").trim();
        const reason = String(item.reason || "").trim();
        if (!project && !taskText && !reason)
            return;
        items.push({
            project,
            task: compactMemoryText(taskText, 700),
            reason: compactMemoryText(reason, 300),
            attempt: Number(item.attempt || 0) || undefined,
            source,
            message_id: message?.id || "",
            timestamp: message?.timestamp || "",
        });
    };
    const addFromMessage = (message, source = "group-message") => {
        const assignments = Array.isArray(message?.assignments) ? message.assignments : [];
        for (const assignment of assignments) {
            if (assignment?.rework || /返工|rework/i.test(String(assignment?.task || ""))) {
                addItem(assignment, source, message);
            }
        }
        const content = String(message?.content || "");
        if (/主 Agent 返工工作单|第 \d+ 轮验收后返工|系统验收门禁/.test(content)) {
            addItem({
                project: message?.agent || "coordinator",
                task: content,
                reason: "主 Agent 复盘后生成返工证据",
            }, source, message);
        }
    };
    addFromMessage(execution, "execution");
    if (task?.group_id && task?.id) {
        for (const message of getGroupMessages(task.group_id)) {
            if (message?.task_id !== task.id)
                continue;
            addFromMessage(message, "group-message");
        }
    }
    const seen = new Set();
    return items.filter((item) => {
        const key = `${item.project}|${item.message_id}|${item.task}|${item.reason}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function taskRequiresCodeChanges(task) {
    if (task?.requires_code_changes === false || task?.requiresCodeChanges === false)
        return false;
    return task?.workflow_type === "daily_dev";
}
function buildDeliverySummary(task, execution, finalStatus) {
    const executionText = execution?.report || execution?.result || "";
    const receipts = [
        ...(execution?.receipt ? [execution.receipt] : []),
        ...parseFormattedReceiptsFromText(executionText),
    ].filter(Boolean);
    const actualFileChanges = collectTaskActualFileChanges(task, execution);
    const coordinationPlans = collectTaskCoordinationPlans(task, execution);
    const latestCoordinationPlan = coordinationPlans[coordinationPlans.length - 1] || null;
    const assignmentEvidence = collectTaskAssignmentEvidence(task, execution);
    const dependencyEvidence = assignmentEvidence.filter((item) => item.dependsOn);
    const continuationEvidence = assignmentEvidence.filter((item) => item.rework || item.continuationStrategy);
    const reworkEvidence = collectTaskReworkEvidence(task, execution);
    const workerNotifications = parseTaskNotificationsFromText(executionText);
    const agents = uniqueStrings(receipts.map((receipt) => receipt.agent), workerNotifications.map((item) => item.task_id), assignmentEvidence.map((item) => item.project));
    const actualFilePaths = uniqueStrings(actualFileChanges.map((file) => file.path));
    const filesChanged = uniqueStrings(...receipts.map((receipt) => receipt.filesChanged), actualFilePaths);
    const verification = uniqueStrings(...receipts.map((receipt) => receipt.verification));
    const verificationGate = getVerificationEvidenceGate(receipts);
    const requiredVerificationCoverage = getRequiredVerificationCoverage(receipts);
    const blockers = uniqueStrings(...receipts.map((receipt) => receipt.blockers));
    const needs = uniqueStrings(...receipts.map((receipt) => receipt.needs));
    if (finalStatus !== "done" && execution?.detail && !needs.length && !blockers.length) {
        needs.push(String(execution.detail));
    }
    const actions = uniqueStrings(...receipts.map((receipt) => receipt.actions));
    const receiptStatuses = receipts.map((receipt) => ({
        agent: receipt.agent,
        status: receipt.status,
        summary: receipt.summary || "",
    }));
    const receiptEvidence = receipts.map((receipt) => ({
        agent: receipt.agent || "",
        status: receipt.status || "",
        summary: String(receipt.summary || "").slice(0, 800),
        actions: Array.isArray(receipt.actions) ? receipt.actions.slice(0, 20) : [],
        filesChanged: Array.isArray(receipt.filesChanged) ? receipt.filesChanged.slice(0, 50) : [],
        verification: Array.isArray(receipt.verification) ? receipt.verification.slice(0, 30) : [],
        blockers: Array.isArray(receipt.blockers) ? receipt.blockers.slice(0, 20) : [],
        needs: Array.isArray(receipt.needs) ? receipt.needs.slice(0, 20) : [],
    }));
    const review = execution?.review || null;
    const reviewStatus = review?.status || "";
    const headline = finalStatus === "done"
        ? "主 Agent 已验收完成"
        : finalStatus === "failed"
            ? "任务执行失败"
            : "任务仍需继续推进";
    const summary = {
        headline,
        status: finalStatus,
        detail: execution?.detail || "",
        workflow_type: task?.workflow_type || "general",
        business_goal: task?.business_goal || task?.title || "",
        coordination_plans: coordinationPlans,
        latest_coordination_plan: latestCoordinationPlan,
        coordination_plan_count: coordinationPlans.length,
        assignment_evidence: assignmentEvidence,
        assignment_count: assignmentEvidence.length,
        dependency_evidence: dependencyEvidence,
        dependency_count: dependencyEvidence.length,
        continuation_evidence: continuationEvidence,
        continuation_count: continuationEvidence.length,
        rework_evidence: reworkEvidence,
        rework_count: reworkEvidence.length,
        has_rework_evidence: reworkEvidence.length > 0,
        requires_code_changes: taskRequiresCodeChanges(task),
        requires_verification: taskRequiresVerification(task),
        agents,
        worker_notifications: workerNotifications,
        worker_notification_count: workerNotifications.length,
        worker_notification_statuses: workerNotifications.map((item) => ({
            task_id: item.task_id,
            status: item.status,
            receipt_status: item.receipt_status,
            summary: item.summary,
        })),
        receipt_statuses: receiptStatuses,
        receipts: receiptEvidence,
        actions,
        files_changed: filesChanged,
        actual_file_changes: actualFileChanges,
        actual_file_change_count: actualFileChanges.length,
        has_actual_file_changes: actualFileChanges.length > 0,
        verification,
        verification_executed: verificationGate.executed,
        verification_suggested: verificationGate.suggested,
        verification_failed: verificationGate.failed,
        verification_required: requiredVerificationCoverage.required,
        verification_required_missing: requiredVerificationCoverage.missing,
        verification_required_covered: requiredVerificationCoverage.covered,
        has_executed_verification: verificationGate.executed.length > 0,
        verification_required_gate_passed: requiredVerificationCoverage.pass,
        verification_gate_passed: verificationGate.pass && requiredVerificationCoverage.pass,
        blockers,
        needs,
        review_status: reviewStatus,
        has_final_review: !!review,
        generated_at: new Date().toISOString(),
    };
    summary.user_report = buildUserDeliveryReport(task, summary, finalStatus, execution?.report || execution?.result || execution?.detail || "");
    return summary;
}
function getTaskExecutionFromReceipt(response, receipt, details = {}) {
    if (!receipt) {
        if (checkTaskFailure(response)) {
            return buildTaskExecutionResult("failed", response, { ...details, detail: details.detail || "Agent 输出包含失败标记" });
        }
        if (checkTaskCompletion(response)) {
            return buildTaskExecutionResult("done", response, { ...details, detail: details.detail || "兼容旧 Agent：检测到完成标记但缺少结构化回执" });
        }
        return buildTaskExecutionResult("waiting", response, { ...details, detail: details.detail || "缺少 CCM_AGENT_RECEIPT，无法可靠验收" });
    }
    if (receipt.status === "done") {
        return buildTaskExecutionResult("done", response, { ...details, receipt, detail: receipt.summary || details.detail || "子 Agent 回执确认完成" });
    }
    if (receipt.status === "failed") {
        return buildTaskExecutionResult("failed", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || "子 Agent 回执失败" });
    }
    return buildTaskExecutionResult("waiting", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || `子 Agent 回执状态为 ${receipt.status}` });
}
function getGroupTaskExecutionStatus(review, coordinatorResult, outputText, task = null) {
    const dispatchPolicy = coordinatorResult?.dispatchPolicy || {};
    const action = String(dispatchPolicy.action || "");
    const runtime = String(coordinatorResult?.runtime || "");
    const isDailyDev = task?.workflow_type === "daily_dev";
    const receipts = parseFormattedReceiptsFromText(outputText);
    const childReceipts = receipts.filter((receipt) => receipt.agent && receipt.agent !== coordinatorResult?.agent);
    const workerNotifications = parseTaskNotificationsFromText(outputText);
    const verificationGate = getVerificationEvidenceGate(childReceipts);
    const requiredVerificationCoverage = getRequiredVerificationCoverage(childReceipts);
    const coordinatorEvidence = {
        assignments: normalizePlanAssignments(Array.isArray(coordinatorResult?.assignments) ? coordinatorResult.assignments : []),
        coordinationPlan: coordinatorResult?.coordinationPlan || null,
        dispatchPolicy,
        executionOrder: coordinatorResult?.executionOrder || "parallel",
        coordinatorRuntime: runtime,
        coordinatorAgent: coordinatorResult?.agent || "",
    };
    const childAgents = uniqueStrings(childReceipts.map((receipt) => receipt.agent));
    const assignedProjects = new Set(coordinatorEvidence.assignments.map((item) => String(item.project || item.targetName || "").trim()).filter(Boolean));
    const notifiedProjects = new Set(workerNotifications.map((item) => String(item.task_id || "").trim()).filter(Boolean));
    const coordinationPlan = coordinatorEvidence.coordinationPlan || {};
    const hasCoordinationPlan = !!coordinationPlan && (Array.isArray(coordinationPlan.phases) && coordinationPlan.phases.length > 0
        || Array.isArray(coordinationPlan.targets) && coordinationPlan.targets.length > 0
        || String(coordinationPlan.strategy || "").trim());
    const missingAssignedProjects = childAgents.filter((agent) => !assignedProjects.has(agent));
    const missingWorkerNotifications = childAgents.filter((agent) => !notifiedProjects.has(agent));
    const buildGroupResult = (status, details = {}) => buildTaskExecutionResult(status, outputText, {
        ...coordinatorEvidence,
        ...details,
    });
    if (/llm-error|llm-not-configured/.test(runtime) || checkTaskFailure(outputText)) {
        return buildGroupResult("failed", {
            review,
            detail: runtime ? `主 Agent 运行失败：${runtime}` : "协作输出包含失败标记",
        });
    }
    if (dispatchPolicy.requiresConfirmation || action === "ask_user" || action === "hold") {
        return buildGroupResult("waiting", {
            review,
            detail: dispatchPolicy.reason || "主 Agent 需要用户确认后继续",
        });
    }
    if (isDailyDev && childReceipts.length === 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少子 Agent 回执，不能判定完成；主 Agent 需要派发至少一个项目 Agent 执行代码工作或明确等待用户调整范围",
        });
    }
    if (isDailyDev && childReceipts.some((receipt) => receipt.status !== "done")) {
        const failed = childReceipts
            .filter((receipt) => receipt.status === "failed")
            .map((receipt) => `${receipt.agent}:${receipt.summary || receipt.blockers?.join("；") || "failed"}`)
            .join("；");
        if (failed) {
            return buildGroupResult("failed", {
                review,
                detail: `业务开发任务子 Agent 执行失败：${failed}`,
            });
        }
        const pending = childReceipts
            .filter((receipt) => receipt.status !== "done")
            .map((receipt) => `${receipt.agent}:${receipt.status}`)
            .join("；");
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务仍有子 Agent 未完成：${pending}`,
        });
    }
    if (isDailyDev && !hasCoordinationPlan) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
        });
    }
    if (isDailyDev && coordinatorEvidence.assignments.length === 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少主 Agent 派发子 Agent 的 assignment evidence，不能判定完成",
        });
    }
    if (isDailyDev && missingAssignedProjects.length > 0) {
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务缺少目标子 Agent 的派发证据：${missingAssignedProjects.join("、")}`,
        });
    }
    if (isDailyDev && missingWorkerNotifications.length > 0) {
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务缺少目标子 Agent 的 task-notification：${missingWorkerNotifications.join("、")}`,
        });
    }
    if (isDailyDev && !review) {
        return buildGroupResult("waiting", {
            detail: "业务开发任务缺少主 Agent 最终复盘，不能判定完成",
        });
    }
    if (isDailyDev && taskRequiresCodeChanges(task) && collectTaskActualFileChanges(task, {}).length === 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "业务开发任务缺少系统实际捕获的代码变更，不能判定完成；请让子 Agent 执行代码修改，或在创建任务时关闭代码变更要求",
        });
    }
    if (isDailyDev && taskRequiresVerification(task) && !verificationGate.pass) {
        const failed = verificationGate.failed.length ? `失败验证：${verificationGate.failed.join("；")}` : "";
        const suggested = verificationGate.suggested.length ? `仅建议/未执行验证：${verificationGate.suggested.join("；")}` : "";
        return buildGroupResult("waiting", {
            review,
            detail: ["业务开发任务缺少可验收的已执行验证记录，不能判定完成", failed, suggested].filter(Boolean).join("；"),
        });
    }
    if (isDailyDev && taskRequiresVerification(task) && !requiredVerificationCoverage.pass) {
        const missing = requiredVerificationCoverage.missing
            .map((item) => `${item.agent}: ${item.required.join(" / ")}`)
            .join("；");
        return buildGroupResult("waiting", {
            review,
            detail: `业务开发任务缺少项目配置验证命令的执行证据，不能判定完成；缺失：${missing}`,
        });
    }
    if (review) {
        const status = String(review.status || "");
        if (status === "complete") {
            return buildGroupResult("done", { review, detail: "主 Agent 复盘判定完成" });
        }
        if (status === "needs_user" || status === "needs_followup") {
            return buildGroupResult("waiting", { review, detail: status === "needs_user" ? "主 Agent 需要用户补充" : "主 Agent 仍发现返工项" });
        }
    }
    if (Array.isArray(coordinatorResult?.assignments) && coordinatorResult.assignments.length > 0) {
        return buildGroupResult("waiting", {
            review,
            detail: "已派发子 Agent，但缺少最终复盘完成证据",
        });
    }
    return buildGroupResult("done", {
        review,
        detail: "主 Agent 已直接处理且未产生子任务",
    });
}
function getDailyDevCompletionGateSelfTest() {
    const task = { workflow_type: "daily_dev", title: "self-test", requires_code_changes: true };
    const taskWithActualChanges = {
        ...task,
        file_changes: {
            files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }],
            count: 1,
        },
    };
    const coordinatorResult = { agent: "coordinator", assignments: [], dispatchPolicy: {} };
    const plannedCoordinatorResult = {
        agent: "coordinator",
        assignments: [{ project: "frontend", task: "修改页面并提交回执" }],
        coordinationPlan: {
            strategy: "research_synthesis_implementation_verification",
            phases: ["理解需求", "分配任务", "协同执行", "复盘验收"],
            targets: ["frontend"],
        },
        dispatchPolicy: {},
    };
    const doneReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成测试改动",
        actions: ["修改页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test"],
        blockers: [],
        needs: [],
    };
    const doneReceiptText = [
        "完成了页面改动",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成测试改动",
        "- 动作：修改页面",
        "- 文件：src/App.vue",
        "- 验证：npm test",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n");
    const doneWorkerOutput = formatCollectedAgentOutput("frontend", doneReceiptText, doneReceipt);
    const noChild = getGroupTaskExecutionStatus({ status: "complete", content: "主 Agent 复盘完成" }, coordinatorResult, "主 Agent 自己说已经完成", task);
    const withChild = getGroupTaskExecutionStatus({ status: "complete", content: "主 Agent 复盘完成" }, coordinatorResult, [
        "【frontend】",
        "完成了页面改动",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成测试改动",
        "- 动作：修改页面",
        "- 文件：src/App.vue",
        "- 验证：npm test",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n"), task);
    const withFailedChild = getGroupTaskExecutionStatus({ status: "needs_user", content: "主 Agent 复盘发现子 Agent 运行失败" }, coordinatorResult, [
        "【frontend】",
        "执行失败",
        "",
        "结构化回执：",
        "- 状态：failed",
        "- 摘要：spawn EPERM",
        "- 动作：未填写",
        "- 文件：无",
        "- 验证：未提供",
        "- 阻塞：spawn EPERM",
        "- 需要补充：检查运行环境",
    ].join("\n"), task);
    const withActualChange = getGroupTaskExecutionStatus({ status: "complete", content: "主 Agent 复盘完成" }, plannedCoordinatorResult, doneWorkerOutput, taskWithActualChanges);
    const withActualChangeNoCoordinationEvidence = getGroupTaskExecutionStatus({ status: "complete", content: "主 Agent 复盘完成" }, coordinatorResult, doneWorkerOutput, taskWithActualChanges);
    const waitingExecutionWithCompleteEvidence = { ...withActualChange, status: "waiting", detail: "保守 waiting 但证据齐全" };
    const waitingSummaryWithCompleteEvidence = buildDeliverySummary(taskWithActualChanges, waitingExecutionWithCompleteEvidence, "waiting");
    const waitingEvidencePromotesToDone = canCompleteDailyDevFromDeliverySummary(taskWithActualChanges, waitingExecutionWithCompleteEvidence, waitingSummaryWithCompleteEvidence);
    const withActualChangeNoExecutedVerification = getGroupTaskExecutionStatus({ status: "complete", content: "主 Agent 复盘完成" }, plannedCoordinatorResult, formatCollectedAgentOutput("frontend", [
        "完成了页面改动",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成测试改动",
        "- 动作：修改页面",
        "- 文件：src/App.vue",
        "- 验证：建议运行 npm test",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n"), {
        ...doneReceipt,
        verification: ["建议运行 npm test"],
    }), taskWithActualChanges);
    return {
        noChildReceiptStatus: noChild.status,
        noChildReceiptDetail: noChild.detail,
        withChildReceiptStatus: withChild.status,
        withChildReceiptDetail: withChild.detail,
        withFailedChildStatus: withFailedChild.status,
        withFailedChildDetail: withFailedChild.detail,
        withActualChangeStatus: withActualChange.status,
        withActualChangeNoCoordinationEvidenceStatus: withActualChangeNoCoordinationEvidence.status,
        withActualChangeNoCoordinationEvidenceDetail: withActualChangeNoCoordinationEvidence.detail,
        waitingEvidencePromotesToDone,
        withActualChangeNoExecutedVerificationStatus: withActualChangeNoExecutedVerification.status,
        withActualChangeNoExecutedVerificationDetail: withActualChangeNoExecutedVerification.detail,
        pass: noChild.status === "waiting"
            && withChild.status === "waiting"
            && withFailedChild.status === "failed"
            && withActualChange.status === "done"
            && waitingEvidencePromotesToDone
            && withActualChangeNoCoordinationEvidence.status === "waiting"
            && withActualChangeNoExecutedVerification.status === "waiting",
    };
}
function buildDailyDevWorkflowRehearsal(payload = {}) {
    const groups = loadGroups();
    const configs = (0, db_1.getConfigs)();
    const groupId = payload.group_id || payload.groupId || groups[0]?.id || "";
    const group = groups.find((item) => item.id === groupId) || groups[0] || null;
    const { normalizedGroup, coordinator, routableMembers, readyMembers } = getReadyDailyDevMembers(group, configs);
    const selectedMember = readyMembers[0] || routableMembers[0] || { project: "demo-agent" };
    const businessGoal = compactFormText(payload.business_goal || payload.businessGoal || "演练：给设置页增加一个业务开发闭环状态提示", "演练：给设置页增加一个业务开发闭环状态提示");
    const description = buildDailyDevTaskDescription({
        business_goal: businessGoal,
        scope: payload.scope || "由主 Agent 拆给一个子 Agent，子 Agent 返回结构化回执，主 Agent 完成复盘。",
        documents: payload.documents || "演练不读取真实业务文档，仅验证任务模板和完成门禁。",
        acceptance: payload.acceptance || "必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据和交付摘要。",
        constraints: payload.constraints || "不创建真实任务，不修改业务仓库。",
        requires_code_changes: true,
    });
    const rehearsalReceipt = {
        agent: selectedMember.project,
        status: "done",
        summary: "完成演练改动",
        actions: ["修改演练文件"],
        filesChanged: ["src/daily-dev-rehearsal.ts"],
        verification: ["npm run check"],
        blockers: [],
        needs: [],
    };
    const receiptText = [
        `【${selectedMember.project}】`,
        "已完成演练改动。",
        "",
        "结构化回执：",
        "- 状态：done",
        "- 摘要：完成演练改动",
        "- 动作：修改演练文件",
        "- 文件：src/daily-dev-rehearsal.ts",
        "- 验证：npm run check",
        "- 阻塞：无",
        "- 需要补充：无",
    ].join("\n");
    const workerNotificationOutput = formatCollectedAgentOutput(selectedMember.project, receiptText, rehearsalReceipt);
    const rehearsalMemory = appendWorkerLedger(createEmptyGroupMemory("daily-dev-rehearsal"), {
        taskId: "daily-dev-rehearsal",
        project: selectedMember.project,
        status: "completed",
        receiptStatus: "done",
        summary: rehearsalReceipt.summary,
        filesChanged: rehearsalReceipt.filesChanged,
        verification: rehearsalReceipt.verification,
        blockers: [],
        needs: [],
    });
    const rehearsalScratchpadContext = buildGroupMemoryContext(rehearsalMemory);
    const review = { status: "complete", content: "主 Agent 复盘完成，演练满足验收证据。" };
    const coordinatorResult = { agent: coordinator.project, assignments: [{ project: selectedMember.project, task: "执行演练改动" }], dispatchPolicy: {}, runtime: "rehearsal" };
    const baseTask = {
        id: "daily-dev-rehearsal",
        title: businessGoal,
        description,
        group_id: normalizedGroup?.id || "",
        workflow_type: "daily_dev",
        requires_code_changes: true,
        requires_verification: true,
        business_goal: businessGoal,
        acceptance_criteria: "演练验收：必须记录主 Agent 计划、返工证据和已执行验证。",
        source_documents: "接口：POST /api/rehearsal/check\n字段：enabled(boolean), message(string)\n验收：报告展示主 Agent 计划和返工证据。",
    };
    const taskDocumentContext = buildTaskSourceDocumentsContext(baseTask);
    const noChangeExecution = getGroupTaskExecutionStatus(review, coordinatorResult, workerNotificationOutput, baseTask);
    const taskWithChanges = {
        ...baseTask,
        file_changes: {
            files: [{
                    path: "src/daily-dev-rehearsal.ts",
                    statusText: "修改",
                    statusKind: "modified",
                    diff: { additions: 3, deletions: 1 },
                }],
            count: 1,
        },
    };
    const doneExecution = getGroupTaskExecutionStatus(review, coordinatorResult, workerNotificationOutput, taskWithChanges);
    const propagatedAssignmentSummary = buildDeliverySummary(taskWithChanges, doneExecution, doneExecution.status === "done" ? "done" : "waiting");
    const deliverySummary = buildDeliverySummary(taskWithChanges, {
        ...doneExecution,
        assignments: [...(doneExecution.assignments || []), {
                project: selectedMember.project,
                task: "主 Agent 返工工作单：补齐演练验证证据",
                reason: "演练模拟：首次回执缺少验证证据",
                rework: true,
                attempt: 2,
                continuationOf: selectedMember.project,
                continuationStrategy: "same_worker_scratchpad",
            }],
    }, doneExecution.status === "done" ? "done" : "waiting");
    const coordinatorProtocol = (0, group_orchestrator_1.runCoordinatorProtocolSelfTest)();
    const reworkProtocol = getCoordinatorReworkProtocolSelfTest();
    const notificationPass = workerNotificationOutput.includes("<task-notification>")
        && extractTaskNotificationTag(workerNotificationOutput, "task-id") === selectedMember.project
        && extractTaskNotificationTag(workerNotificationOutput, "status") === "completed";
    const scratchpadPass = rehearsalScratchpadContext.includes("Worker scratchpad")
        && rehearsalScratchpadContext.includes("完成演练改动")
        && rehearsalScratchpadContext.includes("npm run check");
    const pass = !!normalizedGroup
        && readyMembers.length > 0
        && coordinatorProtocol.pass
        && reworkProtocol.pass
        && notificationPass
        && scratchpadPass
        && taskDocumentContext.includes("/api/rehearsal/check")
        && noChangeExecution.status === "waiting"
        && doneExecution.status === "done"
        && (doneExecution.assignments || []).length > 0
        && propagatedAssignmentSummary.assignment_count > 0
        && deliverySummary.actual_file_change_count > 0
        && deliverySummary.has_final_review
        && deliverySummary.assignment_count > 0
        && deliverySummary.continuation_count > 0
        && deliverySummary.rework_count > 0
        && deliverySummary.verification_gate_passed;
    return {
        success: true,
        pass,
        status: pass ? "ok" : "fail",
        generated_at: new Date().toISOString(),
        group: normalizedGroup ? {
            id: normalizedGroup.id,
            name: normalizedGroup.name || normalizedGroup.id,
            coordinator: coordinator.project,
            readyMemberCount: readyMembers.length,
            selectedMember: selectedMember.project,
        } : null,
        steps: [
            { id: "business-description", status: businessGoal ? "ok" : "fail", message: "业务描述已生成主 Agent 工作单" },
            { id: "task-document-context", status: taskDocumentContext.includes("/api/rehearsal/check") ? "ok" : "fail", message: taskDocumentContext.includes("/api/rehearsal/check") ? "任务表单里的业务/接口文档会进入主 Agent 文档上下文" : "任务级文档未进入主 Agent 文档上下文" },
            { id: "coordinator-protocol", status: coordinatorProtocol.pass ? "ok" : "fail", message: coordinatorProtocol.pass ? `主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 生成 ${coordinatorProtocol.assignmentCount} 个自包含子任务` : "主 Agent 协调协议自测失败" },
            { id: "coordinator-rework-protocol", status: reworkProtocol.pass ? "ok" : "fail", message: reworkProtocol.pass ? "主 Agent 验收发现缺口时会生成自包含返工工作单" : "主 Agent 返工协议自测失败" },
            { id: "worker-notification", status: notificationPass ? "ok" : "fail", message: notificationPass ? "子 Agent 演练输出已封装为 task-notification 并可被主 Agent 识别" : "子 Agent 演练输出未形成有效 task-notification" },
            { id: "worker-scratchpad", status: scratchpadPass ? "ok" : "fail", message: scratchpadPass ? "Worker 通知已写入协作 scratchpad，可进入后续上下文" : "Worker 通知未进入协作 scratchpad 上下文" },
            { id: "group-ready", status: normalizedGroup && readyMembers.length > 0 ? "ok" : "fail", message: normalizedGroup ? `可用子 Agent ${readyMembers.length} 个` : "没有可用开发群聊" },
            { id: "receipt-gate", status: noChangeExecution.status === "waiting" ? "ok" : "fail", message: "只有子 Agent 回执但没有实际变更时不会误判完成" },
            { id: "file-change-gate", status: doneExecution.status === "done" ? "ok" : "fail", message: "补齐实际文件变更证据后允许完成" },
            { id: "execution-assignment-propagation", status: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "ok" : "fail", message: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "执行结果会携带主 Agent 派发证据，交付摘要可直接验收" : "执行结果缺少主 Agent 派发证据" },
            { id: "assignment-evidence", status: deliverySummary.assignment_count > 0 ? "ok" : "fail", message: deliverySummary.assignment_count > 0 ? `交付摘要捕获 ${deliverySummary.assignment_count} 条主 Agent 派发证据` : "交付摘要未捕获主 Agent 派发证据" },
            { id: "continuation-evidence", status: deliverySummary.continuation_count > 0 ? "ok" : "fail", message: deliverySummary.continuation_count > 0 ? `交付摘要捕获 ${deliverySummary.continuation_count} 条续跑证据` : "交付摘要未捕获续跑证据" },
            { id: "rework-evidence", status: deliverySummary.rework_count > 0 ? "ok" : "fail", message: deliverySummary.rework_count > 0 ? `交付摘要捕获 ${deliverySummary.rework_count} 条返工证据` : "交付摘要未捕获主 Agent 返工证据" },
            { id: "verification-gate", status: deliverySummary.verification_gate_passed ? "ok" : "fail", message: "已执行验证记录会进入交付摘要并作为完成门禁" },
            { id: "delivery-summary", status: deliverySummary.actual_file_change_count > 0 ? "ok" : "fail", message: `交付摘要捕获 ${deliverySummary.actual_file_change_count} 个实际文件变更` },
        ],
        task_description: description,
        task_document_context: taskDocumentContext,
        no_change_result: { status: noChangeExecution.status, detail: noChangeExecution.detail },
        done_result: { status: doneExecution.status, detail: doneExecution.detail },
        propagated_assignment_summary: {
            assignment_count: propagatedAssignmentSummary.assignment_count,
            assignments: propagatedAssignmentSummary.assignment_evidence,
        },
        worker_notification: {
            status: extractTaskNotificationTag(workerNotificationOutput, "status"),
            task_id: extractTaskNotificationTag(workerNotificationOutput, "task-id"),
            receipt_status: extractTaskNotificationTag(workerNotificationOutput, "receipt-status"),
        },
        scratchpad_context: rehearsalScratchpadContext,
        coordinator_protocol: coordinatorProtocol,
        rework_protocol: reworkProtocol,
        delivery_summary: deliverySummary,
    };
}
function normalizeSmokeFilePath(value) {
    const raw = String(value || "ccm-daily-dev-smoke.md").trim().replace(/\\/g, "/");
    const file = raw || "ccm-daily-dev-smoke.md";
    if (path.isAbsolute(file) || file.startsWith("~/") || file.includes("\0")) {
        throw new Error("试运行文件必须是项目内相对路径");
    }
    const segments = file.split("/").filter(Boolean);
    if (segments.length === 0 || segments.some(segment => segment === "." || segment === "..")) {
        throw new Error("试运行文件路径不能包含 . 或 ..");
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(file)) {
        throw new Error("试运行文件路径只能包含字母、数字、点、下划线、短横线和斜杠");
    }
    return file;
}
function selectDailyDevSmokeTarget(payload = {}) {
    const groups = loadGroups();
    const configs = (0, db_1.getConfigs)();
    const groupId = payload.group_id || payload.groupId || "";
    const candidates = groupId
        ? groups.filter((group) => group.id === groupId)
        : groups;
    for (const group of candidates) {
        const readiness = getReadyDailyDevMembers(group, configs);
        if (readiness.normalizedGroup && readiness.readyMembers.length > 0) {
            const requestedMember = payload.target_member || payload.targetMember || "";
            const selectedMember = readiness.readyMembers.find((member) => member.project === requestedMember)
                || readiness.readyMembers[0];
            return {
                group: readiness.normalizedGroup,
                coordinator: readiness.coordinator,
                selectedMember,
                readyMembers: readiness.readyMembers,
            };
        }
    }
    if (groupId)
        throw new Error("所选开发群聊没有可写工作目录的子 Agent");
    throw new Error("没有可用于真实试运行的开发群聊，请先配置群聊和可写的项目子 Agent");
}
function createDailyDevSmokeTask(payload, ctx) {
    const smokeFile = normalizeSmokeFilePath(payload.smoke_file || payload.smokeFile);
    const target = selectDailyDevSmokeTarget(payload);
    const selectedProject = target.selectedMember.project;
    const groupName = target.group.name || target.group.id;
    const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
    const businessGoal = compactFormText(payload.business_goal || payload.businessGoal, `真实试运行：验证主 Agent 能派发 ${selectedProject} 子 Agent 完成可验收文件修改`);
    const description = buildDailyDevTaskDescription({
        business_goal: businessGoal,
        scope: [
            `主 Agent 必须把本任务派发给 @${selectedProject}。`,
            `${selectedProject} 子 Agent 只允许在自己的项目工作目录内新增或更新 ${smokeFile}。`,
            "文件内容写入本次试运行时间、群聊名称、目标 Agent、执行摘要和验证命令。",
            "不修改业务源码、依赖配置或其他无关文件。"
        ].join("\n"),
        documents: [
            "这是真实日常开发闭环 smoke 任务，用来验证：业务描述 -> 主 Agent 拆分 -> 子 Agent 改文件 -> 回执 -> 主 Agent 复盘 -> 系统捕获实际变更。",
            `目标群聊：${groupName}`,
            `目标子 Agent：${selectedProject}`,
            `目标文件：${smokeFile}`
        ].join("\n"),
        acceptance: [
            `主 Agent 需要明确派发给 @${selectedProject}，不能只给方案。`,
            `${selectedProject} 必须实际新增或更新 ${smokeFile}。`,
            "子 Agent 回复末尾必须追加 CCM_AGENT_RECEIPT，status=done，filesChanged 包含目标文件。",
            "主 Agent 必须完成最终复盘，说明实际文件变更、已执行验证和风险。",
            "系统必须捕获到实际文件变更和已执行验证记录后，任务才允许变为已完成。"
        ].join("\n"),
        constraints: [
            "这是受控试运行任务，目标是验证自动开发闭环。",
            "不要手动标记完成；必须通过队列执行和系统验收完成。",
            "如果无法写入目标文件或无法运行验证，回执 status 不能写 done，必须说明阻塞点。",
            payload.constraints || ""
        ].filter(Boolean).join("\n"),
        requires_code_changes: true,
    });
    const task = createTask({
        title: compactFormText(payload.title, `真实日常开发闭环试运行 - ${selectedProject}`),
        description,
        target_project: target.coordinator?.project || selectedProject,
        group_id: target.group.id,
        assign_type: "group",
        priority: payload.priority || "normal",
        auto_execute: autoExecute,
        workflow_type: "daily_dev",
        requires_code_changes: true,
        requires_verification: true,
        business_goal: businessGoal,
        acceptance_criteria: `修改 ${smokeFile}，子 Agent 回执 done，主 Agent 复盘 complete，系统捕获实际变更和已执行验证记录。`,
        source_documents: `daily-dev smoke target=${selectedProject}; file=${smokeFile}`,
        workflow_meta: {
            smoke_test: true,
            smoke_file: smokeFile,
            target_member: selectedProject,
            group_name: groupName,
        },
    });
    addTaskLog(task.id, "info", `创建真实日常开发闭环试运行任务：${selectedProject} -> ${smokeFile}`);
    let queueResult = null;
    if (autoExecute)
        queueResult = enqueueTask(task.id, ctx);
    return {
        success: true,
        task,
        group: { id: target.group.id, name: groupName, coordinator: target.coordinator?.project || "" },
        target_member: selectedProject,
        smoke_file: smokeFile,
        queued: !!queueResult?.queued,
        queue_result: queueResult,
        queue_status: getQueueStatus(),
    };
}
function getDailyDevSmokeStatus(payload = {}) {
    const tasks = (0, db_1.loadTasks)();
    const taskId = String(payload.task_id || payload.taskId || "").trim();
    const smokeTasks = tasks
        .filter((task) => task?.workflow_type === "daily_dev" && task?.workflow_meta?.smoke_test)
        .sort((a, b) => String(b.created_at || b.updated_at || "").localeCompare(String(a.created_at || a.updated_at || "")));
    const task = taskId
        ? tasks.find((item) => item.id === taskId)
        : smokeTasks[0];
    if (!task || !task.workflow_meta?.smoke_test) {
        return {
            success: true,
            pass: false,
            status: "no_task",
            message: taskId ? "未找到指定真实试运行任务" : "还没有创建真实日常开发闭环试运行任务",
            latest_task_id: smokeTasks[0]?.id || null,
            execution_readiness: getAgentExecutionReadiness(),
        };
    }
    const smokeFile = normalizeSmokeFilePath(task.workflow_meta.smoke_file || payload.smoke_file || payload.smokeFile);
    const group = loadGroups().find((item) => item.id === task.group_id) || null;
    const targetMember = task.workflow_meta.target_member || "";
    const runtime = targetMember && group ? (0, group_orchestrator_1.resolveMemberRuntime)(targetMember, group, (0, db_1.getConfigs)()) : null;
    const workDir = runtime?.workDir || "";
    const resolvedWorkDir = workDir ? path.resolve(workDir) : "";
    const resolvedSmokePath = resolvedWorkDir ? path.resolve(resolvedWorkDir, smokeFile) : "";
    const insideWorkDir = !!resolvedWorkDir && (resolvedSmokePath === resolvedWorkDir || resolvedSmokePath.startsWith(resolvedWorkDir + path.sep));
    const fileExists = insideWorkDir && fs.existsSync(resolvedSmokePath);
    const stat = fileExists ? fs.statSync(resolvedSmokePath) : null;
    const summary = task.delivery_summary || {};
    const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const targetAssignment = assignmentEvidence.find((item) => item?.project === targetMember);
    const hasTargetAssignment = !!targetAssignment;
    const hasTargetWorkerNotification = workerNotifications.some((item) => item?.task_id === targetMember || item?.agent === targetMember);
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || task.receipt?.status === "done";
    const hasFinalReview = !!(summary.has_final_review || task.review);
    const actualChangeCount = Number(summary.actual_file_change_count || task.file_changes?.count || 0);
    const executedVerificationCount = Number(summary.verification_executed?.length || 0);
    const requiredVerificationPassed = summary.verification_required_gate_passed !== false;
    const pass = task.status === "done"
        && fileExists
        && coordinationPlanCount > 0
        && hasTargetAssignment
        && hasTargetWorkerNotification
        && actualChangeCount > 0
        && hasDoneReceipt
        && hasFinalReview
        && executedVerificationCount > 0
        && requiredVerificationPassed;
    const missing = [
        task.status === "done" ? "" : "任务尚未完成",
        fileExists ? "" : "目标 smoke 文件不存在",
        coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据",
        hasTargetAssignment ? "" : "缺少主 Agent 派发给目标子 Agent 的证据",
        hasTargetWorkerNotification ? "" : "缺少目标子 Agent 的 Worker 通知",
        actualChangeCount > 0 ? "" : "未捕获实际文件变更",
        hasDoneReceipt ? "" : "缺少子 Agent done 回执",
        hasFinalReview ? "" : "缺少主 Agent 最终复盘",
        executedVerificationCount > 0 ? "" : "缺少已执行验证记录",
        requiredVerificationPassed ? "" : "缺少项目配置验证命令证据",
    ].filter(Boolean);
    const readiness = getTaskAgentExecutionReadiness(task);
    const status = pass
        ? "passed"
        : readiness.ready === false
            ? "blocked"
            : (task.status === "failed" ? "failed" : "waiting");
    return {
        success: true,
        pass,
        status,
        message: pass
            ? "真实日常开发闭环试运行已通过"
            : (status === "blocked" ? readiness.message : `真实试运行尚未通过：${missing.join("、") || task.status_detail || "等待执行结果"}`),
        task: {
            id: task.id,
            title: task.title,
            status: task.status,
            status_detail: task.status_detail || "",
            created_at: task.created_at,
            updated_at: task.updated_at,
            completed_at: task.completed_at || null,
        },
        target: {
            group_id: task.group_id || "",
            group_name: group?.name || task.workflow_meta.group_name || "",
            member: targetMember,
            work_dir: workDir,
            smoke_file: smokeFile,
            smoke_path: insideWorkDir ? resolvedSmokePath : "",
            file_exists: fileExists,
            file_size: stat?.size || 0,
            file_modified_at: stat ? stat.mtime.toISOString() : "",
        },
        evidence: {
            task_done: task.status === "done",
            file_exists: fileExists,
            assignment_count: assignmentEvidence.length,
            has_target_assignment: hasTargetAssignment,
            target_assignment: targetAssignment || null,
            worker_notification_count: workerNotifications.length,
            has_target_worker_notification: hasTargetWorkerNotification,
            coordination_plan_count: coordinationPlanCount,
            actual_file_change_count: actualChangeCount,
            has_done_receipt: hasDoneReceipt,
            has_final_review: hasFinalReview,
            executed_verification_count: executedVerificationCount,
            required_verification_passed: requiredVerificationPassed,
            missing,
            delivery_summary: summary,
        },
        execution_readiness: readiness,
    };
}
async function runAgentCliProbe(payload, ctx) {
    const readiness = getAgentProbeExecutionReadiness();
    if (!readiness.ready) {
        const fixActions = readiness.fix_actions || buildAgentExecutionFixActions({ error: readiness.message, probe: readiness.probe });
        const result = {
            success: false,
            blocked: true,
            message: readiness.message,
            error: readiness.message,
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            readiness,
        };
        writeAgentProbeStatus(result);
        return result;
    }
    const target = selectDailyDevSmokeTarget(payload);
    const selectedProject = target.selectedMember.project;
    const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(selectedProject, target.group, (0, db_1.getConfigs)());
    if (!runtime?.workDir)
        throw new Error("未找到探针目标 Agent 的工作目录");
    const agentType = runtime.agentType || "claudecode";
    const started = Date.now();
    const prompt = [
        "这是 cc-connect 执行通道健康探针。",
        "请不要修改任何文件，不要运行写入命令。",
        "只回复一行：CCM_AGENT_PROBE_OK",
    ].join("\n");
    try {
        const output = await ctx.callAgent(selectedProject, prompt, runtime.workDir, agentType, Number(payload.timeout_ms || payload.timeoutMs || 45000), {
            tab: "groups",
            groupId: target.group.id,
            project: selectedProject,
            probe: true,
        });
        const ok = /CCM_AGENT_PROBE_OK/i.test(output);
        const failure = ok ? null : getAgentProbeOutputFailure(output);
        const fixActions = ok ? [] : buildAgentExecutionFixActions({
            error: failure?.error || failure?.message || output,
            agentType,
            probe: { target: { agent_type: agentType }, output, message: failure?.message, error: failure?.error },
        });
        const result = {
            success: ok,
            blocked: false,
            message: ok ? "Agent CLI 探针通过" : failure?.message,
            error: ok ? "" : failure?.error,
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            target: {
                group_id: target.group.id,
                group_name: target.group.name || target.group.id,
                project: selectedProject,
                agent_type: agentType,
                work_dir: runtime.workDir,
            },
            duration_ms: Date.now() - started,
            output: String(output || "").slice(0, 2000),
            readiness,
        };
        writeAgentProbeStatus(result);
        return result;
    }
    catch (e) {
        const fixActions = buildAgentExecutionFixActions({
            error: e.message || String(e),
            agentType,
            probe: { target: { agent_type: agentType }, message: e.message || String(e), error: e.message || String(e) },
        });
        const result = {
            success: false,
            blocked: false,
            message: e.message || "Agent CLI 探针失败",
            error: e.message || String(e),
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            target: {
                group_id: target.group.id,
                group_name: target.group.name || target.group.id,
                project: selectedProject,
                agent_type: agentType,
                work_dir: runtime.workDir,
            },
            duration_ms: Date.now() - started,
            output: "",
            readiness,
        };
        writeAgentProbeStatus(result);
        return result;
    }
}
function parseJsonCandidate(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function normalizeAgentReceipt(raw, agent) {
    if (!raw || typeof raw !== "object")
        return null;
    const status = String(raw.status || "").trim().toLowerCase();
    const allowed = new Set(["done", "partial", "blocked", "failed", "needs_info"]);
    if (!raw.ccm_receipt && !allowed.has(status))
        return null;
    return {
        agent,
        status: allowed.has(status) ? status : "partial",
        summary: String(raw.summary || "").trim(),
        actions: normalizeStringArray(raw.actions),
        filesChanged: normalizeStringArray(raw.filesChanged || raw.files_changed || raw.files),
        verification: normalizeStringArray(raw.verification || raw.tests),
        blockers: normalizeStringArray(raw.blockers),
        needs: normalizeStringArray(raw.needs || raw.followUps || raw.follow_ups),
    };
}
function extractAgentReceipt(response, agent) {
    const raw = String(response || "");
    const fencedBlocks = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
        .map(match => parseJsonCandidate(match[1].trim()))
        .filter(Boolean);
    for (let i = fencedBlocks.length - 1; i >= 0; i--) {
        const receipt = normalizeAgentReceipt(fencedBlocks[i], agent);
        if (receipt)
            return receipt;
    }
    const markerIndex = raw.lastIndexOf("CCM_AGENT_RECEIPT");
    const searchArea = markerIndex >= 0 ? raw.slice(markerIndex) : raw;
    const start = searchArea.indexOf("{");
    const end = searchArea.lastIndexOf("}");
    if (start >= 0 && end > start) {
        const receipt = normalizeAgentReceipt(parseJsonCandidate(searchArea.slice(start, end + 1)), agent);
        if (receipt)
            return receipt;
    }
    return null;
}
function getReceiptAssignmentStatus(response, receipt) {
    if (receipt?.status === "failed")
        return { status: "failed", text: "失败" };
    if (receipt?.status === "blocked")
        return { status: "blocked", text: "阻塞" };
    if (receipt?.status === "needs_info")
        return { status: "needs_info", text: "需补充信息" };
    if (receipt?.status === "partial")
        return { status: "partial", text: "部分完成" };
    if (checkTaskFailure(response))
        return { status: "failed", text: "执行失败" };
    return { status: "done", text: "已完成" };
}
function formatAgentReceiptForReview(receipt) {
    if (!receipt)
        return "结构化回执：缺失";
    return [
        "结构化回执：",
        `- 状态：${receipt.status}`,
        `- 摘要：${receipt.summary || "未填写"}`,
        `- 动作：${receipt.actions.length ? receipt.actions.join("；") : "未填写"}`,
        `- 文件：${receipt.filesChanged.length ? receipt.filesChanged.join("；") : "无"}`,
        `- 验证：${receipt.verification.length ? receipt.verification.join("；") : "未提供"}`,
        `- 阻塞：${receipt.blockers.length ? receipt.blockers.join("；") : "无"}`,
        `- 需要补充：${receipt.needs.length ? receipt.needs.join("；") : "无"}`,
    ].join("\n");
}
function buildEvidenceGateFollowUps(group, outputs) {
    const routable = new Set((0, group_orchestrator_1.getRoutableMembers)(group).map((m) => m.project));
    const seen = new Set();
    const followUps = [];
    for (const output of outputs || []) {
        const text = String(output || "");
        const agent = getCollectedOutputAgent(text);
        if (!agent || !routable.has(agent) || seen.has(agent))
            continue;
        const notificationStatus = extractTaskNotificationTag(text, "status");
        const status = getCollectedOutputReceiptStatus(text);
        if (notificationStatus === "missing_receipt" || text.includes("结构化回执：缺失")) {
            seen.add(agent);
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                message: "主 Agent 验收未收到你的 CCM_AGENT_RECEIPT。请补充结构化回执，并明确：实际完成事项、是否修改文件、验证方式、阻塞点；不能把建议当作已完成。",
                reason: "缺少结构化回执，主 Agent 无法验收完成状态",
            });
            continue;
        }
        if (status && status !== "done") {
            seen.add(agent);
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                message: `主 Agent 验收发现你的回执状态为 ${status}。请继续处理到可验收状态，或明确说明仍需用户/其他 Agent 提供什么；完成后必须再次提交 CCM_AGENT_RECEIPT，status 只能在确有证据时写 done。`,
                reason: `结构化回执状态不是 done：${status}`,
            });
            continue;
        }
        const receipt = parseFormattedReceiptsFromText(text)[0];
        const verificationGate = getVerificationEvidenceGate(receipt ? [receipt] : []);
        if (status === "done" && !verificationGate.pass) {
            seen.add(agent);
            const reason = verificationGate.failed.length
                ? `验证未通过：${verificationGate.failed.join("；")}`
                : verificationGate.suggested.length
                    ? `验证记录只是建议或未执行：${verificationGate.suggested.join("；")}`
                    : "缺少已执行验证记录";
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                message: `主 Agent 验收发现你的 done 回执缺少可采信的已执行验证证据。请实际运行必要检查或说明人工核验结果；如果验证失败，先修复后再提交 CCM_AGENT_RECEIPT。当前缺口：${reason}`,
                reason,
            });
            continue;
        }
        const requiredVerificationCoverage = getRequiredVerificationCoverage(receipt ? [receipt] : []);
        if (status === "done" && !requiredVerificationCoverage.pass) {
            seen.add(agent);
            const missing = requiredVerificationCoverage.missing
                .map((item) => item.required.join(" / "))
                .join("；");
            const reason = `缺少项目配置验证命令执行证据：${missing}`;
            followUps.push({
                mention: `@${agent}`,
                targetName: agent,
                project: agent,
                message: `主 Agent 验收发现你的 done 回执没有覆盖项目配置的验证命令。请实际运行以下命令之一并把命令与结果写入 CCM_AGENT_RECEIPT.verification；如果无法运行，请写明人工核验结果和原因。需要覆盖：${missing}`,
                reason,
            });
        }
    }
    return followUps;
}
function buildCodedCoordinatorReview(group, outputs, options = {}) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
    const allowFollowUps = options.allowFollowUps !== false;
    const round = Math.max(1, Number(options.round || 1));
    const maxRounds = Math.max(round, Number(options.maxRounds || 3));
    const gateFollowUps = buildEvidenceGateFollowUps(group, outputs);
    const gaps = gateFollowUps.map((item) => String(item.reason || item.message || "").trim()).filter(Boolean);
    const followUps = allowFollowUps ? gateFollowUps : [];
    const status = followUps.length > 0
        ? "needs_followup"
        : gaps.length > 0
            ? "needs_user"
            : "complete";
    const lines = ["📋 **规则协调复盘**", ""];
    if (status === "complete") {
        lines.push("已完成规则验收：子 Agent 回执和验证证据未发现必须自动返工的缺口。");
    }
    else {
        lines.push(`第 ${round}/${maxRounds} 轮规则验收发现缺口：${gaps.join("；") || "仍缺少可验收证据"}`);
    }
    if (followUps.length) {
        lines.push("", "我会继续追问：");
        for (const item of followUps)
            lines.push(`@${item.targetName || item.project} ${item.message}`);
    }
    else if (gaps.length) {
        lines.push("", "已达到自动返工上限，需要用户确认是否继续派发或人工介入。");
    }
    return {
        agent: coordinator.project,
        status,
        followUps,
        gaps,
        conflicts: [],
        content: lines.join("\n").trim(),
        confidence: status === "complete" ? 0.82 : 0.68,
        runtime: "coded-review",
    };
}
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    catch { }
}
function emitAssignmentStatus(streamRes, groupId, planMessageId, project, status, statusText = "") {
    if (!planMessageId || !project)
        return;
    const text = statusText || status;
    const workflow = updateGroupMessageAssignmentStatus(groupId, planMessageId, project, status, text);
    writeSse(streamRes, {
        type: "assignment_status",
        planMessageId,
        project,
        status,
        statusText: text,
        workflow,
    });
}
// === 跨 Agent 并行与递归协作（核心）===
async function processCrossAgents(groupId, group, sourceProject, output, atMentions, configs, ctx, streamRes = null, depth = 0, seenMentions = new Set(), executionOrder = "parallel", planMessageId = "", taskId = "") {
    const collectedOutputs = [];
    if (depth > 3) {
        console.log("[跨Agent协作] 达到最大递归深度，停止继续转发");
        return collectedOutputs;
    }
    const sourceTask = getTaskById(taskId);
    const mentionLabels = atMentions.map(m => typeof m === "string" ? m : m.mention).filter(Boolean);
    console.log(`[跨Agent协作] 源: ${sourceProject}, 检测到 @mentions: ${mentionLabels.join(", ")}`);
    const uniqueMentions = atMentions.filter((m, idx, arr) => {
        const key = typeof m === "string" ? m : `${m.targetName}:${m.message}`;
        return arr.findIndex(item => (typeof item === "string" ? item : `${item.targetName}:${item.message}`) === key) === idx;
    });
    const getMentionTargetName = (mention) => {
        const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
        return typeof mention === "string"
            ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr)
            : mention.targetName;
    };
    const completedOutputsByAgent = new Map();
    const dependencyStates = new Map();
    const rememberMentionOutputs = (mention, outputs) => {
        const agent = getMentionTargetName(mention);
        if (!agent || !outputs?.length)
            return;
        completedOutputsByAgent.set(agent, [...(completedOutputsByAgent.get(agent) || []), ...outputs.filter(Boolean)]);
        dependencyStates.set(agent, getAgentDependencyStateFromOutputs(agent, completedOutputsByAgent.get(agent) || []));
    };
    const getBlockingDependency = (mention) => {
        if (typeof mention === "string")
            return null;
        const dependsOn = String(mention.dependsOn || "").trim();
        if (!dependsOn)
            return null;
        const dependencyInBatch = uniqueMentions.some((item) => getMentionTargetName(item) === dependsOn);
        if (!dependencyInBatch)
            return null;
        const state = dependencyStates.get(dependsOn);
        if (!state || state.ok)
            return null;
        return { dependsOn, state };
    };
    const skipMentionDueToDependency = (mention, dependency) => {
        const targetName = getMentionTargetName(mention);
        const dependsOn = dependency?.dependsOn || "前置 Agent";
        const reason = dependency?.state?.reason || `${dependsOn} 前置依赖未满足`;
        const summary = `依赖未满足，暂不执行 ${targetName}：${reason}`;
        const receipt = {
            agent: targetName,
            status: "blocked",
            summary,
            actions: [],
            filesChanged: [],
            verification: [],
            blockers: [summary],
            needs: [`等待 ${dependsOn} 返回 done 回执和可采信验证证据`],
        };
        const outputs = [formatCollectedAgentOutput(targetName, summary, receipt)];
        emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "blocked", `依赖未满足：${dependsOn}`);
        if (taskId)
            addTaskLog(taskId, "warning", `跳过子 Agent：${targetName}；依赖 ${dependsOn} 未满足；${reason}`);
        updateGroupMemory(groupId, {
            currentPhase: "needs_rework",
            blocked: {
                project: targetName,
                reason: summary,
                needs: receipt.needs,
            },
            workerLedger: {
                taskId,
                project: targetName,
                status: "blocked",
                receiptStatus: "blocked",
                summary,
                blockers: receipt.blockers,
                needs: receipt.needs,
            },
            nextAction: `主 Agent 先返工 ${dependsOn}，再继续 ${targetName}`,
        });
        appendGroupMessage(groupId, {
            id: "m" + Date.now().toString(36) + "dep" + crypto.randomBytes(2).toString("hex"),
            role: "assistant",
            agent: "system",
            content: `⏸️ @${targetName} 暂不执行\n${summary}`,
            timestamp: new Date().toISOString(),
            task_id: taskId || undefined,
        });
        writeSse(streamRes, { type: "status", text: summary, agent: targetName });
        return outputs;
    };
    const buildDependencyOutputPacket = (mention, targetName) => {
        const dependencyNames = new Set();
        const explicit = typeof mention !== "string" ? String(mention.dependsOn || "").trim() : "";
        if (explicit)
            dependencyNames.add(explicit);
        if (!explicit && executionOrder === "backend_first" && /app|web|front|frontend|前端/i.test(targetName)) {
            for (const [agent] of completedOutputsByAgent.entries()) {
                if (/cloud|api|server|backend|service|后端/i.test(agent))
                    dependencyNames.add(agent);
            }
        }
        const sections = [];
        for (const agent of dependencyNames) {
            const outputs = completedOutputsByAgent.get(agent) || [];
            if (!outputs.length)
                continue;
            sections.push(`【${agent} 前置输出】\n${compactMemoryText(outputs.join("\n\n---\n\n"), 1800)}`);
        }
        if (!sections.length)
            return "";
        return [
            "前置 Agent 输出（主 Agent 注入；你必须吸收这些结论，不能重新猜测依赖方契约）：",
            ...sections,
        ].join("\n\n");
    };
    const executeMentionJob = async (mention) => {
        const outputs = [];
        const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
        const targetName = typeof mention === "string" ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr) : mention.targetName;
        const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
        const failChildDispatch = (reason, needs = []) => {
            const summary = String(reason || "子 Agent 派发失败");
            const content = `❌ 子 Agent 派发失败：@${targetName}\n${summary}`;
            emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", summary);
            if (taskId)
                addTaskLog(taskId, "error", `子 Agent 派发失败：${targetName}；${summary}`);
            outputs.push(formatCollectedAgentOutput(targetName, content, {
                agent: targetName,
                status: "failed",
                summary,
                actions: [],
                filesChanged: [],
                verification: [],
                blockers: [summary],
                needs,
            }));
            updateGroupMemory(groupId, {
                currentPhase: "needs_rework",
                blocked: { project: targetName, reason: summary, needs },
                workerLedger: {
                    taskId,
                    project: targetName,
                    status: "failed",
                    receiptStatus: "failed",
                    summary,
                    blockers: [summary],
                    needs,
                },
                nextAction: `主 Agent 复盘 ${targetName} 派发阻塞并决定是否调整配置或询问用户`,
            });
            appendGroupMessage(groupId, {
                id: "m" + Date.now().toString(36) + "preflight" + crypto.randomBytes(2).toString("hex"),
                role: "assistant",
                agent: "system",
                content,
                timestamp: new Date().toISOString(),
                task_id: taskId || undefined,
            });
            writeSse(streamRes, { type: "status", text: content, agent: targetName });
            return outputs;
        };
        const targetMember = group.members.find((m) => m.project === targetName && m.project !== sourceProject);
        if (!targetMember) {
            return failChildDispatch("未找到群聊成员", ["检查主 Agent 生成的目标 Agent 名称是否已加入当前开发群聊"]);
        }
        const atRegex = new RegExp(`@${escapeRegExp(targetName)}\\s+([^@]+?)(?=\\s*@|$)`, "is");
        const atMatch = output.match(atRegex);
        let atMessage = typeof mention === "string" ? (atMatch ? atMatch[1].trim() : "") : mention.message;
        if (!atMessage || atMessage.length < 5) {
            const lines = output.split("\n");
            const relevantLines = [];
            let found = false;
            for (const line of lines) {
                if (line.includes(`@${targetName}`)) {
                    found = true;
                    relevantLines.push(line.replace(`@${targetName}`, "").trim());
                }
                else if (found && line.trim() && !line.startsWith("@")) {
                    relevantLines.push(line.trim());
                }
                else if (found && line.includes("@")) {
                    break;
                }
            }
            atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
        }
        const taskKey = `${sourceProject}->${targetName}:${normalizeMentionTask(atMessage)}`;
        if (seenMentions.has(taskKey)) {
            addGroupLog(groupId, "info", "collaboration", `跳过重复协作: ${sourceProject} -> ${targetName}`, { task: atMessage.substring(0, 160) });
            return outputs;
        }
        seenMentions.add(taskKey);
        let tWorkDir = process.cwd();
        let tAgentType = "claudecode";
        const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(targetName, group, configs);
        if (!runtime?.workDir) {
            return failChildDispatch("项目配置不存在或未绑定运行时", [
                `在项目管理中为 ${targetName} 配置项目路径和 Agent 类型`,
            ]);
        }
        const workDirState = getWorkDirState(runtime.workDir);
        if (!workDirState.exists || !workDirState.writable) {
            const reason = `工作目录不可用：${workDirState.path || runtime.workDir}（${!workDirState.exists ? "不存在或不是目录" : "不可读写"}）`;
            return failChildDispatch(reason, [
                "检查项目路径是否存在",
                "确认 Web 服务或外部 Runner 对该目录有读写权限",
            ]);
        }
        tWorkDir = workDirState.path || runtime.workDir;
        tAgentType = runtime.agentType || targetMember.agent || "claudecode";
        const preparedWorkDir = (0, agent_worktree_1.prepareChildAgentWorkDir)(tWorkDir, {
            mode: getChildAgentIsolationMode(group, sourceTask),
            taskId: taskId || "",
            agentName: targetName,
            sourceProject,
        });
        tWorkDir = preparedWorkDir.workDir;
        const worktreeNotice = (0, agent_worktree_1.buildChildAgentWorktreeNotice)(preparedWorkDir);
        if (preparedWorkDir.mode === "worktree") {
            const text = `子 Agent ${targetName} 已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`;
            if (taskId)
                addTaskLog(taskId, "info", text);
            addGroupLog(groupId, "info", "worktree", text, {
                agent: targetName,
                worktreePath: preparedWorkDir.worktreePath,
                worktreeBranch: preparedWorkDir.worktreeBranch,
            });
        }
        else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
            const text = `子 Agent ${targetName} 请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`;
            if (taskId)
                addTaskLog(taskId, "warning", text);
            addGroupLog(groupId, "warn", "worktree", text, {
                agent: targetName,
                originalWorkDir: preparedWorkDir.originalWorkDir,
            });
        }
        const continuationStrategy = typeof mention === "string" ? "" : String(mention.continuationStrategy || mention.continuation_strategy || "").trim();
        const continuationOf = typeof mention === "string" ? "" : String(mention.continuationOf || mention.continuation_of || "").trim();
        const isContinuation = !!continuationStrategy || (typeof mention !== "string" && !!mention.rework);
        emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "running", "执行中");
        if (taskId)
            addTaskLog(taskId, "info", `子 Agent 开始执行：${sourceProject} -> ${targetName}${isContinuation ? "（同 Worker 续跑）" : ""}；工作单：${compactMemoryText(atMessage, 220)}`);
        appendGroupMessage(groupId, {
            id: "m" + Date.now().toString(36) + "fwd",
            role: "assistant", agent: sourceProject,
            content: `📤 → @${targetName}\n${atMessage}`,
            timestamp: new Date().toISOString(),
            task_id: taskId || undefined,
        });
        writeSse(streamRes, { type: "status", text: `📨 ${sourceProject} 已 @${targetName}，等待 ${targetName} 回复...`, agent: targetName });
        ctx.setAgentActivity(targetName, "working", `被 ${sourceProject} @ 协作`, { tab: "groups", groupId }, 330000);
        ctx.broadcastPetSpeech(targetName, { role: "status", text: `${sourceProject} @ 我协作，正在处理...`, source: "group" });
        const tContext = (0, group_orchestrator_1.buildRecentGroupContext)(getGroupMessages(groupId).slice(-15));
        const childTaskText = buildChildAgentTaskText(atMessage, sourceTask);
        const memoryPacket = buildAgentMemoryPacket(groupId, targetName, childTaskText);
        const dependencyOutputPacket = buildDependencyOutputPacket(mention, targetName);
        const continuationNotice = isContinuation ? [
            "Worker 续跑提示：",
            `- 本次任务是主 Agent 验收后的同 Worker 续跑/返工，目标 Worker：${continuationOf || targetName}。`,
            `- 续跑策略：${continuationStrategy || "same_worker_scratchpad"}。`,
            "- 你必须优先参考上方“协作 scratchpad / 你自己的 Worker 通知”，承接上一轮结果补齐缺口；不要重复已完成且有证据的工作。",
            "- 如果上一轮状态是 blocked/needs_info/failed，先处理阻塞或明确 needs；不能把未解决阻塞写成 done。",
        ].join("\n") : "";
        if (targetName === coordinatorProject) {
            const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
            const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
            const result = await (0, group_orchestrator_1.runGroupOrchestrator)({
                group,
                message: atMessage,
                context: tContext,
                source: sourceProject,
                sharedFilesContext,
            });
            const planAssignments = normalizePlanAssignments(result.assignments || []);
            const dispatchPolicy = result.dispatchPolicy || null;
            const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "二级协调计划");
            outputs.push(formatCollectedAgentOutput(coordinatorProject, result.content, {
                agent: coordinatorProject,
                status: "done",
                summary: "主 Agent 已完成二级协调计划",
                actions: ["生成二级协作计划"],
                filesChanged: [],
                verification: ["已返回结构化 assignments"],
                blockers: [],
                needs: [],
            }));
            appendGroupMessage(groupId, {
                id: responseMessageId,
                role: "assistant",
                agent: coordinatorProject,
                content: result.content,
                timestamp: new Date().toISOString(),
                assignments: planAssignments,
                executionOrder: result.executionOrder || "parallel",
                runtime: result.runtime || "",
                dispatchPolicy,
                coordinationPlan: result.coordinationPlan || null,
                workflow: workflowMeta,
                task_id: taskId || undefined,
            });
            writeSse(streamRes, {
                type: "agent_done",
                agent: coordinatorProject,
                text: result.content,
                messageId: responseMessageId,
                assignments: planAssignments,
                executionOrder: result.executionOrder || "parallel",
                runtime: result.runtime || "",
                dispatchPolicy,
                coordinationPlan: result.coordinationPlan || null,
                workflow: workflowMeta,
            });
            emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "done", "已完成");
            const nestedMentions = getCoordinatorActionMentions(result, group, coordinatorProject);
            if (nestedMentions.length > 0) {
                const nestedOutputs = await processCrossAgents(groupId, group, coordinatorProject, result.content, nestedMentions, configs, ctx, streamRes, depth + 1, seenMentions, result.executionOrder || "parallel", responseMessageId, taskId);
                outputs.push(...nestedOutputs);
            }
            return outputs;
        }
        const memberList = group.members.map((m) => m.project).filter((p) => p !== targetName).join(", ");
        const collaborationInstructions = targetName === coordinatorProject
            ? (0, group_orchestrator_1.buildCoordinatorCollaborationInstructions)((0, group_orchestrator_1.getRoutableMembers)(group).map((m) => m.project).join(", "))
            : (0, group_orchestrator_1.buildMemberCollaborationInstructions)(targetName, memberList);
        const toolContext = buildAgentToolContext(ctx, group, targetName);
        const developmentContract = buildChildAgentDevelopmentContract(targetName, childTaskText, {
            source: `${sourceProject} @ 协作`,
            acceptance: sourceTask?.acceptance_criteria || "",
            requires_code_changes: sourceTask ? taskRequiresCodeChanges(sourceTask) : true,
            verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
        });
        const tPrompt = `你正在 CCM 群聊中被 @ 请求协作。${collaborationInstructions}${toolContext.prompt}

${developmentContract}

${worktreeNotice}

${memoryPacket}

${continuationNotice}

${dependencyOutputPacket}

以下是群聊最近的消息记录：
${tContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${childTaskText}

请直接回复本次请求：给出结论、必要的执行/修改说明、风险、汇总意见，或需要继续 @ 的成员。`;
        try {
            const responseMessageId = "m" + Date.now().toString(36) + "cross" + crypto.randomBytes(2).toString("hex");
            let targetFileChanges = null;
            const tOutput = await ctx.callAgentForGroupStream(targetName, tPrompt, tWorkDir, tAgentType, {
                res: streamRes,
                groupId,
                timeoutMs: 300000,
                messageId: responseMessageId,
                allowedTools: toolContext.allowedTools,
                onDone: (opts) => { targetFileChanges = opts.fileChanges; }
            });
            const targetReceipt = extractAgentReceipt(tOutput, targetName);
            outputs.push(formatCollectedAgentOutput(targetName, tOutput, targetReceipt));
            if (taskId && targetReceipt) {
                const verificationCount = Array.isArray(targetReceipt.verification) ? targetReceipt.verification.length : 0;
                const fileCount = Array.isArray(targetReceipt.filesChanged) ? targetReceipt.filesChanged.length : 0;
                addTaskLog(taskId, targetReceipt.status === "done" ? "success" : "warning", `子 Agent 回执：${targetName} status=${targetReceipt.status}，文件 ${fileCount} 个，验证 ${verificationCount} 条；${targetReceipt.summary || "无摘要"}`);
            }
            if (targetReceipt) {
                if (targetReceipt.status === "done" || targetReceipt.status === "partial") {
                    updateGroupMemory(groupId, {
                        currentPhase: targetReceipt.status === "done" ? "executing" : "needs_rework",
                        completed: {
                            project: targetName,
                            summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                            filesChanged: targetReceipt.filesChanged || [],
                            verification: targetReceipt.verification || [],
                        },
                        workerLedger: {
                            taskId,
                            project: targetName,
                            status: targetReceipt.status === "done" ? "completed" : "partial",
                            receiptStatus: targetReceipt.status,
                            summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                            filesChanged: targetReceipt.filesChanged || [],
                            verification: targetReceipt.verification || [],
                            blockers: targetReceipt.blockers || [],
                            needs: targetReceipt.needs || [],
                        },
                        nextAction: targetReceipt.status === "done" ? `等待主 Agent 验收 ${targetName} 回执` : `主 Agent 复盘 ${targetName} 的部分完成回执`,
                    });
                }
                else {
                    updateGroupMemory(groupId, {
                        currentPhase: "needs_rework",
                        blocked: {
                            project: targetName,
                            reason: targetReceipt.blockers?.join("；") || targetReceipt.summary || targetReceipt.status,
                            needs: targetReceipt.needs || [],
                        },
                        workerLedger: {
                            taskId,
                            project: targetName,
                            status: targetReceipt.status || "blocked",
                            receiptStatus: targetReceipt.status,
                            summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                            filesChanged: targetReceipt.filesChanged || [],
                            verification: targetReceipt.verification || [],
                            blockers: targetReceipt.blockers || [],
                            needs: targetReceipt.needs || [],
                        },
                        nextAction: `主 Agent 复盘 ${targetName} 阻塞并决定是否返工或询问用户`,
                    });
                }
            }
            else {
                if (taskId)
                    addTaskLog(taskId, "warning", `子 Agent 未提供结构化回执：${targetName}；主 Agent 后续验收会要求补充 CCM_AGENT_RECEIPT`);
                updateGroupMemory(groupId, {
                    currentPhase: "reviewing",
                    blocked: {
                        project: targetName,
                        reason: "子 Agent 未提供结构化回执，主 Agent 需要验收时确认是否补充",
                        needs: ["补充 CCM_AGENT_RECEIPT"],
                    },
                    workerLedger: {
                        taskId,
                        project: targetName,
                        status: "missing_receipt",
                        receiptStatus: "missing",
                        summary: compactMemoryText(tOutput, 220),
                        blockers: ["缺少 CCM_AGENT_RECEIPT"],
                        needs: ["补充 CCM_AGENT_RECEIPT"],
                    },
                    nextAction: `主 Agent 验收 ${targetName} 自然语言回复`,
                });
            }
            appendGroupMessage(groupId, {
                id: responseMessageId,
                role: "assistant", agent: targetName,
                content: tOutput,
                timestamp: new Date().toISOString(),
                task_id: taskId || undefined,
                fileChanges: targetFileChanges,
            });
            const assignmentStatus = getReceiptAssignmentStatus(tOutput, targetReceipt);
            emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, assignmentStatus.status, assignmentStatus.text);
            const nestedMentions = extractActionableMentions(tOutput, group, targetName);
            if (nestedMentions.length > 0) {
                const newMentions = nestedMentions.filter(m => m.targetName !== targetName);
                if (newMentions.length > 0) {
                    const nestedOutputs = await processCrossAgents(groupId, group, targetName, tOutput, newMentions, configs, ctx, streamRes, depth + 1, seenMentions, "parallel", "", taskId);
                    outputs.push(...nestedOutputs);
                }
            }
        }
        catch (error) {
            console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
            emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", error.message || "执行失败");
            if (taskId)
                addTaskLog(taskId, "error", `子 Agent 执行失败：${targetName}；${error.message || "未知错误"}`);
            outputs.push(formatCollectedAgentOutput(targetName, `❌ 转发失败: ${error.message}`, {
                agent: targetName,
                status: "failed",
                summary: `转发失败: ${error.message}`,
                actions: [],
                filesChanged: [],
                verification: [],
                blockers: [String(error.message || "执行失败")],
                needs: [],
            }));
            updateGroupMemory(groupId, {
                currentPhase: "needs_rework",
                blocked: {
                    project: targetName,
                    reason: `转发失败: ${error.message || "执行失败"}`,
                    needs: [],
                },
                workerLedger: {
                    taskId,
                    project: targetName,
                    status: "failed",
                    receiptStatus: "failed",
                    summary: `转发失败: ${error.message || "执行失败"}`,
                    blockers: [String(error.message || "执行失败")],
                    needs: [],
                },
                nextAction: `主 Agent 复盘 ${targetName} 执行失败并决定是否重试`,
            });
            appendGroupMessage(groupId, {
                id: "m" + Date.now().toString(36) + "err",
                role: "assistant", agent: "system",
                content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
                timestamp: new Date().toISOString(),
                task_id: taskId || undefined,
            });
        }
        return outputs;
    };
    const hasExplicitDependencies = uniqueMentions.some((mention) => typeof mention !== "string" && String(mention.dependsOn || "").trim());
    if (hasExplicitDependencies) {
        const pending = [...uniqueMentions];
        const completed = new Set();
        let guard = 0;
        while (pending.length > 0 && guard < 20) {
            guard++;
            const readyIndex = pending.findIndex((mention) => {
                if (typeof mention === "string")
                    return true;
                const dependsOn = String(mention.dependsOn || "").trim();
                const dependencyInBatch = uniqueMentions.some((item) => getMentionTargetName(item) === dependsOn);
                return !dependsOn || !dependencyInBatch || completed.has(dependsOn) || dependencyStates.has(dependsOn);
            });
            const index = readyIndex >= 0 ? readyIndex : 0;
            const [mention] = pending.splice(index, 1);
            const dependencyIssue = getBlockingDependency(mention);
            const outputs = dependencyIssue
                ? skipMentionDueToDependency(mention, dependencyIssue)
                : await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputs(mention, outputs);
            completed.add(getMentionTargetName(mention));
        }
    }
    else if (executionOrder === "sequential" || executionOrder === "backend_first") {
        // 串行执行：后端优先或按顺序
        const backendMentions = [];
        const frontendMentions = [];
        const otherMentions = [];
        for (const mention of uniqueMentions) {
            const targetName = getMentionTargetName(mention);
            const targetMember = group.members.find((m) => m.project === targetName);
            const kind = targetMember ? (/cloud|api|server|backend|service|后端/i.test(targetName) ? "backend" : /app|web|front|frontend|前端/i.test(targetName) ? "frontend" : "other") : "other";
            if (kind === "backend")
                backendMentions.push(mention);
            else if (kind === "frontend")
                frontendMentions.push(mention);
            else
                otherMentions.push(mention);
        }
        // 先执行后端
        for (const mention of backendMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputs(mention, outputs);
        }
        // 再执行前端
        for (const mention of frontendMentions) {
            const failedBackend = backendMentions
                .map((item) => ({ name: getMentionTargetName(item), state: dependencyStates.get(getMentionTargetName(item)) }))
                .find((item) => item.name && item.state && !item.state.ok);
            const outputs = failedBackend
                ? skipMentionDueToDependency(mention, { dependsOn: failedBackend.name, state: failedBackend.state })
                : await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputs(mention, outputs);
        }
        // 最后其他
        for (const mention of otherMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputs(mention, outputs);
        }
    }
    else {
        // 默认并行执行
        const settledOutputs = await Promise.all(uniqueMentions.map(mention => executeMentionJob(mention)));
        settledOutputs.forEach((outputs, index) => {
            collectedOutputs.push(...outputs);
            rememberMentionOutputs(uniqueMentions[index], outputs);
        });
    }
    return collectedOutputs;
}
async function appendCoordinatorMessage(groupId, agent, content, streamRes = null, suffix = "review", metadata = {}) {
    const messageId = "m" + Date.now().toString(36) + suffix + crypto.randomBytes(2).toString("hex");
    appendGroupMessage(groupId, {
        id: messageId,
        role: "assistant",
        agent,
        content,
        timestamp: new Date().toISOString(),
        ...metadata,
    });
    writeSse(streamRes, {
        type: "agent_done",
        agent,
        text: content,
        messageId,
        ...metadata,
    });
    return messageId;
}
function buildCoordinatorReworkTask(item, input) {
    const project = String(item?.targetName || item?.project || "").trim();
    const rawTask = String(item?.message || item?.task || "").trim();
    const reason = String(item?.reason || "主 Agent 复盘发现仍缺少可验收证据").trim();
    if (/主 Agent 返工工作单|返工轮次|必须再次提交 CCM_AGENT_RECEIPT/i.test(rawTask))
        return rawTask;
    const previous = input.previousLedger || item?.previousLedger || null;
    const previousSummary = previous ? [
        previous.summary ? `摘要：${compactMemoryText(previous.summary, 260)}` : "",
        previous.filesChanged?.length ? `文件：${previous.filesChanged.slice(0, 8).join("、")}` : "",
        previous.verification?.length ? `验证：${previous.verification.slice(0, 8).join("、")}` : "",
        previous.blockers?.length ? `阻塞：${previous.blockers.slice(0, 8).join("、")}` : "",
        previous.needs?.length ? `需要：${previous.needs.slice(0, 8).join("、")}` : "",
    ].filter(Boolean).join("；") : "";
    return [
        `主 Agent 返工工作单：${project}`,
        `- 返工轮次：第 ${input.round + 1}/${input.maxRounds} 轮执行；这是主 Agent 验收后派发的补充任务。`,
        "- 续跑语义：优先继续同一个 Worker 的上下文；系统会把该 Worker 的上一轮 task-notification/scratchpad 注入给你。不要从零开始猜测，也不要重复已完成且已验证的工作。",
        previousSummary ? `- 上一轮 Worker 通知摘要：${previousSummary}` : "- 上一轮 Worker 通知摘要：暂无可用记录；请按本工作单和群聊记忆继续补齐缺口。",
        `- 原始需求：${compactMemoryText(input.userMessage, 500)}`,
        `- 初始协调计划摘要：${compactMemoryText(input.coordinatorOutput, 900)}`,
        `- 返工原因：${reason}`,
        `- 本次返工任务：${rawTask}`,
        "- 你的职责：只处理本项目范围内的代码、配置、验证或说明；如果依赖其他 Agent/用户，写清 blockers/needs。",
        "- 交付要求：补齐主 Agent 点名的缺口，明确实际动作、文件变更、验证结果和剩余风险。",
        "- 验证要求：实际运行与你补充内容相关的最小必要验证；未运行的只能写成建议，不能伪造成已执行。",
        "- 回执要求：最后必须再次提交 CCM_AGENT_RECEIPT，status 只有在有证据时才能写 done。",
    ].join("\n");
}
function getCoordinatorReworkProtocolSelfTest() {
    const task = buildCoordinatorReworkTask({
        project: "web-app",
        message: "补充订单退款审核入口的实际验证记录，并说明修改文件。",
        reason: "done 回执缺少可采信的已执行验证证据",
    }, {
        userMessage: "按接口文档实现订单退款审核功能。",
        coordinatorOutput: "主 Agent 计划：先后端接口，再前端对接，最后验收回执。",
        round: 1,
        maxRounds: 3,
    });
    const checks = {
        hasReworkPacket: task.includes("主 Agent 返工工作单"),
        hasRound: task.includes("第 2/3 轮执行"),
        hasContinuationSemantics: task.includes("续跑语义") && task.includes("同一个 Worker"),
        hasScratchpadContext: task.includes("task-notification/scratchpad"),
        hasOriginalRequirement: task.includes("原始需求"),
        hasCoordinatorPlan: task.includes("初始协调计划摘要"),
        hasReason: task.includes("返工原因"),
        hasVerification: task.includes("验证要求"),
        hasReceipt: task.includes("CCM_AGENT_RECEIPT"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
    };
}
async function runCoordinatorReviewLoop(input) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(input.group);
    const seenMentions = new Set();
    const allOutputs = [...(input.crossOutputs || [])];
    const maxReviewRounds = 3;
    if (allOutputs.length === 0)
        return null;
    let lastReview = null;
    for (let round = 1; round <= maxReviewRounds; round++) {
        const allowFollowUps = round < maxReviewRounds;
        let review = await (0, group_orchestrator_1.runLlmCoordinatorReview)(input.group, input.userMessage, input.coordinatorOutput, allOutputs, { allowFollowUps, round, maxRounds: maxReviewRounds });
        if (!review) {
            review = buildCodedCoordinatorReview(input.group, allOutputs, {
                allowFollowUps,
                round,
                maxRounds: maxReviewRounds,
            });
        }
        lastReview = review;
        const llmFollowUps = Array.isArray(review.followUps) ? review.followUps : [];
        const gateFollowUps = buildEvidenceGateFollowUps(input.group, allOutputs);
        const followUps = uniqueByKey([...llmFollowUps, ...(allowFollowUps ? gateFollowUps : [])], (item) => `${String(item?.targetName || item?.project || "").trim()}|${normalizeMentionTask(String(item?.message || item?.task || ""))}`, 20);
        const memorySnapshot = loadGroupMemory(input.groupId);
        const reworkFollowUps = followUps.map((item) => ({
            ...item,
            continuationOf: String(item?.targetName || item?.project || "").trim(),
            continuationStrategy: "same_worker_scratchpad",
            previousLedger: findLatestWorkerLedger(memorySnapshot, String(item?.targetName || item?.project || "").trim()),
            message: buildCoordinatorReworkTask(item, {
                userMessage: input.userMessage,
                coordinatorOutput: input.coordinatorOutput,
                round,
                maxRounds: maxReviewRounds,
                previousLedger: findLatestWorkerLedger(memorySnapshot, String(item?.targetName || item?.project || "").trim()),
            }),
        }));
        const gateReasons = gateFollowUps.map((item) => String(item.reason || "").trim()).filter(Boolean);
        if (!allowFollowUps && gateReasons.length) {
            review.status = "needs_user";
        }
        let reviewContent = gateReasons.length
            ? `${review.content}\n\n系统验收门禁：${gateReasons.join("；")}${allowFollowUps ? "" : "\n已达到自动返工上限，需要用户确认是否继续派发或人工介入。"}`
            : review.content;
        if (reworkFollowUps.length) {
            reviewContent = [
                reviewContent,
                "",
                "主 Agent 返工工作单：",
                ...reworkFollowUps.map((item) => `@${item.targetName || item.project} ${compactMemoryText(item.message || item.task || "", 900)}`),
            ].join("\n");
        }
        const followUpAssignments = normalizePlanAssignments(reworkFollowUps.map((item) => ({
            project: String(item?.targetName || item?.project || "").trim(),
            task: String(item?.message || item?.task || "").trim(),
            reason: String(item?.reason || "主 Agent 复盘后发现仍有缺口，需要补充处理").trim(),
            dependsOn: String(item?.dependsOn || "").trim(),
            rework: true,
            continuationOf: String(item?.continuationOf || item?.targetName || item?.project || "").trim(),
            continuationStrategy: String(item?.continuationStrategy || "same_worker_scratchpad").trim(),
            attempt: round + 1,
        })).filter((item) => item.project && item.task));
        const reviewMessageId = await appendCoordinatorMessage(input.groupId, coordinator.project, reviewContent, input.streamRes, `review${round}`, followUpAssignments.length > 0
            ? {
                assignments: followUpAssignments,
                executionOrder: input.executionOrder || "parallel",
                runtime: "llm-review",
                workflow: buildWorkflowMeta("rework", `第 ${round} 轮验收后返工`),
            }
            : {
                runtime: "llm-review",
                workflow: buildWorkflowMeta(review.status === "needs_user" ? "needs_user" : "reviewing", `第 ${round} 轮主 Agent 验收`),
            });
        updateGroupMemory(input.groupId, {
            currentPhase: followUpAssignments.length > 0 ? "rework" : (review.status === "needs_user" ? "needs_user" : "reviewing"),
            decision: `主 Agent 第 ${round} 轮验收：${review.status || "review"}`,
            reason: gateReasons.join("；") || (review.gaps || []).join("；") || (review.conflicts || []).join("；"),
            openQuestion: review.content?.includes("需要你确认") ? review.content : "",
            nextAction: followUpAssignments.length > 0 ? `执行第 ${round} 轮返工计划` : "等待用户确认或进入最终总结",
        });
        if (followUps.length === 0)
            return review;
        writeSse(input.streamRes, { type: "status", text: `🔎 主 Agent 第 ${round} 轮验收发现缺口，正在继续追问相关子 Agent...`, agent: coordinator.project });
        const followOutputs = await processCrossAgents(input.groupId, input.group, coordinator.project, reviewContent, reworkFollowUps, input.configs, input.ctx, input.streamRes, round, seenMentions, input.executionOrder || "parallel", reviewMessageId, input.taskId || "");
        allOutputs.push(...followOutputs);
    }
    const finalSummary = lastReview
        || await (0, group_orchestrator_1.runLlmCoordinatorSummary)(input.group, input.userMessage, allOutputs)
        || (0, group_orchestrator_1.buildCodedCoordinatorSummary)(input.group, allOutputs);
    if (finalSummary) {
        await appendCoordinatorMessage(input.groupId, finalSummary.agent || coordinator.project, finalSummary.content, input.streamRes, "final", { workflow: buildWorkflowMeta(finalSummary.status === "needs_user" ? "needs_user" : "complete", "最终验收") });
        updateGroupMemory(input.groupId, {
            currentPhase: finalSummary.status === "needs_user" ? "needs_user" : "complete",
            decision: "主 Agent 完成最终验收",
            reason: compactMemoryText(finalSummary.content || "", 300),
            nextAction: finalSummary.status === "needs_user" ? "等待用户补充信息" : "本轮协作已完成",
        });
    }
    return finalSummary;
}
// === 执行任务核心 ===
async function executeTask(task, ctx) {
    const configs = (0, db_1.getConfigs)();
    if (task.assign_type === "group" && task.group_id) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === task.group_id);
        if (!group)
            throw new Error("群聊不存在");
        const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
        const message = buildQueuedGroupTaskMessage(task);
        appendGroupMessage(task.group_id, {
            id: "m" + Date.now().toString(36) + "task",
            role: "user",
            target: coordinatorProject,
            content: message,
            timestamp: new Date().toISOString(),
            task_id: task.id,
        });
        safeAddGroupLog(task.group_id, "info", "task", `任务派发到群聊: ${task.title}`, {
            task_id: task.id,
            priority: task.priority
        });
        updateGroupMemory(task.group_id, {
            goal: message,
            currentPhase: "dispatching",
            decision: "任务队列派发到群聊主 Agent",
            reason: task.title,
            nextAction: "主 Agent 拆分任务并协调子 Agent",
        });
        const memoryContext = buildGroupMemoryContext(loadGroupMemory(task.group_id));
        const context = [memoryContext, (0, group_orchestrator_1.buildRecentGroupContext)(getGroupMessages(task.group_id).slice(-10))].filter(Boolean).join("\n\n");
        const sharedFilesContext = mergeCoordinatorDocumentContexts(buildCoordinatorSharedFilesContext(ctx, group), buildTaskSourceDocumentsContext(task));
        let coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
            group,
            message,
            context,
            source: "task",
            sharedFilesContext,
        });
        let coordinatorOutput = coordinatorResult.content;
        const coordinatorTranscript = [coordinatorOutput].filter(Boolean);
        let coordinatorMessageId = "m" + Date.now().toString(36) + "coord";
        let planAssignments = normalizePlanAssignments(coordinatorResult.assignments || []);
        let dispatchPolicy = coordinatorResult.dispatchPolicy || null;
        let workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "任务队列协调");
        appendGroupMessage(task.group_id, {
            id: coordinatorMessageId,
            role: "assistant",
            agent: coordinatorProject,
            content: coordinatorOutput,
            timestamp: new Date().toISOString(),
            task_id: task.id,
            assignments: planAssignments,
            executionOrder: coordinatorResult.executionOrder || "parallel",
            runtime: coordinatorResult.runtime || "",
            dispatchPolicy,
            coordinationPlan: coordinatorResult.coordinationPlan || null,
            workflow: workflowMeta,
        });
        let validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
        if (task.workflow_type === "daily_dev" && validMentions.length === 0 && (0, group_orchestrator_1.getRoutableMembers)(group).length > 0) {
            const repairResult = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
                group,
                message,
                context,
                source: "daily-dev-dispatch-repair",
                sharedFilesContext,
            });
            const repairMentions = getCoordinatorActionMentions(repairResult, group, coordinatorProject);
            const repairAssignments = normalizePlanAssignments(repairResult.assignments || []);
            if (repairMentions.length > 0 || repairAssignments.length > 0) {
                const repairOutput = [
                    "主 Agent 派发修复：业务开发任务缺少可执行 assignments，系统已启用规则协调器补充派发计划。",
                    "",
                    repairResult.content || "",
                ].join("\n").trim();
                coordinatorResult = {
                    ...repairResult,
                    content: repairOutput,
                    runtime: repairResult.runtime || "coded-dispatch-repair",
                };
                coordinatorOutput = repairOutput;
                coordinatorTranscript.push(repairOutput);
                coordinatorMessageId = "m" + Date.now().toString(36) + "repair";
                planAssignments = normalizePlanAssignments(coordinatorResult.assignments || []);
                dispatchPolicy = coordinatorResult.dispatchPolicy || null;
                workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "daily_dev 派发修复");
                appendGroupMessage(task.group_id, {
                    id: coordinatorMessageId,
                    role: "assistant",
                    agent: coordinatorProject,
                    content: coordinatorOutput,
                    timestamp: new Date().toISOString(),
                    task_id: task.id,
                    assignments: planAssignments,
                    executionOrder: coordinatorResult.executionOrder || "parallel",
                    runtime: coordinatorResult.runtime || "",
                    dispatchPolicy,
                    coordinationPlan: coordinatorResult.coordinationPlan || null,
                    workflow: workflowMeta,
                });
                validMentions = repairMentions.length > 0
                    ? repairMentions
                    : getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
                addTaskLog(task.id, "info", `daily_dev 主 Agent 空派发已自动补派: ${validMentions.map(m => m.mention).join(", ") || planAssignments.map((item) => `@${item.project}`).join(", ")}`);
                updateGroupMemory(task.group_id, {
                    currentPhase: "dispatching",
                    decision: "daily_dev 空派发计划修复",
                    reason: "主 Agent 未产生可执行派发，已启用规则协调器补充派发计划",
                    nextAction: "子 Agent 按补派计划执行并返回结构化回执",
                });
            }
            else {
                addTaskLog(task.id, "warning", "daily_dev 主 Agent 空派发修复未产生可执行目标");
            }
        }
        let crossOutputs = [];
        let reviewResult = null;
        if (validMentions.length > 0) {
            addTaskLog(task.id, "info", `检测到群聊派发目标: ${validMentions.map(m => m.mention).join(", ")}`);
            crossOutputs = await processCrossAgents(task.group_id, group, coordinatorProject, coordinatorOutput, validMentions, configs, ctx, null, 0, new Set(), coordinatorResult.executionOrder || "parallel", coordinatorMessageId, task.id);
            reviewResult = await runCoordinatorReviewLoop({
                groupId: task.group_id,
                group,
                userMessage: message,
                coordinatorOutput,
                crossOutputs,
                configs,
                ctx,
                executionOrder: coordinatorResult.executionOrder || "parallel",
                taskId: task.id,
            });
        }
        const outputText = [...coordinatorTranscript, ...crossOutputs, reviewResult?.content || ""].filter(Boolean).join("\n\n---\n\n");
        return getGroupTaskExecutionStatus(reviewResult, coordinatorResult, outputText, task);
    }
    else {
        const config = configs.find(c => c.name === task.target_project);
        if (!config)
            throw new Error("项目配置不存在");
        const info = (0, db_1.getConfigInfo)(config.path);
        let workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";
        const toolContext = buildAgentToolContext(ctx, null, task.target_project);
        const preparedWorkDir = (0, agent_worktree_1.prepareChildAgentWorkDir)(workDir, {
            mode: getChildAgentIsolationMode(null, task),
            taskId: task.id,
            agentName: task.target_project,
            sourceProject: "task-queue",
        });
        workDir = preparedWorkDir.workDir;
        const worktreeNotice = (0, agent_worktree_1.buildChildAgentWorktreeNotice)(preparedWorkDir);
        if (preparedWorkDir.mode === "worktree") {
            addTaskLog(task.id, "info", `直接任务已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`);
        }
        else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
            addTaskLog(task.id, "warning", `直接任务请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`);
        }
        const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
        const directTaskText = buildChildAgentTaskText(`${task.title}\n${task.description || ""}`, task);
        const developmentContract = buildChildAgentDevelopmentContract(task.target_project, directTaskText, {
            source: "任务队列",
            acceptance: task.acceptance_criteria || "",
            requires_code_changes: task.requires_code_changes,
            verification_hints: buildProjectVerificationHints(task.target_project, workDir),
        });
        const message = `${toolContext.prompt}\n\n${developmentContract}\n\n${worktreeNotice}\n\n📋 执行任务：${task.title}\n${directTaskText}

请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执，格式如下：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明实际完成/确认了什么",
  "actions": ["实际执行的动作"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "blockers": ["阻塞点；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;
        const output = await ctx.callAgent(task.target_project, message, workDir, agentType, 300000, { allowedTools: toolContext.allowedTools });
        const fileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
        return getTaskExecutionFromReceipt(output, extractAgentReceipt(output, task.target_project), { fileChanges });
    }
}
// 队列处理
async function processTargetQueue(targetKey, ctx) {
    if (runningTasks.has(targetKey)) {
        console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
        return;
    }
    const queue = taskQueues.get(targetKey);
    if (!queue || queue.length === 0)
        return;
    runningTasks.set(targetKey, true);
    console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);
    while (queue.length > 0) {
        const taskId = queue.shift();
        if (!taskId)
            continue;
        const tasks = (0, db_1.loadTasks)();
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === "done") {
            addTaskLog(taskId, "info", `跳过任务（不存在或已完成）`);
            continue;
        }
        if (isTaskPaused(task)) {
            addTaskLog(taskId, "info", `任务已暂停，跳过本次队列执行`);
            continue;
        }
        addTaskLog(taskId, "info", `开始执行任务: ${task.title}`);
        try {
            runningTaskIds.add(taskId);
            const startedTask = updateTask(taskId, { status: "in_progress", started_at: new Date().toISOString() }) || task;
            addTaskLog(taskId, "info", `任务状态更新为: 进行中`);
            syncTaskBacklogStatus(startedTask, "in_progress", "任务已进入执行阶段");
            await ctx.onTaskStatusChange?.(startedTask, "in_progress");
            addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
            const execution = await executeTask(task, ctx);
            const result = execution.result || execution.report || "";
            addTaskLog(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);
            if (execution.status === "failed") {
                const deliverySummary = buildDeliverySummary(task, execution, "failed");
                const failedTask = updateTask(taskId, {
                    status: "failed",
                    result: result.substring(0, 500),
                    final_report: execution.report || result,
                    status_detail: execution.detail || "Agent 回执失败",
                    receipt: execution.receipt || null,
                    review: execution.review || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: deliverySummary,
                }) || { ...task, status: "failed", result: result.substring(0, 500) };
                addTaskLog(taskId, "error", `❌ 任务执行失败：${execution.detail || "Agent 回执失败"}`);
                syncTaskBacklogStatus(failedTask, "blocked", execution.detail || result.substring(0, 500));
                await ctx.onTaskStatusChange?.(failedTask, "failed", result.substring(0, 500));
                appendTaskGroupReport(failedTask, "failed", execution.detail || result.substring(0, 500));
                await sendTaskFailureNotification(failedTask, execution.detail || result.substring(0, 500));
                continue;
            }
            if (checkTaskFailure(result)) {
                throw new Error(result.substring(0, 500));
            }
            const isCompleted = execution.status === "done";
            if (isCompleted) {
                const deliverySummary = buildDeliverySummary(task, execution, "done");
                const completedTask = updateTask(taskId, {
                    status: "done",
                    result: result.substring(0, 500),
                    final_report: execution.report || result,
                    status_detail: execution.detail || "验收通过",
                    receipt: execution.receipt || null,
                    review: execution.review || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: deliverySummary,
                    completed_at: new Date().toISOString()
                }) || { ...task, status: "done", result: result.substring(0, 500) };
                addTaskLog(taskId, "success", `✅ 任务完成：${execution.detail || "验收通过"}`);
                syncTaskBacklogStatus(completedTask, "done", execution.detail || result.substring(0, 500));
                await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
                appendTaskGroupReport(completedTask, "done", execution.detail || result.substring(0, 500));
                await sendTaskCompletionNotification(completedTask, result);
            }
            else {
                const deliverySummary = buildDeliverySummary(task, execution, "waiting");
                if (canCompleteDailyDevFromDeliverySummary(task, execution, deliverySummary)) {
                    const promotedExecution = {
                        ...execution,
                        status: "done",
                        detail: "daily_dev 验收证据齐全，系统自动完成",
                    };
                    const promotedSummary = buildDeliverySummary(task, promotedExecution, "done");
                    const completedTask = updateTask(taskId, {
                        status: "done",
                        result: result.substring(0, 500),
                        final_report: execution.report || result,
                        status_detail: promotedExecution.detail,
                        receipt: execution.receipt || null,
                        review: execution.review || null,
                        file_changes: execution.fileChanges || null,
                        delivery_summary: promotedSummary,
                        completed_at: new Date().toISOString()
                    }) || { ...task, status: "done", result: result.substring(0, 500) };
                    addTaskLog(taskId, "success", `✅ 任务完成：${promotedExecution.detail}`);
                    syncTaskBacklogStatus(completedTask, "done", promotedExecution.detail);
                    await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
                    appendTaskGroupReport(completedTask, "done", promotedExecution.detail);
                    await sendTaskCompletionNotification(completedTask, result);
                }
                else {
                    const waitingTask = updateTask(taskId, {
                        status: "in_progress",
                        result: result.substring(0, 500),
                        final_report: execution.report || result,
                        status_detail: execution.detail || "等待补充信息或返工",
                        receipt: execution.receipt || null,
                        review: execution.review || null,
                        file_changes: execution.fileChanges || null,
                        delivery_summary: deliverySummary,
                    }) || { ...task, status: "in_progress", result: result.substring(0, 500) };
                    addTaskLog(taskId, "warning", `任务仍需继续：${execution.detail || "验收未完成"}`);
                    syncTaskBacklogStatus(waitingTask, "blocked", execution.detail || result.substring(0, 500));
                    await ctx.onTaskStatusChange?.(waitingTask, "waiting", result.substring(0, 500));
                    appendTaskGroupReport(waitingTask, "waiting", execution.detail || result.substring(0, 500));
                }
            }
        }
        catch (error) {
            console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
            const failedExecution = buildTaskExecutionResult("failed", `执行失败: ${error.message}`, { detail: String(error.message || "执行失败") });
            const failedTask = updateTask(taskId, {
                status: "failed",
                result: `执行失败: ${error.message}`,
                status_detail: String(error.message || "执行失败").slice(0, 500),
                delivery_summary: buildDeliverySummary(task, failedExecution, "failed"),
            }) || { ...task, status: "failed", result: `执行失败: ${error.message}` };
            addTaskLog(taskId, "error", `❌ 任务执行失败: ${error.message}`);
            syncTaskBacklogStatus(failedTask, "blocked", error.message);
            await ctx.onTaskStatusChange?.(failedTask, "failed", String(error.message || ""));
            appendTaskGroupReport(failedTask, "failed", error.message);
            await sendTaskFailureNotification(failedTask, error.message);
        }
        finally {
            runningTaskIds.delete(taskId);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    runningTasks.delete(targetKey);
    console.log(`[任务队列] [${targetKey}] 队列处理完成`);
}
function enqueueTask(taskId, ctx) {
    const tasks = (0, db_1.loadTasks)();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.log(`[任务队列] 任务 ${taskId} 不存在`);
        return { queued: false, message: "任务不存在" };
    }
    if (task.status === "done") {
        addTaskLog(taskId, "info", "任务已完成，跳过入队");
        return { queued: false, message: "任务已完成，跳过入队" };
    }
    if (isTaskPaused(task)) {
        addTaskLog(taskId, "info", "任务已暂停，跳过入队");
        return { queued: false, message: "任务已暂停，跳过入队" };
    }
    const readiness = getAgentExecutionReadiness();
    if (!readiness.ready) {
        const message = readiness.message || "Agent CLI 执行通道不可用，任务暂不入队";
        const fixActions = Array.isArray(readiness.fix_actions) ? readiness.fix_actions : [];
        const firstFixAction = fixActions[0] ? `；建议：${fixActions[0]}` : "";
        updateTask(taskId, {
            status: "pending",
            status_detail: message.slice(0, 500),
            last_queue_blocked_at: new Date().toISOString(),
            execution_readiness: readiness,
        });
        addTaskLog(taskId, "warning", `任务暂不入队：${message}${firstFixAction}`);
        return { queued: false, blocked: true, reason: "agent_process", message, readiness };
    }
    const targetKey = getTaskTargetKey(task);
    if (!taskQueues.has(targetKey)) {
        taskQueues.set(targetKey, []);
    }
    const queue = taskQueues.get(targetKey);
    if (queue.includes(taskId) || runningTaskIds.has(taskId)) {
        addTaskLog(taskId, "info", "任务已在队列中或正在执行，跳过重复入队");
        return { queued: false, message: "任务已在队列中或正在执行" };
    }
    const newPriority = PRIORITY_WEIGHT[task.priority] || 2;
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
        const queuedTask = tasks.find(t => t.id === queue[i]);
        if (!queuedTask)
            continue;
        const queuedPriority = PRIORITY_WEIGHT[queuedTask.priority] || 2;
        if (newPriority > queuedPriority) {
            insertIndex = i;
            break;
        }
    }
    queue.splice(insertIndex, 0, taskId);
    console.log(`[任务队列] 任务 ${taskId} (${task.priority}) 已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
    updateTask(taskId, { queued_at: new Date().toISOString() });
    addTaskLog(taskId, "info", `任务已加入队列 [${targetKey}]，位置 ${insertIndex + 1}/${queue.length}`);
    processTargetQueue(targetKey, ctx);
    return { queued: true, message: "任务已加入队列", targetKey, position: insertIndex + 1 };
}
function createAndQueueTask(task, ctx) {
    const newTask = createTask({ ...task, auto_execute: true });
    const queueResult = enqueueTask(newTask.id, ctx);
    return { task: newTask, queueResult };
}
function resumeTaskQueues(ctx) {
    const tasks = (0, db_1.loadTasks)();
    const resumable = tasks.filter(isRecoverableAutoTask);
    const results = [];
    for (const task of resumable) {
        if (task.status === "in_progress") {
            updateTask(task.id, {
                status: "pending",
                result: "服务启动时检测到未完成执行，已自动恢复排队",
            });
            addTaskLog(task.id, "warning", "服务启动时检测到任务处于进行中，已恢复为待执行并重新入队");
        }
        else {
            addTaskLog(task.id, "info", "服务启动恢复自动执行任务，重新加入队列");
        }
        results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
    }
    return {
        resumed: results.filter(item => item.queued).length,
        total: resumable.length,
        results,
        queue_status: getQueueStatus(),
    };
}
function getQueueStatus() {
    let totalQueued = 0;
    const targetStatus = {};
    for (const [targetKey, queue] of taskQueues.entries()) {
        totalQueued += queue.length;
        targetStatus[targetKey] = {
            queued: queue.length,
            running: runningTasks.has(targetKey)
        };
    }
    return {
        total_queued: totalQueued,
        running_targets: runningTasks.size,
        target_status: targetStatus,
        pending_tasks: (0, db_1.loadTasks)().filter(t => t.status === "pending").length,
        in_progress_tasks: (0, db_1.loadTasks)().filter(t => t.status === "in_progress").length,
        failed_tasks: (0, db_1.loadTasks)().filter(t => t.status === "failed").length,
        running_task_ids: Array.from(runningTaskIds)
    };
}
function getTaskTargetKeyFromTask(task) {
    if (task?.assign_type === "group" && task?.group_id)
        return `group:${task.group_id}`;
    return `project:${task?.target_project || "unknown"}`;
}
function isTaskQueuedInMemory(taskId) {
    for (const queue of taskQueues.values()) {
        if (queue.includes(taskId))
            return true;
    }
    return false;
}
function getTaskAgeMs(task, now = Date.now()) {
    const time = Date.parse(task?.updated_at || task?.started_at || task?.queued_at || task?.created_at || "");
    return Number.isFinite(time) ? Math.max(0, now - time) : 0;
}
function isWatchdogGapReworkCandidate(task, now = Date.now(), cooldownMs = TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, maxCount = TASK_WATCHDOG_GAP_REWORK_MAX) {
    if (!task?.auto_execute || task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id))
        return false;
    if (!hasDailyDevContinuationGaps(task))
        return false;
    if (Number(task.auto_gap_continue_count || 0) >= maxCount)
        return false;
    return getTaskAgeMs(task, now) >= cooldownMs;
}
function hasFreshSuccessfulAgentProbe(readiness) {
    return readiness?.probe?.success === true
        && Number(readiness?.probe?.age_ms || Infinity) < AGENT_PROBE_SUCCESS_FRESH_MS;
}
function getTaskWatchdogStatus(staleMs = TASK_WATCHDOG_STALE_MS, gapCooldownMs = TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, gapMaxCount = TASK_WATCHDOG_GAP_REWORK_MAX) {
    const now = Date.now();
    const tasks = (0, db_1.loadTasks)();
    const stalePending = [];
    const stalledInProgress = [];
    const runningLong = [];
    const runtimeFailed = [];
    const gapRework = [];
    for (const task of tasks) {
        if (!task?.auto_execute || task.status === "done" || isTaskPaused(task))
            continue;
        const ageMs = getTaskAgeMs(task, now);
        const base = {
            id: task.id,
            title: task.title,
            status: task.status,
            target_key: getTaskTargetKeyFromTask(task),
            age_ms: ageMs,
            updated_at: task.updated_at || null,
            started_at: task.started_at || null,
            queued_at: task.queued_at || null,
        };
        if (isRecoverableRuntimeFailure(task)) {
            runtimeFailed.push({
                ...base,
                reason: getTaskFailureText(task).slice(0, 500),
                retry_count: Number(task.retry_count || 0),
            });
        }
        else if (isWatchdogGapReworkCandidate(task, now, gapCooldownMs, gapMaxCount)) {
            const summary = task.delivery_summary || {};
            gapRework.push({
                ...base,
                reason: [
                    Number(summary.coordination_plan_count || 0) <= 0 ? "缺少主 Agent 协调计划证据" : "",
                    Number(summary.assignment_count || 0) <= 0 ? "缺少主 Agent 派发证据" : "",
                    Number(summary.worker_notification_count || 0) <= 0 ? "缺少 Worker 通知" : "",
                    ...(Array.isArray(summary.blockers) ? summary.blockers : []),
                    ...(Array.isArray(summary.needs) ? summary.needs : []),
                    ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item) => `${item?.agent || "Agent"} 缺少验证命令证据`) : []),
                    ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
                    ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
                ].filter(Boolean).join("；").slice(0, 500) || task.status_detail || "存在交付缺口",
                auto_gap_continue_count: Number(task.auto_gap_continue_count || 0),
            });
        }
        else if (task.status === "pending" && !isTaskQueuedInMemory(task.id) && ageMs >= staleMs) {
            stalePending.push(base);
        }
        else if (task.status === "in_progress" && !runningTaskIds.has(task.id) && ageMs >= staleMs) {
            stalledInProgress.push(base);
        }
        else if (task.status === "in_progress" && runningTaskIds.has(task.id) && ageMs >= staleMs) {
            runningLong.push(base);
        }
    }
    return {
        stale_ms: staleMs,
        checked_at: new Date().toISOString(),
        stale_pending: stalePending,
        stalled_in_progress: stalledInProgress,
        running_long: runningLong,
        runtime_failed: runtimeFailed,
        gap_rework: gapRework,
        queue_status: getQueueStatus(),
    };
}
function runTaskWatchdog(ctx, options = {}) {
    const staleMs = Number(options.staleMs || options.stale_ms || TASK_WATCHDOG_STALE_MS);
    const gapCooldownMs = Number(options.gapCooldownMs || options.gap_cooldown_ms || TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS);
    const gapMaxCount = Math.max(1, Math.min(20, Number(options.gapMaxCount || options.gap_max_count || TASK_WATCHDOG_GAP_REWORK_MAX)));
    const status = getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount);
    const recoverable = [...status.stale_pending, ...status.stalled_in_progress];
    const results = [];
    const gapResults = [];
    const executionReadiness = getAgentExecutionReadiness();
    const dailyDevExecutionReadiness = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, executionReadiness);
    const recentProbeOk = hasFreshSuccessfulAgentProbe(executionReadiness);
    const canAutoRetryRuntimeFailures = executionReadiness.ready && recentProbeOk;
    const canAutoContinueGaps = dailyDevExecutionReadiness.ready === true;
    let blockedRecovery = null;
    let runtimeRetry = null;
    for (const item of recoverable) {
        const tasks = (0, db_1.loadTasks)();
        const task = tasks.find(t => t.id === item.id);
        if (!task || task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id))
            continue;
        const patch = {
            status: "pending",
            status_detail: task.status === "in_progress"
                ? "任务看门狗检测到执行中断，已恢复排队"
                : "任务看门狗检测到待处理任务未入队，已恢复排队",
            watchdog_recovered_at: new Date().toISOString(),
            watchdog_recoveries: Number(task.watchdog_recoveries || 0) + 1,
        };
        if (task.status === "in_progress") {
            patch.result = "任务看门狗检测到执行中断，已恢复为待执行并重新入队";
        }
        updateTask(task.id, patch);
        addTaskLog(task.id, "warning", patch.status_detail);
        results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
    }
    if (options.recover_agent_blocked !== false && options.recoverAgentBlocked !== false && recentProbeOk) {
        blockedRecovery = recoverAgentExecutionBlockedTasks(ctx, "Agent CLI 探针通过后立即恢复被执行准入阻塞的任务");
    }
    if (options.continue_gaps !== false && options.continueGaps !== false && canAutoContinueGaps) {
        for (const item of status.gap_rework) {
            const task = (0, db_1.loadTasks)().find(t => t.id === item.id);
            if (!task || !isWatchdogGapReworkCandidate(task, Date.now(), gapCooldownMs, gapMaxCount))
                continue;
            const message = buildTaskGapContinuationDraft(task);
            const result = continueTaskWithMessage(task.id, message, ctx, {
                source: "watchdog_gap_rework",
                auto_execute: true,
                status_detail: "任务看门狗已按交付缺口生成返工说明，等待主 Agent 继续执行",
            });
            addTaskLog(task.id, result.success ? "info" : "warning", result.success
                ? "任务看门狗已按交付缺口自动续跑"
                : `任务看门狗续跑缺口失败：${result.error || "未知错误"}`);
            gapResults.push({ task_id: task.id, ...result, task: undefined });
        }
    }
    if (options.retry_runtime_failures !== false && canAutoRetryRuntimeFailures && status.runtime_failed.length > 0) {
        runtimeRetry = retryRuntimeFailedTasks(ctx, {
            reason: "执行通道恢复后看门狗自动重试",
            limit: status.runtime_failed.length,
        });
    }
    return {
        success: true,
        recovered: results.filter(item => item.queued).length + Number(blockedRecovery?.recovered || 0),
        total_recoverable: recoverable.length + Number(blockedRecovery?.total_blocked || 0),
        stale_recovered: results.filter(item => item.queued).length,
        stale_recoverable: recoverable.length,
        blocked_recovery: blockedRecovery,
        runtime_failed_total: status.runtime_failed.length,
        runtime_retried: runtimeRetry?.retried || 0,
        runtime_queued: runtimeRetry?.queued || 0,
        gap_rework_total: status.gap_rework.length,
        gap_continued: gapResults.filter(item => item.success).length,
        gap_queued: gapResults.filter(item => item.queued).length,
        gap_results: gapResults,
        gap_continue_skipped_reason: status.gap_rework.length > 0 && !canAutoContinueGaps ? dailyDevExecutionReadiness.message : "",
        runtime_retry: runtimeRetry,
        runtime_retry_skipped_reason: status.runtime_failed.length > 0 && !canAutoRetryRuntimeFailures
            ? (executionReadiness.ready ? "等待最近一次执行通道探针通过后再自动重试" : executionReadiness.message)
            : "",
        execution_readiness: executionReadiness,
        daily_dev_execution_readiness: dailyDevExecutionReadiness,
        results,
        status: getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount),
    };
}
function getAgentRecoveryWorkSummary() {
    const tasks = (0, db_1.loadTasks)();
    const blockedPending = tasks
        .filter(isAgentExecutionBlockedPendingTask)
        .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        target_key: getTaskTargetKeyFromTask(task),
        blocked_at: task.last_queue_blocked_at || null,
        status_detail: String(task.status_detail || "").slice(0, 300),
    }));
    const runtimeFailed = tasks
        .filter(isRecoverableRuntimeFailure)
        .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        target_key: getTaskTargetKeyFromTask(task),
        retry_count: Number(task.retry_count || 0),
        reason: getTaskFailureText(task).slice(0, 300),
    }));
    return {
        blocked_pending: blockedPending,
        runtime_failed: runtimeFailed,
        total: blockedPending.length + runtimeFailed.length,
    };
}
function recoverAgentExecutionBlockedTasks(ctx, reason = "执行通道恢复后自动重新入队") {
    const candidates = (0, db_1.loadTasks)().filter(isAgentExecutionBlockedPendingTask);
    const results = [];
    for (const task of candidates) {
        updateTask(task.id, {
            status: "pending",
            status_detail: reason,
            execution_readiness: null,
            recovered_after_agent_probe_at: new Date().toISOString(),
        });
        addTaskLog(task.id, "info", reason);
        results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
    }
    return {
        total_blocked: candidates.length,
        recovered: results.filter(item => item.queued).length,
        results,
    };
}
function runAgentRecoveryMonitorOnce(ctx, options = {}) {
    const work = getAgentRecoveryWorkSummary();
    if (work.total === 0) {
        return Promise.resolve({ success: true, skipped: true, reason: "没有等待执行通道恢复的自动任务", work });
    }
    if (agentRecoveryProbeInFlight) {
        return Promise.resolve({ success: true, skipped: true, reason: "执行通道探针正在运行", work });
    }
    agentRecoveryProbeInFlight = true;
    const timeoutMs = Number(options.timeout_ms || options.timeoutMs || AGENT_RECOVERY_PROBE_TIMEOUT_MS);
    return runAgentCliProbe({ ...options, timeout_ms: timeoutMs, source: "agent-recovery-monitor" }, ctx)
        .then((probe) => {
        if (!probe?.success) {
            return {
                success: false,
                skipped: false,
                probe,
                work,
                message: probe?.message || "执行通道探针未通过",
            };
        }
        const blockedRecovery = recoverAgentExecutionBlockedTasks(ctx);
        const runtimeRecovery = retryRuntimeFailedTasks(ctx, {
            reason: "执行通道自动探针通过后重试",
            limit: work.runtime_failed.length || 100,
        });
        return {
            success: true,
            skipped: false,
            probe,
            work,
            blocked_recovery: blockedRecovery,
            runtime_recovery: runtimeRecovery,
        };
    })
        .finally(() => {
        agentRecoveryProbeInFlight = false;
    });
}
function startAgentRecoveryMonitor(ctx) {
    if (agentRecoveryMonitorTimer)
        clearInterval(agentRecoveryMonitorTimer);
    const tick = () => {
        runAgentRecoveryMonitorOnce(ctx)
            .then((result) => {
            if (result?.skipped)
                return;
            if (result?.success) {
                const recovered = Number(result.blocked_recovery?.recovered || 0);
                const retried = Number(result.runtime_recovery?.queued || 0);
                console.log(`[执行通道恢复监控] 探针通过，自动恢复 ${recovered} 个阻塞任务，重试 ${retried} 个执行失败任务`);
            }
            else {
                console.log(`[执行通道恢复监控] 探针未通过：${result?.message || "未知原因"}`);
            }
        })
            .catch((e) => console.error("[执行通道恢复监控]", e.message));
    };
    agentRecoveryMonitorTimer = setInterval(tick, AGENT_RECOVERY_PROBE_INTERVAL_MS);
    setTimeout(tick, 10 * 1000);
    console.log("[执行通道恢复监控] 已启动");
}
function stopAgentRecoveryMonitor() {
    if (agentRecoveryMonitorTimer)
        clearInterval(agentRecoveryMonitorTimer);
    agentRecoveryMonitorTimer = null;
}
function startTaskWatchdog(ctx) {
    if (taskWatchdogTimer)
        clearInterval(taskWatchdogTimer);
    const tick = () => {
        try {
            const result = runTaskWatchdog(ctx);
            if (result.total_recoverable > 0) {
                console.log(`[任务看门狗] 恢复 ${result.recovered}/${result.total_recoverable} 个自动任务`);
            }
        }
        catch (e) {
            console.error("[任务看门狗]", e.message);
        }
    };
    taskWatchdogTimer = setInterval(tick, TASK_WATCHDOG_INTERVAL_MS);
    console.log("[任务看门狗] 已启动");
}
function stopTaskWatchdog() {
    if (taskWatchdogTimer)
        clearInterval(taskWatchdogTimer);
    taskWatchdogTimer = null;
}
function createDiagnosticCheck(id, label, status, message, detail = undefined) {
    return { id, label, status, message, ...(detail !== undefined ? { detail } : {}) };
}
function getWorkDirState(workDir) {
    const resolved = path.resolve(String(workDir || ""));
    if (!resolved)
        return { exists: false, writable: false, path: "" };
    try {
        const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
        if (!stat?.isDirectory())
            return { exists: false, writable: false, path: resolved };
        try {
            fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
            return { exists: true, writable: true, path: resolved };
        }
        catch {
            return { exists: true, writable: false, path: resolved };
        }
    }
    catch {
        return { exists: false, writable: false, path: resolved };
    }
}
function getChildProcessCapability() {
    try {
        const result = (0, child_process_1.spawnSync)(process.execPath, ["--version"], {
            encoding: "utf-8",
            timeout: 5000,
            windowsHide: true,
        });
        return {
            ok: !result.error && result.status === 0,
            status: result.status,
            stdout: String(result.stdout || "").trim(),
            stderr: String(result.stderr || "").trim(),
            error: result.error ? `${result.error.code || ""} ${result.error.message || result.error}`.trim() : "",
        };
    }
    catch (e) {
        return { ok: false, status: null, stdout: "", stderr: "", error: e.message || String(e) };
    }
}
function readRunnerJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
}
function readAgentProbeStatus() {
    try {
        if (!fs.existsSync(AGENT_PROBE_STATUS_FILE))
            return null;
        const data = readRunnerJson(AGENT_PROBE_STATUS_FILE);
        const checkedAt = data?.checked_at ? Date.parse(data.checked_at) : 0;
        return {
            ...data,
            age_ms: checkedAt ? Date.now() - checkedAt : null,
        };
    }
    catch {
        return null;
    }
}
function getAgentProbeHealth(probe) {
    if (!probe) {
        return {
            status: "missing",
            successFresh: false,
            failureRecent: false,
            message: "尚未运行 Agent CLI 探针",
        };
    }
    const age = Number(probe.age_ms ?? Infinity);
    if (probe.success === true && age < AGENT_PROBE_SUCCESS_FRESH_MS) {
        return {
            status: "ok",
            successFresh: true,
            failureRecent: false,
            message: "Agent CLI 探针最近通过",
        };
    }
    if (probe.success === false && age < AGENT_PROBE_FAILURE_BLOCK_MS) {
        return {
            status: "failed",
            successFresh: false,
            failureRecent: true,
            message: probe.message || probe.error || "Agent CLI 探针最近失败",
        };
    }
    return {
        status: probe.success === true ? "stale_ok" : "stale_failed",
        successFresh: false,
        failureRecent: false,
        message: probe.success === true ? "Agent CLI 探针已过期，建议复检" : "Agent CLI 失败探针已过期，建议复检",
    };
}
function writeAgentProbeStatus(data) {
    try {
        if (!fs.existsSync(AGENT_RUNNER_DIR))
            fs.mkdirSync(AGENT_RUNNER_DIR, { recursive: true });
        const tmp = `${AGENT_PROBE_STATUS_FILE}.${process.pid}.tmp`;
        const target = data?.target || null;
        const fixActions = Array.isArray(data?.fix_actions) && data.fix_actions.length
            ? data.fix_actions
            : (data?.readiness?.fix_actions || buildAgentExecutionFixActions({
                error: data?.message || data?.error || data?.output || "",
                agentType: target?.agent_type || data?.readiness?.probe?.target?.agent_type || "",
                probe: data,
            }));
        fs.writeFileSync(tmp, JSON.stringify({
            success: !!data?.success,
            blocked: !!data?.blocked,
            message: String(data?.message || data?.error || "").slice(0, 1000),
            error: String(data?.error || "").slice(0, 1000),
            fix_actions: uniqueStrings(fixActions).slice(0, 6),
            target: target ? {
                group_id: target.group_id || "",
                group_name: target.group_name || "",
                project: target.project || "",
                agent_type: target.agent_type || "",
                work_dir: target.work_dir || "",
            } : null,
            execution_path: data?.execution_path || data?.readiness?.mode || "",
            expected_marker: data?.expected_marker || "CCM_AGENT_PROBE_OK",
            output_preview: String(data?.output || "").slice(0, 1000),
            duration_ms: Number(data?.duration_ms || 0),
            readiness_mode: data?.readiness?.mode || "",
            checked_at: new Date().toISOString(),
        }, null, 2), "utf-8");
        fs.renameSync(tmp, AGENT_PROBE_STATUS_FILE);
    }
    catch { }
}
function buildRunnerFixHint(error, agentType) {
    const command = (0, agent_runtime_1.getAgentCommandLabel)(agentType);
    const text = String(error || "");
    if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
        return `请先在同一台机器上确认 ${command} 可以连接模型 API；当前 Runner 能启动命令，但底层 CLI/API 连接被拒绝`;
    }
    if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
        return `请安装或加入 PATH：${command}`;
    }
    if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
        return `请检查 ${command} 的登录状态或 API Key 权限`;
    }
    return `请在子 Agent 工作目录中手动运行 ${command} 验证 CLI 是否可用`;
}
function buildAgentExecutionFixActions(input = {}) {
    const text = [input.error, input.probe?.message, input.probe?.error, input.externalRunner?.last_result?.error, input.externalRunner?.last_result?.output]
        .filter(Boolean)
        .join("\n");
    const agentType = input.agentType || input.externalRunner?.last_result?.agentType || input.probe?.target?.agent_type || "claudecode";
    const command = (0, agent_runtime_1.getAgentCommandLabel)(agentType);
    const actions = [];
    if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
        actions.push(`在同一台机器的普通终端里运行 ${command}，确认它能连接模型 API`);
        actions.push("检查 Claude/Codex 等 CLI 的登录状态、代理环境变量、网络出口和模型 API Base URL");
        actions.push("如果使用本地代理或转发服务，先确认服务端口正在监听且没有被防火墙拦截");
    }
    else if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
        actions.push(`安装对应 CLI，或把 ${command} 所在目录加入 PATH`);
    }
    else if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
        actions.push(`重新登录或刷新 ${command} 的 API Key/Token 权限`);
    }
    else if (/spawn\s+EPERM|spawnSync .* EPERM/i.test(text) || input.childProcess?.ok === false) {
        actions.push("当前 Node 进程不能直接启动子 Agent CLI；在独立 PowerShell 里运行 npm run agent-runner:ps");
        actions.push("确认外部 Agent Runner 在线后，再点击“复检执行通道”或“立即恢复自动任务”");
    }
    else {
        actions.push(`在子 Agent 工作目录中手动运行 ${command}，确认 CLI 能正常返回`);
    }
    actions.push("修复后在设置页点击“复检执行通道”或“立即恢复自动任务”，系统会自动重试等待中的开发任务");
    return uniqueStrings(actions).slice(0, 6);
}
function getAgentProbeOutputFailure(output) {
    const text = String(output || "").trim();
    if (!text) {
        return {
            message: "Agent CLI 已返回空输出，未包含预期探针标记",
            error: "empty_output",
        };
    }
    if (checkTaskFailure(text) || /Agent Runner 错误|Agent 错误|响应超时|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
        return {
            message: `Agent CLI 探针失败：${compactMemoryText(text, 500)}`,
            error: compactMemoryText(text, 1000),
        };
    }
    return {
        message: "Agent CLI 已返回，但未包含预期探针标记",
        error: compactMemoryText(text, 1000),
    };
}
function getAgentExecutionReadiness() {
    const childProcess = getChildProcessCapability();
    const probe = readAgentProbeStatus();
    const probeHealth = getAgentProbeHealth(probe);
    if (probeHealth.failureRecent) {
        const externalRunner = getExternalAgentRunnerStatus();
        const message = `Agent CLI 探针最近失败：${probeHealth.message}`;
        return {
            ready: false,
            mode: "agent-cli-probe-failed",
            message,
            fix_actions: buildAgentExecutionFixActions({
                error: message,
                childProcess,
                externalRunner,
                probe,
            }),
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    if (childProcess.ok) {
        return {
            ready: true,
            mode: "node-child-process",
            message: probeHealth.successFresh
                ? `Node 可启动子进程，且 Agent CLI 探针最近通过：${childProcess.stdout || "ok"}`
                : `Node 可启动子进程，Agent CLI 调用底座可用但模型 CLI 连通性未复检：${childProcess.stdout || "ok"}`,
            fix_actions: [],
            childProcess,
            probe,
            probeHealth,
        };
    }
    const externalRunner = getExternalAgentRunnerStatus();
    const lastResult = externalRunner.last_result || null;
    const lastFailure = lastResult?.success === false;
    const recentFailure = lastFailure && Number(lastResult?.age_ms || 0) < 15 * 60 * 1000;
    if (externalRunner.active && !recentFailure) {
        return {
            ready: true,
            mode: "external-runner",
            message: "Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行",
            fix_actions: [],
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    const message = lastFailure
        ? `外部 Agent Runner 最近执行 ${lastResult.command || "Agent CLI"} 失败：${lastResult.error || lastResult.output || "未知错误"}；${lastResult.hint || "请检查子 Agent CLI"}`
        : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcess.error || childProcess.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`;
    return {
        ready: false,
        mode: externalRunner.active ? "external-runner-blocked" : "blocked",
        message,
        fix_actions: buildAgentExecutionFixActions({
            error: message,
            childProcess,
            externalRunner,
            probe,
        }),
        childProcess,
        externalRunner,
        probe,
        probeHealth,
    };
}
function enforceAgentProbeExecutionReadiness(capability = {}) {
    const childProcess = capability.childProcess || { ok: false };
    const externalRunner = capability.externalRunner || { active: false };
    const probe = capability.probe || null;
    const probeHealth = capability.probeHealth || getAgentProbeHealth(probe);
    if (childProcess.ok) {
        return {
            ready: true,
            mode: "node-child-process-probe",
            message: `Node 可启动子进程，可重新运行 Agent CLI 探针：${childProcess.stdout || "ok"}`,
            fix_actions: [],
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    if (externalRunner.active) {
        return {
            ready: true,
            mode: "external-runner-probe",
            message: "Node 直接启动子进程受限，但外部 Agent Runner 在线，可重新运行 Agent CLI 探针",
            fix_actions: [],
            childProcess,
            externalRunner,
            probe,
            probeHealth,
        };
    }
    const message = `无法运行 Agent CLI 探针：Node 无法启动子进程，且外部 Agent Runner 未在线；${childProcess.error || childProcess.stderr || "请启用执行通道"}`;
    return {
        ready: false,
        mode: "probe-runner-blocked",
        message,
        fix_actions: buildAgentExecutionFixActions({
            error: message,
            childProcess,
            externalRunner,
            probe,
        }),
        childProcess,
        externalRunner,
        probe,
        probeHealth,
    };
}
function getAgentProbeExecutionReadiness() {
    return enforceAgentProbeExecutionReadiness({
        childProcess: getChildProcessCapability(),
        externalRunner: getExternalAgentRunnerStatus(),
        probe: readAgentProbeStatus(),
    });
}
function taskRequiresFreshAgentProbe(task) {
    return task?.workflow_type === "daily_dev";
}
function enforceTaskAgentProbeReadiness(task, readiness) {
    if (!taskRequiresFreshAgentProbe(task) || !readiness.ready)
        return readiness;
    const probeHealth = readiness.probeHealth || getAgentProbeHealth(readiness.probe);
    if (probeHealth?.successFresh)
        return readiness;
    const message = `daily_dev 任务需要先通过 Agent CLI 真实探针：${probeHealth?.message || "尚未复检模型 CLI/API 连通性"}`;
    return {
        ...readiness,
        ready: false,
        mode: "agent-cli-probe-required",
        message,
        fix_actions: uniqueStrings([
            "在设置页点击“复检执行通道”，让系统实际调用目标子 Agent CLI 并确认模型 API 可用",
            ...(Array.isArray(readiness.fix_actions) ? readiness.fix_actions : []),
            "探针通过后再创建真实试运行任务或恢复 daily_dev 队列",
        ]).slice(0, 6),
        probeHealth,
    };
}
function getTaskAgentExecutionReadiness(task) {
    return enforceTaskAgentProbeReadiness(task, getAgentExecutionReadiness());
}
function getExternalAgentRunnerStatus() {
    const runnerDir = path.join(utils_1.CCM_DIR, "agent-runner");
    const heartbeatFile = path.join(runnerDir, "heartbeat.json");
    const requestsDir = path.join(runnerDir, "requests");
    const resultsDir = path.join(runnerDir, "results");
    let heartbeat = null;
    try {
        if (fs.existsSync(heartbeatFile))
            heartbeat = readRunnerJson(heartbeatFile);
    }
    catch { }
    const updatedAt = heartbeat?.updated_at ? Date.parse(heartbeat.updated_at) : 0;
    const ageMs = updatedAt ? Date.now() - updatedAt : null;
    const pid = heartbeat?.pid ? Number(heartbeat.pid) : 0;
    let processAlive = false;
    if (pid > 0) {
        try {
            process.kill(pid, 0);
            processAlive = true;
        }
        catch {
            processAlive = false;
        }
    }
    const active = !!heartbeat && processAlive && ageMs !== null && ageMs < 15000 && heartbeat.status !== "error";
    const listJsonFiles = (dir) => {
        try {
            return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith(".json")) : [];
        }
        catch {
            return [];
        }
    };
    const requestFiles = listJsonFiles(requestsDir);
    const resultFiles = listJsonFiles(resultsDir);
    const resultIds = new Set(resultFiles.map(file => file.replace(/\.json$/, "")));
    const pendingRequests = requestFiles.filter(file => !resultIds.has(file.replace(/\.json$/, ""))).length;
    let lastResult = null;
    try {
        if (fs.existsSync(resultsDir)) {
            const latest = resultFiles
                .map(file => {
                const full = path.join(resultsDir, file);
                const stat = fs.statSync(full);
                return { file, full, mtimeMs: stat.mtimeMs };
            })
                .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
            if (latest) {
                const data = readRunnerJson(latest.full);
                lastResult = {
                    id: data?.id || latest.file.replace(/\.json$/, ""),
                    success: data?.success !== false,
                    error: String(data?.error || "").slice(0, 500),
                    output: String(data?.output || "").slice(0, 500),
                    agentType: data?.agentType || "",
                    command: data?.command || (0, agent_runtime_1.getAgentCommandLabel)(data?.agentType || ""),
                    exitCode: data?.exitCode ?? null,
                    runner: data?.runner || "",
                    completed_at: data?.completed_at || new Date(latest.mtimeMs).toISOString(),
                    age_ms: Date.now() - latest.mtimeMs,
                };
                lastResult.hint = buildRunnerFixHint(lastResult.error || lastResult.output, lastResult.agentType || "");
            }
        }
    }
    catch { }
    return {
        active,
        status: heartbeat?.status || "missing",
        detail: heartbeat?.detail || "",
        pid: pid || null,
        process_alive: processAlive,
        updated_at: heartbeat?.updated_at || "",
        age_ms: ageMs,
        pending_requests: pendingRequests,
        requests: requestFiles.length,
        results: resultFiles.length,
        last_result: lastResult,
    };
}
function buildDailyDevAgentDiagnostics() {
    const checks = [];
    const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const publicConfig = (0, group_orchestrator_1.publicOrchestratorConfig)(config);
    const groups = loadGroups();
    const configs = (0, db_1.getConfigs)();
    const tasks = (0, db_1.loadTasks)();
    const cronJobs = (0, db_1.loadCronJobs)();
    const enabledCronJobs = cronJobs.filter((job) => job?.enabled !== false);
    const autoTasks = tasks.filter((task) => task?.auto_execute);
    const devGroups = groups.map((group) => {
        const normalized = (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
        const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(normalized);
        const routableMembers = (0, group_orchestrator_1.getRoutableMembers)(normalized);
        const backlogFiles = Array.isArray(normalized.shared_files)
            ? normalized.shared_files.filter((file) => isDailyDevBacklogFile(file))
            : [];
        const backlogCounts = backlogFiles.reduce((acc, file) => {
            const status = readDailyDevBacklogStatus(file) || "unknown";
            acc[status] = Number(acc[status] || 0) + 1;
            return acc;
        }, {});
        const members = routableMembers.map((member) => {
            const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(member.project, normalized, configs);
            const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
            const verification = getProjectVerificationHintDetail(member.project, workDirState?.path || runtime?.workDir || "");
            return {
                project: member.project,
                role: member.role || "member",
                configured: !!runtime,
                agentType: runtime?.agentType || member.agent || "",
                workDir: runtime?.workDir || "",
                workDirExists: !!workDirState?.exists,
                workDirWritable: !!workDirState?.writable,
                verification,
            };
        });
        const readyMembers = members.filter((member) => member.configured && member.workDirExists && member.workDirWritable);
        return {
            id: normalized.id,
            name: normalized.name || normalized.id,
            orchestratorEnabled: normalized.orchestrator?.enabled !== false,
            coordinator: coordinator.project,
            sharedFiles: Array.isArray(normalized.shared_files) ? normalized.shared_files.length : 0,
            backlogFiles: backlogFiles.length,
            readyBacklogs: Number(backlogCounts.ready || 0),
            backlogCounts,
            memberCount: members.length,
            readyMemberCount: readyMembers.length,
            members,
        };
    });
    const groupsWithReadyMembers = devGroups.filter((group) => group.orchestratorEnabled && group.readyMemberCount > 0);
    const dailyDevCronJobs = enabledCronJobs.filter((job) => job?.workflow_type === "daily_dev" || job?.workflowType === "daily_dev" || job?.daily_dev || job?.dailyDev);
    const llmConfigured = !!(config.enabled && String(config.apiUrl || "").trim() && String(config.apiKey || "").trim() && String(config.model || "").trim());
    checks.push(createDiagnosticCheck("orchestrator-config", "主 Agent 大模型", llmConfigured ? "ok" : (config.fallbackToRules ? "warn" : "fail"), llmConfigured
        ? `已配置 ${publicConfig.model}，可由 LLM 主 Agent 理解业务描述并拆分任务`
        : (config.fallbackToRules ? "LLM 配置不完整，会降级到规则主 Agent；可工作但理解复杂业务会变弱" : "LLM 配置不完整，主 Agent 不会自动分派子 Agent"), { enabled: publicConfig.enabled, apiUrl: publicConfig.apiUrl, model: publicConfig.model, hasKey: publicConfig.hasKey, fallbackToRules: publicConfig.fallbackToRules }));
    const coordinatorProtocol = (0, group_orchestrator_1.runCoordinatorProtocolSelfTest)();
    checks.push(createDiagnosticCheck("coordinator-protocol", "主 Agent 协调协议", coordinatorProtocol.pass ? "ok" : "fail", coordinatorProtocol.pass
        ? `规则主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 派发 ${coordinatorProtocol.assignmentCount} 个自包含子 Agent 工作单；策略：${coordinatorProtocol.coordinationStrategy || coordinatorProtocol.coordinationPlan?.strategy || "未声明"}`
        : "规则主 Agent 未能稳定生成计划、派发和自包含子 Agent 工作单", coordinatorProtocol));
    const reworkProtocol = getCoordinatorReworkProtocolSelfTest();
    checks.push(createDiagnosticCheck("coordinator-rework-protocol", "主 Agent 返工协议", reworkProtocol.pass ? "ok" : "fail", reworkProtocol.pass
        ? "主 Agent 验收发现缺口时，会生成自包含返工工作单并要求子 Agent 再次回执"
        : "主 Agent 返工工作单缺少轮次、原始需求、初始计划、验证或回执要求", reworkProtocol));
    const collaborationProtocol = runCollaborationProtocolSelfTest();
    const workerProtocolPass = !!(collaborationProtocol.pass
        && Object.values(collaborationProtocol.taskNotificationChecks || {}).every(Boolean)
        && Object.values(collaborationProtocol.scratchpadChecks || {}).every(Boolean));
    checks.push(createDiagnosticCheck("worker-notification-scratchpad", "Worker 通知与协作 scratchpad", workerProtocolPass ? "ok" : "fail", workerProtocolPass
        ? "子 Agent 输出会封装为 task-notification，缺回执可触发返工，并写入协作 scratchpad 供后续 Worker 复用"
        : "Worker 通知、缺回执门禁或协作 scratchpad 自测未通过", {
        taskNotificationChecks: collaborationProtocol.taskNotificationChecks || {},
        scratchpadChecks: collaborationProtocol.scratchpadChecks || {},
        structuredAssignmentChecks: collaborationProtocol.structuredAssignmentChecks || {},
    }));
    checks.push(createDiagnosticCheck("project-configs", "项目 Agent 配置", configs.length > 0 ? "ok" : "fail", configs.length > 0 ? `已发现 ${configs.length} 个项目配置` : "未发现项目配置，子 Agent 没有可执行仓库", configs.map((configItem) => ({ name: configItem.name, file: configItem.file }))));
    checks.push(createDiagnosticCheck("groups", "开发群聊", groupsWithReadyMembers.length > 0 ? "ok" : "fail", groupsWithReadyMembers.length > 0
        ? `已有 ${groupsWithReadyMembers.length} 个群聊可由主 Agent 派发给子 Agent`
        : "没有可用的开发群聊；需要创建群聊并加入至少一个已配置项目 Agent", devGroups));
    const invalidMembers = devGroups.flatMap((group) => group.members
        .filter((member) => !member.configured || !member.workDirExists || !member.workDirWritable)
        .map((member) => ({ group: group.name, ...member })));
    checks.push(createDiagnosticCheck("member-runtime", "子 Agent 可执行目录", invalidMembers.length === 0 && groupsWithReadyMembers.length > 0 ? "ok" : (groupsWithReadyMembers.length > 0 ? "warn" : "fail"), invalidMembers.length === 0 && groupsWithReadyMembers.length > 0
        ? "所有群聊子 Agent 都能解析到可读写工作目录"
        : (groupsWithReadyMembers.length > 0 ? `${invalidMembers.length} 个子 Agent 的项目配置或工作目录需要检查` : "还没有可验证的子 Agent 工作目录"), invalidMembers));
    const readyMembersForVerification = devGroups.flatMap((group) => group.members
        .filter((member) => member.configured && member.workDirExists && member.workDirWritable)
        .map((member) => ({ group: group.name, ...member })));
    const missingVerificationMembers = readyMembersForVerification.filter((member) => member.verification?.source === "missing");
    const configuredVerificationMembers = readyMembersForVerification.filter((member) => member.verification?.source === "configured");
    const inferredVerificationMembers = readyMembersForVerification.filter((member) => member.verification?.source === "inferred");
    checks.push(createDiagnosticCheck("project-verification", "项目验证命令", missingVerificationMembers.length === 0 && readyMembersForVerification.length > 0 ? "ok" : (readyMembersForVerification.length > 0 ? "warn" : "fail"), readyMembersForVerification.length === 0
        ? "还没有可检查验证命令的可执行子 Agent"
        : missingVerificationMembers.length === 0
            ? `可执行子 Agent 均有验证命令：${configuredVerificationMembers.length} 个手动配置，${inferredVerificationMembers.length} 个自动推断`
            : `${missingVerificationMembers.length} 个可执行子 Agent 缺少验证命令；可在项目管理 -> 项目工具配置中填写`, {
        total: readyMembersForVerification.length,
        configured: configuredVerificationMembers.length,
        inferred: inferredVerificationMembers.length,
        missing: missingVerificationMembers.length,
        members: readyMembersForVerification.map((member) => ({
            group: member.group,
            project: member.project,
            source: member.verification?.source || "missing",
            commands: member.verification?.commands || [],
        })),
    }));
    const childProcessCapability = getChildProcessCapability();
    const externalRunnerStatus = getExternalAgentRunnerStatus();
    const probeStatus = readAgentProbeStatus();
    const probeHealth = getAgentProbeHealth(probeStatus);
    const executionReadiness = getAgentExecutionReadiness();
    const runnerLastFailure = externalRunnerStatus.last_result?.success === false;
    const runnerRecentFailure = runnerLastFailure
        && Number(externalRunnerStatus.last_result?.age_ms || 0) < 15 * 60 * 1000;
    const runnerFailureBlocks = runnerLastFailure && (!externalRunnerStatus.active || runnerRecentFailure);
    const agentProcessReady = executionReadiness.ready === true;
    const dailyDevExecutionReadiness = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, executionReadiness);
    const dailyDevExecutionReady = dailyDevExecutionReadiness.ready === true;
    const executionFixActions = agentProcessReady ? [] : (executionReadiness.fix_actions || buildAgentExecutionFixActions({
        error: externalRunnerStatus.last_result?.error || externalRunnerStatus.last_result?.output || probeStatus?.message || childProcessCapability.error || childProcessCapability.stderr || "",
        childProcess: childProcessCapability,
        externalRunner: externalRunnerStatus,
        probe: probeStatus,
    }));
    checks.push(createDiagnosticCheck("agent-process", "Agent CLI 进程能力", agentProcessReady ? "ok" : "fail", executionReadiness.mode === "agent-cli-probe-failed"
        ? executionReadiness.message
        : childProcessCapability.ok
            ? executionReadiness.message
            : (runnerFailureBlocks
                ? `外部 Agent Runner 最近执行 ${externalRunnerStatus.last_result?.command || "Agent CLI"} 失败：${externalRunnerStatus.last_result?.error || "未知错误"}；${externalRunnerStatus.last_result?.hint || "请检查子 Agent CLI"}`
                : (externalRunnerStatus.active
                    ? `Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行`
                    : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcessCapability.error || childProcessCapability.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`)), { childProcess: childProcessCapability, externalRunner: externalRunnerStatus, probe: probeStatus, probeHealth, readiness: executionReadiness, fix_actions: executionFixActions, runtimes: (0, agent_runtime_1.getPublicAgentRuntimes)() }));
    checks.push(createDiagnosticCheck("agent-cli-probe", "Agent CLI 连通探针", probeHealth.failureRecent ? "fail" : (probeHealth.successFresh ? "ok" : "warn"), probeHealth.message, {
        probe: probeStatus,
        probeHealth,
        fresh_success_ms: AGENT_PROBE_SUCCESS_FRESH_MS,
        failure_block_ms: AGENT_PROBE_FAILURE_BLOCK_MS,
        fix_actions: probeHealth.failureRecent ? executionFixActions : [],
    }));
    checks.push(createDiagnosticCheck("daily-dev-execution-readiness", "daily_dev 执行准入", dailyDevExecutionReady ? "ok" : "fail", dailyDevExecutionReady
        ? "daily_dev 任务已具备真实执行准入：Agent CLI 探针近期成功"
        : dailyDevExecutionReadiness.message, {
        readiness: dailyDevExecutionReadiness,
        required: ["fresh_agent_cli_probe"],
        fix_actions: dailyDevExecutionReadiness.fix_actions || [],
    }));
    const queueStatus = getQueueStatus();
    checks.push(createDiagnosticCheck("task-queue", "任务队列", "ok", `队列接口可用：${queueStatus.total_queued} 个排队，${queueStatus.running_targets} 个目标执行中`, queueStatus));
    const watchdogStatus = getTaskWatchdogStatus();
    const watchdogRecoverable = watchdogStatus.stale_pending.length + watchdogStatus.stalled_in_progress.length;
    const runtimeRecoverable = watchdogStatus.runtime_failed.length;
    const gapReworkRecoverable = watchdogStatus.gap_rework.length;
    checks.push(createDiagnosticCheck("task-watchdog", "任务看门狗", watchdogRecoverable > 0 || runtimeRecoverable > 0 || gapReworkRecoverable > 0 ? "warn" : "ok", watchdogRecoverable > 0 || runtimeRecoverable > 0 || gapReworkRecoverable > 0
        ? `发现 ${watchdogRecoverable} 个卡住自动任务、${runtimeRecoverable} 个执行通道失败任务、${gapReworkRecoverable} 个可按缺口续跑任务；看门狗会自动恢复或返工`
        : "自动任务看门狗可用，当前没有检测到卡住的可恢复任务", watchdogStatus));
    const recoveryWork = getAgentRecoveryWorkSummary();
    checks.push(createDiagnosticCheck("agent-recovery-monitor", "执行通道恢复监控", recoveryWork.total > 0 ? "warn" : "ok", recoveryWork.total > 0
        ? `恢复监控已${agentRecoveryMonitorTimer ? "启动" : "停止"}：发现 ${recoveryWork.blocked_pending.length} 个等待执行通道的任务、${recoveryWork.runtime_failed.length} 个可重试失败任务`
        : `恢复监控已${agentRecoveryMonitorTimer ? "启动" : "停止"}，当前没有等待执行通道恢复的自动任务`, {
        active: !!agentRecoveryMonitorTimer,
        probe_in_flight: agentRecoveryProbeInFlight,
        interval_ms: AGENT_RECOVERY_PROBE_INTERVAL_MS,
        work: recoveryWork,
    }));
    checks.push(createDiagnosticCheck("cron-dispatch", "定时派发", enabledCronJobs.length > 0 ? "ok" : "warn", enabledCronJobs.length > 0
        ? `已启用 ${enabledCronJobs.length} 个定时任务，可自动创建开发任务`
        : "暂无启用中的定时任务；需要自动接活时可在定时任务页创建", { total: cronJobs.length, enabled: enabledCronJobs.length }));
    const cronDailyDevProtocol = runCronDailyDevProtocolSelfTestSafe();
    checks.push(createDiagnosticCheck("cron-daily-dev-protocol", "定时业务开发协议", cronDailyDevProtocol.pass ? "ok" : "fail", cronDailyDevProtocol.pass
        ? "daily_dev 定时任务会创建群聊主 Agent 任务，并把定时提示词写入任务级业务/接口文档"
        : "daily_dev 定时任务未能稳定生成主 Agent 闭环任务或缺少任务级文档", cronDailyDevProtocol));
    checks.push(createDiagnosticCheck("receipt-gate", "完成回执验收", "ok", "子 Agent 输出必须包含 CCM_AGENT_RECEIPT，队列会按结构化回执和主 Agent 复盘判定完成", { autoTaskCount: autoTasks.length }));
    const dailyDevGateSelfTest = getDailyDevCompletionGateSelfTest();
    checks.push(createDiagnosticCheck("daily-dev-completion-gate", "业务开发完成门禁", dailyDevGateSelfTest.pass ? "ok" : "fail", dailyDevGateSelfTest.pass
        ? "daily_dev 任务必须具备主 Agent 协调计划、派发证据、Worker 通知、子 Agent 回执、主 Agent 最终复盘、实际代码变更证据和已执行验证记录，不能把建议性回复误判为完成"
        : "daily_dev 完成门禁自检失败，需要检查任务验收逻辑", { requiredEvidence: ["coordinator_plan", "assignment_evidence", "worker_notification", "child_agent_receipt", "coordinator_final_review", "actual_file_changes", "executed_verification"], selfTest: dailyDevGateSelfTest }));
    const rehearsal = buildDailyDevWorkflowRehearsal();
    checks.push(createDiagnosticCheck("daily-dev-rehearsal", "闭环演练", rehearsal.pass ? "ok" : "fail", rehearsal.pass
        ? "日常开发闭环演练通过：任务模板、子 Agent 回执、主 Agent 复盘、实际变更门禁、验证门禁和交付摘要均可闭合"
        : "日常开发闭环演练未通过，请先检查开发群聊、子 Agent 工作目录或完成门禁", {
        group: rehearsal.group,
        steps: rehearsal.steps,
        taskDocumentContext: rehearsal.task_document_context,
        noChangeResult: rehearsal.no_change_result,
        doneResult: rehearsal.done_result,
        propagatedAssignmentSummary: rehearsal.propagated_assignment_summary,
        workerNotification: rehearsal.worker_notification,
        scratchpadContext: rehearsal.scratchpad_context,
        reworkProtocol: rehearsal.rework_protocol,
        deliverySummary: rehearsal.delivery_summary,
    }));
    const smokeStatus = getDailyDevSmokeStatus();
    checks.push(createDiagnosticCheck("daily-dev-smoke-status", "真实试运行", smokeStatus.pass ? "ok" : (smokeStatus.status === "blocked" || smokeStatus.status === "failed" ? "warn" : "warn"), smokeStatus.message, smokeStatus));
    checks.push(createDiagnosticCheck("shared-docs", "业务文档入口", devGroups.some((group) => group.readyBacklogs > 0 || group.sharedFiles > 0) ? "ok" : "warn", devGroups.some((group) => group.readyBacklogs > 0)
        ? "已有 ready 状态的业务需求池文件，定时 daily_dev 可自动认领并派发"
        : devGroups.some((group) => group.sharedFiles > 0)
            ? "已有群聊共享文件，主 Agent 拆分任务时会带入文档上下文；可通过业务开发任务入口沉淀 ready 需求池"
            : "尚未上传群聊共享文件；也可以先把业务文档直接写进任务描述", devGroups.map((group) => ({
        id: group.id,
        name: group.name,
        sharedFiles: group.sharedFiles,
        backlogFiles: group.backlogFiles,
        readyBacklogs: group.readyBacklogs,
        backlogCounts: group.backlogCounts,
    }))));
    const failCount = checks.filter(check => check.status === "fail").length;
    const warnCount = checks.filter(check => check.status === "warn").length;
    const readiness = failCount > 0 ? "blocked" : (warnCount > 0 ? "partial" : "ready");
    const totalReadyBacklogs = devGroups.reduce((sum, group) => sum + Number(group.readyBacklogs || 0), 0);
    const totalSharedFiles = devGroups.reduce((sum, group) => sum + Number(group.sharedFiles || 0), 0);
    const executableGroups = groupsWithReadyMembers.length;
    const continuationGapTasks = tasks.filter((task) => hasDailyDevContinuationGaps(task));
    const autopilotNextActions = [];
    if (!dailyDevExecutionReady)
        autopilotNextActions.push("先点击“复检执行通道”并让 Agent CLI 真实探针通过，再派发或续跑 daily_dev 任务");
    if (executableGroups === 0)
        autopilotNextActions.push("创建开发群聊，并加入至少一个具备可写工作目录的项目子 Agent");
    if (missingVerificationMembers.length > 0)
        autopilotNextActions.push("为缺少验证命令的项目子 Agent 配置项目验证命令，提升自动验收可靠性");
    if (continuationGapTasks.length > 0 && dailyDevExecutionReady)
        autopilotNextActions.push("运行一次自动开发或等待 daily_dev 定时任务，系统会优先续跑已有交付缺口任务");
    if (!smokeStatus.pass)
        autopilotNextActions.push(smokeStatus.status === "no_task" ? "创建真实试运行任务，验证主 Agent 到子 Agent 写文件的端到端闭环" : "查看真实试运行状态，按缺口续跑或修复执行通道后再复检");
    if (continuationGapTasks.length === 0 && totalReadyBacklogs === 0 && totalSharedFiles === 0)
        autopilotNextActions.push("上传 PRD、接口说明或业务描述到开发群聊，或在任务派发页创建业务开发任务");
    if (totalSharedFiles > 0 && totalReadyBacklogs === 0)
        autopilotNextActions.push("等待 daily_dev 定时任务自动导入共享文档，或在需求池里点击“导入共享文档”");
    if (dailyDevCronJobs.length === 0)
        autopilotNextActions.push("创建并启用 daily_dev 定时任务，让系统定时认领 ready 需求");
    if (totalReadyBacklogs > 0 && dailyDevExecutionReady)
        autopilotNextActions.push("可以批量派发待认领需求，主 Agent 会拆分给子 Agent 执行");
    if (recoveryWork.total > 0)
        autopilotNextActions.push("执行通道恢复后运行恢复监控，自动重试等待中的开发任务");
    if (autopilotNextActions.length === 0)
        autopilotNextActions.push("自动开发链路已具备接单条件：继续补充业务文档或等待定时任务触发");
    const autopilotMode = !dailyDevExecutionReady || executableGroups === 0
        ? "blocked"
        : continuationGapTasks.length > 0
            ? "ready_to_continue"
            : totalReadyBacklogs > 0
                ? "ready_to_dispatch"
                : totalSharedFiles > 0
                    ? "ready_to_import"
                    : "waiting_input";
    const autopilot = {
        mode: autopilotMode,
        ready: autopilotMode === "ready_to_dispatch" && dailyDevExecutionReady,
        headline: autopilotMode === "blocked"
            ? "自动开发暂不可用"
            : autopilotMode === "ready_to_continue"
                ? "已有任务可续跑"
                : autopilotMode === "ready_to_dispatch"
                    ? "已有需求可派发"
                    : autopilotMode === "ready_to_import"
                        ? "已有业务文档待导入"
                        : "等待业务输入",
        counts: {
            executableGroups,
            readyBacklogs: totalReadyBacklogs,
            sharedFiles: totalSharedFiles,
            continuationGaps: continuationGapTasks.length,
            dailyDevCronJobs: dailyDevCronJobs.length,
            queuedTasks: queueStatus.total_queued,
            recoveryWork: recoveryWork.total,
            verificationConfigured: configuredVerificationMembers.length,
            verificationInferred: inferredVerificationMembers.length,
            verificationMissing: missingVerificationMembers.length,
        },
        next_actions: autopilotNextActions.slice(0, 5),
        recent_cron: dailyDevCronJobs
            .filter((job) => job.last_run || job.last_result)
            .slice(0, 5)
            .map((job) => ({
            id: job.id,
            name: job.name,
            last_status: job.last_status || "never",
            last_result: job.last_result || "",
            last_run: job.last_run || "",
            last_run_meta: job.last_run_meta || null,
        })),
    };
    const summary = readiness === "ready"
        ? "主 Agent 日常开发闭环已具备接单条件"
        : readiness === "partial"
            ? "主 Agent 已可接单，但仍有建议完善项"
            : "主 Agent 暂不能稳定替你执行开发任务，请先处理失败项";
    return {
        success: true,
        generated_at: new Date().toISOString(),
        readiness,
        ready: readiness !== "blocked",
        summary,
        counts: {
            checks: checks.length,
            ok: checks.filter(check => check.status === "ok").length,
            warn: warnCount,
            fail: failCount,
            groups: groups.length,
            readyGroups: groupsWithReadyMembers.length,
            projectConfigs: configs.length,
            cronJobs: cronJobs.length,
            enabledCronJobs: enabledCronJobs.length,
            autoTasks: autoTasks.length,
        },
        autopilot,
        checks,
        groups: devGroups,
        queue_status: queueStatus,
    };
}
function buildCoordinatorSharedFilesContext(ctx, group) {
    const content = ctx.buildFilesContext(group?.shared_files || [], "以下是群聊共享文档/文件（主 Agent 拆分任务时必须读取，并在子 Agent 工作单中引用相关文档、接口、字段、业务规则或验收要求）：");
    return content.trim() ? content : undefined;
}
function buildTaskSourceDocumentsContext(task) {
    const lines = [
        "[任务级业务/接口文档]",
        task?.business_goal || task?.businessGoal ? `业务目标：${compactMemoryText(task.business_goal || task.businessGoal, 600)}` : "",
        task?.acceptance_criteria || task?.acceptanceCriteria ? `验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 800)}` : "",
        task?.source_documents || task?.sourceDocuments ? `关联文档：${compactMemoryText(task.source_documents || task.sourceDocuments, 1800)}` : "",
    ].filter(Boolean);
    return lines.length > 1 ? lines.join("\n") : "";
}
function mergeCoordinatorDocumentContexts(...contexts) {
    const text = contexts
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n\n");
    return text || undefined;
}
function runCollaborationProtocolSelfTest() {
    const reworkProtocol = getCoordinatorReworkProtocolSelfTest();
    const assignmentGroup = {
        members: [
            { project: "coordinator", role: "coordinator" },
            { project: "backend-service" },
            { project: "web-app" },
        ],
    };
    const structuredMentions = getCoordinatorActionMentions({
        content: "我已经形成计划，下面按结构化 assignments 派发。",
        assignments: [
            {
                project: "backend-service",
                task: "主 Agent 工作单：实现退款审核接口 POST /api/refunds/:id/audit，并返回 CCM_AGENT_RECEIPT。",
                reason: "后端负责接口契约",
            },
            {
                project: "web-app",
                task: "主 Agent 工作单：对接退款审核接口并补充页面验证，返回 CCM_AGENT_RECEIPT。",
                reason: "前端负责页面入口",
                dependsOn: "backend-service",
                rework: true,
                attempt: 2,
                continuationOf: "web-app",
                continuationStrategy: "same_worker_scratchpad",
            },
        ],
    }, assignmentGroup, "coordinator");
    const taskDocumentContext = buildTaskSourceDocumentsContext({
        business_goal: "实现订单退款审核功能",
        acceptance_criteria: "后端校验权限，前端展示审核结果，主 Agent 输出交付报告。",
        source_documents: "接口：POST /api/refunds/:id/audit\n字段：approved(boolean), reason(string)\n验收：子 Agent 回执和已执行验证。",
    });
    const mergedDocumentContext = mergeCoordinatorDocumentContexts("", taskDocumentContext);
    const taskDocumentChecks = {
        hasBusinessGoal: taskDocumentContext.includes("业务目标"),
        hasAcceptance: taskDocumentContext.includes("验收标准"),
        hasSourceDocument: taskDocumentContext.includes("/api/refunds/:id/audit"),
        mergeKeepsTaskDocument: String(mergedDocumentContext || "").includes("approved(boolean)"),
    };
    const structuredAssignmentChecks = {
        hasTwoMentions: structuredMentions.length === 2,
        preservesTarget: structuredMentions.some((item) => item.targetName === "backend-service"),
        preservesTask: structuredMentions.some((item) => String(item.message || "").includes("/api/refunds/:id/audit")),
        preservesDependency: structuredMentions.some((item) => item.targetName === "web-app" && item.dependsOn === "backend-service"),
        preservesContinuation: structuredMentions.some((item) => item.targetName === "web-app" && item.rework === true && item.attempt === 2 && item.continuationStrategy === "same_worker_scratchpad"),
    };
    const executionFixActions = buildAgentExecutionFixActions({
        error: "API Error: Unable to connect to API (ConnectionRefused)",
        agentType: "claudecode",
    });
    const executionFixChecks = {
        hasCliCheck: executionFixActions.some((item) => item.includes("claude --permission-mode acceptEdits -p") || item.includes("claude -p")),
        hasApiNetworkHint: executionFixActions.some((item) => item.includes("代理环境变量") || item.includes("API Base URL")),
        hasRetryAction: executionFixActions.some((item) => item.includes("复检执行通道") || item.includes("立即恢复自动任务")),
    };
    const recentFailedProbeHealth = getAgentProbeHealth({
        success: false,
        message: "API Error: Unable to connect to API (ConnectionRefused)",
        checked_at: new Date().toISOString(),
        age_ms: 1000,
    });
    const freshOkProbeHealth = getAgentProbeHealth({
        success: true,
        message: "Agent CLI 探针通过",
        checked_at: new Date().toISOString(),
        age_ms: 1000,
    });
    const readyWithoutProbe = {
        ready: true,
        mode: "node-child-process",
        message: "Node 可启动子进程",
        probeHealth: { status: "missing", successFresh: false, message: "尚未运行 Agent CLI 探针" },
    };
    const readyWithFreshProbe = {
        ...readyWithoutProbe,
        probeHealth: freshOkProbeHealth,
    };
    const retryProbeAfterRecentFailure = enforceAgentProbeExecutionReadiness({
        childProcess: { ok: true, stdout: "ok" },
        externalRunner: { active: false },
        probeHealth: recentFailedProbeHealth,
    });
    const runnerProbeFailure = getAgentProbeOutputFailure("[web-app] Agent Runner 错误: API Error: Unable to connect to API (ConnectionRefused)");
    const freshProbeRecoveryGate = hasFreshSuccessfulAgentProbe({ probe: { success: true, age_ms: 1000 } });
    const staleProbeRecoveryGate = hasFreshSuccessfulAgentProbe({ probe: { success: true, age_ms: AGENT_PROBE_SUCCESS_FRESH_MS + 1000 } });
    const dailyDevProbeRequired = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithoutProbe);
    const dailyDevWatchdogGapGate = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithoutProbe);
    const dailyDevProbePassed = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithFreshProbe);
    const generalProbeNotRequired = enforceTaskAgentProbeReadiness({ workflow_type: "general" }, readyWithoutProbe);
    const probeHealthChecks = {
        recentFailureBlocks: recentFailedProbeHealth.failureRecent === true && recentFailedProbeHealth.status === "failed",
        freshSuccessPasses: freshOkProbeHealth.successFresh === true && freshOkProbeHealth.status === "ok",
        probeCanRetryAfterRecentFailure: retryProbeAfterRecentFailure.ready === true && retryProbeAfterRecentFailure.mode === "node-child-process-probe",
        probeFailureKeepsRunnerError: String(runnerProbeFailure.message || "").includes("ConnectionRefused") && String(runnerProbeFailure.error || "").includes("Agent Runner 错误"),
        freshProbeEnablesImmediateRecovery: freshProbeRecoveryGate === true,
        staleProbeDoesNotEnableImmediateRecovery: staleProbeRecoveryGate === false,
        dailyDevRequiresFreshProbe: dailyDevProbeRequired.ready === false && dailyDevProbeRequired.mode === "agent-cli-probe-required",
        dailyDevWatchdogGapsRequireFreshProbe: dailyDevWatchdogGapGate.ready === false && dailyDevWatchdogGapGate.mode === "agent-cli-probe-required",
        dailyDevFreshProbePasses: dailyDevProbePassed.ready === true,
        generalTaskDoesNotRequireProbe: generalProbeNotRequired.ready === true,
    };
    const notifiedOutput = formatCollectedAgentOutput("backend-service", "已实现退款审核接口并运行 npm test。", {
        agent: "backend-service",
        status: "done",
        summary: "完成退款审核接口",
        actions: ["实现 POST /api/refunds/:id/audit"],
        filesChanged: ["src/refunds/audit.ts"],
        verification: ["npm test passed"],
        blockers: [],
        needs: [],
    });
    const missingReceiptOutput = formatCollectedAgentOutput("web-app", "已处理页面入口，但未提交回执。", null);
    const notificationFollowUps = buildEvidenceGateFollowUps(assignmentGroup, [missingReceiptOutput]);
    const taskNotificationChecks = {
        hasXmlEnvelope: notifiedOutput.includes("<task-notification>") && notifiedOutput.includes("</task-notification>"),
        hasTaskId: getCollectedOutputAgent(notifiedOutput) === "backend-service",
        hasCompletedStatus: extractTaskNotificationTag(notifiedOutput, "status") === "completed",
        detectsMissingReceipt: notificationFollowUps.some((item) => item.targetName === "web-app" && String(item.reason || "").includes("缺少结构化回执")),
    };
    const blockedDependencyOutput = formatCollectedAgentOutput("backend-service", "后端接口字段未确认，无法继续。", {
        agent: "backend-service",
        status: "blocked",
        summary: "接口字段未确认",
        actions: ["检查接口文档"],
        filesChanged: [],
        verification: [],
        blockers: ["approved 字段语义缺失"],
        needs: ["用户或后端确认字段契约"],
    });
    const doneDependencyState = getAgentDependencyStateFromOutputs("backend-service", [notifiedOutput]);
    const blockedDependencyState = getAgentDependencyStateFromOutputs("backend-service", [blockedDependencyOutput]);
    const dependencyGateChecks = {
        doneDependencyPasses: doneDependencyState.ok === true,
        blockedDependencyStopsDownstream: blockedDependencyState.ok === false && blockedDependencyState.status === "blocked",
        blockedDependencyExplainsReason: String(blockedDependencyState.reason || "").includes("接口字段未确认"),
    };
    const notificationDeliverySummary = buildDeliverySummary({
        title: "通知摘要自测",
        workflow_type: "daily_dev",
        requires_verification: false,
    }, {
        report: notifiedOutput,
        review: { status: "complete", content: "主 Agent 已复盘通知" },
    }, "waiting");
    const notificationDeliveryChecks = {
        summaryHasWorkerNotification: notificationDeliverySummary.worker_notification_count === 1,
        summaryKeepsNotificationTaskId: notificationDeliverySummary.worker_notifications?.[0]?.task_id === "backend-service",
        summaryUsesNotificationAgent: notificationDeliverySummary.agents?.includes("backend-service"),
        userReportMentionsNotification: String(notificationDeliverySummary.user_report || "").includes("Worker 通知：1 条"),
    };
    const failedNotificationSummary = buildDeliverySummary({
        id: "task-gap",
        title: "通知缺口续跑自测",
        workflow_type: "daily_dev",
        requires_verification: false,
    }, {
        report: formatCollectedAgentOutput("web-app", "页面入口处理失败，缺少接口字段。", {
            agent: "web-app",
            status: "blocked",
            summary: "缺少退款审核接口字段",
            actions: ["检查订单详情页入口"],
            filesChanged: [],
            verification: [],
            blockers: ["approved 字段含义未确认"],
            needs: ["后端确认字段契约"],
        }),
        review: { status: "needs_followup", content: "主 Agent 需要 web-app 继续返工" },
    }, "waiting");
    const gapTask = {
        id: "task-gap",
        title: "退款审核入口",
        workflow_type: "daily_dev",
        status: "in_progress",
        delivery_summary: failedNotificationSummary,
    };
    const gapDraft = buildTaskGapContinuationDraft(gapTask);
    const missingCoordinationTask = {
        id: "task-missing-coordination",
        title: "缺协作证据续跑自测",
        workflow_type: "daily_dev",
        status: "in_progress",
        delivery_summary: {
            status: "waiting",
            detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
            coordination_plan_count: 0,
            assignment_count: 0,
            worker_notification_count: 0,
            receipt_statuses: [{ agent: "web-app", status: "done", summary: "已完成页面改动" }],
            has_final_review: true,
            actual_file_change_count: 1,
            verification_executed: ["npm test"],
        },
    };
    const missingCoordinationDraft = buildTaskGapContinuationDraft(missingCoordinationTask);
    const continuationGapChecks = {
        workerNotificationTriggersGap: hasDailyDevContinuationGaps(gapTask),
        draftIncludesWorkerNotification: gapDraft.includes("上一轮 Worker 通知") && gapDraft.includes("web-app"),
        draftIncludesSameWorkerStrategy: gapDraft.includes("same_worker_scratchpad") && gapDraft.includes("同 Worker 续跑目标"),
        missingCoordinationTriggersGap: hasDailyDevContinuationGaps(missingCoordinationTask),
        draftIncludesCoordinationEvidenceGap: missingCoordinationDraft.includes("需要补齐的主 Agent 协作证据")
            && missingCoordinationDraft.includes("协调计划")
            && missingCoordinationDraft.includes("派发证据")
            && missingCoordinationDraft.includes("Worker 通知"),
    };
    const scratchpadMemory = appendWorkerLedger(createEmptyGroupMemory("selftest"), {
        taskId: "task-refund",
        project: "backend-service",
        status: "completed",
        receiptStatus: "done",
        summary: "后端确认 POST /api/refunds/:id/audit 契约",
        verification: ["npm test passed"],
    });
    const scratchpadContext = buildGroupMemoryContext(scratchpadMemory);
    const scratchpadChecks = {
        storesWorkerLedger: Array.isArray(scratchpadMemory.workerLedger) && scratchpadMemory.workerLedger.length === 1,
        contextIncludesScratchpad: scratchpadContext.includes("Worker scratchpad"),
        contextIncludesWorkerSummary: scratchpadContext.includes("/api/refunds/:id/audit"),
    };
    return {
        pass: reworkProtocol.pass
            && Object.values(taskDocumentChecks).every(Boolean)
            && Object.values(structuredAssignmentChecks).every(Boolean)
            && Object.values(executionFixChecks).every(Boolean)
            && Object.values(probeHealthChecks).every(Boolean)
            && Object.values(taskNotificationChecks).every(Boolean)
            && Object.values(dependencyGateChecks).every(Boolean)
            && Object.values(notificationDeliveryChecks).every(Boolean)
            && Object.values(continuationGapChecks).every(Boolean)
            && Object.values(scratchpadChecks).every(Boolean),
        reworkProtocol,
        taskDocumentContextPreview: taskDocumentContext.slice(0, 600),
        taskDocumentChecks,
        structuredAssignmentChecks,
        executionFixChecks,
        executionFixActions,
        probeHealthChecks,
        taskNotificationChecks,
        dependencyGateChecks,
        notificationDeliveryChecks,
        continuationGapChecks,
        scratchpadChecks,
    };
}
function normalizeToolSelection(tools = {}) {
    return {
        mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x) => String(x || "").trim()).filter(Boolean) : [],
        skill: Array.isArray(tools.skill) ? tools.skill.map((x) => String(x || "").trim()).filter(Boolean) : [],
    };
}
function mergeToolSelections(...items) {
    const merged = { mcp: new Set(), skill: new Set() };
    for (const item of items) {
        const normalized = normalizeToolSelection(item);
        for (const name of normalized.mcp)
            merged.mcp.add(name);
        for (const name of normalized.skill)
            merged.skill.add(name);
    }
    return {
        mcp: Array.from(merged.mcp),
        skill: Array.from(merged.skill),
    };
}
function getProjectToolSelection(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return normalizeToolSelection(configs?.[projectName]?.tools || {});
}
function getProjectExtraConfig(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return configs?.[projectName] || {};
}
function buildAgentToolContext(ctx, group, projectName) {
    const allowedTools = mergeToolSelections(group?.tools || {}, getProjectToolSelection(projectName));
    const prompt = ctx.toolManager.buildToolPrompt(allowedTools);
    return { prompt, allowedTools };
}
function normalizeVerificationCommands(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map(item => item.trim()).filter(Boolean);
}
function readPackageJsonScripts(workDir) {
    try {
        const file = path.join(workDir, "package.json");
        if (!fs.existsSync(file))
            return {};
        const data = JSON.parse(fs.readFileSync(file, "utf-8"));
        return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
    }
    catch {
        return {};
    }
}
function getConfiguredProjectVerificationCommands(projectName) {
    const projectConfig = getProjectExtraConfig(projectName);
    return normalizeVerificationCommands(projectConfig.verification_commands
        || projectConfig.verificationCommands
        || projectConfig.test_commands
        || projectConfig.testCommands
        || projectConfig.check_commands
        || projectConfig.checkCommands);
}
function inferProjectVerificationCommands(workDir = "") {
    const dir = String(workDir || "").trim();
    if (!dir || !fs.existsSync(dir))
        return [];
    const hints = [];
    const scripts = readPackageJsonScripts(dir);
    const scriptNames = Object.keys(scripts);
    const addNpmScript = (name) => {
        if (scriptNames.includes(name))
            hints.push(`npm run ${name}`);
    };
    addNpmScript("check");
    addNpmScript("typecheck");
    addNpmScript("lint");
    addNpmScript("test");
    addNpmScript("build");
    if (fs.existsSync(path.join(dir, "pom.xml")))
        hints.push("mvn test");
    if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts")))
        hints.push("gradle test");
    if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml")))
        hints.push("pytest");
    if (fs.existsSync(path.join(dir, "go.mod")))
        hints.push("go test ./...");
    if (fs.existsSync(path.join(dir, "Cargo.toml")))
        hints.push("cargo test");
    return uniqueStrings(hints).slice(0, 6);
}
function getProjectVerificationHintDetail(projectName, workDir = "") {
    const configured = getConfiguredProjectVerificationCommands(projectName);
    if (configured.length > 0) {
        return { source: "configured", commands: configured.slice(0, 6) };
    }
    const inferred = inferProjectVerificationCommands(workDir);
    return {
        source: inferred.length > 0 ? "inferred" : "missing",
        commands: inferred,
    };
}
function buildProjectVerificationHints(projectName, workDir = "") {
    return getProjectVerificationHintDetail(projectName, workDir).commands;
}
function compactFormText(value, fallback = "未填写") {
    const text = String(value || "").replace(/\r\n/g, "\n").trim();
    return text || fallback;
}
function makeDailyDevBacklogFileName(title) {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const slug = String(title || "requirement")
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 36) || "requirement";
    return `backlog-${day}-${slug}-${crypto.randomBytes(3).toString("hex")}.md`;
}
function buildDailyDevBacklogDocument(payload, title, goal) {
    const createdAt = new Date().toISOString();
    return [
        `# ${compactFormText(title, goal.slice(0, 60) || "业务开发需求")}`,
        "",
        "- 状态: ready",
        `- 类型: daily_dev`,
        `- 优先级: ${compactFormText(payload.priority, "normal")}`,
        `- 创建时间: ${createdAt}`,
        `- 代码变更: ${payload.requires_code_changes === false || payload.requiresCodeChanges === false ? "允许无代码变更" : "必须有实际文件变更"}`,
        "",
        "## 业务目标",
        compactFormText(goal),
        "",
        "## 开发范围",
        compactFormText(payload.scope || payload.development_scope || payload.developmentScope),
        "",
        "## 业务/接口文档",
        compactFormText(payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments),
        "",
        "## 验收标准",
        compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria),
        "",
        "## 约束/注意事项",
        compactFormText(payload.constraints || payload.notes, "无"),
        "",
        "## 主 Agent 执行要求",
        "- 读取本需求后，先判断涉及项目和子 Agent。",
        "- 拆分成可执行工作单，派发给对应子 Agent 编写代码。",
        "- 等待 CCM_AGENT_RECEIPT，并在最终报告中引用变更文件、验证结果和风险。",
    ].join("\n");
}
function persistDailyDevBacklogFile(groups, group, payload, title, goal) {
    if (payload.persist_documents === false || payload.persistDocuments === false)
        return null;
    if (!group.shared_files)
        group.shared_files = [];
    const name = makeDailyDevBacklogFileName(title || goal);
    const content = buildDailyDevBacklogDocument(payload, title, goal);
    const record = {
        name,
        type: "text",
        readable: true,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: "daily_dev_backlog",
        status: "ready",
    };
    group.shared_files.push(record);
    saveGroups(groups);
    return { name, content };
}
function readDailyDevBacklogStatus(file) {
    const explicit = String(file?.status || "").trim().toLowerCase();
    if (explicit)
        return explicit;
    const match = String(file?.content || "").match(/^\s*-\s*状态\s*:\s*([^\n\r]+)/mi);
    return String(match?.[1] || "").trim().toLowerCase();
}
function readDailyDevBacklogPriority(file) {
    const explicit = String(file?.priority || "").trim().toLowerCase();
    const match = String(file?.content || "").match(/^\s*-\s*优先级\s*:\s*([^\n\r]+)/mi);
    const priority = explicit || String(match?.[1] || "normal").trim().toLowerCase();
    return PRIORITY_WEIGHT[priority] ? priority : "normal";
}
function isDailyDevBacklogFile(file) {
    const content = String(file?.content || "");
    return file?.category === "daily_dev_backlog"
        || /^backlog-[\w-]+\.md$/i.test(String(file?.name || ""))
        || /类型\s*:\s*daily_dev/i.test(content);
}
function extractMarkdownSection(content, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "mi");
    return String(content.match(pattern)?.[1] || "").trim();
}
function replaceBacklogStatusLine(content, status) {
    const line = `- 状态: ${status}`;
    if (/^\s*-\s*状态\s*:/mi.test(content)) {
        return content.replace(/^\s*-\s*状态\s*:[^\n\r]*/mi, line);
    }
    return `${line}\n${content}`;
}
function extractDailyDevBacklogPayload(file) {
    const content = String(file?.content || "");
    const title = String(content.match(/^#\s+(.+)$/m)?.[1] || file?.name || "业务开发需求").trim();
    const businessGoal = extractMarkdownSection(content, "业务目标") || title;
    const acceptance = extractMarkdownSection(content, "验收标准");
    const documents = [
        `群聊需求池文件：${file.name}`,
        content,
    ].filter(Boolean).join("\n\n");
    return {
        title,
        business_goal: businessGoal,
        scope: extractMarkdownSection(content, "开发范围"),
        documents,
        acceptance,
        constraints: extractMarkdownSection(content, "约束/注意事项"),
        priority: readDailyDevBacklogPriority(file),
        requires_code_changes: !/代码变更\s*:\s*允许无代码变更/i.test(content),
        backlog_file: file.name,
    };
}
function isImportableDailyDevSourceFile(file, options = {}) {
    if (!file || file.readable === false || isDailyDevBacklogFile(file))
        return false;
    if (!options.force && file.daily_dev_imported_backlog)
        return false;
    const content = String(file.content || "").trim();
    if (content.length < 20)
        return false;
    const name = String(file.name || "");
    return /\.(md|markdown|txt|prd|json|yaml|yml)$/i.test(name) || file.type === "text" || file.type === "markdown";
}
function firstUsefulParagraph(content, max = 600) {
    const cleaned = String(content || "")
        .split(/\n{2,}/)
        .map(part => part.replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s*/gm, "").trim())
        .find(Boolean) || "";
    return compactFormText(cleaned.slice(0, max), "");
}
function buildDailyDevPayloadFromSharedFile(file, group, options = {}) {
    const content = String(file.content || "").trim();
    const heading = String(content.match(/^#\s+(.+)$/m)?.[1] || "").trim();
    const title = compactFormText(options.title || heading || file.name, "共享文档业务需求").replace(/\.(md|markdown|txt|prd|json|yaml|yml)$/i, "");
    const goal = extractMarkdownSection(content, "业务目标")
        || extractMarkdownSection(content, "目标")
        || firstUsefulParagraph(content, 500)
        || title;
    return {
        title,
        business_goal: goal,
        scope: extractMarkdownSection(content, "开发范围") || extractMarkdownSection(content, "范围") || "由主 Agent 根据源共享文档判断涉及项目和改动范围。",
        documents: [`源共享文档：${file.name}`, `所属开发群聊：${group?.name || group?.id || "未命名群聊"}`, content].join("\n\n"),
        acceptance: extractMarkdownSection(content, "验收标准")
            || extractMarkdownSection(content, "验收")
            || "主 Agent 最终报告必须说明完成内容、涉及文件、验证结果、风险和仍需补充事项。",
        constraints: extractMarkdownSection(content, "约束/注意事项") || extractMarkdownSection(content, "约束") || "",
        priority: options.priority || readDailyDevBacklogPriority(file) || "normal",
        requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
    };
}
function importSharedDocsToDailyDevBacklog(options = {}) {
    const groupId = String(options.group_id || options.groupId || "").trim();
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const groups = loadGroups();
    const imported = [];
    const skipped = [];
    for (const group of groups.filter((item) => !groupId || item.id === groupId)) {
        const files = Array.isArray(group.shared_files) ? group.shared_files : [];
        for (const file of files) {
            if (imported.length >= limit)
                break;
            if (!isImportableDailyDevSourceFile(file, options)) {
                if (file && !isDailyDevBacklogFile(file))
                    skipped.push({ group_id: group.id, name: file.name, reason: file.daily_dev_imported_backlog ? "已导入" : "不可导入" });
                continue;
            }
            const payload = buildDailyDevPayloadFromSharedFile(file, group, options);
            const backlog = persistDailyDevBacklogFile(groups, group, payload, payload.title, payload.business_goal);
            if (!backlog) {
                skipped.push({ group_id: group.id, name: file.name, reason: "未启用需求池写入" });
                continue;
            }
            const now = new Date().toISOString();
            file.daily_dev_imported_backlog = backlog.name;
            file.daily_dev_imported_at = now;
            file.daily_dev_import_status = "imported";
            file.updated_at = now;
            imported.push({ group_id: group.id, group_name: group.name || group.id, source: file.name, backlog: backlog.name, title: payload.title });
        }
    }
    saveGroups(groups);
    return {
        success: true,
        imported: imported.length,
        skipped: skipped.length,
        items: imported,
        skipped_items: skipped.slice(0, 20),
        counts: listDailyDevBacklogs(groupId).reduce((acc, item) => {
            acc[item.status] = Number(acc[item.status] || 0) + 1;
            return acc;
        }, {}),
    };
}
function claimReadyDailyDevBacklog(groupId, claim = {}) {
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group)
        return null;
    const files = Array.isArray(group.shared_files) ? group.shared_files : [];
    const candidates = files
        .map((file, index) => ({ file, index }))
        .filter(({ file }) => file?.readable !== false && isDailyDevBacklogFile(file) && readDailyDevBacklogStatus(file) === "ready")
        .sort((a, b) => {
        const pa = PRIORITY_WEIGHT[readDailyDevBacklogPriority(a.file)] || 2;
        const pb = PRIORITY_WEIGHT[readDailyDevBacklogPriority(b.file)] || 2;
        if (pa !== pb)
            return pb - pa;
        return Date.parse(a.file.created_at || a.file.updated_at || "") - Date.parse(b.file.created_at || b.file.updated_at || "");
    });
    const selected = candidates[0];
    if (!selected)
        return null;
    const file = files[selected.index];
    const now = new Date().toISOString();
    file.status = "queued";
    file.claimed_at = now;
    file.claimed_by = claim.source || "daily_dev_cron";
    file.claimed_by_cron_job_id = claim.cron_job_id || null;
    file.updated_at = now;
    file.content = replaceBacklogStatusLine(String(file.content || ""), "queued");
    saveGroups(groups);
    return extractDailyDevBacklogPayload(file);
}
function markDailyDevBacklogStatus(groupId, fileName, status, meta = {}) {
    if (!groupId || !fileName)
        return null;
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group || !Array.isArray(group.shared_files))
        return null;
    const file = group.shared_files.find((item) => item?.name === fileName);
    if (!file)
        return null;
    const now = new Date().toISOString();
    file.status = status;
    file.updated_at = now;
    if (meta.task_id)
        file.task_id = meta.task_id;
    if (meta.result)
        file.last_result = String(meta.result).slice(0, 800);
    if (status === "done")
        file.completed_at = now;
    if (status === "blocked" || status === "failed")
        file.blocked_at = now;
    file.content = replaceBacklogStatusLine(String(file.content || ""), status);
    saveGroups(groups);
    return file;
}
function listDailyDevBacklogs(groupId = "") {
    const groups = loadGroups();
    return groups
        .filter((group) => !groupId || group.id === groupId)
        .flatMap((group) => {
        const files = Array.isArray(group.shared_files) ? group.shared_files : [];
        return files
            .filter((file) => isDailyDevBacklogFile(file))
            .map((file) => {
            const content = String(file.content || "");
            const title = String(content.match(/^#\s+(.+)$/m)?.[1] || file.name || "业务开发需求").trim();
            return {
                group_id: group.id,
                group_name: group.name || group.id,
                name: file.name,
                title,
                status: readDailyDevBacklogStatus(file) || "unknown",
                priority: readDailyDevBacklogPriority(file),
                task_id: file.task_id || null,
                claimed_by_cron_job_id: file.claimed_by_cron_job_id || null,
                created_at: file.created_at || "",
                updated_at: file.updated_at || "",
                claimed_at: file.claimed_at || "",
                completed_at: file.completed_at || "",
                blocked_at: file.blocked_at || "",
                last_result: file.last_result || "",
                business_goal: extractMarkdownSection(content, "业务目标") || title,
            };
        });
    })
        .sort((a, b) => {
        const statusOrder = { ready: 0, blocked: 1, queued: 2, in_progress: 3, done: 4 };
        const sa = statusOrder[a.status] ?? 9;
        const sb = statusOrder[b.status] ?? 9;
        if (sa !== sb)
            return sa - sb;
        const pa = PRIORITY_WEIGHT[a.priority] || 2;
        const pb = PRIORITY_WEIGHT[b.priority] || 2;
        if (pa !== pb)
            return pb - pa;
        return Date.parse(a.created_at || a.updated_at || "") - Date.parse(b.created_at || b.updated_at || "");
    });
}
function dailyDevGroupCanDispatch(groupId) {
    try {
        const group = loadGroups().find(g => g.id === groupId);
        if (!group)
            return false;
        validateDailyDevGroupReady(group);
        return true;
    }
    catch {
        return false;
    }
}
function dispatchDailyDevBacklog(groupId, fileName, ctx, options = {}) {
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group || !Array.isArray(group.shared_files)) {
        return { success: false, status: 404, error: "开发群聊或需求池不存在" };
    }
    let groupReadiness = null;
    try {
        groupReadiness = validateDailyDevGroupReady(group);
    }
    catch (e) {
        return { success: false, status: 409, error: e.message };
    }
    const file = group.shared_files.find((item) => item?.name === fileName);
    if (!file || !isDailyDevBacklogFile(file)) {
        return { success: false, status: 404, error: "需求池文件不存在" };
    }
    const currentStatus = readDailyDevBacklogStatus(file);
    if (currentStatus === "done") {
        return { success: false, status: 409, error: "已完成需求不能重新派发，请先恢复为 ready" };
    }
    if ((currentStatus === "queued" || currentStatus === "in_progress") && file.task_id && !options.force) {
        return { success: false, status: 409, error: "需求已经关联执行任务，如需重派请先恢复为 ready" };
    }
    const payload = extractDailyDevBacklogPayload(file);
    const now = new Date().toISOString();
    file.status = "queued";
    file.claimed_at = now;
    file.claimed_by = options.source || "manual_backlog_dispatch";
    file.updated_at = now;
    file.content = replaceBacklogStatusLine(String(file.content || ""), "queued");
    saveGroups(groups);
    try {
        const taskPayload = { ...payload, documents: payload.documents, source_documents: payload.documents };
        const task = createTask({
            title: payload.title,
            description: buildDailyDevTaskDescription(taskPayload),
            target_project: groupReadiness.coordinator.project,
            group_id: groupId,
            assign_type: "group",
            priority: payload.priority || "normal",
            auto_execute: options.auto_execute !== false && options.autoExecute !== false,
            workflow_type: "daily_dev",
            requires_code_changes: payload.requires_code_changes !== false,
            requires_verification: true,
            business_goal: payload.business_goal,
            acceptance_criteria: payload.acceptance || "",
            source_documents: payload.documents,
            workflow_meta: {
                ...(options.workflow_meta || options.workflowMeta || {}),
                intake: {
                    backlog_file: payload.backlog_file,
                    source: "manual-backlog-dispatch",
                    dispatched_at: now,
                },
            },
        });
        file.task_id = task.id;
        file.last_result = "已由用户从需求池立即派发给主 Agent";
        file.updated_at = new Date().toISOString();
        saveGroups(groups);
        let queueResult = null;
        if (task.auto_execute) {
            queueResult = enqueueTask(task.id, ctx);
            if (queueResult?.blocked) {
                markDailyDevBacklogStatus(groupId, fileName, "queued", {
                    task_id: task.id,
                    result: queueResult.message || "任务已创建，等待执行通道恢复",
                });
            }
        }
        return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() };
    }
    catch (e) {
        markDailyDevBacklogStatus(groupId, fileName, "ready", {
            result: `立即派发失败，已恢复为 ready：${e.message}`,
        });
        return { success: false, status: 400, error: e.message };
    }
}
function dispatchReadyDailyDevBacklogs(ctx, options = {}) {
    const groupId = String(options.group_id || options.groupId || "").trim();
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
    const candidates = listDailyDevBacklogs(groupId)
        .filter((item) => item.status === "ready")
        .filter((item) => !options.only_executable_groups || dailyDevGroupCanDispatch(item.group_id))
        .slice(0, limit);
    const results = candidates.map((item) => {
        const result = dispatchDailyDevBacklog(item.group_id, item.name, ctx, {
            auto_execute: autoExecute,
            source: "bulk-backlog-dispatch",
            workflow_meta: {
                bulk_dispatch: {
                    source: "daily-dev-backlog-bulk",
                    requested_at: new Date().toISOString(),
                },
            },
        });
        return {
            group_id: item.group_id,
            group_name: item.group_name,
            name: item.name,
            title: item.title,
            priority: item.priority,
            ...result,
        };
    });
    return {
        success: true,
        total_candidates: candidates.length,
        dispatched: results.filter((item) => item.success).length,
        queued: results.filter((item) => item.queued).length,
        failed: results.filter((item) => !item.success).length,
        auto_execute: autoExecute,
        limit,
        results,
        items: listDailyDevBacklogs(groupId),
        queue_status: getQueueStatus(),
    };
}
function runDailyDevAutopilotOnce(ctx, options = {}) {
    const groupId = String(options.group_id || options.groupId || "").trim();
    const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
    const gapContinueLimit = Math.max(1, Math.min(50, Number(options.gap_continue_limit || options.gapContinueLimit || 5)));
    const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
    const dailyDevExecutionReadiness = getTaskAgentExecutionReadiness({ workflow_type: "daily_dev" });
    const canAutoExecuteDailyDev = !autoExecute || dailyDevExecutionReadiness.ready === true;
    const gapContinueResult = !canAutoExecuteDailyDev
        ? { success: true, skipped: true, skip_reason: dailyDevExecutionReadiness.message, total_candidates: 0, continued: 0, queued: 0, blocked: 0, failed: 0, results: [] }
        : options.continue_gaps === false || options.continueGaps === false
            ? { success: true, total_candidates: 0, continued: 0, queued: 0, blocked: 0, failed: 0, results: [] }
            : continueDailyDevTasksFromGaps(ctx, {
                group_id: groupId,
                limit: gapContinueLimit,
                auto_execute: autoExecute,
                max_per_task: options.max_gap_continue_per_task || options.maxGapContinuePerTask || 3,
            });
    const shouldImport = options.import_shared_docs !== false && options.importSharedDocs !== false;
    const importResult = shouldImport
        ? importSharedDocsToDailyDevBacklog({
            group_id: groupId,
            limit,
            force: !!options.force_import || !!options.forceImport,
            priority: options.priority || "normal",
            requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
        })
        : { success: true, imported: 0, skipped: 0, items: [], skipped_items: [], counts: {} };
    const dispatchResult = canAutoExecuteDailyDev
        ? dispatchReadyDailyDevBacklogs(ctx, {
            group_id: groupId,
            limit,
            auto_execute: autoExecute,
            only_executable_groups: options.only_executable_groups !== false && options.onlyExecutableGroups !== false,
        })
        : { success: true, skipped: true, skip_reason: dailyDevExecutionReadiness.message, dispatched: 0, queued: 0, failed: 0, results: [], items: listDailyDevBacklogs(groupId), queue_status: getQueueStatus() };
    const diagnostics = buildDailyDevAgentDiagnostics();
    const blockedItems = [
        ...(gapContinueResult.results || []).filter((item) => item.queue_result?.blocked),
        ...(dispatchResult.results || []).filter((item) => item.queue_result?.blocked),
    ];
    const failedItems = [
        ...(gapContinueResult.results || []).filter((item) => !item.success),
        ...(dispatchResult.results || []).filter((item) => !item.success),
    ];
    const readyBacklogCount = listDailyDevBacklogs(groupId).filter((item) => item.status === "ready").length;
    const continuationGapCount = (0, db_1.loadTasks)().filter((task) => (!groupId || task.group_id === groupId) && hasDailyDevContinuationGaps(task)).length;
    const hasPendingDailyDevWork = readyBacklogCount > 0 || importResult.imported > 0 || continuationGapCount > 0;
    const outcomeStatus = (!canAutoExecuteDailyDev && autoExecute && hasPendingDailyDevWork) || blockedItems.length > 0
        ? "waiting_execution"
        : failedItems.length > 0
            ? "partial_failure"
            : gapContinueResult.queued > 0
                ? "continued"
                : dispatchResult.queued > 0
                    ? "queued"
                    : dispatchResult.dispatched > 0
                        ? "created"
                        : (importResult.imported > 0 ? "imported" : "idle");
    const blockedMessage = blockedItems[0]?.queue_result?.message || (!canAutoExecuteDailyDev ? dailyDevExecutionReadiness.message : "");
    const nextActions = outcomeStatus === "waiting_execution"
        ? ["先点击“复检执行通道”并让 Agent CLI 真实探针通过，系统会再派发或恢复 daily_dev 任务", blockedMessage].filter(Boolean)
        : outcomeStatus === "idle"
            ? ["上传业务文档到开发群聊，或在任务派发页创建业务开发任务"]
            : diagnostics.autopilot?.next_actions || [];
    return {
        success: true,
        outcome: {
            status: outcomeStatus,
            message: outcomeStatus === "waiting_execution"
                ? (!canAutoExecuteDailyDev
                    ? `已有 ${readyBacklogCount} 个 ready 需求、${continuationGapCount} 个续跑缺口等待执行准入；请先复检 Agent CLI`
                    : `已有 ${gapContinueResult.continued || 0} 个续跑任务、${dispatchResult.dispatched || 0} 个新任务等待执行，但执行通道阻塞`)
                : outcomeStatus === "continued"
                    ? `已按交付缺口续跑 ${gapContinueResult.continued || 0} 个任务，入队 ${gapContinueResult.queued || 0} 个`
                    : outcomeStatus === "queued"
                        ? `已派发 ${dispatchResult.dispatched || 0} 条需求，入队 ${dispatchResult.queued || 0} 条`
                        : outcomeStatus === "created"
                            ? `已创建 ${dispatchResult.dispatched || 0} 个任务，等待队列处理`
                            : outcomeStatus === "imported"
                                ? `已导入 ${importResult.imported || 0} 份共享文档，等待下一轮派发`
                                : "没有新的共享文档或 ready 需求",
            blocked: outcomeStatus === "waiting_execution",
            next_actions: nextActions.slice(0, 4),
        },
        continued: gapContinueResult.continued || 0,
        gap_queued: gapContinueResult.queued || 0,
        imported: importResult.imported || 0,
        import_skipped: importResult.skipped || 0,
        dispatched: dispatchResult.dispatched || 0,
        queued: dispatchResult.queued || 0,
        failed: (gapContinueResult.failed || 0) + (dispatchResult.failed || 0),
        gap_continue_result: gapContinueResult,
        import_result: importResult,
        dispatch_result: dispatchResult,
        autopilot: diagnostics.autopilot,
        execution_readiness: dailyDevExecutionReadiness,
        can_auto_execute_daily_dev: canAutoExecuteDailyDev,
        ready_backlog_count: readyBacklogCount,
        continuation_gap_count: continuationGapCount,
        has_pending_daily_dev_work: hasPendingDailyDevWork,
        queue_status: getQueueStatus(),
    };
}
const DEFAULT_DAILY_DEV_CRON_PROMPT = [
    "请按日常开发主 Agent 工作流执行：",
    "1. 优先续跑已有 daily_dev 任务的交付缺口，再检查群聊共享文档和 ready backlog。",
    "2. 先理解业务目标、接口/字段、影响范围和验收标准，再拆给对应项目子 Agent 开发。",
    "3. 子 Agent 必须修改代码后返回 CCM_AGENT_RECEIPT，说明动作、文件、验证和阻塞点。",
    "4. 主 Agent 必须等待回执并复盘；发现缺口时继续返工或说明需要用户补充的信息。",
    "5. 最终报告要包含完成内容、涉及项目/文件、验证结果、风险和下一步。"
].join("\n");
function isDailyDevCronJobForGroup(job, groupId) {
    return (job?.target_type === "group" || job?.group_id)
        && job?.group_id === groupId
        && (job?.workflow_type === "daily_dev" || job?.workflowType === "daily_dev" || job?.daily_dev || job?.dailyDev);
}
function ensureDailyDevAutopilotCronJobs(options = {}) {
    const groups = loadGroups();
    const configs = (0, db_1.getConfigs)();
    const jobs = (0, db_1.loadCronJobs)();
    const now = new Date().toISOString();
    const schedule = String(options.schedule || "*/30 * * * *").trim();
    const limit = Math.max(1, Math.min(100, Number(options.limit || groups.length || 1)));
    const backlogBatchLimit = Math.max(1, Math.min(20, Number(options.backlog_batch_limit || options.backlogBatchLimit || 3)));
    const gapContinueLimit = Math.max(1, Math.min(20, Number(options.gap_continue_limit || options.gapContinueLimit || 3)));
    const enableExisting = options.enable_existing !== false && options.enableExisting !== false;
    const created = [];
    const existing = [];
    const enabled = [];
    const skipped = [];
    for (const group of groups) {
        if (created.length >= limit)
            break;
        const readiness = getReadyDailyDevMembers(group, configs);
        const groupName = readiness.normalizedGroup?.name || readiness.normalizedGroup?.id || group.id;
        if (!readiness.normalizedGroup || readiness.normalizedGroup.orchestrator?.enabled === false || readiness.readyMembers.length === 0) {
            skipped.push({
                group_id: group.id,
                group_name: groupName,
                reason: readiness.readyMembers.length === 0 ? "没有可写工作目录的子 Agent" : "群聊主 Agent 未启用",
            });
            continue;
        }
        const found = jobs.find((job) => isDailyDevCronJobForGroup(job, readiness.normalizedGroup.id));
        if (found) {
            if (found.enabled === false && enableExisting) {
                found.enabled = true;
                found.updated_at = now;
                found.next_run = found.next_run || null;
                enabled.push({ id: found.id, group_id: readiness.normalizedGroup.id, name: found.name });
            }
            else {
                existing.push({ id: found.id, group_id: readiness.normalizedGroup.id, name: found.name, enabled: found.enabled !== false });
            }
            continue;
        }
        const job = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: `日常业务开发 - ${groupName}`,
            target_type: "group",
            workflow_type: "daily_dev",
            requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
            project: "",
            group_id: readiness.normalizedGroup.id,
            schedule,
            prompt: String(options.prompt || DEFAULT_DAILY_DEV_CRON_PROMPT).trim(),
            priority: options.priority || "normal",
            backlog_batch_limit: backlogBatchLimit,
            import_shared_docs: options.import_shared_docs !== false && options.importSharedDocs !== false,
            continue_gaps: options.continue_gaps !== false && options.continueGaps !== false,
            gap_continue_limit: gapContinueLimit,
            enabled: true,
            created_at: now,
            updated_at: now,
            created_by: "daily_dev_autopilot_ensure",
            last_run: null,
            last_run_key: null,
            last_status: "never",
            last_result: "",
            last_task_id: null,
            run_count: 0,
            next_run: null,
        };
        jobs.push(job);
        created.push({
            id: job.id,
            name: job.name,
            group_id: job.group_id,
            group_name: groupName,
            schedule: job.schedule,
            ready_members: readiness.readyMembers.map((member) => member.project),
        });
    }
    if (created.length > 0 || enabled.length > 0)
        (0, db_1.saveCronJobs)(jobs);
    return {
        success: true,
        created: created.length,
        enabled: enabled.length,
        existing: existing.length,
        skipped: skipped.length,
        schedule,
        created_jobs: created,
        enabled_jobs: enabled,
        existing_jobs: existing,
        skipped_groups: skipped,
        jobs: (0, db_1.loadCronJobs)(),
    };
}
function buildDailyDevTaskDescription(payload) {
    const requiresCodeChanges = payload.requires_code_changes !== false && payload.requiresCodeChanges !== false;
    const lines = [
        "业务目标：",
        compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description),
        "",
        "开发范围：",
        compactFormText(payload.scope || payload.development_scope || payload.developmentScope),
        "",
        "业务/接口文档：",
        compactFormText(payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments),
        "",
        "验收标准：",
        compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria),
        "",
        "约束/注意事项：",
        compactFormText(payload.constraints || payload.notes, "无"),
        "",
        "代码变更要求：",
        requiresCodeChanges
            ? "必须产生实际代码/配置/文档文件变更；系统会用执行前后的工作区差异作为完成门禁。"
            : "本任务允许不产生代码变更，但仍必须说明调研、验证或方案产出。",
        "",
        "验证证据要求：",
        "必须至少提供一条可采信的已执行验证记录，例如实际运行的构建、类型检查、测试、lint、接口自测或人工核验结果；只写建议运行、未运行或失败验证不能完成。",
        "",
        "主 Agent 执行要求：",
        "- 先理解业务目标和文档，再判断需要哪些子 Agent 参与。",
        "- 把任务拆成可执行工作单，派给对应项目子 Agent 编写或修改代码。",
        "- 子 Agent 必须返回 CCM_AGENT_RECEIPT，说明修改文件、执行动作、验证方式和阻塞点。",
        requiresCodeChanges
            ? "- 这是开发交付任务；如果没有实际文件变更，不允许把任务判定为完成。"
            : "- 如无需改代码，必须在最终报告中说明原因和可验收产出。",
        "- 主 Agent 必须等待子 Agent 回执并复盘；发现缺口时继续追问或返工，不能提前宣布完成。",
        "- 最终报告要说明完成内容、涉及项目/文件、已执行验证、风险和仍需用户确认的事项。",
    ];
    return lines.join("\n");
}
function evaluateDailyDevIntakeQuality(payload, goal) {
    const textLen = (value) => String(value || "").replace(/\s+/g, " ").trim().length;
    const scope = payload.scope || payload.development_scope || payload.developmentScope;
    const documents = payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments;
    const acceptance = payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria;
    const checks = [
        { key: "business_goal", ok: textLen(goal) >= 8, label: "业务目标至少说明要解决什么问题" },
        { key: "scope", ok: textLen(scope) >= 8, label: "开发范围需要说明涉及页面、接口、模块或权限等边界" },
        { key: "documents", ok: textLen(documents) >= 12, label: "业务/接口文档需要包含字段、规则、链接或共享文件说明" },
        { key: "acceptance", ok: textLen(acceptance) >= 8, label: "验收标准需要说明主 Agent 最终必须证明什么" },
    ];
    const passed = checks.filter(item => item.ok).map(item => item.key);
    const missing = checks.filter(item => !item.ok).map(item => item.label);
    const pass = checks[0].ok && checks[3].ok && (checks[1].ok || checks[2].ok);
    return {
        pass,
        score: passed.length,
        total: checks.length,
        passed,
        missing,
        message: pass
            ? "业务需求信息足够创建日常开发任务"
            : "业务需求信息不足，主 Agent 可能无法稳定拆分给子 Agent",
    };
}
function buildTaskContinuationBlock(message) {
    return [
        "",
        "---",
        "",
        `用户补充说明（${new Date().toISOString()}）：`,
        compactFormText(message),
        "",
        "继续执行要求：",
        "- 主 Agent 必须结合原始任务和本次补充说明继续推进。",
        "- 如果此前有阻塞、缺口或返工项，优先用补充说明消解后再派发子 Agent。",
        "- 不要丢弃已有任务上下文、回执和验收标准；最终报告需要覆盖完整任务。"
    ].join("\n");
}
function createTask(task) {
    const tasks = (0, db_1.loadTasks)();
    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: task.title,
        description: task.description || "",
        target_project: task.target_project,
        group_id: task.group_id || null,
        assign_type: task.assign_type || "project",
        status: "pending",
        priority: task.priority || "normal",
        auto_execute: !!(task.auto_execute || task.autoExecute),
        workflow_type: task.workflow_type || task.workflowType || "general",
        business_goal: task.business_goal || task.businessGoal || "",
        acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || "",
        source_documents: task.source_documents || task.sourceDocuments || "",
        requires_code_changes: task.requires_code_changes ?? task.requiresCodeChanges ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
        requires_verification: task.requires_verification ?? task.requiresVerification ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
        workflow_meta: task.workflow_meta || task.workflowMeta || null,
        followups: Array.isArray(task.followups) ? task.followups : [],
        cron_job_id: task.cron_job_id || null,
        cron_trigger: task.cron_trigger || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    tasks.push(newTask);
    (0, db_1.saveTasks)(tasks);
    return newTask;
}
function updateTask(id, updates) {
    const tasks = (0, db_1.loadTasks)();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
    if (updates.status === "done") {
        tasks[idx].completed_at = updates.completed_at || new Date().toISOString();
    }
    else if (updates.status && updates.status !== "done") {
        delete tasks[idx].completed_at;
    }
    (0, db_1.saveTasks)(tasks);
    return tasks[idx];
}
function canCompleteDailyDevFromDeliverySummary(task, execution, summary) {
    if (task?.workflow_type !== "daily_dev")
        return false;
    if (!summary || execution?.status === "failed")
        return false;
    const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || execution?.receipt?.status === "done"
        || task?.receipt?.status === "done";
    const hasBlockingReceipt = receiptStatuses.some((item) => ["failed", "blocked", "needs_info", "partial"].includes(String(item?.status || "")));
    const actualChangeCount = Number(summary.actual_file_change_count || task?.file_changes?.count || execution?.fileChanges?.count || 0);
    const executedVerificationCount = Number(summary.verification_executed?.length || 0);
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const assignmentCount = Number(summary.assignment_count || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || 0);
    if (hasBlockingReceipt)
        return false;
    if (coordinationPlanCount <= 0 || assignmentCount <= 0 || workerNotificationCount <= 0)
        return false;
    if (!hasDoneReceipt || !summary.has_final_review)
        return false;
    if (taskRequiresCodeChanges(task) && actualChangeCount <= 0)
        return false;
    if (taskRequiresVerification(task) && executedVerificationCount <= 0)
        return false;
    if (taskRequiresVerification(task) && summary.verification_required_gate_passed === false)
        return false;
    return true;
}
function validateTaskManualStatusUpdate(current, updates) {
    if (updates?.status !== "done")
        return null;
    if (current?.workflow_type !== "daily_dev")
        return null;
    const summary = updates.delivery_summary || current.delivery_summary || null;
    const missing = [];
    const review = updates.review || current.review || null;
    const receiptStatuses = Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : [];
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || current.receipt?.status === "done"
        || updates.receipt?.status === "done";
    const requiresCodeChanges = taskRequiresCodeChanges(current);
    const requiresVerification = taskRequiresVerification(current);
    const actualChangeCount = Number(summary?.actual_file_change_count || current.file_changes?.count || 0);
    const executedVerificationCount = Number(summary?.verification_executed?.length || 0);
    const coordinationPlanCount = Number(summary?.coordination_plan_count || 0);
    const assignmentCount = Number(summary?.assignment_count || 0);
    const workerNotificationCount = Number(summary?.worker_notification_count || 0);
    if (!summary)
        missing.push("交付摘要");
    if (coordinationPlanCount <= 0)
        missing.push("主 Agent 协调计划");
    if (assignmentCount <= 0)
        missing.push("主 Agent 派发证据");
    if (workerNotificationCount <= 0)
        missing.push("Worker 通知");
    if (!hasDoneReceipt)
        missing.push("子 Agent 完成回执");
    if (!summary?.has_final_review && !review)
        missing.push("主 Agent 最终复盘");
    if (requiresCodeChanges && actualChangeCount <= 0)
        missing.push("系统实际捕获的代码变更");
    if (requiresVerification && executedVerificationCount <= 0)
        missing.push("已执行验证记录");
    if (requiresVerification && summary?.verification_required_gate_passed === false)
        missing.push("项目配置验证命令执行证据");
    if (missing.length === 0)
        return null;
    return `业务开发任务不能手动标记完成，缺少验收证据：${missing.join("、")}。请通过队列让主 Agent 继续执行，或在任务报告中补齐证据后由系统完成。`;
}
function buildTaskGapContinuationDraft(task) {
    const summary = task?.delivery_summary || {};
    const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
    const assignmentCount = Number(summary.assignment_count || assignmentEvidence.length || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || workerNotifications.length || 0);
    const relatedWorkers = uniqueStrings([
        ...workerNotifications.map((item) => item.task_id),
        ...assignmentEvidence.map((item) => item.project),
        ...((Array.isArray(summary.receipts) ? summary.receipts : []).map((item) => item.agent)),
        ...((Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []).map((item) => item.agent)),
        ...((Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []).map((item) => item.agent)),
    ].filter(Boolean)).slice(0, 8);
    const lines = [
        `请继续推进任务：${task?.title || ""}`,
        "",
    ];
    if (relatedWorkers.length) {
        lines.push("同 Worker 续跑目标：");
        relatedWorkers.forEach(worker => lines.push(`- ${worker}：continuationStrategy=same_worker_scratchpad，优先承接上一轮 Worker 通知和回执继续处理。`));
        lines.push("");
    }
    if (workerNotifications.length) {
        lines.push("上一轮 Worker 通知：");
        workerNotifications.slice(0, 10).forEach((item) => {
            lines.push(`- ${item.task_id || "未知 Worker"}：通知 ${item.status || "unknown"} / 回执 ${item.receipt_status || "missing"}；${String(item.summary || item.result || "无摘要").slice(0, 500)}`);
        });
        lines.push("");
    }
    const blockers = [
        ...(Array.isArray(summary.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary.needs) ? summary.needs : []),
    ].filter(Boolean);
    if (blockers.length) {
        lines.push("需要处理的阻塞/待补充：");
        blockers.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    const coordinationGaps = [
        coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据：请先重新理解业务文档，输出可验收的协调计划，再派发 Worker。",
        assignmentCount > 0 ? "" : "缺少主 Agent 派发证据：请生成 self-contained assignment，并明确派发给目标项目子 Agent。",
        workerNotificationCount > 0 ? "" : "缺少 Worker 通知：请让目标子 Agent 实际执行并返回 task-notification 与 CCM_AGENT_RECEIPT。",
    ].filter(Boolean);
    if (coordinationGaps.length) {
        lines.push("需要补齐的主 Agent 协作证据：");
        coordinationGaps.forEach(item => lines.push(`- ${item}`));
        lines.push("");
    }
    if (Array.isArray(summary.verification_required_missing) && summary.verification_required_missing.length) {
        lines.push("需要补齐的项目验证命令证据：");
        summary.verification_required_missing.slice(0, 10).forEach((item) => {
            const required = Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置验证命令";
            lines.push(`- ${item?.agent || "未知 Agent"}：请实际运行并回执 ${required}`);
        });
        lines.push("");
    }
    if (Array.isArray(summary.verification_suggested) && summary.verification_suggested.length) {
        lines.push("以下验证只是建议或未执行，需要改为实际执行结果：");
        summary.verification_suggested.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    if (Array.isArray(summary.verification_failed) && summary.verification_failed.length) {
        lines.push("以下验证失败，需要修复后重新验证：");
        summary.verification_failed.slice(0, 10).forEach((item) => lines.push(`- ${String(item).slice(0, 500)}`));
        lines.push("");
    }
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].filter((item) => item && item.status && item.status !== "done");
    if (receipts.length) {
        lines.push("需要跟进的子 Agent 回执：");
        receipts.slice(0, 8).forEach((item) => {
            lines.push(`- ${item.agent || "未知 Agent"}：${item.status || "unknown"}；${String(item.summary || item.message || "无摘要").slice(0, 500)}`);
            const needs = [
                ...(Array.isArray(item.blockers) ? item.blockers : []),
                ...(Array.isArray(item.needs) ? item.needs : []),
            ].filter(Boolean);
            needs.slice(0, 5).forEach((need) => lines.push(`  - ${String(need).slice(0, 500)}`));
        });
        lines.push("");
    }
    if (task?.review?.content || task?.review?.summary) {
        lines.push("主 Agent 复盘提示：");
        lines.push(String(task.review.content || task.review.summary).slice(0, 1200));
        lines.push("");
    }
    lines.push("继续执行要求：");
    lines.push("- 主 Agent 先判断这些阻塞是否已被本次补充消解。");
    lines.push("- 如可继续，优先派发给相关子 Agent 返工，并保持同 Worker scratchpad 续跑；不要重新派给无关 Agent。");
    lines.push("- 子 Agent 返工工作单必须写清上一轮通知/回执缺口、补齐动作、实际文件变更和验证命令。");
    lines.push("- 完成后仍需主 Agent 协调计划、派发证据、Worker 通知、子 Agent 回执、主 Agent 复盘、实际变更证据和已执行验证记录。");
    return lines.filter((line, index, arr) => line || arr[index - 1]).join("\n").trim();
}
function hasDailyDevContinuationGaps(task) {
    if (!task || task.workflow_type !== "daily_dev")
        return false;
    if (task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id))
        return false;
    const summary = task.delivery_summary || {};
    const hasSummaryGaps = [
        summary.blockers,
        summary.needs,
        summary.verification_required_missing,
        summary.verification_suggested,
        summary.verification_failed,
    ].some((items) => Array.isArray(items) && items.length > 0);
    const hasReceiptGaps = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].some((item) => item?.status && item.status !== "done");
    const hasWorkerNotificationGaps = (Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [])
        .some((item) => {
        const status = String(item?.status || "").trim();
        const receiptStatus = String(item?.receipt_status || "").trim();
        return ["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status)
            || (!!receiptStatus && receiptStatus !== "done");
    });
    const hasCoordinationEvidenceGaps = Number(summary.coordination_plan_count || 0) <= 0
        || Number(summary.assignment_count || 0) <= 0
        || Number(summary.worker_notification_count || 0) <= 0;
    return hasSummaryGaps || hasReceiptGaps || hasWorkerNotificationGaps || hasCoordinationEvidenceGaps;
}
function continueDailyDevTasksFromGaps(ctx, options = {}) {
    const groupId = String(options.group_id || options.groupId || "").trim();
    const limit = Math.max(1, Math.min(50, Number(options.limit || 5)));
    const maxPerTask = Math.max(1, Math.min(20, Number(options.max_per_task || options.maxPerTask || 3)));
    const candidates = (0, db_1.loadTasks)()
        .filter(task => hasDailyDevContinuationGaps(task))
        .filter(task => !groupId || task.group_id === groupId)
        .filter(task => Number(task.auto_gap_continue_count || 0) < maxPerTask)
        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
        .slice(0, limit);
    const results = candidates.map((task) => {
        const message = buildTaskGapContinuationDraft(task);
        const result = continueTaskWithMessage(task.id, message, ctx, {
            source: options.source || "autopilot_gap_rework",
            auto_execute: options.auto_execute,
            autoExecute: options.autoExecute,
            status_detail: "自动驾驶已按交付缺口生成返工说明，等待主 Agent 继续执行",
        });
        return {
            task_id: task.id,
            title: task.title,
            group_id: task.group_id,
            ...result,
            task: undefined,
            continuation_message: message,
        };
    });
    return {
        success: true,
        total_candidates: candidates.length,
        continued: results.filter((item) => item.success).length,
        queued: results.filter((item) => item.queued).length,
        blocked: results.filter((item) => item.queue_result?.blocked).length,
        failed: results.filter((item) => !item.success).length,
        limit,
        max_per_task: maxPerTask,
        results,
    };
}
function continueTaskWithMessage(taskId, message, ctx, options = {}) {
    if (!taskId)
        return { success: false, status: 400, error: "缺少任务 ID" };
    if (!compactFormText(message, ""))
        return { success: false, status: 400, error: "请输入补充说明" };
    if (runningTaskIds.has(taskId))
        return { success: false, status: 409, error: "任务正在执行中，请等待本轮执行结束后再补充" };
    const tasks = (0, db_1.loadTasks)();
    const current = tasks.find(t => t.id === taskId);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    const followup = {
        time: new Date().toISOString(),
        message: compactFormText(message, ""),
        source: options.source || "user",
    };
    const nextDescription = `${current.description || ""}${buildTaskContinuationBlock(followup.message)}`;
    const updates = {
        description: nextDescription,
        followups: [...(Array.isArray(current.followups) ? current.followups : []), followup],
        status: "pending",
        is_paused: false,
        paused: false,
        result: "",
        final_report: "",
        status_detail: options.status_detail || "已收到补充说明，等待主 Agent 继续执行",
        receipt: null,
        review: null,
        delivery_summary: null,
        last_continue_at: followup.time,
        last_continue_source: followup.source,
    };
    if (/gap_rework/i.test(followup.source)) {
        updates.auto_gap_continue_count = Number(current.auto_gap_continue_count || 0) + 1;
        updates.last_auto_gap_continue_at = followup.time;
    }
    const task = updateTask(taskId, updates);
    addTaskLog(taskId, "info", `任务补充说明并继续执行：${followup.message.slice(0, 300)}`);
    if (task?.assign_type === "group" && task.group_id) {
        const group = loadGroups().find(g => g.id === task.group_id);
        const target = group ? (0, group_orchestrator_1.getCoordinatorMember)(group).project : "coordinator";
        appendGroupMessage(task.group_id, {
            id: "m" + Date.now().toString(36) + "cont" + crypto.randomBytes(2).toString("hex"),
            role: "user",
            target,
            content: `任务补充说明：${followup.message}`,
            timestamp: followup.time,
            task_id: taskId,
        });
        safeAddGroupLog(task.group_id, "info", "task", `任务收到补充说明并继续执行: ${task.title}`, { task_id: taskId });
    }
    let queueResult = null;
    if (options.auto_execute !== false && options.autoExecute !== false) {
        queueResult = enqueueTask(taskId, ctx);
    }
    return {
        success: true,
        task,
        message: followup.message,
        queued: !!queueResult?.queued,
        queue_result: queueResult,
        queue_status: getQueueStatus(),
    };
}
function retryTask(id, ctx, reason = "", autoExecute = true) {
    if (runningTaskIds.has(id)) {
        return { success: false, status: 409, error: "任务正在执行中，请等待本轮结束后再重试" };
    }
    const current = (0, db_1.loadTasks)().find(t => t.id === id);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    if (current.status === "done")
        return { success: false, status: 409, error: "已完成任务不能重试" };
    const retryCount = Number(current.retry_count || 0) + 1;
    const retryReason = compactFormText(reason, "用户重新入队");
    const task = updateTask(id, {
        status: "pending",
        is_paused: false,
        paused: false,
        queued_at: null,
        started_at: null,
        result: "",
        final_report: "",
        status_detail: `第 ${retryCount} 次重试，等待主 Agent 重新执行`,
        receipt: null,
        review: null,
        file_changes: null,
        delivery_summary: null,
        retry_count: retryCount,
        last_retry_at: new Date().toISOString(),
        last_retry_reason: retryReason,
    });
    addTaskLog(id, "info", `任务重新入队重试：${retryReason}`);
    const queueResult = autoExecute ? enqueueTask(id, ctx) : null;
    return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() };
}
function retryRuntimeFailedTasks(ctx, options = {}) {
    const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
    const dryRun = !!(options.dry_run || options.dryRun);
    const limit = Math.max(1, Math.min(100, Number(options.limit || 100)));
    const candidates = (0, db_1.loadTasks)()
        .filter(isRecoverableRuntimeFailure)
        .sort((a, b) => Date.parse(a.updated_at || a.created_at || "") - Date.parse(b.updated_at || b.created_at || ""))
        .slice(0, limit);
    if (dryRun) {
        return {
            success: true,
            dry_run: true,
            total_recoverable: candidates.length,
            retried: 0,
            queued: 0,
            auto_execute: autoExecute,
            results: candidates.map((task) => ({
                task_id: task.id,
                title: task.title,
                status: task.status,
                retry_count: Number(task.retry_count || 0),
                previous_failure: getTaskFailureText(task).slice(0, 500),
            })),
            queue_status: getQueueStatus(),
        };
    }
    const results = candidates.map((task) => {
        const reason = options.reason || "执行通道恢复后批量重试";
        const result = retryTask(task.id, ctx, reason, autoExecute);
        return {
            task_id: task.id,
            title: task.title,
            previous_failure: getTaskFailureText(task).slice(0, 500),
            ...result,
        };
    });
    return {
        success: true,
        total_recoverable: candidates.length,
        retried: results.filter((item) => item.success).length,
        queued: results.filter((item) => item.queued).length,
        auto_execute: autoExecute,
        results,
        queue_status: getQueueStatus(),
    };
}
function deleteTask(id) {
    const tasks = (0, db_1.loadTasks)().filter(t => t.id !== id);
    (0, db_1.saveTasks)(tasks);
}
function handleCollaborationApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/tasks" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { tasks: (0, db_1.loadTasks)() });
        return true;
    }
    if (pathname === "/api/tasks/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const task = createTask(payload);
                let queueResult = null;
                if (payload.auto_execute || payload.autoExecute) {
                    queueResult = enqueueTask(task.id, ctx);
                }
                (0, utils_1.sendJson)(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                if (!groupId)
                    return (0, utils_1.sendJson)(res, { error: "请选择目标开发群聊" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === groupId);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "开发群聊不存在" }, 404);
                const groupReadiness = validateDailyDevGroupReady(group);
                const goal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
                if (!goal)
                    return (0, utils_1.sendJson)(res, { error: "请输入业务目标" }, 400);
                const quality = evaluateDailyDevIntakeQuality(payload, goal);
                const forceQualityGate = !!(payload.force_quality_gate || payload.forceQualityGate || payload.force);
                if (!quality.pass && !forceQualityGate) {
                    return (0, utils_1.sendJson)(res, {
                        success: false,
                        needs_confirmation: true,
                        error: quality.message,
                        quality,
                    }, 422);
                }
                const title = compactFormText(payload.title, goal.slice(0, 60));
                const backlogFile = persistDailyDevBacklogFile(groups, group, payload, title, goal);
                const sourceDocuments = [
                    payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "",
                    backlogFile ? `群聊需求池文件：${backlogFile.name}` : "",
                ].filter(Boolean).join("\n\n");
                const taskPayload = { ...payload, documents: sourceDocuments, source_documents: sourceDocuments };
                const task = createTask({
                    title,
                    description: buildDailyDevTaskDescription(taskPayload),
                    target_project: groupReadiness.coordinator.project,
                    group_id: groupId,
                    assign_type: "group",
                    priority: payload.priority || "normal",
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    workflow_type: "daily_dev",
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                    requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
                    business_goal: goal,
                    acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
                    source_documents: sourceDocuments,
                    workflow_meta: {
                        ...(payload.workflow_meta || payload.workflowMeta || {}),
                        intake_quality: quality,
                        intake: backlogFile ? {
                            backlog_file: backlogFile.name,
                            persisted_at: new Date().toISOString(),
                            source: "create-daily-dev",
                        } : null,
                    },
                });
                if (backlogFile) {
                    markDailyDevBacklogStatus(groupId, backlogFile.name, "queued", {
                        task_id: task.id,
                        result: "业务开发任务已创建并关联此需求池条目",
                    });
                }
                let queueResult = null;
                if (task.auto_execute) {
                    queueResult = enqueueTask(task.id, ctx);
                    if (backlogFile && queueResult?.blocked) {
                        markDailyDevBacklogStatus(groupId, backlogFile.name, "queued", {
                            task_id: task.id,
                            result: queueResult.message || "任务已创建，等待执行通道恢复",
                        });
                    }
                }
                (0, utils_1.sendJson)(res, { success: true, task, backlog_file: backlogFile?.name || null, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
        const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
        const items = listDailyDevBacklogs(groupId);
        const counts = items.reduce((acc, item) => {
            acc[item.status] = Number(acc[item.status] || 0) + 1;
            return acc;
        }, {});
        (0, utils_1.sendJson)(res, { success: true, items, counts });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/status" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                const name = payload.name || payload.file || payload.fileName;
                const status = String(payload.status || "").trim();
                if (!groupId || !name || !status)
                    return (0, utils_1.sendJson)(res, { error: "缺少 group_id、name 或 status" }, 400);
                if (!["ready", "queued", "in_progress", "blocked", "done", "failed"].includes(status)) {
                    return (0, utils_1.sendJson)(res, { error: "不支持的需求池状态" }, 400);
                }
                const file = markDailyDevBacklogStatus(groupId, name, status, {
                    result: payload.reason || `用户手动设置为 ${status}`,
                });
                if (!file)
                    return (0, utils_1.sendJson)(res, { error: "需求池文件不存在" }, 404);
                const items = listDailyDevBacklogs(groupId);
                (0, utils_1.sendJson)(res, { success: true, file, items });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/import-shared" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = importSharedDocsToDailyDevBacklog({
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    force: !!payload.force,
                    priority: payload.priority || "normal",
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/dispatch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                const name = payload.name || payload.file || payload.fileName;
                if (!groupId || !name)
                    return (0, utils_1.sendJson)(res, { error: "缺少 group_id 或 name" }, 400);
                const result = dispatchDailyDevBacklog(groupId, name, ctx, {
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    force: !!payload.force,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/dispatch-ready" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = dispatchReadyDailyDevBacklogs(ctx, {
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, ...updates } = JSON.parse(body);
                const current = (0, db_1.loadTasks)().find(t => t.id === id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const validationError = validateTaskManualStatusUpdate(current, updates);
                if (validationError)
                    return (0, utils_1.sendJson)(res, { error: validationError }, 409);
                const task = updateTask(id, updates);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, task });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/continue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                const message = compactFormText(payload.message || payload.followup || payload.note, "");
                const result = continueTaskWithMessage(taskId, message, ctx, {
                    source: payload.source || "user",
                    auto_execute: payload.auto_execute,
                    autoExecute: payload.autoExecute,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/continue-from-gaps" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const current = (0, db_1.loadTasks)().find(t => t.id === taskId);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                if (current.status === "done")
                    return (0, utils_1.sendJson)(res, { error: "已完成任务不需要按缺口继续" }, 409);
                const message = compactFormText(payload.message, "") || buildTaskGapContinuationDraft(current);
                const result = continueTaskWithMessage(taskId, message, ctx, {
                    source: payload.source || "auto_gap_rework",
                    auto_execute: payload.auto_execute,
                    autoExecute: payload.autoExecute,
                    status_detail: "已按交付缺口生成返工说明，等待主 Agent 继续执行",
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, {
                    ...result,
                    continuation_message: message,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                deleteTask(id);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const queueResult = enqueueTask(task_id, ctx);
                (0, utils_1.sendJson)(res, { success: true, message: queueResult.message, queued: queueResult.queued, queue_result: queueResult, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/retry" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
                const result = retryTask(taskId, ctx, payload.reason || payload.message || "", autoExecute);
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/retry-runtime-failures" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, retryRuntimeFailedTasks(ctx, payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue-batch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_ids } = JSON.parse(body);
                if (!task_ids || !Array.isArray(task_ids))
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID 列表" }, 400);
                const results = task_ids.map(id => ({ task_id: id, ...enqueueTask(id, ctx) }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, { success: true, message: `${queuedCount}/${task_ids.length} 个任务已加入队列`, results, queue_status: getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, getQueueStatus());
        return true;
    }
    if (pathname === "/api/tasks/watchdog" && req.method === "GET") {
        const staleMs = parsed.query.stale_ms ? Number(parsed.query.stale_ms) : TASK_WATCHDOG_STALE_MS;
        (0, utils_1.sendJson)(res, getTaskWatchdogStatus(staleMs));
        return true;
    }
    if (pathname === "/api/tasks/watchdog/resume" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, runTaskWatchdog(ctx));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tasks/queue/resume" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, { success: true, ...resumeTaskQueues(ctx) });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tasks/queue/clear" && req.method === "POST") {
        taskQueues.clear();
        (0, utils_1.sendJson)(res, { success: true, message: "队列已清空" });
        return true;
    }
    if (pathname === "/api/tasks/logs" && req.method === "GET") {
        const taskId = parsed.query.task_id;
        const limit = parseInt(parsed.query.limit) || 50;
        if (!taskId)
            return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
        const logs = getTaskLogs(taskId, limit);
        (0, utils_1.sendJson)(res, { success: true, logs });
        return true;
    }
    if (pathname === "/api/tasks/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                clearTaskLogs(task_id);
                (0, utils_1.sendJson)(res, { success: true, message: "日志已清空" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 群聊主 Agent / Orchestrator API ===
    if (pathname === "/api/orchestrator/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)((0, group_orchestrator_1.loadOrchestratorConfig)()) });
        return true;
    }
    if (pathname === "/api/orchestrator/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, group_orchestrator_1.saveOrchestratorConfig)(updates);
                (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)(config) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groups = loadGroups();
                const group = payload.group_id
                    ? groups.find(g => g.id === payload.group_id)
                    : groups[0];
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "请先创建一个群聊并添加项目 Agent" }, 400);
                const message = String(payload.message || "帮我排查登录页面调用接口失败的问题，前后端都看一下").trim();
                const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
                const result = await (0, group_orchestrator_1.runGroupOrchestrator)({ group, message, source: "test", sharedFilesContext });
                (0, utils_1.sendJson)(res, { success: true, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/diagnostics" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildDailyDevAgentDiagnostics());
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-autopilot/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = runDailyDevAutopilotOnce(ctx, {
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    import_shared_docs: payload.import_shared_docs !== false && payload.importSharedDocs !== false,
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-autopilot/ensure-cron" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, ensureDailyDevAutopilotCronJobs(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-rehearsal" && (req.method === "GET" || req.method === "POST")) {
        if (req.method === "GET") {
            try {
                (0, utils_1.sendJson)(res, buildDailyDevWorkflowRehearsal());
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, buildDailyDevWorkflowRehearsal(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-smoke-task" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, createDailyDevSmokeTask(payload, ctx));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-smoke-status" && (req.method === "GET" || req.method === "POST")) {
        if (req.method === "GET") {
            try {
                (0, utils_1.sendJson)(res, getDailyDevSmokeStatus({
                    task_id: parsed.query.task_id || parsed.query.taskId,
                }));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, getDailyDevSmokeStatus(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/agent-cli-probe" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await runAgentCliProbe(payload, ctx);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : (result.blocked ? 409 : 500));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/agent-recovery-monitor/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await runAgentRecoveryMonitorOnce(ctx, payload);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : 409);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === 群聊 API ===
    if (pathname === "/api/groups" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { groups: loadGroups() });
        return true;
    }
    if (pathname === "/api/groups/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, members } = JSON.parse(body);
                const groups = loadGroups();
                const id = "g" + Date.now().toString(36);
                const allMembers = Array.isArray(members) ? members : [];
                const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
                    id, name, members: allMembers,
                    created_at: new Date().toISOString(),
                });
                groups.push(group);
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/members" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, add, remove } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (add) {
                    for (const m of add) {
                        if (!group.members.find((x) => x.project === m.project)) {
                            group.members.push(m);
                        }
                    }
                }
                if (remove) {
                    const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
                    group.members = group.members.filter((m) => !remove.includes(m.project) || m.project === coordinatorProject || m.role === "coordinator");
                }
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                const groups = loadGroups().filter(g => g.id !== id);
                saveGroups(groups);
                try {
                    fs.unlinkSync(path.join(utils_1.GROUP_MESSAGES_DIR, `${id}.json`));
                }
                catch { }
                try {
                    fs.unlinkSync(getGroupMemoryFile(id));
                }
                catch { }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/rename" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, name } = JSON.parse(body);
                if (!name || !name.trim())
                    return (0, utils_1.sendJson)(res, { error: "群聊名称不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                group.name = name.trim();
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, group });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
        (0, utils_1.sendJson)(res, { tools: group.tools || { mcp: [], skill: [] } });
        return true;
    }
    if (pathname === "/api/groups/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, tools } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                group.tools = tools;
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, tools: group.tools });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
        const before = JSON.stringify(group.shared_files || []);
        group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
        if (JSON.stringify(group.shared_files) !== before)
            saveGroups(groups);
        (0, utils_1.sendJson)(res, { files: group.shared_files || [] });
        return true;
    }
    if (pathname === "/api/groups/shared/add" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name, content } = JSON.parse(body);
                if (!name || !content)
                    return (0, utils_1.sendJson)(res, { error: "文件名和内容不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                const existing = group.shared_files.findIndex((f) => f.name === name);
                if (existing >= 0) {
                    group.shared_files[existing].content = content;
                    group.shared_files[existing].type = "text";
                    group.shared_files[existing].readable = true;
                    group.shared_files[existing].updated_at = new Date().toISOString();
                }
                else {
                    group.shared_files.push({
                        name,
                        type: "text",
                        readable: true,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                group.shared_files = group.shared_files.filter((f) => f.name !== name);
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/shared/import" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, file_names } = JSON.parse(body);
                if (!file_names || !Array.isArray(file_names))
                    return (0, utils_1.sendJson)(res, { error: "请提供文件名列表" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                let imported = 0;
                for (const name of file_names) {
                    const filePath = ctx.getSharedFilePath(name);
                    if (filePath && fs.existsSync(filePath)) {
                        const record = ctx.createSharedFileRecord(name, "global");
                        if (!record)
                            continue;
                        const existing = group.shared_files.findIndex((f) => f.name === name);
                        if (existing >= 0) {
                            group.shared_files[existing] = {
                                ...group.shared_files[existing],
                                ...record,
                                created_at: group.shared_files[existing].created_at || record.created_at,
                                updated_at: new Date().toISOString()
                            };
                        }
                        else {
                            group.shared_files.push(record);
                        }
                        imported++;
                    }
                }
                saveGroups(groups);
                (0, utils_1.sendJson)(res, { success: true, imported, files: group.shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/messages" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const limit = parseInt(parsed.query.limit) || 100;
        const messages = getGroupMessages(groupId).slice(-limit);
        (0, utils_1.sendJson)(res, { messages });
        return true;
    }
    if (pathname === "/api/groups/memory" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const project = parsed.query.project ? String(parsed.query.project) : "";
        const memory = saveGroupMemory(groupId, loadGroupMemory(groupId));
        (0, utils_1.sendJson)(res, {
            success: true,
            memory,
            context: buildGroupMemoryContext(memory),
            agentPacket: project ? buildAgentMemoryPacket(groupId, project) : "",
        });
        return true;
    }
    if (pathname === "/api/groups/logs" && req.method === "GET") {
        const groupId = parsed.query.id;
        const limit = parseInt(parsed.query.limit) || 100;
        const category = parsed.query.category;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        const logs = loadGroupLogs();
        let groupLogs = logs[groupId] || [];
        if (category) {
            groupLogs = groupLogs.filter((l) => l.category === category);
        }
        (0, utils_1.sendJson)(res, { logs: groupLogs.slice(-limit) });
        return true;
    }
    if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id } = JSON.parse(body);
                const logs = loadGroupLogs();
                delete logs[group_id];
                saveGroupLogs(logs);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return (0, utils_1.sendJson)(res, { error: "缺少群聊 ID" }, 400);
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);
        const logs = loadGroupLogs();
        const initialCount = (logs[groupId] || []).length;
        let lastCount = initialCount;
        const interval = setInterval(() => {
            try {
                const currentLogs = loadGroupLogs();
                const groupLogs = currentLogs[groupId] || [];
                if (groupLogs.length > lastCount) {
                    const newLogs = groupLogs.slice(lastCount);
                    for (const log of newLogs) {
                        res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
                    }
                    lastCount = groupLogs.length;
                }
            }
            catch (e) {
                res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
            }
        }, 1000);
        req.on("close", () => {
            clearInterval(interval);
        });
        return true;
    }
    if (pathname === "/api/groups/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleGroupSend = async (payload, uploadedFiles = []) => {
            try {
                const { group_id, target_project, message, client_message_id } = payload;
                const userMessage = String(message || "").trim();
                const uploadedFilesContext = ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
                const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
                const messageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
                const userMessageForHistory = attachmentSummary
                    ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
                    : userMessage;
                if (!messageForAgent)
                    return (0, utils_1.sendJson)(res, { error: "消息或附件不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                const routing = (0, group_orchestrator_1.selectGroupTargets)(group, target_project);
                const isBroadcast = routing.isBroadcast;
                const isOrchestrated = routing.orchestrated;
                const targetMembers = routing.members;
                if (targetMembers.length === 0) {
                    return (0, utils_1.sendJson)(res, { error: "没有找到目标项目" }, 400);
                }
                const userMsg = {
                    id: client_message_id ? String(client_message_id) : "m" + Date.now().toString(36),
                    role: "user",
                    target: routing.targetLabel,
                    content: userMessageForHistory,
                    timestamp: new Date().toISOString(),
                };
                appendGroupMessage(group_id, userMsg);
                for (const member of targetMembers) {
                    ctx.broadcastPetSpeech(member.project, { role: "user", text: userMessageForHistory, final: true, source: "group" });
                }
                addGroupLog(group_id, "info", "message", `用户发送消息给 ${isOrchestrated ? '主 Agent' : isBroadcast ? '所有人' : target_project}`, {
                    message: userMessageForHistory.substring(0, 200),
                    target: routing.targetLabel,
                    is_broadcast: isBroadcast,
                    orchestrated: isOrchestrated
                });
                const configs = (0, db_1.getConfigs)();
                if (isBroadcast && isOrchestrated) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                    writeSse(res, {
                        type: "status",
                        text: `🧠 主 Agent ${coordinator.project} 正在协调群聊...`,
                        agent: coordinator.project
                    });
                    ctx.setAgentActivity(coordinator.project, "working", "主 Agent 正在协调群聊", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(coordinator.project, { role: "status", text: "主 Agent 正在协调群聊...", source: "group" });
                    updateGroupMemory(group_id, {
                        goal: userMessageForHistory,
                        currentPhase: "understanding",
                        decision: "用户把消息交给主 Agent 协调",
                        reason: routing.targetLabel,
                        nextAction: "主 Agent 先判断是否需要派发子 Agent",
                    });
                    const recentMsgs = getGroupMessages(group_id).slice(-20);
                    const memoryContext = buildGroupMemoryContext(loadGroupMemory(group_id));
                    const context = [memoryContext, (0, group_orchestrator_1.buildRecentGroupContext)(recentMsgs)].filter(Boolean).join("\n\n");
                    const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
                    const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
                        group,
                        message: messageForAgent,
                        context,
                        source: "user",
                        sharedFilesContext,
                    });
                    try {
                        const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
                        const outputText = coordinatorResult.content;
                        const planAssignments = normalizePlanAssignments(coordinatorResult.assignments || []);
                        const dispatchPolicy = coordinatorResult.dispatchPolicy || null;
                        const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "主 Agent 初始计划");
                        writeSse(res, {
                            type: "agent_done",
                            agent: coordinator.project,
                            text: outputText,
                            messageId: responseMessageId,
                            assignments: planAssignments,
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy,
                            coordinationPlan: coordinatorResult.coordinationPlan || null,
                            workflow: workflowMeta,
                        });
                        appendGroupMessage(group_id, {
                            id: responseMessageId,
                            role: "assistant",
                            agent: coordinator.project,
                            content: outputText,
                            timestamp: new Date().toISOString(),
                            assignments: planAssignments,
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy,
                            coordinationPlan: coordinatorResult.coordinationPlan || null,
                            workflow: workflowMeta,
                        });
                        updateGroupMemory(group_id, {
                            currentPhase: workflowMeta.phase,
                            decision: `${dispatchPolicy?.action || "unknown"}：${dispatchPolicy?.reason || "主 Agent 已完成派发判断"}`,
                            reason: dispatchPolicy?.risk || "",
                            nextAction: dispatchPolicy?.nextStep || (planAssignments.length ? "等待子 Agent 回执" : "等待用户继续补充"),
                        });
                        addGroupLog(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300),
                            runtime: "coded-orchestrator",
                        });
                        let crossOutputs = [];
                        const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 主 Agent 正在分派子 Agent..." });
                            const execOrder = coordinatorResult.executionOrder || "parallel";
                            crossOutputs = await processCrossAgents(group_id, group, coordinator.project, outputText, validMentions, configs, ctx, res, 0, new Set(), execOrder, responseMessageId);
                            await runCoordinatorReviewLoop({
                                groupId: group_id,
                                group,
                                userMessage: messageForAgent,
                                coordinatorOutput: outputText,
                                crossOutputs,
                                configs,
                                ctx,
                                streamRes: res,
                                executionOrder: execOrder,
                            });
                        }
                        writeSse(res, { type: "done", messageId: responseMessageId });
                        res.end();
                    }
                    catch (err) {
                        writeSse(res, { type: "error", text: err.message });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                if (isBroadcast) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: `🧠 并行处理中，${targetMembers.length} 个 Agent 同时工作...` })}\n\n`);
                    for (const member of targetMembers) {
                        ctx.setAgentActivity(member.project, "working", "群聊协作中", { tab: "groups", groupId: group_id });
                        ctx.broadcastPetSpeech(member.project, { role: "status", text: "群聊协作中，正在思考...", source: "group" });
                    }
                    const getAgentPrompt = (member) => {
                        const recentMsgs = getGroupMessages(group_id).slice(-10);
                        const context = recentMsgs.map((m) => {
                            const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                            return `${who} ${m.content}`;
                        }).join("\n");
                        const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                        const collaborationInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                        const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                        const toolContext = buildAgentToolContext(ctx, group, member.project);
                        const memberConfig = configs.find(c => c.name === member.project);
                        const memberWorkDir = memberConfig ? (0, db_1.getConfigInfo)(memberConfig.path)[0]?.workDir : "";
                        const memoryPacket = buildAgentMemoryPacket(group_id, member.project, messageForAgent);
                        const developmentContract = buildChildAgentDevelopmentContract(member.project, messageForAgent, {
                            source: "群聊广播",
                            verification_hints: buildProjectVerificationHints(member.project, memberWorkDir),
                        });
                        return {
                            prompt: `${collaborationInstructions}${toolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n用户刚才把这条消息发给了群聊所有成员，请从 ${member.project} 的职责视角回复：${messageForAgent}`,
                            allowedTools: toolContext.allowedTools,
                        };
                    };
                    const agentPromises = targetMembers.map(member => {
                        return new Promise(async (resolve) => {
                            const config = configs.find(c => c.name === member.project);
                            if (!config) {
                                resolve();
                                return;
                            }
                            const info = (0, db_1.getConfigInfo)(config.path);
                            const workDir = info[0]?.workDir;
                            const agentType = info[0]?.agent || "claudecode";
                            const agentPrompt = getAgentPrompt(member);
                            try {
                                const responseMessageId = "m" + Date.now().toString(36) + member.project + crypto.randomBytes(2).toString("hex");
                                let memberFileChanges = null;
                                const text = await ctx.callAgentForGroupStream(member.project, agentPrompt.prompt, workDir, agentType, {
                                    res,
                                    groupId: group_id,
                                    timeoutMs: 300000,
                                    messageId: responseMessageId,
                                    allowedTools: agentPrompt.allowedTools,
                                    onDone: (opts) => { memberFileChanges = opts.fileChanges; }
                                });
                                appendGroupMessage(group_id, {
                                    id: responseMessageId,
                                    role: "assistant", agent: member.project,
                                    content: text,
                                    timestamp: new Date().toISOString(),
                                    fileChanges: memberFileChanges,
                                });
                                const validMentions = extractActionableMentions(text, group, member.project);
                                if (validMentions.length > 0) {
                                    writeSse(res, { type: "status", text: `🧩 ${member.project} 正在分配协作任务...` });
                                    await processCrossAgents(group_id, group, member.project, text, validMentions, configs, ctx, res);
                                }
                            }
                            catch (e) {
                                writeSse(res, { type: "agent_done", agent: member.project, text: `❌ 错误: ${e.message}` });
                            }
                            finally {
                                resolve();
                            }
                        });
                    });
                    Promise.all(agentPromises).then(() => {
                        writeSse(res, { type: "done" });
                        try {
                            res.end();
                        }
                        catch { }
                    });
                    return;
                }
                // 单个 Agent 模式
                const target_project_actual = targetMembers[0].project;
                const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
                const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";
                if (target_project_actual === coordinatorProject) {
                    const sharedFilesCtx2 = buildCoordinatorSharedFilesContext(ctx, group);
                    updateGroupMemory(group_id, {
                        goal: userMessageForHistory,
                        currentPhase: "understanding",
                        decision: "用户直接点名主 Agent",
                        reason: target_project_actual,
                        nextAction: "主 Agent 判断是否直接答复或派发子 Agent",
                    });
                    const memoryContext2 = buildGroupMemoryContext(loadGroupMemory(group_id));
                    const context = [memoryContext2, (0, group_orchestrator_1.buildRecentGroupContext)(getGroupMessages(group_id).slice(-20))].filter(Boolean).join("\n\n");
                    const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
                        group,
                        message: messageForAgent,
                        context,
                        source: "direct",
                        sharedFilesContext: sharedFilesCtx2,
                    });
                    const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
                    const planAssignments2 = normalizePlanAssignments(coordinatorResult.assignments || []);
                    const dispatchPolicy2 = coordinatorResult.dispatchPolicy || null;
                    const workflowMeta2 = getInitialWorkflowMeta(planAssignments2, dispatchPolicy2, "主 Agent 初始计划");
                    if (useStream) {
                        res.writeHead(200, {
                            "Content-Type": "text/event-stream",
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "Access-Control-Allow-Origin": "*",
                        });
                        writeSse(res, { type: "status", text: "🧠 代码协调器正在分配任务...", agent: coordinatorProject });
                        writeSse(res, {
                            type: "agent_done",
                            agent: coordinatorProject,
                            text: coordinatorResult.content,
                            messageId: responseMessageId,
                            assignments: planAssignments2,
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy: dispatchPolicy2,
                            coordinationPlan: coordinatorResult.coordinationPlan || null,
                            workflow: workflowMeta2,
                        });
                    }
                    appendGroupMessage(group_id, {
                        id: responseMessageId,
                        role: "assistant",
                        agent: coordinatorProject,
                        content: coordinatorResult.content,
                        timestamp: new Date().toISOString(),
                        assignments: planAssignments2,
                        executionOrder: coordinatorResult.executionOrder || "parallel",
                        runtime: coordinatorResult.runtime || "",
                        dispatchPolicy: dispatchPolicy2,
                        coordinationPlan: coordinatorResult.coordinationPlan || null,
                        workflow: workflowMeta2,
                    });
                    updateGroupMemory(group_id, {
                        currentPhase: workflowMeta2.phase,
                        decision: `${dispatchPolicy2?.action || "unknown"}：${dispatchPolicy2?.reason || "主 Agent 已完成派发判断"}`,
                        reason: dispatchPolicy2?.risk || "",
                        nextAction: dispatchPolicy2?.nextStep || (planAssignments2.length ? "等待子 Agent 回执" : "等待用户继续补充"),
                    });
                    const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
                    let crossOutputs = [];
                    let reviewResult = null;
                    if (validMentions.length > 0) {
                        if (useStream)
                            writeSse(res, { type: "status", text: "🧩 代码协调器正在分派子 Agent..." });
                        const execOrder2 = coordinatorResult.executionOrder || "parallel";
                        crossOutputs = await processCrossAgents(group_id, group, coordinatorProject, coordinatorResult.content, validMentions, configs, ctx, useStream ? res : null, 0, new Set(), execOrder2, responseMessageId);
                        reviewResult = await runCoordinatorReviewLoop({
                            groupId: group_id,
                            group,
                            userMessage: messageForAgent,
                            coordinatorOutput: coordinatorResult.content,
                            crossOutputs,
                            configs,
                            ctx,
                            streamRes: useStream ? res : null,
                            executionOrder: execOrder2,
                        });
                    }
                    if (useStream) {
                        writeSse(res, { type: "done", messageId: responseMessageId });
                        res.end();
                    }
                    else {
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            reply: reviewResult?.content ? `${coordinatorResult.content}\n\n---\n\n${reviewResult.content}` : coordinatorResult.content,
                            cross_pending: validMentions.length > 0
                        });
                    }
                    return;
                }
                const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(target_project_actual, group, configs);
                if (!runtime)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const workDir = runtime.workDir;
                const agentType = runtime.agentType;
                const recentMsgs = getGroupMessages(group_id).slice(-10);
                const context = recentMsgs.map((m) => {
                    const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                    return `${who} ${m.content}`;
                }).join("\n");
                const memberList = group.members.map((m) => m.project).filter((p) => p !== target_project_actual).join(", ");
                let atInstructions = "";
                if (target_project_actual === coordinatorProject) {
                    atInstructions = (0, group_orchestrator_1.buildCoordinatorCollaborationInstructions)(memberList);
                }
                else {
                    atInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(target_project_actual, memberList);
                }
                let sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                const toolContext = buildAgentToolContext(ctx, group, target_project_actual);
                const projectConfig = getProjectExtraConfig(target_project_actual);
                if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
                    sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
                }
                const memoryPacket = buildAgentMemoryPacket(group_id, target_project_actual, messageForAgent);
                const developmentContract = buildChildAgentDevelopmentContract(target_project_actual, messageForAgent, {
                    source: "群聊点名",
                    verification_hints: buildProjectVerificationHints(target_project_actual, workDir),
                });
                const fullPrompt = `${atInstructions}${toolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${messageForAgent}`;
                if (useStream) {
                    const responseMessageId = "m" + Date.now().toString(36) + "a" + crypto.randomBytes(2).toString("hex");
                    const startedAt = Date.now();
                    const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 Agent 正在思考..." })}\n\n`);
                    ctx.setAgentActivity(target_project_actual, "working", "群聊协作中", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(target_project_actual, { role: "status", text: "Agent 正在思考...", source: "group" });
                    try {
                        let targetFileChanges = null;
                        const outputText = await ctx.callAgentForGroupStream(target_project_actual, fullPrompt, workDir, agentType, {
                            res,
                            groupId: group_id,
                            timeoutMs: 300000,
                            messageId: responseMessageId,
                            allowedTools: toolContext.allowedTools,
                            onDone: (opts) => { targetFileChanges = opts.fileChanges; }
                        });
                        appendGroupMessage(group_id, {
                            id: responseMessageId,
                            role: "assistant", agent: target_project_actual,
                            content: outputText.trim(),
                            timestamp: new Date().toISOString(),
                            fileChanges: targetFileChanges,
                        });
                        addGroupLog(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
                            agent: target_project_actual,
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300)
                        });
                        const validMentions = extractActionableMentions(outputText, group, target_project_actual);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 主 Agent 正在分配任务..." });
                            try {
                                await processCrossAgents(group_id, group, target_project_actual, outputText, validMentions, configs, ctx, res);
                            }
                            catch (err) {
                                writeSse(res, { type: "error", text: `跨 Agent 协作失败: ${err.message}` });
                            }
                        }
                        writeSse(res, { type: "done", fileChanges: targetFileChanges, messageId: responseMessageId });
                        res.end();
                    }
                    catch (err) {
                        writeSse(res, { type: "error", text: err.message });
                        ctx.recordMetric(target_project_actual, {
                            success: false,
                            durationMs: Date.now() - startedAt,
                            fileChangeCount: 0
                        });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                // 非流式
                const output = await ctx.callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id, allowedTools: toolContext.allowedTools });
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36) + "a",
                    role: "assistant", agent: target_project_actual,
                    content: output,
                    timestamp: new Date().toISOString(),
                });
                const validMentions = extractActionableMentions(output, group, target_project_actual);
                if (validMentions.length > 0) {
                    (0, utils_1.sendJson)(res, { success: true, reply: output, cross_pending: true });
                    setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs, ctx));
                    return;
                }
                (0, utils_1.sendJson)(res, { success: true, reply: output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            ctx.collectRequestBuffer(req).then((buffer) => {
                try {
                    const boundary = ctx.getMultipartBoundary(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = ctx.parseMultipart(buffer, boundary);
                    handleGroupSend(fields, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                await handleGroupSend(JSON.parse(body));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/broadcast" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, message } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36),
                    role: "user", target: "all", content: message,
                    timestamp: new Date().toISOString(),
                });
                const replies = [];
                const configs = (0, db_1.getConfigs)();
                for (const member of group.members) {
                    const config = configs.find(c => c.name === member.project);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    const recentMsgs = getGroupMessages(group_id).slice(-10);
                    const context = recentMsgs.map((m) => {
                        const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                        return `${who} ${m.content}`;
                    }).join("\n");
                    const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                    const toolContext = buildAgentToolContext(ctx, group, member.project);
                    const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                    const memberInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                    const memoryPacket = buildAgentMemoryPacket(group_id, member.project, message);
                    const fullPrompt = `${memberInstructions}${toolContext.prompt}${sharedFilesContext}\n${memoryPacket}\n\n群聊记录：\n${context}\n\n请从 ${member.project} 的职责视角回复：${message}`;
                    const output = await ctx.callAgent(member.project, fullPrompt, workDir, agentType, 300000, {
                        tab: "groups",
                        groupId: group_id,
                        allowedTools: toolContext.allowedTools,
                    });
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + member.project,
                        role: "assistant", agent: member.project, content: output,
                        timestamp: new Date().toISOString(),
                    });
                    replies.push({ project: member.project, reply: output, receipt: extractAgentReceipt(output, member.project) });
                }
                (0, utils_1.sendJson)(res, { success: true, replies });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/decompose" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, requirement } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                const configs = (0, db_1.getConfigs)();
                const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                const members = (0, group_orchestrator_1.getRoutableMembers)(group);
                const memberList = members.map((m) => `${m.project}(${m.agent})`).join(", ");
                const tasks = (0, group_orchestrator_1.decomposeRequirementWithCodedCoordinator)(group, requirement);
                const output = JSON.stringify({ coordinator: coordinator.project, members: memberList, tasks }, null, 2);
                const createdTasks = tasks.map(t => createTask({
                    title: t.title,
                    description: t.description || "",
                    target_project: t.target_project || coordinator.project,
                    priority: t.priority || "normal"
                }));
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36) + "decompose",
                    role: "assistant",
                    agent: coordinator.project,
                    content: `📋 需求分解完成，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i + 1}. [${t.target_project}] ${t.title}`).join("\n")}`,
                    timestamp: new Date().toISOString(),
                });
                (0, utils_1.sendJson)(res, { success: true, tasks: createdTasks, raw_output: output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { task_id, group_id } = JSON.parse(body);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === task.target_project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                const agentType = info[0]?.agent || "claudecode";
                updateTask(task_id, { status: "in_progress" });
                const executePrompt = `你正在执行一个开发任务，请完成它。

任务标题：${task.title}
任务描述：${task.description || "无"}

请直接开始实现。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执，格式如下：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明实际完成/确认了什么",
  "actions": ["实际执行的动作"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "blockers": ["阻塞点；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;
                const group = group_id ? loadGroups().find(g => g.id === group_id) : null;
                const toolContext = buildAgentToolContext(ctx, group, task.target_project);
                const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
                const taskResult = await ctx.callAgent(task.target_project, `${toolContext.prompt}\n\n${executePrompt}`, workDir, agentType, 300000, { tab: group_id ? "groups" : "projects", groupId: group_id, project: task.target_project, allowedTools: toolContext.allowedTools });
                const fileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
                const execution = getTaskExecutionFromReceipt(taskResult, extractAgentReceipt(taskResult, task.target_project), { fileChanges });
                const isCompleted = execution.status === "done";
                updateTask(task_id, {
                    status: isCompleted ? "done" : "in_progress",
                    result: taskResult.substring(0, 500),
                    final_report: execution.report || taskResult,
                    status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
                    receipt: execution.receipt || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: buildDeliverySummary(task, execution, isCompleted ? "done" : "waiting"),
                });
                if (group_id) {
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + "task",
                        role: "assistant",
                        agent: task.target_project,
                        content: `📋 任务执行${isCompleted ? "完成" : "中"}：${task.title}\n${taskResult.substring(0, 300)}`,
                        timestamp: new Date().toISOString(),
                        task_id,
                        fileChanges,
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, task, completed: isCompleted, result: taskResult });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const tasks = (0, db_1.loadTasks)().filter(t => t.status === "pending");
                if (tasks.length === 0) {
                    return (0, utils_1.sendJson)(res, { success: true, message: "没有待执行的任务" });
                }
                const results = tasks.map(task => ({
                    task_id: task.id,
                    title: task.title,
                    ...enqueueTask(task.id, ctx)
                }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, {
                    success: true,
                    message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
                    results,
                    queue_status: getQueueStatus()
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/review" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, project, diff, reviewers } = JSON.parse(body);
                if (!diff)
                    return (0, utils_1.sendJson)(res, { error: "请提供代码变更内容" }, 400);
                const configs = (0, db_1.getConfigs)();
                const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;
                const reviewResults = [];
                const reviewGroup = group_id ? loadGroups().find(g => g.id === group_id) : null;
                for (const reviewer of (reviewers || [])) {
                    const config = configs.find(c => c.name === reviewer);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    try {
                        const toolContext = buildAgentToolContext(ctx, reviewGroup, reviewer);
                        const result = await ctx.callAgent(reviewer, `${toolContext.prompt}\n\n${reviewPrompt}`, workDir, agentType, 120000, { tab: group_id ? "groups" : "projects", groupId: group_id, project: reviewer, allowedTools: toolContext.allowedTools });
                        reviewResults.push({ reviewer, result });
                    }
                    catch (e) {
                        reviewResults.push({ reviewer, error: e.message });
                    }
                }
                if (group_id) {
                    const groups = loadGroups();
                    const group = groups.find(g => g.id === group_id);
                    const coordinator = group ? (0, group_orchestrator_1.getCoordinatorMember)(group) : { project: "coordinator" };
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + "review",
                        role: "assistant",
                        agent: coordinator.project,
                        content: `🔍 代码审查完成：${project}\n${reviewResults.map(r => `【${r.reviewer}】${r.result?.substring(0, 200) || r.error}`).join("\n\n")}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, reviews: reviewResults });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/collaboration/stats" && req.method === "GET") {
        const tasks = (0, db_1.loadTasks)();
        const groups = loadGroups();
        const stats = {
            total_tasks: tasks.length,
            pending_tasks: tasks.filter((t) => t.status === "pending").length,
            in_progress_tasks: tasks.filter((t) => t.status === "in_progress").length,
            done_tasks: tasks.filter((t) => t.status === "done").length,
            failed_tasks: tasks.filter((t) => t.status === "failed").length,
            completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t) => t.status === "done").length / tasks.length * 100) : 0,
            groups_count: groups.length,
            recent_activities: []
        };
        for (const group of groups.slice(0, 3)) {
            const messages = getGroupMessages(group.id).slice(-5);
            for (const msg of messages) {
                stats.recent_activities.push({
                    group: group.name,
                    agent: msg.agent || "user",
                    content: msg.content?.substring(0, 100),
                    timestamp: msg.timestamp
                });
            }
        }
        stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        stats.recent_activities = stats.recent_activities.slice(0, 10);
        (0, utils_1.sendJson)(res, stats);
        return true;
    }
    if (pathname === "/api/test/mentions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { text, group_id } = JSON.parse(body);
                let validMentions = [];
                if (group_id) {
                    const groups = loadGroups();
                    const group = groups.find(g => g.id === group_id);
                    if (group) {
                        validMentions = extractActionableMentions(text, group, "");
                    }
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    input: text,
                    valid_mentions: validMentions.map(m => m.mention),
                    extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 飞书配置与授权相关路由 ===
    if (pathname === "/api/feishu/config" && req.method === "GET") {
        const config = (0, db_1.loadFeishuConfig)();
        (0, utils_1.sendJson)(res, {
            config: {
                app_id: config.app_id || "",
                app_secret: config.app_secret || "",
                enabled: config.enabled !== false,
                authorized: config.authorized || false,
                authorized_user: config.authorized_user || null,
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, db_1.loadFeishuConfig)();
                if (updates.app_id !== undefined)
                    config.app_id = updates.app_id;
                if (updates.app_secret !== undefined && updates.app_secret !== "")
                    config.app_secret = updates.app_secret;
                if (updates.webhook_url !== undefined)
                    config.webhook_url = updates.webhook_url;
                if (updates.sign_key !== undefined && updates.sign_key !== "******")
                    config.sign_key = updates.sign_key;
                if (updates.enabled !== undefined)
                    config.enabled = updates.enabled;
                if (updates.redirect_uri !== undefined)
                    config.redirect_uri = updates.redirect_uri;
                console.log("[飞书配置] 保存配置:", { app_id: config.app_id, app_secret: config.app_secret ? "***" : "空" });
                (0, db_1.saveFeishuConfig)(config);
                (0, utils_1.sendJson)(res, { success: true, message: "飞书配置已保存" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/auth-url" && req.method === "GET") {
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id) {
            (0, utils_1.sendJson)(res, { error: "请先配置 App ID" }, 400);
            return true;
        }
        const scopes = (config.scopes || exports.FEISHU_SCOPES).join(" ");
        const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=ccm_auth`;
        (0, utils_1.sendJson)(res, { success: true, auth_url: authUrl });
        return true;
    }
    if (pathname === "/api/feishu/callback" && req.method === "GET") {
        const code = parsed.query.code;
        if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：缺少 code 参数</h1>");
            return true;
        }
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id || !config.app_secret) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：未配置 App ID 或 Secret</h1>");
            return true;
        }
        getFeishuUserToken(config.app_id, config.app_secret, code).then(tokenData => {
            if (!tokenData) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：获取 Token 失败</h1>");
                return;
            }
            config.user_access_token = tokenData.access_token;
            config.user_refresh_token = tokenData.refresh_token;
            config.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
            config.authorized = true;
            return getFeishuUserInfo(tokenData.access_token).then(userInfo => {
                if (userInfo) {
                    config.authorized_user = {
                        name: userInfo.name,
                        open_id: userInfo.open_id,
                        avatar: userInfo.avatar_url
                    };
                }
                (0, db_1.saveFeishuConfig)(config);
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>飞书授权成功</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px">
            <h1 style="color:#22c55e">✅ 飞书授权成功！</h1>
            <p>用户：${userInfo?.name || '未知'}</p>
            <p>授权已生效，可以关闭此页面。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
          </html>
        `);
            });
        }).catch(err => {
            console.error("[飞书授权] 回调处理失败:", err.message);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：服务器错误</h1>");
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/revoke" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        config.authorized = false;
        config.user_access_token = "";
        config.user_refresh_token = "";
        config.token_expires_at = null;
        config.authorized_user = null;
        (0, db_1.saveFeishuConfig)(config);
        (0, utils_1.sendJson)(res, { success: true, message: "授权已撤销" });
        return true;
    }
    if (pathname === "/api/feishu/chats" && req.method === "GET") {
        getValidFeishuToken().then(async (token) => {
            if (!token) {
                (0, utils_1.sendJson)(res, { error: "未授权或 Token 无效，请先完成飞书授权" }, 401);
                return;
            }
            const chats = await getFeishuChatList(token);
            if (!res.headersSent) {
                (0, utils_1.sendJson)(res, { success: true, chats: chats || [] });
            }
        }).catch(err => {
            console.error("[飞书] 获取群聊列表失败:", err.message);
            if (!res.headersSent) {
                (0, utils_1.sendJson)(res, { error: "获取群聊列表失败" }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/test" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id) {
            (0, utils_1.sendJson)(res, { error: "请先配置飞书 App ID" }, 400);
            return true;
        }
        const userId = config.authorized_user?.open_id;
        if (!userId) {
            (0, utils_1.sendJson)(res, { error: "请先扫码授权获取用户 ID" }, 400);
            return true;
        }
        const testCard = {
            config: { wide_screen_mode: true },
            header: {
                title: { tag: "plain_text", content: "🔔 测试通知" },
                template: "blue"
            },
            elements: [
                {
                    tag: "div",
                    text: {
                        tag: "lark_md",
                        content: `**ccm 控制台通知测试**\n\n发送时间：${new Date().toLocaleString("zh-CN")}\n\n配置验证成功！✅`
                    }
                }
            ]
        };
        sendFeishuMessageToUser(userId, JSON.stringify(testCard), "interactive").then(success => {
            if (success) {
                (0, utils_1.sendJson)(res, { success: true, message: "测试消息已发送！请检查飞书" });
            }
            else {
                (0, utils_1.sendJson)(res, { error: "发送失败，请检查配置" }, 500);
            }
        }).catch(err => {
            console.error("[飞书] 测试通知失败:", err.message);
            (0, utils_1.sendJson)(res, { error: "发送失败: " + err.message }, 500);
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=collaboration.js.map