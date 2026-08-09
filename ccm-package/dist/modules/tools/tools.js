"use strict";
// tools.ts — merged from 3 part files (behavior-freeze merge).
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
exports.buildLivePerformanceSnapshot = buildLivePerformanceSnapshot;
exports.reloadToolManagerAfterCatalogMutation = reloadToolManagerAfterCatalogMutation;
exports.rollbackCatalogMutation = rollbackCatalogMutation;
exports.selectLatestRuntimeToolAudits = selectLatestRuntimeToolAudits;
exports.loadLatestRuntimeToolReadiness = loadLatestRuntimeToolReadiness;
exports.buildToolInvocationAudit = buildToolInvocationAudit;
exports.buildToolChainVerification = buildToolChainVerification;
exports.normalizeTruthFlag = normalizeTruthFlag;
exports.buildMcpSkillGoalCompletionAudit = buildMcpSkillGoalCompletionAudit;
exports.buildToolChainVerificationSelfTestRow = buildToolChainVerificationSelfTestRow;
exports.runToolChainVerificationSelfTest = runToolChainVerificationSelfTest;
exports.runTerminalCommand = runTerminalCommand;
exports.listSharedFiles = listSharedFiles;
exports.readSharedFile = readSharedFile;
exports.writeSharedFile = writeSharedFile;
exports.saveSharedUpload = saveSharedUpload;
exports.deleteSharedFile = deleteSharedFile;
exports.readSkillManual = readSkillManual;
exports.loadCustomSkills = loadCustomSkills;
exports.handleToolsAndMetricsApi = handleToolsAndMetricsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const perf_hooks_1 = require("perf_hooks");
const child_process_1 = require("child_process");
const managed_process_tree_1 = require("../../system/managed-process-tree");
const utils_1 = require("../../core/utils");
const secure_multipart_1 = require("../../system/secure-multipart");
const shared_files_v2_1 = require("./shared-files-v2");
const db_1 = require("../../core/db");
const storage_1 = require("../collaboration/storage");
const runtime_tool_sync_1 = require("../../tools/runtime-tool-sync");
const tool_authorization_1 = require("../../tools/tool-authorization");
const runtime_tool_real_cli_matrix_1 = require("../../tools/runtime-tool-real-cli-matrix");
const terminal_1 = require("./terminal");
const marketplace_1 = require("./marketplace");
const tool_catalog_management_1 = require("../../tools/tool-catalog-management");
const internal_skill_catalog_1 = require("../../skills/internal-skill-catalog");
const internal_mcp_registry_1 = require("../../tools/internal-mcp-registry");
const global_agent_tool_authorization_1 = require("../global/global-agent-tool-authorization");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const workspace_readonly_tools_1 = require("../../tools/workspace-readonly-tools");
const metrics_v3_1 = require("../../system/metrics-v3");
// ===== merged from tools-part-01-part-01.ts =====
const { toolManager } = require("../../tools/tool-manager");
const TOOL_CATALOG_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "tools", "catalog-operations.jsonl");
const TOOL_INVOCATION_AUDIT_FILES = {
    toolLoop: path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-call-loop.jsonl"),
    skillInvocations: path.join(os.homedir(), ".cc-connect", "agent-runner", "skill-invocations.jsonl"),
    permissionViolations: path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-permission-violations.jsonl"),
};
const MARKETPLACE_OPERATIONS_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "marketplace", "operations.jsonl");
const AGENT_RUNNER_DIR = path.join(os.homedir(), ".cc-connect", "agent-runner");
const AGENT_PROBE_STATUS_FILE = path.join(AGENT_RUNNER_DIR, "probe-status.json");
const AGENT_PROBE_TARGET_STATUS_DIR = path.join(AGENT_RUNNER_DIR, "probe-targets");
const REAL_CLI_PROBE_SUCCESS_FRESH_MS = 24 * 60 * 60 * 1000;
let previousMetricsCpuUsage = process.cpuUsage();
let previousMetricsCpuAt = process.hrtime.bigint();
let previousEventLoopUtilization = perf_hooks_1.performance.eventLoopUtilization();
function buildLivePerformanceSnapshot() {
    const now = process.hrtime.bigint();
    const cpuUsage = process.cpuUsage(previousMetricsCpuUsage);
    const elapsedMicros = Math.max(1, Number(now - previousMetricsCpuAt) / 1000);
    const cpuPercent = Math.max(0, Math.min(100, (((cpuUsage.user + cpuUsage.system) / elapsedMicros) * 100) / Math.max(1, os.cpus().length)));
    const eventLoop = perf_hooks_1.performance.eventLoopUtilization(previousEventLoopUtilization);
    previousMetricsCpuUsage = process.cpuUsage();
    previousMetricsCpuAt = now;
    previousEventLoopUtilization = perf_hooks_1.performance.eventLoopUtilization();
    const memory = process.memoryUsage();
    return {
        collectedAt: new Date().toISOString(),
        process: {
            pid: process.pid,
            uptimeSeconds: Math.round(process.uptime()),
            cpuPercent: Number(cpuPercent.toFixed(1)),
            rssBytes: memory.rss,
            heapUsedBytes: memory.heapUsed,
            heapTotalBytes: memory.heapTotal,
            externalBytes: memory.external,
        },
        eventLoop: {
            utilization: Number((Math.max(0, Math.min(1, eventLoop.utilization || 0)) * 100).toFixed(1)),
            activeMs: Number((eventLoop.active || 0).toFixed(1)),
            idleMs: Number((eventLoop.idle || 0).toFixed(1)),
        },
    };
}
function appendJsonlBounded(file, entry) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(file, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(file, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
    }
    catch { }
}
async function reloadToolManagerAfterCatalogMutation(entry) {
    await toolManager.loadTools();
    const lifecycle = (0, marketplace_1.completeToolCatalogMutationLifecycle)({
        action: entry.action,
        type: entry.type,
        name: entry.name,
        autoResync: entry.autoResync !== false,
    });
    const toolList = toolManager.getToolList();
    const audit = {
        schema: "ccm-tool-catalog-operation-v1",
        action: entry.action,
        type: entry.type,
        name: entry.name,
        source: entry.source || "manual-api",
        changed: entry.changed !== false,
        reloaded: true,
        status: {
            mcpServers: Array.isArray(toolList.servers) ? toolList.servers.length : 0,
            mcpTools: Array.isArray(toolList.mcp) ? toolList.mcp.length : 0,
            skills: Array.isArray(toolList.skillTools) ? toolList.skillTools.length : 0,
        },
        ...lifecycle,
    };
    appendJsonlBounded(TOOL_CATALOG_AUDIT_FILE, audit);
    return audit;
}
async function rollbackCatalogMutation(type, name, previous) {
    if (previous) {
        if (type === "mcp")
            (0, db_1.saveMcpTool)(previous);
        else
            (0, db_1.saveSkill)(previous);
    }
    else if (type === "mcp")
        (0, db_1.deleteMcpTool)(name);
    else
        (0, db_1.deleteSkill)(name);
    try {
        await toolManager.loadTools();
    }
    catch { }
}
function cleanAuditText(value, max = 240) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function safeAuditNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function readRecentJsonl(file, limit = 80) {
    try {
        if (!fs.existsSync(file))
            return [];
        const content = fs.readFileSync(file, "utf-8").slice(-1024 * 1024);
        return content
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-Math.max(1, Math.min(500, limit * 4)))
            .map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
function readJsonFileSafe(file) {
    try {
        if (!file || !fs.existsSync(file))
            return null;
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function runtimeAuditTargetKey(audit) {
    const project = cleanAuditText(audit?.projectName || "", 180).toLowerCase();
    const group = cleanAuditText(audit?.groupId || "", 180).toLowerCase();
    if (group && project)
        return `group:${group}:${project}`;
    if (project)
        return `project:${project}`;
    return `runtime:${cleanAuditText(audit?.runtime || "unknown", 80)}:unscoped`;
}
function selectLatestRuntimeToolAudits(audits) {
    const seen = new Set();
    return audits
        .slice()
        .sort((left, right) => String(right?.timestamp || right?.generatedAt || "").localeCompare(String(left?.timestamp || left?.generatedAt || "")))
        .filter((audit) => {
        const key = runtimeAuditTargetKey(audit);
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function loadLatestRuntimeToolReadiness(limit = 240, options = {}) {
    const readiness = selectLatestRuntimeToolAudits((0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(limit))
        .map(audit => (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { record: false }));
    return options.businessOnly
        ? readiness.filter(item => !!item.projectName || !!item.groupId)
        : readiness;
}
function scopeSummary(scope = {}) {
    return {
        mcp: Array.isArray(scope?.mcp) ? scope.mcp.length : 0,
        skill: Array.isArray(scope?.skill) ? scope.skill.length : 0,
    };
}
function auditContextFromEntry(entry = {}) {
    const scopeContext = entry?.scope?.auditContext || entry?.auditContext || {};
    return {
        runtime: entry?.runtime || scopeContext.runtime || "",
        project: entry?.project || scopeContext.project || "",
        groupId: entry?.groupId || entry?.group_id || scopeContext.groupId || scopeContext.group_id || "",
        taskId: entry?.taskId || entry?.task_id || scopeContext.taskId || scopeContext.task_id || "",
        executionId: entry?.executionId || entry?.execution_id || scopeContext.executionId || scopeContext.execution_id || "",
        invocationSource: entry?.source || scopeContext.source || "",
    };
}
function sanitizeToolInvocationAuditEntry(entry, source) {
    const context = auditContextFromEntry(entry);
    const common = {
        at: cleanAuditText(entry?.at || entry?.invokedAt || "", 80),
        source,
        type: cleanAuditText(entry?.type || "", 80),
        runtime: cleanAuditText(context.runtime, 80),
        project: cleanAuditText(context.project, 180),
        groupId: cleanAuditText(context.groupId, 180),
        taskId: cleanAuditText(context.taskId, 180),
        executionId: cleanAuditText(context.executionId, 180),
        invocationSource: cleanAuditText(context.invocationSource, 120),
    };
    if (source === "skill_invocation") {
        const invoked = entry?.type === "skill_invoked";
        return {
            ...common,
            category: entry?.type === "skill_unauthorized" ? "unauthorized" : "skill",
            skill: cleanAuditText(entry?.skill || "", 180),
            contentHash: cleanAuditText(entry?.contentHash || "", 80),
            ok: invoked && entry?.ok !== false,
            inputBytes: safeAuditNumber(entry?.inputBytes),
            scope: scopeSummary(entry?.scope || {}),
        };
    }
    if (source === "permission_violation") {
        return {
            ...common,
            category: "unauthorized",
            tool: cleanAuditText(entry?.tool || "", 180),
            server: cleanAuditText(entry?.server || "", 180),
            rule: cleanAuditText(entry?.rule || "", 180),
            ok: false,
            scope: scopeSummary(entry?.scope || {}),
        };
    }
    return {
        ...common,
        category: entry?.type === "tool_call" ? "tool" : "loop",
        tool: cleanAuditText(entry?.tool || "", 180),
        round: safeAuditNumber(entry?.round),
        ok: entry?.ok === true,
        argumentsHash: cleanAuditText(entry?.argumentsHash || "", 120),
        termination: cleanAuditText(entry?.termination || "", 80),
        toolCalls: safeAuditNumber(entry?.toolCalls),
        durationMs: safeAuditNumber(entry?.durationMs),
        nativeSession: entry?.nativeSession === true,
        error: cleanAuditText(entry?.error || "", 500),
    };
}
function toolInvocationAuditMatchesFilter(item, input = {}) {
    const projectFilters = [
        input.project,
        input.projectName,
        input.project_name,
        input.projectAlias,
        input.project_alias,
        ...((Array.isArray(input.projects) ? input.projects : [])),
        ...((Array.isArray(input.projectAliases) ? input.projectAliases : [])),
        ...String(input.projectAliases || input.project_aliases || "")
            .split(",")
            .map(value => value.trim())
            .filter(Boolean),
    ]
        .map(value => cleanAuditText(value || "", 180).toLowerCase())
        .filter(Boolean);
    const filters = {
        runtime: cleanAuditText(input.runtime || "", 80).toLowerCase(),
        groupId: cleanAuditText(input.groupId || input.group_id || "", 180).toLowerCase(),
        taskId: cleanAuditText(input.taskId || input.task_id || "", 180).toLowerCase(),
        category: cleanAuditText(input.category || "", 80).toLowerCase(),
        source: cleanAuditText(input.source || "", 80).toLowerCase(),
    };
    if (filters.runtime && String(item.runtime || "").toLowerCase() !== filters.runtime)
        return false;
    if (projectFilters.length && !projectFilters.includes(String(item.project || "").toLowerCase()))
        return false;
    if (filters.groupId && String(item.groupId || "").toLowerCase() !== filters.groupId)
        return false;
    if (filters.taskId && String(item.taskId || "").toLowerCase() !== filters.taskId)
        return false;
    if (filters.category && String(item.category || "").toLowerCase() !== filters.category)
        return false;
    if (filters.source
        && String(item.source || "").toLowerCase() !== filters.source
        && String(item.invocationSource || "").toLowerCase() !== filters.source)
        return false;
    return true;
}
function buildToolInvocationAudit(input = {}) {
    const requestedLimit = Number(input.limit || 80);
    const limit = Math.max(1, Math.min(200, Number.isFinite(requestedLimit) ? requestedLimit : 80));
    const rawItems = [
        ...readRecentJsonl(TOOL_INVOCATION_AUDIT_FILES.toolLoop, limit).map(entry => sanitizeToolInvocationAuditEntry(entry, "tool_loop")),
        ...readRecentJsonl(TOOL_INVOCATION_AUDIT_FILES.skillInvocations, limit).map(entry => sanitizeToolInvocationAuditEntry(entry, "skill_invocation")),
        ...readRecentJsonl(TOOL_INVOCATION_AUDIT_FILES.permissionViolations, limit).map(entry => sanitizeToolInvocationAuditEntry(entry, "permission_violation")),
    ]
        .filter(entry => entry.at || entry.type)
        .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const items = rawItems
        .filter(item => toolInvocationAuditMatchesFilter(item, input))
        .slice(0, limit);
    return {
        schema: "ccm-tool-invocation-audit-v1",
        success: true,
        limit,
        filters: {
            runtime: cleanAuditText(input.runtime || "", 80),
            project: cleanAuditText(input.project || input.projectName || input.project_name || "", 180),
            projectAliases: String(input.projectAliases || input.project_aliases || "")
                .split(",")
                .map(value => cleanAuditText(value, 180))
                .filter(Boolean),
            groupId: cleanAuditText(input.groupId || input.group_id || "", 180),
            taskId: cleanAuditText(input.taskId || input.task_id || "", 180),
            category: cleanAuditText(input.category || "", 80),
            source: cleanAuditText(input.source || "", 80),
        },
        files: TOOL_INVOCATION_AUDIT_FILES,
        summary: {
            totalReturned: items.length,
            toolCalls: items.filter((item) => item.category === "tool").length,
            successfulToolCalls: items.filter((item) => item.category === "tool" && item.ok === true).length,
            failedToolCalls: items.filter((item) => item.category === "tool" && item.ok === false).length,
            skillInvocations: items.filter((item) => item.category === "skill").length,
            unauthorized: items.filter((item) => item.category === "unauthorized").length,
            loopsFinished: items.filter((item) => item.type === "tool_loop_finished").length,
        },
        items,
    };
}
function chainVerificationStatus(row, invocationSummary) {
    const configured = Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0;
    const runtimeSummary = row?.runtime?.summary || {};
    if (!configured)
        return "not_configured";
    if (row?.authorization_readiness?.dispatchReady === false)
        return "authorization_blocked";
    if (Number(runtimeSummary.total || 0) === 0)
        return "runtime_missing";
    if (Number(runtimeSummary.needsResync || 0) > 0)
        return "runtime_needs_resync";
    if (Number(invocationSummary.unauthorized || 0) > 0)
        return "unauthorized_attempts";
    if (Number(invocationSummary.totalObserved || 0) === 0)
        return "ready_not_observed";
    if (invocationSummary.evidenceComplete !== true)
        return "verification_incomplete";
    return "verified";
}
function chainVerificationStatusLabel(status) {
    const labels = {
        not_configured: "未配置工具",
        authorization_blocked: "授权阻断",
        runtime_missing: "缺少运行时快照",
        runtime_needs_resync: "运行时需重同步",
        unauthorized_attempts: "存在越权尝试",
        ready_not_observed: "就绪但未观察到调用",
        verification_incomplete: "调用验证未通过",
        verified: "已验证可用",
    };
    return labels[status] || status || "unknown";
}
function auditItemMatchesInventoryScope(item, row) {
    const id = cleanAuditText(row?.id || "", 240).toLowerCase();
    const name = cleanAuditText(row?.name || "", 240).toLowerCase();
    if (!id && !name)
        return false;
    if (row?.scope === "group")
        return cleanAuditText(item?.groupId || "", 240).toLowerCase() === id;
    const project = cleanAuditText(item?.project || "", 240).toLowerCase();
    return project === id || (!!name && project === name);
}
function buildScopeInvocationEvidence(row, auditItems) {
    const items = auditItems.filter(item => auditItemMatchesInventoryScope(item, row));
    const grantedSkills = new Set((Array.isArray(row?.tools?.skill) ? row.tools.skill : []).map((item) => cleanAuditText(item).toLowerCase()).filter(Boolean));
    const skillItems = items.filter(item => item.category === "skill");
    const authorizedSkillItems = skillItems.filter(item => grantedSkills.has(cleanAuditText(item.skill).toLowerCase()));
    const toolItems = items.filter(item => item.category === "tool");
    const successfulToolItems = toolItems.filter(item => item.ok === true);
    const successfulSkillItems = authorizedSkillItems.filter(item => item.ok === true);
    const unauthorizedItems = items.filter(item => item.category === "unauthorized");
    const loopItems = items.filter(item => item.type === "tool_loop_finished");
    const requiresMcp = Number(row?.counts?.mcp || 0) > 0;
    const requiresSkill = Number(row?.counts?.skill || 0) > 0;
    const mcpVerified = !requiresMcp || successfulToolItems.length > 0;
    const skillVerified = !requiresSkill || successfulSkillItems.length > 0;
    return {
        summary: {
            totalObserved: toolItems.length + skillItems.length,
            toolCalls: toolItems.length,
            successfulToolCalls: successfulToolItems.length,
            failedToolCalls: toolItems.filter(item => item.ok === false).length,
            skillInvocations: skillItems.length,
            authorizedSkillInvocations: authorizedSkillItems.length,
            successfulSkillInvocations: successfulSkillItems.length,
            unauthorized: unauthorizedItems.length,
            loopsFinished: loopItems.length,
            lastObservedAt: items[0]?.at || "",
            requiresMcp,
            requiresSkill,
            mcpVerified,
            skillVerified,
            evidenceComplete: mcpVerified && skillVerified,
            missingEvidence: [
                ...(!mcpVerified ? ["mcp_success"] : []),
                ...(!skillVerified ? ["skill_success"] : []),
            ],
        },
        recent: items.slice(0, 8),
    };
}
function buildChainVerificationAuditFilter(row, category = "") {
    const filter = {};
    if (row?.scope === "group")
        filter.groupId = cleanAuditText(row.id || "", 240);
    if (row?.scope === "project") {
        filter.project = cleanAuditText(row.id || "", 240);
        const name = cleanAuditText(row.name || "", 240);
        if (name && name !== filter.project)
            filter.projectAliases = [name];
    }
    if (category)
        filter.category = category;
    return filter;
}
function buildChainVerificationResyncPayload(row) {
    const payload = { staleOnly: false, limit: 20 };
    const staleSnapshots = (Array.isArray(row?.runtime?.snapshots) ? row.runtime.snapshots : [])
        .filter((snapshot) => snapshot?.catalogStale || snapshot?.dispatchReady === false || snapshot?.deliveryReady === false)
        .map((snapshot) => cleanAuditText(snapshot?.snapshotId || "", 120))
        .filter(Boolean);
    if (staleSnapshots.length) {
        payload.snapshotIds = staleSnapshots.slice(0, 20);
        return payload;
    }
    if (row?.scope === "group")
        payload.groupId = cleanAuditText(row.id || "", 240);
    if (row?.scope === "project")
        payload.projectName = cleanAuditText(row.id || "", 240);
    return payload;
}
function buildChainVerificationNextActions(row, status) {
    const base = {
        scope: row?.scope || "",
        scopeId: cleanAuditText(row?.id || "", 240),
        scopeName: cleanAuditText(row?.name || row?.id || "", 240),
    };
    const actions = [];
    if (status === "not_configured") {
        actions.push({ ...base, kind: "open_authorization", label: "配置授权" });
        return actions;
    }
    if (status === "authorization_blocked") {
        actions.push({ ...base, kind: "open_authorization", label: "检查授权" });
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看审计", filters: buildChainVerificationAuditFilter(row) });
        return actions;
    }
    if (status === "runtime_missing") {
        actions.push({ ...base, kind: "open_runtime", label: "查看运行时" });
        actions.push({ ...base, kind: "open_authorization", label: "检查授权" });
        return actions;
    }
    if (status === "runtime_needs_resync") {
        actions.push({ ...base, kind: "runtime_resync", label: "重同步此范围", resyncPayload: buildChainVerificationResyncPayload(row) });
        actions.push({ ...base, kind: "open_runtime", label: "查看运行时" });
        return actions;
    }
    if (status === "unauthorized_attempts") {
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看越权", filters: buildChainVerificationAuditFilter(row, "unauthorized") });
        actions.push({ ...base, kind: "open_authorization", label: "复核授权" });
        return actions;
    }
    if (status === "ready_not_observed") {
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看审计", filters: buildChainVerificationAuditFilter(row) });
        actions.push({ ...base, kind: "open_runtime", label: "查看运行时" });
        return actions;
    }
    if (status === "verification_incomplete") {
        actions.push({
            ...base,
            kind: "open_scope_real_task",
            label: row?.scope === "group" ? "前往群聊执行真实任务" : "前往项目执行真实任务",
        });
        actions.push({ ...base, kind: "open_invocation_audit", label: "查看失败记录", filters: buildChainVerificationAuditFilter(row) });
        return actions;
    }
    actions.push({ ...base, kind: "open_invocation_audit", label: "查看审计", filters: buildChainVerificationAuditFilter(row) });
    return actions;
}
const CHAIN_VERIFICATION_BLOCKING_STATUSES = new Set([
    "authorization_blocked",
    "runtime_missing",
    "runtime_needs_resync",
    "unauthorized_attempts",
]);
function chainVerificationRowIsConfigured(row) {
    return Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0;
}
function compactChainVerificationScope(row) {
    return {
        scope: cleanAuditText(row?.scope || "", 40),
        id: cleanAuditText(row?.id || "", 240),
        name: cleanAuditText(row?.name || row?.id || "", 240),
        status: cleanAuditText(row?.status || "", 80),
        statusLabel: cleanAuditText(row?.statusLabel || row?.status || "", 120),
        counts: {
            mcp: Number(row?.counts?.mcp || 0),
            skill: Number(row?.counts?.skill || 0),
        },
        nextActionKinds: (Array.isArray(row?.nextActions) ? row.nextActions : [])
            .map((action) => cleanAuditText(action?.kind || "", 80))
            .filter(Boolean)
            .slice(0, 8),
    };
}
function buildChainVerificationGate(rows) {
    const configuredRows = rows.filter(chainVerificationRowIsConfigured);
    const blockingRows = configuredRows.filter(row => CHAIN_VERIFICATION_BLOCKING_STATUSES.has(row.status));
    const pendingObservationRows = configuredRows.filter(row => ["ready_not_observed", "verification_incomplete"].includes(row.status));
    const verifiedRows = configuredRows.filter(row => row.status === "verified");
    const status = configuredRows.length === 0
        ? "not_configured"
        : blockingRows.length > 0
            ? "blocked"
            : pendingObservationRows.length > 0
                ? "ready_unverified"
                : "verified";
    const actionSeen = new Set();
    const nextActions = [...blockingRows, ...pendingObservationRows]
        .flatMap(row => (Array.isArray(row.nextActions) ? row.nextActions : []).map((action) => ({
        ...action,
        status: row.status,
        statusLabel: row.statusLabel,
    })))
        .filter((action) => {
        const key = [
            cleanAuditText(action?.scope || "", 40),
            cleanAuditText(action?.scopeId || "", 240),
            cleanAuditText(action?.kind || "", 80),
        ].join(":");
        if (!key || actionSeen.has(key))
            return false;
        actionSeen.add(key);
        return true;
    })
        .slice(0, 20);
    return {
        schema: "ccm-tool-chain-verification-gate-v1",
        status,
        dispatchReady: configuredRows.length > 0 && blockingRows.length === 0,
        verified: configuredRows.length > 0 && blockingRows.length === 0 && pendingObservationRows.length === 0,
        requiresObservation: configuredRows.length > 0 && blockingRows.length === 0 && pendingObservationRows.length > 0,
        counts: {
            configuredScopes: configuredRows.length,
            blockingScopes: blockingRows.length,
            pendingObservationScopes: pendingObservationRows.length,
            verifiedScopes: verifiedRows.length,
            unconfiguredScopes: rows.filter((row) => !chainVerificationRowIsConfigured(row)).length,
        },
        blockingStatuses: Array.from(new Set(blockingRows.map(row => row.status))).sort(),
        blockingScopes: blockingRows.map(compactChainVerificationScope).slice(0, 20),
        pendingObservationScopes: pendingObservationRows.map(compactChainVerificationScope).slice(0, 20),
        verifiedScopes: verifiedRows.map(compactChainVerificationScope).slice(0, 20),
        nextActions,
    };
}
function buildToolChainVerification(input = {}) {
    const runtimeReadiness = Array.isArray(input.runtimeReadiness)
        ? input.runtimeReadiness
        : loadLatestRuntimeToolReadiness(240, { businessOnly: true });
    const inventory = input.inventory || (0, tool_authorization_1.buildToolAuthorizationInventory)({
        projects: input.projects || (0, db_1.loadProjectConfigs)(),
        groups: input.groups || (0, storage_1.loadGroups)(),
        runtimeReadiness,
    });
    const audit = input.invocationAudit || buildToolInvocationAudit({ limit: input.auditLimit || 200 });
    const scopeFilter = cleanAuditText(input.scope || "", 40).toLowerCase();
    const scopeIdFilter = cleanAuditText(input.scopeId || input.scope_id || "", 240).toLowerCase();
    const groupIdFilter = cleanAuditText(input.groupId || input.group_id || "", 240).toLowerCase();
    const projectFilter = cleanAuditText(input.project || input.projectName || input.project_name || "", 240).toLowerCase();
    const statusFilter = cleanAuditText(input.status || "", 80).toLowerCase();
    const rows = (inventory.scopes || [])
        .map((row) => {
        const invocation = buildScopeInvocationEvidence(row, audit.items || []);
        const status = chainVerificationStatus(row, invocation.summary);
        return {
            schema: "ccm-tool-chain-verification-scope-v1",
            scope: row.scope,
            id: row.id,
            name: row.name,
            status,
            statusLabel: chainVerificationStatusLabel(status),
            tools: row.tools,
            counts: row.counts,
            authorization: {
                dispatchReady: row.authorization_readiness?.dispatchReady !== false,
                status: row.authorization_readiness?.status || "",
                missing: row.audit_summary || {},
            },
            runtime: row.runtime,
            invocation,
            nextActions: buildChainVerificationNextActions(row, status),
            evidence: {
                authorizationReady: row.authorization_readiness?.dispatchReady !== false,
                runtimeSnapshots: Number(row.runtime?.summary?.total || 0),
                runtimeNeedsResync: Number(row.runtime?.summary?.needsResync || 0),
                invocationObserved: Number(invocation.summary.totalObserved || 0) > 0,
                unauthorizedAttempts: Number(invocation.summary.unauthorized || 0),
            },
        };
    })
        .filter((row) => !scopeFilter || row.scope === scopeFilter)
        .filter((row) => !scopeIdFilter || cleanAuditText(row.id, 240).toLowerCase() === scopeIdFilter)
        .filter((row) => !groupIdFilter || (row.scope === "group" && cleanAuditText(row.id, 240).toLowerCase() === groupIdFilter))
        .filter((row) => !projectFilter || (row.scope === "project" && (cleanAuditText(row.id, 240).toLowerCase() === projectFilter || cleanAuditText(row.name, 240).toLowerCase() === projectFilter)))
        .filter((row) => !statusFilter || row.status === statusFilter);
    const statusCounts = rows.reduce((acc, row) => {
        acc[row.status] = Number(acc[row.status] || 0) + 1;
        return acc;
    }, {});
    const gate = buildChainVerificationGate(rows);
    return {
        schema: "ccm-tool-chain-verification-v1",
        success: true,
        generatedAt: new Date().toISOString(),
        filters: {
            scope: scopeFilter,
            scopeId: scopeIdFilter,
            groupId: groupIdFilter,
            project: projectFilter,
            status: statusFilter,
        },
        summary: {
            totalScopes: rows.length,
            configuredScopes: rows.filter((row) => Number(row.counts?.mcp || 0) + Number(row.counts?.skill || 0) > 0).length,
            verified: Number(statusCounts.verified || 0),
            readyNotObserved: Number(statusCounts.ready_not_observed || 0),
            verificationIncomplete: Number(statusCounts.verification_incomplete || 0),
            needsAttention: rows.filter((row) => ["authorization_blocked", "runtime_missing", "runtime_needs_resync", "unauthorized_attempts"].includes(row.status)).length,
            authorizationBlocked: Number(statusCounts.authorization_blocked || 0),
            runtimeMissing: Number(statusCounts.runtime_missing || 0),
            runtimeNeedsResync: Number(statusCounts.runtime_needs_resync || 0),
            unauthorizedAttempts: rows.reduce((sum, row) => sum + Number(row.invocation?.summary?.unauthorized || 0), 0),
            observedInvocations: rows.reduce((sum, row) => sum + Number(row.invocation?.summary?.totalObserved || 0), 0),
            statusCounts,
        },
        gate,
        rows,
    };
}
function goalRequirement(id, label, status, evidence = {}, blockers = [], nextActions = []) {
    return {
        id,
        label,
        status,
        proven: status === "proven",
        evidence,
        blockers,
        nextActions,
    };
}
function buildMarketplaceGoalEvidence(input = {}) {
    const entries = Array.isArray(input.marketplaceOperations?.items)
        ? input.marketplaceOperations.items
        : readRecentJsonl(MARKETPLACE_OPERATIONS_AUDIT_FILE, 120);
    const installOrUpdate = entries.filter((entry) => ["install", "update"].includes(String(entry?.action || "")));
    const uninstall = entries.filter((entry) => String(entry?.action || "") === "uninstall");
    const sourceProof = entries.filter((entry) => entry?.sourceProof?.schema === "ccm-marketplace-source-proof-v1");
    const runtimeBridge = entries.filter((entry) => entry?.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1"
        && entry?.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1");
    return {
        operations: entries.length,
        installOrUpdate: installOrUpdate.length,
        uninstall: uninstall.length,
        sourceProof: sourceProof.length,
        runtimeBridge: runtimeBridge.length,
        hasLifecycleEvidence: installOrUpdate.length > 0 && sourceProof.length > 0,
        hasRuntimeBridgeEvidence: runtimeBridge.length > 0,
    };
}
function buildRuntimeGoalEvidence(chain = {}) {
    const summary = chain.summary || {};
    const gate = chain.gate || {};
    return {
        configuredScopes: Number(summary.configuredScopes || 0),
        verifiedScopes: Number(summary.verified || 0),
        readyNotObserved: Number(summary.readyNotObserved || 0),
        verificationIncomplete: Number(summary.verificationIncomplete || 0),
        needsAttention: Number(summary.needsAttention || 0),
        authorizationBlocked: Number(summary.authorizationBlocked || 0),
        runtimeMissing: Number(summary.runtimeMissing || 0),
        runtimeNeedsResync: Number(summary.runtimeNeedsResync || 0),
        unauthorizedAttempts: Number(summary.unauthorizedAttempts || 0),
        observedInvocations: Number(summary.observedInvocations || 0),
        gateStatus: String(gate.status || "not_configured"),
        dispatchReady: gate.dispatchReady === true,
        verified: gate.verified === true,
    };
}
function hasOwnKey(value, key) {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
}
function normalizeTruthFlag(value) {
    return value === true || value === 1 || String(value || "").toLowerCase() === "true" || String(value || "") === "1";
}
function normalizeRealCliRuntime(value) {
    const compact = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (["claudecode", "claudecodecli", "claude"].includes(compact))
        return "claudecode";
    if (compact === "cursor")
        return "cursor";
    if (compact === "codex")
        return "codex";
    return "";
}
function normalizeRealCliProbeTarget(target = {}) {
    return {
        groupId: cleanAuditText(target.group_id || target.groupId || "", 80),
        project: cleanAuditText(target.project || target.projectName || target.project_id || target.projectId || "", 120),
        agentType: normalizeRealCliRuntime(target.agent_type || target.agentType || target.runtime),
    };
}
function normalizeRealCliProbeFilter(input = {}) {
    const target = input.probeTarget || input.probe_target || input.target || input;
    return {
        groupId: cleanAuditText(target.group_id || target.groupId || "", 80),
        project: cleanAuditText(target.project || target.projectName || target.project_id || target.projectId || "", 120),
    };
}
function realCliProbeMatchesFilter(probe, filter) {
    const target = normalizeRealCliProbeTarget(probe?.target || {});
    return (!filter.groupId || target.groupId === filter.groupId)
        && (!filter.project || target.project.toLowerCase() === filter.project.toLowerCase());
}
function listRealCliProbeStatusInputs(input = {}) {
    const provided = input.realCliProbeStatuses || input.real_cli_probe_statuses;
    if (Array.isArray(provided))
        return provided.map((probe) => ({ probe, sourceFile: "", source: "input" }));
    const single = input.realCliProbeStatus || input.real_cli_probe_status;
    if (single)
        return [{ probe: single, sourceFile: "", source: "input" }];
    const entries = [];
    const matrix = (0, runtime_tool_real_cli_matrix_1.getRuntimeToolRealCliMatrixStatus)();
    if (matrix?.schema === "ccm-runtime-tool-real-cli-matrix-v1" && Array.isArray(matrix.results)) {
        for (const probe of matrix.results)
            entries.push({ probe, sourceFile: "runtime-tool-real-cli-matrix.json", source: "runtime_tool_real_cli_matrix" });
    }
    const latest = readJsonFileSafe(AGENT_PROBE_STATUS_FILE);
    if (latest)
        entries.push({ probe: latest, sourceFile: path.basename(AGENT_PROBE_STATUS_FILE), source: "persisted_agent_probe" });
    try {
        if (fs.existsSync(AGENT_PROBE_TARGET_STATUS_DIR)) {
            for (const file of fs.readdirSync(AGENT_PROBE_TARGET_STATUS_DIR)) {
                if (!file.endsWith(".json"))
                    continue;
                const fullPath = path.join(AGENT_PROBE_TARGET_STATUS_DIR, file);
                const probe = readJsonFileSafe(fullPath);
                if (probe)
                    entries.push({ probe, sourceFile: file, source: "persisted_agent_probe" });
            }
        }
    }
    catch { }
    return entries;
}
function normalizeRealCliProbeStatus(entry) {
    const probe = entry?.probe || entry || {};
    const target = normalizeRealCliProbeTarget(probe.target || {});
    const runtime = target.agentType || normalizeRealCliRuntime(probe.agent_type || probe.agentType || probe.runtime);
    if (!["claudecode", "cursor", "codex"].includes(runtime))
        return null;
    const checkedAt = cleanAuditText(probe.checked_at || probe.checkedAt || probe.at || "", 80);
    const checkedAtMs = checkedAt ? Date.parse(checkedAt) : NaN;
    const ageMs = Number.isFinite(checkedAtMs) ? Math.max(0, Date.now() - checkedAtMs) : null;
    const nativeToolEvidence = probe.schema === "ccm-runtime-tool-real-cli-e2e-v1"
        && probe.mcpInvocationObserved === true
        && probe.skillInvocationObserved === true
        && probe.snapshotValidated === true
        && probe.versionMatches !== false;
    const success = probe.success === true && nativeToolEvidence;
    const fresh = success && ageMs !== null && ageMs <= REAL_CLI_PROBE_SUCCESS_FRESH_MS;
    const expectedMarker = cleanAuditText(probe.expected_marker || probe.expectedMarker || "", 120);
    return {
        runtime,
        success,
        fresh,
        status: fresh ? "fresh_ok" : (success ? "stale_ok" : "failed"),
        checkedAt,
        ageMs,
        target,
        source: entry?.source || "input",
        sourceFile: cleanAuditText(entry?.sourceFile || "", 160),
        executionPath: cleanAuditText(probe.execution_path || probe.executionPath || "", 120),
        expectedMarker,
        markerObserved: expectedMarker ? String(probe.output_preview || probe.outputPreview || "").includes(expectedMarker) : null,
        nativeToolEvidence,
        mcpInvocationObserved: probe.mcpInvocationObserved === true,
        skillInvocationObserved: probe.skillInvocationObserved === true,
        snapshotValidated: probe.snapshotValidated === true,
        durationMs: safeAuditNumber(probe.duration_ms || probe.durationMs),
    };
}
function buildPersistedRealCliProbeEvidence(input = {}) {
    const filter = normalizeRealCliProbeFilter(input);
    const seen = new Set();
    const probes = listRealCliProbeStatusInputs(input)
        .filter((entry) => realCliProbeMatchesFilter(entry?.probe, filter))
        .map((entry) => normalizeRealCliProbeStatus(entry))
        .filter(Boolean)
        .filter((probe) => {
        const key = [
            probe.runtime,
            probe.target?.groupId,
            probe.target?.project,
            probe.checkedAt,
            probe.success ? "1" : "0",
            probe.expectedMarker,
        ].join("|");
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .sort((a, b) => Date.parse(b.checkedAt || "") - Date.parse(a.checkedAt || ""));
    const runtimes = {
        claudecode: { required: true, freshSuccesses: 0, successes: 0, failures: 0, latest: null },
        cursor: { required: true, freshSuccesses: 0, successes: 0, failures: 0, latest: null },
        codex: { required: true, freshSuccesses: 0, successes: 0, failures: 0, latest: null },
    };
    for (const probe of probes) {
        const runtime = runtimes[probe.runtime];
        if (!runtime)
            continue;
        if (!runtime.latest)
            runtime.latest = probe;
        if (probe.success)
            runtime.successes += 1;
        else
            runtime.failures += 1;
        if (probe.fresh)
            runtime.freshSuccesses += 1;
    }
    return {
        source: probes.some((probe) => probe.source === "input") ? "input_probe_status" : "persisted_agent_probe",
        freshWindowMs: REAL_CLI_PROBE_SUCCESS_FRESH_MS,
        filter,
        probesFound: probes.length,
        runtimes,
    };
}
function hasExplicitRealCliEvidence(input = {}) {
    return hasOwnKey(input, "realCliE2E") || hasOwnKey(input, "real_cli_e2e");
}
function normalizeRealCliEvidence(value = {}, input = {}) {
    if (!hasExplicitRealCliEvidence(input)) {
        const probes = buildPersistedRealCliProbeEvidence(input);
        return {
            claudecode: probes.runtimes.claudecode.freshSuccesses > 0,
            cursor: probes.runtimes.cursor.freshSuccesses > 0,
            codex: probes.runtimes.codex.freshSuccesses > 0,
            source: probes.source,
            probes,
        };
    }
    const explicit = value || {};
    return {
        claudecode: normalizeTruthFlag(explicit.claudecode) || normalizeTruthFlag(explicit.claudeCode) || normalizeTruthFlag(explicit.claude_code),
        cursor: normalizeTruthFlag(explicit.cursor),
        codex: normalizeTruthFlag(explicit.codex),
        source: "input",
        probes: null,
    };
}
function buildMcpSkillGoalCompletionAudit(input = {}) {
    const chain = input.chainVerification || buildToolChainVerification(input);
    const runtime = buildRuntimeGoalEvidence(chain);
    const marketplace = buildMarketplaceGoalEvidence(input);
    const realCli = normalizeRealCliEvidence(input.realCliE2E || input.real_cli_e2e || {}, input);
    const realCliReady = realCli.claudecode && realCli.cursor && realCli.codex;
    const requirements = [
        goalRequirement("central_authorization_catalog", "CCM central MCP/Skill catalog is connected to project/group authorization", runtime.configuredScopes > 0 ? "proven" : "missing", { configuredScopes: runtime.configuredScopes, gateStatus: runtime.gateStatus }, runtime.configuredScopes > 0 ? [] : [{ id: "no_configured_scope", detail: "No configured project/group MCP/Skill authorization scope was found" }], runtime.configuredScopes > 0 ? [] : [{ kind: "configure_scope_tools", label: "Configure MCP/Skill for a project or group" }]),
        goalRequirement("dispatch_gate_ready", "Runtime dispatch gate blocks unsafe scopes and allows ready scopes", runtime.dispatchReady ? (runtime.verified ? "proven" : "partial") : "missing", { gateStatus: runtime.gateStatus, dispatchReady: runtime.dispatchReady, verified: runtime.verified, needsAttention: runtime.needsAttention }, runtime.dispatchReady ? [] : [{ id: "dispatch_gate_blocked", detail: `Gate status: ${runtime.gateStatus}` }], runtime.dispatchReady ? [] : [{ kind: "open_chain_verification", label: "Open chain verification blockers" }]),
        goalRequirement("runtime_artifact_delivery", "Authorized MCP/Skill runtime artifacts are ready for configured child-agent scopes", runtime.runtimeMissing === 0 && runtime.runtimeNeedsResync === 0 && runtime.configuredScopes > 0 ? "proven" : "missing", { runtimeMissing: runtime.runtimeMissing, runtimeNeedsResync: runtime.runtimeNeedsResync, configuredScopes: runtime.configuredScopes }, [
            ...(runtime.runtimeMissing ? [{ id: "runtime_missing", detail: `${runtime.runtimeMissing} configured scopes have no runtime snapshot` }] : []),
            ...(runtime.runtimeNeedsResync ? [{ id: "runtime_needs_resync", detail: `${runtime.runtimeNeedsResync} runtime snapshots need resync` }] : []),
        ], runtime.runtimeMissing || runtime.runtimeNeedsResync ? [{ kind: "runtime_resync", label: "Resync affected runtime snapshots" }] : []),
        goalRequirement("observed_child_agent_invocation", "Authorized MCP/Skill use has been observed through child-agent execution audit", runtime.verifiedScopes > 0 && runtime.verifiedScopes === runtime.configuredScopes ? "proven" : (runtime.observedInvocations > 0 ? "partial" : "missing"), { verifiedScopes: runtime.verifiedScopes, configuredScopes: runtime.configuredScopes, observedInvocations: runtime.observedInvocations, readyNotObserved: runtime.readyNotObserved }, runtime.verifiedScopes === runtime.configuredScopes && runtime.configuredScopes > 0 ? [] : [{ id: "observation_gap", detail: "Not every configured scope has observed authorized MCP/Skill invocation evidence" }], [{ kind: "run_scope_real_tasks", label: "Run real tool-using tasks in each pending project or group" }]),
        goalRequirement("unauthorized_use_blocked", "Unauthorized MCP/Skill attempts are blocked and visible", runtime.unauthorizedAttempts === 0 ? "proven" : "missing", { unauthorizedAttempts: runtime.unauthorizedAttempts }, runtime.unauthorizedAttempts ? [{ id: "unauthorized_attempts", detail: `${runtime.unauthorizedAttempts} unauthorized attempts found in audit` }] : [], runtime.unauthorizedAttempts ? [{ kind: "open_invocation_audit", label: "Inspect unauthorized invocation audit" }] : []),
        goalRequirement("marketplace_lifecycle_bridge", "Marketplace external source lifecycle reaches authorization and runtime resync", marketplace.hasLifecycleEvidence && marketplace.hasRuntimeBridgeEvidence ? "proven" : (marketplace.operations > 0 ? "partial" : "missing"), marketplace, marketplace.hasLifecycleEvidence && marketplace.hasRuntimeBridgeEvidence ? [] : [{ id: "marketplace_evidence_gap", detail: "Need source proof plus install/update/uninstall runtime bridge evidence" }], [{ kind: "marketplace_install_e2e", label: "Install or update a marketplace MCP/Skill with auto runtime resync" }]),
        goalRequirement("real_cli_e2e", "Real Claude Code, Cursor, and Codex CLI E2E has proven native discovery and invocation", realCliReady ? "proven" : "missing", realCli, realCliReady ? [] : [{ id: "real_cli_e2e_missing", detail: "Artifact/self-test evidence exists, but real CLI invocation proof is not complete for all target runtimes" }], realCliReady ? [] : [{ kind: "run_real_cli_matrix", label: "Run real Claude Code/Cursor/Codex E2E matrix" }]),
    ];
    const counts = requirements.reduce((acc, item) => {
        acc[item.status] = Number(acc[item.status] || 0) + 1;
        return acc;
    }, { proven: 0, partial: 0, missing: 0 });
    const complete = requirements.every((item) => item.status === "proven");
    return {
        schema: "ccm-mcp-skill-goal-completion-audit-v1",
        success: true,
        generatedAt: new Date().toISOString(),
        status: complete ? "complete" : (counts.missing ? "incomplete" : "partial"),
        complete,
        summary: {
            requirements: requirements.length,
            proven: counts.proven,
            partial: counts.partial,
            missing: counts.missing,
        },
        requirements,
        chainGate: chain.gate || null,
    };
}
function buildToolChainVerificationSelfTestRow(input = {}) {
    const configured = input.configured !== false;
    const counts = configured ? (input.counts || { mcp: 1, skill: 1 }) : { mcp: 0, skill: 0 };
    return {
        schema: "ccm-tool-authorization-inventory-scope-v1",
        scope: input.scope || "project",
        id: input.id || "project-alpha",
        name: input.name || input.id || "Project Alpha",
        tools: configured ? (input.tools || { mcp: ["payments"], skill: ["release-notes"] }) : { mcp: [], skill: [] },
        counts,
        audit_summary: input.audit_summary || {},
        authorization_readiness: input.authorization_readiness || {
            dispatchReady: true,
            status: "ready",
            requested: counts,
            available: counts,
            missing: {},
            invalid_mcp_grants: 0,
        },
        runtime: input.runtime || {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: configured ? 1 : 0, overallReady: configured ? 1 : 0, deliveryReady: configured ? 1 : 0, runtimeReady: configured ? 1 : 0, needsResync: 0 },
            snapshots: configured ? [{
                    runtime: "codex",
                    snapshotId: `${input.id || "project-alpha"}-snapshot`,
                    projectName: input.id || "project-alpha",
                    groupId: "",
                    deliveryReady: true,
                    runtimeReady: true,
                    overallReady: true,
                    catalogStale: false,
                    dispatchReady: true,
                }] : [],
        },
    };
}
// ===== merged from tools-part-01-part-02.ts =====
function runToolChainVerificationSelfTest() {
    const verifiedReport = buildToolChainVerification({
        inventory: {
            scopes: [buildToolChainVerificationSelfTestRow({ id: "project-alpha", name: "Alpha App" })],
        },
        invocationAudit: {
            items: [{
                    at: "2026-07-07T00:00:00.000Z",
                    category: "tool",
                    type: "tool_call",
                    project: "Alpha App",
                    tool: "payments/createInvoice",
                    ok: true,
                }, {
                    at: "2026-07-07T00:00:01.000Z",
                    category: "skill",
                    type: "skill_invoked",
                    project: "Alpha App",
                    skill: "release-notes",
                    ok: true,
                }],
        },
    });
    const failedInvocationReport = buildToolChainVerification({
        inventory: {
            scopes: [buildToolChainVerificationSelfTestRow({ id: "project-failed", name: "Failed App" })],
        },
        invocationAudit: {
            items: [{
                    at: "2026-07-07T00:00:00.000Z",
                    category: "tool",
                    type: "tool_call",
                    project: "Failed App",
                    tool: "payments/createInvoice",
                    ok: false,
                }, {
                    at: "2026-07-07T00:00:01.000Z",
                    category: "skill",
                    type: "skill_missing",
                    project: "Failed App",
                    skill: "release-notes",
                    ok: false,
                }],
        },
    });
    const readyUnverifiedReport = buildToolChainVerification({
        inventory: {
            scopes: [buildToolChainVerificationSelfTestRow({ id: "project-ready", name: "Ready App" })],
        },
        invocationAudit: { items: [] },
    });
    const authorizationBlockedRow = buildToolChainVerificationSelfTestRow({
        id: "project-auth-blocked",
        authorization_readiness: {
            dispatchReady: false,
            status: "needs_attention",
            requested: { mcp: 1, skill: 1 },
            available: { mcp: 0, skill: 0 },
            missing: { missing_mcp_servers: 1, missing_mcp_tools: 0, missing_skills: 1 },
            invalid_mcp_grants: 0,
        },
    });
    const runtimeMissingRow = buildToolChainVerificationSelfTestRow({
        id: "project-runtime-missing",
        runtime: {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: 0, overallReady: 0, deliveryReady: 0, runtimeReady: 0, needsResync: 0 },
            snapshots: [],
        },
    });
    const runtimeNeedsResyncRow = buildToolChainVerificationSelfTestRow({
        id: "project-runtime-stale",
        runtime: {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: 1, overallReady: 0, deliveryReady: 0, runtimeReady: 1, needsResync: 1 },
            snapshots: [{
                    runtime: "cursor",
                    snapshotId: "stale-snapshot",
                    projectName: "project-runtime-stale",
                    groupId: "",
                    deliveryReady: false,
                    runtimeReady: true,
                    overallReady: false,
                    catalogStale: true,
                    dispatchReady: true,
                }],
        },
    });
    const unauthorizedRow = buildToolChainVerificationSelfTestRow({ scope: "group", id: "group-1", name: "Group One" });
    const emptyRow = buildToolChainVerificationSelfTestRow({ id: "project-empty", configured: false });
    const unauthorizedAudit = {
        items: [{
                at: "2026-07-07T00:02:00.000Z",
                category: "unauthorized",
                type: "tool_unauthorized",
                groupId: "group-1",
                tool: "payments/deleteInvoice",
                ok: false,
            }],
    };
    const blockedReport = buildToolChainVerification({
        inventory: {
            scopes: [authorizationBlockedRow, runtimeMissingRow, runtimeNeedsResyncRow, unauthorizedRow, emptyRow],
        },
        invocationAudit: unauthorizedAudit,
    });
    const staleRow = blockedReport.rows.find((row) => row.id === "project-runtime-stale");
    const staleResyncAction = staleRow?.nextActions?.find((action) => action.kind === "runtime_resync");
    const filteredGroupReport = buildToolChainVerification({
        groupId: "group-1",
        inventory: { scopes: [authorizationBlockedRow, unauthorizedRow] },
        invocationAudit: unauthorizedAudit,
    });
    const marketplaceLifecycleEvidence = {
        action: "install",
        sourceProof: { schema: "ccm-marketplace-source-proof-v1" },
        runtimeImpact: { schema: "ccm-marketplace-runtime-impact-v1" },
        runtimeResync: { schema: "ccm-marketplace-runtime-resync-v1" },
    };
    const freshProbeCheckedAt = new Date().toISOString();
    const staleProbeCheckedAt = new Date(Date.now() - REAL_CLI_PROBE_SUCCESS_FRESH_MS - 1000).toISOString();
    const buildRealCliProbe = (runtime, checkedAt, success = true) => ({
        schema: "ccm-runtime-tool-real-cli-e2e-v1",
        success,
        checked_at: checkedAt,
        target: {
            group_id: "group-1",
            project: `probe-${runtime}`,
            agent_type: runtime,
        },
        execution_path: "selftest-native-cli",
        expected_marker: "CCM_AGENT_PROBE_OK",
        output_preview: success ? "CCM_AGENT_PROBE_OK" : "probe failed",
        duration_ms: 123,
        mcpInvocationObserved: success,
        skillInvocationObserved: success,
        snapshotValidated: success,
    });
    const completionReadyAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: verifiedReport,
        marketplaceOperations: {
            items: [marketplaceLifecycleEvidence],
        },
        realCliE2E: { claudecode: true, cursor: true, codex: true },
    });
    const completionPersistedProbeAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: verifiedReport,
        marketplaceOperations: { items: [marketplaceLifecycleEvidence] },
        realCliProbeStatuses: [
            buildRealCliProbe("claudecode", freshProbeCheckedAt),
            buildRealCliProbe("cursor", freshProbeCheckedAt),
            buildRealCliProbe("codex", freshProbeCheckedAt),
        ],
    });
    const completionStaleProbeAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: verifiedReport,
        marketplaceOperations: { items: [marketplaceLifecycleEvidence] },
        realCliProbeStatuses: [
            buildRealCliProbe("claudecode", staleProbeCheckedAt),
            buildRealCliProbe("cursor", staleProbeCheckedAt),
            buildRealCliProbe("codex", staleProbeCheckedAt),
        ],
    });
    const completionMissingAudit = buildMcpSkillGoalCompletionAudit({
        chainVerification: readyUnverifiedReport,
        marketplaceOperations: { items: [] },
        realCliE2E: { claudecode: false, cursor: false, codex: false },
    });
    const persistedProbeRequirement = completionPersistedProbeAudit.requirements.find((item) => item.id === "real_cli_e2e");
    const staleProbeRequirement = completionStaleProbeAudit.requirements.find((item) => item.id === "real_cli_e2e");
    const checks = {
        verifiedGatePassesObservedScope: verifiedReport.gate?.schema === "ccm-tool-chain-verification-gate-v1"
            && verifiedReport.gate.status === "verified"
            && verifiedReport.gate.dispatchReady === true
            && verifiedReport.gate.verified === true
            && verifiedReport.gate.counts.verifiedScopes === 1,
        readyUnverifiedRequiresObservation: readyUnverifiedReport.gate.status === "ready_unverified"
            && readyUnverifiedReport.gate.dispatchReady === true
            && readyUnverifiedReport.gate.verified === false
            && readyUnverifiedReport.gate.requiresObservation === true
            && readyUnverifiedReport.gate.counts.pendingObservationScopes === 1,
        failedInvocationDoesNotVerifyScope: failedInvocationReport.gate.status === "ready_unverified"
            && failedInvocationReport.gate.verified === false
            && failedInvocationReport.rows[0]?.status === "verification_incomplete"
            && failedInvocationReport.rows[0]?.invocation?.summary?.evidenceComplete === false
            && failedInvocationReport.rows[0]?.invocation?.summary?.missingEvidence?.includes("mcp_success")
            && failedInvocationReport.rows[0]?.invocation?.summary?.missingEvidence?.includes("skill_success"),
        incompleteScopeRoutesToRealBusinessTask: failedInvocationReport.rows[0]?.nextActions?.some((action) => (action.kind === "open_scope_real_task"
            && action.scope === "project"
            && action.scopeId === "project-failed"
            && action.label === "前往项目执行真实任务")) === true
            && failedInvocationReport.rows[0]?.nextActions?.every((action) => action.kind !== "run_child_agent_e2e") === true,
        blockedGateBlocksDispatch: blockedReport.gate.status === "blocked"
            && blockedReport.gate.dispatchReady === false
            && blockedReport.gate.counts.blockingScopes === 4
            && blockedReport.gate.blockingStatuses.includes("authorization_blocked")
            && blockedReport.gate.blockingStatuses.includes("runtime_missing")
            && blockedReport.gate.blockingStatuses.includes("runtime_needs_resync")
            && blockedReport.gate.blockingStatuses.includes("unauthorized_attempts"),
        unconfiguredScopeExcludedFromConfiguredGate: blockedReport.gate.counts.unconfiguredScopes === 1
            && !blockedReport.gate.blockingScopes.some((row) => row.id === "project-empty"),
        runtimeResyncActionTargetsSnapshot: staleResyncAction?.resyncPayload?.staleOnly === false
            && staleResyncAction?.resyncPayload?.snapshotIds?.[0] === "stale-snapshot",
        gateAggregatesNextActions: blockedReport.gate.nextActions.length >= 4
            && blockedReport.gate.nextActions.some((action) => action.kind === "open_invocation_audit" && action.scopeId === "group-1"),
        groupFilterGatesOnlyGroupScope: filteredGroupReport.rows.length === 1
            && filteredGroupReport.rows[0]?.id === "group-1"
            && filteredGroupReport.gate.counts.configuredScopes === 1
            && filteredGroupReport.gate.status === "blocked",
        projectAliasInvocationEvidence: verifiedReport.rows[0]?.invocation?.summary?.totalObserved === 2
            && verifiedReport.rows[0]?.invocation?.summary?.evidenceComplete === true,
        completionAuditCanReachCompleteWithFullEvidence: completionReadyAudit.schema === "ccm-mcp-skill-goal-completion-audit-v1"
            && completionReadyAudit.complete === true
            && completionReadyAudit.status === "complete"
            && completionReadyAudit.summary.missing === 0,
        completionAuditUsesFreshPersistedCliProbeEvidence: completionPersistedProbeAudit.complete === true
            && persistedProbeRequirement?.status === "proven"
            && persistedProbeRequirement?.evidence?.source === "input_probe_status"
            && persistedProbeRequirement?.evidence?.probes?.runtimes?.codex?.freshSuccesses === 1,
        completionAuditRejectsStaleCliProbeEvidence: completionStaleProbeAudit.complete === false
            && staleProbeRequirement?.status === "missing"
            && staleProbeRequirement?.evidence?.codex === false
            && staleProbeRequirement?.evidence?.probes?.runtimes?.codex?.latest?.status === "stale_ok",
        completionAuditKeepsGoalIncompleteWithoutRealCliAndMarketplaceEvidence: completionMissingAudit.complete === false
            && completionMissingAudit.status === "incomplete"
            && completionMissingAudit.requirements.some((item) => item.id === "real_cli_e2e" && item.status === "missing")
            && completionMissingAudit.requirements.some((item) => item.id === "marketplace_lifecycle_bridge" && item.status === "missing"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        reports: {
            verified: verifiedReport.gate,
            readyUnverified: readyUnverifiedReport.gate,
            blocked: blockedReport.gate,
            filteredGroup: filteredGroupReport.gate,
            completionReady: completionReadyAudit,
            completionPersistedProbe: completionPersistedProbeAudit,
            completionStaleProbe: completionStaleProbeAudit,
            completionMissing: completionMissingAudit,
        },
    };
}
// === 终端模拟器辅助函数 ===
function normalizeTerminalCwd(cwd) {
    const candidate = cwd && typeof cwd === "string" ? cwd : os.homedir();
    try {
        const stat = fs.statSync(candidate);
        if (stat.isDirectory())
            return candidate;
    }
    catch { }
    return os.homedir();
}
function splitTerminalCwd(output, marker) {
    const text = output || "";
    const markerIndex = text.lastIndexOf(marker);
    if (markerIndex < 0)
        return { output: text, cwd: null };
    const before = text.slice(0, markerIndex).replace(/(?:\r?\n)+$/, "");
    const after = text.slice(markerIndex + marker.length).trim();
    const firstLine = after.split(/\r?\n/)[0]?.trim() || null;
    return { output: before ? before + os.EOL : "", cwd: firstLine };
}
async function runTerminalCommand(command, cwd, options = {}) {
    const workDir = normalizeTerminalCwd(cwd);
    const marker = `__CCM_TERMINAL_CWD_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    const maxOutputBytes = 5 * 1024 * 1024;
    const script = process.platform === "win32"
        ? [
            "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new();",
            "$OutputEncoding = [System.Text.UTF8Encoding]::new();",
            command,
            `Write-Output "${marker}$((Get-Location).ProviderPath)"`,
        ].join("\n")
        : `${command}\nprintf '\\n${marker}%s\\n' "$PWD"`;
    const executable = process.platform === "win32" ? "powershell.exe" : "bash";
    const args = process.platform === "win32"
        ? ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]
        : ["-lc", script];
    return new Promise(resolve => {
        const child = (0, child_process_1.spawn)(executable, args, {
            cwd: workDir,
            windowsHide: true,
            detached: process.platform !== "win32",
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
        });
        let stdout = "";
        let stderr = "";
        let outputBytes = 0;
        let outputTruncated = false;
        let timedOut = false;
        let cancelled = false;
        let stopReceipt = null;
        let stopPromise = null;
        let settled = false;
        let spawnError = null;
        const append = (target, chunk) => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk || "");
            const remaining = Math.max(0, maxOutputBytes - outputBytes);
            if (!remaining) {
                outputTruncated = true;
                return;
            }
            const accepted = Buffer.from(text, "utf-8").subarray(0, remaining).toString("utf-8");
            outputBytes += Buffer.byteLength(accepted, "utf-8");
            if (accepted.length < text.length)
                outputTruncated = true;
            if (target === "stdout")
                stdout += accepted;
            else
                stderr += accepted;
        };
        child.stdout?.on("data", chunk => append("stdout", chunk));
        child.stderr?.on("data", chunk => append("stderr", chunk));
        child.once("error", error => { spawnError = error; });
        const stop = async (reason) => {
            if (settled || !child.pid)
                return;
            if (reason === "timeout")
                timedOut = true;
            else
                cancelled = true;
            stopReceipt = await (0, managed_process_tree_1.terminateManagedProcessTree)(child, { gracefulTimeoutMs: 1_500, forceTimeoutMs: 2_000 });
        };
        const requestStop = (reason) => {
            if (!stopPromise)
                stopPromise = stop(reason);
            return stopPromise;
        };
        const timeout = setTimeout(() => { void requestStop("timeout"); }, Math.max(1_000, Math.min(10 * 60_000, Number(options.timeoutMs || 30_000))));
        timeout.unref?.();
        const abort = () => { void requestStop("cancel"); };
        options.signal?.addEventListener("abort", abort, { once: true });
        child.once("close", async (code) => {
            settled = true;
            clearTimeout(timeout);
            options.signal?.removeEventListener("abort", abort);
            if (stopPromise)
                await stopPromise;
            const parsed = splitTerminalCwd(stdout, marker);
            const exitCode = Number.isInteger(code) ? Number(code) : 1;
            const stderrText = String(stderr || "").trim();
            resolve({
                success: exitCode === 0 && !spawnError && !timedOut && !cancelled,
                output: parsed.output,
                cwd: parsed.cwd && fs.existsSync(parsed.cwd) ? parsed.cwd : workDir,
                exitCode,
                timedOut,
                cancelled,
                outputTruncated,
                stopReceipt,
                error: spawnError?.message || (timedOut ? "命令执行超时" : cancelled ? "命令已取消" : exitCode ? `Exit code: ${exitCode}` : stderrText),
            });
        });
    });
}
// === 共享文件系统辅助函数 ===
function listSharedFiles() {
    (0, utils_1.ensureSharedDir)();
    const legacy = fs.readdirSync(utils_1.SHARED_DIR)
        .filter(f => !f.startsWith("."))
        .map(f => {
        const target = path.join(utils_1.SHARED_DIR, f);
        const stat = fs.lstatSync(target);
        if (!stat.isFile() || stat.isSymbolicLink())
            return null;
        const ext = path.extname(f).toLowerCase();
        const type = (0, utils_1.isTextFileName)(f) ? "text" : (0, utils_1.isImageFileName)(f) ? "image" : (0, utils_1.isOoxmlFileName)(f) ? ext.slice(1) : "file";
        return { name: f, size: stat.size, modified: stat.mtime.toISOString(), type, path: target };
    })
        .filter(Boolean)
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    (0, shared_files_v2_1.migrateLegacySharedFilesV2)("global", "global", legacy, "global-shared-v1");
    return (0, shared_files_v2_1.listSharedFilesV2)("global", "global");
}
function readSharedFile(name) {
    const safeName = (0, shared_files_v2_1.validateSharedFileV2Name)(name);
    listSharedFiles();
    const item = (0, shared_files_v2_1.listSharedFilesV2)("global", "global").find((file) => file.name === safeName);
    return item ? (0, shared_files_v2_1.readSharedFileV2)("global", "global", item.id) : null;
}
// 写入/创建共享文件
function writeSharedFile(name, content) {
    return (0, shared_files_v2_1.upsertSharedTextV2)("global", "global", name, content);
}
function saveSharedUpload(filename, buffer) {
    const name = (0, shared_files_v2_1.validateSharedFileV2Name)(filename);
    const staging = path.join(utils_1.SHARED_DIR, `.compat-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);
    fs.writeFileSync(staging, buffer, { mode: 0o600 });
    try {
        return (0, shared_files_v2_1.adoptSharedUploadV2)("global", "global", { filename: name, savedPath: staging, contentType: "" });
    }
    finally {
        try {
            fs.unlinkSync(staging);
        }
        catch { }
    }
}
function deleteSharedFile(name) {
    const safeName = (0, shared_files_v2_1.validateSharedFileV2Name)(name);
    const item = listSharedFiles().find((file) => file.name === safeName);
    if (item)
        (0, shared_files_v2_1.deleteSharedFileV2)("global", "global", item.id);
    const root = fs.realpathSync.native(utils_1.SHARED_DIR);
    const candidate = path.join(root, safeName);
    if (fs.existsSync(candidate)) {
        const stat = fs.lstatSync(candidate);
        const real = fs.realpathSync.native(candidate);
        const relative = path.relative(root, real);
        if (!stat.isFile() || stat.isSymbolicLink() || relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("共享文件路径不安全");
        }
        fs.unlinkSync(candidate);
    }
}
// 物理 Customizations Skills 路径
const customSkillRoots = [
    { root: db_1.SKILL_PACKAGES_DIR, source: "ccm" },
    { root: path.join(os.homedir(), ".gemini", "config", "skills"), source: "gemini" },
];
function skillTemplateRoot() {
    const configured = String(process.env.CCM_ROLE_SKILL_TEMPLATE_ROOT || "").trim();
    return configured
        ? path.resolve(configured)
        : path.resolve(__dirname, "..", "..", "..", "templates", "skills");
}
function readSkillManual(name) {
    const normalizedName = (0, tool_catalog_management_1.normalizeToolCatalogName)(name);
    const skill = (0, db_1.loadSkills)().find(item => String(item.name) === normalizedName);
    if (!skill)
        return null;
    let skillFile = "";
    if ((0, internal_skill_catalog_1.isCcmInternalSkillName)(normalizedName)) {
        skillFile = path.join(skillTemplateRoot(), normalizedName.toLowerCase(), "SKILL.md");
    }
    else if (skill?.packagePath) {
        const packageRoot = path.resolve(db_1.SKILL_PACKAGES_DIR);
        const packagePath = path.resolve(String(skill.packagePath));
        const relative = path.relative(packageRoot, packagePath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("外部 Skill 手册路径不在受控目录中");
        }
        skillFile = path.join(packagePath, "SKILL.md");
    }
    let content = "";
    if (skillFile) {
        if (!fs.existsSync(skillFile))
            throw new Error(`Skill 手册不存在：${normalizedName}`);
        if (fs.statSync(skillFile).size > 1024 * 1024)
            throw new Error("Skill 手册超过 1 MB，无法在线查看");
        content = fs.readFileSync(skillFile, "utf-8");
    }
    else {
        content = `---\nname: ${normalizedName}\ndescription: ${String(skill.description || "").replace(/[\r\n]+/g, " ")}\n---\n\n${String(skill.prompt || "").trim()}`;
    }
    return {
        id: normalizedName,
        name: normalizedName,
        description: String(skill.description || ""),
        content,
        source: (0, internal_skill_catalog_1.isCcmInternalSkillName)(normalizedName) ? "ccm-internal" : String(skill.origin || "user"),
        readOnly: (0, internal_skill_catalog_1.isCcmInternalSkillName)(normalizedName) || skill.immutable === true,
    };
}
function loadCustomSkills() {
    const result = [];
    const seen = new Set();
    for (const source of customSkillRoots) {
        if (!fs.existsSync(source.root))
            continue;
        try {
            const folders = fs.readdirSync(source.root, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith("."));
            for (const folder of folders) {
                if ((0, internal_skill_catalog_1.isCcmInternalSkillName)(folder.name))
                    continue;
                const folderPath = path.join(source.root, folder.name);
                const skillMdPath = path.join(folderPath, "SKILL.md");
                if (!fs.existsSync(skillMdPath))
                    continue;
                const mdContent = fs.readFileSync(skillMdPath, "utf-8");
                let name = folder.name;
                let description = "";
                const fmMatch = mdContent.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
                const yamlText = fmMatch ? fmMatch[1] : mdContent.substring(0, 500);
                const nameMatch = yamlText.match(/^name:\s*(.*)$/mi);
                const descMatch = yamlText.match(/^description:\s*(.*)$/mi);
                if (nameMatch)
                    name = nameMatch[1].replace(/^['"]|['"]$/g, "").trim();
                if (descMatch)
                    description = descMatch[1].replace(/^['"]|['"]$/g, "").trim();
                if ((0, internal_skill_catalog_1.isCcmInternalSkillName)(name))
                    continue;
                if (seen.has(name))
                    continue;
                seen.add(name);
                result.push({
                    id: folder.name,
                    name,
                    description,
                    source: source.source,
                    packagePath: folderPath,
                    mdPath: skillMdPath,
                    content: mdContent
                });
            }
        }
        catch (e) {
            console.error(`加载 ${source.source} Skill 包失败:`, e);
        }
    }
    return result;
}
// ===== merged from tools-part-02.ts =====
function normalizeScopedMcpServerName(value) {
    return String(value || "").trim().replace(/^ccm__/, "").toLowerCase();
}
function resolveCatalogAuthorizationScope(query = {}) {
    const scope = String(query?.scope || "").trim().toLowerCase();
    if (!scope)
        return null;
    if (scope === "global") {
        return { scope: "global", scopeId: "global-agent", tools: (0, tool_authorization_1.normalizeToolAuthorization)((0, global_agent_tool_authorization_1.loadGlobalAgentToolAuthorization)()?.tools || {}) };
    }
    if (scope === "project") {
        const project = String(query?.project || query?.project_id || "").trim();
        if (!project)
            throw new Error("缺少项目名称");
        const config = (0, db_1.loadProjectConfigs)()?.[project];
        if (!config)
            throw new Error("项目不存在");
        return { scope: "project", scopeId: project, tools: (0, tool_authorization_1.normalizeToolAuthorization)(config?.tools || {}) };
    }
    if (scope === "group") {
        const groupId = String(query?.group_id || query?.groupId || query?.id || "").trim();
        if (!groupId)
            throw new Error("缺少群聊 ID");
        const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === groupId);
        if (!group)
            throw new Error("群聊不存在");
        return { scope: "group", scopeId: groupId, tools: (0, tool_authorization_1.normalizeToolAuthorization)(group?.tools || {}) };
    }
    throw new Error("工具目录作用域无效");
}
function buildSafeMcpRuntimeMap() {
    const runtime = toolManager.getToolList();
    const runtimeByServer = new Map();
    for (const server of (Array.isArray(runtime?.servers) ? runtime.servers : [])) {
        const auth = server?.auth || {};
        const authState = auth?.tokenExpired
            ? "expired"
            : (auth?.needsUserAuth && auth?.authRequired && !auth?.authConfigured)
                ? "required"
                : auth?.authConfigured
                    ? "configured"
                    : "not_required";
        runtimeByServer.set(normalizeScopedMcpServerName(server?.name), {
            connected: server?.connected === true,
            state: String(server?.state || (server?.connected ? "connected" : "disconnected")),
            toolsCount: Math.max(0, Number(server?.toolsCount || 0)),
            authState,
            lastConnectedAt: String(server?.lastConnectedAt || ""),
            lastErrorAt: String(server?.lastErrorAt || ""),
            errorSummary: redactMcpRuntimeError(server?.error || auth?.message || ""),
        });
    }
    return runtimeByServer;
}
function redactMcpRuntimeError(value) {
    return cleanAuditText(value, 360)
        .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, "$1[redacted]")
        .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi, "[redacted-key]")
        .replace(/([?&](?:token|key|secret|password)=)[^&\s]+/gi, "$1[redacted]")
        .replace(/((?:api[_-]?key|secret|password|token)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
        .slice(0, 180);
}
function withSafeMcpRuntime(tool, runtimeByServer) {
    return {
        ...(0, tool_catalog_management_1.redactMcpToolForDisplay)(tool),
        runtime: runtimeByServer.get(normalizeScopedMcpServerName(tool?.name)) || {
            connected: false,
            state: "not_loaded",
            toolsCount: 0,
            authState: "unknown",
            lastConnectedAt: "",
            lastErrorAt: "",
            errorSummary: "",
        },
    };
}
function buildScopedMcpCatalog(query = {}) {
    const authorization = resolveCatalogAuthorizationScope(query);
    const catalog = (0, db_1.loadMcpTools)().filter(tool => !(0, internal_mcp_registry_1.isInternalMcpName)(tool?.name));
    const runtimeByServer = buildSafeMcpRuntimeMap();
    if (!authorization)
        return { success: true, tools: catalog.map(tool => withSafeMcpRuntime(tool, runtimeByServer)) };
    const parsedGrants = authorization.tools.mcp.map(tool_authorization_1.parseMcpGrant).filter(item => item.server);
    const matchedGrants = new Set();
    const tools = catalog.flatMap((tool) => {
        const serverKey = normalizeScopedMcpServerName(tool?.name);
        const grants = parsedGrants.filter(item => normalizeScopedMcpServerName(item.server) === serverKey);
        if (!grants.length)
            return [];
        grants.forEach(item => matchedGrants.add(item.raw));
        return [{
                ...withSafeMcpRuntime(tool, runtimeByServer),
                authorization: {
                    scope: authorization.scope,
                    scopeId: authorization.scopeId,
                    fullServer: grants.some(item => !item.tool),
                    tools: [...new Set(grants.map(item => item.tool).filter(Boolean))],
                    grants: grants.map(item => item.raw),
                },
            }];
    });
    return {
        success: true,
        scope: authorization.scope,
        scope_id: authorization.scopeId,
        tools,
        authorization: {
            requested: authorization.tools.mcp.length,
            available: matchedGrants.size,
            missing: authorization.tools.mcp.filter((grant) => !matchedGrants.has(grant)),
        },
    };
}
function buildScopedSkillCatalog(query = {}) {
    const authorization = resolveCatalogAuthorizationScope(query);
    const catalog = (0, db_1.loadSkills)();
    if (!authorization)
        return { skills: catalog };
    const authorized = new Set(authorization.tools.skill.map((name) => String(name).trim().toLowerCase()).filter(Boolean));
    const skills = catalog.filter((skill) => authorized.has(String(skill?.name || "").trim().toLowerCase()));
    const available = new Set(skills.map((skill) => String(skill?.name || "").trim().toLowerCase()));
    return {
        success: true,
        scope: authorization.scope,
        scope_id: authorization.scopeId,
        skills,
        authorization: {
            requested: authorization.tools.skill.length,
            available: skills.length,
            missing: authorization.tools.skill.filter((name) => !available.has(String(name).trim().toLowerCase())),
        },
    };
}
function handleToolsAndMetricsApi(pathname, req, res, parsed) {
    if ((0, terminal_1.handleTerminalApi)(pathname, req, res))
        return true;
    // === MCP/Skills API ===
    if (pathname === "/api/tools/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() });
        return true;
    }
    if (pathname === "/api/tools/internal-mcp" && req.method === "GET") {
        const runtime = toolManager.getToolList();
        (0, utils_1.sendJson)(res, (0, internal_mcp_registry_1.buildInternalMcpCatalog)({ feishuConfig: (0, db_1.loadFeishuConfig)(), runtimeServers: runtime.servers || [] }));
        return true;
    }
    if (pathname === "/api/tools/authorization-options" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, tool_authorization_1.buildToolAuthorizationOptions)({
            mcpTools: (0, db_1.loadMcpTools)(),
            skills: (0, db_1.loadSkills)(),
            status: toolManager.getToolList(),
        }));
        return true;
    }
    if (pathname === "/api/tools/authorization-inventory" && req.method === "GET") {
        try {
            const includeRuntime = !["0", "false", "no"].includes(String(parsed?.query?.runtime || "1").toLowerCase());
            const runtimeReadiness = includeRuntime
                ? loadLatestRuntimeToolReadiness(240, { businessOnly: true })
                : [];
            const inventory = (0, tool_authorization_1.buildToolAuthorizationInventory)({
                globalAuthorization: (0, global_agent_tool_authorization_1.loadGlobalAgentToolAuthorization)(),
                projects: (0, db_1.loadProjectConfigs)(),
                groups: (0, storage_1.loadGroups)(),
                runtimeReadiness,
            });
            (0, utils_1.sendJson)(res, {
                success: true,
                ...inventory,
                main_agent_catalog: {
                    schema: "ccm-main-agent-tool-catalog-v2",
                    native: main_agent_tool_runtime_1.MAIN_AGENT_NATIVE_TOOLS_V2.map(tool => ({ ...tool, source: "native", applicable_agents: ["global", "group", "project"] })),
                    workspace_readonly: workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.map(tool => ({
                        name: tool.name,
                        canonical_name: tool.canonicalName,
                        description: tool.description,
                        source: "ccm__workspace_readonly",
                        load_state: tool.loadPolicy === "base" ? "loaded_schema_by_default" : "authorized_not_loaded",
                        checksum: tool.checksum,
                        applicable_agents: ["global", "group", "project"],
                    })),
                    state_semantics: {
                        authorized_not_loaded: "当前作用域可用，但本轮尚未把Schema加入模型上下文",
                        loaded_schema_by_default: "基础Schema进入首轮上下文，只有模型调用后才产生工具结果Token",
                        configured_mcp_default: "普通授权MCP首轮只提供名称与发现提示，tool_search选中后才加载完整Schema",
                        trusted_always_load: "仅CCM官方或已批准MCP声明anthropic/alwaysLoad时，完整Schema可进入首轮上下文",
                        skill_catalog_only: "Skill首轮只提供名称、描述与校验身份，invoke_skill后才加载正文",
                        invoked: "真实调用状态按精确会话隐藏执行账本和调用审计计算",
                    },
                },
            });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/invocation-audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, buildToolInvocationAudit(parsed?.query || { limit: 80 }));
        return true;
    }
    if (pathname === "/api/tools/chain-verification" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildToolChainVerification(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/mcp-skill-goal-audit" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildMcpSkillGoalCompletionAudit(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/runtime-readiness" && req.method === "GET") {
        const deep = ["1", "true", "yes"].includes(String(parsed?.query?.deep || "").toLowerCase());
        const includeHistory = ["1", "true", "yes"].includes(String(parsed?.query?.history || "").toLowerCase());
        const historicalAudits = (0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(240);
        const audits = includeHistory ? historicalAudits : selectLatestRuntimeToolAudits(historicalAudits);
        const readiness = audits.map(audit => (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { deep }));
        (0, utils_1.sendJson)(res, {
            success: true,
            deep,
            includeHistory,
            historicalTotal: historicalAudits.length,
            readiness,
            summary: {
                total: readiness.length,
                ready: readiness.filter(item => item.overallReady).length,
                deliveryReady: readiness.filter(item => item.deliveryReady).length,
                runtimeReady: readiness.filter(item => item.runtimeReady).length,
            },
        });
        return true;
    }
    if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, runtime_tool_real_cli_matrix_1.getRuntimeToolRealCliMatrixStatus)() });
        return true;
    }
    if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const started = (0, runtime_tool_real_cli_matrix_1.startRuntimeToolRealCliMatrix)(payload);
                (0, utils_1.sendJson)(res, { success: true, ...started }, started.accepted ? 202 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/runtime-resync" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const resync = (0, runtime_tool_sync_1.resyncRecentRuntimeToolSnapshots)(payload);
                const includeMissing = normalizeTruthFlag(payload.includeMissing ?? payload.include_missing);
                const missing = includeMissing ? (0, runtime_tool_sync_1.resyncMissingRuntimeToolSnapshots)(payload) : null;
                (0, utils_1.sendJson)(res, { success: true, ...resync, missing });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/catalog-impact" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const type = payload.type === "skill" ? "skill" : "mcp";
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name);
                (0, utils_1.sendJson)(res, { success: true, ...(0, marketplace_1.previewToolCatalogMutationImpact)({ action: payload.action || "preview", type, name }) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const name = payload.name ? (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name) : "connection-test";
                const existing = (0, db_1.loadMcpTools)().find(item => String(item.name) === name);
                const candidate = (0, tool_catalog_management_1.mergeMcpToolUpdate)(existing, { ...payload, name }, { create: !existing });
                toolManager.testConnection(candidate.command, candidate.env, candidate.args || [])
                    .then((result) => (0, utils_1.sendJson)(res, { ...result, tested: (0, tool_catalog_management_1.redactMcpToolForDisplay)(candidate) }))
                    .catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/reload" && req.method === "POST") {
        toolManager.disconnect();
        toolManager.loadTools().then(() => (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() }));
        return true;
    }
    if (pathname === "/api/tools/skills/discover" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: toolManager.discoverSkills() });
        return true;
    }
    if (pathname === "/api/tools/skills/invoke" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = toolManager.invokeSkill(payload.name || payload.skill, payload.input || payload.context || "", payload.scope);
                (0, utils_1.sendJson)(res, { success: !!result.ok, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === MCP 工具管理 API ===
    if (pathname === "/api/mcp" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildScopedMcpCatalog(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e?.message || "读取 MCP 配置失败" }, /不存在/.test(String(e?.message || "")) ? 404 : 400);
        }
        return true;
    }
    if (pathname === "/api/mcp" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name);
                if ((0, internal_mcp_registry_1.isInternalMcpName)(name))
                    return (0, utils_1.sendJson)(res, { success: false, error: "内部 MCP 随项目安装并由系统管理，不能在外部 MCP 连接中心编辑" }, 409);
                const previous = (0, db_1.loadMcpTools)().find(item => String(item.name) === name) || null;
                if (payload.createOnly === true && previous)
                    return (0, utils_1.sendJson)(res, { success: false, error: "同名 MCP 服务器已存在" }, 409);
                const tool = (0, tool_catalog_management_1.mergeMcpToolUpdate)(previous, { ...payload, name }, { create: !previous });
                (0, db_1.saveMcpTool)(tool);
                let reload;
                try {
                    reload = await reloadToolManagerAfterCatalogMutation({
                        action: previous ? (previous.enabled !== tool.enabled && Object.keys(payload).every(key => ["name", "enabled"].includes(key)) ? "toggle" : "update") : "create",
                        type: "mcp",
                        name,
                    });
                }
                catch (error) {
                    await rollbackCatalogMutation("mcp", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, tool: (0, tool_catalog_management_1.redactMcpToolForDisplay)(tool), reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/mcp/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name: rawName } = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(rawName);
                if ((0, internal_mcp_registry_1.isInternalMcpName)(name))
                    return (0, utils_1.sendJson)(res, { success: false, error: "内部 MCP 是项目运行链路的一部分，不能删除" }, 409);
                const previous = (0, db_1.loadMcpTools)().find(item => String(item.name) === name) || null;
                const impact = (0, marketplace_1.previewToolCatalogMutationImpact)({ action: "delete", type: "mcp", name });
                (0, db_1.deleteMcpTool)(name);
                let reload;
                try {
                    reload = await reloadToolManagerAfterCatalogMutation({
                        action: "delete",
                        type: "mcp",
                        name,
                        changed: !!previous,
                    });
                }
                catch (error) {
                    await rollbackCatalogMutation("mcp", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, removed: !!previous, impact, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === Skills API ===
    if (pathname === "/api/skills/manual" && req.method === "GET") {
        try {
            const skill = readSkillManual(parsed.query.name);
            if (!skill) {
                (0, utils_1.sendJson)(res, { success: false, error: "Skill 不存在" }, 404);
                return true;
            }
            (0, utils_1.sendJson)(res, { success: true, skill });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    if (pathname === "/api/skills/customizations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: loadCustomSkills() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, buildScopedSkillCatalog(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e?.message || "读取 Skill 配置失败" }, /不存在/.test(String(e?.message || "")) ? 404 : 400);
        }
        return true;
    }
    if (pathname === "/api/skills" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name);
                const previous = (0, db_1.loadSkills)().find(item => String(item.name) === name) || null;
                if (payload.createOnly === true && previous)
                    return (0, utils_1.sendJson)(res, { success: false, error: "同名 Prompt Skill 已存在" }, 409);
                const skill = {
                    ...(0, tool_catalog_management_1.mergeSkillUpdate)(previous, { ...payload, name }, { create: !previous }),
                    origin: previous?.origin || (previous?.marketplace ? "external" : "user"),
                    scope: previous?.scope || (previous?.marketplace ? "external" : "user"),
                    sourceType: previous?.sourceType || (previous?.marketplace ? "marketplace" : "prompt"),
                    immutable: false,
                    deletable: true,
                    editable: true,
                    disableable: true,
                    systemManaged: false,
                    roleSkill: false,
                };
                (0, db_1.saveSkill)(skill);
                let reload;
                try {
                    reload = await reloadToolManagerAfterCatalogMutation({
                        action: previous ? "update" : "create",
                        type: "skill",
                        name,
                    });
                }
                catch (error) {
                    await rollbackCatalogMutation("skill", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, skill, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message, code: e.code }, Number(e.statusCode || 400));
            }
        });
        return true;
    }
    if (pathname === "/api/skills/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name: rawName } = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(rawName);
                const previous = (0, db_1.loadSkills)().find(item => String(item.name) === name) || null;
                const impact = (0, marketplace_1.previewToolCatalogMutationImpact)({ action: "delete", type: "skill", name });
                (0, db_1.deleteSkill)(name);
                let reload;
                try {
                    reload = await reloadToolManagerAfterCatalogMutation({
                        action: "delete",
                        type: "skill",
                        name,
                        changed: !!previous,
                    });
                }
                catch (error) {
                    await rollbackCatalogMutation("skill", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, removed: !!previous, impact, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message, code: e.code }, Number(e.statusCode || 400));
            }
        });
        return true;
    }
    // === 性能监控指标 ===
    if (pathname === "/api/metrics/events" && req.method === "GET") {
        (0, metrics_v3_1.ensureLegacyMetricsMigrated)((0, db_1.loadMetrics)());
        const scopeType = String(parsed.query.scope_type || parsed.query.scopeType || "");
        const scopeId = String(parsed.query.scope_id || parsed.query.scopeId || "");
        const result = (0, metrics_v3_1.queryMetricEventsV3)({
            scopeType,
            scopeId,
            days: parsed.query.days,
            status: parsed.query.status,
            page: parsed.query.page,
            pageSize: parsed.query.page_size || parsed.query.pageSize,
            fromDate: parsed.query.from,
            toDate: parsed.query.to,
        });
        (0, utils_1.sendJson)(res, { success: true, ...result });
        return true;
    }
    if (pathname === "/api/metrics" && req.method === "GET") {
        (0, metrics_v3_1.ensureLegacyMetricsMigrated)((0, db_1.loadMetrics)());
        (0, metrics_v3_1.pruneMetricEventsV3)();
        const metrics = (0, metrics_v3_1.loadMetricsDashboardV3)();
        const groups = (0, storage_1.loadGroups)().map((group) => {
            const members = Array.isArray(group.members) ? group.members : [];
            const coordinator = members.find((member) => member.role === "coordinator") || members[0] || {};
            return {
                id: String(group.id || ""),
                name: String(group.name || group.id || "未命名群聊"),
                coordinator: String(coordinator.project || "coordinator"),
                members: members.map((member) => ({
                    project: String(member.project || ""),
                    role: String(member.role || (member.project === coordinator.project ? "coordinator" : "member")),
                })).filter((member) => member.project),
            };
        });
        const projects = Object.entries((0, db_1.loadProjectConfigs)()).map(([id, project]) => ({
            id,
            name: String(project?.display_name || project?.displayName || project?.name || id),
            agent: String(project?.agent || project?.agent_type || "project-agent"),
            scopeKey: `project:${id}`,
        }));
        (0, utils_1.sendJson)(res, {
            metrics,
            catalog: {
                groups,
                projects,
                global: {
                    id: "global",
                    name: "全局助手",
                    agent: "global-agent",
                    scopeKey: "global:global",
                },
                legacyUnscoped: {
                    agentCount: Object.keys(metrics.agents || {}).length,
                    latestAt: Object.values(metrics.agents || {}).reduce((latest, item) => {
                        const at = String(item?.lastCall || "");
                        return at > latest ? at : latest;
                    }, ""),
                },
            },
            system: buildLivePerformanceSnapshot(),
        });
        return true;
    }
    if (pathname === "/api/metrics/reset" && req.method === "POST") {
        (0, utils_1.sendJson)(res, {
            success: false,
            error: "性能指标重置已迁移到清理中心，请先生成预览并确认永久删除",
            code: "cleanup_preview_required",
            action: "reset_metrics",
            preview_endpoint: "/api/cleanup/preview",
        }, 409);
        return true;
    }
    // === 共享上下文 API ===
    if (pathname === "/api/shared" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { files: listSharedFiles() });
        return true;
    }
    if (pathname === "/api/shared/read" && req.method === "GET") {
        const name = parsed.query.name;
        const data = readSharedFile(name);
        if (!data) {
            (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { name, ...data });
        return true;
    }
    // 下载文件
    if (pathname === "/api/shared/download" && req.method === "GET") {
        const name = (0, shared_files_v2_1.validateSharedFileV2Name)(parsed.query.name);
        const record = listSharedFiles().find((item) => item.name === name);
        const resolved = record ? (0, shared_files_v2_1.resolveSharedFileSourceV2)("global", "global", record.id) : null;
        if (!resolved) {
            res.writeHead(404);
            res.end("Not Found");
            return true;
        }
        const filePath = resolved.file;
        const ext = path.extname(name).toLowerCase();
        const types = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml"
        };
        res.writeHead(200, {
            "Content-Type": types[ext] || "application/octet-stream",
            "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        });
        fs.createReadStream(filePath).pipe(res);
        return true;
    }
    // 上传文件（multipart）
    if (pathname === "/api/shared/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (ct.includes("multipart/form-data")) {
            void (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(result => {
                try {
                    const uploaded = result.files.map(file => (0, shared_files_v2_1.adoptSharedUploadV2)("global", "global", file));
                    (0, secure_multipart_1.cleanupSecureMultipartFiles)(result.files);
                    (0, utils_1.sendJson)(res, { success: true, files: uploaded });
                }
                catch (e) {
                    (0, secure_multipart_1.cleanupSecureMultipartFiles)(result.files);
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        (0, utils_1.sendJson)(res, { error: "需要 multipart/form-data" }, 400);
        return true;
    }
    if (pathname === "/api/shared/write" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, content } = JSON.parse(body);
                writeSharedFile(name, content);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                deleteSharedFile(name);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 原生文件夹选择 API ===
    if (pathname === "/api/filesystem/native-browse" && req.method === "GET") {
        try {
            const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = 'Select Project Directory'
        $d.ShowNewFolderButton = $true
        if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $d.SelectedPath
        }
      `.replace(/\n/g, '; ');
            const out = (0, child_process_1.execFileSync)("powershell.exe", [
                "-WindowStyle", "Hidden",
                "-Sta",
                "-NoProfile",
                "-Command", psCommand,
            ], {
                encoding: "utf-8",
                windowsHide: true,
            }).trim();
            if (out && require('fs').existsSync(out)) {
                (0, utils_1.sendJson)(res, { success: true, path: out });
            }
            else {
                (0, utils_1.sendJson)(res, { success: false, error: 'No directory selected' });
            }
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    // === 文件浏览器 API ===
    if (pathname === "/api/filesystem/directory" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += String(chunk || "");
            if (Buffer.byteLength(body, "utf-8") > 16 * 1024)
                req.destroy();
        });
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const parentInput = String(payload.parent || "").trim();
                const name = String(payload.name || "").trim();
                const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
                if (!parentInput)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少当前目录" }, 400);
                const parent = path.resolve(parentInput);
                if (!path.isAbsolute(parent) || !fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "当前目录不存在或不可用" }, 400);
                }
                if (!name || name.length > 120 || name === "." || name === ".." || /[<>:\"/\\|?*\x00-\x1F]/.test(name) || /[. ]$/.test(name) || reserved.test(name)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "文件夹名称无效" }, 400);
                }
                const target = path.resolve(parent, name);
                if (path.dirname(target) !== parent)
                    return (0, utils_1.sendJson)(res, { success: false, error: "文件夹必须创建在当前目录下" }, 400);
                if (fs.existsSync(target))
                    return (0, utils_1.sendJson)(res, { success: false, error: "同名文件或文件夹已经存在" }, 409);
                fs.mkdirSync(target, { recursive: false });
                (0, utils_1.sendJson)(res, { success: true, path: target, parent, name });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "创建文件夹失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/filesystem/browse" && req.method === "GET") {
        const dir = parsed.query.dir || os.homedir();
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true })
                .filter(item => !item.name.startsWith('.'))
                .map(item => ({
                name: item.name,
                path: path.join(dir, item.name),
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }))
                .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            })
                .slice(0, 100);
            (0, utils_1.sendJson)(res, { success: true, path: dir, items });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // 获取系统磁盘列表
    if (pathname === "/api/filesystem/drives" && req.method === "GET") {
        try {
            let drives = [];
            if (process.platform === 'win32') {
                for (let i = 65; i <= 90; i++) {
                    const letter = String.fromCharCode(i);
                    const drivePath = `${letter}:\\`;
                    try {
                        fs.accessSync(drivePath);
                        drives.push({ name: letter, path: drivePath });
                    }
                    catch { }
                }
            }
            else {
                drives.push({ name: '/', path: '/' });
            }
            (0, utils_1.sendJson)(res, { success: true, drives, home: os.homedir() });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // === 终端 API ===
    if (pathname === "/api/terminal/exec" && req.method === "POST") {
        let body = "";
        let rejected = false;
        req.on("data", (chunk) => {
            if (rejected)
                return;
            body += chunk;
            if (Buffer.byteLength(body, "utf-8") > 2 * 1024 * 1024) {
                rejected = true;
                (0, utils_1.sendJson)(res, { success: false, error: "请求内容过大" }, 413);
            }
        });
        req.on("end", async () => {
            if (rejected)
                return;
            try {
                const { command, cwd, challenge } = JSON.parse(body);
                if (!command)
                    return (0, utils_1.sendJson)(res, { error: "命令不能为空" }, 400);
                if (String(command).length > 16_000)
                    return (0, utils_1.sendJson)(res, { error: "命令过长" }, 400);
                const authorization = (0, terminal_1.authorizeTerminalCommandExecution)(command, cwd, challenge);
                if (!authorization.allowed)
                    return (0, utils_1.sendJson)(res, { success: false, ...authorization }, 409);
                const workDir = authorization.cwd || os.homedir();
                const controller = new AbortController();
                const cancel = () => { if (!res.writableEnded)
                    controller.abort(); };
                req.once("aborted", cancel);
                res.once("close", cancel);
                const result = await runTerminalCommand(String(command), workDir, { signal: controller.signal });
                if (!res.writableEnded && !res.destroyed)
                    (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                if (!res.writableEnded && !res.destroyed)
                    (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 获取当前系统信息
    if (pathname === "/api/terminal/info" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            platform: process.platform,
            home: os.homedir(),
            cwd: process.cwd(),
            user: os.userInfo().username,
            shell: process.platform === 'win32' ? 'powershell' : 'bash'
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=tools.js.map